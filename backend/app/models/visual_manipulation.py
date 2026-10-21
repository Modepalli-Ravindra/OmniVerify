import cv2
import base64
import numpy as np
from scipy.ndimage import gaussian_filter
from typing import Tuple, Dict, Any

class VisualManipulationDetector:
    """
    Forensic analysis of spatial texture, sensor pattern noise (PRNU approximation),
    and edge blending residuals to detect generative manipulation artifacts.
    """
    def __init__(self, gaussian_sigma: float = 1.5):
        self.sigma = gaussian_sigma

    def extract_noise_residual(self, image_bgr: np.ndarray) -> np.ndarray:
        """
        Extracts high-pass sensor noise residual: R = I - Gaussian(I)
        """
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
        denoised = cv2.GaussianBlur(gray, (5, 5), self.sigma)
        residual = gray - denoised
        return residual

    def compute_frame_noise_score(self, image_bgr: np.ndarray) -> Tuple[float, np.ndarray]:
        """
        Calculates normalized noise anomaly score [0.0 - 1.0] and spatial anomaly heatmap.
        Generative models exhibit localized noise attenuation or unnatural kurtosis.
        """
        residual = self.extract_noise_residual(image_bgr)
        h, w = residual.shape

        # Divide into spatial blocks (e.g. 8x8 grid) to detect localized blending discrepancies
        grid_rows, grid_cols = 8, 8
        cell_h = h // grid_rows
        cell_w = w // grid_cols
        
        block_variances = np.zeros((grid_rows, grid_cols), dtype=np.float32)

        for r in range(grid_rows):
            for c in range(grid_cols):
                patch = residual[r*cell_h:(r+1)*cell_h, c*cell_w:(c+1)*cell_w]
                block_variances[r, c] = float(np.var(patch))

        mean_var = float(np.mean(block_variances))
        var_std = float(np.std(block_variances))

        # Coefficient of variation of spatial noise blocks
        # Authentic camera frames maintain uniform PRNU noise spread
        # Deepfakes show localized variance collapse in synthesized regions
        cv_metric = var_std / (mean_var + 1e-5)
        
        # Calibrate score to [0.0, 1.0]
        # In real cameras, cv_metric typically sits between 0.20 and 0.55
        # Deepfakes often hit > 0.85 or < 0.15 (heavy denoising)
        if cv_metric < 0.20:
            anomaly_score = float(np.clip(1.0 - (cv_metric / 0.20), 0.0, 1.0))
        else:
            anomaly_score = float(np.clip((cv_metric - 0.40) / 0.60, 0.0, 1.0))

        # Generate spatial anomaly heatmap matrix (resized to frame dimensions)
        norm_variances = (block_variances - np.min(block_variances)) / (np.max(block_variances) - np.min(block_variances) + 1e-6)
        # Invert so anomalous low-variance areas show up hot
        anomaly_map = cv2.resize(1.0 - norm_variances, (w, h), interpolation=cv2.INTER_CUBIC)
        heatmap_uint8 = np.uint8(np.clip(anomaly_map * 255.0, 0, 255))
        
        return round(anomaly_score, 3), heatmap_uint8

    def generate_heatmap_overlay_base64(self, image_bgr: np.ndarray, heatmap_uint8: np.ndarray) -> str:
        """
        Renders a colorized Jet heatmap blended over the frame for explainable UI display.
        """
        color_heatmap = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        blended = cv2.addWeighted(image_bgr, 0.65, color_heatmap, 0.35, 0)
        
        success, buffer = cv2.imencode('.jpg', blended, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
        if not success:
            return ""
        return "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

# Global singleton
visual_detector = VisualManipulationDetector()
