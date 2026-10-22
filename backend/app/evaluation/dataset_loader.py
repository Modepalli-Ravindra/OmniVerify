"""
OmniVerify Evaluation Framework - Dataset Loader & Split Hygiene
"""
import os
import csv
import json
import random
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Set

@dataclass
class DatasetSample:
    video_path: Path
    label: int  # 0 = Real / Authentic, 1 = Fake / Manipulated
    source_id: str  # Identity / Base source video ID to prevent split leakage
    split: str  # 'train' | 'val' | 'test'
    manipulation_type: str = "unknown"  # 'pristine', 'deepfakes', 'face2face', 'faceswap', 'neuraltextures', etc.
    compression: str = "unknown"  # 'raw', 'c23', 'c40', etc.

    @property
    def is_manipulated(self) -> bool:
        return self.label == 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "video_path": str(self.video_path),
            "label": self.label,
            "source_id": self.source_id,
            "split": self.split,
            "manipulation_type": self.manipulation_type,
            "compression": self.compression
        }

class SplitLeakageError(ValueError):
    """Raised when source identities or derivatives leak across train/val/test splits."""
    pass

class DeepfakeDataset:
    def __init__(self, samples: List[DatasetSample]):
        self.samples = samples

    def __len__(self) -> int:
        return len(self.samples)

    @classmethod
    def from_manifest(cls, manifest_path: Path) -> "DeepfakeDataset":
        """
        Loads dataset from a CSV or JSON manifest file.
        CSV format requires columns: video_path, label
        Optional columns: source_id, split, manipulation_type, compression
        """
        manifest_path = Path(manifest_path)
        if not manifest_path.exists():
            raise FileNotFoundError(f"Manifest not found: {manifest_path}")

        samples: List[DatasetSample] = []
        base_dir = manifest_path.parent

        if manifest_path.suffix.lower() == ".json":
            with open(manifest_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    vp = Path(item["video_path"])
                    if not vp.is_absolute():
                        vp = (base_dir / vp).resolve()
                    samples.append(DatasetSample(
                        video_path=vp,
                        label=int(item["label"]),
                        source_id=str(item.get("source_id", vp.stem)),
                        split=item.get("split", "test"),
                        manipulation_type=item.get("manipulation_type", "unknown"),
                        compression=item.get("compression", "unknown")
                    ))
        else: # CSV
            with open(manifest_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    vp = Path(row["video_path"])
                    if not vp.is_absolute():
                        vp = (base_dir / vp).resolve()
                    raw_label = row["label"].strip().lower()
                    label_val = 1 if raw_label in ("1", "fake", "manipulated", "deepfake") else 0
                    samples.append(DatasetSample(
                        video_path=vp,
                        label=label_val,
                        source_id=row.get("source_id", vp.stem).strip(),
                        split=row.get("split", "test").strip().lower(),
                        manipulation_type=row.get("manipulation_type", "unknown").strip(),
                        compression=row.get("compression", "unknown").strip()
                    ))

        dataset = cls(samples)
        dataset.verify_split_leakage()
        return dataset

    @classmethod
    def from_directory(
        cls,
        root_dir: Path,
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15,
        seed: int = 42
    ) -> "DeepfakeDataset":
        """
        Discovers videos from a directory hierarchy.
        Supports:
        1. Subfolders 'real'/'authentic' (label 0) and 'fake'/'manipulated' (label 1)
        2. Grouping by source ID (e.g. '042.mp4' -> source_id '042', '042_123.mp4' -> source_id '042')
           to strictly prevent data leakage across splits.
        """
        root_dir = Path(root_dir)
        if not root_dir.exists():
            raise FileNotFoundError(f"Dataset root directory not found: {root_dir}")

        video_extensions = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
        found_videos: List[Tuple[Path, int, str, str]] = [] # (path, label, source_id, manip_type)

        # Pattern 1: real / fake subdirectories
        for path in root_dir.rglob("*"):
            if path.suffix.lower() in video_extensions and path.is_file():
                rel_parts = [p.lower() for p in path.relative_to(root_dir).parts]
                
                # Determine label
                if any(p in ("real", "authentic", "original", "pristine") for p in rel_parts):
                    label = 0
                    manip_type = "pristine"
                elif any(p in ("fake", "manipulated", "deepfake", "deepfakes", "faceswap", "face2face", "neuraltextures") for p in rel_parts):
                    label = 1
                    manip_type = next((p for p in rel_parts if p in ("deepfakes", "faceswap", "face2face", "neuraltextures")), "manipulated")
                else:
                    # Default: filename convention
                    stem_lower = path.stem.lower()
                    if "fake" in stem_lower or "manipulated" in stem_lower or "synthetic" in stem_lower:
                        label = 1
                        manip_type = "manipulated"
                    else:
                        label = 0
                        manip_type = "pristine"

                # Extract source identifier (e.g., '042_123' -> source '042')
                stem = path.stem
                source_id = stem.split("_")[0] if "_" in stem else stem
                found_videos.append((path, label, source_id, manip_type))

        if not found_videos:
            raise ValueError(f"No valid video files found in {root_dir}")

        # Subject-level grouping for strictly leak-free train/val/test splits
        source_groups: Dict[str, List[Tuple[Path, int, str, str]]] = {}
        for item in found_videos:
            sid = item[2]
            source_groups.setdefault(sid, []).append(item)

        unique_sources = sorted(list(source_groups.keys()))
        rng = random.Random(seed)
        rng.shuffle(unique_sources)

        n_total = len(unique_sources)
        n_train = max(1, int(round(n_total * train_ratio))) if n_total >= 3 else n_total
        n_val = max(1, int(round(n_total * val_ratio))) if (n_total - n_train) >= 2 else 0
        
        train_sources = set(unique_sources[:n_train])
        val_sources = set(unique_sources[n_train:n_train + n_val])
        test_sources = set(unique_sources[n_train + n_val:])
        if not test_sources and val_sources:
            # If dataset is small, keep split non-empty
            test_sources = val_sources

        samples: List[DatasetSample] = []
        for sid, v_list in source_groups.items():
            if sid in train_sources:
                split = "train"
            elif sid in val_sources:
                split = "val"
            else:
                split = "test"

            for vp, lbl, src, mtype in v_list:
                samples.append(DatasetSample(
                    video_path=vp,
                    label=lbl,
                    source_id=src,
                    split=split,
                    manipulation_type=mtype
                ))

        dataset = cls(samples)
        dataset.verify_split_leakage()
        return dataset

    def verify_split_leakage(self) -> None:
        """
        Validates that no source identity/actor appears in both train/val and test splits.
        """
        train_sources = {s.source_id for s in self.samples if s.split == "train"}
        val_sources = {s.source_id for s in self.samples if s.split == "val"}
        test_sources = {s.source_id for s in self.samples if s.split == "test"}

        train_test_overlap = train_sources.intersection(test_sources)
        val_test_overlap = val_sources.intersection(test_sources)

        if train_test_overlap:
            raise SplitLeakageError(
                f"Data Leakage Detected: {len(train_test_overlap)} source identities appear in both 'train' and 'test' splits! "
                f"Offending IDs: {sorted(list(train_test_overlap))[:5]}"
            )
        if val_test_overlap and val_sources != test_sources:
            raise SplitLeakageError(
                f"Data Leakage Detected: {len(val_test_overlap)} source identities appear in both 'val' and 'test' splits! "
                f"Offending IDs: {sorted(list(val_test_overlap))[:5]}"
            )

    def get_split(self, split_name: str) -> List[DatasetSample]:
        valid = [s for s in self.samples if s.split == split_name]
        return valid

    def get_pilot_subset(self, max_samples: int = 10, seed: int = 42) -> List[DatasetSample]:
        """
        Returns a balanced pilot subset with representative real and manipulated samples.
        """
        reals = [s for s in self.samples if s.label == 0]
        fakes = [s for s in self.samples if s.label == 1]

        rng = random.Random(seed)
        rng.shuffle(reals)
        rng.shuffle(fakes)

        half = max_samples // 2
        selected_reals = reals[:half]
        selected_fakes = fakes[:max_samples - len(selected_reals)]

        pilot = selected_reals + selected_fakes
        rng.shuffle(pilot)
        return pilot

    def summary(self) -> Dict[str, Any]:
        splits: Dict[str, Dict[str, int]] = {}
        for s in self.samples:
            splits.setdefault(s.split, {"real": 0, "fake": 0, "total": 0})
            if s.label == 1:
                splits[s.split]["fake"] += 1
            else:
                splits[s.split]["real"] += 1
            splits[s.split]["total"] += 1

        return {
            "total_videos": len(self.samples),
            "unique_sources": len({s.source_id for s in self.samples}),
            "splits": splits
        }
