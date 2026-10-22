# OmniVerify — Phase C: Research-Grade Deepfake Detection Validation Report

**Project:** OmniVerify — Intelligent Multi-Dimensional Analysis for DeepFake Video Identification  
**Academic Year:** 2026–27  
**Evaluation Phase:** Phase C (Research Validation & Scientific Benchmarking)  
**Evaluator Environment:** Windows 11, Intel Core i5/i7 CPU, Python 3.14, OpenCV 5.0, Torchvision 0.19  
**Git Baseline Commit:** `82fbcc9` on `main`  
**Evaluation Timestamp:** October 2026  

---

## Executive Summary

Phase B established robust software integration: 27 passing backend tests, successful frontend production builds, persistent Neon PostgreSQL transactions, presigned private Neon Object Storage uploads, and an interactive UI. However, software stability does not establish scientific deepfake detection efficacy.

Phase C systematically transitions OmniVerify from an integration prototype to a scientifically honest, reproducible forensic platform. We conducted an in-depth mathematical audit of all four detection heads, eliminated unwarranted Bayesian probability claims in favor of qualified heuristic fusion, implemented a standalone leak-free evaluation harness with rigorous split verification, and executed an empirical pilot evaluation on reproducible synthetic test vectors.

---

## Section A: Verified Software Behavior

### A.1 Core Test Suite & Production Build
- **Backend Test Suite:** Executed via `python -m pytest backend/tests` (including the new `test_evaluation_harness.py`).
  - **Result:** **32 passed in 30.2 seconds** (100% passing across 9 test modules).
  - Modules covered: API endpoints, Neon PostgreSQL session transactions, Neon Object Storage, Neon Managed Better Auth, SSDLite scene tracking, spatial noise residuals, Farneback optical flow, 2D FFT spectral decay, heuristic fusion logic, and the evaluation harness.
- **Frontend Production Build:** Executed via `npm run build` (`tsc -b && vite build`) in `frontend/`.
  - **Result:** **Built in 3.68s**, 1,956 modules transformed, 0 errors, gzip bundle size 152.4 kB.
- **Service Liveness:**
  - FastAPI server actively listening on `http://127.0.0.1:8000`.
  - Vite dev server actively serving UI on `http://127.0.0.1:5173`.

### A.2 Security, Multi-Tenancy & Data Integrity Audit (Task 5)
1. **Object Storage Privacy:**
   - Private bucket named `files` on Neon Object Storage verified. Video payloads and report JSON/HTML dossiers are not publicly world-readable. Access is strictly mediated via time-bounded presigned S3 URLs (`expires_in=3600`).
2. **User-Scoped History:**
   - Endpoint `/api/v1/history/protected` requires a valid Neon Managed Better Auth session token and scopes database queries using `user_id = :uid`. Cross-user data leakage is prevented.
3. **Distinguishable Persistence:**
   - Updated `VideoAnalysisResult` schema with explicit `persisted_to_database: bool` flag. When Neon PostgreSQL commits successfully, `persisted_to_database = True`; if a database outage occurs, the pipeline completes gracefully in memory with `persisted_to_database = False`, preventing false claims of durable storage.
4. **Path & Trace Sanitization:**
   - Error handling in `backend/app/api/routes.py` was refactored with regex sanitization to strip absolute Windows/Unix filesystem paths and environment paths from HTTP 500 error response details.
5. **Ethical Test Fixtures:**
   - All local evaluation fixtures (`evaluation_pilot/`) are purely synthetic, procedurally generated mathematical textures and geometric motion vectors. Zero unconsented facial videos of real persons are stored or distributed in the repository.

---

## Section B: Pilot Experiments Actually Executed (Task 3 & 4)

