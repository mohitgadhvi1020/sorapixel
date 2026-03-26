-- Add audio feedback and per-image metadata columns to generation_feedback
-- Run this against your Supabase project via the SQL Editor or CLI

ALTER TABLE generation_feedback
  ADD COLUMN IF NOT EXISTS image_url      TEXT,
  ADD COLUMN IF NOT EXISTS flow_type      TEXT,
  ADD COLUMN IF NOT EXISTS prompt_used    TEXT,
  ADD COLUMN IF NOT EXISTS transcription  TEXT,
  ADD COLUMN IF NOT EXISTS summary_points JSONB,
  ADD COLUMN IF NOT EXISTS audio_url      TEXT;
