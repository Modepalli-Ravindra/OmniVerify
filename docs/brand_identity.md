# OmniVerify — Brand Identity & Design System Specification

**Application Name:** OmniVerify  
**Project Title:** Intelligent Multi-Dimensional Analysis for DeepFake Video Identification  
**Academic Year:** 2026–27  

---

## 1. Brand Philosophy
OmniVerify is conceived as an uncompromising, authoritative digital forensics workbench. It is designed to look like a high-precision scientific instrument utilized by senior forensic analysts, trust & safety investigators, and digital media verification experts.

It deliberately rejects generic AI dashboard tropes (neon gradients, decorative unlabelled line charts, glassmorphism blobs, robotic icons) in favor of:
- **Restrained, high-contrast editorial typography** (Outfit & Inter / JetBrains Mono).
- **Tactile warmth and institutional credibility** anchored by deep Cyprus Green and warm Sand neutrals.
- **Data-dense Bento Grid layout** that organizes complex multi-signal evidence into intuitive analytical cards.

---

## 2. Color Palette & Tokens

| Token Name | Hex Code | HSL Representation | Primary Role |
|---|---|---|---|
| **Cyprus Green** | `#004741` | `hsl(175, 100%, 14%)` | Primary brand anchor, primary action buttons, active navigation, key forensic focus highlights |
| **Sand** | `#F0EDE4` | `hsl(43, 27%, 92%)` | Light neutral canvas, secondary surfaces, report backgrounds |
| **Deep Teal** | `#003B36` | `hsl(175, 100%, 12%)` | Dark mode surface elevated cards, deep navigation panels, hover accents |
| **Ink** | `#101816` | `hsl(165, 20%, 8%)` | Primary dark body text, deep base canvas in dark mode |
| **Muted Teal** | `#6D9A91` | `hsl(169, 19%, 52%)` | Secondary borders, muted badges, metadata accents, chart series 2 |
| **Soft White** | `#FAF9F5` | `hsl(48, 33%, 97%)` | Primary card surfaces in light mode, high-contrast text in dark mode |
| **Muted Text** | `#64716D` | `hsl(164, 6%, 42%)` | Explanatory captions, timestamp indicators, table headers |

### Supporting Forensic Signal Badges:
- **Real (Authentic):** Emerald Green (`#0F766E` / `#D1FAE5`)
- **Uncertain (Indeterminate):** Amber Ochre (`#B45309` / `#FEF3C7`)
- **Manipulated (Anomalous):** Crimson Red (`#B91C1C` / `#FEE2E2`)

---

## 3. Official Logo Asset Specification
- **Source:** User-uploaded master asset (`media_1792570952049.png`).
- **Path in Repository:** `frontend/public/assets/omniverify_logo.png`.
- **Favicon Path:** `frontend/public/assets/favicon.png`.
- **Visual Description:** Geometric teal polygon frame holding a rounded digital video frame with play icon and pixelated forensic dispersal cubes on the right edge.
- **Usage Rules:**
  - Never alter the aspect ratio.
  - Never add text inside the logo graphic itself.
  - Display with clean padding alongside the wordmark `OmniVerify` set in semi-bold tracking.
  - Applied consistently in the sidebar, header, authentication/splash screen, and forensic PDF report header.
