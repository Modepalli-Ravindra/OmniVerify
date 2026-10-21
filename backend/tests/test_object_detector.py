import numpy as np
import cv2
from backend.app.models.object_detector import ObjectSceneDetector
from backend.app.api.schemas import ObjectDetection

def test_object_detector_frame():
    detector = ObjectSceneDetector()
    img = np.zeros((300, 300, 3), dtype=np.uint8)
    # Draw high contrast rectangle simulating foreground object
    cv2.rectangle(img, (50, 50), (250, 250), (200, 200, 200), -1)

    detections = detector.detect_in_frame(img, confidence_threshold=0.3)
    assert isinstance(detections, list)
    if detections:
        assert isinstance(detections[0], ObjectDetection)
        assert 0.0 <= detections[0].box[0] <= 1.0

def test_temporal_scene_coherence():
    detector = ObjectSceneDetector()
    d1 = [ObjectDetection(label="person", confidence=0.9, box=[0.1, 0.1, 0.5, 0.8])]
    d2 = [ObjectDetection(label="person", confidence=0.88, box=[0.12, 0.1, 0.52, 0.8])]
    
    score_smooth = detector.analyze_temporal_scene_coherence([d1, d2, d1, d2])
    assert 0.0 <= score_smooth <= 0.25

    # High jitter (abrupt popping)
    d_many = [ObjectDetection(label="car", confidence=0.8, box=[0.1, 0.1, 0.4, 0.4])] * 8
    score_jitter = detector.analyze_temporal_scene_coherence([d1, d_many, d1, d_many])
    assert score_jitter > score_smooth
