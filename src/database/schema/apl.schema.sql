-- APL (Approved Product List) Database Schema
-- Supports multi-state WIC product eligibility tracking
-- Priority states: Michigan, North Carolina, Florida, Oregon

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Participant types for WIC eligibility
CREATE TYPE participant_type AS ENUM (
  'pregnant',
  'postpartum',
  'breastfeeding',
  'infant',
  'child'
);

-- Data source tracking
CREATE TYPE apl_data_source AS ENUM (
  'fis',        -- FIS processor (Michigan, Florida)
  'conduent',   -- Conduent processor (North Carolina)
  'state',      -- State-specific system (Oregon)
  'manual',     -- Manually entered
  'usda'        -- USDA National UPC Database
);

-- Sync status values
CREATE TYPE sync_status AS ENUM (
  'success',
  'failure',
  'partial',
  'pending'
);

-- Change log types
CREATE TYPE change_type AS ENUM (
  'added',
  'removed',
  'modified',
  'reinstated'
);

-- Size units
CREATE TYPE size_unit AS ENUM (
  'oz',   -- Ounces (fluid or weight)
  'lb',   -- Pounds
  'gal',  -- Gallons
  'qt',   -- Quarts
  'pt',   -- Pints
  'ml',   -- Milliliters
  'l',    -- Liters
  'g',    -- Grams
  'kg',   -- Kilograms
  'ct',   -- Count
  'doz'   -- Dozen
);

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- APL Entries: Core product eligibility data
CREATE TABLE apl_entries (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- State and UPC identification
  state VARCHAR(2) NOT NULL,  -- State code (MI, NC, FL, OR, etc.)
  upc VARCHAR(14) NOT NULL,    -- Universal Product Code (normalized)

  -- Eligibility
  eligible BOOLEAN NOT NULL DEFAULT true,
  benefit_category VARCHAR(100) NOT NULL,
  benefit_subcategory VARCHAR(100),

  -- Participant targeting
  participant_types participant_type[],

  -- Size restrictions (JSONB for flexibility)
  size_restriction JSONB,
  -- Example: {
  --   "minSize": 8,
  --   "maxSize": 16,
  --   "exactSize": null,
  --   "unit": "oz",
  --   "allowedSizes": [12, 18]
  -- }

  -- Brand restrictions (JSONB for flexibility)
  brand_restriction JSONB,
  -- Example: {
  --   "allowedBrands": ["Kroger", "Great Value"],
  --   "excludedBrands": [],
  --   "contractBrand": null,
  --   "contractStartDate": null,
  --   "contractEndDate": null
  -- }

  -- Additional restrictions (JSONB for state-specific rules)
  additional_restrictions JSONB,
  -- Example: {
  --   "wholeGrainRequired": true,
  --   "maxSugarGrams": 6,
  --   "maxSodiumMg": 230,
  --   "organicRequired": false,
  --   "noArtificialDyes": true,
  --   "lowFatRequired": false,
  --   "fortificationRequired": ["Vitamin D"],
  --   "restrictionNotes": "Must be whole wheat"
  -- }

  -- Temporal validity
  effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
  expiration_date TIMESTAMP WITH TIME ZONE,

  -- Metadata
  notes TEXT,
  data_source apl_data_source NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  verified BOOLEAN NOT NULL DEFAULT false,
  source_hash VARCHAR(64),  -- SHA-256 hash of source data

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT upc_length_check CHECK (LENGTH(upc) BETWEEN 8 AND 14),
  CONSTRAINT date_logic_check CHECK (
    expiration_date IS NULL OR expiration_date > effective_date
  )
);

-- Indexes for efficient querying
CREATE INDEX idx_apl_entries_state_upc ON apl_entries(state, upc);
CREATE INDEX idx_apl_entries_upc ON apl_entries(upc);
CREATE INDEX idx_apl_entries_state ON apl_entries(state);
CREATE INDEX idx_apl_entries_category ON apl_entries(benefit_category);
CREATE INDEX idx_apl_entries_effective_date ON apl_entries(effective_date);
CREATE INDEX idx_apl_entries_data_source ON apl_entries(data_source);
CREATE INDEX idx_apl_entries_verified ON apl_entries(verified);

