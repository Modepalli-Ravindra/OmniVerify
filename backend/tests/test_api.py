import cv2
import numpy as np
from pathlib import Path
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import UPLOAD_DIR

client = TestClient(app)

def test_api_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["app"] == "OmniVerify"

def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "models" in data

def test_upload_invalid_extension():
    response = client.post(
        "/api/upload",
        files={"file": ("test.exe", b"invalid binary", "application/octet-stream")}
    )
    assert response.status_code == 400

def test_end_to_end_upload_and_analyze(tmp_path):
    # Create sample synthetic video
    video_filename = "api_test_clip.mp4"
    video_path = UPLOAD_DIR / video_filename
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(video_path), fourcc, 15, (320, 240))
    for i in range(15):
        frame = np.full((240, 320, 3), 100, dtype=np.uint8)
        cv2.circle(frame, (100 + i * 2, 100), 20, (255, 100, 100), -1)
        out.write(frame)
    out.release()

    # Call analyze endpoint
    response = client.post(f"/api/analyze/{video_filename}")
    assert response.status_code == 200
    data = response.json()
    assert data["video_filename"] == video_filename
    assert data["verdict"] in ["REAL", "MANIPULATED", "UNCERTAIN"]
    assert len(data["signal_breakdowns"]) == 4
    assert len(data["frames"]) > 0

    # Test report retrieval
    json_rep = client.get(f"/api/reports/{video_filename}/json")
    assert json_rep.status_code == 200

    html_rep = client.get(f"/api/reports/{video_filename}/html")
    assert html_rep.status_code == 200
    assert "OmniVerify Forensic Examination Dossier" in html_rep.text
