-- WIC Benefits Database Schema
-- Migration 012: Manual benefits table

-- Manual benefits table for user-entered benefit amounts
-- This table tracks manually entered benefits separate from state-provided data
-- to maintain clear audit trail and source attribution
CREATE TABLE IF NOT EXISTS manual_benefits (
  id SERIAL PRIMARY KEY,
  household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  unit VARCHAR(20) NOT NULL,
  benefit_period_start DATE NOT NULL,
  benefit_period_end DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure period_end is after period_start
  CONSTRAINT valid_benefit_period CHECK (benefit_period_end > benefit_period_start)
);

-- Indexes for performance
CREATE INDEX idx_manual_benefits_household ON manual_benefits(household_id);
CREATE INDEX idx_manual_benefits_participant ON manual_benefits(participant_id);
CREATE INDEX idx_manual_benefits_category ON manual_benefits(category);
CREATE INDEX idx_manual_benefits_period ON manual_benefits(benefit_period_start, benefit_period_end);

-- Composite index for common query pattern (participant + category + period)
CREATE INDEX idx_manual_benefits_lookup ON manual_benefits(participant_id, category, benefit_period_start, benefit_period_end);
