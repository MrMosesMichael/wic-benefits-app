-- Migration: 013_products
-- Description: Create products table for UPC-to-product database
-- Date: 2026-01-21
-- Task: A2.1 - Source UPC-to-product database

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table: Core product information
CREATE TABLE IF NOT EXISTS products (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- UPC identifiers (unique)
  upc VARCHAR(14) NOT NULL UNIQUE,
  upc_normalized VARCHAR(14) NOT NULL, -- Normalized form for matching

  -- Product identification
  name VARCHAR(500) NOT NULL,
  brand VARCHAR(200) NOT NULL,
  manufacturer VARCHAR(200),

  -- Category (stored as JSONB array for hierarchy)
  category JSONB NOT NULL DEFAULT '[]',

  -- Size information
  size VARCHAR(50) NOT NULL,
  size_unit VARCHAR(10) NOT NULL,
  size_oz DECIMAL(10, 2), -- Normalized to ounces for comparison

  -- Media
  image_url TEXT,
  thumbnail_url TEXT,

  -- Content information
  ingredients TEXT,
  nutrition JSONB, -- Structured nutrition facts
  allergens JSONB, -- Array of allergen strings

  -- Flags
  is_organic BOOLEAN DEFAULT FALSE,
  is_generic BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  verified_by VARCHAR(100),

  -- Data provenance
  data_source VARCHAR(50) NOT NULL, -- 'open_food_facts', 'upc_database', etc.
  source_metadata JSONB, -- Source-specific additional data

  -- Timestamps
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_products_upc ON products(upc);
CREATE INDEX idx_products_upc_normalized ON products(upc_normalized);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('english', name));
CREATE INDEX idx_products_category ON products USING gin(category);
CREATE INDEX idx_products_data_source ON products(data_source);
CREATE INDEX idx_products_verified ON products(verified);
CREATE INDEX idx_products_last_updated ON products(last_updated);

-- Product submissions table: Crowdsourced product additions
CREATE TABLE IF NOT EXISTS product_submissions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- UPC being submitted
  upc VARCHAR(14) NOT NULL,

  -- Submitted product data
  product_data JSONB NOT NULL,

  -- Submission tracking
  submitted_by VARCHAR(100) NOT NULL, -- User ID or anonymous ID
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Review status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'needs_review'
  reviewer_notes TEXT,
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMP WITH TIME ZONE,

  -- Supporting evidence
  evidence JSONB, -- Array of photo URLs, links, etc.

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for submissions
CREATE INDEX idx_product_submissions_upc ON product_submissions(upc);
CREATE INDEX idx_product_submissions_status ON product_submissions(status);
CREATE INDEX idx_product_submissions_submitted_by ON product_submissions(submitted_by);
CREATE INDEX idx_product_submissions_submitted_at ON product_submissions(submitted_at);

-- Unknown product reports table: Track UPCs not found in database
CREATE TABLE IF NOT EXISTS unknown_product_reports (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- UPC not found
  upc VARCHAR(14) NOT NULL,

  -- Report tracking
  reported_by VARCHAR(100) NOT NULL, -- User ID or anonymous ID
  reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Optional user-provided info
  user_provided_info JSONB,

  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for unknown reports
CREATE INDEX idx_unknown_reports_upc ON unknown_product_reports(upc);
CREATE INDEX idx_unknown_reports_resolved ON unknown_product_reports(resolved);
CREATE INDEX idx_unknown_reports_reported_at ON unknown_product_reports(reported_at);

-- Product coverage stats table: Track database coverage metrics
CREATE TABLE IF NOT EXISTS product_coverage_stats (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Snapshot timestamp
  snapshot_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Coverage metrics
  total_products INTEGER NOT NULL,
  products_with_images INTEGER NOT NULL,
  products_with_nutrition INTEGER NOT NULL,
  verified_products INTEGER NOT NULL,

  -- Coverage by source
  coverage_by_source JSONB NOT NULL, -- { "open_food_facts": 12345, "upc_database": 5678 }

  -- Coverage by category
  coverage_by_category JSONB NOT NULL, -- { "dairy": 1000, "cereal": 500 }

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for coverage stats
CREATE INDEX idx_coverage_stats_snapshot_at ON product_coverage_stats(snapshot_at);

-- Function: Update updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION update_product_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers: Auto-update updated_at timestamps
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_updated_at();

CREATE TRIGGER product_submissions_updated_at
  BEFORE UPDATE ON product_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_product_updated_at();

CREATE TRIGGER unknown_product_reports_updated_at
  BEFORE UPDATE ON unknown_product_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_product_updated_at();

-- Function: Normalize UPC for consistent lookups
CREATE OR REPLACE FUNCTION normalize_upc(upc_input VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  -- Strip non-digits
  upc_input := regexp_replace(upc_input, '[^0-9]', '', 'g');

  -- Pad to 12 digits (UPC-A standard)
  IF length(upc_input) < 12 THEN
    upc_input := lpad(upc_input, 12, '0');
  END IF;

  RETURN upc_input;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comments for documentation
COMMENT ON TABLE products IS 'Product database: UPC-to-product information from Open Food Facts and UPC Database API';
COMMENT ON TABLE product_submissions IS 'Crowdsourced product additions submitted by users';
COMMENT ON TABLE unknown_product_reports IS 'Track UPCs not found in database for coverage improvement';
COMMENT ON TABLE product_coverage_stats IS 'Periodic snapshots of product database coverage metrics';

COMMENT ON COLUMN products.upc IS 'Universal Product Code (12-14 digits)';
COMMENT ON COLUMN products.upc_normalized IS 'Normalized UPC for consistent matching (padded to 12 digits)';
COMMENT ON COLUMN products.category IS 'Hierarchical category as JSON array (e.g., ["Dairy", "Milk", "Whole Milk"])';
COMMENT ON COLUMN products.size_oz IS 'Product size normalized to ounces for comparison with APL size restrictions';
COMMENT ON COLUMN products.nutrition IS 'Structured nutrition facts as JSON object';
COMMENT ON COLUMN products.data_source IS 'Data source: open_food_facts, upc_database, retailer_feed, manual, crowdsourced';
COMMENT ON COLUMN products.verified IS 'Has this product been manually verified by a human?';

-- Sample data for testing (optional - uncomment to insert)
-- INSERT INTO products (upc, upc_normalized, name, brand, category, size, size_unit, size_oz, data_source)
-- VALUES
--   ('016000275287', '016000275287', 'Cheerios', 'General Mills', '["Breakfast", "Cereal", "Whole Grain"]', '18', 'oz', 18.0, 'open_food_facts'),
--   ('041220576197', '041220576197', 'Similac Advance Infant Formula', 'Similac', '["Baby", "Formula", "Infant Formula"]', '12.4', 'oz', 12.4, 'open_food_facts');