-- GIN index for JSONB fields (enables fast queries on restrictions)
CREATE INDEX idx_apl_entries_size_restriction ON apl_entries USING GIN (size_restriction);
CREATE INDEX idx_apl_entries_brand_restriction ON apl_entries USING GIN (brand_restriction);
CREATE INDEX idx_apl_entries_additional_restrictions ON apl_entries USING GIN (additional_restrictions);

-- Index for currently-valid entries (most common query)
CREATE INDEX idx_apl_entries_current ON apl_entries(state, upc)
  WHERE expiration_date IS NULL OR expiration_date > NOW();

-- Full-text search index on category and notes
CREATE INDEX idx_apl_entries_text_search ON apl_entries
  USING GIN (to_tsvector('english', benefit_category || ' ' || COALESCE(benefit_subcategory, '') || ' ' || COALESCE(notes, '')));

-- ============================================================================
-- APL Sync Status: Track data freshness and sync health
-- ============================================================================

CREATE TABLE apl_sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification
  state VARCHAR(2) NOT NULL,
  data_source apl_data_source NOT NULL,

  -- Sync timing
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  next_sync_at TIMESTAMP WITH TIME ZONE,

  -- Sync status
  last_sync_status sync_status NOT NULL DEFAULT 'pending',
  last_sync_error TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,

  -- Sync metrics
  entries_processed INTEGER,
  entries_added INTEGER,
  entries_updated INTEGER,
  entries_removed INTEGER,

  -- Change detection
  current_source_hash VARCHAR(64),
  previous_source_hash VARCHAR(64),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Unique constraint: one status record per state/source combo
  CONSTRAINT unique_state_source UNIQUE (state, data_source)
);

-- Indexes
CREATE INDEX idx_apl_sync_status_state ON apl_sync_status(state);
CREATE INDEX idx_apl_sync_status_last_sync ON apl_sync_status(last_sync_at);
CREATE INDEX idx_apl_sync_status_next_sync ON apl_sync_status(next_sync_at);
CREATE INDEX idx_apl_sync_status_failures ON apl_sync_status(consecutive_failures)
  WHERE consecutive_failures > 0;

-- ============================================================================
-- APL Change Log: Audit trail of changes
-- ============================================================================

CREATE TABLE apl_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification
  state VARCHAR(2) NOT NULL,
  upc VARCHAR(14) NOT NULL,
  change_type change_type NOT NULL,

  -- Change details (JSONB for flexibility)
  previous_entry JSONB,  -- Snapshot of previous APL entry
  new_entry JSONB,       -- Snapshot of new APL entry

  -- Metadata
  data_source apl_data_source NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  effective_at TIMESTAMP WITH TIME ZONE,
  change_reason TEXT,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT upc_length_check CHECK (LENGTH(upc) BETWEEN 8 AND 14)
);

-- Indexes
CREATE INDEX idx_apl_change_log_state_upc ON apl_change_log(state, upc);
CREATE INDEX idx_apl_change_log_detected_at ON apl_change_log(detected_at DESC);
CREATE INDEX idx_apl_change_log_change_type ON apl_change_log(change_type);
CREATE INDEX idx_apl_change_log_state ON apl_change_log(state);

-- ============================================================================
-- State Benefit Categories: Category name mappings
-- ============================================================================

CREATE TABLE state_benefit_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification
  state VARCHAR(2) NOT NULL,
  canonical_name VARCHAR(100) NOT NULL,  -- Internal canonical name
  state_label VARCHAR(100) NOT NULL,     -- State-specific display label

  -- Metadata
  aliases TEXT[],  -- Alternative names/spellings
  icon VARCHAR(50),
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Unique constraint: one canonical name per state
  CONSTRAINT unique_state_canonical UNIQUE (state, canonical_name)
);

