# OmniVerify — Standard Evaluation Protocol for Deepfake Detection

## 1. Overview & Research Scope
This protocol establishes the standardized scientific methodology for evaluating the multi-modal detection pipeline of **OmniVerify**. It governs split isolation, metric calculation, score calibration, confidence interval estimation, and reporting standards to ensure reproducible, publication-grade results.

---

## 2. Dataset Partitioning & Hygiene Rules

### 2.1 The Cardinal Rule of Disjoint Splits
To prevent data contamination, all splits (Train, Validation/Calibration, Test) must be strictly partitioned at the **subject/source identity level**:
$$\mathcal{S}_{\text{Train}} \cap \mathcal{S}_{\text{Test}} = \emptyset, \quad \mathcal{S}_{\text{Val}} \cap \mathcal{S}_{\text{Test}} = \emptyset$$
where $\mathcal{S}$ represents the set of unique individual subjects or original pristine source video identifiers.

### 2.2 Derivative Association Rule
All synthetic manipulations derived from a source video $V_{\text{src}}$ must reside in the exact same partition as $V_{\text{src}}$. If video `actor_01.mp4` is in the validation split, its deepfake derivatives (`actor_01_faceswap.mp4`, `actor_01_deepface.mp4`) must be confined to the validation split.

### 2.3 Strict Separation of Calibration and Evaluation Sets
- **Training / Calibration Split:** Used exclusively to observe heuristic signal distributions, optimize individual signal weights $w_i$, tune anomaly thresholds, and fit logistic regression (Platt scaling) calibration parameters:
  $$\hat{P}(M | s) = \sigma(A \cdot s + B)$$
- **Held-Out Test Split:** Evaluated strictly once under fixed parameters. **No threshold tuning, weight adjustment, or calibration fitting is ever permitted on the test split.**

---

## 3. Mathematical Metric Definitions

OmniVerify evaluates detection performance across three complementary statistical tiers:

### 3.1 Threshold-Dependent Classification Metrics
Given binary ground truth $y_i \in \{0, 1\}$ (where $0 = \text{Real/Authentic}$, $1 = \text{Manipulated/Deepfake}$) and predicted label $\hat{y}_i = \mathbb{I}(s_i \ge \theta)$ at decision threshold $\theta$ (default $\theta = 0.50$):

1. **Confusion Matrix:**
   $$\text{TP} = \sum_{i} \mathbb{I}(y_i=1 \land \hat{y}_i=1), \quad \text{FP} = \sum_{i} \mathbb{I}(y_i=0 \land \hat{y}_i=1)$$
   $$\text{TN} = \sum_{i} \mathbb{I}(y_i=0 \land \hat{y}_i=0), \quad \text{FN} = \sum_{i} \mathbb{I}(y_i=1 \land \hat{y}_i=0)$$

2. **Accuracy & Balanced Accuracy:**
   $$\text{Accuracy} = \frac{\text{TP} + \text{TN}}{\text{TP} + \text{FP} + \text{TN} + \text{FN}}$$
   $$\text{Balanced Accuracy} = \frac{1}{2} \left( \frac{\text{TP}}{\text{TP} + \text{FN}} + \frac{\text{TN}}{\text{TN} + \text{FP}} \right)$$

3. **Precision, Recall (TPR), and Specificity (TNR):**
   $$\text{Precision} = \frac{\text{TP}}{\text{TP} + \text{FP}}, \quad \text{Recall} = \frac{\text{TP}}{\text{TP} + \text{FN}}, \quad \text{Specificity} = \frac{\text{TN}}{\text{TN} + \text{FP}}$$

4. **F1-Score:**
   $$\text{F1} = 2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$$

### 3.2 Threshold-Independent Ranking Metrics
To assess detector discrimination regardless of chosen threshold:

1. **Receiver Operating Characteristic Area Under Curve (ROC-AUC):**
   Calculated by trapezoidal integration over sorted discrimination thresholds:
   $$\text{ROC-AUC} = \int_{0}^{1} \text{TPR}(\text{FPR}^{-1}(u)) \, du$$
   A random baseline scores $0.50$; a perfect detector scores $1.00$.

