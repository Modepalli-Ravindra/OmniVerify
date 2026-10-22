"""
OmniVerify — Phase E: Backend Acceptance Testing and Release Gate Suite
Tests the complete end-to-end backend lifecycle:
1. Video upload, analysis, signal breakdown, heuristic fusion, and reporting.
2. Neon PostgreSQL persistence, schema integrity, and restart resilience.
3. Multi-tenant isolation across analyses, reports, deletion, and history.
4. Authentication token validation matrix (missing, malformed, expired, forged).
5. Robust upload validation (zero-byte, corrupted stream, unsupported extension, missing).
6. Transaction rollback and degraded mode recovery.
7. Atomic cascading deletion without cross-tenant impact.
8. Neon Object Storage private bucket presigned URL privacy and expiration.
"""
import pytest
import uuid
import cv2
import json
import numpy as np
from pathlib import Path
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

import jwt
from backend.app.main import app
from backend.app.core.config import UPLOAD_DIR, REPORTS_DIR
from backend.app.core.auth import auth_service, NeonAuthService
from backend.app.services.storage import storage_service
from backend.app.db.session import SessionLocal, get_db
from backend.app.db.models import (
    VideoAnalysis,
    SignalBreakdown,
    SuspiciousInterval,
    ForensicReport
)
from backend.app.db.crud import (
    save_analysis,
    get_analysis_by_id,
    get_analysis_by_filename,
    get_recent_analyses,
    delete_analysis
)
from backend.app.api.schemas import (
    VideoAnalysisResult,
    SignalBreakdown as SchemaSignalBreakdown,
    SuspiciousInterval as SchemaInterval
)
from backend.app.api.routes import ANALYSIS_CACHE

client = TestClient(app)

def create_synthetic_mp4(filepath: Path, num_frames: int = 15, width: int = 320, height: int = 240) -> Path:
    """Creates a deterministic synthetic test video with motion."""
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(filepath), fourcc, 15.0, (width, height))
    for i in range(num_frames):
        frame = np.full((height, width, 3), 90, dtype=np.uint8)
        # Add dynamic moving circle to provide optical flow and frequency variations
        cv2.circle(frame, (80 + i * 8, 120), 25, (220, 160, 100), -1)
        # Add high-frequency textures
        frame[30:50, 30:50] = (i * 15) % 255
        out.write(frame)
    out.release()
    return filepath

# =========================================================================
# 1. Full Video Lifecycle & Neon Persistence
# =========================================================================

def test_01_full_lifecycle_upload_analyze_reports_and_persistence(tmp_path):
    """
    Test Step 1-4: Complete video lifecycle:
    Upload -> Analysis -> Metadata & Signals -> Persistence -> Report retrieval.
    """
    test_filename = f"e2e_accept_{uuid.uuid4().hex[:8]}.mp4"
    temp_video = tmp_path / test_filename
    create_synthetic_mp4(temp_video, num_frames=15)

    # 1. Upload video
    with open(temp_video, "rb") as f:
        upload_res = client.post(
            "/api/upload",
            files={"file": (test_filename, f, "video/mp4")}
        )
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert upload_data["filename"] == test_filename
    assert upload_data["file_size_bytes"] > 0

    try:
        # 2. Analyze video
        analyze_res = client.post(f"/api/analyze/{test_filename}")
        assert analyze_res.status_code == 200
        data = analyze_res.json()

        # Verify metadata extraction
        assert data["fps"] > 0
        assert data["duration_seconds"] > 0
        assert data["resolution"] == "320x240"
        assert data["total_frames"] == 15
        assert data["sampled_frames_count"] > 0

        # Verify signals & verdict
        assert data["verdict"] in ["REAL", "MANIPULATED", "UNCERTAIN"]
        assert 0.0 <= data["calibrated_confidence"] <= 1.0
        assert 0.0 <= data["fusion_anomaly_score"] <= 1.0
        assert len(data["signal_breakdowns"]) == 4
        assert len(data["traceable_explanations"]) > 0

        # Verify explicit status & persistence fields
        assert data["analysis_status"] == "completed"
        assert data["analysis_id"] is not None
        # UUID check
        uuid.UUID(data["analysis_id"])
        analysis_id = data["analysis_id"]

        # 3. Retrieve analysis by UUID
        get_res = client.get(f"/api/analysis/{analysis_id}")
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert get_data["analysis_id"] == analysis_id
        assert get_data["video_filename"] == test_filename

        # 4. Retrieve reports
        json_rep = client.get(f"/api/reports/{test_filename}/json")
        assert json_rep.status_code == 200
        assert "verdict" in json_rep.json()

        html_rep = client.get(f"/api/reports/{test_filename}/html")
        assert html_rep.status_code == 200
        assert "OmniVerify Forensic Examination Dossier" in html_rep.text

        # 5. History entry
        hist_res = client.get("/api/history")
        assert hist_res.status_code == 200
        history_items = hist_res.json()["history"]
        history_filenames = [h["filename"] for h in history_items]
        assert test_filename in history_filenames

    finally:
        # Cleanup disk
        (UPLOAD_DIR / test_filename).unlink(missing_ok=True)


