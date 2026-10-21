import pytest
import cv2
import numpy as np
from pathlib import Path
from backend.app.services.video_processor import VideoProcessor, VideoMetadata, ExtractedFrame
from backend.app.core.config import settings

@pytest.fixture
def sample_video_path(tmp_path):
    video_file = tmp_path / "test_authentic_camera.mp4"
    width, height = 320, 240
    fps = 20
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(video_file), fourcc, fps, (width, height))

    # Generate 30 frames with smooth motion
    for i in range(30):
        frame = np.full((height, width, 3), 120, dtype=np.uint8)
        # Draw moving circle simulating natural camera motion
        cv2.circle(frame, (50 + i * 5, 100), 25, (40, 180, 50), -1)
        out.write(frame)
    out.release()
    return video_file

def test_inspect_video_metadata(sample_video_path):
    meta = VideoProcessor.inspect_video(sample_video_path)
    assert meta.filename == "test_authentic_camera.mp4"
    assert meta.total_frames == 30
    assert meta.fps == 20.0
    assert meta.width == 320
    assert meta.height == 240
    assert len(meta.sha256) == 64

def test_sample_frames_bounded(sample_video_path):
    meta, frames = VideoProcessor.sample_frames_bounded(sample_video_path, max_frames=10)
    assert len(frames) == 10
    assert all(isinstance(f, ExtractedFrame) for f in frames)
    assert frames[0].timestamp_ms == 0.0
    assert frames[-1].timestamp_ms > 0.0
    assert len(frames[0].to_base64_jpeg()) > 50
