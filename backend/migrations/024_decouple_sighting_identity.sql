-- Migration 024: Decouple user identity from location-bearing sighting data
-- Moves user tracking to a separate audit table with hashed IDs and auto-expiry.
-- This improves privacy (location no longer linked to identity) while preserving
-- abuse prevention (rate-limiting via hashed device ID).

-- 1. Create audit log table (no location data, just hashed identity + reference)
CREATE TABLE IF NOT EXISTS sighting_audit_log (
  id SERIAL PRIMARY KEY,
  reporter_hash VARCHAR(64) NOT NULL,       -- SHA-256 of device ID (one-way)
  sighting_id INTEGER,                       -- references product_sightings(id), nullable
  report_type VARCHAR(20) NOT NULL DEFAULT 'sighting',  -- 'sighting' or 'inventory'
  store_id VARCHAR(100),
  upc VARCHAR(14),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL              -- auto-expire for data minimization
);

CREATE INDEX IF NOT EXISTS idx_audit_reporter_hash ON sighting_audit_log (reporter_hash);
CREATE INDEX IF NOT EXISTS idx_audit_expires_at ON sighting_audit_log (expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON sighting_audit_log (created_at);

-- 2. Anonymize all existing reported_by data in product_sightings
UPDATE product_sightings
SET reported_by = 'anonymous'
WHERE reported_by IS NOT NULL
  AND reported_by != 'anonymous'
  AND reported_by != 'deleted_user';

-- 3. Anonymize all existing user_id data in inventory_reports_log
UPDATE inventory_reports_log
SET user_id = 'anonymous'
WHERE user_id IS NOT NULL
  AND user_id != 'anonymous'
  AND user_id != 'deleted_user';
