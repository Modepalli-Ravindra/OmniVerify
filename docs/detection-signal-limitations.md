# OmniVerify — Detection Signal Scientific Audit & Forensic Limitations

## Executive Summary
This document provides a rigorous forensic engineering audit of the four primary detection heads, the scene/object tracking subsystem, frame sampling, and the evidence fusion engine implemented in **OmniVerify**. 

Prior to Phase C, OmniVerify utilized terminology suggesting "Bayesian Log-Odds Fusion" and "Calibrated Posterior Confidence." This audit scientifically examines each signal, demonstrates where these claims lack empirical grounding, defines the exact physical and statistical quantities measured, documents vulnerability to compression artifacts, and establishes the necessary qualifications for academic and forensic defensibility.

---

## 1. Pipeline Ingestion & Preprocessing

### 1.1 Video Decoding & Timestamp Extraction
- **Implementation:** `backend/app/services/video_processor.py` via `cv2.VideoCapture`.
- **What It Measures:** Basic container container metadata (`CAP_PROP_FPS`, `CAP_PROP_FRAME_COUNT`, dimensions) and calculates timestamps via linear index scaling:
  $$\text{Timestamp}_{\text{ms}} = \left(\frac{\text{frame\_index}}{\text{fps}}\right) \times 1000.0$$
  File integrity is tracked using incremental SHA-256 stream hashing in 64 KB blocks.
- **What It Cannot Prove:**
  - It does not inspect container-level demuxing atoms (e.g., MP4 `moov`, `mdat`, edit lists, or PTS/DTS presentation timestamps).
  - It cannot detect audio-video synchronization slip or container-level metadata tampering (e.g. wiped EXIF or modified creation dates).
- **Failure Modes & Edge Cases:**
  - **Variable Frame Rate (VFR):** Phones and web cameras commonly record in VFR. Linear timestamp calculation drifts against actual presentation time.
  - **Corrupted Containers:** Videos with incomplete header indices may return `total_frames = 0`, forcing fallback linear frame iteration.
  - **Codec Non-Uniformity:** OpenCV depends on underlying OS DirectShow/MediaFoundation backends on Windows. Specialized broadcast formats (e.g., ProRes 422, AV1, 10-bit HEVC) may fail to decode without system-installed codecs.

### 1.2 Bounded Frame Sampling & Scene Coverage
- **Implementation:** Two-pass bounded extraction capped at `MAX_ANALYSIS_FRAMES` (default: 24 frames).
- **What It Measures:** Evenly spaced anchor points across the duration of the media stream.
- **What It Cannot Prove:**
  - Does not guarantee detection of temporally localized manipulation. If a face-swap splice lasts 10 frames (approx. 330 ms) and falls between sampled anchor points, the manipulation is completely omitted.
- **Failure Modes:**
  - **Temporal Aliasing:** In long videos (e.g. 10 minutes), sampling 24 frames means frames are separated by ~25 seconds. Calculating inter-frame optical flow or temporal continuity across 25-second gaps is physically meaningless.

---

## 2. Signal Head 1: Scene & Object Coherence (SSDLite-MobileNetV3)

### 2.1 Implementation & Theoretical Foundation
- **Implementation:** `backend/app/models/object_detector.py` using Torchvision `SSDLite320_MobileNet_V3_Large` pretrained on COCO 80 classes, with OpenCV edge-contour fallback.
- **Metric Formulation:** Computes inter-frame detection count jitter:
  $$\Delta_{\text{jitter}} = \frac{1}{N-1} \sum_{i=1}^{N-1} |C_i - C_{i-1}|, \quad \text{Score} = \text{clip}\left(\frac{\Delta_{\text{jitter}}}{4.0}, 0.0, 1.0\right)$$
  where $C_i$ is the count of detected objects in frame $i$.

### 2.2 Forensic Capabilities & Boundaries
- **What It Measures:** Macroscopic scene continuity, object stability, and sudden popping/disappearance of major scene elements.
- **What It CANNOT Prove:**
  - **Deepfake Presence:** SSDLite-MobileNetV3 is an object detector (trained to locate cars, chairs, persons, dogs), **NOT a deepfake detector**. Detecting that a "person" is present provides zero evidence regarding whether the facial pixels within that person box were synthesized by DeepFaceLab, FaceSwap, or SimSwap.
  - Subtle facial reenactment (e.g. Face2Face, Audio-driven LipSync) preserves person bounding boxes with near-zero jitter.
- **Expected Failure Modes:**
  - **Camera Panning & Occlusions:** Normal camera motion causing an object to exit the frame induces a detection count change, triggering false positives.
  - **Cut Transitions:** Natural scene cuts between camera angles produce large jitter deltas.
- **Empirical Validation Status:** **Unvalidated as a deepfake detector.** Operates solely as an auxiliary scene-stability sanity check.

---

## 3. Signal Head 2: Spatial Noise Residual Analysis (PRNU Approximation)