-- Indexes
CREATE INDEX idx_state_benefit_categories_state ON state_benefit_categories(state);
CREATE INDEX idx_state_benefit_categories_canonical ON state_benefit_categories(canonical_name);

-- ============================================================================
-- UPC Variants: UPC normalization lookup table
-- ============================================================================

CREATE TABLE upc_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Original UPC as seen in source data
  original VARCHAR(14) NOT NULL UNIQUE,

  -- Normalized variants
  upc12 VARCHAR(12) NOT NULL,   -- 12-digit UPC-A
  ean13 VARCHAR(13) NOT NULL,   -- 13-digit EAN-13
  trimmed VARCHAR(14) NOT NULL, -- Without leading zeros
  check_digit CHAR(1) NOT NULL,

  -- Validation
  is_valid BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for fast UPC lookups
CREATE INDEX idx_upc_variants_original ON upc_variants(original);
CREATE INDEX idx_upc_variants_upc12 ON upc_variants(upc12);
CREATE INDEX idx_upc_variants_ean13 ON upc_variants(ean13);
CREATE INDEX idx_upc_variants_trimmed ON upc_variants(trimmed);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Current APL entries (only currently-valid entries)
CREATE VIEW apl_entries_current AS
SELECT *
FROM apl_entries
WHERE (expiration_date IS NULL OR expiration_date > NOW())
  AND effective_date <= NOW();

-- View: APL sync health dashboard
CREATE VIEW apl_sync_health AS
SELECT
  state,
  data_source,
  last_sync_at,
  last_sync_status,
  consecutive_failures,
  EXTRACT(EPOCH FROM (NOW() - last_sync_at))/3600 AS hours_since_sync,
  CASE
    WHEN last_sync_status = 'success' AND consecutive_failures = 0
      AND last_sync_at > NOW() - INTERVAL '24 hours' THEN 'healthy'
    WHEN last_sync_status = 'success' AND consecutive_failures = 0
      AND last_sync_at > NOW() - INTERVAL '7 days' THEN 'warning'
    ELSE 'critical'
  END AS health_status
FROM apl_sync_status
ORDER BY state, data_source;

-- View: Recent changes (last 30 days)
CREATE VIEW apl_recent_changes AS
SELECT
  state,
  upc,
  change_type,
  data_source,
  detected_at,
  effective_at,
  new_entry->>'benefitCategory' AS category,
  new_entry->>'benefitSubcategory' AS subcategory
FROM apl_change_log
WHERE detected_at > NOW() - INTERVAL '30 days'
ORDER BY detected_at DESC;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers: Auto-update updated_at
CREATE TRIGGER update_apl_entries_updated_at
  BEFORE UPDATE ON apl_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apl_sync_status_updated_at
  BEFORE UPDATE ON apl_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_state_benefit_categories_updated_at
  BEFORE UPDATE ON state_benefit_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upc_variants_updated_at
  BEFORE UPDATE ON upc_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Normalize UPC to standard format
CREATE OR REPLACE FUNCTION normalize_upc(upc_input TEXT)
RETURNS TABLE (
  upc12 VARCHAR(12),
  ean13 VARCHAR(13),
  trimmed VARCHAR(14),
  check_digit CHAR(1),
  is_valid BOOLEAN
) AS $$
DECLARE
  cleaned TEXT;
  len INTEGER;