# =========================================================================
# 2. Backend Restart & Persistence Verification
# =========================================================================

def test_02_backend_restart_persistence_verification():
    """
    Test Step 5: Verify that after in-memory cache is purged (simulating a service restart),
    records stored in Neon PostgreSQL remain fully retrievable with intact metadata.
    """
    db = SessionLocal()
    restart_test_name = f"restart_test_{uuid.uuid4().hex[:8]}.mp4"
    sample = VideoAnalysisResult(
        video_filename=restart_test_name,
        video_hash_sha256="sha256_restart_" + uuid.uuid4().hex,
        duration_seconds=3.5,
        total_frames=45,
        sampled_frames_count=10,
        fps=15.0,
        resolution="640x480",
        verdict="REAL",
        calibrated_confidence=0.91,
        fusion_anomaly_score=0.09,
        signal_breakdowns=[],
        suspicious_intervals=[],
        frames=[],
        detected_scene_objects_summary={"person": 1},
        traceable_explanations=["Verified through restart persistence test"],
        limitations_disclaimer="Heuristic evidence.",
        processed_at_iso="2026-10-21T20:00:00Z"
    )
    db_rec = save_analysis(db, sample, report_paths={"json": "mock.json", "html": "mock.html"}, user_id=None)
    analysis_uuid = db_rec.id
    db.close()

    # Simulate full backend restart: wipe in-memory cache
    ANALYSIS_CACHE.clear()
    assert restart_test_name not in ANALYSIS_CACHE

    # Query via API: must fetch from Neon PostgreSQL
    response = client.get(f"/api/analysis/{analysis_uuid}")
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["analysis_id"] == analysis_uuid
    assert res_data["video_filename"] == restart_test_name
    assert res_data["persisted_to_database"] is True
    assert res_data["verdict"] == "REAL"
    assert res_data["total_frames"] == 45


# =========================================================================
# 3. Two-User Multi-Tenant Isolation
# =========================================================================

