# OmniVerify — Third-Party Licenses & Attribution Audit (Phase A2)

**Project Title:** Intelligent Multi-Dimensional Analysis for DeepFake Video Identification  
**Academic Year:** 2026–27  
**Primary Repository License:** MIT License  

---

## 1. Upstream Candidate Licenses & Legal Compatibility

| Repository / Project | Author / Organization | Upstream License | Commercial Use Permitted? | Attribution Obligation | OmniVerify Compliance Status |
|---|---|---|---|---|---|
| **`heisenberg1804/veriFi`** | heisenberg1804 | **MIT License** | Yes | Yes (Must include copyright and license notice) | **COMPLIANT:** Concepts adapted; signal-processing principles acknowledged with upstream attribution preserved. |
| **`temporally-localized...`** | Okan Umur, Ali Emre Güçlü, Ibrahim Delibasoglu (arXiv:2606.07090) | **Research Open Access (Zenodo)** | Academic Research Permitted | Yes (Citation to paper & Zenodo DOI required) | **COMPLIANT:** Formal academic citation provided in `MethodologyTab.tsx` and documentation. |
| **`SCLBD/DeepfakeBench`** | Zhiyuan Yan, Yong Zhang, Xinhang Yuan, Siwei Lyu, Baoyuan Wu (NeurIPS 2023 D&B) | **Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)** | **NO** (Strictly non-commercial) | Yes (Author credit and license link mandatory) | **COMPLIANT:** Code was **NOT** copied into OmniVerify. Used solely as a research benchmark reference for metric definitions. |

---

## 2. Core Framework & Library Dependency Licenses

| Dependency Name | Version Target | License | Permitted Distribution | Usage Scope in OmniVerify |
|---|---|---|---|---|
| **Python** | 3.10+ (3.14) | Python Software Foundation (PSF) | Yes | Core programming language runtime |
| **OpenCV (`opencv-python`)** | 4.10+ | Apache License 2.0 | Yes | Video ingestion, frame decoding, Farneback optical flow, colormap rendering |
| **FastAPI** | 0.115+ | MIT License | Yes | REST backend service and HTTP request routing |
| **Pydantic** | 2.8+ | MIT License | Yes | Schema validation and data serialization |
| **PyTorch & Torchvision** | 2.4+ | Modified BSD-style | Yes | Pretrained SSDLite-MobileNetV3 COCO object weights (CPU inference) |
| **NumPy** | 1.26+ | BSD 3-Clause | Yes | Matrix operations and 2D FFT computation |
| **SciPy** | 1.14+ | BSD 3-Clause | Yes | Gaussian spatial filtering for PRNU noise extraction |
| **React & React-DOM** | 18.3+ | MIT License | Yes | User interface component architecture |
| **Vite** | 5.4+ | MIT License | Yes | Frontend build tooling and local development server |
| **Lucide-React** | 1.16+ | ISC License | Yes | SVG forensic interface icons |
| **Pytest** | 8.3+ | MIT License | Yes | Automated testing framework |

---

## 3. Proprietary & Brand Asset Governance

### Official OmniVerify Logo Asset
- **Asset Path:** `frontend/public/assets/omniverify_logo.png`
- **Favicon Path:** `frontend/public/assets/favicon.png`
- **Ownership:** Exclusively provided by the client/user in the initial project brief (`media_1792570952049.png`).
- **Usage Restrictions:**
  - Preserved in original visual fidelity without distortion, modification, or AI replacement.
  - No text was added inside the graphic element.
  - Maintained as an authentic user-supplied brand asset.
