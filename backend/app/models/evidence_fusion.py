import math
import numpy as np
from typing import Dict, Any, List, Tuple
from ..core.config import settings
from ..api.schemas import SignalBreakdown

class CalibratedEvidenceFusion:
    """
    Combines independent forensic signals (Scene Object Coherence, Noise Residual,
    Temporal Motion Inconsistency, Frequency Domain Spectrum) using a calibrated
    Bayesian log-odds fusion head and Platt scaling to produce defensible Real / Uncertain / Manipulated verdicts.
    """
    def __init__(self):
        self.weights = {
            "object_coherence": settings.WEIGHT_OBJECT_COHERENCE,
            "noise_residual": settings.WEIGHT_NOISE_RESIDUAL,
            "temporal_flow": settings.WEIGHT_TEMPORAL_FLOW,
            "frequency_spectrum": settings.WEIGHT_FREQUENCY_SPECTRUM
        }
        # Prior logit offset calibrated for balanced forensic sensitivity
        self.prior_offset = -0.15
        self.platt_scale = 1.10

    def _probability_to_logit(self, p: float) -> float:
        clipped = max(0.01, min(0.99, p))
        return math.log(clipped / (1.0 - clipped))

    def _logit_to_probability(self, logit: float) -> float:
        return 1.0 / (1.0 + math.exp(-logit))

    def fuse_signals(
        self,
        object_score: float,
        noise_score: float,
        temporal_score: float,
        frequency_score: float
    ) -> Tuple[str, float, float, List[SignalBreakdown]]:
        """
        Fuses 4 independent signals.
        Returns:
            verdict: "REAL" | "MANIPULATED" | "UNCERTAIN"
            calibrated_confidence: float [0.0 - 1.0]
            fusion_anomaly_score: float [0.0 - 1.0]
            signal_breakdowns: List[SignalBreakdown]
        """
        signal_inputs = {
            "object_coherence": (object_score, "Evaluates scene element stability and detection jitter across frames."),
            "noise_residual": (noise_score, "Measures high-pass sensor noise (PRNU) variance and localized spatial smoothing."),
            "temporal_flow": (temporal_score, "Quantifies dense optical flow acceleration and structural similarity discontinuities."),
            "frequency_spectrum": (frequency_score, "Analyzes 2D Fourier radial power decay and transposed convolution grid harmonics.")
        }

        weighted_logit_sum = self.prior_offset
        total_weight = sum(self.weights.values())
        breakdowns: List[SignalBreakdown] = []

        for sig_name, (score, desc) in signal_inputs.items():
            w = self.weights[sig_name]
            logit = self._probability_to_logit(score)
            contribution = (w / total_weight) * score
            weighted_logit_sum += w * logit

            status = "Nominal"
            if score > 0.65:
                status = "Anomalous"
            elif score > 0.40:
                status = "Suspicious"

            breakdowns.append(SignalBreakdown(
                signal_name=sig_name.replace("_", " ").title(),
                raw_score=round(score, 3),
                weight=round(w, 2),
                weighted_contribution=round(contribution, 3),
                status=status,
                description=desc
            ))

        # Calibrated posterior probability via Platt-scaled sigmoid
        calibrated_prob = self._logit_to_probability(weighted_logit_sum * self.platt_scale)
        calibrated_prob = float(np.clip(calibrated_prob, 0.0, 1.0))

        # Raw fusion anomaly score (linear weighted average for transparent inspection)
        raw_weighted_avg = sum((self.weights[k] / total_weight) * signal_inputs[k][0] for k in self.weights)
        raw_weighted_avg = float(np.clip(raw_weighted_avg, 0.0, 1.0))

        # Three-tier verdict determination
        if calibrated_prob < settings.THRESHOLD_AUTHENTIC_CEILING:
            verdict = "REAL"
            # Calibrated confidence represents confidence in the verdict
            confidence = (settings.THRESHOLD_AUTHENTIC_CEILING - calibrated_prob) / settings.THRESHOLD_AUTHENTIC_CEILING
            confidence = 0.50 + (confidence * 0.48) # 0.50 to 0.98
        elif calibrated_prob > settings.THRESHOLD_MANIPULATION_FLOOR:
            verdict = "MANIPULATED"
            confidence = (calibrated_prob - settings.THRESHOLD_MANIPULATION_FLOOR) / (1.0 - settings.THRESHOLD_MANIPULATION_FLOOR)
            confidence = 0.50 + (confidence * 0.48) # 0.50 to 0.98
        else:
            verdict = "UNCERTAIN"
            # In uncertain band, confidence in ambiguity
            dist_to_mid = abs(calibrated_prob - 0.50)
            confidence = 0.50 - (dist_to_mid * 1.5) # lower certainty
            confidence = max(0.35, min(0.60, confidence))

        return verdict, round(confidence, 3), round(raw_weighted_avg, 3), breakdowns

# Global singleton
evidence_fusion = CalibratedEvidenceFusion()
