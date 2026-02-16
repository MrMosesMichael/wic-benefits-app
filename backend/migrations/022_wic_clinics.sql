-- Migration 022: WIC Clinics
-- GPS-based nearest WIC clinic search

CREATE TABLE IF NOT EXISTS wic_clinics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,

  -- Address
  street_address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  county VARCHAR(100),

  -- Coordinates
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Contact
  phone VARCHAR(20),
  website VARCHAR(255),
  appointment_url VARCHAR(255),

  -- Hours
  hours_json JSONB,
  hours_notes TEXT,

  -- Services and languages
  services TEXT[],
  languages TEXT[],

  -- Data source and freshness
  data_source VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  last_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX idx_wic_clinics_location ON wic_clinics(latitude, longitude);
CREATE INDEX idx_wic_clinics_state_city ON wic_clinics(state, city);
CREATE INDEX idx_wic_clinics_active ON wic_clinics(is_active);

-- Update trigger
CREATE OR REPLACE FUNCTION update_wic_clinics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_wic_clinics_updated_at
  BEFORE UPDATE ON wic_clinics
  FOR EACH ROW
  EXECUTE FUNCTION update_wic_clinics_updated_at();