### 3.1 Implementation & Theoretical Foundation
- **Implementation:** `backend/app/models/visual_manipulation.py`.
- **Metric Formulation:** Extracts high-pass spatial residual via Gaussian filtering:
  $$R(x, y) = I(x, y) - \text{Gaussian}(I(x, y), \sigma=1.5)$$
  Divides $R$ into an $8 \times 8$ grid of spatial patches, computes patch variance $\sigma_k^2$, and calculates the spatial coefficient of variation:
  $$CV = \frac{\text{std}(\sigma_k^2)}{\text{mean}(\sigma_k^2) + \epsilon}$$
  Anomaly score is mapped based on deviation from natural sensor noise ranges ($0.20 \le CV \le 0.55$).

### 3.2 Forensic Capabilities & Boundaries
- **What It Measures:** Spatial uniformity of high-pass image residuals and localized variance suppression (smoothing).
- **What It CANNOT Prove:**
  - **True PRNU Fingerprinting:** Photo-Response Non-Uniformity (PRNU) in genuine digital forensics requires averaging dozens of flat-field images from the *exact physical sensor* to isolate silicon substrate imperfections, followed by Normalized Cross-Correlation (NCC) and Peak-to-Correlation Energy (PCE) testing. Single-frame high-pass subtraction is a **coarse spatial texture residual**, not true device PRNU.
  - Cannot prove generative manipulation versus standard skin smoothing filters, makeup blur, or lossy video compression.
- **Expected Failure Modes:**
  - **Video Compression:** H.264/HEVC discrete cosine transform (DCT) block quantization heavily suppresses high-frequency residuals in flat areas while preserving them along contrast edges. This artificially inflates $CV$, causing authentic compressed videos to be flagged as manipulated.
  - **Heterogeneous Scene Textures:** A frame with a starry night sky above a smooth painted wall naturally exhibits high block-variance variance without any tampering.
- **Empirical Validation Status:** Heuristic spatial anomaly metric. Highly sensitive to bitrate and compression quantization parameter ($QP$).

---

## 4. Signal Head 3: Inter-Frame Temporal Dynamics (Optical Flow & SSIM)

### 4.1 Implementation & Theoretical Foundation
- **Implementation:** `backend/app/models/temporal_analyzer.py`.
- **Metric Formulation:** Dense Gunnar-Farneback optical flow (`cv2.calcOpticalFlowFarneback`) coupled with Structural Similarity Index (SSIM) between consecutive sampled frames:
  $$\text{CoV} = \frac{\sigma_{\|\mathbf{v}\|}}{\mu_{\|\mathbf{v}\|} + \epsilon}, \quad \Delta_{\text{SSIM}} = |\text{SSIM}(F_t, F_{t+1}) - \text{SSIM}_{\text{expected}}(\mu_{\|\mathbf{v}\|})|$$
  $$\text{Score} = \text{clip}\left(\frac{0.40 \cdot \text{CoV} + 0.60 \cdot \Delta_{\text{SSIM}}}{2.0}, 0.0, 1.0\right)$$

### 4.2 Forensic Capabilities & Boundaries
- **What It Measures:** Sudden velocity discontinuities, abnormal frame-to-frame pixel acceleration, and structural similarity mismatches.
- **What It CANNOT Prove:**
  - Does not crop or track facial landmarks. Computes motion across the entire frame.
  - Cannot distinguish facial synthesis jitter from background camera motion, handheld camera shake, or foreground occlusions.
- **Expected Failure Modes:**
  - **Large Frame Sampling Strides:** If consecutive sampled frames are separated by more than 2-3 frames, pixel displacement exceeds the Farneback quadratic polynomial neighborhood ($winsize=15$), causing optical flow vectors to collapse into noise.
  - **Dynamic Action / Sports:** Fast scene movement naturally causes high motion variance and low SSIM, triggering false alarms.
- **Empirical Validation Status:** Heuristic motion consistency measure. Valid only when sampled frames are consecutive ($t$ and $t+1$).

---

## 5. Signal Head 4: 2D FFT Spectral Harmonic Analysis

### 5.1 Implementation & Theoretical Foundation
- **Implementation:** `backend/app/models/frequency_forensics.py`.
- **Metric Formulation:** 2D Fast Fourier Transform with DC shift:
  $$F(u, v) = \mathcal{F}\{I_{\text{gray}}\}, \quad M(u, v) = 20 \log(|F(u, v)| + 1)$$
  Computes azimuthally averaged radial power distribution $P(r)$, splits into Low ($0-20\%$), Mid ($20-60\%$), and High ($60-100\%$) frequency bands, and measures positive radial derivative spikes $\sum \Delta P^+(r)$.
  $$\text{Score} = \text{clip}(0.60 \cdot \text{Defect}_{\text{high\_freq}} + 0.40 \cdot \text{Spike}_{\text{measure}}, 0.0, 1.0)$$

