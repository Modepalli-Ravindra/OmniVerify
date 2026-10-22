"""
OmniVerify Evaluation Framework - Standalone Benchmark & Evaluation Runner
"""
import os
import sys
import time
import json
import csv
import argparse
import platform
import subprocess
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

import numpy as np
import cv2

from .dataset_loader import DeepfakeDataset, DatasetSample, SplitLeakageError
from .metrics import (
    evaluate_classification_predictions,
    compute_roc_auc,
    compute_pr_auc
)
from ..services.video_processor import VideoProcessor
from ..models.object_detector import scene_detector
from ..models.visual_manipulation import visual_detector
from ..models.temporal_analyzer import temporal_analyzer
from ..models.frequency_forensics import frequency_forensics
from ..models.evidence_fusion import evidence_fusion
from ..core.config import settings

def get_git_commit() -> str:
    try:
        res = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, timeout=5)
        if res.returncode == 0:
            return res.stdout.strip()
    except Exception:
        pass
    return "unknown"

class BenchmarkEvaluator:
    def __init__(
        self,
        max_frames_per_video: int = 16,
        seed: int = 42,
        output_dir: Path = Path("evaluation_results")
    ):
        self.max_frames = max_frames_per_video
        self.seed = seed
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def evaluate_video(self, sample: DatasetSample) -> Dict[str, Any]:
        """
        Runs OmniVerify multi-dimensional forensic pipeline on a single video file.
        Returns per-video prediction dictionary.
        """
        start_time = time.perf_counter()
        vpath = sample.video_path

        if not vpath.exists():
            return {
                "video_path": str(vpath),
                "filename": vpath.name,
                "label": sample.label,
                "source_id": sample.source_id,
                "split": sample.split,
                "manipulation_type": sample.manipulation_type,
                "status": "error",
                "error": "File not found",
                "elapsed_ms": 0.0
            }

        try:
            # 1. Bounded extraction
            metadata, extracted_frames = VideoProcessor.sample_frames_bounded(vpath, max_frames=self.max_frames)
            if not extracted_frames:
                raise ValueError("No frames could be extracted from video stream.")

            raw_frames_bgr = [f.image_bgr for f in extracted_frames]
            frame_detections = []
            noise_scores = []
            freq_scores = []

            # 2. Spatial extraction
            for frame in extracted_frames:
                dets = scene_detector.detect_in_frame(frame.image_bgr)
                frame_detections.append(dets)

                n_s, _ = visual_detector.compute_frame_noise_score(frame.image_bgr)
                noise_scores.append(n_s)

                f_s, _ = frequency_forensics.analyze_frequency_spectrum(frame.image_bgr)
                freq_scores.append(f_s)

            # 3. Temporal dynamics
            temporal_scores = temporal_analyzer.analyze_sequence(raw_frames_bgr)
            scene_coherence_anomaly = scene_detector.analyze_temporal_scene_coherence(frame_detections)

            # 4. Aggregation
            avg_noise = float(np.mean(noise_scores)) if noise_scores else 0.5
            avg_freq = float(np.mean(freq_scores)) if freq_scores else 0.5
            avg_temp = float(np.mean(temporal_scores)) if temporal_scores else 0.5

            # 5. Score fusion
            verdict, confidence, raw_fusion_score, breakdowns = evidence_fusion.fuse_signals(
                object_score=scene_coherence_anomaly,
                noise_score=avg_noise,
                temporal_score=avg_temp,
                frequency_score=avg_freq
            )

            elapsed_ms = (time.perf_counter() - start_time) * 1000.0

            return {
                "video_path": str(vpath),
                "filename": vpath.name,
                "sha256": metadata.sha256,
                "label": sample.label,
                "source_id": sample.source_id,
                "split": sample.split,
                "manipulation_type": sample.manipulation_type,
                "status": "success",
                "elapsed_ms": round(elapsed_ms, 2),
                "sampled_frames": len(extracted_frames),
                "total_frames": metadata.total_frames,
                "fps": metadata.fps,
                "duration_sec": metadata.duration,
                "scores": {
                    "object_coherence": scene_coherence_anomaly,
                    "noise_residual": round(avg_noise, 4),
                    "temporal_flow": round(avg_temp, 4),
                    "frequency_spectrum": round(avg_freq, 4),
                    "fusion_score": round(raw_fusion_score, 4),
                    "calibrated_confidence": round(confidence, 4)
                },
                "verdict": verdict,
                "predicted_label": 1 if verdict == "MANIPULATED" else 0
            }

        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return {
                "video_path": str(vpath),
                "filename": vpath.name,
                "label": sample.label,
                "source_id": sample.source_id,
                "split": sample.split,
                "manipulation_type": sample.manipulation_type,
                "status": "error",
                "error": str(e),
                "elapsed_ms": round(elapsed_ms, 2)
            }

    def run_benchmark(
        self,
        samples: List[DatasetSample],
        benchmark_name: str = "OmniVerify_Evaluation"
    ) -> Dict[str, Any]:
        """
        Executes benchmark across all provided samples, records predictions,
        and computes comprehensive performance and signal head metrics.
        """
        print(f"\n=======================================================")
        print(f" OmniVerify Research-Grade Evaluation: {benchmark_name}")
        print(f" Sample Count: {len(samples)} | Max Frames/Video: {self.max_frames}")
        print(f" Timestamp: {datetime.now(timezone.utc).isoformat()}")
        print(f"=======================================================\n")

        results: List[Dict[str, Any]] = []
        valid_predictions: List[Dict[str, Any]] = []

        total_samples = len(samples)
        for i, sample in enumerate(samples, 1):
            lbl_str = "FAKE" if sample.label == 1 else "REAL"
            print(f"[{i}/{total_samples}] Evaluating {sample.video_path.name} ({lbl_str}) ... ", end="", flush=True)
            res = self.evaluate_video(sample)
            results.append(res)

            if res["status"] == "success":
                valid_predictions.append(res)
                print(f"Done in {res['elapsed_ms']:.1f}ms -> Verdict: {res['verdict']} (Score: {res['scores']['fusion_score']:.3f})")
            else:
                print(f"FAILED: {res.get('error', 'unknown error')}")

        if not valid_predictions:
            raise RuntimeError("Evaluation completed with zero successful predictions.")

        # Extract arrays for metric calculation
        y_true = [p["label"] for p in valid_predictions]
        y_fusion_scores = [p["scores"]["fusion_score"] for p in valid_predictions]
        
        # Primary evaluation on fused score
        primary_eval = evaluate_classification_predictions(y_true, y_fusion_scores, threshold=0.50)

        # Signal head breakdown analysis (Task 4: Investigate each individual head's predictive value)
        signal_heads = ["object_coherence", "noise_residual", "temporal_flow", "frequency_spectrum", "fusion_score"]
        signal_head_evaluations: Dict[str, Dict[str, float]] = {}

        for sig in signal_heads:
            sig_scores = [p["scores"][sig] for p in valid_predictions]
            roc_auc, _ = compute_roc_auc(np.array(y_true), np.array(sig_scores))
            pr_auc, _ = compute_pr_auc(np.array(y_true), np.array(sig_scores))
            # Optimal threshold accuracy
            preds = (np.array(sig_scores) >= 0.50).astype(int)
            acc = float(np.mean(preds == np.array(y_true)))
            signal_head_evaluations[sig] = {
                "roc_auc": roc_auc,
                "pr_auc": pr_auc,
                "accuracy_at_0.50": round(acc, 4)
            }

        # Multi-threshold sweep on fusion score
        threshold_sweep: List[Dict[str, Any]] = []
        for th in [0.30, 0.40, 0.50, 0.60, 0.70]:
            sweep_res = evaluate_classification_predictions(y_true, y_fusion_scores, threshold=th)
            threshold_sweep.append({
                "threshold": th,
                "accuracy": sweep_res["metrics"]["accuracy"],
                "precision": sweep_res["metrics"]["precision"],
                "recall": sweep_res["metrics"]["recall"],
                "f1_score": sweep_res["metrics"]["f1_score"]
            })

        # Three-tier verdict evaluation
        verdicts = [p["verdict"] for p in valid_predictions]
        verdict_counts = {
            "REAL": verdicts.count("REAL"),
            "UNCERTAIN": verdicts.count("UNCERTAIN"),
            "MANIPULATED": verdicts.count("MANIPULATED")
        }

        # Provenance and environment snapshot
        provenance = {
            "evaluation_timestamp": datetime.now(timezone.utc).isoformat(),
            "git_commit": get_git_commit(),
            "python_version": sys.version,
            "opencv_version": cv2.__version__,
            "platform": platform.platform(),
            "processor": platform.processor(),
            "random_seed": self.seed,
            "max_frames_per_video": self.max_frames
        }

        runtimes = [p["elapsed_ms"] for p in valid_predictions]
        runtime_stats = {
            "mean_ms_per_video": round(float(np.mean(runtimes)), 2),
            "median_ms_per_video": round(float(np.median(runtimes)), 2),
            "min_ms": round(float(np.min(runtimes)), 2),
            "max_ms": round(float(np.max(runtimes)), 2),
            "total_eval_time_sec": round(sum(runtimes) / 1000.0, 2)
        }

        benchmark_report = {
            "benchmark_name": benchmark_name,
            "provenance": provenance,
            "runtime_stats": runtime_stats,
            "summary": {
                "total_samples": total_samples,
                "successful_evaluations": len(valid_predictions),
                "failed_evaluations": total_samples - len(valid_predictions),
                "verdict_distribution": verdict_counts
            },
            "primary_metrics": primary_eval["metrics"],
            "confusion_matrix": primary_eval["confusion_matrix"],
            "threshold_sweep": threshold_sweep,
            "signal_head_comparison": signal_head_evaluations,
            "reliability_calibration": primary_eval["reliability_bins"],
            "detailed_results": results
        }

        # Save to disk
        self._save_outputs(benchmark_report, results)

        # Print console summary
        self._print_summary(benchmark_report)

        return benchmark_report

    def _save_outputs(self, report: Dict[str, Any], results: List[Dict[str, Any]]) -> None:
        # JSON summary
        json_path = self.output_dir / "evaluation_summary.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

        # CSV per-video predictions
        csv_path = self.output_dir / "per_video_predictions.csv"
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            fieldnames = [
                "filename", "sha256", "label", "source_id", "split", "manipulation_type",
                "status", "elapsed_ms", "object_coherence", "noise_residual",
                "temporal_flow", "frequency_spectrum", "fusion_score", "calibrated_confidence",
                "verdict", "predicted_label", "error"
            ]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in results:
                row = {
                    "filename": r.get("filename", ""),
                    "sha256": r.get("sha256", ""),
                    "label": r.get("label", ""),
                    "source_id": r.get("source_id", ""),
                    "split": r.get("split", ""),
                    "manipulation_type": r.get("manipulation_type", ""),
                    "status": r.get("status", ""),
                    "elapsed_ms": r.get("elapsed_ms", 0.0),
                    "object_coherence": r.get("scores", {}).get("object_coherence", ""),
                    "noise_residual": r.get("scores", {}).get("noise_residual", ""),
                    "temporal_flow": r.get("scores", {}).get("temporal_flow", ""),
                    "frequency_spectrum": r.get("scores", {}).get("frequency_spectrum", ""),
                    "fusion_score": r.get("scores", {}).get("fusion_score", ""),
                    "calibrated_confidence": r.get("scores", {}).get("calibrated_confidence", ""),
                    "verdict": r.get("verdict", ""),
                    "predicted_label": r.get("predicted_label", ""),
                    "error": r.get("error", "")
                }
                writer.writerow(row)

        print(f"\n[Artifact] Saved machine-readable summary: {json_path}")
        print(f"[Artifact] Saved tabular predictions: {csv_path}")

    def _print_summary(self, report: Dict[str, Any]) -> None:
        m = report["primary_metrics"]
        cm = report["confusion_matrix"]
        print("\n================ BENCHMARK PERFORMANCE SUMMARY ================")
        print(f"Accuracy:          {m['accuracy']*100:.2f}% (95% CI: [{m['accuracy_95ci'][0]*100:.1f}%, {m['accuracy_95ci'][1]*100:.1f}%])")
        print(f"Balanced Accuracy: {m['balanced_accuracy']*100:.2f}%")
        print(f"Precision:         {m['precision']*100:.2f}%")
        print(f"Recall (TPR):      {m['recall']*100:.2f}%")
        print(f"Specificity (TNR): {m['specificity']*100:.2f}%")
        print(f"F1-Score:          {m['f1_score']:.4f}")
        print(f"ROC-AUC:           {m['roc_auc']:.4f} (95% CI: [{m['roc_auc_95ci'][0]:.4f}, {m['roc_auc_95ci'][1]:.4f}])")
        print(f"PR-AUC:            {m['pr_auc']:.4f}")
        print(f"Brier Score:       {m['brier_score']:.4f} (lower is better)")
        print(f"Calibration (ECE): {m['expected_calibration_error']:.4f}")
        print(f"Confusion Matrix:  TP={cm['tp']} | FP={cm['fp']} | TN={cm['tn']} | FN={cm['fn']}")
        print("---------------------------------------------------------------")
        print("Signal Head Predictive Comparison:")
        for sig, stats in report["signal_head_comparison"].items():
            print(f" - {sig:<22}: ROC-AUC={stats['roc_auc']:.4f} | PR-AUC={stats['pr_auc']:.4f} | Acc@0.50={stats['accuracy_at_0.50']*100:.1f}%")
        print("===============================================================\n")

