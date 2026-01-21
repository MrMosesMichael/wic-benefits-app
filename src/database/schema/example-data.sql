-- APL Schema Example Data
-- Sample entries demonstrating various restriction types and edge cases

-- ============================================================================
-- State Benefit Categories
-- ============================================================================

INSERT INTO state_benefit_categories (state, canonical_name, state_label, aliases, icon, sort_order) VALUES
  -- Michigan
  ('MI', 'milk_whole', 'Whole Milk', ARRAY['Full Fat Milk'], 'milk', 1),
  ('MI', 'milk_reduced_fat', '2% Milk', ARRAY['Reduced Fat Milk'], 'milk', 2),
  ('MI', 'milk_low_fat', '1% Milk', ARRAY['Low Fat Milk'], 'milk', 3),
  ('MI', 'milk_nonfat', 'Skim Milk', ARRAY['Fat Free Milk'], 'milk', 4),
  ('MI', 'cereal', 'Cereal', ARRAY['Breakfast Cereal'], 'cereal', 5),
  ('MI', 'infant_formula', 'Infant Formula', ARRAY['Baby Formula'], 'baby-bottle', 6),
  ('MI', 'eggs', 'Eggs', ARRAY[], 'egg', 7),
  ('MI', 'cheese', 'Cheese', ARRAY[], 'cheese', 8),
  ('MI', 'yogurt', 'Yogurt', ARRAY[], 'yogurt', 9),
  ('MI', 'peanut_butter', 'Peanut Butter', ARRAY['PB'], 'jar', 10),

  -- North Carolina
  ('NC', 'milk_whole', 'Milk - Whole', ARRAY['Whole Milk'], 'milk', 1),
  ('NC', 'milk_reduced_fat', 'Milk - 2% or Reduced Fat', ARRAY['2% Milk'], 'milk', 2),
  ('NC', 'milk_low_fat', 'Milk - 1% or Low Fat', ARRAY['1% Milk'], 'milk', 3),
  ('NC', 'milk_nonfat', 'Milk - Fat Free', ARRAY['Skim Milk'], 'milk', 4),
  ('NC', 'cereal', 'WIC Approved Cereal', ARRAY['Cereal'], 'cereal', 5),
  ('NC', 'infant_formula', 'Contract Infant Formula', ARRAY['Formula'], 'baby-bottle', 6),

  -- Florida
  ('FL', 'milk_whole', 'Whole Milk', ARRAY[], 'milk', 1),
  ('FL', 'cereal', 'Cereal (No Artificial Dyes)', ARRAY['Cereal'], 'cereal', 2),
  ('FL', 'infant_formula', 'Contract Formula', ARRAY[], 'baby-bottle', 3),

  -- Oregon
  ('OR', 'milk_whole', 'Milk, Whole', ARRAY[], 'milk', 1),
  ('OR', 'cereal', 'Cereal, WIC Eligible', ARRAY[], 'cereal', 2),
  ('OR', 'infant_formula', 'Infant Formula (Contract)', ARRAY[], 'baby-bottle', 3);

-- ============================================================================
-- APL Entries - Cereal Examples
-- ============================================================================

-- Cheerios Original - Simple cereal example
INSERT INTO apl_entries (
  state, upc, eligible, benefit_category, benefit_subcategory,
  participant_types, size_restriction, effective_date,
  data_source, verified, notes
) VALUES (
  'MI',
  '011110416605',
  true,
  'Cereal',
  'WIC Approved Cereal',
  ARRAY['pregnant', 'postpartum', 'breastfeeding', 'child']::participant_type[],
  '{"minSize": 8.9, "maxSize": 36, "unit": "oz"}'::jsonb,
  '2024-01-01 00:00:00-05',
  'fis',
  true,
  'Must be whole grain cereal with ≤6g sugar per serving'
);

