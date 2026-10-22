"""
OmniVerify Phase D - Backend Hardening, Tenant Isolation & Reliability Test Suite
"""
import pytest
import uuid
import cv2
import tracemalloc
import time
import numpy as np
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.config import UPLOAD_DIR, REPORTS_DIR
from backend.app.core.auth import auth_service
from backend.app.db.session import SessionLocal, get_db
from backend.app.db.models import VideoAnalysis, SignalBreakdown, SuspiciousInterval, ForensicReport
from backend.app.db.crud import save_analysis, get_analysis_by_id, delete_analysis
from backend.app.api.schemas import VideoAnalysisResult, SignalBreakdown as SchemaSignalBreakdown, SuspiciousInterval as SchemaInterval

client = TestClient(app)

def create_synthetic_mp4(filepath: Path, num_frames: int = 12):
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(filepath), fourcc, 10.0, (320, 240))
    for i in range(num_frames):
        img = np.full((240, 320, 3), 110, dtype=np.uint8)
        cv2.circle(img, (160 + i * 2, 120), 30, (180, 160, 140), -1)
        out.write(img)
    out.release()

# =========================================================================
# 1. API Contract & Validation Edge Cases
# =========================================================================

def test_upload_empty_video_rejected():
    """Upload of 0-byte file must be rejected with HTTP 400."""
    response = client.post(
        "/api/upload",
        files={"file": ("empty.mp4", b"", "video/mp4")}
    )
    assert response.status_code == 400
    assert "empty (0 bytes)" in response.json()["detail"].lower()

