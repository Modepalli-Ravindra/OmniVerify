import numpy as np
import cv2
from backend.app.models.temporal_analyzer import TemporalMotionAnalyzer

def test_temporal_motion_analyzer():
    analyzer = TemporalMotionAnalyzer()
    
    # Frame 1 and Frame 2 with small translation
    f1 = np.zeros((150, 150, 3), dtype=np.uint8)
    f2 = np.zeros((150, 150, 3), dtype=np.uint8)
    cv2.circle(f1, (60, 60), 20, (255, 255, 255), -1)
    cv2.circle(f2, (64, 60), 20, (255, 255, 255), -1)

    mag, anomaly, ssim = analyzer.compute_dense_optical_flow(f1, f2)
    assert mag > 0.0
    assert 0.0 <= anomaly <= 1.0
    assert 0.0 <= ssim <= 1.0

def test_temporal_sequence_analysis():
    analyzer = TemporalMotionAnalyzer()
    frames = [np.full((100, 100, 3), 50 + i * 5, dtype=np.uint8) for i in range(5)]
    scores = analyzer.analyze_sequence(frames)
    assert len(scores) == 5
    assert all(0.0 <= s <= 1.0 for s in scores)
