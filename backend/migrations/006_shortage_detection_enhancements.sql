-- Migration 006: Shortage Detection Enhancements
-- Adds columns needed for per-UPC shortage tracking

-- Add columns for granular UPC-level shortage tracking
ALTER TABLE formula_shortages
  ADD COLUMN IF NOT EXISTS upc VARCHAR(14),
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS out_of_stock_percentage DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS total_stores_checked INTEGER,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved'));

-- Create index for faster UPC queries
CREATE INDEX IF NOT EXISTS idx_shortage_upc ON formula_shortages(upc);
CREATE INDEX IF NOT EXISTS idx_shortage_status ON formula_shortages(status);

-- Make formula_category nullable (we'll track by UPC instead for MVP)
ALTER TABLE formula_shortages ALTER COLUMN formula_category DROP NOT NULL;
ALTER TABLE formula_shortages ALTER COLUMN affected_upcs DROP NOT NULL;

COMMENT ON COLUMN formula_shortages.upc IS 'Individual UPC experiencing shortage';
COMMENT ON COLUMN formula_shortages.product_name IS 'Product name for display';
COMMENT ON COLUMN formula_shortages.out_of_stock_percentage IS 'Percentage of stores reporting out of stock';
COMMENT ON COLUMN formula_shortages.total_stores_checked IS 'Number of stores analyzed for this shortage';
COMMENT ON COLUMN formula_shortages.status IS 'active or resolved';