def main():
    parser = argparse.ArgumentParser(description="OmniVerify Standalone Deepfake Detection Evaluation Harness")
    parser.add_argument("--dataset-root", type=str, help="Root directory containing dataset videos")
    parser.add_argument("--manifest", type=str, help="Path to manifest CSV or JSON")
    parser.add_argument("--split", type=str, default="test", help="Dataset split to evaluate ('train', 'val', 'test', 'all')")
    parser.add_argument("--pilot", action="store_true", help="Run in small pilot subset mode")
    parser.add_argument("--pilot-size", type=int, default=10, help="Number of videos in pilot mode")
    parser.add_argument("--max-frames", type=int, default=16, help="Maximum sampled frames per video")
    parser.add_argument("--output-dir", type=str, default="evaluation_results", help="Directory to save evaluation artifacts")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for sampling reproducibility")
    parser.add_argument("--name", type=str, default="OmniVerify_Benchmark", help="Name identifier for the benchmark run")

    args = parser.parse_args()

    if not args.dataset_root and not args.manifest:
        parser.error("Must supply either --dataset-root or --manifest.")

    # Load dataset
    if args.manifest:
        dataset = DeepfakeDataset.from_manifest(Path(args.manifest))
    else:
        dataset = DeepfakeDataset.from_directory(Path(args.dataset_root), seed=args.seed)

    print(f"Loaded dataset: {dataset.summary()}")

    # Select samples
    if args.pilot:
        samples = dataset.get_pilot_subset(max_samples=args.pilot_size, seed=args.seed)
        benchmark_name = f"{args.name}_Pilot_{len(samples)}samples"
    elif args.split == "all":
        samples = dataset.samples
        benchmark_name = f"{args.name}_All_{len(samples)}samples"
    else:
        samples = dataset.get_split(args.split)
        benchmark_name = f"{args.name}_{args.split.capitalize()}_{len(samples)}samples"

    if not samples:
        print(f"Error: No samples found for split '{args.split}'")
        sys.exit(1)

    evaluator = BenchmarkEvaluator(
        max_frames_per_video=args.max_frames,
        seed=args.seed,
        output_dir=Path(args.output_dir)
    )

    evaluator.run_benchmark(samples, benchmark_name=benchmark_name)

if __name__ == "__main__":
    main()
