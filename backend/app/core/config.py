import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
TEMP_DIR = BASE_DIR / "temp"
REPORTS_DIR = BASE_DIR / "reports"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    APP_NAME: str = "OmniVerify"
    APP_TITLE: str = "Intelligent Multi-Dimensional Analysis for DeepFake Video Identification"
    VERSION: str = "1.0.0"
    ACADEMIC_YEAR: str = "2026-27"
    
    # Bounded CPU sampling configuration
    MAX_ANALYSIS_FRAMES: int = 40
    MIN_ANALYSIS_FRAMES: int = 12
    TARGET_FRAME_WIDTH: int = 640
    TARGET_FRAME_HEIGHT: int = 360
    
    # Forensic Signal Weights for Bayesian Fusion
    WEIGHT_OBJECT_COHERENCE: float = 0.15
    WEIGHT_NOISE_RESIDUAL: float = 0.25
    WEIGHT_TEMPORAL_FLOW: float = 0.30
    WEIGHT_FREQUENCY_SPECTRUM: float = 0.30
    
    # Calibrated Classification Thresholds
    THRESHOLD_AUTHENTIC_CEILING: float = 0.38
    THRESHOLD_MANIPULATION_FLOOR: float = 0.62
    
    # Supported video formats
    ALLOWED_EXTENSIONS: set = {".mp4", ".avi", ".mov", ".webm", ".mkv"}
    MAX_FILE_SIZE_MB: int = 100

settings = Settings()
