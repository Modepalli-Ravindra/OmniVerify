"""
Utility to generate a standardized reproducible synthetic pilot dataset for local validation.
Generates 6 pilot videos:
- 3 Authentic/Pristine baseline videos (smooth motion, natural spatial noise, normal 1/f spectral profile)
- 3 Manipulated videos (frequency grid harmonics, localized spatial noise variance collapse, optical flow motion tears)
"""
import cv2
import numpy as np
from pathlib import Path

def generate_pilot_dataset(output_dir: Path = Path("evaluation_pilot")):
    output_dir = Path(output_dir)
    real_dir = output_dir / "real"
    fake_dir = output_dir / "fake"
    real_dir.mkdir(parents=True, exist_ok=True)
    fake_dir.mkdir(parents=True, exist_ok=True)

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    fps = 15.0
    w, h = 320, 240
    n_frames = 20

    # 1. Real Video 1: Actor 01 moving smoothly across frame with natural camera sensor noise
    v1_path = real_dir / "actor01_real.mp4"
    out1 = cv2.VideoWriter(str(v1_path), fourcc, fps, (w, h))
    for i in range(n_frames):
        frame = np.ones((h, w, 3), dtype=np.uint8) * 120
        gradient = np.linspace(80, 160, h, dtype=np.uint8)[:, None]
        frame[:, :, 0] = gradient
        frame[:, :, 1] = gradient
        frame[:, :, 2] = gradient
        center_x = int(60 + i * 8)
        center_y = 120
        cv2.circle(frame, (center_x, center_y), 35, (180, 160, 140), -1)
        sensor_noise = np.random.normal(0, 5, (h, w, 3)).astype(np.int16)
        frame = np.clip(frame.astype(np.int16) + sensor_noise, 0, 255).astype(np.uint8)
        out1.write(frame)
    out1.release()

    # 2. Real Video 2: Actor 02 with smooth natural motion
    v2_path = real_dir / "actor02_real.mp4"
    out2 = cv2.VideoWriter(str(v2_path), fourcc, fps, (w, h))
    for i in range(n_frames):
        frame = np.ones((h, w, 3), dtype=np.uint8) * 90
        center_x = 160
        center_y = int(70 + np.sin(i * 0.3) * 20)
        cv2.circle(frame, (center_x, center_y), 30, (190, 170, 150), -1)
        sensor_noise = np.random.normal(0, 4, (h, w, 3)).astype(np.int16)
        frame = np.clip(frame.astype(np.int16) + sensor_noise, 0, 255).astype(np.uint8)
        out2.write(frame)
    out2.release()

    # 3. Real Video 3: Actor 03 multi-object stable scene
    v3_path = real_dir / "actor03_real.mp4"
    out3 = cv2.VideoWriter(str(v3_path), fourcc, fps, (w, h))
    for i in range(n_frames):
        frame = np.ones((h, w, 3), dtype=np.uint8) * 110
        cv2.rectangle(frame, (50, 60), (120, 180), (160, 140, 120), -1)
        cv2.circle(frame, (220, 120), 25, (170, 150, 130), -1)
        sensor_noise = np.random.normal(0, 5, (h, w, 3)).astype(np.int16)
        frame = np.clip(frame.astype(np.int16) + sensor_noise, 0, 255).astype(np.uint8)
        out3.write(frame)
    out3.release()

    # 4. Fake Video 1: Actor 04 periodic 2D Fourier checkerboard grid defect
    v4_path = fake_dir / "actor04_fake_spectral.mp4"
    out4 = cv2.VideoWriter(str(v4_path), fourcc, fps, (w, h))
    y_idx, x_idx = np.indices((h, w))
    checker = ((x_idx // 4 + y_idx // 4) % 2) * 45
    for i in range(n_frames):
        frame = np.ones((h, w, 3), dtype=np.uint8) * 100
        center_x = int(70 + i * 6)
        cv2.circle(frame, (center_x, 120), 35, (190, 170, 150), -1)
        frame[:, :, 0] = np.clip(frame[:, :, 0] + checker, 0, 255)
        frame[:, :, 1] = np.clip(frame[:, :, 1] + checker, 0, 255)
        frame[:, :, 2] = np.clip(frame[:, :, 2] + checker, 0, 255)
        out4.write(frame)
    out4.release()

    # 5. Fake Video 2: Actor 05 localized spatial noise suppression / boundary blur
    v5_path = fake_dir / "actor05_fake_noisesuppress.mp4"
    out5 = cv2.VideoWriter(str(v5_path), fourcc, fps, (w, h))
    for i in range(n_frames):
        frame = np.ones((h, w, 3), dtype=np.uint8) * 110
        bg_noise = np.random.normal(0, 18, (h, w, 3)).astype(np.int16)
        frame = np.clip(frame.astype(np.int16) + bg_noise, 0, 255).astype(np.uint8)
        center_x = 160
        center_y = 120
        cv2.circle(frame, (center_x, center_y), 45, (185, 165, 145), -1)
        face_patch = frame[center_y-40:center_y+40, center_x-40:center_x+40]
        blurred_face = cv2.GaussianBlur(face_patch, (15, 15), 5.0)
        frame[center_y-40:center_y+40, center_x-40:center_x+40] = blurred_face
        out5.write(frame)
    out5.release()

    # 6. Fake Video 3: Actor 06 temporal motion tearing & sudden inter-frame phase discontinuity
    v6_path = fake_dir / "actor06_fake_temporaljitter.mp4"
    out6 = cv2.VideoWriter(str(v6_path), fourcc, fps, (w, h))
    for i in range(n_frames):
        frame = np.ones((h, w, 3), dtype=np.uint8) * 115
        center_x = 160 + (35 if (8 <= i <= 12) else int(i * 3))
        center_y = 120 + (25 if (8 <= i <= 12) else 0)
        cv2.circle(frame, (center_x, center_y), 35, (180, 160, 140), -1)
        out6.write(frame)
    out6.release()

    # Also generate standard manifest.csv
    import csv
    manifest_path = output_dir / "manifest.csv"
    with open(manifest_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["video_path", "label", "source_id", "split", "manipulation_type", "compression"])
        writer.writeheader()
        writer.writerow({"video_path": "real/actor01_real.mp4", "label": "0", "source_id": "actor01", "split": "train", "manipulation_type": "pristine", "compression": "c23"})
        writer.writerow({"video_path": "real/actor02_real.mp4", "label": "0", "source_id": "actor02", "split": "val", "manipulation_type": "pristine", "compression": "c23"})
        writer.writerow({"video_path": "real/actor03_real.mp4", "label": "0", "source_id": "actor03", "split": "test", "manipulation_type": "pristine", "compression": "c23"})
        writer.writerow({"video_path": "fake/actor04_fake_spectral.mp4", "label": "1", "source_id": "actor04", "split": "train", "manipulation_type": "frequency_grid", "compression": "c23"})
        writer.writerow({"video_path": "fake/actor05_fake_noisesuppress.mp4", "label": "1", "source_id": "actor05", "split": "val", "manipulation_type": "noise_inconsistency", "compression": "c23"})
        writer.writerow({"video_path": "fake/actor06_fake_temporaljitter.mp4", "label": "1", "source_id": "actor06", "split": "test", "manipulation_type": "temporal_jitter", "compression": "c23"})

    print(f"Generated 6 synthetic pilot validation videos and manifest in {output_dir}")

if __name__ == "__main__":
    generate_pilot_dataset()
