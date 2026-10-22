"""
OmniVerify Evaluation Framework - Scientific Forensics Metrics & Calibration
"""
import math
import numpy as np
from typing import List, Dict, Any, Tuple, Optional

def compute_confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, int]:
    """
    Computes TP, FP, TN, FN for binary classification (1 = Fake/Manipulated, 0 = Real).
    """
    tp = int(np.sum((y_true == 1) & (y_pred == 1)))
    fp = int(np.sum((y_true == 0) & (y_pred == 1)))
    tn = int(np.sum((y_true == 0) & (y_pred == 0)))
    fn = int(np.sum((y_true == 1) & (y_pred == 0)))
    return {"tp": tp, "fp": fp, "tn": tn, "fn": fn}

def wilson_confidence_interval(count: int, nobs: int, alpha: float = 0.05) -> Tuple[float, float]:
    """
    Computes Wilson score confidence interval for a binomial proportion.
    """
    if nobs == 0:
        return (0.0, 0.0)
    p = count / nobs
    z = 1.959963984540054  # z for 95% confidence
    denominator = 1.0 + (z ** 2) / nobs
    center = (p + (z ** 2) / (2 * nobs)) / denominator
    half_width = (z * math.sqrt((p * (1.0 - p) + (z ** 2) / (4 * nobs)) / nobs)) / denominator
    lower = max(0.0, center - half_width)
    upper = min(1.0, center + half_width)
    return (round(lower, 4), round(upper, 4))

def _trapezoid(y: np.ndarray, x: np.ndarray) -> float:
    """Computes definite integral using the composite trapezoidal rule."""
    dx = np.diff(x)
    return float(np.sum((y[:-1] + y[1:]) * 0.5 * dx))

def compute_roc_auc(y_true: np.ndarray, y_scores: np.ndarray) -> Tuple[float, List[Tuple[float, float, float]]]:
    """
    Computes Area Under the Receiver Operating Characteristic curve via trapezoidal rule.
    Returns:
        roc_auc: float
        curve_points: List of (fpr, tpr, threshold)
    """
    if len(np.unique(y_true)) < 2:
        return 0.5, [(0.0, 0.0, 1.0), (1.0, 1.0, 0.0)]

    # Sort scores descending
    desc_indices = np.argsort(y_scores)[::-1]
    y_true_sorted = y_true[desc_indices]
    y_scores_sorted = y_scores[desc_indices]

    distinct_indices = np.where(np.diff(y_scores_sorted))[0]
    threshold_indices = np.r_[distinct_indices, y_true.size - 1]

    tps = np.cumsum(y_true_sorted == 1)[threshold_indices]
    fps = np.cumsum(y_true_sorted == 0)[threshold_indices]

    total_pos = float(tps[-1])
    total_neg = float(fps[-1])

    if total_pos == 0 or total_neg == 0:
        return 0.5, [(0.0, 0.0, 1.0), (1.0, 1.0, 0.0)]

    tpr = np.r_[0.0, tps / total_pos]
    fpr = np.r_[0.0, fps / total_neg]
    thresholds = np.r_[y_scores_sorted[0] + 1e-4, y_scores_sorted[threshold_indices]]

    # Trapezoid rule
    roc_auc = _trapezoid(tpr, fpr)
    roc_auc = max(0.0, min(1.0, roc_auc))

    points = [(round(float(f), 4), round(float(t), 4), round(float(th), 4)) for f, t, th in zip(fpr, tpr, thresholds)]
    return round(roc_auc, 4), points

def compute_pr_auc(y_true: np.ndarray, y_scores: np.ndarray) -> Tuple[float, List[Tuple[float, float, float]]]:
    """
    Computes Area Under Precision-Recall curve.
    Returns:
        pr_auc: float
        curve_points: List of (recall, precision, threshold)
    """
    if len(np.unique(y_true)) < 2:
        baseline = float(np.mean(y_true)) if len(y_true) > 0 else 0.5
        return round(baseline, 4), [(0.0, round(baseline, 4), 1.0), (1.0, round(baseline, 4), 0.0)]

    desc_indices = np.argsort(y_scores)[::-1]
    y_true_sorted = y_true[desc_indices]
    y_scores_sorted = y_scores[desc_indices]

    distinct_indices = np.where(np.diff(y_scores_sorted))[0]
    threshold_indices = np.r_[distinct_indices, y_true.size - 1]

    tps = np.cumsum(y_true_sorted == 1)[threshold_indices]
    fps = np.cumsum(y_true_sorted == 0)[threshold_indices]

    total_pos = float(tps[-1])
    if total_pos == 0:
        return 0.0, []

    precision = tps / (tps + fps)
    recall = tps / total_pos

    # Monotonic trapezoidal integration for PR curve
    # Prepend recall=0, precision=1
    rec_curve = np.r_[0.0, recall]
    prec_curve = np.r_[1.0, precision]
    thresholds = np.r_[y_scores_sorted[0] + 1e-4, y_scores_sorted[threshold_indices]]

    pr_auc = _trapezoid(prec_curve, rec_curve)
    pr_auc = max(0.0, min(1.0, pr_auc))

    points = [(round(float(r), 4), round(float(p), 4), round(float(th), 4)) for r, p, th in zip(rec_curve, prec_curve, thresholds)]
    return round(pr_auc, 4), points

