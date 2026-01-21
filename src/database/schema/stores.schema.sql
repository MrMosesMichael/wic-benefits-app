-- Store Database Schema
-- Supports WIC-authorized store inventory, location data, and operating hours
-- Priority states: Michigan, North Carolina, Florida, Oregon

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Data source for store information
CREATE TYPE store_data_source AS ENUM (
  'api',           -- From external API (Google Places, Walmart, etc.)
  'scrape',        -- From retailer website scraping
  'crowdsourced',  -- User-submitted data
  'manual'         -- Manually entered by admin
);

-- Store feature flags
CREATE TYPE store_chain AS ENUM (
  'walmart',
  'target',
  'kroger',
  'safeway',
  'whole_foods',
  'cvs',
  'walgreens',
  'publix',
  'giant_eagle',
  'regional',
  'independent'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Main stores table
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  chain store_chain NOT NULL,
  chain_id VARCHAR(100),  -- Retailer's internal store ID

  -- Location
  address_street VARCHAR(255) NOT NULL,
  address_street2 VARCHAR(255),
  address_city VARCHAR(100) NOT NULL,
  address_state CHAR(2) NOT NULL,
  address_zip VARCHAR(10) NOT NULL,
  address_country VARCHAR(100) DEFAULT 'USA',
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,

  -- Contact
  phone VARCHAR(20),
  website VARCHAR(255),

  -- WIC Info
  wic_authorized BOOLEAN NOT NULL DEFAULT false,
  wic_vendor_id VARCHAR(100),  -- State WIC vendor ID

  -- Features (stored as JSONB for flexibility)
  features JSONB NOT NULL DEFAULT '{}',
  -- Expected structure: {
  --   "has_pharmacy": boolean,
  --   "has_deli_counter": boolean,
  --   "has_bakery": boolean,
  --   "accepts_ebt": boolean,
  --   "accepts_wic": boolean,
  --   "has_wic_kiosk": boolean
  -- }

  -- Inventory API capabilities
  inventory_api_available BOOLEAN NOT NULL DEFAULT false,
  inventory_api_type VARCHAR(50),  -- 'walmart', 'kroger', 'target', 'scrape'

  -- Detection methods available
  wifi_networks JSONB,  -- [{ssid: string, bssid: string}, ...]
  beacons JSONB,        -- [{uuid: string, major: number, minor: number}, ...]

  -- Timezone for hours calculations
  timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',

  -- Data provenance
  data_source store_data_source NOT NULL,
  last_verified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT true,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180)
);

-- Store operating hours
CREATE TABLE store_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  day_of_week INTEGER NOT NULL,  -- 0 = Sunday, 6 = Saturday
  open_time TIME,  -- NULL or '00:00' if closed
  close_time TIME,
  closed BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_day CHECK (day_of_week >= 0 AND day_of_week <= 6)
);

-- Holiday/special hours
CREATE TABLE store_holiday_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  holiday_date DATE NOT NULL,
  open_time TIME,
  close_time TIME,
  closed BOOLEAN NOT NULL DEFAULT false,
  reason VARCHAR(255),  -- e.g., "Thanksgiving", "Christmas", "Inventory Day"

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(store_id, holiday_date)
);

-- Store geofences for precise in-store detection
CREATE TABLE store_geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  geofence_type VARCHAR(50) NOT NULL,  -- 'circle' or 'polygon'

  -- For circle geofences
  center_latitude DECIMAL(10, 8),
  center_longitude DECIMAL(11, 8),
  radius_meters INTEGER,

  -- For polygon geofences
  polygon_coordinates JSONB,  -- [{lat: number, lng: number}, ...]

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT circle_or_polygon CHECK (
    (geofence_type = 'circle' AND center_latitude IS NOT NULL AND radius_meters IS NOT NULL) OR
    (geofence_type = 'polygon' AND polygon_coordinates IS NOT NULL)
  )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Location-based queries
CREATE INDEX idx_stores_state ON stores(address_state);
CREATE INDEX idx_stores_city ON stores(address_city);
CREATE INDEX idx_stores_zip ON stores(address_zip);
CREATE INDEX idx_stores_location ON stores USING GIST (
  ll_to_earth(latitude, longitude)
);  -- Requires earthdistance extension for distance queries

