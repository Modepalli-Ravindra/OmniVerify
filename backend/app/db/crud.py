from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from .models import VideoAnalysis, SignalBreakdown, SuspiciousInterval, ForensicReport
from ..api.schemas import VideoAnalysisResult

def save_analysis(
    db: Session,
    analysis: VideoAnalysisResult,
    report_paths: Optional[Dict[str, str]] = None
) -> VideoAnalysis:
    """
    Saves video analysis results and relational sub-entities in a single transaction.
    """
    db_analysis = VideoAnalysis(
        video_filename=analysis.video_filename,
        video_hash_sha256=analysis.video_hash_sha256,
        duration_seconds=analysis.duration_seconds,
        total_frames=analysis.total_frames,
        sampled_frames_count=analysis.sampled_frames_count,
        fps=analysis.fps,
        resolution=analysis.resolution,
        verdict=analysis.verdict,
        calibrated_confidence=analysis.calibrated_confidence,
        fusion_anomaly_score=analysis.fusion_anomaly_score,
        detected_scene_objects_summary=analysis.detected_scene_objects_summary,
        traceable_explanations=analysis.traceable_explanations,
        limitations_disclaimer=analysis.limitations_disclaimer
    )
    db.add(db_analysis)
    db.flush() # Generates db_analysis.id

    # Add signal breakdowns
    for sb in analysis.signal_breakdowns:
        db_sb = SignalBreakdown(
            analysis_id=db_analysis.id,
            signal_name=sb.signal_name,
            raw_score=sb.raw_score,
            weight=sb.weight,
            weighted_contribution=sb.weighted_contribution,
            status=sb.status,
            description=sb.description
        )
        db.add(db_sb)

    # Add suspicious intervals
    for inv in analysis.suspicious_intervals:
        db_inv = SuspiciousInterval(
            analysis_id=db_analysis.id,
            start_timestamp_ms=inv.start_timestamp_ms,
            end_timestamp_ms=inv.end_timestamp_ms,
            start_formatted=inv.start_formatted,
            end_formatted=inv.end_formatted,
            start_frame=inv.start_frame,
            end_frame=inv.end_frame,
            average_anomaly_score=inv.average_anomaly_score,
            primary_contributing_signal=inv.primary_contributing_signal,
            evidence_rationale=inv.evidence_rationale
        )
        db.add(db_inv)

    # Add forensic report references
    if report_paths:
        for r_type, r_path in report_paths.items():
            db_rep = ForensicReport(
                analysis_id=db_analysis.id,
                report_type=r_type.upper(),
                file_path=str(r_path)
            )
            db.add(db_rep)

    db.commit()
    db.refresh(db_analysis)
    return db_analysis

def get_analysis_by_id(db: Session, analysis_id: str) -> Optional[VideoAnalysis]:
    return db.query(VideoAnalysis).filter(VideoAnalysis.id == analysis_id).first()

def get_analysis_by_hash(db: Session, sha256_hash: str) -> Optional[VideoAnalysis]:
    return db.query(VideoAnalysis).filter(VideoAnalysis.video_hash_sha256 == sha256_hash).order_by(VideoAnalysis.created_at.desc()).first()

def get_recent_analyses(db: Session, limit: int = 50) -> List[VideoAnalysis]:
    return db.query(VideoAnalysis).order_by(VideoAnalysis.created_at.desc()).limit(limit).all()