def test_upload_path_traversal_sanitized():
    """Filename containing directory traversal elements must be sanitized to basename."""
    dummy_bytes = b"fake video bytes for extension check"
    response = client.post(
        "/api/upload",
        files={"file": ("../../evil_traversal.mp4", dummy_bytes, "video/mp4")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "evil_traversal.mp4"
    assert "/" not in data["filename"] and "\\" not in data["filename"]
    (UPLOAD_DIR / "evil_traversal.mp4").unlink(missing_ok=True)

def test_analysis_invalid_uuid_format():
    """Malformed UUID query must return HTTP 400."""
    response = client.get("/api/analysis/not-a-valid-uuid-12345")
    assert response.status_code == 400
    assert "Invalid analysis UUID format" in response.json()["detail"]

# =========================================================================
# 2. Tenant Isolation & Authorization Tests (Task 5)
# =========================================================================

def test_tenant_isolation_analysis_records_and_reports():
    """
    Validates that:
    1. User B cannot access User A's analysis record by UUID (HTTP 403).
    2. User B cannot download User A's JSON/HTML reports (HTTP 403).
    3. User B cannot delete User A's analysis (HTTP 403).
    4. Unauthenticated public history never leaks User A's private analysis.
    5. User A can access, download, and delete their own records (HTTP 200).
    """
    user_a_id = f"alice_{uuid.uuid4().hex[:6]}"
    user_b_id = f"bob_{uuid.uuid4().hex[:6]}"
    test_filename = f"alice_private_{uuid.uuid4().hex[:6]}.mp4"

    # Create dummy reports on disk for this file
    json_path = REPORTS_DIR / f"OmniVerify_Report_{test_filename}_123456789.json"
    html_path = REPORTS_DIR / f"OmniVerify_Dossier_{test_filename}_123456789.html"
    json_path.write_text('{"test": "private report"}', encoding="utf-8")
    html_path.write_text('<html><body>Private Dossier</body></html>', encoding="utf-8")

    db = SessionLocal()
    sample = VideoAnalysisResult(
        video_filename=test_filename,
        video_hash_sha256="sha256_alice_" + uuid.uuid4().hex,
        duration_seconds=2.0,
        total_frames=30,
        sampled_frames_count=6,
        fps=15.0,
        resolution="640x480",
        verdict="REAL",
        calibrated_confidence=0.88,
        fusion_anomaly_score=0.12,
        signal_breakdowns=[],
        suspicious_intervals=[],
        frames=[],
        detected_scene_objects_summary={},
        traceable_explanations=["Verified authentic"],
        limitations_disclaimer="Disclaimer",
        processed_at_iso="2026-10-21T18:00:00Z"
    )
    db_rec = save_analysis(
        db, sample,
        report_paths={"json": str(json_path), "html": str(html_path)},
        user_id=user_a_id
    )
    analysis_uuid = db_rec.id
    db.close()

    try:
        # Step A: Anonymous user calls /api/history -> must NOT leak Alice's record
        res_anon_history = client.get("/api/history")
        assert res_anon_history.status_code == 200
        anon_filenames = [item["filename"] for item in res_anon_history.json()["history"]]
        assert test_filename not in anon_filenames

        # Step B: User B attempts to access Alice's analysis by UUID -> 403 Forbidden
        with patch.object(auth_service, "verify_token", return_value={"sub": user_b_id}):
            res_b_view = client.get(
                f"/api/analysis/{analysis_uuid}",
                headers={"Authorization": "Bearer bob_token"}
            )
            assert res_b_view.status_code == 403

        # Step C: User B attempts to download Alice's JSON report -> 403 Forbidden
        with patch.object(auth_service, "verify_token", return_value={"sub": user_b_id}):
            res_b_json = client.get(
                f"/api/reports/{test_filename}/json",
                headers={"Authorization": "Bearer bob_token"}
            )
            assert res_b_json.status_code == 403

        # Step D: User B attempts to download Alice's HTML dossier -> 403 Forbidden
        with patch.object(auth_service, "verify_token", return_value={"sub": user_b_id}):
            res_b_html = client.get(
                f"/api/reports/{test_filename}/html",
                headers={"Authorization": "Bearer bob_token"}
            )
            assert res_b_html.status_code == 403

        # Step E: User B attempts to delete Alice's analysis -> 403 Forbidden
        with patch.object(auth_service, "verify_token", return_value={"sub": user_b_id}):
            res_b_del = client.delete(
                f"/api/analysis/{analysis_uuid}",
                headers={"Authorization": "Bearer bob_token"}
            )
            assert res_b_del.status_code == 403

        # Step F: User A (Owner) accesses record by UUID -> 200 OK
        with patch.object(auth_service, "verify_token", return_value={"sub": user_a_id}):
            res_a_view = client.get(
                f"/api/analysis/{analysis_uuid}",
                headers={"Authorization": "Bearer alice_token"}
            )
            assert res_a_view.status_code == 200
            assert res_a_view.json()["video_filename"] == test_filename

        # Step G: User A downloads report -> 200 OK
        with patch.object(auth_service, "verify_token", return_value={"sub": user_a_id}):
            res_a_rep = client.get(
                f"/api/reports/{test_filename}/json",
                headers={"Authorization": "Bearer alice_token"}
            )
            assert res_a_rep.status_code == 200

        # Step H: User A deletes analysis -> 200 OK
        with patch.object(auth_service, "verify_token", return_value={"sub": user_a_id}):
            res_a_del = client.delete(
                f"/api/analysis/{analysis_uuid}",
                headers={"Authorization": "Bearer alice_token"}
            )
            assert res_a_del.status_code == 200
            assert res_a_del.json()["deleted"] is True

        # Verify record no longer exists
        db = SessionLocal()
        assert get_analysis_by_id(db, analysis_uuid) is None
        db.close()

    finally:
        json_path.unlink(missing_ok=True)
        html_path.unlink(missing_ok=True)

# =========================================================================
# 3. Database Cascading Deletion & Transaction Integrity (Task 4)
# =========================================================================

def test_database_cascading_deletion():
    """
    Validates that deleting a VideoAnalysis parent record automatically
    cascade-deletes all associated child entities in a single atomic transaction.
    """
    db = SessionLocal()
    sample = VideoAnalysisResult(
        video_filename="cascade_test.mp4",
        video_hash_sha256="sha256_cascade_" + uuid.uuid4().hex,
        duration_seconds=3.0,
        total_frames=45,
        sampled_frames_count=6,
        fps=15.0,
        resolution="640x480",
        verdict="MANIPULATED",
        calibrated_confidence=0.85,
        fusion_anomaly_score=0.72,
        signal_breakdowns=[
            SchemaSignalBreakdown(
                signal_name="Spatial Noise Residual",
                raw_score=0.88,
                weight=0.35,
                weighted_contribution=0.308,
                status="Anomalous",
                description="PRNU noise suppression"
            )
        ],
        suspicious_intervals=[
            SchemaInterval(
                start_timestamp_ms=100.0,
                end_timestamp_ms=300.0,
                start_formatted="00:00.100",
                end_formatted="00:00.300",
                start_frame=1,
                end_frame=3,
                average_anomaly_score=0.88,
                primary_contributing_signal="Noise Residual",
                evidence_rationale="Synthetic boundary tear"
            )
        ],
        frames=[],
        detected_scene_objects_summary={"person": 1},
        traceable_explanations=["Anomalous signal"],
        limitations_disclaimer="Disclaimer",
        processed_at_iso="2026-10-21T18:00:00Z"
    )
    db_rec = save_analysis(
        db, sample,
        report_paths={"json": "dummy_report.json"},
        user_id="user_cascade_owner"
    )
    rec_id = db_rec.id

    # Verify children exist in database
    sig_count = db.query(SignalBreakdown).filter(SignalBreakdown.analysis_id == rec_id).count()
    inv_count = db.query(SuspiciousInterval).filter(SuspiciousInterval.analysis_id == rec_id).count()
    rep_count = db.query(ForensicReport).filter(ForensicReport.analysis_id == rec_id).count()

    assert sig_count == 1
    assert inv_count == 1
    assert rep_count == 1

    # Delete parent
    deleted = delete_analysis(db, rec_id)
    assert deleted is True

    # Verify children were cascade-deleted
    assert db.query(SignalBreakdown).filter(SignalBreakdown.analysis_id == rec_id).count() == 0
    assert db.query(SuspiciousInterval).filter(SuspiciousInterval.analysis_id == rec_id).count() == 0
    assert db.query(ForensicReport).filter(ForensicReport.analysis_id == rec_id).count() == 0
    db.close()

# =========================================================================
# 4. Latency & Memory Profiling (Task 6)
# =========================================================================

def test_pipeline_runtime_and_memory_profiling():
    """
    Measures actual latency (seconds) and peak memory consumption (MB)
    using tracemalloc during video analysis pipeline execution.
    """
    clip_path = UPLOAD_DIR / "perf_profile_clip.mp4"
    create_synthetic_mp4(clip_path, num_frames=15)

    tracemalloc.start()
    t_start = time.perf_counter()

    try:
        response = client.post(f"/api/analyze/{clip_path.name}")
        assert response.status_code == 200
        data = response.json()
        assert data["analysis_status"] == "completed"

        elapsed_sec = time.perf_counter() - t_start
        current_mem, peak_mem = tracemalloc.get_traced_memory()
        peak_mb = peak_mem / (1024 * 1024)

        # Performance constraints on Windows CPU:
        # Bounded processing constraint for 15 frames: completes safely within 90 seconds under test suite load
        # Peak memory delta during analysis must remain bounded (<= 250 MB)
        assert elapsed_sec < 90.0
        assert peak_mb < 250.0
        print(f"\n[BENCHMARK PROFILING] 15 frames: Latency = {elapsed_sec:.2f}s, Peak Memory = {peak_mb:.2f}MB")

    finally:
        tracemalloc.stop()
        clip_path.unlink(missing_ok=True)
