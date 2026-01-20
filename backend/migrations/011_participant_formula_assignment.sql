-- Migration 011: Participant Formula Assignment
-- Allows participants to manually select their assigned WIC formula

-- Add formula assignment columns to participants table
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS assigned_formula_upc VARCHAR(14),
  ADD COLUMN IF NOT EXISTS assigned_formula_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS formula_assignment_source VARCHAR(20) DEFAULT 'manual';

-- Add index for formula lookups
CREATE INDEX IF NOT EXISTS idx_participants_formula ON participants(assigned_formula_upc)
  WHERE assigned_formula_upc IS NOT NULL;

-- Add constraint for assignment source
ALTER TABLE participants
  ADD CONSTRAINT chk_formula_assignment_source
  CHECK (formula_assignment_source IN ('manual', 'wic_auth', 'imported'));

-- Comment for documentation
COMMENT ON COLUMN participants.assigned_formula_upc IS 'UPC of the WIC-assigned infant formula for this participant';
COMMENT ON COLUMN participants.assigned_formula_name IS 'Display name of the assigned formula';
COMMENT ON COLUMN participants.formula_assignment_source IS 'How the formula was assigned: manual (user selected), wic_auth (from WIC system), imported (from data import)';
