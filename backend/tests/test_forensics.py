import numpy as np
import cv2
from backend.app.models.visual_manipulation import VisualManipulationDetector
from backend.app.models.frequency_forensics import FrequencyForensics

def test_visual_noise_residual():
    detector = VisualManipulationDetector()
    # Create synthetic frame with uniform noise
    np.random.seed(42)
    img = np.random.randint(50, 200, (200, 200, 3), dtype=np.uint8)
    
    score, heatmap = detector.compute_frame_noise_score(img)
    assert 0.0 <= score <= 1.0
    assert heatmap.shape == (200, 200)
    assert heatmap.dtype == np.uint8

    overlay = detector.generate_heatmap_overlay_base64(img, heatmap)
    assert overlay.startswith("data:image/jpeg;base64,")

def test_frequency_spectrum_analysis():
    ff = FrequencyForensics()
    # Create smooth natural-like image
    y, x = np.mgrid[0:200, 0:200]
    img = (np.sin(x / 10.0) * 50 + 128).astype(np.uint8)
    img_bgr = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

    score, metrics = ff.analyze_frequency_spectrum(img_bgr)
    assert 0.0 <= score <= 1.0
    assert "low_energy_ratio" in metrics
    assert "high_energy_ratio" in metrics
    assert metrics["low_energy_ratio"] >= 0.0
