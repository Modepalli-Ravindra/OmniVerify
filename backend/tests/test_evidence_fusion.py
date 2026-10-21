from backend.app.models.evidence_fusion import CalibratedEvidenceFusion
from backend.app.services.explainability import ExplainabilityService
from backend.app.api.schemas import FrameForensicSignal

def test_evidence_fusion_real():
    fusion = CalibratedEvidenceFusion()
    # All signals low -> Authentic Real video
    verdict, confidence, raw_score, breakdowns = fusion.fuse_signals(
        object_score=0.1,
        noise_score=0.15,
        temporal_score=0.12,
        frequency_score=0.14
    )
    assert verdict == "REAL"
    assert confidence >= 0.50
    assert len(breakdowns) == 4

def test_evidence_fusion_manipulated():
    fusion = CalibratedEvidenceFusion()
    # All signals high -> Manipulated Deepfake
    verdict, confidence, raw_score, breakdowns = fusion.fuse_signals(
        object_score=0.85,
        noise_score=0.90,
        temporal_score=0.82,
        frequency_score=0.88
    )
    assert verdict == "MANIPULATED"
    assert confidence >= 0.50

def test_evidence_fusion_uncertain():
    fusion = CalibratedEvidenceFusion()
    # Conflicting ambiguous signals -> Uncertain
    verdict, confidence, raw_score, breakdowns = fusion.fuse_signals(
        object_score=0.45,
        noise_score=0.52,
        temporal_score=0.48,
        frequency_score=0.50
    )
    assert verdict == "UNCERTAIN"

def test_suspicious_interval_grouping():
    frames = [
        FrameForensicSignal(
            frame_index=i,
            timestamp_ms=i * 100.0,
            timestamp_formatted=f"00:0{i}.000",
            noise_residual_score=0.8 if 3 <= i <= 5 else 0.1,
            frequency_score=0.8 if 3 <= i <= 5 else 0.1,
            motion_inconsistency_score=0.8 if 3 <= i <= 5 else 0.1,
            frame_anomaly_score=0.8 if 3 <= i <= 5 else 0.1,
            is_suspicious=(3 <= i <= 5)
        )
        for i in range(10)
    ]
    intervals = ExplainabilityService.identify_suspicious_intervals(frames, anomaly_threshold=0.45)
    assert len(intervals) == 1
    assert intervals[0].start_frame == 3
    assert intervals[0].end_frame == 5
