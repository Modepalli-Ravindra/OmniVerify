# OmniVerify — Architecture & Data Flow Specification

**Project Title:** Intelligent Multi-Dimensional Analysis for DeepFake Video Identification  
**Academic Year:** 2026–27  
**System Target:** Python 3.14+ / FastAPI + React 18 / Vite on Windows (CPU Inference Optimized)

---

## 1. System Architecture Overview

```
                                      +---------------------------------------------+
                                      |             React + Vite Frontend           |
                                      |     (Bento Grid, Video Player, Timeline)    |
                                      +----------------------+----------------------+
                                                             | HTTP / REST API
                                                             v
+-------------------------------------------------------------------------------------------------------------------------+
|                                                   FastAPI Backend Core                                                  |
|                                                                                                                         |
|  +--------------------+        +---------------------------------+        +------------------------------------------+  |
|  | Video Ingestion &  | -----> |   Bounded Two-Pass Frame        | -----> |        Multi-Signal Forensic Engine      |  |
|  | Format Validation  |        |   Sampling & Timestamp Tracking |        |                                          |  |
|  +--------------------+        +---------------------------------+        +--+----------------+-------------------+--+  |
|                                                                              |                |                   |     |
|              +---------------------------------------------------------------+                |                   |     |
|              |                                                                                |                   |     |
|              v                                                                                v                   v     |
|  +-----------------------+     +-----------------------+     +------------------------+       |     +----------------+  |
|  | 1. Scene & Object     |     | 2. Sensor Noise       |     | 3. Temporal Optical    |       |     | 4. Frequency   |  |
|  | Detector (COCO 80)    |     | Residual (PRNU)       |     | Flow (Farneback + SSIM)|       |     | Domain (2D FFT)|  |
|  +-----------+-----------+     +-----------+-----------+     +-----------+------------+       |     +-------+--------+  |
|              |                             |                             |                    |             |           |
|              +-----------------------------+--------------+--------------+--------------------+-------------+           |
|                                                           |                                                             |
|                                                           v                                                             |
|                                        +--------------------------------------+                                         |
|                                        | 5. Multi-Signal Evidence Fusion      |                                         |
|                                        | (Calibrated Bayesian Log-Odds Head)  |                                         |
|                                        +------------------+-------------------+                                         |
|                                                           |                                                             |
|                                                           v                                                             |
|                                        +--------------------------------------+                                         |
|                                        | 6. Traceable Explainability Engine   |                                         |
|                                        | (Timestamps, Heatmaps, Verdict:      |                                         |
|                                        |  Real / Manipulated / Uncertain)     |                                         |
|                                        +------------------+-------------------+                                         |
|                                                           |                                                             |
|                                                           v                                                             |
|                                        +--------------------------------------+                                         |
|                                        | 7. Forensic Dossier & Report Service |                                         |
|                                        | (JSON + HTML / PDF Verification Docs)|                                         |
|                                        +--------------------------------------+                                         |
+-------------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Forensic Signal Mathematical Formulations

### Signal 1: Full-Scene Object Intelligence & Spatial Coherence
- **Detector:** Pretrained lightweight SSDLite-MobileNetV3 / YOLO ONNX on COCO.
- **Scene Context:** Computes object density, spatial co-occurrence, and bounding box stability across the video timeline.
- **Metric:** Detection bounding boxes $B_i = (x_1, y_1, x_2, y_2, c_i, s_i)$. Unlike naive face-only detectors, OmniVerify models interactions between people, clothing, electronics, background structures, and hand-held items.

### Signal 2: Spatial Noise Residuals (Sensor Pattern Noise / PRNU)
- Real digital cameras impart a distinct photo-response non-uniformity (PRNU) and high-frequency sensor noise. Generative synthetic frames exhibit spatial noise attenuation or uncharacteristic high-frequency smoothing.
- High-pass residual extraction:
  $$R(x, y) = I(x, y) - \mathcal{G}_{\sigma}(I(x, y))$$
  where $\mathcal{G}_{\sigma}$ represents a Gaussian kernel ($\sigma=1.5$).
- Variance and spatial kurtosis of the noise residual quantify sensor authenticity.

### Signal 3: Temporal Motion Inconsistencies & Dense Optical Flow
- Evaluates inter-frame continuity using Gunnar Farneback dense optical flow:
  $$(\Delta x, \Delta y) = \text{OpticalFlow}(F_{t}, F_{t+1})$$
- Computes:
  1. Mean motion magnitude: $M_t = \frac{1}{HW}\sum_{x,y}\sqrt{\Delta x^2 + \Delta y^2}$
  2. Flow orientation entropy: measures irregular motion vectors characteristic of generative morphing.
  3. Structural Similarity Index (SSIM): $\text{SSIM}(F_t, F_{t+1})$. Generative frame transitions exhibit unnatural flicker or localized boundary tears.

### Signal 4: Frequency Domain Spectral Forensics (2D FFT & DCT)
- Discrete Fourier Transform:
  $$\mathcal{F}(u, v) = \sum_{x=0}^{M-1}\sum_{y=0}^{N-1} I(x, y) e^{-j 2\pi (\frac{ux}{M} + \frac{vy}{N})}$$
- Generative upsampling (transposed convolutions) leaves characteristic periodic checkerboard grid artifacts in the azimuthally averaged radial power spectrum:
  $$P(r) = \frac{1}{N_r}\sum_{\sqrt{u^2+v^2}=r} |\mathcal{F}(u, v)|^2$$
- High-to-low frequency energy ratios cleanly distinguish natural camera sensor roll-off from diffusion synthesis.

---

## 3. Evidence Fusion & Calibrated Confidence

To avoid the vulnerability where a single anomaly produces false overconfidence, OmniVerify implements a **Calibrated Bayesian Log-Odds Fusion Head**:

$$\text{Logit}_{\text{fused}} = w_0 + \sum_{k=1}^K w_k \cdot \sigma^{-1}(s_k)$$
where $s_k \in [0, 1]$ are individual normalized signal scores, and $w_k$ are empirically bounded weights.

The posterior probability of manipulation is calibrated via Platt scaling:
$$P(\text{Manipulated} \mid \text{Signals}) = \frac{1}{1 + \exp(-(\alpha \cdot \text{Logit}_{\text{fused}} + \beta))}$$

### Decision Boundaries:
- $P < 0.35$: **REAL** (Authentic camera footage with preserved sensor noise and smooth optical flow).
- $0.35 \le P \le 0.65$: **UNCERTAIN** (Equivocal forensic signatures; compression artifacts or low-resolution video prevents conclusive attribution).
- $P > 0.65$: **MANIPULATED** (Significant multi-signal corroboration across frequency grid artifacts, noise attenuation, or temporal discontinuities).