### B.1 Experimental Setup
- **Harness:** Standalone CLI runner `backend/app/evaluation/evaluator.py`.
- **Dataset:** 6 controlled synthetic pilot video vectors generated via `create_pilot_dataset.py`, organized under `evaluation_pilot/manifest.csv`:
  - 3 Authentic Baseline Videos: `actor01_real.mp4`, `actor02_real.mp4`, `actor03_real.mp4` (natural camera sensor noise, smooth motion, regular 1/f spectral profiles).
  - 3 Manipulated Videos: `actor04_fake_spectral.mp4` (periodic Fourier grid defect), `actor05_fake_noisesuppress.mp4` (localized facial noise suppression/blur mask), `actor06_fake_temporaljitter.mp4` (temporal phase velocity tear).
- **Split Configuration:** Disjoint partition across unique source IDs (`actor01`..`actor06`). Verified zero split leakage via `verify_split_leakage()`.
- **CPU Resource Profile:** 8 sampled frames per video, 320x240 resolution. Total evaluation time: **27.98 seconds** (~4.66s per video on Windows CPU laptop).

### B.2 Empirical Metric Findings

| Metric | Measured Value | 95% Confidence Interval | Interpretation |
| :--- | :---: | :---: | :--- |
| **Accuracy ($\theta=0.50$)** | **16.67%** | [3.0%, 56.4%] (Wilson) | Naive fixed threshold misclassifies noisy authentic frames |
| **Balanced Accuracy** | **16.67%** | — | Reflects severe sensitivity to high-frequency camera noise |
| **Precision** | **25.00%** | [4.6%, 69.9%] | 1 True Positive out of 4 positive predictions |
| **Recall (Sensitivity)** | **33.33%** | [6.2%, 79.2%] | Successfully captured temporal jitter manipulation |
| **Specificity (TNR)** | **0.00%** | — | All 3 authentic videos triggered noise residual false alarms |
| **F1-Score** | **0.2857** | — | Harmonic mean of precision and recall |
| **ROC-AUC (Fused Score)** | **0.2222** | [0.0000, 0.6667] (Bootstrap) | Inverted ranking due to uncalibrated noise residual head |
| **PR-AUC** | **0.3417** | — | Baseline is 0.50 for balanced classes |
| **Brier Score** | **0.3457** | — | High calibration error relative to 0.0 ideal |
| **Expected Calibration Error (ECE)** | **0.4520** | — | Substantial divergence between score and true accuracy |
| **Confusion Matrix** | **TP=1, FP=3, TN=0, FN=2** | — | Over-sensitive manipulation floor |

### B.3 Signal Head Ablation & Comparison (Task 4)

A critical requirement of Phase C was evaluating whether each signal head contributes useful predictive information:

| Signal Head | ROC-AUC | PR-AUC | Acc @ 0.50 | Empirical Finding |
| :--- | :---: | :---: | :---: | :--- |
| **Frequency Spectrum (2D FFT)** | **0.7778** | **0.7917** | **50.0%** | **Strong predictive capability.** Effectively discriminated periodic transposed-convolution checkerboard spikes from natural 1/f falloff. |
| **Object Coherence (SSDLite)** | **0.5000** | **0.3889** | **50.0%** | **Completely uninformative** for deepfake discrimination (performs identically to random chance). |
| **Noise Residual (PRNU approx)** | **0.2778** | **0.5083** | **33.3%** | **Negative correlation / Inverted.** Camera sensor noise in authentic videos was flagged as high block-variance anomaly. |
| **Temporal Flow (Farneback)** | **0.2222** | **0.3417** | **16.7%** | Hand-crafted SSIM threshold penalized natural actor motion. |
| **Fused Heuristic Score** | **0.2222** | **0.3417** | **16.7%** | **Destructive interference.** The uncalibrated noise and temporal heads overwhelmed the positive predictive signal of the frequency head. |

**Key Research Takeaway:** This empirical test conclusively validates why the naive "Bayesian" fusion was flawed. In the absence of empirical likelihood ratio training, summing uncalibrated heuristic scores degrades performance below that of the best individual detector (2D FFT alone achieved 0.78 ROC-AUC, whereas fusion dropped to 0.22).

---

## Section C: Full Benchmark Results Status

**STATUS: NOT CLAIMED / DEFERRED**

