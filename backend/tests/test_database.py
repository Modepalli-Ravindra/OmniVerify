import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

from backend.app.db.session import Base, check_database_connection
from backend.app.db.models import VideoAnalysis, SignalBreakdown, SuspiciousInterval, ForensicReport
from backend.app.db.crud import save_analysis, get_analysis_by_id, get_recent_analyses, get_analysis_by_hash
from backend.app.api.schemas import VideoAnalysisResult, SignalBreakdown as SignalBreakdownSchema, SuspiciousInterval as SuspiciousIntervalSchema

@pytest.fixture
def in_memory_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_database_connection_check_unconfigured():
    # Without DATABASE_URL set, reports not configured and not connected without crashing
    status = check_database_connection()
    assert "configured" in status
    assert "connected" in status

def test_crud_save_and_retrieve_analysis(in_memory_db):
    sample_result = VideoAnalysisResult(
        video_filename="camera_sample.mp4",
        video_hash_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        duration_seconds=5.2,
        total_frames=120,
        sampled_frames_count=20,
        fps=24.0,
        resolution="640x360",
        verdict="REAL",
        calibrated_confidence=0.912,
        fusion_anomaly_score=0.185,
        signal_breakdowns=[
            SignalBreakdownSchema(
                signal_name="Noise Residual",
                raw_score=0.15,
                weight=0.25,
                weighted_contribution=0.038,
                status="Nominal",
                description="Sensor noise PRNU"
            )
        ],
        suspicious_intervals=[
            SuspiciousIntervalSchema(
                start_timestamp_ms=1000.0,
                end_timestamp_ms=1500.0,
                start_formatted="00:01.000",
                end_formatted="00:01.500",
                start_frame=24,
                end_frame=36,
                average_anomaly_score=0.48,
                primary_contributing_signal="Noise Residual",
                evidence_rationale="Minor variance shift"
            )
        ],
        frames=[],
        detected_scene_objects_summary={"person": 1},
        traceable_explanations=["Verified camera noise"],
        limitations_disclaimer="Probabilistic forensic measurement",
        processed_at_iso=datetime.now(timezone.utc).isoformat()
    )

    db_rec = save_analysis(
        in_memory_db,
        sample_result,
        {"json": "reports/sample.json", "html": "reports/sample.html"}
    )

    assert db_rec.id is not None
    assert db_rec.verdict == "REAL"
    assert len(db_rec.signals) == 1
    assert len(db_rec.intervals) == 1
    assert len(db_rec.reports) == 2

    # Query by ID
    retrieved = get_analysis_by_id(in_memory_db, db_rec.id)
    assert retrieved is not None
    assert retrieved.video_filename == "camera_sample.mp4"

    # Query by Hash
    by_hash = get_analysis_by_hash(in_memory_db, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
    assert by_hash is not None

    # Query Recent
    recent = get_recent_analyses(in_memory_db, limit=10)
    assert len(recent) == 1