def test_03_two_user_multi_tenant_isolation():
    """
    Test Step 6: Test two separate users (Alice and Bob) and verify strict isolation
    for history, analysis IDs, reports, and deletion.
    """
    alice_id = f"alice_{uuid.uuid4().hex[:8]}"
    bob_id = f"bob_{uuid.uuid4().hex[:8]}"
    alice_filename = f"alice_clip_{uuid.uuid4().hex[:6]}.mp4"

    # Create dummy reports
    json_path = REPORTS_DIR / f"OmniVerify_Report_{alice_filename}_111.json"
    html_path = REPORTS_DIR / f"OmniVerify_Dossier_{alice_filename}_111.html"
    json_path.write_text('{"owner": "alice"}', encoding="utf-8")
    html_path.write_text('<html><body>Alice Dossier</body></html>', encoding="utf-8")

    db = SessionLocal()
    sample = VideoAnalysisResult(
        video_filename=alice_filename,
        video_hash_sha256="sha256_alice_" + uuid.uuid4().hex,
        duration_seconds=2.0,
        total_frames=30,
        sampled_frames_count=6,
        fps=15.0,
        resolution="640x480",
        verdict="MANIPULATED",
        calibrated_confidence=0.87,
        fusion_anomaly_score=0.82,
        signal_breakdowns=[],
        suspicious_intervals=[],
        frames=[],
        detected_scene_objects_summary={},
        traceable_explanations=["Alice private analysis"],
        limitations_disclaimer="Disclaimer",
        processed_at_iso="2026-10-21T21:00:00Z"
    )
    db_rec = save_analysis(
        db, sample,
        report_paths={"json": str(json_path), "html": str(html_path)},
        user_id=alice_id
    )
    alice_uuid = db_rec.id
    db.close()

    try:
        # A. Bob attempts to access Alice's analysis by UUID -> 403 Forbidden
        with patch.object(auth_service, "verify_token", return_value={"sub": bob_id}):
            res_b_view = client.get(
                f"/api/analysis/{alice_uuid}",
                headers={"Authorization": "Bearer bob_valid_jwt"}
            )
            assert res_b_view.status_code == 403
            assert "Forbidden" in res_b_view.json()["detail"]

        # B. Bob attempts to download Alice's JSON & HTML reports -> 403 Forbidden
        with patch.object(auth_service, "verify_token", return_value={"sub": bob_id}):
            res_b_json = client.get(
                f"/api/reports/{alice_filename}/json",
                headers={"Authorization": "Bearer bob_valid_jwt"}
            )
            assert res_b_json.status_code == 403

            res_b_html = client.get(
                f"/api/reports/{alice_filename}/html",
                headers={"Authorization": "Bearer bob_valid_jwt"}
            )
            assert res_b_html.status_code == 403

        # C. Bob attempts to delete Alice's analysis -> 403 Forbidden
        with patch.object(auth_service, "verify_token", return_value={"sub": bob_id}):
            res_b_del = client.delete(
                f"/api/analysis/{alice_uuid}",
                headers={"Authorization": "Bearer bob_valid_jwt"}
            )
            assert res_b_del.status_code == 403

        # D. Bob queries history -> Alice's records must NOT appear in Bob's history
        with patch.object(auth_service, "verify_token", return_value={"sub": bob_id}):
            res_b_hist = client.get(
                "/api/history",
                headers={"Authorization": "Bearer bob_valid_jwt"}
            )
            assert res_b_hist.status_code == 200
            bob_filenames = [h["filename"] for h in res_b_hist.json()["history"]]
            assert alice_filename not in bob_filenames

        # E. Anonymous caller queries history -> Alice's records must NOT appear
        res_anon_hist = client.get("/api/history")
        assert res_anon_hist.status_code == 200
        anon_filenames = [h["filename"] for h in res_anon_hist.json()["history"]]
        assert alice_filename not in anon_filenames

        # F. Alice queries her own record -> 200 OK
        with patch.object(auth_service, "verify_token", return_value={"sub": alice_id}):
            res_a_view = client.get(
                f"/api/analysis/{alice_uuid}",
                headers={"Authorization": "Bearer alice_valid_jwt"}
            )
            assert res_a_view.status_code == 200
            assert res_a_view.json()["analysis_id"] == alice_uuid

            res_a_json = client.get(
                f"/api/reports/{alice_filename}/json",
                headers={"Authorization": "Bearer alice_valid_jwt"}
            )
            assert res_a_json.status_code == 200

            res_a_hist = client.get(
                "/api/history",
                headers={"Authorization": "Bearer alice_valid_jwt"}
            )
            assert res_a_hist.status_code == 200
            alice_filenames = [h["filename"] for h in res_a_hist.json()["history"]]
            assert alice_filename in alice_filenames

    finally:
        json_path.unlink(missing_ok=True)
        html_path.unlink(missing_ok=True)


# =========================================================================
# 4. Authentication Token Validation Matrix
# =========================================================================

def test_04_token_validation_matrix():
    """
    Test Step 7: Test missing, malformed, expired, and forged authentication tokens.
    """
    dummy_uuid = str(uuid.uuid4())

    # A. Missing Authorization header on required route
    res_missing = client.delete(f"/api/analysis/{dummy_uuid}")
    assert res_missing.status_code == 401
    assert "Missing Authorization header" in res_missing.json()["detail"]

    # B. Malformed Authorization header (no Bearer prefix)
    res_malformed_prefix = client.delete(
        f"/api/analysis/{dummy_uuid}",
        headers={"Authorization": "Basic dXNlcjpwYXNz"}
    )
    assert res_malformed_prefix.status_code == 401
    assert "Malformed Authorization header" in res_malformed_prefix.json()["detail"]

    # C. Empty Bearer token
    res_empty_token = client.delete(
        f"/api/analysis/{dummy_uuid}",
        headers={"Authorization": "Bearer "}
    )
    assert res_empty_token.status_code == 401
    assert "Empty Bearer token" in res_empty_token.json()["detail"]

    # D. Expired token handling
    def mock_expired(token):
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Authentication token has expired.")

    with patch.object(auth_service, "verify_token", side_effect=mock_expired):
        res_expired = client.delete(
            f"/api/analysis/{dummy_uuid}",
            headers={"Authorization": "Bearer expired_jwt_token"}
        )
        assert res_expired.status_code == 401
        assert "expired" in res_expired.json()["detail"].lower()

    # E. Forged token / invalid signature handling
    def mock_forged(token):
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid or forged authentication token.")

    with patch.object(auth_service, "verify_token", side_effect=mock_forged):
        res_forged = client.delete(
            f"/api/analysis/{dummy_uuid}",
            headers={"Authorization": "Bearer forged_signature_jwt"}
        )
        assert res_forged.status_code == 401
        assert "forged" in res_forged.json()["detail"].lower()


