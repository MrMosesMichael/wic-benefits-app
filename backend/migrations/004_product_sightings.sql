-- Migration 004: Product Sightings (Crowdsourced Inventory)
-- Enables community-powered product availability reporting

-- Product sightings table
CREATE TABLE product_sightings (
  id SERIAL PRIMARY KEY,
  upc VARCHAR(14) NOT NULL,
  store_id VARCHAR(100),
  store_name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  stock_level VARCHAR(20) NOT NULL CHECK (stock_level IN ('plenty', 'some', 'few', 'out')),
  reported_by VARCHAR(100), -- user_id or 'anonymous'
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  location_verified BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX idx_sightings_upc ON product_sightings(upc);
CREATE INDEX idx_sightings_reported_at ON product_sightings(reported_at);
CREATE INDEX idx_sightings_store ON product_sightings(store_id);
CREATE INDEX idx_sightings_latitude ON product_sightings(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_sightings_longitude ON product_sightings(longitude) WHERE longitude IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE product_sightings IS 'Community-reported product sightings for crowdsourced inventory';
COMMENT ON COLUMN product_sightings.stock_level IS 'plenty=well stocked, some=moderate, few=limited, out=none seen';
COMMENT ON COLUMN product_sightings.helpful_count IS 'Number of users who marked this sighting as helpful';
COMMENT ON COLUMN product_sightings.location_verified IS 'True if GPS coordinates match store location';
