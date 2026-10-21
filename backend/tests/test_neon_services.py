import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.storage import storage_service
from backend.app.core.auth import auth_service
from backend.app.services.ai_gateway import ai_gateway_service
from backend.app.db.session import check_database_connection

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

def test_neon_auth_status_and_protection():
    response = client.get("/api/auth/status")
    assert response.status_code == 200
    data = response.json()
    assert data.get("configured") is True
    assert "EdDSA" in data.get("algorithm", "")

    # Protected history must reject unauthenticated requests with 401
    protected_res = client.get("/api/history/protected")
    assert protected_res.status_code == 401
    assert "Missing Authorization header" in protected_res.json()["detail"]

    # Open history endpoint should succeed
    open_res = client.get("/api/history")
    assert open_res.status_code == 200
    assert "history" in open_res.json()

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
