import math
import numpy as np
from typing import Dict, Any, List, Tuple
from ..core.config import settings
from ..api.schemas import SignalBreakdown

class HeuristicEvidenceFusion:
    """
    Combines multi-modal forensic signals (Scene Object Coherence, Noise Residual,
    Temporal Motion Inconsistency, Frequency Domain Spectrum) using a heuristic weighted
    log-odds score fusion head with adjustable decision thresholds.

    SCIENTIFIC NOTE & AUDIT QUALIFICATION (Phase C):
    This fusion head uses an additive log-odds formula with fixed heuristic weights.
    It is NOT an empirically validated Bayesian classifier because:
    1. The weights are fixed engineering hyperparameters rather than trained log-likelihood ratios ln(P(E|M)/P(E|R)).
    2. Input signal scores represent heuristic anomaly indicators, not calibrated class-conditional probabilities.
    3. The conditional independence assumption (Naive Bayes) does not strictly hold across compressed video frames
       (e.g., lossy H.264/HEVC compression simultaneously impacts noise residuals, frequency power spectra, and SSIM).
    4. The prior offset (-0.15) and scaling parameter (1.10) are manually assigned rather than fitted via logistic regression
       (Platt scaling) on held-out empirical calibration data.
    
    The resulting output confidence reflects a heuristic decision distance rather than a true frequentist or Bayesian posterior.
    """
    def __init__(self):
        self.weights = {
            "object_coherence": settings.WEIGHT_OBJECT_COHERENCE,
            "noise_residual": settings.WEIGHT_NOISE_RESIDUAL,
            "temporal_flow": settings.WEIGHT_TEMPORAL_FLOW,
            "frequency_spectrum": settings.WEIGHT_FREQUENCY_SPECTRUM
        }
        # Heuristic prior offset and scale parameter (not fitted on training data)
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
            "object_coherence": (object_score, "Checks if people, items, and backgrounds stay stable without flickering or warping."),
            "noise_residual": (noise_score, "Checks if natural camera grain is present or smoothed out by AI tools."),
            "temporal_flow": (temporal_score, "Checks if movements between frames flow smoothly and realistically."),
            "frequency_spectrum": (frequency_score, "Looks for repeating pixel grid patterns typical of AI video generators.")
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

# Backward-compatible alias for existing service and test imports
CalibratedEvidenceFusion = HeuristicEvidenceFusion

# Global singleton
evidence_fusion = HeuristicEvidenceFusion()
