# OmniVerify — Benchmark Dataset Readiness & Access Audit

## 1. Executive Summary
This document reviews the readiness of the OmniVerify repository to evaluate against standard, peer-reviewed deepfake benchmark datasets. It documents existing assets, identifies missing components, assesses the legal and computational profiles of major academic datasets (FaceForensics++, Celeb-DF v2, DFDC), and defines the exact data split hygiene requirements to prevent scientific data leakage.

In accordance with Phase C guidelines, **no large datasets are downloaded automatically**. All academic datasets require explicit terms-of-use compliance, institutional or researcher credential registration, and disk storage verification.

---

## 2. Repository Asset Inventory (Phase C Baseline)

| Component | Status Before Phase C | Status After Phase C | Details & Artifact Location |
| :--- | :---: | :---: | :--- |
| **Dataset Loader** | Missing | **Implemented** | `backend/app/evaluation/dataset_loader.py` (Manifest & Directory modes) |
| **Split Leakage Enforcer** | Missing | **Implemented** | `verify_split_leakage()` in `dataset_loader.py` |
| **Evaluation Metrics Engine** | Missing | **Implemented** | `backend/app/evaluation/metrics.py` (ROC, PR, Brier, ECE, CIs) |
| **Standalone Benchmark Runner** | Missing | **Implemented** | `backend/app/evaluation/evaluator.py` (CLI with provenance & CSV outputs) |
| **Pretrained Deepfake Weights** | None | None | Pipeline relies on torchvision SSDLite + deterministic CV heuristics |
| **External Benchmark Data** | None | None | 0 bytes downloaded; pilot synthetic dataset generated locally |
| **Pilot Test Fixtures** | Unit test only | **Implemented** | `backend/app/evaluation/create_pilot_dataset.py` (6 pilot videos) |

---

## 3. Academic Deepfake Datasets: Comparative Assessment

### 3.1 FaceForensics++ (FF++)
- **Authors & Citation:** Andreas Rössler, Davide Cozzolino, Luisa Verdoliva, Christian Riess, Justus Thies, Matthias Nießner (ICCV 2019).
- **Dataset Composition:**
  - 1,000 pristine source YouTube video sequences.
  - Manipulated sequences generated with 4 distinct methods:
    1. **Deepfakes (DF):** Autoencoder-based face replacement.
    2. **Face2Face (F2F):** Facial reenactment transfer.
    3. **FaceSwap (FS):** Graphics-based 3D model swap.
    4. **NeuralTextures (NT):** Patch-based neural rendering.
  - Compression Tiers:
    - `c0` (Raw, uncompressed): > 1.2 TB.
    - `c23` (Light H.264 compression / High Quality): ~80 GB.
    - `c40` (Heavy H.264 compression / Low Quality): ~20 GB.
- **Official Splits:**
  - Fixed standard split: 720 train sequences, 140 validation sequences, 140 test sequences.
- **Official Access Procedure & License:**
  - **License:** Strictly for non-commercial academic research. Commercial deployment or resale is explicitly prohibited.
  - **Access Procedure:** Researchers must complete and sign the FaceForensics Terms of Use Agreement and email it to `faceforensics@googlegroups.com`. Upon approval, the authors provide a Python download script (`download-FaceForensics.py`) and a temporary access token.
  - **No Public Direct URL:** The dataset cannot be scraped or downloaded via public HTTP without credentials.
- **Computational Profile on Windows CPU:**
  - Full evaluation across all 140 test videos ($\times 5$ methods = 700 videos) at 4.6 seconds per video requires ~53.6 minutes of CPU compute time.
  - Disk storage requirement for `c23` test subset: ~12 GB.
- **Recommendation for OmniVerify:** **Primary target for held-out benchmark.** Recommend acquiring the 140-video `c23` and `c40` test splits once access credentials are provided by the user.

---

### 3.2 Celeb-DF (v2)
- **Authors & Citation:** Yuezun Li, Xin Yang, Baoyuan Wu, Lyu Siwei (CVPR 2020).
- **Dataset Composition:**
  - 590 real celebrity YouTube interview videos covering 59 diverse subjects.
  - 5,639 high-resolution DeepFake videos created using an improved autoencoder synthesis pipeline that eliminates visual border cutoffs and low-resolution face blur.
  - Total Size: ~35 GB (compressed archive).
- **Official Splits:**
  - An official `List_of_testing_videos.txt` specifies 518 test videos (178 real videos, 340 synthesized videos).