-- Cheerios in North Carolina (different size limits)
INSERT INTO apl_entries (
  state, upc, eligible, benefit_category, benefit_subcategory,
  participant_types, size_restriction, additional_restrictions,
  effective_date, data_source, verified
) VALUES (
  'NC',
  '011110416605',
  true,
  'WIC Approved Cereal',
  'Whole Grain Cereal',
  ARRAY['pregnant', 'postpartum', 'breastfeeding', 'child']::participant_type[],
  '{"minSize": 12, "maxSize": 24, "unit": "oz"}'::jsonb,
  '{"wholeGrainRequired": true, "maxSugarGrams": 6}'::jsonb,
  '2025-01-01 00:00:00-05',
  'conduent',
  true
);

-- Frosted Flakes - NOT eligible (too much sugar)
INSERT INTO apl_entries (
  state, upc, eligible, benefit_category,
  effective_date, data_source, verified, notes
) VALUES (
  'MI',
  '038000045301',
  false,
  'Cereal',
  '2024-01-01 00:00:00-05',
  'fis',
  true,
  'Ineligible: Exceeds maximum sugar content (>6g per serving)'
);

-- ============================================================================
-- APL Entries - Milk Examples
-- ============================================================================

-- Kroger 1% Milk - Half gallon
INSERT INTO apl_entries (
  state, upc, eligible, benefit_category, benefit_subcategory,
  participant_types, size_restriction, brand_restriction,
  effective_date, data_source, verified
) VALUES (
  'MI',
  '001111089605',
  true,
  'Milk',
  '1% Milk',
  ARRAY['pregnant', 'postpartum', 'breastfeeding', 'child']::participant_type[],
  '{"exactSize": 0.5, "unit": "gal"}'::jsonb,
  '{"allowedBrands": ["Kroger", "Great Value", "Store Brand"]}'::jsonb,
  '2024-01-01 00:00:00-05',
  'fis',
  true
);

-- Whole Milk - Gallon (any brand)
INSERT INTO apl_entries (
  state, upc, eligible, benefit_category, benefit_subcategory,
  participant_types, size_restriction,
  effective_date, data_source, verified
) VALUES (
  'NC',
  '004122000016',
  true,
  'Milk - Whole',
  'Vitamin D Whole Milk',
  ARRAY['infant', 'child']::participant_type[],
  '{"exactSize": 1, "unit": "gal"}'::jsonb,
  '2025-01-01 00:00:00-05',
  'conduent',
  true
);

-- ============================================================================
-- APL Entries - Infant Formula Examples (Contract Brand)
-- ============================================================================

-- Similac Advance - Michigan contract formula (until Jan 31, 2026)
INSERT INTO apl_entries (
  state, upc, eligible, benefit_category, benefit_subcategory,
  participant_types, size_restriction, brand_restriction,
  effective_date, expiration_date, data_source, verified, notes
) VALUES (
  'MI',
  '070074649986',
  true,
  'Infant Formula',
  'Contract Formula - Powder',
  ARRAY['infant']::participant_type[],
  '{"allowedSizes": [12.4, 20.6, 30.8], "unit": "oz"}'::jsonb,
  '{
    "contractBrand": "Similac",
    "contractStartDate": "2024-02-01T00:00:00Z",
    "contractEndDate": "2026-01-31T23:59:59Z"
  }'::jsonb,
  '2024-02-01 00:00:00-05',
  '2026-01-31 23:59:59-05',
  'fis',
  true,
  'Contract brand formula - exact sizes required'
);

-- Enfamil - North Carolina contract formula
INSERT INTO apl_entries (
  state, upc, eligible, benefit_category, benefit_subcategory,
  participant_types, size_restriction, brand_restriction,
  effective_date, data_source, verified
) VALUES (
  'NC',
  '030063001946',
  true,
  'Contract Infant Formula',
  'Standard Infant Formula',
  ARRAY['infant']::participant_type[],
  '{"exactSize": 12.5, "unit": "oz"}'::jsonb,
  '{
    "contractBrand": "Enfamil",
    "contractStartDate": "2025-01-01T00:00:00Z"
  }'::jsonb,
  '2025-01-01 00:00:00-05',
  'conduent',
  true
);