-- WIC info
CREATE INDEX idx_stores_wic_authorized ON stores(wic_authorized, address_state);
CREATE INDEX idx_stores_wic_vendor_id ON stores(wic_vendor_id);

-- Chain filtering
CREATE INDEX idx_stores_chain ON stores(chain);

-- Data quality
CREATE INDEX idx_stores_active ON stores(active);
CREATE INDEX idx_stores_last_verified ON stores(last_verified DESC);

-- Hours lookups
CREATE INDEX idx_store_hours_store ON store_hours(store_id, day_of_week);

-- Holiday hours lookups
CREATE INDEX idx_holiday_hours_store_date ON store_holiday_hours(store_id, holiday_date);

-- Geofence lookups
CREATE INDEX idx_geofences_store ON store_geofences(store_id);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Current store summary with today's hours
CREATE VIEW stores_with_hours AS
SELECT
  s.*,
  sh.open_time,
  sh.close_time,
  sh.closed
FROM stores s
LEFT JOIN store_hours sh ON s.id = sh.store_id
  AND sh.day_of_week = EXTRACT(DOW FROM NOW() AT TIME ZONE s.timezone)::INTEGER
WHERE s.active = true;

-- Stores with complete location data (no nulls)
CREATE VIEW stores_complete_data AS
SELECT *
FROM stores
WHERE
  address_street IS NOT NULL
  AND address_city IS NOT NULL
  AND address_state IS NOT NULL
  AND address_zip IS NOT NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_stores_updated_at
BEFORE UPDATE ON stores
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_hours_updated_at
BEFORE UPDATE ON store_hours
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_holiday_hours_updated_at
BEFORE UPDATE ON store_holiday_hours
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_geofences_updated_at
BEFORE UPDATE ON store_geofences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to find stores by state and WIC authorization
CREATE OR REPLACE FUNCTION find_wic_stores_by_state(p_state CHAR(2))
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  address_street VARCHAR,
  address_city VARCHAR,
  phone VARCHAR,
  latitude DECIMAL,
  longitude DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.address_street,
    s.address_city,
    s.phone,
    s.latitude,
    s.longitude
  FROM stores s
  WHERE s.address_state = p_state
    AND s.wic_authorized = true
    AND s.active = true
  ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;

-- Function to check if store is currently open
CREATE OR REPLACE FUNCTION is_store_open(p_store_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_timezone VARCHAR;
  v_day_of_week INTEGER;
  v_current_time TIME;
  v_open_time TIME;
  v_close_time TIME;
  v_closed BOOLEAN;
  v_is_holiday BOOLEAN;
BEGIN
  -- Get store timezone
  SELECT timezone INTO v_timezone FROM stores WHERE id = p_store_id;

  IF v_timezone IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get current day and time in store's timezone
  v_day_of_week := EXTRACT(DOW FROM NOW() AT TIME ZONE v_timezone)::INTEGER;
  v_current_time := (NOW() AT TIME ZONE v_timezone)::TIME;

  -- Check if today is a holiday
  SELECT EXISTS(
    SELECT 1 FROM store_holiday_hours
    WHERE store_id = p_store_id
      AND holiday_date = (NOW() AT TIME ZONE v_timezone)::DATE
  ) INTO v_is_holiday;

  IF v_is_holiday THEN
    -- Check holiday hours
    SELECT closed, open_time, close_time INTO v_closed, v_open_time, v_close_time
    FROM store_holiday_hours
    WHERE store_id = p_store_id
      AND holiday_date = (NOW() AT TIME ZONE v_timezone)::DATE;
  ELSE
    -- Check regular hours
    SELECT closed, open_time, close_time INTO v_closed, v_open_time, v_close_time
    FROM store_hours
    WHERE store_id = p_store_id
      AND day_of_week = v_day_of_week;
  END IF;

  IF v_closed THEN
    RETURN false;
  END IF;

  IF v_open_time IS NULL OR v_close_time IS NULL THEN
    RETURN NULL;
  END IF;

  -- Handle stores that close after midnight
  IF v_open_time < v_close_time THEN
    RETURN v_current_time >= v_open_time AND v_current_time < v_close_time;
  ELSE
    RETURN v_current_time >= v_open_time OR v_current_time < v_close_time;
  END IF;
END;
$$ LANGUAGE plpgsql;
