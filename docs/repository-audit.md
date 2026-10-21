# OmniVerify — Phase A2 Deep Repository Audit

**Application Name:** OmniVerify  
**Project Title:** Intelligent Multi-Dimensional Analysis for DeepFake Video Identification  
**Academic Year:** 2026–27  
**Inspection Date:** October 21, 2026  
**Auditor:** Senior AI/ML & Digital Video Forensics Architect  
**Hardware Environment:** Windows 11 (x86_64), CPU-only (Intel/AMD), 16GB RAM, No Dedicated GPU  
**Primary Target Repository:** [https://github.com/Modepalli-Ravindra/OmniVerify.git](https://github.com/Modepalli-Ravindra/OmniVerify.git)

---

## 1. Audit Scope & Evaluation Framework

In accordance with Phase A2 mandates, this audit evaluates potential upstream repositories against the actual core mission of **OmniVerify**:
1. **Holistic video & scene forensic analysis** (people, objects, backgrounds, scene context, motion, and element interactions — not solely human facial crops).
2. **Multi-signal detection** (OpenCV preprocessing, multi-category object detection, PRNU sensor noise residuals, dense optical flow motion continuity, and 2D Fourier/DCT spectral harmonics).
3. **Traceable explainability** (temporally localized suspicious frames and intervals, spatial heatmap localization, calibrated 3-tier verdict: Real / Manipulated / Uncertain).
4. **Zero-GPU Windows CPU execution** (bounded frame sampling, lazy initialization, sub-2GB memory footprint).
5. **Production delivery** (FastAPI backend, React 18 Bento Grid dashboard in Cyprus Green `#004741` and Sand `#F0EDE4`, downloadable forensic dossier).

---

## 2. Deep Technical Audit of Upstream Candidates

### Candidate 1: `heisenberg1804/veriFi`
- **Repository URL:** `https://github.com/heisenberg1804/veriFi`
- **Owner / Maintainer:** `heisenberg1804`
- **Branch Inspected:** `master`
- **Inspection Date:** October 2026
- **License:** MIT License
- **Architectural Paradigm:** Multi-signal forensic ensemble combining classical signal processing with zero-shot vision-language models (CLIP ViT-L/14) and artifact classifiers (EfficientNet-B4).

#### Pipeline Tracing & Inference Flow
```
Video File (MP4/MOV) 
   ──> ffprobe validation & scene detection
   ──> Two-pass frame selection (decodes statistics first, greedy farthest-point diversity)
   ──> MTCNN face detection (Path A: Face crops) vs Full Frame (Path B)
   ──> Parallel feature extractors:
         ├── Noise residual (PRNU high-pass filtering)
         ├── 2D DCT spectral frequency ratios
         ├── Optical flow (temporal variance, SSIM, HF flicker)
         ├── CLIP ViT-L/14 zero-shot prompt ensembling
         └── EfficientNet-B4 artifact classifier
   ──> Weighted linear average ensemble ──> Verdict + GradCAM + LangGraph report
```

#### Detailed Source-Level Findings
1. **Strengths:**
   - **Two-Pass Bounded Frame Selection:** Decodes once to extract statistics, discards pixels immediately, selects diverse indices, then decodes only budgeted frames. This prevents out-of-memory crashes on long videos.
   - **Signal-Processing Priority:** Treats physical sensor noise and optical flow as primary evidence rather than relying entirely on brittle deep neural network weights.
   - **Permissive MIT License:** Clean legal compatibility for adaptation.
2. **Critical Gaps & Documented Defects:**
   - **Face-Centric Bias in Path A:** Uses MTCNN to detect and crop faces. Path A dominates the analysis, failing the client requirement to model non-facial objects, background context, and environmental interactions.
   - **Author-Documented Mathematical Bugs:**
     - *DCT Inversion:* The author explicitly documents in the README: *"DCT is inverted. Near-perfect inverse correlation on the internal set. It holds the highest ensemble weight and points the wrong way."*
     - *Sigmoid Saturation:* `smooth_score` applies an unscaled sigmoid centered at 1.0 while inputs range 6.6–10.4, causing it to saturate to 0 for every video.
     - *Clamping Artifacts:* `band_score` is arbitrarily clamped to 0.700 by a `low_ratio > 0.7` condition; cross-channel correlation saturates at 1.000 via a `* 1.5` clamp.
     - *Uncalibrated Classifier:* EfficientNet-B4 scored 0.937 (highly fake) on an authentic camera interview.
   - **No Production Web Dashboard:** Lacks a React frontend, Bento Grid workspace, and interactive frame timeline.

---

### Candidate 2: `OkanUmur/temporally-localized-video-manipulation-detection`
- **Repository URL:** `https://github.com/OkanUmur/temporally-localized-video-manipulation-detection`
- **Authors:** Okan Umur, Ali Emre Güçlü, Ibrahim Delibasoglu (arXiv:2606.07090)
- **Branch Inspected:** `master`
- **Inspection Date:** October 2026
- **License:** Research Open Source (Zenodo DOI: 10.5281/zenodo.20548572)
- **Architectural Paradigm:** Temporal splice and insertion forensic benchmark.

#### Pipeline Tracing & Findings
1. **Strengths:**
   - **Temporal Insertion Modeling:** Addresses the realistic scenario where a short manipulated segment (e.g., 3–5 seconds) is inserted into an otherwise authentic continuous video (`authentic -> fake insertion -> authentic continuation`).
   - **Boundary Metadata Logging:** Explicitly computes `start_frame`, `end_frame`, `fps_original`, and transition deltas, directly aligning with client requirement REQ-EXP-02 (suspicious timestamps).
2. **Critical Gaps & Limitations:**
   - **Dataset/Benchmark Only:** Contains evaluation scripts and metadata CSVs rather than an interactive end-to-end inference pipeline.
   - **No Spatial Forensics:** Does not implement sensor noise residuals, 2D FFT spectral decay, or object-level interaction modeling.
   - **No Application Shell:** No REST API, no React frontend, and no report generation.

---

### Candidate 3: `SCLBD/DeepfakeBench`
- **Repository URL:** `https://github.com/SCLBD/DeepfakeBench`
- **Authors:** Zhiyuan Yan, Yong Zhang, Xinhang Yuan, Siwei Lyu, Baoyuan Wu (NeurIPS 2023 D&B)
- **Branch Inspected:** `main`
- **Inspection Date:** October 2026
- **License:** Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)
- **Architectural Paradigm:** Large-scale unified benchmark integrating 36 detectors (28 spatial + 8 video detectors).