-- Non-contract formula - NOT eligible when contract brand exists
INSERT INTO apl_entries (
  state, upc, eligible, benefit_category,
  effective_date, data_source, verified, notes
) VALUES (
  'MI',
  '071100122991',
  false,
  'Infant Formula',
  '2024-02-01 00:00:00-05',
  'fis',
  true,
  'Ineligible: Not contract brand (Similac is Michigan contract brand)'
);

-- ============================================================================
-- APL Entries - Eggs Example
-- ============================================================================

INSERT INTO apl_entries (
  state, upc, eligible, benefit_category,
  participant_types, size_restriction,
  effective_date, data_source, verified
) VALUES (
  'MI',
  '004122022823',
  true,
  'Eggs',
  ARRAY['pregnant', 'postpartum', 'breastfeeding', 'child']::participant_type[],
  '{"exactSize": 12, "unit": "ct"}'::jsonb,
  '2024-01-01 00:00:00-05',
  'fis',
  true
);

-- ============================================================================
-- APL Entries - Cheese Example with Brand Restrictions
-- ============================================================================

INSERT INTO apl_entries (
  state, upc, eligible, benefit_category, benefit_subcategory,
  participant_types, size_restriction, brand_restriction,
  effective_date, data_source, verified
) VALUES (
  'OR',
  '001111061415',
  true,
  'Cheese',
  'Block Cheese',
  ARRAY['pregnant', 'postpartum', 'breastfeeding', 'child']::participant_type[],
  '{"minSize": 8, "maxSize": 16, "unit": "oz"}'::jsonb,
  '{"excludedBrands": ["Velveeta", "Kraft Singles"]}'::jsonb,
  '2025-01-01 00:00:00-08',
  'state',
  true
);

-- ============================================================================
-- APL Entries - Florida Examples (No Artificial Dyes Policy)
-- ============================================================================

-- Cereal approved (no artificial dyes)
INSERT INTO apl_entries (
  state, upc, eligible, benefit_category,
  participant_types, size_restriction, additional_restrictions,
  effective_date, data_source, verified, notes
) VALUES (
  'FL',
  '011110416605',
  true,
  'Cereal (No Artificial Dyes)',
  ARRAY['pregnant', 'postpartum', 'breastfeeding', 'child']::participant_type[],
  '{"minSize": 12, "maxSize": 24, "unit": "oz"}'::jsonb,
  '{"noArtificialDyes": true, "wholeGrainRequired": true, "maxSugarGrams": 6}'::jsonb,
  '2025-10-01 00:00:00-04',
  'fis',
  true,
  'Florida policy effective Oct 2025: No artificial food dyes'
);

-- Cereal removed (contains artificial dyes)
INSERT INTO apl_entries (
  state, upc, eligible, benefit_category,
  effective_date, expiration_date, data_source, verified, notes
) VALUES (
  'FL',
  '016000275287',
  false,
  'Cereal',
  '2024-01-01 00:00:00-04',
  '2025-09-30 23:59:59-04',
  'fis',
  true,
  'Removed Oct 2025: Contains artificial food dyes (Yellow 5, Red 40)'
);

-- ============================================================================
-- APL Sync Status
-- ============================================================================

INSERT INTO apl_sync_status (
  state, data_source, last_sync_at, last_attempt_at,
  last_sync_status, consecutive_failures,
  entries_processed, entries_added, entries_updated, entries_removed,
  current_source_hash, next_sync_at
) VALUES
  ('MI', 'fis', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours',
   'success', 0, 4523, 12, 5, 3,
   'a1b2c3d4e5f6789012345678901234567890abcdef', NOW() + INTERVAL '18 hours'),

  ('NC', 'conduent', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours',
   'success', 0, 3891, 8, 2, 1,
   'b2c3d4e5f6789012345678901234567890abcdefa1', NOW() + INTERVAL '12 hours'),

  ('FL', 'fis', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days',
   'failure', 2, 0, 0, 0, 0,
   NULL, NOW() + INTERVAL '1 hour'),

  ('OR', 'state', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day',
   'success', 0, 5124, 156, 12, 8,
   'c3d4e5f6789012345678901234567890abcdefa1b2', NOW() + INTERVAL '6 days');

-- ============================================================================
-- APL Change Log
-- ============================================================================

