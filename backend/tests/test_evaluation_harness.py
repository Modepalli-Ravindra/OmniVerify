"""
Unit Tests for OmniVerify Research Evaluation Harness & Metrics
"""
import pytest
import numpy as np
import cv2
from pathlib import Path
from backend.app.evaluation.dataset_loader import DeepfakeDataset, DatasetSample, SplitLeakageError
from backend.app.evaluation.metrics import (
    compute_confusion_matrix,
    wilson_confidence_interval,
    compute_roc_auc,
    compute_pr_auc,
    compute_brier_score,
    compute_expected_calibration_error,
    evaluate_classification_predictions
)
from backend.app.evaluation.evaluator import BenchmarkEvaluator

def test_split_leakage_detection():
    # Identity 'actor_01' appears in both train and test -> must raise SplitLeakageError
    leaky_samples = [
        DatasetSample(Path("video1.mp4"), label=0, source_id="actor_01", split="train"),
        DatasetSample(Path("video2.mp4"), label=1, source_id="actor_01", split="test"),
        DatasetSample(Path("video3.mp4"), label=1, source_id="actor_02", split="test")
    ]
    with pytest.raises(SplitLeakageError):
        DeepfakeDataset(leaky_samples).verify_split_leakage()

    # Disjoint source IDs -> must pass cleanly
    clean_samples = [
        DatasetSample(Path("video1.mp4"), label=0, source_id="actor_01", split="train"),
        DatasetSample(Path("video2.mp4"), label=0, source_id="actor_02", split="val"),
        DatasetSample(Path("video3.mp4"), label=1, source_id="actor_03", split="test")
    ]
    dataset = DeepfakeDataset(clean_samples)
    dataset.verify_split_leakage()
    assert len(dataset.get_split("test")) == 1
    assert dataset.get_split("test")[0].source_id == "actor_03"

def test_evaluation_metrics_exact():
    # Ground truth: 2 Real (0), 2 Fake (1)
    y_true = [0, 0, 1, 1]
    y_scores = [0.10, 0.35, 0.65, 0.90]

    eval_result = evaluate_classification_predictions(y_true, y_scores, threshold=0.50)
    m = eval_result["metrics"]
    cm = eval_result["confusion_matrix"]

    assert cm["tp"] == 2
    assert cm["tn"] == 2
    assert cm["fp"] == 0
    assert cm["fn"] == 0

    assert m["accuracy"] == 1.0
    assert m["precision"] == 1.0
    assert m["recall"] == 1.0
    assert m["f1_score"] == 1.0
    assert m["roc_auc"] == 1.0
    assert m["pr_auc"] == 1.0
    assert m["brier_score"] < 0.10
    assert m["expected_calibration_error"] >= 0.0

def test_wilson_ci_bounds():
    lower, upper = wilson_confidence_interval(count=80, nobs=100)
    assert 0.0 <= lower <= 0.80
    assert 0.80 <= upper <= 1.0

def test_brier_and_ece():
    y_true = np.array([0, 1, 1, 0])
    # Perfectly confident predictions
    y_probs_perfect = np.array([0.0, 1.0, 1.0, 0.0])
    brier_perfect = compute_brier_score(y_true, y_probs_perfect)
    assert brier_perfect == 0.0

    # Under-confident predictions
    y_probs_uncal = np.array([0.45, 0.55, 0.52, 0.48])
    brier_uncal = compute_brier_score(y_true, y_probs_uncal)
    assert brier_uncal > 0.0

    ece, bins = compute_expected_calibration_error(y_true, y_probs_uncal, n_bins=5)
    assert 0.0 <= ece <= 1.0
    assert len(bins) == 5

def create_synthetic_test_video(path: Path, frames: int = 8, noise_level: float = 0.0):
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(path), fourcc, 10.0, (320, 240))
    for i in range(frames):
        img = np.zeros((240, 320, 3), dtype=np.uint8)
        # Add smooth shapes
        cv2.circle(img, (160 + int(i * 2), 120), 40, (200, 180, 150), -1)
        if noise_level > 0:
            noise = np.random.normal(0, noise_level * 50, img.shape).astype(np.int16)
            img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        out.write(img)
    out.release()

def test_evaluator_benchmark_run(tmp_path):
    # Create miniature test dataset in tmp_path
    dataset_dir = tmp_path / "mini_bench"
    real_dir = dataset_dir / "real"
    fake_dir = dataset_dir / "fake"
    real_dir.mkdir(parents=True)
    fake_dir.mkdir(parents=True)

    v1 = real_dir / "real_01.mp4"
    v2 = real_dir / "real_02.mp4"
    v3 = fake_dir / "fake_03.mp4"
    v4 = fake_dir / "fake_04.mp4"

    create_synthetic_test_video(v1, frames=6, noise_level=0.0)
    create_synthetic_test_video(v2, frames=6, noise_level=0.0)
    create_synthetic_test_video(v3, frames=6, noise_level=0.8)
    create_synthetic_test_video(v4, frames=6, noise_level=1.0)

    # Discover via DeepfakeDataset
    dataset = DeepfakeDataset.from_directory(dataset_dir, train_ratio=0.5, val_ratio=0.0, test_ratio=0.5, seed=42)
    assert len(dataset) == 4

    out_dir = tmp_path / "eval_out"
    evaluator = BenchmarkEvaluator(max_frames_per_video=4, output_dir=out_dir)
    report = evaluator.run_benchmark(dataset.samples, benchmark_name="TestMiniBenchmark")

    # Verify report structure
    assert report["summary"]["total_samples"] == 4
    assert report["summary"]["successful_evaluations"] == 4
    assert "accuracy" in report["primary_metrics"]
    assert "signal_head_comparison" in report
    assert "noise_residual" in report["signal_head_comparison"]
    assert "frequency_spectrum" in report["signal_head_comparison"]

    # Verify artifacts exist on disk
    assert (out_dir / "evaluation_summary.json").exists()
    assert (out_dir / "per_video_predictions.csv").exists()