- **Official Access Procedure & License:**
  - **License:** Research only; redistributing or publishing facial clips without consent is restricted.
  - **Access Procedure:** Prospective users must submit a Google Form request to the University at Buffalo Media Forensic Lab (UB MCL) detailing academic affiliation and intended research use.
- **Computational Profile on Windows CPU:**
  - Official test set of 518 videos at 4.6s/video requires ~39.7 minutes of CPU compute.
  - Storage required: ~6 GB for test set.
- **Recommendation for OmniVerify:** **Secondary benchmark target.** Celeb-DF v2 is widely considered significantly harder for classic heuristic detectors due to seamless edge blending and absence of color flicker.

---

### 3.3 Deepfake Detection Challenge (DFDC)
- **Authors & Citation:** Brian Dolhansky et al., Meta / Partnership on AI (2020).
- **Dataset Composition:**
  - Full dataset: Over 100,000 video sequences from 3,426 paid actors, with extensive real-world augmentations (audio swaps, lighting shifts, compression variations, camera rotations).
  - Total Size: > 470 GB.
  - DFDC Preview Set: 4.1 GB (1,133 videos).
- **Official Access Procedure & License:**
  - Hosted on Kaggle and AWS. Requires Kaggle competition terms acceptance.
- **Feasibility on Laptop:**
  - **Full dataset is strictly infeasible** for a laptop environment (>470 GB storage, dozens of hours of CPU time).
  - The **DFDC Preview Set (4.1 GB)** is technically feasible if the user supplies it.

---

## 4. Subject-Level Split Hygiene & Leakage Prevention Rules

In digital video forensics research, a pervasive methodological flaw is **Frame-Level or Identity-Level Data Leakage**. OmniVerify enforces strict mathematical split hygiene through `DeepfakeDataset.verify_split_leakage()`.

### 4.1 The Video-to-Frame Independence Fallacy
- **Rule:** Frame-level samples from the same source video must **NEVER** be treated as independent data points.
- **Rationale:** Two frames extracted 100 ms apart from the same video share identical sensor noise patterns, camera lens distortion, room lighting, background geometry, and encoding bitrate. If Frame A is placed in training and Frame B in testing, test accuracy will be artificially elevated, measuring camera-instance memorization rather than deepfake detection.
- **OmniVerify Standard:** All evaluations are computed at the **video-sequence level**.

### 4.2 Subject & Derivative Pair Disjointness
- In FaceForensics++, manipulated video `042_123.mp4` is derived from pristine source video `042.mp4` and target `123.mp4`.
- **Leakage Condition:** If `042.mp4` is in the training split, neither `042.mp4` nor `042_123.mp4` may appear in the test split.
- **Enforcement:** OmniVerify groups samples by `source_id`. If `train_sources.intersection(test_sources) != set()`, the system raises a `SplitLeakageError` and terminates evaluation immediately before processing any video.

```
       +---------------------------------------------+
       |   Master Dataset (Unique Source Subjects)    |
       +---------------------------------------------+
                              |
            +-----------------+-----------------+
            |                                   |
   +-------------------+               +-------------------+
   |   Train / Val     |               |  Held-Out Test    |
   | Source IDs:       |               | Source IDs:       |
   | {001..720}        |               | {721..860}        |
   +-------------------+               +-------------------+
            |                                   |
   Real: 042.mp4                       Real: 755.mp4
   Fake: 042_123.mp4                   Fake: 755_810.mp4
   (Zero Subject Overlap)              (Zero Subject Overlap)
```

---

## 5. Decision Matrix for Benchmark Execution

| Step | Action Required | Responsible Party | Verification Criteria |
| :---: | :--- | :--- | :--- |
| **1** | Sign FF++ or Celeb-DF access agreement | User / Academic Lab | Written confirmation / download token from dataset author |
| **2** | Check local disk space | Automated CLI / User | Minimum 15 GB free disk space confirmed |
| **3** | Download official test split | User (using author's script) | Verify archive checksums against author manifest |
| **4** | Generate or verify `manifest.csv` | OmniVerify `dataset_loader` | Zero split leakage confirmed by `verify_split_leakage()` |
| **5** | Run 10-video pilot mode | OmniVerify `evaluator.py` | Verify runtime $\le 5$s/video and valid metric outputs |
| **6** | Execute held-out test evaluation | OmniVerify `evaluator.py` | Save `evaluation_summary.json` and report empirical metrics |
