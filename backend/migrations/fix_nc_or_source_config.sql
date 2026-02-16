-- Fix NC and OR APL source config with correct URLs and column mappings
-- Run on VPS: docker compose exec -T backend psql $DATABASE_URL -f migrations/fix_nc_or_source_config.sql

-- NC: Fix URL (was pointing to HTML page) and add column mappings
UPDATE apl_source_config SET
  source_url = 'https://www.ncdhhs.gov/nc-wic-apl/open',
  file_format = 'xlsx',
  parser_config = '{"headerRow": 2, "columns": {"upc": "UPC", "product_name": "PRODUCT DESCRIPTION", "category": "CATEGORY", "subcategory": "SUBCATEGORY DESCRIPTION", "size": "UOM"}}'::jsonb,
  updated_at = CURRENT_TIMESTAMP
WHERE state = 'NC';

-- OR: Fix URL (was returning 404) and format, add column mappings
UPDATE apl_source_config SET
  source_url = 'https://www.oregon.gov/oha/PH/HEALTHYPEOPLEFAMILIES/WIC/Documents/fdnp/Oregon-APL.xls',
  file_format = 'xls',
  parser_config = '{"headerRow": 1, "columns": {"upc": "UPC PLU", "product_name": "Long Description", "brand": "Brand", "category": "Cat #", "subcategory": "Sub Cat Description", "size": "Units"}}'::jsonb,
  updated_at = CURRENT_TIMESTAMP
WHERE state = 'OR';

-- Verify
SELECT state, source_url, file_format, parser_config
FROM apl_source_config
WHERE state IN ('NC', 'OR');
