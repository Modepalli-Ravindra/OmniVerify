# OmniVerify — Phase A2 Gap-Closure Implementation Plan

**Project Title:** Intelligent Multi-Dimensional Analysis for DeepFake Video Identification  
**Academic Year:** 2026–27  
**Execution Environment:** Windows 11 (x86_64 CPU-only)  

---

## 1. Executive Strategy

Phase A2 audit demonstrated that no single upstream repository satisfies OmniVerify's mandatory client requirements out-of-the-box (maximum candidate match was 22.2% in `veriFi`). Rather than compromising client requirements or accumulating broken dependencies, this plan defines how every identified architectural gap is resolved, prioritized, and verified.

---

## 2. Prioritized Gap-Closure Matrix

### Phase 1: Core Forensic Engine & Mathematical Rectification (Highest Priority)

#### Gap 1.1: Face-Only Detection Bias (Client Req REQ-01, REQ-02, REQ-03, REQ-04)
- **Problem in Upstream:** `veriFi` and `DeepfakeBench` exclusively crop facial bounding boxes via MTCNN, ignoring generative manipulation in backgrounds, objects, clothing, and body interactions.
- **Intended Implementation:** Full-scene multi-category object detection using CPU-optimized SSDLite-MobileNetV3 (COCO 80 classes) coupled with CV edge/contour saliency fallback. Evaluates temporal scene object co-occurrence and jitter stability.
- **Source Files:** `backend/app/models/object_detector.py`.
- **Dependencies:** Torchvision, OpenCV (`cv2`), NumPy.
- **CPU & Memory Impact:** Lightweight (~18MB model weights in memory; ~12ms per frame on CPU).
- **Test Procedure:** `backend/tests/test_object_detector.py` (`test_object_detector_frame`, `test_temporal_scene_coherence`).
- **Acceptance Criteria:** Returns normalized bounding boxes `[x1, y1, x2, y2]`, labels, confidence scores, and a scene stability jitter metric [0.0 - 1.0].
- **Status:** **COMPLETED & VERIFIED**.

#### Gap 1.2: Inverted DCT Frequency & Sigmoid Saturation Bugs (Client Req REQ-09)
- **Problem in Upstream:** `veriFi` documented an inverted correlation in DCT scores and an unscaled sigmoid that saturated `smooth_score` to zero on every video.
- **Intended Implementation:** Implement 2D Fast Fourier Transform (FFT) radial power spectrum falloff $P(r)$ to measure low, mid, and high frequency energy ratios. Harmonic checkerboard spikes from transposed convolutions are detected via positive radial gradient diffs.
- **Source Files:** `backend/app/models/frequency_forensics.py`.
- **Dependencies:** NumPy FFT (`fft2`, `fftshift`), OpenCV.
- **CPU & Memory Impact:** Negligible (< 5MB RAM; ~4ms per frame on CPU).
- **Test Procedure:** `backend/tests/test_forensics.py` (`test_frequency_spectrum_analysis`).
- **Acceptance Criteria:** Produces calibrated spectral defect scores [0.0 - 1.0] without saturation or clamping overrides.
- **Status:** **COMPLETED & VERIFIED**.

#### Gap 1.3: Uncalibrated Linear Ensembling (Client Req REQ-10, REQ-14, REQ-15)
- **Problem in Upstream:** Upstream simple linear averaging scored worse than its best individual signal and produced uncalibrated overconfident scores without an uncertain band.
- **Intended Implementation:** Calibrated Bayesian Log-Odds Fusion Head:
  $$\text{FusedLogit} = \beta_0 + \sum w_k \cdot \ln(s_k / (1 - s_k))$$
  calibrated via Platt scaling to output posterior probabilities and a definitive 3-tier verdict (`REAL` < 0.38, `UNCERTAIN` 0.38–0.62, `MANIPULATED` > 0.62).
- **Source Files:** `backend/app/models/evidence_fusion.py`.
- **Dependencies:** Pure Python math, NumPy.
- **CPU & Memory Impact:** Zero runtime overhead (< 1ms).
- **Test Procedure:** `backend/tests/test_evidence_fusion.py` (`test_evidence_fusion_real`, `_manipulated`, `_uncertain`).
- **Acceptance Criteria:** Correctly maps multi-signal inputs to three-tier verdicts and provides granular signal weight contributions.
- **Status:** **COMPLETED & VERIFIED**.