2. **Precision-Recall Area Under Curve (PR-AUC):**
   Particularly critical for imbalanced distributions:
   $$\text{PR-AUC} = \int_{0}^{1} \text{Precision}(\text{Recall}) \, d(\text{Recall})$$

### 3.3 Probability Calibration Metrics
1. **Brier Score:**
   Measures mean squared error between continuous predictions $p_i \in [0, 1]$ and binary labels:
   $$\text{Brier} = \frac{1}{N} \sum_{i=1}^{N} (p_i - y_i)^2$$
   Range: $[0.0, 1.0]$. Lower values indicate sharper, more accurate probabilistic estimates.

2. **Expected Calibration Error (ECE):**
   Groups predictions into $M=10$ equal-width bins $B_m \subset [0, 1]$:
   $$\text{ECE} = \sum_{m=1}^{M} \frac{|B_m|}{N} \left| \text{acc}(B_m) - \text{conf}(B_m) \right|$$
   where $\text{acc}(B_m) = \frac{1}{|B_m|} \sum_{i \in B_m} y_i$ and $\text{conf}(B_m) = \frac{1}{|B_m|} \sum_{i \in B_m} p_i$.

### 3.4 Statistical Uncertainty & Confidence Intervals
- **Wilson Score Interval (95% CI):** Computed for Accuracy, Precision, and Recall to account for binomial sample size limitations:
  $$\text{CI}_{95\%} = \frac{p + \frac{z^2}{2n} \pm z \sqrt{\frac{p(1-p)}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}} \quad (z = 1.96)$$
- **Percentile Bootstrap (95% CI):** 500 resamples with replacement to compute non-parametric confidence bands for ROC-AUC.

---

## 4. Multi-Signal Head Ablation Protocol

To fulfill Task 4, the evaluation harness must compute metrics for each signal head independently in addition to the fused score:
1. `object_coherence`
2. `noise_residual`
3. `temporal_flow`
4. `frequency_spectrum`
5. `fusion_score`

If an individual head achieves higher ROC-AUC than the fused score, this indicates destructive interference in the naive fusion formula, requiring re-weighting or head exclusion.

---

## 5. Execution Workflow & Reproduction Commands

### 5.1 Environment Prerequisites
Ensure Python environment with requirements installed:
```powershell
pip install -r backend/requirements.txt
```

### 5.2 Step 1: Generate or Ingest Dataset
To create the reproducible local pilot dataset:
```powershell
python -m backend.app.evaluation.create_pilot_dataset
```
This generates:
- `evaluation_pilot/real/` (3 authentic videos)
- `evaluation_pilot/fake/` (3 synthetic anomaly videos)
- `evaluation_pilot/manifest.csv` (pre-defined disjoint train/val/test splits)

### 5.3 Step 2: Run Pilot Benchmark
```powershell
python -m backend.app.evaluation.evaluator --manifest evaluation_pilot/manifest.csv --split all --name Pilot_Synthetic_Validation --max-frames 8 --output-dir evaluation_results
```

### 5.4 Step 3: Run Official External Benchmark (When Provided)
When an authorized external dataset (e.g. FaceForensics++ c23 test split) is placed locally at `C:\Datasets\FF++_test`:
```powershell
python -m backend.app.evaluation.evaluator --dataset-root "C:\Datasets\FF++_test" --split test --max-frames 16 --output-dir "evaluation_results/ffpp_c23"
```

### 5.5 Generated Output Artifacts
Every evaluation run generates:
1. `evaluation_results/evaluation_summary.json`: Complete machine-readable record including provenance, runtime statistics, primary metrics, confusion matrix, threshold sweep, and ECE reliability bins.
2. `evaluation_results/per_video_predictions.csv`: Tabular record of every evaluated video with SHA-256 hash, duration, elapsed runtime, individual signal scores, fused score, and verdict.
