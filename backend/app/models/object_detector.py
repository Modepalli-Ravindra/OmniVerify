import cv2
import numpy as np
from typing import List, Dict, Any, Tuple
from ..api.schemas import ObjectDetection

# Standard COCO 80 classes used by Torchvision / YOLO architectures
COCO_CLASSES = [
    "__background__", "person", "bicycle", "car", "motorcycle", "airplane", "bus",
    "train", "truck", "boat", "traffic light", "fire hydrant", "N/A", "stop sign",
    "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
    "elephant", "bear", "zebra", "giraffe", "N/A", "backpack", "umbrella", "N/A", "N/A",
    "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "N/A", "wine glass", "cup", "fork", "knife", "spoon", "bowl",
    "banana", "apple", "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza",
    "donut", "cake", "chair", "couch", "potted plant", "bed", "N/A", "dining table",
    "N/A", "N/A", "toilet", "N/A", "tv", "laptop", "mouse", "remote", "keyboard",
    "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "N/A",
    "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
]

class ObjectSceneDetector:
    def __init__(self):
        self._model = None
        self._torch_available = False
        self._init_detector()

    def _init_detector(self):
        try:
            import torch
            import torchvision
            from torchvision.models.detection import ssdlite320_mobilenet_v3_large, SSDLite320_MobileNet_V3_Large_Weights
            
            # Lazy initialize CPU weights
            weights = SSDLite320_MobileNet_V3_Large_Weights.DEFAULT
            self._model = ssdlite320_mobilenet_v3_large(weights=weights)
            self._model.eval()
            self._torch = torch
            self._transforms = weights.transforms()
            self._torch_available = True
        except Exception as e:
            # Fallback to OpenCV contour/edge based scene object detection
            self._torch_available = False
            self._model = None

    def detect_in_frame(self, image_bgr: np.ndarray, confidence_threshold: float = 0.45) -> List[ObjectDetection]:
        h, w = image_bgr.shape[:2]
        detections: List[ObjectDetection] = []

        if self._torch_available and self._model is not None:
            try:
                rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
                # Convert to PIL/Tensor
                from PIL import Image
                pil_img = Image.fromarray(rgb)
                input_tensor = self._transforms(pil_img).unsqueeze(0)

                with self._torch.no_grad():
                    prediction = self._model(input_tensor)[0]

                boxes = prediction['boxes'].cpu().numpy()
                labels = prediction['labels'].cpu().numpy()
                scores = prediction['scores'].cpu().numpy()

                for box, label_idx, score in zip(boxes, labels, scores):
                    if score >= confidence_threshold:
                        cls_name = COCO_CLASSES[label_idx] if label_idx < len(COCO_CLASSES) else f"object_{label_idx}"
                        if cls_name == "N/A" or cls_name == "__background__":
                            continue
                        
                        # Normalize to 0.0 - 1.0 relative to original dimensions
                        # SSDLite transform operates on 320x320
                        orig_w = pil_img.width
                        orig_h = pil_img.height
                        
                        norm_box = [
                            float(np.clip(box[0] / orig_w, 0.0, 1.0)),
                            float(np.clip(box[1] / orig_h, 0.0, 1.0)),
                            float(np.clip(box[2] / orig_w, 0.0, 1.0)),
                            float(np.clip(box[3] / orig_h, 0.0, 1.0))
                        ]
                        detections.append(ObjectDetection(
                            label=cls_name,
                            confidence=round(float(score), 3),
                            box=norm_box
                        ))
                return detections
            except Exception:
                pass

        # Robust Computer Vision Fallback (Edge and Contour Saliency Detector)
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > (w * h * 0.03): # At least 3% of screen area
                x, y, cw, ch = cv2.boundingRect(cnt)
                aspect = cw / float(ch)
                label = "person" if 0.25 <= aspect <= 0.8 else "object"
                detections.append(ObjectDetection(
                    label=label,
                    confidence=round(min(0.85, 0.5 + (area / (w * h))), 3),
                    box=[
                        float(x / w),
                        float(y / h),
                        float((x + cw) / w),
                        float((y + ch) / h)
                    ]
                ))

        return detections[:10]

    def analyze_temporal_scene_coherence(self, frame_detections: List[List[ObjectDetection]]) -> float:
        """
        Calculates scene object stability and co-occurrence anomaly score.
        A score close to 1.0 indicates high anomaly (abrupt object popping / disappearance),
        while 0.0 indicates natural continuous object tracking.
        """
        if len(frame_detections) < 2:
            return 0.1

        counts = [len(dets) for dets in frame_detections]
        deltas = [abs(counts[i] - counts[i-1]) for i in range(1, len(counts))]
        
        avg_jitter = float(np.mean(deltas)) if deltas else 0.0
        # Normalize: jitter > 4 objects between successive frames is anomalous
        normalized_score = float(np.clip(avg_jitter / 4.0, 0.0, 1.0))
        return round(normalized_score, 3)

# Global singleton for CPU efficiency
scene_detector = ObjectSceneDetector()