In strict adherence to Rule 5 (*"Do not fabricate results, benchmark metrics, ground-truth labels, or citations"*) and Rule 4 (*"Do not download large datasets automatically without checking available disk space, license/terms, dataset size, and user approval"*):

- **Zero large benchmark datasets (FaceForensics++, Celeb-DF v2, DFDC) have been downloaded to date.**
- **No benchmark claims (e.g. "95% accuracy on FaceForensics++") are made in this repository.**
- Fabricating benchmark figures on third-party datasets that were not executed in the environment constitutes academic misconduct. Full benchmark metrics will only be recorded after official access is granted, the dataset is placed locally by the user, and `python -m backend.app.evaluation.evaluator` is executed over the official held-out test split.

---

## Section D: Known Scientific Limitations

1. **Vulnerability to Video Compression Quantization:**
   - Both the spatial noise residual head and the 2D FFT spectral decay head assume uncompressed or lightly compressed image signals. Heavy H.264/HEVC compression (`c40` tier) introduces macroblock boundary artifacts and quantizes high frequencies to zero. This simultaneously degrades true PRNU signals and induces false-positive Fourier checkerboard harmonics.
2. **Lack of Facial Landmark Localization:**
   - The current temporal flow and noise residual heads operate on the **full bounding frame** rather than an aligned face crop ($256\times 256$). Background motion (e.g. tree leaves, camera panning) dominates the optical flow calculation, obscuring subtle facial reenactment glitches.
3. **False Equivalence in Heuristic Weights:**
   - Equal or hand-tuned weights (0.35, 0.30, 0.25, 0.10) do not reflect empirical Fisher information or log-likelihood ratios. Signals with high variance (noise residual) dominate signals with high precision (spectral spikes).
4. **Diffusion Model Invisibility:**
   - The frequency head is tuned to detect transposed convolution checkerboard artifacts characteristic of 2019 GAN architectures. Modern latent diffusion video models (e.g., Sora, Gen-2, Kling) do not exhibit these artifacts and will pass through undetected by heuristic spectral thresholds.

---

## Section E: Recommended Next Experiments (Roadmap to Phase D)

1. **Experiment E.1 — Labeled Empirical Logistic Calibration (Platt Scaling):**
   - Acquire a small, authorized 50-video calibration set from FaceForensics++ `c23` (25 real, 25 fake).
   - Fit multi-variate logistic regression on the validation split:
     $$\ln \frac{P(M)}{1 - P(M)} = \beta_0 + \beta_1 s_{\text{freq}} + \beta_2 s_{\text{noise}} + \beta_3 s_{\text{temporal}} + \beta_4 s_{\text{object}}$$
   - Replace fixed weights with learned coefficients $\beta_i$.
2. **Experiment E.2 — Face Alignment & Cropping Preprocessor:**
   - Integrate an ultra-lightweight CPU face detector (e.g. MediaPipe FaceMesh or OpenCV YuNet) to crop strictly to facial bounding boxes before feeding frames to the noise and temporal analyzers.
3. **Experiment E.3 — High-Pass Spatial Residual Inversion Fix:**
   - Recalibrate the coefficient of variation ($CV$) threshold in `VisualManipulationDetector` against compressed authentic video baselines to prevent authentic camera noise from triggering manipulation flags.
4. **Experiment E.4 — Held-Out Test Evaluation on FF++ c23:**
   - Once official dataset approval is obtained, execute the evaluation harness on the 140 official held-out test videos without parameter changes.

---

## Provenance & Verification Metadata
- **Harness Script:** `backend/app/evaluation/evaluator.py`
- **Dataset Loader:** `backend/app/evaluation/dataset_loader.py`
- **Pilot Generator:** `backend/app/evaluation/create_pilot_dataset.py`
- **Output Artifacts:** `evaluation_results/evaluation_summary.json`, `evaluation_results/per_video_predictions.csv`
- **Git Commit:** `82fbcc94c30f9fba1b5e59597231cde46ea0db0d` (reported on `main`)
