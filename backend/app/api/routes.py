import os
import shutil
import numpy as np
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse

from ..core.config import settings, UPLOAD_DIR, REPORTS_DIR
from ..api.schemas import VideoUploadResponse, VideoAnalysisResult, FrameForensicSignal
from ..services.video_processor import VideoProcessor
from ..models.object_detector import scene_detector
from ..models.visual_manipulation import visual_detector
from ..models.temporal_analyzer import temporal_analyzer
from ..models.frequency_forensics import frequency_forensics
from ..models.evidence_fusion import evidence_fusion
from ..services.explainability import explainability_service
from ..services.report_generator import report_generator

router = APIRouter()

# In-memory recent cache
ANALYSIS_CACHE: Dict[str, VideoAnalysisResult] = {}

@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "title": settings.APP_TITLE,
        "academic_year": settings.ACADEMIC_YEAR,
        "version": settings.VERSION,
        "models": {
            "object_detector": "SSDLite-MobileNetV3 (COCO 80 classes)",
            "visual_manipulation": "Gaussian High-Pass PRNU Sensor Noise Residual",
            "temporal_analyzer": "Gunnar-Farneback Dense Optical Flow & SSIM",
            "frequency_forensics": "2D Fast Fourier Transform Radial Power Decay",
            "evidence_fusion": "Calibrated Bayesian Log-Odds Head with Platt Scaling"
        }
    }

@router.post("/upload", response_model=VideoUploadResponse)
async def upload_video(file: UploadFile = File(...)):
    # Validate extension
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format '{ext}'. Supported formats: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # Save to upload directory
    target_path = UPLOAD_DIR / file.filename
    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")

    # Check file size
    size_mb = os.path.getsize(target_path) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        target_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB (current: {size_mb:.1f}MB)"
        )

    return VideoUploadResponse(
        task_id=Path(file.filename).stem,
        filename=file.filename,
        status="uploaded",
        message="Video ingested and validated successfully. Ready for forensic analysis."
    )

