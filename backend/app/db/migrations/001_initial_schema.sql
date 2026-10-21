-- OmniVerify — Initial Schema for Neon PostgreSQL (Lakebase Postgres)
-- Migration: 001_initial_schema.sql
-- Direct connection or Neon SQL Console compatible

CREATE TABLE IF NOT EXISTS video_analyses (
    id VARCHAR(36) PRIMARY KEY,
    video_filename VARCHAR(255) NOT NULL,
    video_hash_sha256 CHAR(64) NOT NULL,
    duration_seconds NUMERIC(8, 3) NOT NULL,
    total_frames INTEGER NOT NULL,
    sampled_frames_count INTEGER NOT NULL,
    fps NUMERIC(6, 2) NOT NULL,
    resolution VARCHAR(32) NOT NULL,
    verdict VARCHAR(20) NOT NULL CHECK (verdict IN ('REAL', 'MANIPULATED', 'UNCERTAIN')),
    calibrated_confidence NUMERIC(5, 4) NOT NULL,
    fusion_anomaly_score NUMERIC(5, 4) NOT NULL,
    detected_scene_objects_summary JSONB,
    traceable_explanations JSONB,
    limitations_disclaimer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_hash ON video_analyses(video_hash_sha256);
CREATE INDEX IF NOT EXISTS idx_analyses_created ON video_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_hash_created ON video_analyses(video_hash_sha256, created_at DESC);

CREATE TABLE IF NOT EXISTS signal_breakdowns (
    id BIGSERIAL PRIMARY KEY,
    analysis_id VARCHAR(36) NOT NULL REFERENCES video_analyses(id) ON DELETE CASCADE,
    signal_name VARCHAR(64) NOT NULL,
    raw_score NUMERIC(5, 4) NOT NULL,
    weight NUMERIC(5, 4) NOT NULL,
    weighted_contribution NUMERIC(5, 4) NOT NULL,
    status VARCHAR(32) NOT NULL,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_signal_analysis_id ON signal_breakdowns(analysis_id);

CREATE TABLE IF NOT EXISTS suspicious_intervals (
    id BIGSERIAL PRIMARY KEY,
    analysis_id VARCHAR(36) NOT NULL REFERENCES video_analyses(id) ON DELETE CASCADE,
    start_timestamp_ms NUMERIC(10, 2) NOT NULL,
    end_timestamp_ms NUMERIC(10, 2) NOT NULL,
    start_formatted VARCHAR(16) NOT NULL,
    end_formatted VARCHAR(16) NOT NULL,
    start_frame INTEGER NOT NULL,
    end_frame INTEGER NOT NULL,
    average_anomaly_score NUMERIC(5, 4) NOT NULL,
    primary_contributing_signal VARCHAR(64) NOT NULL,
    evidence_rationale TEXT
);

CREATE INDEX IF NOT EXISTS idx_interval_analysis_id ON suspicious_intervals(analysis_id);

CREATE TABLE IF NOT EXISTS forensic_reports (
    id BIGSERIAL PRIMARY KEY,
    analysis_id VARCHAR(36) NOT NULL REFERENCES video_analyses(id) ON DELETE CASCADE,
    report_type VARCHAR(16) NOT NULL CHECK (report_type IN ('JSON', 'HTML')),
    file_path VARCHAR(512) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_analysis_id ON forensic_reports(analysis_id);