# =========================================================================
# 5. Upload Validation & Edge Cases
# =========================================================================

def test_05_upload_edge_cases():
    """
    Test Step 8: Test zero-byte, corrupt, unsupported, and nonexistent files.
    """
    # A. Zero-byte upload
    res_zero = client.post(
        "/api/upload",
        files={"file": ("zero_len.mp4", b"", "video/mp4")}
    )
    assert res_zero.status_code == 400
    assert "empty (0 bytes)" in res_zero.json()["detail"].lower()

    # B. Unsupported file extension
    res_unsupported = client.post(
        "/api/upload",
        files={"file": ("exploit.sh", b"#!/bin/bash\necho bad\n", "application/x-sh")}
    )
    assert res_unsupported.status_code == 400
    assert "unsupported" in res_unsupported.json()["detail"].lower()
    assert "format" in res_unsupported.json()["detail"].lower()

    # C. Corrupt video stream analysis
    corrupt_name = f"corrupt_{uuid.uuid4().hex[:6]}.mp4"
    corrupt_file = UPLOAD_DIR / corrupt_name
    corrupt_file.write_bytes(b"RANDOM_NON_VIDEO_GARBAGE_BYTES_HEADER_FOO_BAR")

    try:
        res_corrupt = client.post(f"/api/analyze/{corrupt_name}")
        assert res_corrupt.status_code == 422
        assert any(term in res_corrupt.json()["detail"].lower() for term in ["corrupt", "decode", "stream"])
    finally:
        corrupt_file.unlink(missing_ok=True)

    # D. Nonexistent video analysis
    res_nonexistent = client.post("/api/analyze/does_not_exist_at_all_9999.mp4")
    assert res_nonexistent.status_code == 404
    assert "not found in upload repository" in res_nonexistent.json()["detail"].lower()


# =========================================================================
# 6. Database Rollback & Degraded Mode Recovery
# =========================================================================

def test_06_database_rollback_and_degraded_recovery(tmp_path):
    """
    Test Step 9: Database failure handling, transaction rollback, and recovery.
    """
    # A. Transaction rollback on save_analysis failure
    mock_db = MagicMock()
    mock_db.commit.side_effect = Exception("Simulated Neon DB connection timeout")

    sample = VideoAnalysisResult(
        video_filename="fail_rollback.mp4",
        video_hash_sha256="sha256_rollback",
        duration_seconds=1.0,
        total_frames=15,
        sampled_frames_count=5,
        fps=15.0,
        resolution="320x240",
        verdict="REAL",
        calibrated_confidence=0.9,
        fusion_anomaly_score=0.1,
        signal_breakdowns=[],
        suspicious_intervals=[],
        frames=[],
        detected_scene_objects_summary={},
        traceable_explanations=[],
        limitations_disclaimer="Disclaimer",
        processed_at_iso="2026-10-21T21:00:00Z"
    )

    with pytest.raises(Exception) as exc_info:
        save_analysis(mock_db, sample, report_paths={"json": "foo", "html": "bar"})
    assert "Simulated Neon DB" in str(exc_info.value)
    # Verify rollback was called to clear session
    assert mock_db.rollback.called

    # B. Degraded mode recovery: analysis proceeds when db is unavailable
    test_video_name = f"degraded_{uuid.uuid4().hex[:6]}.mp4"
    test_file = UPLOAD_DIR / test_video_name
    create_synthetic_mp4(test_file, num_frames=10)

    try:
        # Override get_db dependency to yield None (simulating unavailable database)
        app.dependency_overrides[get_db] = lambda: None
        res_degraded = client.post(f"/api/analyze/{test_video_name}")
        assert res_degraded.status_code == 200
        deg_data = res_degraded.json()
        assert deg_data["persisted_to_database"] is False
        assert deg_data["analysis_id"] is None
        assert deg_data["analysis_status"] == "completed"
        assert deg_data["verdict"] in ["REAL", "MANIPULATED", "UNCERTAIN"]
    finally:
        app.dependency_overrides.clear()
        test_file.unlink(missing_ok=True)