BEGIN
  -- Remove non-numeric characters
  cleaned := REGEXP_REPLACE(upc_input, '[^0-9]', '', 'g');
  len := LENGTH(cleaned);

  -- Validate length
  IF len NOT BETWEEN 8 AND 14 THEN
    RETURN QUERY SELECT NULL::VARCHAR(12), NULL::VARCHAR(13), NULL::VARCHAR(14), NULL::CHAR(1), false;
    RETURN;
  END IF;

  -- Pad to 12 digits for UPC-A
  upc12 := LPAD(cleaned, 12, '0');

  -- Convert to EAN-13 (add leading 0)
  ean13 := '0' || upc12;

  -- Trimmed version (no leading zeros)
  trimmed := LTRIM(cleaned, '0');
  IF trimmed = '' THEN
    trimmed := '0';
  END IF;

  -- Extract check digit (last digit)
  check_digit := RIGHT(cleaned, 1);

  -- Basic validation (length check passed)
  is_valid := true;

  RETURN QUERY SELECT upc12, ean13, trimmed, check_digit, is_valid;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Lookup APL entry by UPC with variants
CREATE OR REPLACE FUNCTION lookup_apl_by_upc(
  p_upc TEXT,
  p_state VARCHAR(2),
  p_as_of_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  id UUID,
  state VARCHAR(2),
  upc VARCHAR(14),
  eligible BOOLEAN,
  benefit_category VARCHAR(100),
  benefit_subcategory VARCHAR(100),
  participant_types participant_type[],
  size_restriction JSONB,
  brand_restriction JSONB,
  additional_restrictions JSONB,
  effective_date TIMESTAMP WITH TIME ZONE,
  expiration_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  data_source apl_data_source,
  last_updated TIMESTAMP WITH TIME ZONE,
  verified BOOLEAN
) AS $$
DECLARE
  normalized RECORD;
BEGIN
  -- Normalize the input UPC
  SELECT * INTO normalized FROM normalize_upc(p_upc);

  -- Search for APL entries using all variants
  RETURN QUERY
  SELECT
    a.id,
    a.state,
    a.upc,
    a.eligible,
    a.benefit_category,
    a.benefit_subcategory,
    a.participant_types,
    a.size_restriction,
    a.brand_restriction,
    a.additional_restrictions,
    a.effective_date,
    a.expiration_date,
    a.notes,
    a.data_source,
    a.last_updated,
    a.verified
  FROM apl_entries a
  WHERE a.state = p_state
    AND (
      a.upc = normalized.upc12 OR
      a.upc = normalized.ean13 OR
      a.upc = normalized.trimmed OR
      a.upc = p_upc
    )
    AND a.effective_date <= p_as_of_date
    AND (a.expiration_date IS NULL OR a.expiration_date > p_as_of_date)
  ORDER BY a.verified DESC, a.last_updated DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE apl_entries IS 'WIC Approved Product List entries by state';
COMMENT ON TABLE apl_sync_status IS 'Tracks APL data synchronization status and health';
COMMENT ON TABLE apl_change_log IS 'Audit log of APL changes over time';
COMMENT ON TABLE state_benefit_categories IS 'Maps canonical benefit categories to state-specific labels';
COMMENT ON TABLE upc_variants IS 'UPC normalization lookup table for handling UPC format variations';

COMMENT ON COLUMN apl_entries.upc IS 'Normalized UPC (12-14 digits)';
COMMENT ON COLUMN apl_entries.size_restriction IS 'JSONB: minSize, maxSize, exactSize, unit, allowedSizes';
COMMENT ON COLUMN apl_entries.brand_restriction IS 'JSONB: allowedBrands, excludedBrands, contractBrand, contractStartDate, contractEndDate';
COMMENT ON COLUMN apl_entries.additional_restrictions IS 'JSONB: wholeGrainRequired, maxSugarGrams, maxSodiumMg, organicRequired, noArtificialDyes, etc.';
COMMENT ON COLUMN apl_entries.source_hash IS 'SHA-256 hash of source data for change detection';

COMMENT ON FUNCTION normalize_upc(TEXT) IS 'Normalize UPC to standard formats (UPC-A 12-digit, EAN-13, trimmed)';
COMMENT ON FUNCTION lookup_apl_by_upc(TEXT, VARCHAR, TIMESTAMP WITH TIME ZONE) IS 'Lookup APL entry by UPC with automatic variant matching';
