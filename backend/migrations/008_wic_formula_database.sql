-- Migration 008: WIC Formula Products Database
-- Creates a comprehensive table of WIC-approved infant formulas

CREATE TABLE IF NOT EXISTS wic_formulas (
  id SERIAL PRIMARY KEY,
  upc VARCHAR(14) NOT NULL UNIQUE,
  brand VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  formula_type VARCHAR(50) NOT NULL,  -- standard, sensitive, gentle, hypoallergenic, organic, soy, specialty
  form VARCHAR(20) NOT NULL,          -- powder, ready_to_feed, concentrate
  size VARCHAR(50),
  size_oz DECIMAL(10,2),
  state_contract_brand BOOLEAN DEFAULT FALSE,
  states_approved TEXT[],             -- ['MI', 'NC', 'FL', 'OR']
  manufacturer VARCHAR(100),
  image_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_wic_formulas_type ON wic_formulas(formula_type);
CREATE INDEX idx_wic_formulas_brand ON wic_formulas(brand);
CREATE INDEX idx_wic_formulas_states ON wic_formulas USING GIN(states_approved);
CREATE INDEX idx_wic_formulas_active ON wic_formulas(active) WHERE active = TRUE;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wic_formulas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_wic_formulas_updated_at
  BEFORE UPDATE ON wic_formulas
  FOR EACH ROW
  EXECUTE FUNCTION update_wic_formulas_updated_at();
