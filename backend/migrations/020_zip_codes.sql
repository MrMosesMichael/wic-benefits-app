-- Migration 020: Zip Codes table for location resolution
-- Source: US Census ZCTA (Zip Code Tabulation Areas)
-- Used for GPS→state detection and zip code→coordinates resolution

CREATE TABLE IF NOT EXISTS zip_codes (
  zip VARCHAR(5) PRIMARY KEY,
  lat DECIMAL(8, 5) NOT NULL,
  lng DECIMAL(8, 5) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL
);

-- Index for nearest-neighbor lookups (state detection from GPS coords)
CREATE INDEX IF NOT EXISTS idx_zip_codes_lat_lng ON zip_codes (lat, lng);

-- Index for state lookups
CREATE INDEX IF NOT EXISTS idx_zip_codes_state ON zip_codes (state);