### 5.2 Forensic Capabilities & Boundaries
- **What It Measures:** Power-law ($1/f^\alpha$) spectral decay deviations and periodic high-frequency harmonic peaks caused by transposed convolutions (checkerboard artifacts) typical of generative autoencoders (e.g. early GAN and VAE architectures).
- **What It CANNOT Prove:**
  - Does not prove generative origin conclusively.
  - Diffusion models (e.g. Stable Diffusion, Sora) and modern Latent Diffusion Architectures with perceptual loss do not exhibit the naive checkerboard spikes of 2019-era GANs.
- **Expected Failure Modes:**
  - **Repetitive Physical Textures:** Window blinds, fabric weaves, brickwork, fine gratings, or striped shirts produce sharp periodic Fourier harmonic peaks indistinguishable from generative upsampling spikes.
  - **Post-Processing Sharpening:** Digital unsharp masking introduces high-frequency spectral elevation.
- **Empirical Validation Status:** **Strongest signal in pilot tests** (achieving ROC-AUC 0.7778 against checkerboard artifacts), but susceptible to false positives in scenes with geometric repetitive textures.

---

## 6. Audit of Evidence Fusion Engine: The "Bayesian" Qualification

### 6.1 Original Mathematical Claim
The Phase B documentation referred to `CalibratedEvidenceFusion` as a "Calibrated Bayesian Log-Odds Fusion Head with Platt Scaling."

### 6.2 Scientific Findings & Deficiencies
A rigorous statistical audit demonstrates that this label was mathematically unjustified for the following reasons:

1. **Absence of Empirical Likelihood Distributions:**
   A genuine Bayesian log-odds update follows:
   $$\ln \frac{P(M | E)}{P(R | E)} = \ln \frac{P(M)}{P(R)} + \sum_{i=1}^{k} \ln \frac{P(E_i | M)}{P(E_i | R)}$$
   In OmniVerify, the update was computed as:
   $$\text{Sum} = \text{prior\_offset} + \sum_{i=1}^{k} w_i \cdot \text{logit}(p_i)$$
   where $w_i \in \{0.35, 0.30, 0.25, 0.10\}$ are manually chosen static weights, and $p_i$ is an uncalibrated heuristic scalar score. This does not represent a valid log-likelihood ratio.

2. **Violation of Conditional Independence:**
   Naive Bayesian fusion assumes that signals are conditionally independent given the class:
   $$P(E_1, E_2, E_3, E_4 | M) = \prod_{i=1}^{4} P(E_i | M)$$
   In real compressed video, this assumption is false. Lossy video compression (e.g. H.264 quantization) simultaneously smooths high-pass spatial noise residuals, alters Fourier high-frequency power ratios, and reduces inter-frame SSIM. Treating these three measurements as statistically independent severely inflates confidence scores.

3. **Arbitrary Hyperparameters:**
   The `prior_offset = -0.15` and `platt_scale = 1.10` parameters were hardcoded engineering heuristics, not fitted via maximum likelihood estimation (logistic regression) on empirical calibration data.

### 6.3 Remediation Taken in Phase C
- Renamed class to `HeuristicEvidenceFusion` (retaining `CalibratedEvidenceFusion` as a backward-compatible alias).
- Updated docstrings and API explanations to state that outputs represent **Heuristic Decision Margins** and **Anomaly Scores**, not frequentist or Bayesian posterior probabilities.
- Replaced misleading probability claims in reporting templates with clearly defined decision boundaries ($< 0.40$ Authentic, $> 0.65$ Manipulated, $[0.40, 0.65]$ Indeterminate/Uncertain).

---

## 7. Summary Table of Detection Signals

| Signal Head | Physical / Mathematical Basis | Primary Detection Target | Critical Blindspot / Failure Mode | Empirical Validation Status |
| :--- | :--- | :--- | :--- | :--- |
| **Scene Coherence** | COCO SSDLite Object Tracking | Gross object popping / cuts | Blind to identity swaps & subtle facial manipulation | **Unvalidated** (Scene stability sanity check only) |
| **Noise Residual** | Gaussian high-pass filter ($8\times 8$ block CV) | Localized spatial smoothing / PRNU collapse | H.264/HEVC compression quantization & uneven scene texture | **Heuristic** (High false-positive rate on compressed video) |
| **Temporal Flow** | Gunnar-Farneback Flow + SSIM | Inter-frame velocity jitter & boundary tear | Rapid camera motion, sports, large frame sampling strides | **Heuristic** (Requires strictly consecutive frames) |
| **Frequency Spectrum** | 2D Fourier radial power decay & spikes | Transpose-convolution checkerboard artifacts | Repetitive textures (fabrics, gratings, bricks) | **Partially Validated** (ROC-AUC 0.78 on pilot spectral vectors) |
| **Evidence Fusion** | Weighted log-odds combination | Multi-signal corroboration | Correlated compression noise; uncalibrated prior | **Heuristic Score Fusion** (Non-Bayesian) |