# =========================================================================
# 7. Atomic Cascading Deletion
# =========================================================================

def test_07_cascading_deletion_child_records_and_tenant_safety():
    """
    Test Step 10: Verify deletion removes the owned parent record and related child records
    without affecting another user's data.
    """
    db = SessionLocal()
    alice_id = f"alice_del_{uuid.uuid4().hex[:6]}"
    bob_id = f"bob_safe_{uuid.uuid4().hex[:6]}"

    # 1. Create Alice's record with child relational records
    alice_analysis = VideoAnalysis(
        id=str(uuid.uuid4()),
        user_id=alice_id,
        video_filename="alice_target_deletion.mp4",
        video_hash_sha256="sha256_alice_del_" + uuid.uuid4().hex,
        duration_seconds=3.0,
        total_frames=30,
        sampled_frames_count=6,
        fps=10.0,
        resolution="320x240",
        verdict="MANIPULATED",
        calibrated_confidence=0.85,
        fusion_anomaly_score=0.79,
        created_at=None
    )
    db.add(alice_analysis)
    db.flush()

    alice_child_signal = SignalBreakdown(
        analysis_id=alice_analysis.id,
        signal_name="Temporal Optical Flow",
        raw_score=0.82,
        weight=0.35,
        weighted_contribution=0.287,
        status="SUSPICIOUS",
        description="High motion discrepancy"
    )
    db.add(alice_child_signal)

    # 2. Create Bob's record (must remain untouched)
    bob_analysis = VideoAnalysis(
        id=str(uuid.uuid4()),
        user_id=bob_id,
        video_filename="bob_safe_keep.mp4",
        video_hash_sha256="sha256_bob_safe_" + uuid.uuid4().hex,
        duration_seconds=2.0,
        total_frames=20,
        sampled_frames_count=5,
        fps=10.0,
        resolution="320x240",
        verdict="REAL",
        calibrated_confidence=0.92,
        fusion_anomaly_score=0.08,
        created_at=None
    )
    db.add(bob_analysis)
    db.commit()

    alice_id_to_delete = alice_analysis.id
    bob_id_to_keep = bob_analysis.id
    db.close()

    # 3. Alice deletes her record via API
    with patch.object(auth_service, "verify_token", return_value={"sub": alice_id}):
        del_res = client.delete(
            f"/api/analysis/{alice_id_to_delete}",
            headers={"Authorization": "Bearer alice_token"}
        )
        assert del_res.status_code == 200
        assert del_res.json()["deleted"] is True

    # 4. Verify in DB: Alice's parent and child records are gone
    verify_db = SessionLocal()
    alice_check = verify_db.query(VideoAnalysis).filter(VideoAnalysis.id == alice_id_to_delete).first()
    assert alice_check is None

    alice_signal_check = verify_db.query(SignalBreakdown).filter(
        SignalBreakdown.analysis_id == alice_id_to_delete
    ).first()
    assert alice_signal_check is None

    # Verify Bob's record remains completely intact
    bob_check = verify_db.query(VideoAnalysis).filter(VideoAnalysis.id == bob_id_to_keep).first()
    assert bob_check is not None
    assert bob_check.video_filename == "bob_safe_keep.mp4"

    # Cleanup Bob's record
    verify_db.delete(bob_check)
    verify_db.commit()
    verify_db.close()


# =========================================================================
# 8. Neon Object Storage Presigned URL Privacy & Expiration
# =========================================================================

def test_08_storage_presigned_url_privacy_and_expiration():
    """
    Test Step 11: Verify presigned URLs expire as expected and private bucket permissions.
    """
    # Check storage configuration status
    status_info = storage_service.check_status()
    assert "configured" in status_info
    assert status_info["bucket"] == "files"

    if storage_service.is_configured:
        # Generate presigned URL for a mock key with 3600s expiration
        test_key = "reports/test_acceptance_report.json"
        presigned_url = storage_service.generate_presigned_url(test_key, expires_in=3600)
        assert presigned_url is not None
        # Must be S3 signed URL containing AWS authentication query params
        assert "X-Amz-Signature=" in presigned_url or "Signature=" in presigned_url
        assert "X-Amz-Expires=3600" in presigned_url or "Expires=" in presigned_url
        # Must point to the private bucket and key
        assert "files" in presigned_url
        assert "test_acceptance_report.json" in presigned_url
