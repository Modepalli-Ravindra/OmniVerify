from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ObjectDetection(BaseModel):
    label: str
    confidence: float
    box: List[float] = Field(description="Normalized coordinates [x1, y1, x2, y2] between 0.0 and 1.0")

class FrameForensicSignal(BaseModel):
    frame_index: int
    timestamp_ms: float
    timestamp_formatted: str
    thumbnail_data: Optional[str] = Field(default=None, description="Base64 JPEG thumbnail or relative URI")
    heatmap_data: Optional[str] = Field(default=None, description="Base64 spatial anomaly heatmap")
    noise_residual_score: float = Field(ge=0.0, le=1.0)
    frequency_score: float = Field(ge=0.0, le=1.0)
    motion_inconsistency_score: float = Field(ge=0.0, le=1.0)
    frame_anomaly_score: float = Field(ge=0.0, le=1.0)
    is_suspicious: bool
    detected_objects: List[ObjectDetection] = []

class SuspiciousInterval(BaseModel):
    start_timestamp_ms: float
    end_timestamp_ms: float
    start_formatted: str
    end_formatted: str
    start_frame: int
    end_frame: int
    average_anomaly_score: float
    primary_contributing_signal: str
    evidence_rationale: str

class SignalBreakdown(BaseModel):
    signal_name: str
    raw_score: float
    weight: float
    weighted_contribution: float
    status: str
    description: str

class VideoAnalysisResult(BaseModel):
    video_filename: str
    video_hash_sha256: str
    duration_seconds: float
    total_frames: int
    sampled_frames_count: int
    fps: float
    resolution: str
    verdict: str = Field(description="REAL | MANIPULATED | UNCERTAIN")
    calibrated_confidence: float = Field(ge=0.0, le=1.0)
    fusion_anomaly_score: float = Field(ge=0.0, le=1.0)
    signal_breakdowns: List[SignalBreakdown]
    suspicious_intervals: List[SuspiciousInterval]
    frames: List[FrameForensicSignal]
    detected_scene_objects_summary: Dict[str, int]
    traceable_explanations: List[str]
    limitations_disclaimer: str
    processed_at_iso: str
    executive_brief: Optional[Dict[str, Any]] = None
    storage_report_url: Optional[str] = None
    analysis_id: Optional[str] = Field(default=None, description="UUID primary key if persisted to database")
    analysis_status: str = Field(default="completed", description="pending | processing | completed | failed")
    user_id: Optional[str] = Field(default=None, description="Authenticated owner ID")
    persisted_to_database: bool = Field(default=False, description="Indicates whether analysis was durably stored in PostgreSQL")

class VideoUploadResponse(BaseModel):
    task_id: str
    filename: str
    status: str
    message: str
    file_size_bytes: Optional[int] = None

class AnalysisSummaryItem(BaseModel):
    id: Optional[str] = None
    filename: str
    verdict: str
    confidence: float
    duration: float
    processed_at: Optional[str] = None
    persisted: bool = False

class HistoryResponse(BaseModel):
    source: str = Field(description="neon_postgres | in_memory")
    authenticated_user_id: Optional[str] = None
    count: int = 0
    history: List[AnalysisSummaryItem] = []
