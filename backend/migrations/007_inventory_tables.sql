-- Migration 007: Inventory Tables
-- Creates tables for storing product inventory data from retailers

-- Main inventory table
CREATE TABLE IF NOT EXISTS inventory (
  inventory_id SERIAL PRIMARY KEY,
  store_id VARCHAR(100) NOT NULL,
  upc VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock', 'unknown')),
  quantity INTEGER,
  quantity_range VARCHAR(20) CHECK (quantity_range IN ('few', 'some', 'plenty')),
  aisle VARCHAR(50),
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  data_source VARCHAR(20) NOT NULL CHECK (data_source IN ('api', 'scrape', 'crowdsourced', 'manual')),
  confidence INTEGER NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  report_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, upc)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_inventory_store_upc ON inventory(store_id, upc);
CREATE INDEX IF NOT EXISTS idx_inventory_upc ON inventory(upc);
CREATE INDEX IF NOT EXISTS idx_inventory_store_status ON inventory(store_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_last_updated ON inventory(last_updated DESC);

-- Inventory reports log (for tracking crowdsourced contributions)
CREATE TABLE IF NOT EXISTS inventory_reports_log (
  report_id SERIAL PRIMARY KEY,
  user_id VARCHAR(100),
  store_id VARCHAR(100) NOT NULL,
  upc VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  reported_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for user reports
CREATE INDEX IF NOT EXISTS idx_inventory_reports_user ON inventory_reports_log(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reports_store ON inventory_reports_log(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reports_date ON inventory_reports_log(reported_at DESC);

-- Inventory sync jobs tracking
CREATE TABLE IF NOT EXISTS inventory_sync_jobs (
  job_id SERIAL PRIMARY KEY,
  retailer VARCHAR(50) NOT NULL,
  store_ids TEXT[] NOT NULL,
  upcs TEXT[],
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  items_processed INTEGER DEFAULT 0,
  items_succeeded INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for sync jobs
CREATE INDEX IF NOT EXISTS idx_sync_jobs_retailer ON inventory_sync_jobs(retailer);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON inventory_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created ON inventory_sync_jobs(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE inventory IS 'Product inventory data from retailers (API, scraping, crowdsourced)';
COMMENT ON COLUMN inventory.store_id IS 'Store identifier (e.g., walmart-1234)';
COMMENT ON COLUMN inventory.upc IS 'Universal Product Code';
COMMENT ON COLUMN inventory.status IS 'Stock status: in_stock, low_stock, out_of_stock, unknown';
COMMENT ON COLUMN inventory.quantity IS 'Exact quantity if known';
COMMENT ON COLUMN inventory.quantity_range IS 'Approximate quantity range: few, some, plenty';
COMMENT ON COLUMN inventory.aisle IS 'Store aisle location if available';
COMMENT ON COLUMN inventory.data_source IS 'Source of data: api, scrape, crowdsourced, manual';
COMMENT ON COLUMN inventory.confidence IS 'Confidence score 0-100';
COMMENT ON COLUMN inventory.report_count IS 'Number of crowdsourced reports for this item';

COMMENT ON TABLE inventory_reports_log IS 'Log of user-contributed inventory reports';
COMMENT ON TABLE inventory_sync_jobs IS 'Tracking for automated inventory sync jobs';
