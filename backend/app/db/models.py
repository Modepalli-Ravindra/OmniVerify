import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Text, JSON, DateTime, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import relationship
from .session import Base

class VideoAnalysis(Base):
    __tablename__ = "video_analyses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    video_filename = Column(String(255), nullable=False)
    video_hash_sha256 = Column(String(64), nullable=False, index=True)
    duration_seconds = Column(Float, nullable=False)
    total_frames = Column(Integer, nullable=False)
    sampled_frames_count = Column(Integer, nullable=False)
    fps = Column(Float, nullable=False)
    resolution = Column(String(32), nullable=False)
    verdict = Column(String(20), nullable=False)
    calibrated_confidence = Column(Float, nullable=False)
    fusion_anomaly_score = Column(Float, nullable=False)
    detected_scene_objects_summary = Column(JSON, nullable=True)
    traceable_explanations = Column(JSON, nullable=True)
    limitations_disclaimer = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (
        CheckConstraint("verdict IN ('REAL', 'MANIPULATED', 'UNCERTAIN')", name="check_verdict_valid"),
        Index("idx_analyses_hash_created", "video_hash_sha256", "created_at"),
    )

    signals = relationship("SignalBreakdown", back_populates="analysis", cascade="all, delete-orphan")
    intervals = relationship("SuspiciousInterval", back_populates="analysis", cascade="all, delete-orphan")
    reports = relationship("ForensicReport", back_populates="analysis", cascade="all, delete-orphan")

class SignalBreakdown(Base):
    __tablename__ = "signal_breakdowns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_id = Column(String(36), ForeignKey("video_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    signal_name = Column(String(64), nullable=False)
    raw_score = Column(Float, nullable=False)
    weight = Column(Float, nullable=False)
    weighted_contribution = Column(Float, nullable=False)
    status = Column(String(32), nullable=False)
    description = Column(Text, nullable=True)

    analysis = relationship("VideoAnalysis", back_populates="signals")

class SuspiciousInterval(Base):
    __tablename__ = "suspicious_intervals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_id = Column(String(36), ForeignKey("video_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    start_timestamp_ms = Column(Float, nullable=False)
    end_timestamp_ms = Column(Float, nullable=False)
    start_formatted = Column(String(16), nullable=False)
    end_formatted = Column(String(16), nullable=False)
    start_frame = Column(Integer, nullable=False)
    end_frame = Column(Integer, nullable=False)
    average_anomaly_score = Column(Float, nullable=False)
    primary_contributing_signal = Column(String(64), nullable=False)
    evidence_rationale = Column(Text, nullable=True)

    analysis = relationship("VideoAnalysis", back_populates="intervals")

class ForensicReport(Base):
    __tablename__ = "forensic_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_id = Column(String(36), ForeignKey("video_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    report_type = Column(String(16), nullable=False)
    file_path = Column(String(512), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("report_type IN ('JSON', 'HTML')", name="check_report_type_valid"),
    )

    analysis = relationship("VideoAnalysis", back_populates="reports")
