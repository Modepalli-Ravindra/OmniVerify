export interface ObjectDetection {
  label: string;
  confidence: number;
  box: [number, number, number, number]; // [x1, y1, x2, y2] normalized
}

export interface FrameForensicSignal {
  frame_index: number;
  timestamp_ms: number;
  timestamp_formatted: string;
  thumbnail_data?: string;
  heatmap_data?: string;
  noise_residual_score: number;
  frequency_score: number;
  motion_inconsistency_score: number;
  frame_anomaly_score: number;
  is_suspicious: boolean;
  detected_objects: ObjectDetection[];
}

export interface SuspiciousInterval {
  start_timestamp_ms: number;
  end_timestamp_ms: number;
  start_formatted: string;
  end_formatted: string;
  start_frame: number;
  end_frame: number;
  average_anomaly_score: number;
  primary_contributing_signal: string;
  evidence_rationale: string;
}

export interface SignalBreakdown {
  signal_name: string;
  raw_score: number;
  weight: number;
  weighted_contribution: number;
  status: 'Nominal' | 'Suspicious' | 'Anomalous';
  description: string;
}

export interface VideoAnalysisResult {
  video_filename: string;
  video_hash_sha256: string;
  duration_seconds: number;
  total_frames: number;
  sampled_frames_count: number;
  fps: number;
  resolution: string;
  verdict: 'REAL' | 'MANIPULATED' | 'UNCERTAIN';
  calibrated_confidence: number;
  fusion_anomaly_score: number;
  signal_breakdowns: SignalBreakdown[];
  suspicious_intervals: SuspiciousInterval[];
  frames: FrameForensicSignal[];
  detected_scene_objects_summary: Record<string, number>;
  traceable_explanations: string[];
  limitations_disclaimer: string;
  processed_at_iso: string;
  executive_brief?: {
    source: string;
    summary: string;
    notice: string;
  };
  storage_report_url?: string;
}