#### Pipeline Tracing & Findings
1. **Strengths:**
   - **Comprehensive Metric Definitions:** Standardizes frame-level AUC, video-level AUC, ACC, EER, and average precision (AP) across FF++, Celeb-DF, and DFDC.
   - **Broad Spectrum of Detectors:** Implements MesoNet, Xception, Capsule, F3Net, SPSL, FTCN, VideoMAE, and ICML'25 Effort.
2. **Critical Gaps & Disqualifying Constraints:**
   - **Heavy Multi-GPU Hardware Requirement:** Built specifically for multi-GPU training clusters with PyTorch Distributed Data Parallel (DDP), LMDB caching, and heavy CUDA dependencies. Completely unfeasible on a CPU-only Windows laptop.
   - **License Restriction:** CC BY-NC 4.0 explicitly prohibits commercial derivatives and requires non-commercial licensing attribution.
   - **CLI / Experiment Script Design:** No client-facing web application, video upload endpoint, or Bento Grid layout.

---

## 3. Candidate Summary & Technical Tradeoff Matrix

| Criterion | veriFi (`heisenberg1804`) | Temporally Localized (`OkanUmur`) | DeepfakeBench (`SCLBD`) |
|---|---|---|---|
| **Core Architecture** | Multi-signal signal processing | Temporal insertion benchmark | 36-detector deep learning benchmark |
| **Scene & Object Analysis** | Face-crop biased (MTCNN) | None | Primarily facial bounding crops |
| **Motion & Temporal** | Optical flow variance | Interval boundary tracking | Heavy 3D CNNs (FTCN, VideoMAE) |
| **Frequency Forensics** | 2D DCT (author noted bugs) | None | F3Net / SPSL (Heavy PyTorch) |
| **Windows CPU Feasibility** | **High** (Pure signal processing) | **High** (Lightweight scripts) | **Very Low** (Requires multi-GPU CUDA) |
| **Pretrained Weights** | CLIP / EfficientNet (heavy) | Metadata CSV only | Multi-gigabyte PyTorch checkpoints |
| **License** | **Permissive MIT** | Research Open Access | **Restrictive CC BY-NC 4.0** |
| **Interactive Web UI** | None | None | None |
| **Overall Base Suitability** | **Partial (Signal base)** | **Partial (Temporal logic)** | **Reference Only (Metrics)** |
