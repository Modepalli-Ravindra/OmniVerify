import React, { useState, useRef } from 'react';
import { UploadCloud, Film, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

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
      onAnalysisStart();
      const formData = new FormData();
      formData.append('file', fileToAnalyze);

      // Step 1: Upload
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.detail || 'Video upload failed.');
      }

      const uploadData = await uploadRes.json();

      // Step 2: Trigger Deep Forensic Analysis
      const analyzeRes = await fetch(`/api/analyze/${encodeURIComponent(uploadData.filename)}`, {
        method: 'POST',
      });

      if (!analyzeRes.ok) {
        const errData = await analyzeRes.json();
        throw new Error(errData.detail || 'Forensic analysis failed.');
      }

      const analysisResult = await analyzeRes.json();
      onAnalysisComplete(analysisResult);
    } catch (err: any) {
      onError(err.message || 'An error occurred during video analysis.');
    }
  };

  const handleDemoVideo = async (demoName: string) => {
    // Generate synthetic canvas clip client-side if no video is on disk
    try {
      onAnalysisStart();
      const analyzeRes = await fetch(`/api/analyze/api_test_clip.mp4`, {
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
          <Film size={18} />
          Digital Video Ingestion & Forensic Pipeline
        </h3>
        <span style={{ fontSize: '12px', color: '#64716D' }}>
          Supports MP4, MOV, WebM (Max 100MB)
        </span>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? '#004741' : '#D5CFC2'}`,
          borderRadius: '8px',
          padding: '36px 20px',
          textAlign: 'center',
          backgroundColor: dragActive ? '#E6F0EE' : '#FAF9F5',
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

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#E6F0EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UploadCloud size={28} color="#004741" />
          </div>

          <div>
            <p style={{ fontWeight: 600, color: '#101816', fontSize: '1rem' }}>
              Drag and drop target video file, or{' '}
              <span style={{ color: '#004741', textDecoration: 'underline' }}>browse</span>
            </p>
            <p style={{ fontSize: '0.8rem', color: '#64716D', marginTop: '4px' }}>
              Two-pass bounded frame sampling &bull; Entire scene & object detection &bull; Frequency decomposition
            </p>
          </div>

          {selectedFile && (
            <div
              style={{
                marginTop: '12px',
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: '#D1FAE5',
                color: '#065F46',
                fontSize: '13px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CheckCircle size={15} />
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
          marginTop: '18px',
          flexWrap: 'wrap',
          gap: '12px',
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
