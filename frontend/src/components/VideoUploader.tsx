import React, { useState, useRef } from 'react';
import { UploadCloud, Film, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
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
  analysisProgress
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
      onError(`Invalid format '${ext}'. Allowed: MP4, MOV, WebM, AVI, MKV.`);
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

      // Step 2: Trigger Deep Forensic Analysis (persisted to authenticated user in Neon)
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

  const handleDemoVideo = async (demoName: string) => {
    try {
      onAnalysisStart();
      const analyzeRes = await authService.authenticatedFetch(`/api/analyze/api_test_clip.mp4`, {
        method: 'POST',
      });
      if (analyzeRes.ok) {
        const result = await analyzeRes.json();
        onAnalysisComplete(result);
      } else {
        onError('Demo clip not found. Please upload a local video file.');
      }
    } catch (e: any) {
      onError(e.message || 'Demo video execution failed.');
    }
  };

  return (
    <div className="bento-card col-span-12">
      <div className="card-header">
        <h3 className="card-title">
          <Film size={18} color="var(--color-accent-mint)" />
          Digital Video Ingestion & Forensic Pipeline
        </h3>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          Supports MP4, MOV, WebM (Max 100MB)
        </span>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? 'var(--color-accent-mint)' : 'var(--color-border)'}`,
          borderRadius: '10px',
          padding: '24px 20px',
          textAlign: 'center',
          backgroundColor: dragActive ? 'var(--color-elevated)' : 'var(--color-secondary-bg)',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.mov,.webm,.avi,.mkv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-elevated)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UploadCloud size={24} color="var(--color-accent-mint)" />
          </div>

          <div>
            <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
              Drag and drop target video file, or{' '}
              <span style={{ color: 'var(--color-accent-mint)', textDecoration: 'underline' }}>browse</span>
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Two-pass bounded frame sampling &bull; Entire scene & object detection &bull; Frequency decomposition
            </p>
          </div>

          {selectedFile && (
            <div
              style={{
                marginTop: '8px',
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
              Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '12px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleDemoVideo('api_test_clip.mp4');
            }}
            disabled={isAnalyzing}
          >
            Load Verified Benchmark Sample
          </button>
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={!selectedFile || isAnalyzing}
          onClick={(e) => {
            e.stopPropagation();
            if (selectedFile) executeAnalysis(selectedFile);
          }}
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>{analysisProgress || 'Executing Multi-Signal Forensics...'}</span>
            </>
          ) : (
            <>
              <Film size={16} />
              <span>Run Multi-Signal Analysis</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
