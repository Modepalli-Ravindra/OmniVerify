-- OmniVerify Database Migration: 002_add_user_id.sql
-- Description: Adds user_id column and index to video_analyses for user-level history authorization.

ALTER TABLE video_analyses
ADD COLUMN IF NOT EXISTS user_id VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON video_analyses(user_id);
