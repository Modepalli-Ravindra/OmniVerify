import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Film,
  AlertCircle,
  CheckCircle,
  Loader2,
  Play,
  ShieldCheck,
  Activity,
  Cpu,
  Layers,
  Flame,
  Zap,
  Radio,
  FileVideo,
  Database,
  Lock,
  ArrowRight,
  Eye,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { authService } from '../services/auth';

interface VideoUploaderProps {
  onAnalysisStart: () => void;
  onAnalysisComplete: (result: any) => void;
  onError: (msg: string) => void;
  isAnalyzing: boolean;
  analysisProgress: string;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onAnalysisStart,
  onAnalysisComplete,
  onError,
  isAnalyzing,
  analysisProgress,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validExtensions = ['.mp4', '.avi', '.mov', '.webm', '.mkv'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(ext)) {
      onError(`Invalid format '${ext}'. Allowed formats: MP4, MOV, WebM, AVI, MKV.`);
      return;
    }

    if (file.size === 0) {
      onError('Selected video file is empty (0 bytes).');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      onError('File exceeds maximum limit of 100MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const executeAnalysis = async (fileToAnalyze: File) => {
    try {
      const localBlobUrl = URL.createObjectURL(fileToAnalyze);
      onAnalysisStart();
      const formData = new FormData();
      formData.append('file', fileToAnalyze);

      // Step 1: Upload (with auth credentials attached)
      const uploadRes = await authService.authenticatedFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        let errDetail = 'Video upload failed.';
        try {
          const errData = await uploadRes.json();
          errDetail = errData.detail || errDetail;
        } catch (_) {}
        throw new Error(errDetail);
      }

      const uploadData = await uploadRes.json();

      // Step 2: Trigger Deep Forensic Analysis
      const analyzeRes = await authService.authenticatedFetch(
        `/api/analyze/${encodeURIComponent(uploadData.filename)}`,
        { method: 'POST' }
      );

      if (!analyzeRes.ok) {
        let errDetail = 'Forensic analysis failed.';
        try {
          const errData = await analyzeRes.json();
          errDetail = errData.detail || errDetail;
        } catch (_) {}
        throw new Error(errDetail);
      }

      const analysisResult = await analyzeRes.json();
      analysisResult.video_blob_url = localBlobUrl;
      onAnalysisComplete(analysisResult);
    } catch (err: any) {
      onError(err.message || 'An error occurred during video analysis.');
    }
  };

  const handleDemoVideo = async (demoFilename: string) => {
    try {
      setLoadingDemo(demoFilename);
      onAnalysisStart();
      const analyzeRes = await authService.authenticatedFetch(
        `/api/analyze/${encodeURIComponent(demoFilename)}`,
        { method: 'POST' }
      );
      if (analyzeRes.ok) {
        const result = await analyzeRes.json();
        onAnalysisComplete(result);
      } else {
        const err = await analyzeRes.json();
        onError(err.detail || 'Demo clip execution failed. Please upload a local video.');
      }
    } catch (e: any) {
      onError(e.message || 'Benchmark video execution failed.');
    } finally {
      setLoadingDemo(null);
    }
  };

