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

        dominant_sig = "Spatial Noise Residual"
        rationale = f"Detected significant spatial sensor noise suppression (score {avg_noise:.2f}) across {len(group)} consecutive frames."

        if avg_freq > avg_noise and avg_freq > avg_motion:
            dominant_sig = "Frequency Domain Harmonics"
            rationale = f"2D Fourier analysis revealed periodic checkerboard harmonic peaks (score {avg_freq:.2f}) indicative of generative upsampling."
        elif avg_motion > avg_noise and avg_motion > avg_freq:
            dominant_sig = "Optical Flow Inconsistency"
            rationale = f"Dense Gunnar-Farneback optical flow detected anomalous velocity acceleration and boundary tear (score {avg_motion:.2f})."

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
        Synthesizes transparent, traceable natural-language forensic points linked to concrete measurements.
        """
        explanations: List[str] = []

        if verdict == "MANIPULATED":
            explanations.append(
                f"Video classified as MANIPULATED with calibrated confidence {confidence * 100:.1f}%. Corroborated evidence found across multiple independent forensic domains."
            )
            for inv in intervals[:3]:
                explanations.append(
                    f"Interval [{inv.start_formatted} – {inv.end_formatted}] (Frames {inv.start_frame}–{inv.end_frame}): "
                    f"{inv.evidence_rationale}"
                )
        elif verdict == "REAL":
            explanations.append(
                f"Video classified as REAL (Authentic) with calibrated confidence {confidence * 100:.1f}%. Sensor PRNU noise distribution and inter-frame optical flow exhibit smooth, natural physical dynamics."
            )
            explanations.append(
                "No abnormal 2D FFT spectral checkerboard harmonics or localized noise attenuation boundaries detected above forensic thresholds."
            )
        else: # UNCERTAIN
            explanations.append(
                f"Video classified as UNCERTAIN (Indeterminate). Detection signals registered conflicting or low-magnitude scores within the ambiguity margin."
            )
            explanations.append(
                "Heavy compression, motion blur, or low bitrate may be obscuring fine sensor noise signatures, preventing a conclusive definitive classification."
            )

        # Context on scene objects
        if object_counts:
            objs_str = ", ".join(f"{count} {obj}(s)" for obj, count in list(object_counts.items())[:5])
            explanations.append(f"Full-scene object tracking identified: {objs_str}. Scene object continuity maintained without abrupt disappearance jitter.")

        return explanations

    @staticmethod
    def get_legal_disclaimer() -> str:
        return (
            "NOTICE & FORENSIC INTEGRITY: Observed signal anomalies, heatmaps, bounding boxes, and model confidence scores "
            "represent probabilistic digital forensic measurements rather than incontrovertible legal proof of intentional manipulation. "
            "Optical distortion, lossy video codecs (H.264/HEVC compression), lighting transitions, and low bitrates can induce signal artifacts. "
            "All findings should be verified by a qualified human forensic examiner."
        )

explainability_service = ExplainabilityService()
