import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.storage import storage_service
from backend.app.core.auth import auth_service
from backend.app.services.ai_gateway import ai_gateway_service
from backend.app.db.session import SessionLocal, check_database_connection
from backend.app.db.crud import save_analysis
from backend.app.api.schemas import VideoAnalysisResult, SignalBreakdown, SuspiciousInterval
import uuid
from pathlib import Path

client = TestClient(app)

def test_api_health_includes_neon_services():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "database" in data
    assert "storage" in data
    assert "auth" in data
    assert "ai_gateway" in data

def test_neon_database_status():
    response = client.get("/api/database/status")
    assert response.status_code == 200
    data = response.json()
    assert data.get("configured") is True

def test_neon_storage_service():
    response = client.get("/api/storage/status")
    assert response.status_code == 200
    data = response.json()
    assert data.get("configured") is True
    assert data.get("bucket") == "files"

def test_neon_auth_unauthenticated_and_invalid_tokens():
    response = client.get("/api/auth/status")
    assert response.status_code == 200
    data = response.json()
    assert data.get("configured") is True
    assert "EdDSA" in data.get("algorithm", "")

    # 1. Unauthenticated request must return 401
    res1 = client.get("/api/history/protected")
    assert res1.status_code == 401
    assert "Missing Authorization header" in res1.json()["detail"]

    # 2. Malformed token must return 401
    res2 = client.get("/api/history/protected", headers={"Authorization": "Bearer malformed.jwt.token"})
    assert res2.status_code == 401

    # 3. Forged token must return 401
    res3 = client.get("/api/history/protected", headers={"Authorization": "Bearer eyJhbGciOiJFZERTQTE5In0.eyJzdWIiOiIxMjMifQ.forgedsig"})
    assert res3.status_code == 401

def test_user_level_history_authorization_isolation():
    """
    Validates that User B cannot access User A's private analysis history.
    """
    user_a_id = f"user_a_{uuid.uuid4().hex[:8]}"
    user_b_id = f"user_b_{uuid.uuid4().hex[:8]}"

    # Save a record belonging to User A
    db = SessionLocal()
    sample_a = VideoAnalysisResult(
        video_filename="user_a_private.mp4",
        video_hash_sha256="hash_user_a_" + uuid.uuid4().hex,
        duration_seconds=3.0,
        total_frames=90,
        sampled_frames_count=10,
        fps=30.0,
        resolution="1280x720",
        verdict="REAL",
        calibrated_confidence=0.91,
        fusion_anomaly_score=0.09,
        signal_breakdowns=[],
        suspicious_intervals=[],
        frames=[],
        detected_scene_objects_summary={},
        traceable_explanations=["Nominal"],
        limitations_disclaimer="Disclaimer",
        processed_at_iso="2026-10-21T12:00:00Z"
    )
    saved_a = save_analysis(db, sample_a, user_id=user_a_id)
    db.close()

    try:
        # Mock authenticated User B requesting protected history
        with patch.object(auth_service, "verify_token", return_value={"sub": user_b_id, "email": "bob@example.com"}):
            res_b = client.get("/api/history/protected", headers={"Authorization": "Bearer valid_token_user_b"})
            assert res_b.status_code == 200
            data_b = res_b.json()
            assert data_b["authenticated_user_id"] == user_b_id
            filenames_b = [h["filename"] for h in data_b["history"]]
            # User B must NOT see User A's private analysis
            assert "user_a_private.mp4" not in filenames_b

        # Mock authenticated User A requesting protected history
        with patch.object(auth_service, "verify_token", return_value={"sub": user_a_id, "email": "alice@example.com"}):
            res_a = client.get("/api/history/protected", headers={"Authorization": "Bearer valid_token_user_a"})
            assert res_a.status_code == 200
            data_a = res_a.json()
            assert data_a["authenticated_user_id"] == user_a_id
            filenames_a = [h["filename"] for h in data_a["history"]]
            # User A MUST see User A's private analysis
            assert "user_a_private.mp4" in filenames_a

    finally:
        # Cleanup
        db = SessionLocal()
        record_to_delete = db.query(saved_a.__class__).filter_by(id=saved_a.id).first()
        if record_to_delete:
            db.delete(record_to_delete)
            db.commit()
        db.close()

def test_neon_ai_gateway_service():
    response = client.get("/api/ai-gateway/status")
    assert response.status_code == 200
    data = response.json()
    assert data.get("configured") is True

    # Test deterministic synthesis fallback and brief generation
    brief = ai_gateway_service.generate_executive_forensic_brief({
        "verdict": "REAL",
        "calibrated_confidence": 0.94,
        "fusion_anomaly_score": 0.06,
        "signal_breakdowns": [
            {"signal": "prnu", "raw": 0.05, "status": "PASS"},
            {"signal": "optical_flow", "raw": 0.07, "status": "PASS"}
        ]
    })
    assert "summary" in brief
    assert "source" in brief
    assert "REAL" in brief["summary"]

def test_storage_presigned_url_and_privacy():
    if storage_service.is_configured:
        key = f"test_reports/test_privacy_{uuid.uuid4().hex[:6]}.json"
        temp_file = Path("backend/temp/test_privacy.json")
        temp_file.parent.mkdir(parents=True, exist_ok=True)
        temp_file.write_text('{"test": "confidential"}')

        try:
            uploaded = storage_service.upload_file(temp_file, key, content_type="application/json")
            assert uploaded is True

            presigned_url = storage_service.generate_presigned_url(key, expires_in=60)
            assert presigned_url is not None
            assert "AWSAccessKeyId=" in presigned_url or "X-Amz-Signature=" in presigned_url

        finally:
            storage_service.delete_file(key)
            temp_file.unlink(missing_ok=True)
