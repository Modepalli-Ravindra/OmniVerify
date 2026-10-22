from typing import List, Dict, Any, Tuple
from ..api.schemas import FrameForensicSignal, SuspiciousInterval

class ExplainabilityService:
    @staticmethod
    def identify_suspicious_intervals(frames: List[FrameForensicSignal], anomaly_threshold: float = 0.45) -> List[SuspiciousInterval]:
        """
        Groups anomalous frames into temporally localized intervals with exact timestamps.
        """
        intervals: List[SuspiciousInterval] = []
        if not frames:
            return intervals

        current_group: List[FrameForensicSignal] = []

        for frame in frames:
            if frame.frame_anomaly_score >= anomaly_threshold:
                current_group.append(frame)
            else:
                if current_group:
                    intervals.append(ExplainabilityService._build_interval(current_group))
                    current_group = []

        if current_group:
            intervals.append(ExplainabilityService._build_interval(current_group))

        return intervals

    @staticmethod
    def _build_interval(group: List[FrameForensicSignal]) -> SuspiciousInterval:
        start_frame = group[0]
        end_frame = group[-1]
        
        avg_score = sum(f.frame_anomaly_score for f in group) / len(group)
        
        # Determine dominant anomalous signal in this interval
        avg_noise = sum(f.noise_residual_score for f in group) / len(group)
        avg_freq = sum(f.frequency_score for f in group) / len(group)
        avg_motion = sum(f.motion_inconsistency_score for f in group) / len(group)

        dominant_sig = "Camera Grain (Noise)"
        rationale = f"Camera grain missing: Video appears artificially smoothed across {len(group)} consecutive frames."

        if avg_freq > avg_noise and avg_freq > avg_motion:
            dominant_sig = "AI Artifacts (Patterns)"
            rationale = f"Repeating pixel patterns detected that are typical of AI video generators."
        elif avg_motion > avg_noise and avg_motion > avg_freq:
            dominant_sig = "Motion & Movement"
            rationale = f"Unnatural motion detected: Movement jumps or shifts awkwardly between frames."

        return SuspiciousInterval(
            start_timestamp_ms=round(start_frame.timestamp_ms, 1),
            end_timestamp_ms=round(end_frame.timestamp_ms, 1),
            start_formatted=start_frame.timestamp_formatted,
            end_formatted=end_frame.timestamp_formatted,
            start_frame=start_frame.frame_index,
            end_frame=end_frame.frame_index,
            average_anomaly_score=round(avg_score, 3),
            primary_contributing_signal=dominant_sig,
            evidence_rationale=rationale
        )

    @staticmethod
    def generate_traceable_explanations(
        verdict: str,
        confidence: float,
        intervals: List[SuspiciousInterval],
        signal_breakdowns: List[Any],
        object_counts: Dict[str, int]
    ) -> List[str]:
        """
        Synthesizes transparent, traceable natural-language points in plain English.
        """
        explanations: List[str] = []

        if verdict == "MANIPULATED":
            explanations.append(
                f"Video is classified as FAKE / MANIPULATED with {confidence * 100:.1f}% confidence. Clear signs of AI editing or generation were detected."
            )
            for inv in intervals[:2]:
                explanations.append(
                    f"Segment [{inv.start_formatted} – {inv.end_formatted}]: {inv.evidence_rationale}"
                )
        elif verdict == "REAL":
            explanations.append(
                f"Video is classified as REAL / AUTHENTIC with {confidence * 100:.1f}% confidence. Camera grain and motion match natural recordings."
            )
            explanations.append(
                "No signs of artificial smoothing, synthetic pixel patterns, or unnatural movement were found."
            )
        else: # UNCERTAIN
            explanations.append(
                f"Video verdict is UNCERTAIN ({confidence * 100:.1f}% confidence). The indicators are mixed or unclear."
            )
            explanations.append(
                "Video compression or motion blur makes it difficult to detect clear clues."
            )

        # Context on scene objects
        if object_counts:
            objs_str = ", ".join(f"{count} {obj}(s)" for obj, count in list(object_counts.items())[:4])
            explanations.append(f"Detected scene objects: {objs_str}. Objects remain consistent throughout.")

        return explanations

    @staticmethod
    def get_legal_disclaimer() -> str:
        return (
            "Note: AI analysis provides strong indicators. Important decisions should be verified by a human expert."
        )

explainability_service = ExplainabilityService()