  const benchmarkSamples = [
    {
      filename: 'actor01_real.mp4',
      title: 'Pristine Camera Footage',
      badge: 'Authentic Baseline',
      badgeColor: 'var(--verdict-real-text)',
      badgeBg: 'var(--verdict-real-bg)',
      badgeBorder: 'var(--verdict-real-border)',
      desc: 'Genuine CMOS sensor noise residuals with natural optical flow acceleration.',
    },
    {
      filename: 'actor04_fake_spectral.mp4',
      title: 'AI Frequency Grid Harmonics',
      badge: 'Spectral Tampering',
      badgeColor: '#FF5E1E',
      badgeBg: 'rgba(255, 69, 0, 0.15)',
      badgeBorder: 'rgba(255, 69, 0, 0.4)',
      desc: 'Transposed convolution periodic checkerboard patterns from generative AI models.',
    },
    {
      filename: 'actor05_fake_noisesuppress.mp4',
      title: 'Localized Noise Suppression',
      badge: 'Sensor Blur / Swap',
      badgeColor: '#FBBF24',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeBorder: 'rgba(245, 158, 11, 0.4)',
      desc: 'Selective spatial variance collapse and boundary smoothing in facial regions.',
    },
    {
      filename: 'actor06_fake_temporaljitter.mp4',
      title: 'Temporal Motion Tearing',
      badge: 'Optical Flow Warp',
      badgeColor: '#F87171',
      badgeBg: 'rgba(239, 68, 68, 0.15)',
      badgeBorder: 'rgba(239, 68, 68, 0.4)',
      desc: 'Unnatural inter-frame velocity tears and phase discontinuities.',
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
      {/* 1. Header Banner & System Telemetry */}
      <div className="bento-card" style={{ padding: '14px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(255, 69, 0, 0.15)',
                border: '1px solid rgba(255, 69, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Film size={20} color="var(--color-primary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.2px' }}>
                Digital Video Ingestion & Forensic Pipeline
              </h2>
              <span style={{ fontSize: '11.5px', color: 'var(--color-muted-teal)' }}>
                Multi-dimensional forensic verification • Supports MP4, WebM, MOV, AVI (Max 100MB)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#34D399',
                fontSize: '11.5px',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#34D399',
                  boxShadow: '0 0 8px #34D399',
                  display: 'inline-block',
                }}
              />
              <span>Forensic Core Ready</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'var(--color-secondary-bg)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                fontSize: '11.5px',
              }}
            >
              <Lock size={12} color="var(--color-primary)" />
              <span>SHA-256 Signed</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Center Ingestion & Benchmark Library Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '12px', flex: 1, minHeight: 0 }}>
        {/* Left Column: Interactive Dropzone */}
        <div
          className="bento-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Radar Background Grid Watermark */}
          <div
            style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              border: '1px dashed rgba(255, 69, 0, 0.12)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                border: '1px dashed rgba(255, 69, 0, 0.08)',
              }}
            />
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              flex: 1,
              border: `2px dashed ${dragActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: '12px',
              padding: '28px 24px',
              textAlign: 'center',
              backgroundColor: dragActive ? 'rgba(255, 69, 0, 0.08)' : 'var(--color-secondary-bg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              boxShadow: dragActive ? '0 0 24px rgba(255, 69, 0, 0.25)' : 'none',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.webm,.avi,.mkv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {!selectedFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', maxWidth: '440px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 69, 0, 0.12)',
                    border: '1px solid rgba(255, 69, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 20px rgba(255, 69, 0, 0.2)',
                  }}
                >
                  <UploadCloud size={30} color="var(--color-primary)" />
                </div>

                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                    Drag and drop suspect video footage, or <span style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>browse</span>
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: 1.45, margin: 0 }}>
                    Our pipeline extracts bounded frame tensors, evaluates microscopic CMOS sensor noise, computes 2D FFT spectral decay, and maps optical flow physics.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', background: 'var(--color-elevated)', color: 'var(--color-palette-peach)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                    ⚡ 2-Pass Bounded Sampling
                  </span>
                  <span style={{ fontSize: '11px', background: 'var(--color-elevated)', color: 'var(--color-palette-peach)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                    🔍 Auto H.264 Transcoding
                  </span>
                  <span style={{ fontSize: '11px', background: 'var(--color-elevated)', color: 'var(--color-palette-peach)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                    🔒 SHA-256 Verified
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '420px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileVideo size={28} color="#34D399" />
                </div>

                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted-teal)', marginTop: '2px' }}>
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready for Forensic Pipeline
                  </div>
                </div>

                <div
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--verdict-real-bg)',
                    border: '1px solid var(--verdict-real-border)',
                    color: 'var(--verdict-real-text)',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle size={14} />
                  <span>Validated Container & Format</span>
                </div>

                <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', textDecoration: 'underline' }}>
                  Click to select a different video
                </span>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', gap: '12px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isAnalyzing}
              style={{ fontSize: '12.5px', padding: '8px 16px' }}
            >
              <UploadCloud size={15} />
              <span>Browse Local Files</span>
            </button>

            <button
              type="button"
              className="btn-primary"
              disabled={!selectedFile || isAnalyzing}
              onClick={(e) => {
                e.stopPropagation();
                if (selectedFile) executeAnalysis(selectedFile);
              }}
              style={{
                fontSize: '13px',
                padding: '9px 20px',
                boxShadow: selectedFile ? '0 0 16px rgba(255, 69, 0, 0.45)' : 'none',
              }}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{analysisProgress || 'Executing Multi-Signal Forensics...'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Run Multi-Signal Forensic Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Verified Benchmark Control Library */}
        <div
          className="bento-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px 18px',
          }}
        >
          <div className="card-header" style={{ marginBottom: '10px', paddingBottom: '8px' }}>
            <h3 className="card-title">
              <Database size={17} color="var(--color-primary)" />
              Verified Forensic Benchmark Controls
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--color-muted-teal)' }}>
              1-Click Instant Run
            </span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
            Instantly run OmniVerify against calibrated benchmark controls to test camera grain, frequency harmonics, and motion integrity:
          </p>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
            {benchmarkSamples.map((sample, idx) => {
              const isLoadingThis = loadingDemo === sample.filename && isAnalyzing;

              return (
                <div
                  key={idx}
                  onClick={() => !isAnalyzing && handleDemoVideo(sample.filename)}
                  style={{
                    flex: 1,
                    background: 'var(--color-secondary-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isAnalyzing) {
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Play size={13} color="var(--color-primary)" fill="var(--color-primary)" />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {sample.title}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: sample.badgeColor,
                        background: sample.badgeBg,
                        border: `1px solid ${sample.badgeBorder}`,
                        padding: '2px 7px',
                        borderRadius: '4px',
                      }}
                    >
                      {sample.badge}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.35 }}>
                      {sample.desc}
                    </span>

                    {isLoadingThis ? (
                      <Loader2 size={14} className="animate-spin" color="var(--color-primary)" />
                    ) : (
                      <ArrowRight size={14} color="var(--color-muted-teal)" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: 4 Active Forensic Signal Engines */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', flexShrink: 0 }}>
        <div className="bento-card" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Flame size={15} color="var(--color-primary)" />
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Sensor Noise (PRNU)
            </span>
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.35 }}>
            Examines camera sensor grain residuals to detect AI smoothing & boundary collapse.
          </span>
        </div>

        <div className="bento-card" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Zap size={15} color="#FBBF24" />
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Frequency Forensics (2D FFT)
            </span>
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.35 }}>
            Identifies generative model transposed convolution checkerboards in radial power decay.
          </span>
        </div>

        <div className="bento-card" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Activity size={15} color="#34D399" />
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Optical Flow & Dynamics
            </span>
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.35 }}>
            Measures inter-frame Gunnar-Farneback velocity fields to uncover unnatural motion tears.
          </span>
        </div>

        <div className="bento-card" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Layers size={15} color="#60A5FA" />
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Full-Scene Intelligence
            </span>
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.35 }}>
            Multi-object bounding box tracking and SSIM across the entire frame—not just isolated faces.
          </span>
        </div>
      </div>
    </div>
  );
};
