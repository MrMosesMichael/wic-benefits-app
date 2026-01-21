-- Migration: Product Sync Tracking Tables
-- Creates tables for tracking product sync jobs, history, and coverage metrics

-- ============================================================================
-- Product Sync Jobs Table
-- ============================================================================
-- Tracks individual product sync job executions

CREATE TABLE IF NOT EXISTS product_sync_jobs (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused', 'cancelled')),
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP,
  duration_ms INTEGER,
  total_products INTEGER DEFAULT 0,
  products_added INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_skipped INTEGER DEFAULT 0,
  products_failed INTEGER DEFAULT 0,
  images_processed INTEGER DEFAULT 0,
  images_failed INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  sources JSONB, -- Array of data sources used
  config JSONB, -- Job configuration
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_product_sync_jobs_job_id ON product_sync_jobs(job_id);
CREATE INDEX idx_product_sync_jobs_status ON product_sync_jobs(status);
CREATE INDEX idx_product_sync_jobs_start_time ON product_sync_jobs(start_time DESC);

-- ============================================================================
-- Product Sync Errors Table
-- ============================================================================
-- Tracks errors during sync jobs for debugging and retry logic

CREATE TABLE IF NOT EXISTS product_sync_errors (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(100) NOT NULL,
  upc VARCHAR(20) NOT NULL,
  source VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  retries INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (job_id) REFERENCES product_sync_jobs(job_id) ON DELETE CASCADE
);

-- Indexes for efficient querying
CREATE INDEX idx_product_sync_errors_job_id ON product_sync_errors(job_id);
CREATE INDEX idx_product_sync_errors_upc ON product_sync_errors(upc);
CREATE INDEX idx_product_sync_errors_resolved ON product_sync_errors(resolved);
CREATE INDEX idx_product_sync_errors_timestamp ON product_sync_errors(timestamp DESC);

-- ============================================================================
-- Product Coverage Metrics Table
-- ============================================================================
-- Tracks product coverage metrics over time for trend analysis

CREATE TABLE IF NOT EXISTS product_coverage_metrics (
  id SERIAL PRIMARY KEY,
  total_products INTEGER NOT NULL,
  products_with_images INTEGER NOT NULL,
  products_with_nutrition INTEGER NOT NULL,
  verified_products INTEGER NOT NULL,
  coverage_percentage DECIMAL(5, 2), -- e.g., 95.50%
  image_coverage_percentage DECIMAL(5, 2),
  nutrition_coverage_percentage DECIMAL(5, 2),
  coverage_by_source JSONB, -- { "open_food_facts": 5000, "upc_database": 3000 }
  coverage_by_category JSONB, -- { "Milk": 500, "Cheese": 300 }
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for time-series analysis
CREATE INDEX idx_product_coverage_metrics_timestamp ON product_coverage_metrics(timestamp DESC);

-- ============================================================================
-- Product Sync Schedule Table
-- ============================================================================
-- Tracks scheduled sync jobs and their execution history

CREATE TABLE IF NOT EXISTS product_sync_schedule (
  id SERIAL PRIMARY KEY,
  schedule_name VARCHAR(100) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  interval_hours INTEGER NOT NULL,
  sync_hour INTEGER CHECK (sync_hour >= 0 AND sync_hour <= 23),
  incremental_sync BOOLEAN DEFAULT TRUE,
  target_coverage DECIMAL(5, 2) DEFAULT 95.00,
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  failed_runs INTEGER DEFAULT 0,
  config JSONB, -- Sync job configuration
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_product_sync_schedule_enabled ON product_sync_schedule(enabled);
CREATE INDEX idx_product_sync_schedule_next_run ON product_sync_schedule(next_run);

-- ============================================================================
-- Product Health Checks Table
-- ============================================================================
-- Stores product database health check results

CREATE TABLE IF NOT EXISTS product_health_checks (
  id SERIAL PRIMARY KEY,
  healthy BOOLEAN NOT NULL,
  health_score DECIMAL(5, 2) NOT NULL, -- 0-100
  coverage_status VARCHAR(20) NOT NULL,
  freshness_status VARCHAR(20) NOT NULL,
  quality_status VARCHAR(20) NOT NULL,
  current_coverage DECIMAL(5, 2),
  coverage_gap DECIMAL(5, 2),
  last_sync_age_hours DECIMAL(10, 2),
  verified_percentage DECIMAL(5, 2),
  image_quality_percentage DECIMAL(5, 2),
  nutrition_quality_percentage DECIMAL(5, 2),
  alert_count INTEGER DEFAULT 0,
  critical_alert_count INTEGER DEFAULT 0,
  alerts JSONB, -- Array of alert objects
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for health monitoring
CREATE INDEX idx_product_health_checks_timestamp ON product_health_checks(timestamp DESC);
CREATE INDEX idx_product_health_checks_healthy ON product_health_checks(healthy);
CREATE INDEX idx_product_health_checks_health_score ON product_health_checks(health_score);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at for product_sync_jobs
CREATE TRIGGER trigger_product_sync_jobs_updated_at
  BEFORE UPDATE ON product_sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_product_sync_updated_at();

-- Trigger: Auto-update updated_at for product_sync_schedule
CREATE TRIGGER trigger_product_sync_schedule_updated_at
  BEFORE UPDATE ON product_sync_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_product_sync_updated_at();

-- Function: Calculate coverage percentage
CREATE OR REPLACE FUNCTION calculate_product_coverage()
RETURNS DECIMAL(5, 2) AS $$
DECLARE
  total_apl_upcs INTEGER;
  total_products INTEGER;
BEGIN
  -- Get total APL UPCs (from all states)
  SELECT COUNT(DISTINCT upc) INTO total_apl_upcs FROM apl_entries;

  -- Get total products in database
  SELECT COUNT(*) INTO total_products FROM products;

  -- Calculate coverage
  IF total_apl_upcs = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((total_products::DECIMAL / total_apl_upcs::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Function: Record coverage metrics snapshot
CREATE OR REPLACE FUNCTION record_coverage_metrics()
RETURNS VOID AS $$
DECLARE
  total_prods INTEGER;
  with_images INTEGER;
  with_nutrition INTEGER;
  verified INTEGER;
  coverage DECIMAL(5, 2);
  source_coverage JSONB;
  category_coverage JSONB;
BEGIN
  -- Get product counts
  SELECT COUNT(*) INTO total_prods FROM products;
  SELECT COUNT(*) INTO with_images FROM products WHERE image_url IS NOT NULL;
  SELECT COUNT(*) INTO with_nutrition FROM products WHERE nutrition IS NOT NULL;
  SELECT COUNT(*) INTO verified FROM products WHERE verified = TRUE;

  -- Calculate coverage
  coverage := calculate_product_coverage();

  -- Get coverage by source
  SELECT jsonb_object_agg(data_source, count)
  INTO source_coverage
  FROM (
    SELECT data_source, COUNT(*) as count
    FROM products
    GROUP BY data_source
  ) source_counts;

  -- Get top 20 categories
  SELECT jsonb_object_agg(category_name, count)
  INTO category_coverage
  FROM (
    SELECT category_name, COUNT(*) as count
    FROM products,
    jsonb_array_elements_text(category) as category_name
    GROUP BY category_name
    ORDER BY count DESC
    LIMIT 20
  ) category_counts;

  -- Insert metrics record
  INSERT INTO product_coverage_metrics (
    total_products,
    products_with_images,
    products_with_nutrition,
    verified_products,
    coverage_percentage,
    image_coverage_percentage,
    nutrition_coverage_percentage,
    coverage_by_source,
    coverage_by_category,
    timestamp
  ) VALUES (
    total_prods,
    with_images,
    with_nutrition,
    verified,
    coverage,
    CASE WHEN total_prods > 0 THEN ROUND((with_images::DECIMAL / total_prods::DECIMAL) * 100, 2) ELSE 0 END,
    CASE WHEN total_prods > 0 THEN ROUND((with_nutrition::DECIMAL / total_prods::DECIMAL) * 100, 2) ELSE 0 END,
    source_coverage,
    category_coverage,
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Initial Data
-- ============================================================================

-- Create default sync schedule (daily at 2am)
INSERT INTO product_sync_schedule (
  schedule_name,
  enabled,
  interval_hours,
  sync_hour,
  incremental_sync,
  target_coverage,
  config
) VALUES (
  'daily_sync',
  TRUE,
  24,
  2,
  TRUE,
  95.00,
  '{"batchSize": 100, "concurrency": 5, "retryFailures": true, "maxRetries": 3, "syncImages": false}'::jsonb
) ON CONFLICT (schedule_name) DO NOTHING;

-- Record initial coverage metrics
SELECT record_coverage_metrics();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE product_sync_jobs IS 'Tracks individual product sync job executions';
COMMENT ON TABLE product_sync_errors IS 'Stores sync errors for debugging and retry logic';
COMMENT ON TABLE product_coverage_metrics IS 'Time-series product coverage metrics';
COMMENT ON TABLE product_sync_schedule IS 'Scheduled sync job configuration';
COMMENT ON TABLE product_health_checks IS 'Product database health check results';

COMMENT ON FUNCTION calculate_product_coverage() IS 'Calculates product coverage percentage vs APL UPCs';
COMMENT ON FUNCTION record_coverage_metrics() IS 'Records snapshot of current product coverage metrics';
