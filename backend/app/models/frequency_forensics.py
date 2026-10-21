import cv2
import numpy as np
from typing import Tuple, Dict, Any

class FrequencyForensics:
    """
    Forensic analysis in the 2D Fourier (FFT) and Discrete Cosine Transform (DCT) domains.
    Detects periodic grid artifacts, transposed convolution checkerboard anomalies,
    and high-frequency spectral attenuation characteristic of generative synthesis.
    """
    def __init__(self):
        pass

    def compute_radial_profile(self, magnitude_spectrum: np.ndarray) -> np.ndarray:
        """
        Computes azimuthally averaged radial power distribution from center DC to Nyquist.
        """
        h, w = magnitude_spectrum.shape
        center_y, center_x = h // 2, w // 2

        y, x = np.ogrid[:h, :w]
        r = np.hypot(x - center_x, y - center_y).astype(np.int32)

        max_radius = min(center_x, center_y)
        radial_prof = np.zeros(max_radius, dtype=np.float32)

        for radius in range(max_radius):
            mask = (r == radius)
            if np.any(mask):
                radial_prof[radius] = float(np.mean(magnitude_spectrum[mask]))

        return radial_prof

    def analyze_frequency_spectrum(self, image_bgr: np.ndarray) -> Tuple[float, Dict[str, float]]:
        """
        Calculates normalized frequency anomaly score [0.0 - 1.0] and spectral metrics.
        Rectifies the saturation and inversion defects observed in naive DCT baselines.
        """
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        # Compute 2D Fast Fourier Transform
        f = np.fft.fft2(gray.astype(np.float32))
        fshift = np.fft.fftshift(f)
        magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1.0)

        # Azimuthal radial profile
        radial = self.compute_radial_profile(magnitude_spectrum)
        max_r = len(radial)

        if max_r < 30:
            return 0.1, {"low_ratio": 0.5, "mid_ratio": 0.3, "high_ratio": 0.2, "spectral_falloff": 1.0}

        # Divide into Low, Mid, and High frequency bands
        band1 = int(max_r * 0.20)
        band2 = int(max_r * 0.60)

        low_energy = float(np.sum(radial[:band1]))
        mid_energy = float(np.sum(radial[band1:band2]))
        high_energy = float(np.sum(radial[band2:]))
        total_energy = low_energy + mid_energy + high_energy + 1e-6

        low_ratio = low_energy / total_energy
        mid_ratio = mid_energy / total_energy
        high_ratio = high_energy / total_energy

        # Natural images exhibit a power-law 1/f^alpha falloff where high_ratio is bounded (typically 0.15 - 0.35)
        # Deepfakes created by generative autoencoders or upsampling exhibit:
        # A) Spectral deficiency: Severe drop in high-frequency details (high_ratio < 0.10)
        # B) Checkerboard grid peaks: Periodic harmonic spikes in high frequencies (high_ratio > 0.45 with high variance)
        radial_diff = np.diff(radial)
        positive_spikes = float(np.sum(radial_diff[radial_diff > 0.5])) # Natural images monotonically decrease; spikes indicate grid artifacts

        # Normalized anomaly metric
        high_frequency_defect = 0.0
        if high_ratio < 0.12:
            high_frequency_defect = (0.12 - high_ratio) / 0.12 # Excessive blur / missing sensor texture
        elif high_ratio > 0.42:
            high_frequency_defect = min(1.0, (high_ratio - 0.42) / 0.20) # Periodic checkerboard noise

        spike_defect = float(np.clip(positive_spikes / (max_r * 0.5), 0.0, 1.0))

        # Composite frequency anomaly score [0.0 - 1.0]
        anomaly_score = float(np.clip((high_frequency_defect * 0.60) + (spike_defect * 0.40), 0.0, 1.0))

        metrics = {
            "low_energy_ratio": round(low_ratio, 3),
            "mid_energy_ratio": round(mid_ratio, 3),
            "high_energy_ratio": round(high_ratio, 3),
            "spectral_spike_measure": round(positive_spikes, 2)
        }

        return round(anomaly_score, 3), metrics

# Global singleton
frequency_forensics = FrequencyForensics()
