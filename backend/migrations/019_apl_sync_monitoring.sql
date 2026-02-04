-- Migration 019: APL Sync Monitoring Tables
-- Tracks APL imports, changes, and enables automated monitoring

-- =====================================================
-- APL Sync Jobs - Track import executions
-- =====================================================
CREATE TABLE IF NOT EXISTS apl_sync_jobs (
  id SERIAL PRIMARY KEY,
  state VARCHAR(2) NOT NULL,
  data_source VARCHAR(50) NOT NULL, -- 'state_website', 'fis', 'conduent', 'manual'
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed

  -- Source info
  source_url TEXT,
  source_file_hash VARCHAR(64), -- SHA-256 of source file for change detection

  -- Metrics
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,

  -- Results
  total_rows_processed INTEGER DEFAULT 0,
  products_added INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_removed INTEGER DEFAULT 0,
  products_unchanged INTEGER DEFAULT 0,
  validation_errors INTEGER DEFAULT 0,

  -- Error handling
  error_message TEXT,
  error_details JSONB,

  -- Metadata
  triggered_by VARCHAR(50) DEFAULT 'scheduler', -- scheduler, manual, webhook
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_apl_sync_jobs_state ON apl_sync_jobs(state);
CREATE INDEX idx_apl_sync_jobs_status ON apl_sync_jobs(status);
CREATE INDEX idx_apl_sync_jobs_created ON apl_sync_jobs(created_at DESC);

-- =====================================================
-- APL Sync Status - Current state per state/source
-- =====================================================
CREATE TABLE IF NOT EXISTS apl_sync_status (
  id SERIAL PRIMARY KEY,
  state VARCHAR(2) NOT NULL,
  data_source VARCHAR(50) NOT NULL,

  -- Last sync info
  last_sync_job_id INTEGER REFERENCES apl_sync_jobs(id),
  last_sync_at TIMESTAMP,
  last_success_at TIMESTAMP,
  last_file_hash VARCHAR(64),

  -- Health metrics
  consecutive_failures INTEGER DEFAULT 0,
  total_syncs INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,

  -- Data metrics
  current_product_count INTEGER DEFAULT 0,
  baseline_product_count INTEGER, -- Expected count for anomaly detection

  -- Alerts
  is_healthy BOOLEAN DEFAULT TRUE,
  health_message TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_state_source UNIQUE (state, data_source)
);

-- =====================================================
-- APL Product Changes - Track individual product changes
-- =====================================================
CREATE TABLE IF NOT EXISTS apl_product_changes (
  id SERIAL PRIMARY KEY,
  sync_job_id INTEGER REFERENCES apl_sync_jobs(id),
  product_id INTEGER REFERENCES apl_products(id),
  upc VARCHAR(14) NOT NULL,
  state VARCHAR(2) NOT NULL,

  change_type VARCHAR(20) NOT NULL, -- 'added', 'updated', 'removed', 'reactivated'

  -- For updates, track what changed
  changed_fields JSONB, -- { "field": { "old": "value", "new": "value" } }

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_apl_product_changes_job ON apl_product_changes(sync_job_id);
CREATE INDEX idx_apl_product_changes_upc ON apl_product_changes(upc);
CREATE INDEX idx_apl_product_changes_state ON apl_product_changes(state);
CREATE INDEX idx_apl_product_changes_type ON apl_product_changes(change_type);
CREATE INDEX idx_apl_product_changes_created ON apl_product_changes(created_at DESC);

-- =====================================================
-- APL Source Configuration - Where to get APL data
-- =====================================================
CREATE TABLE IF NOT EXISTS apl_source_config (
  id SERIAL PRIMARY KEY,
  state VARCHAR(2) NOT NULL,
  data_source VARCHAR(50) NOT NULL,

  -- Source location
  source_type VARCHAR(20) NOT NULL, -- 'url', 'ftp', 'sftp', 'api'
  source_url TEXT NOT NULL,

  -- Authentication (encrypted in production)
  auth_type VARCHAR(20), -- 'none', 'basic', 'api_key', 'oauth'
  auth_credentials JSONB, -- Encrypted credentials

  -- Parsing configuration
  file_format VARCHAR(20) NOT NULL, -- 'xlsx', 'csv', 'json', 'pdf'
  parser_config JSONB, -- { "sheet": 0, "headerRow": 1, "columns": {...} }

  -- Schedule
  sync_schedule VARCHAR(50), -- Cron expression: '0 6 * * *' = daily at 6am
  sync_enabled BOOLEAN DEFAULT TRUE,

  -- Validation
  min_expected_products INTEGER DEFAULT 100,
  max_change_threshold DECIMAL(5,2) DEFAULT 0.10, -- Alert if >10% products change

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_source_config UNIQUE (state, data_source)
);

-- =====================================================
-- Seed APL Source Configurations
-- =====================================================
INSERT INTO apl_source_config (state, data_source, source_type, source_url, file_format, parser_config, sync_schedule, min_expected_products)
VALUES
-- Michigan - Excel from state website
('MI', 'state_website', 'url',
 'https://www.michigan.gov/mdhhs/-/media/Project/Websites/mdhhs/Assistance-Programs/WIC-Media/APL-Excel.xlsx',
 'xlsx',
 '{"sheet": 0, "headerRow": 1, "columns": {"upc": "UPC/PLU", "product_name": "Food Description", "brand": "Brand", "category": "Category", "subcategory": "SubCat", "size": "Package Size"}}',
 '0 6 * * *', -- Daily at 6am
 9000
),

-- North Carolina - Conduent system
('NC', 'conduent', 'url',
 'https://www.nutritionnc.com/wic/foods.htm',
 'html',
 '{"parseMode": "scrape", "productSelector": ".food-item"}',
 '0 7 * * *', -- Daily at 7am
 5000
),

-- Florida - PDF from state website
('FL', 'state_website', 'url',
 'https://www.floridahealth.gov/PROGRAMS-AND-SERVICES/wic/_documents/fl-wic-foods-eng.pdf',
 'pdf',
 '{"parseMode": "text_extract", "categoryHeaders": true}',
 '0 8 * * *', -- Daily at 8am
 4000
),

-- Oregon - Excel from state website
('OR', 'state_website', 'url',
 'https://www.oregon.gov/oha/PH/HEALTHYPEOPLEFAMILIES/WIC/Documents/apl.xlsx',
 'xlsx',
 '{"sheet": 0, "headerRow": 1}',
 '0 9 * * *', -- Daily at 9am
 3000
),

-- New York - State website
('NY', 'state_website', 'url',
 'https://www.health.ny.gov/prevention/nutrition/wic/foods.htm',
 'html',
 '{"parseMode": "scrape"}',
 '0 10 * * *', -- Daily at 10am
 5000
)
ON CONFLICT (state, data_source) DO NOTHING;

-- Initialize sync status for each state
INSERT INTO apl_sync_status (state, data_source, current_product_count, baseline_product_count)
SELECT
  state,
  'state_website',
  COUNT(*),
  COUNT(*)
FROM apl_products
WHERE active = true
GROUP BY state
ON CONFLICT (state, data_source) DO UPDATE SET
  current_product_count = EXCLUDED.current_product_count,
  updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to update sync status after a job
CREATE OR REPLACE FUNCTION update_apl_sync_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE apl_sync_status
    SET
      last_sync_job_id = NEW.id,
      last_sync_at = NEW.completed_at,
      last_success_at = NEW.completed_at,
      last_file_hash = NEW.source_file_hash,
      consecutive_failures = 0,
      total_syncs = total_syncs + 1,
      current_product_count = (
        SELECT COUNT(*) FROM apl_products
        WHERE state = NEW.state AND active = true
      ),
      is_healthy = TRUE,
      health_message = 'Last sync successful',
      updated_at = CURRENT_TIMESTAMP
    WHERE state = NEW.state AND data_source = NEW.data_source;
  ELSIF NEW.status = 'failed' THEN
    UPDATE apl_sync_status
    SET
      last_sync_job_id = NEW.id,
      last_sync_at = NEW.completed_at,
      consecutive_failures = consecutive_failures + 1,
      total_syncs = total_syncs + 1,
      total_failures = total_failures + 1,
      is_healthy = (consecutive_failures < 3), -- Unhealthy after 3 failures
      health_message = NEW.error_message,
      updated_at = CURRENT_TIMESTAMP
    WHERE state = NEW.state AND data_source = NEW.data_source;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update status
DROP TRIGGER IF EXISTS trigger_apl_sync_status ON apl_sync_jobs;
CREATE TRIGGER trigger_apl_sync_status
  AFTER UPDATE OF status ON apl_sync_jobs
  FOR EACH ROW
  WHEN (NEW.status IN ('completed', 'failed'))
  EXECUTE FUNCTION update_apl_sync_status();

-- =====================================================
-- Views for Monitoring
-- =====================================================

-- Overall APL health dashboard
CREATE OR REPLACE VIEW apl_health_dashboard AS
SELECT
  s.state,
  s.data_source,
  s.is_healthy,
  s.health_message,
  s.current_product_count,
  s.baseline_product_count,
  ROUND(100.0 * s.current_product_count / NULLIF(s.baseline_product_count, 0), 1) as product_count_pct,
  s.last_success_at,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.last_success_at)) / 3600 as hours_since_sync,
  s.consecutive_failures,
  s.total_syncs,
  s.total_failures,
  ROUND(100.0 * s.total_failures / NULLIF(s.total_syncs, 0), 1) as failure_rate_pct,
  c.sync_schedule,
  c.sync_enabled
FROM apl_sync_status s
LEFT JOIN apl_source_config c ON s.state = c.state AND s.data_source = c.data_source
ORDER BY s.state;

-- Recent sync jobs view
CREATE OR REPLACE VIEW apl_recent_syncs AS
SELECT
  j.id,
  j.state,
  j.data_source,
  j.status,
  j.started_at,
  j.completed_at,
  j.duration_ms,
  j.products_added,
  j.products_updated,
  j.products_removed,
  j.total_rows_processed,
  j.validation_errors,
  j.triggered_by,
  j.error_message
FROM apl_sync_jobs j
ORDER BY j.created_at DESC
LIMIT 100;

-- Product changes summary by day
CREATE OR REPLACE VIEW apl_daily_changes AS
SELECT
  DATE(c.created_at) as change_date,
  c.state,
  c.change_type,
  COUNT(*) as change_count
FROM apl_product_changes c
WHERE c.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY DATE(c.created_at), c.state, c.change_type
ORDER BY change_date DESC, c.state;
