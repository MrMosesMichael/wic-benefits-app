-- WIC Benefits Database Schema
-- Migration 013: Add OCR support fields to manual_benefits table

-- Add source field to track where benefit data came from
ALTER TABLE manual_benefits
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual'
  CHECK (source IN ('manual', 'ocr', 'ewic'));

-- Add confidence field for OCR-extracted benefits (0-100)
ALTER TABLE manual_benefits
ADD COLUMN IF NOT EXISTS confidence INTEGER
  CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100));

-- Add category_label for display purposes
ALTER TABLE manual_benefits
ADD COLUMN IF NOT EXISTS category_label VARCHAR(100);

-- Add index for source
CREATE INDEX IF NOT EXISTS idx_manual_benefits_source ON manual_benefits(source);

-- Add unique constraint to prevent duplicate entries for same participant/category/period
-- This allows ON CONFLICT DO UPDATE in the OCR save logic
CREATE UNIQUE INDEX IF NOT EXISTS idx_manual_benefits_unique
  ON manual_benefits(participant_id, category, benefit_period_start);

-- Update existing rows to have source='manual' if not already set
UPDATE manual_benefits
SET source = 'manual'
WHERE source IS NULL;