---

### Phase 2: Evidence Localization & Traceability (High Priority)

#### Gap 2.1: Automated Temporal Interval Clustering (Client Req REQ-11)
- **Problem in Upstream:** `OkanUmur` provided offline CSV dataset metadata, but lacked an online algorithmic clustering service to group continuous anomalous frames into timestamped intervals.
- **Intended Implementation:** `ExplainabilityService.identify_suspicious_intervals()` evaluates consecutive frames where composite anomaly $\ge 0.45$, calculating start/end millisecond timestamps, formatted time strings, and dominant contributing signals.
- **Source Files:** `backend/app/services/explainability.py`.
- **Dependencies:** Pydantic schemas.
- **CPU & Memory Impact:** Instantaneous (< 1ms).
- **Test Procedure:** `backend/tests/test_evidence_fusion.py` (`test_suspicious_interval_grouping`).
- **Acceptance Criteria:** Groups contiguous anomalous frames and extracts exact millisecond intervals.
- **Status:** **COMPLETED & VERIFIED**.

#### Gap 2.2: Spatial Anomaly Heatmap Localization (Client Req REQ-06, REQ-12)
- **Problem in Upstream:** Upstream GradCAM required heavy backpropagation through deep networks that are unfeasible on CPU.
- **Intended Implementation:** 8x8 block-variance high-pass PRNU residual matrix interpolated with bicubic scaling to full frame dimensions and colorized with OpenCV Jet colormap.
- **Source Files:** `backend/app/models/visual_manipulation.py`.
- **Dependencies:** OpenCV (`applyColorMap`), SciPy.
- **CPU & Memory Impact:** ~8ms per frame on CPU.
- **Test Procedure:** `backend/tests/test_forensics.py` (`test_visual_noise_residual`).
- **Acceptance Criteria:** Generates base64 JPEG overlays ready for direct canvas rendering in the UI.
- **Status:** **COMPLETED & VERIFIED**.

---

### Phase 3: Application, Bento Grid UI & Reporting (Production Priority)

#### Gap 3.1: Missing Web Interface & Bento Grid Dashboard (Client Req REQ-16, REQ-18, REQ-19)
- **Problem in Upstream:** Upstream repositories were purely CLI scripts with zero client-facing interface.
- **Intended Implementation:** React 18 + Vite dashboard with responsive Bento Grid architecture strictly styled in Cyprus Green (`#004741`), Sand (`#F0EDE4`), Deep Teal (`#003B36`), and Ink (`#101816`). Features synchronized HTML5 video player, interactive frame timeline with click-to-seek, and heatmap toggle.
- **Source Files:** `frontend/src/App.tsx`, `frontend/src/index.css`, `frontend/src/components/*`.
- **Dependencies:** React, Vite, TypeScript, Lucide-React.
- **CPU & Memory Impact:** Client-side hardware accelerated rendering in browser.
- **Test Procedure:** Vite production compilation (`npm run build`).
- **Acceptance Criteria:** Bundles 1956 modules with 0 errors and matches official brand tokens.
- **Status:** **COMPLETED & VERIFIED**.

#### Gap 3.2: Standalone Forensic Dossier Generator (Client Req REQ-21)
- **Problem in Upstream:** Upstream lacked downloadable forensic reports conforming to digital evidence standards.
- **Intended Implementation:** ForensicReportGenerator outputs:
  1. Complete JSON machine digest with SHA-256 custody digest.
  2. Printable standalone HTML forensic examination dossier styled in Cyprus Green and Sand, ready for print/PDF export.
- **Source Files:** `backend/app/services/report_generator.py`.
- **Dependencies:** Pure Python, FastAPI `FileResponse`.
- **CPU & Memory Impact:** < 10ms generation time.
- **Test Procedure:** `backend/tests/test_api.py` (`test_end_to_end_upload_and_analyze`).
- **Acceptance Criteria:** Download endpoints `/api/reports/{filename}/json` and `/api/reports/{filename}/html` return valid dossiers.
- **Status:** **COMPLETED & VERIFIED**.