def compute_brier_score(y_true: np.ndarray, y_probs: np.ndarray) -> float:
    """
    Calculates Brier Score: MSE between predicted probabilities and binary labels [0.0 - 1.0].
    Lower is better (0.0 is perfect calibration and sharpness).
    """
    if len(y_true) == 0:
        return 0.0
    return round(float(np.mean((y_probs - y_true) ** 2)), 4)

def compute_expected_calibration_error(y_true: np.ndarray, y_probs: np.ndarray, n_bins: int = 10) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Computes Expected Calibration Error (ECE) with equal-width confidence bins.
    Returns:
        ece: float
        bins_data: List of bin statistics for reliability diagrams
    """
    if len(y_true) == 0:
        return 0.0, []

    bin_boundaries = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    bins_data = []

    for i in range(n_bins):
        low, high = bin_boundaries[i], bin_boundaries[i+1]
        # Include right boundary in last bin
        if i == n_bins - 1:
            in_bin = (y_probs >= low) & (y_probs <= high)
        else:
            in_bin = (y_probs >= low) & (y_probs < high)

        count = int(np.sum(in_bin))
        if count > 0:
            avg_prob = float(np.mean(y_probs[in_bin]))
            avg_acc = float(np.mean(y_true[in_bin]))
            gap = abs(avg_acc - avg_prob)
            weight = count / len(y_true)
            ece += weight * gap

            bins_data.append({
                "bin_range": [round(float(low), 2), round(float(high), 2)],
                "count": count,
                "confidence": round(avg_prob, 4),
                "accuracy": round(avg_acc, 4),
                "calibration_gap": round(gap, 4)
            })
        else:
            bins_data.append({
                "bin_range": [round(float(low), 2), round(float(high), 2)],
                "count": 0,
                "confidence": round((low + high) / 2.0, 2),
                "accuracy": 0.0,
                "calibration_gap": 0.0
            })

    return round(ece, 4), bins_data

def bootstrap_metric_ci(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    metric_fn,
    n_bootstraps: int = 500,
    seed: int = 42
) -> Tuple[float, float]:
    """
    Calculates 95% confidence interval using non-parametric percentile bootstrap.
    """
    n = len(y_true)
    if n < 4 or len(np.unique(y_true)) < 2:
        return (0.0, 1.0)

    rng = np.random.RandomState(seed)
    bootstrapped_values = []

    for _ in range(n_bootstraps):
        idx = rng.randint(0, n, size=n)
        val = metric_fn(y_true[idx], y_scores[idx])
        if not np.isnan(val):
            bootstrapped_values.append(val)

    if not bootstrapped_values:
        return (0.0, 1.0)

    lower = float(np.percentile(bootstrapped_values, 2.5))
    upper = float(np.percentile(bootstrapped_values, 97.5))
    return (round(lower, 4), round(upper, 4))

def evaluate_classification_predictions(
    y_true: List[int],
    y_scores: List[float],
    threshold: float = 0.50
) -> Dict[str, Any]:
    """
    Produces complete forensic benchmark metrics for binary predictions.
    """
    yt = np.array(y_true, dtype=np.int32)
    ys = np.array(y_scores, dtype=np.float32)
    yp = (ys >= threshold).astype(np.int32)

    cm = compute_confusion_matrix(yt, yp)
    total = len(yt)
    tp, fp, tn, fn = cm["tp"], cm["fp"], cm["tn"], cm["fn"]

    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    balanced_acc = (recall + specificity) / 2.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    acc_ci = wilson_confidence_interval(tp + tn, total)
    prec_ci = wilson_confidence_interval(tp, tp + fp) if (tp + fp) > 0 else (0.0, 0.0)
    rec_ci = wilson_confidence_interval(tp, tp + fn) if (tp + fn) > 0 else (0.0, 0.0)

    roc_auc, roc_curve = compute_roc_auc(yt, ys)
    pr_auc, pr_curve = compute_pr_auc(yt, ys)
    brier = compute_brier_score(yt, ys)
    ece, reliability_bins = compute_expected_calibration_error(yt, ys)

    def auc_metric(t, s):
        val, _ = compute_roc_auc(t, s)
        return val

    auc_ci = bootstrap_metric_ci(yt, ys, auc_metric)

    return {
        "threshold": threshold,
        "sample_count": total,
        "class_distribution": {
            "real_count": int(np.sum(yt == 0)),
            "manipulated_count": int(np.sum(yt == 1))
        },
        "confusion_matrix": cm,
        "metrics": {
            "accuracy": round(accuracy, 4),
            "accuracy_95ci": acc_ci,
            "precision": round(precision, 4),
            "precision_95ci": prec_ci,
            "recall": round(recall, 4),
            "recall_95ci": rec_ci,
            "specificity": round(specificity, 4),
            "balanced_accuracy": round(balanced_acc, 4),
            "f1_score": round(f1, 4),
            "roc_auc": roc_auc,
            "roc_auc_95ci": auc_ci,
            "pr_auc": pr_auc,
            "brier_score": brier,
            "expected_calibration_error": ece
        },
        "roc_curve": roc_curve,
        "pr_curve": pr_curve,
        "reliability_bins": reliability_bins
    }
