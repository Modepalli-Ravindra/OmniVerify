import cv2
import numpy as np
from typing import List, Tuple, Dict, Any

class TemporalMotionAnalyzer:
    """
    Forensic evaluation of inter-frame motion dynamics using Gunnar-Farneback Optical Flow,
    Structural Similarity (SSIM), and temporal velocity continuity to identify frame splicing,
    generative frame jitter, and face-swap motion tearing.
    """
    def __init__(self):
        # Farneback parameters tuned for forensic video stability
        self.fb_pyr_scale = 0.5
        self.fb_levels = 3
        self.fb_winsize = 15
        self.fb_iterations = 3
        self.fb_poly_n = 5
        self.fb_poly_sigma = 1.2

    def calculate_ssim(self, img1_gray: np.ndarray, img2_gray: np.ndarray) -> float:
        """
        Calculates structural similarity index between two grayscale frames.
        """
        C1 = (0.01 * 255) ** 2
        C2 = (0.03 * 255) ** 2

        img1 = img1_gray.astype(np.float64)
        img2 = img2_gray.astype(np.float64)

        kernel = cv2.getGaussianKernel(11, 1.5)
        window = np.outer(kernel, kernel.transpose())

        mu1 = cv2.filter2D(img1, -1, window)[5:-5, 5:-5]
        mu2 = cv2.filter2D(img2, -1, window)[5:-5, 5:-5]

        mu1_sq = mu1 ** 2
        mu2_sq = mu2 ** 2
        mu1_mu2 = mu1 * mu2

        sigma1_sq = cv2.filter2D(img1 ** 2, -1, window)[5:-5, 5:-5] - mu1_sq
        sigma2_sq = cv2.filter2D(img2 ** 2, -1, window)[5:-5, 5:-5] - mu2_sq
        sigma12 = cv2.filter2D(img1 * img2, -1, window)[5:-5, 5:-5] - mu1_mu2

        ssim_map = ((2 * mu1_mu2 + C1) * (2 * sigma12 + C2)) / ((mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2))
        return float(np.mean(ssim_map))

    def compute_dense_optical_flow(self, prev_bgr: np.ndarray, curr_bgr: np.ndarray) -> Tuple[float, float, float]:
        """
        Calculates:
        1. Mean motion magnitude
        2. Motion direction variance (entropy)
        3. Temporal anomaly score [0.0 - 1.0]
        """
        prev_gray = cv2.cvtColor(prev_bgr, cv2.COLOR_BGR2GRAY)
        curr_gray = cv2.cvtColor(curr_bgr, cv2.COLOR_BGR2GRAY)

        flow = cv2.calcOpticalFlowFarneback(
            prev_gray, curr_gray, None,
            self.fb_pyr_scale, self.fb_levels, self.fb_winsize,
            self.fb_iterations, self.fb_poly_n, self.fb_poly_sigma, 0
        )

        magnitude, angle = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        
        mean_mag = float(np.mean(magnitude))
        std_mag = float(np.std(magnitude))
        ssim_val = self.calculate_ssim(prev_gray, curr_gray)

        # Generative deepfakes often suffer from:
        # A) Extreme high-frequency motion flicker (high std/mean ratio with low SSIM)
        # B) Unnatural freezing where background shifts but face remains rigid
        cov = std_mag / (mean_mag + 1e-4)
        
        # In natural video, SSIM correlates with motion magnitude smoothly
        expected_ssim = max(0.40, 1.0 - (mean_mag * 0.05))
        ssim_discrepancy = abs(ssim_val - expected_ssim)

        # Combine into normalized temporal anomaly score [0.0 - 1.0]
        raw_anomaly = (cov * 0.40) + (ssim_discrepancy * 0.60)
        calibrated_score = float(np.clip(raw_anomaly / 2.0, 0.0, 1.0))

        return round(mean_mag, 2), round(calibrated_score, 3), round(ssim_val, 3)

    def analyze_sequence(self, frames_bgr: List[np.ndarray]) -> List[float]:
        """
        Analyzes consecutive pairs across the video sequence, returning per-frame temporal scores.
        """
        if len(frames_bgr) < 2:
            return [0.1] * len(frames_bgr)

        temporal_scores = [0.1] # First frame baseline

        for i in range(len(frames_bgr) - 1):
            _, anomaly_score, _ = self.compute_dense_optical_flow(frames_bgr[i], frames_bgr[i+1])
            temporal_scores.append(anomaly_score)

        return temporal_scores

# Global singleton
temporal_analyzer = TemporalMotionAnalyzer()
