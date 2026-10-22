"""
OmniVerify Evaluation Package
"""
from .dataset_loader import DeepfakeDataset, DatasetSample, SplitLeakageError
from .metrics import (
    compute_confusion_matrix,
    compute_roc_auc,
    compute_pr_auc,
    compute_brier_score,
    compute_expected_calibration_error,
    evaluate_classification_predictions
)
from .evaluator import BenchmarkEvaluator

__all__ = [
    "DeepfakeDataset",
    "DatasetSample",
    "SplitLeakageError",
    "compute_confusion_matrix",
    "compute_roc_auc",
    "compute_pr_auc",
    "compute_brier_score",
    "compute_expected_calibration_error",
    "evaluate_classification_predictions",
    "BenchmarkEvaluator"
]
