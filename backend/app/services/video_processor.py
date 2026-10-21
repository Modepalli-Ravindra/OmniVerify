import cv2
import hashlib
import base64
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Tuple
from ..core.config import settings

class VideoMetadata:
    def __init__(self, filename: str, path: Path, duration: float, fps: float, total_frames: int, width: int, height: int, sha256: str):
        self.filename = filename
        self.path = path
        self.duration = duration
        self.fps = fps if fps > 0 else 25.0
        self.total_frames = total_frames
        self.width = width
        self.height = height
        self.sha256 = sha256

    @property
    def resolution_str(self) -> str:
        return f"{self.width}x{self.height}"

class ExtractedFrame:
    def __init__(self, index: int, timestamp_ms: float, image_bgr: np.ndarray):
        self.index = index
        self.timestamp_ms = timestamp_ms
        self.image_bgr = image_bgr

    @property
    def timestamp_formatted(self) -> str:
        seconds = self.timestamp_ms / 1000.0
        mins = int(seconds // 60)
        secs = int(seconds % 60)
        millis = int((seconds - int(seconds)) * 1000)
        return f"{mins:02d}:{secs:02d}.{millis:03d}"

    def to_base64_jpeg(self, quality: int = 75) -> str:
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        success, buffer = cv2.imencode('.jpg', self.image_bgr, encode_param)
        if not success:
            return ""
        return "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

class VideoProcessor:
    @staticmethod
    def calculate_file_sha256(filepath: Path) -> str:
        sha = hashlib.sha256()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha.update(chunk)
        return sha.hexdigest()

    @classmethod
    def inspect_video(cls, video_path: Path) -> VideoMetadata:
        if not video_path.exists():
            raise FileNotFoundError(f"Video file not found at {video_path}")

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"OpenCV could not open video stream: {video_path.name}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = total_frames / fps if fps > 0 and total_frames > 0 else 0.0
        cap.release()

        sha256 = cls.calculate_file_sha256(video_path)

        return VideoMetadata(
            filename=video_path.name,
            path=video_path,
            duration=round(duration, 3),
            fps=round(fps, 2),
            total_frames=total_frames,
            width=width,
            height=height,
            sha256=sha256
        )

    @classmethod
    def sample_frames_bounded(cls, video_path: Path, max_frames: int = None) -> Tuple[VideoMetadata, List[ExtractedFrame]]:
        metadata = cls.inspect_video(video_path)
        budget = max_frames or settings.MAX_ANALYSIS_FRAMES
        
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Could not open {video_path}")

        total = metadata.total_frames
        if total <= 0:
            # Fallback for streams without valid frame counts
            frames = []
            idx = 0
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                if idx % 10 == 0:
                    ts = (idx / metadata.fps) * 1000.0
                    resized = cv2.resize(frame, (settings.TARGET_FRAME_WIDTH, settings.TARGET_FRAME_HEIGHT))
                    frames.append(ExtractedFrame(idx, ts, resized))
                    if len(frames) >= budget:
                        break
                idx += 1
            cap.release()
            return metadata, frames

        # Two-pass bounded selection:
        # Pass 1: Select uniform anchor points with extra coverage on scene transitions
        if total <= budget:
            selected_indices = list(range(total))
        else:
            step = total / float(budget)
            selected_indices = [int(i * step) for i in range(budget)]
            selected_indices = sorted(list(set(selected_indices)))

        # Pass 2: Sequential extraction keeping memory tightly bounded
        extracted: List[ExtractedFrame] = []
        target_idx_set = set(selected_indices)
        current_idx = 0

        while cap.isOpened() and len(extracted) < len(selected_indices):
            ret, frame = cap.read()
            if not ret:
                break

            if current_idx in target_idx_set:
                ts_ms = (current_idx / metadata.fps) * 1000.0 if metadata.fps > 0 else current_idx * 40.0
                resized = cv2.resize(frame, (settings.TARGET_FRAME_WIDTH, settings.TARGET_FRAME_HEIGHT), interpolation=cv2.INTER_AREA)
                extracted.append(ExtractedFrame(current_idx, ts_ms, resized))

            current_idx += 1

        cap.release()
        return metadata, extracted