@router.post("/analyze/{video_filename}", response_model=VideoAnalysisResult)
async def analyze_video(video_filename: str):
    video_path = UPLOAD_DIR / video_filename
    if not video_path.exists():
        raise HTTPException(status_code=404, detail=f"Video file '{video_filename}' not found in upload repository.")

    try:
        # Step 1: Ingest and sample frames (bounded CPU sampling)
        metadata, extracted_frames = VideoProcessor.sample_frames_bounded(video_path, max_frames=settings.MAX_ANALYSIS_FRAMES)
        
        if not extracted_frames:
            raise ValueError("No valid visual frames could be extracted from video stream.")

        raw_frames_bgr = [f.image_bgr for f in extracted_frames]
        frame_detections = []
        noise_scores = []
        heatmaps = []
        freq_scores = []
        object_counts: Dict[str, int] = {}

        # Step 2: Per-frame spatial & forensic feature extraction
        for frame in extracted_frames:
            # 2a: Scene & object detection
            dets = scene_detector.detect_in_frame(frame.image_bgr)
            frame_detections.append(dets)
            for d in dets:
                object_counts[d.label] = object_counts.get(d.label, 0) + 1

            # 2b: Noise residual (PRNU) & spatial heatmap
            n_score, heatmap_raw = visual_detector.compute_frame_noise_score(frame.image_bgr)
            noise_scores.append(n_score)
            heatmaps.append(visual_detector.generate_heatmap_overlay_base64(frame.image_bgr, heatmap_raw))

            # 2c: 2D FFT spectral decay
            f_score, _ = frequency_forensics.analyze_frequency_spectrum(frame.image_bgr)
            freq_scores.append(f_score)

        # Step 3: Inter-frame temporal dynamics & optical flow
        temporal_scores = temporal_analyzer.analyze_sequence(raw_frames_bgr)
        scene_coherence_anomaly = scene_detector.analyze_temporal_scene_coherence(frame_detections)

        # Step 4: Construct frame-level forensic objects
        processed_frames: List[FrameForensicSignal] = []
        for i, ef in enumerate(extracted_frames):
            n_s = noise_scores[i]
            f_s = freq_scores[i]
            t_s = temporal_scores[i]
            composite_frame_anomaly = (n_s * 0.35) + (f_s * 0.35) + (t_s * 0.30)
            is_suspicious = composite_frame_anomaly >= 0.45

            processed_frames.append(FrameForensicSignal(
                frame_index=ef.index,
                timestamp_ms=round(ef.timestamp_ms, 1),
                timestamp_formatted=ef.timestamp_formatted,
                thumbnail_data=ef.to_base64_jpeg(quality=70),
                heatmap_data=heatmaps[i],
                noise_residual_score=round(n_s, 3),
                frequency_score=round(f_s, 3),
                motion_inconsistency_score=round(t_s, 3),
                frame_anomaly_score=round(composite_frame_anomaly, 3),
                is_suspicious=is_suspicious,
                detected_objects=frame_detections[i]
            ))

        # Step 5: Sequence aggregation
        avg_noise = float(np.mean(noise_scores))
        avg_freq = float(np.mean(freq_scores))
        avg_temp = float(np.mean(temporal_scores))

        # Step 6: Multi-Signal Calibrated Evidence Fusion
        verdict, confidence, raw_fusion_score, breakdowns = evidence_fusion.fuse_signals(
            object_score=scene_coherence_anomaly,
            noise_score=avg_noise,
            temporal_score=avg_temp,
            frequency_score=avg_freq
        )

        # Step 7: Temporally localized suspicious intervals & explainability
        intervals = explainability_service.identify_suspicious_intervals(processed_frames)
        explanations = explainability_service.generate_traceable_explanations(
            verdict=verdict,
            confidence=confidence,
            intervals=intervals,
            signal_breakdowns=breakdowns,
            object_counts=object_counts
        )
        disclaimer = explainability_service.get_legal_disclaimer()

        result = VideoAnalysisResult(
            video_filename=metadata.filename,
            video_hash_sha256=metadata.sha256,
            duration_seconds=metadata.duration,
            total_frames=metadata.total_frames,
            sampled_frames_count=len(processed_frames),
            fps=metadata.fps,
            resolution=metadata.resolution_str,
            verdict=verdict,
            calibrated_confidence=confidence,
            fusion_anomaly_score=raw_fusion_score,
            signal_breakdowns=breakdowns,
            suspicious_intervals=intervals,
            frames=processed_frames,
            detected_scene_objects_summary=object_counts,
            traceable_explanations=explanations,
            limitations_disclaimer=disclaimer,
            processed_at_iso=datetime.now(timezone.utc).isoformat()
        )

        # Cache result and pre-generate reports
        ANALYSIS_CACHE[video_filename] = result
        report_generator.generate_json_report(result)
        report_generator.generate_html_report(result)

        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Forensic analysis failed: {str(e)}")

@router.get("/reports/{filename}/json")
def download_json_report(filename: str):
    matches = list(REPORTS_DIR.glob(f"OmniVerify_Report_{filename}_*.json"))
    if not matches:
        if filename in ANALYSIS_CACHE:
            path = report_generator.generate_json_report(ANALYSIS_CACHE[filename])
            return FileResponse(path, media_type="application/json", filename=path.name)
        raise HTTPException(status_code=404, detail="JSON report not found for this video.")
    latest = sorted(matches, key=os.path.getmtime)[-1]
    return FileResponse(latest, media_type="application/json", filename=latest.name)

@router.get("/reports/{filename}/html")
def download_html_report(filename: str):
    matches = list(REPORTS_DIR.glob(f"OmniVerify_Dossier_{filename}_*.html"))
    if not matches:
        if filename in ANALYSIS_CACHE:
            path = report_generator.generate_html_report(ANALYSIS_CACHE[filename])
            return FileResponse(path, media_type="text/html", filename=path.name)
        raise HTTPException(status_code=404, detail="HTML forensic dossier not found for this video.")
    latest = sorted(matches, key=os.path.getmtime)[-1]
    return FileResponse(latest, media_type="text/html", filename=latest.name)

@router.get("/history")
def get_analysis_history():
    history = []
    for fn, res in ANALYSIS_CACHE.items():
        history.append({
            "filename": fn,
            "verdict": res.verdict,
            "confidence": res.calibrated_confidence,
            "duration": res.duration_seconds,
            "processed_at": res.processed_at_iso
        })
    return {"history": history}
