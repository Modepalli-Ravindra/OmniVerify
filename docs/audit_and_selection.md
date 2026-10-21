# OmniVerify — Candidate Repository Audit & Architectural Selection Rationale

**Application Name:** OmniVerify  
**Project Title:** Intelligent Multi-Dimensional Analysis for DeepFake Video Identification  
**Academic Year:** 2026–27  
**Environment:** Windows 11 (CPU Inference, limited RAM, bounded frame sampling)  
**Target Repository:** [https://github.com/Modepalli-Ravindra/OmniVerify.git](https://github.com/Modepalli-Ravindra/OmniVerify.git)

---

## 1. Executive Summary & Objective

Deepfake video manipulation has evolved from simple facial swaps to full-scene generative diffusion and temporally localized synthesis (e.g. Sora, Kling, Runway Gen-3). Conventional deepfake detectors degrade severely on out-of-distribution generators because they rely exclusively on facial bounding boxes and 2019-era classification weights. 

The client's mandate for **OmniVerify** demands:
1. **Holistic video & scene forensics**: Inspection of the entire video frame (people, objects, background context, motions, temporal transitions), not merely facial crops.
2. **Multi-signal forensic analysis**: Object detection (YOLO/COCO detector), spatial manipulation/noise residuals (PRNU/high-pass residual), temporal continuity (Lucas-Kanade/Farneback Optical Flow), and frequency domain anomalies (2D FFT / DCT multi-band energy).
3. **Traceable Explainability**: Bounded timestamps, suspicious frame markers, localized region indicators, and a calibrated 3-tier verdict (`REAL`, `MANIPULATED`, `UNCERTAIN`).
4. **Feasible CPU Deployment**: Windows laptop execution with bounded memory, lazy evaluation, and zero heavy GPU training requirement.

---

## 2. Upstream Candidate Repositories Audit

We performed an in-depth code and structural audit across three prominent open-source repositories:

### Candidate A: `heisenberg1804/veriFi`
- **Core Philosophy:** Forensic multi-signal ensemble leading with signal-processing techniques that require no supervised training data, coupled with two-pass frame selection.
- **Strengths:**
  - Excellent two-pass frame selection (decodes statistics first, selects diverse frames via farthest-point sampling, bounds memory to budget rather than video length).
  - Multi-signal approach: Noise residual (sensor PRNU estimation), DCT frequency analysis, Optical Flow temporal variance, and multimodal reasoning.
  - Transparent self-audit documentation outlining real-world failure modes.
- **Gaps & Defects Identified:**
  - *Face-Centric Bias:* Path A relies on MTCNN and crops faces, violating the client requirement to analyze the entire scene, objects, and backgrounds.
  - *Known Signal Bugs:* Author explicitly notes that DCT frequency was inverted on benchmark videos; `smooth_score` saturates to 0 due to an unscaled sigmoid; cross-channel correlation clamps at 1.0; EfficientNet is uncalibrated.
  - *Frontend Missing:* No full React/Vite Bento Grid dashboard with video playback and interactive timeline.

### Candidate B: `OkanUmur/temporally-localized-video-manipulation-detection` (arXiv:2606.07090)
- **Core Philosophy:** Detection of temporally localized video splices/insertions where short synthetic segments are inserted into authentic video streams.
- **Strengths:**
  - Rigorous formulation of temporal boundary transitions (`start_frame`, `end_frame`).
  - Frame-level anomaly interval tracking instead of single-scalar video scores.
- **Gaps & Defects Identified:**
  - Academic dataset release and evaluation scripts rather than a modular production forensics engine.
  - Lacks full-scene object detection, interactive web UI, and frequency domain decomposition.

### Candidate C: `SCLBD/DeepfakeBench` (NeurIPS 2023 D&B)
- **Core Philosophy:** Large-scale unified benchmark integrating 36 detectors (Xception, MesoNet, F3Net, FTCN, Effort, etc.).
- **Strengths:**
  - Standardized evaluation protocol (frame-level AUC, video-level AUC, ACC, EER).
  - Rich variety of spatial and frequency algorithms.
- **Gaps & Defects Identified:**
  - *Heavy Resource Footprint:* Designed for multi-GPU training clusters (PyTorch DDP, LMDB). Incompatible with a zero-GPU Windows CPU runtime.
  - *License Restrictions:* CC BY-NC 4.0 prevents commercial derivatives.
  - *No Interactive End-to-End Application:* CLI/script-based training harness without a client-facing web application.

---

## 3. Comparative Evaluation Matrix

| Criterion | veriFi (`heisenberg1804`) | Temporally Localized (`OkanUmur`) | DeepfakeBench (`SCLBD`) | OmniVerify Selected Synthesis |
|---|---|---|---|---|
| **Primary Focus** | Multi-signal video forensics | Splice & temporal insertion | Detection benchmarking | Multi-dimensional full-scene forensic platform |
| **Scene/Object Analysis** | Face-focused + basic frame | None (temporal splices only) | Primarily facial crops | **Full Scene (COCO 80 classes, people, context)** |
| **Motion / Temporal** | Optical flow variance | Interval boundary scoring | VideoMAE, FTCN (Heavy 3D) | **Dense Optical Flow + Temporal Acceleration Flow** |
| **Frequency Forensics** | 2D DCT (needs bug fixes) | None | F3Net / SPSL (Heavy) | **Calibrated 2D FFT / DCT Multi-Band Energy** |
| **Evidence Fusion** | Weighted linear average | Segment aggregation | Model score ensembling | **Calibrated Multi-Signal Bayesian / DS Fusion** |
| **Windows CPU Feasible** | Yes (Signal processing) | Yes | No (Multi-GPU PyTorch) | **Yes (Quantized/Lightweight CPU inference)** |
| **Explainable Output** | Partial (GradCAM, JSON) | Frame intervals | Raw classification logits | **Bento Grid UI, Timestamp markers, Heatmaps, PDF** |
| **License** | Permissive MIT | Research Open Source | CC BY-NC 4.0 | **Permissive MIT with full attribution** |

---

## 4. Final Architecture Decision & Adaptation Rationale

**Selected Architecture Strategy: Multi-Dimensional Evidence Fusion Engine**
1. **Base Framework:** Adapt the signal-processing foundation of `veriFi` (Noise Residual, Optical Flow Temporal Consistency, 2D Spectral Decomposition) while rectifying the mathematical saturation/inversion defects.
2. **Scene & Object Intelligence:** Integrate a lightweight MobileNet-SSDLite / YOLO object detector to classify all scene elements (people, vehicles, electronics, furniture, background objects) and detect spatial scene inconsistencies.
3. **Temporal Localization:** Integrate the transition-boundary logic from `temporally-localized-video-manipulation-detection` to flag continuous anomalous frame intervals with start/end millisecond precision.
4. **Calibrated Evidence Fusion:** Combine independent signals (Object Anomaly, Noise Residual, Frequency Spectrum, Optical Flow Temporal Continuity) using a calibrated log-odds fusion model.
5. **Modern Forensic Dashboard:** Deliver an interactive React + Vite Bento Grid interface styled in the official Cyprus Green (`#004741`) & Sand (`#F0EDE4`) design system, featuring the official user-provided logo.
