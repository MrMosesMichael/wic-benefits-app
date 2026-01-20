-- Migration 009: Stores Database
-- Creates a table for WIC-authorized retail stores with location data

CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  store_id VARCHAR(100) NOT NULL UNIQUE,  -- 'walmart-1234', 'target-5678'
  chain VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  street_address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip VARCHAR(10) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  phone VARCHAR(20),
  wic_authorized BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_stores_chain ON stores(chain);
CREATE INDEX idx_stores_state ON stores(state);
CREATE INDEX idx_stores_location ON stores(latitude, longitude);
CREATE INDEX idx_stores_wic_authorized ON stores(wic_authorized) WHERE wic_authorized = TRUE;
CREATE INDEX idx_stores_active ON stores(active) WHERE active = TRUE;
CREATE INDEX idx_stores_city ON stores(city);
CREATE INDEX idx_stores_zip ON stores(zip);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_stores_updated_at();
