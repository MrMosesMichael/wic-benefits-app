-- Migration 005: Formula Tracking
-- Enables formula availability tracking, shortage detection, and restock alerts

-- Formula availability tracking (MVP: using store names instead of IDs)
CREATE TABLE formula_availability (
  id SERIAL PRIMARY KEY,
  upc VARCHAR(14) NOT NULL,
  store_name VARCHAR(255) NOT NULL,
  store_address VARCHAR(500),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status VARCHAR(20) NOT NULL CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock', 'unknown')),
  quantity_range VARCHAR(20) CHECK (quantity_range IN ('few', 'some', 'plenty')),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(20) NOT NULL CHECK (source IN ('api', 'scrape', 'crowdsourced')),
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  report_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_formula_upc ON formula_availability(upc);
CREATE INDEX idx_formula_store_name ON formula_availability(store_name);
CREATE INDEX idx_formula_upc_store ON formula_availability(upc, store_name);
CREATE INDEX idx_formula_updated ON formula_availability(last_updated);
CREATE INDEX idx_formula_status ON formula_availability(status);

-- Formula shortage tracking
CREATE TABLE formula_shortages (
  id SERIAL PRIMARY KEY,
  formula_category VARCHAR(100) NOT NULL,
  affected_upcs TEXT[] NOT NULL,
  region VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('moderate', 'severe', 'critical')),
  percent_stores_affected DECIMAL(5,2),
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  trend VARCHAR(20) CHECK (trend IN ('worsening', 'stable', 'improving')),
  alternative_upcs TEXT[]
);

CREATE INDEX idx_shortage_region ON formula_shortages(region);
CREATE INDEX idx_shortage_category ON formula_shortages(formula_category);
CREATE INDEX idx_shortage_active ON formula_shortages(resolved_at) WHERE resolved_at IS NULL;

-- Users table (needed for alerts and data sovereignty)
-- Using device-based anonymous auth for MVP
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_device ON users(device_id);

-- Formula restock alerts
CREATE TABLE formula_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  formula_upcs TEXT[] NOT NULL,
  max_distance_miles INTEGER DEFAULT 10,
  notification_method VARCHAR(20) DEFAULT 'push' CHECK (notification_method IN ('push', 'sms', 'both')),
  specific_store_names TEXT[],  -- Store names for MVP (no store IDs yet)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  last_notified TIMESTAMP,
  active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_alerts_user ON formula_alerts(user_id);
CREATE INDEX idx_alerts_active ON formula_alerts(active) WHERE active = TRUE;
CREATE INDEX idx_alerts_upcs ON formula_alerts USING GIN(formula_upcs);

-- Formula equivalents mapping (for alternatives)
CREATE TABLE formula_equivalents (
  id SERIAL PRIMARY KEY,
  primary_upc VARCHAR(14) NOT NULL,
  equivalent_upc VARCHAR(14) NOT NULL,
  relationship VARCHAR(50) NOT NULL CHECK (relationship IN ('same_product_different_size', 'same_brand_different_type', 'generic_equivalent', 'medical_alternative')),
  state VARCHAR(2),  -- null = all states
  notes TEXT
);

CREATE INDEX idx_equiv_primary ON formula_equivalents(primary_upc);
CREATE INDEX idx_equiv_equivalent ON formula_equivalents(equivalent_upc);

-- Add user_id to existing tables for data ownership
ALTER TABLE households ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Create default anonymous user for existing data
INSERT INTO users (device_id) VALUES ('demo-device-001');
UPDATE households SET user_id = 1 WHERE user_id IS NULL;

-- Comments for documentation
COMMENT ON TABLE formula_availability IS 'Tracks infant formula availability across stores from multiple sources';
COMMENT ON TABLE formula_shortages IS 'Regional formula shortage detection and tracking';
COMMENT ON TABLE formula_alerts IS 'User subscriptions for formula restock notifications';
COMMENT ON TABLE formula_equivalents IS 'Maps formula products to their equivalents for alternative suggestions';
COMMENT ON TABLE users IS 'User accounts for authentication and data ownership (device-based for MVP)';

COMMENT ON COLUMN formula_availability.source IS 'Data source: api (retailer), scrape (web scraping), crowdsourced (user reports)';
COMMENT ON COLUMN formula_availability.confidence IS 'Confidence score 0-100 based on source and age';
COMMENT ON COLUMN formula_shortages.trend IS 'Whether shortage is getting worse, stable, or improving';
COMMENT ON COLUMN formula_alerts.notification_method IS 'How to notify user: push notification, SMS, or both';