-- Addition: New cereal added to Michigan APL
INSERT INTO apl_change_log (
  state, upc, change_type, new_entry, data_source, detected_at, effective_at
) VALUES (
  'MI',
  '016000419773',
  'added',
  '{
    "upc": "016000419773",
    "eligible": true,
    "benefitCategory": "Cereal",
    "benefitSubcategory": "WIC Approved Cereal",
    "sizeRestriction": {"minSize": 12, "maxSize": 18, "unit": "oz"}
  }'::jsonb,
  'fis',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
);

-- Removal: Product discontinued in North Carolina
INSERT INTO apl_change_log (
  state, upc, change_type, previous_entry, data_source, detected_at, change_reason
) VALUES (
  'NC',
  '074333412571',
  'removed',
  '{
    "upc": "074333412571",
    "eligible": true,
    "benefitCategory": "Yogurt",
    "notes": "Manufacturer discontinued product"
  }'::jsonb,
  'conduent',
  NOW() - INTERVAL '5 days',
  'Product discontinued by manufacturer'
);

-- Modification: Size restriction changed in Oregon
INSERT INTO apl_change_log (
  state, upc, change_type, previous_entry, new_entry, data_source, detected_at
) VALUES (
  'OR',
  '001111061415',
  'modified',
  '{
    "sizeRestriction": {"minSize": 6, "maxSize": 16, "unit": "oz"}
  }'::jsonb,
  '{
    "sizeRestriction": {"minSize": 8, "maxSize": 16, "unit": "oz"}
  }'::jsonb,
  'state',
  NOW() - INTERVAL '7 days'
);

-- Florida: Product removed due to artificial dyes policy
INSERT INTO apl_change_log (
  state, upc, change_type, previous_entry, new_entry, data_source, detected_at, effective_at, change_reason
) VALUES (
  'FL',
  '016000275287',
  'modified',
  '{
    "eligible": true,
    "benefitCategory": "Cereal"
  }'::jsonb,
  '{
    "eligible": false,
    "benefitCategory": "Cereal",
    "expirationDate": "2025-09-30T23:59:59Z"
  }'::jsonb,
  'fis',
  NOW() - INTERVAL '120 days',
  '2025-10-01 00:00:00-04',
  'Florida artificial dyes policy - product contains Yellow 5 and Red 40'
);

-- ============================================================================
-- UPC Variants
-- ============================================================================

INSERT INTO upc_variants (original, upc12, ean13, trimmed, check_digit, is_valid) VALUES
  ('11110416605', '011110416605', '0011110416605', '11110416605', '5', true),
  ('011110416605', '011110416605', '0011110416605', '11110416605', '5', true),
  ('0011110416605', '011110416605', '0011110416605', '11110416605', '5', true),
  ('4122000016', '004122000016', '0004122000016', '4122000016', '6', true),
  ('038000045301', '038000045301', '0038000045301', '38000045301', '1', true);

-- ============================================================================
-- Example Queries
-- ============================================================================

-- Query 1: Check if Cheerios is eligible in Michigan
-- SELECT * FROM lookup_apl_by_upc('11110416605', 'MI', NOW());

-- Query 2: All cereals in North Carolina
-- SELECT upc, benefit_subcategory, size_restriction
-- FROM apl_entries_current
-- WHERE state = 'NC' AND benefit_category LIKE '%Cereal%';

-- Query 3: Contract formula brands by state
-- SELECT state, brand_restriction->>'contractBrand' as brand
-- FROM apl_entries_current
-- WHERE benefit_category LIKE '%Formula%'
--   AND brand_restriction->>'contractBrand' IS NOT NULL;

-- Query 4: Recent changes in last 7 days
-- SELECT * FROM apl_recent_changes LIMIT 20;

-- Query 5: Sync health status
-- SELECT * FROM apl_sync_health;

-- Query 6: Products available to infants only
-- SELECT state, benefit_category, COUNT(*) as count
-- FROM apl_entries_current
-- WHERE participant_types = ARRAY['infant']::participant_type[]
-- GROUP BY state, benefit_category
-- ORDER BY state, count DESC;
