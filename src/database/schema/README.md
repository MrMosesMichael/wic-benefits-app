# APL Database Schema Documentation

## Overview

The APL (Approved Product List) schema stores WIC product eligibility data across multiple states. It supports:

- Multi-state product eligibility tracking
- Complex restriction rules (size, brand, nutrition)
- Temporal validity (effective/expiration dates)
- Data provenance and quality tracking
- Change detection and audit logging
- UPC format normalization

## Schema Design Principles

1. **State Independence**: Each state maintains its own APL entries
2. **Temporal Validity**: Track when products become/cease to be eligible
3. **Flexible Restrictions**: JSONB for state-specific rules
4. **Change Tracking**: Full audit trail of APL modifications
5. **Data Quality**: Verification flags and data source tracking
6. **Performance**: Optimized indexes for common queries

## Core Tables

### `apl_entries`

Primary table storing WIC product eligibility.

**Key Fields:**
- `state`: 2-letter state code (MI, NC, FL, OR, etc.)
- `upc`: Normalized 12-digit UPC code
- `eligible`: Boolean eligibility flag
- `benefit_category`: Primary category (Milk, Cereal, Formula, etc.)
- `participant_types`: Array of participant types who can purchase
- `size_restriction`: JSONB size rules (min/max/exact)
- `brand_restriction`: JSONB brand rules (allowed/excluded/contract)
- `effective_date`: When eligibility starts
- `expiration_date`: When eligibility ends (NULL = no expiration)
- `data_source`: Origin (fis, conduent, state, manual, usda)
- `verified`: Manual verification flag

**Indexes:**
- `(state, upc)`: Primary lookup path
- `benefit_category`: Category browsing
- `effective_date`: Temporal queries
- Current entries filter: `expiration_date IS NULL OR > NOW()`
- GIN indexes on JSONB fields for restriction queries

**Example Entry:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "state": "MI",
  "upc": "011110416605",
  "eligible": true,
  "benefit_category": "Cereal",
  "benefit_subcategory": "WIC Approved Cereal",
  "participant_types": ["pregnant", "postpartum", "breastfeeding", "child"],
  "size_restriction": {
    "minSize": 12,
    "maxSize": 18,
    "unit": "oz"
  },
  "brand_restriction": null,
  "additional_restrictions": {
    "wholeGrainRequired": true,
    "maxSugarGrams": 6
  },
  "effective_date": "2024-01-01T00:00:00Z",
  "expiration_date": null,
  "data_source": "fis",
  "verified": true
}
```

### `apl_sync_status`

Tracks APL synchronization health for each state/source.

**Use Cases:**
- Monitor sync failures and staleness
- Alert when data becomes outdated
- Track sync metrics (additions/updates/removals)

**Key Fields:**
- `state`: State code
- `data_source`: Data source (fis, conduent, etc.)
- `last_sync_at`: Last successful sync timestamp
- `last_sync_status`: success, failure, partial, pending
- `consecutive_failures`: Failure count (triggers alerts)
- `entries_added/updated/removed`: Change metrics
- `current_source_hash`: Detect source file changes

**Example Query:**
```sql
-- Find states with stale data (>24 hours)
SELECT state, data_source, last_sync_at
FROM apl_sync_status
WHERE last_sync_at < NOW() - INTERVAL '24 hours'
  OR last_sync_status = 'failure';
```

### `apl_change_log`

Audit trail of APL changes over time.

**Use Cases:**
- Track product additions/removals
- Notify users of changes to their benefits
- Analyze APL evolution
- Debug data issues

**Key Fields:**
- `change_type`: added, removed, modified, reinstated
- `previous_entry`: JSONB snapshot of old data
- `new_entry`: JSONB snapshot of new data
- `detected_at`: When change was detected
- `effective_at`: When change takes effect

**Example Query:**
```sql
-- Recent changes to infant formula in Michigan
SELECT upc, change_type, detected_at
FROM apl_change_log
WHERE state = 'MI'
  AND new_entry->>'benefitCategory' = 'Infant Formula'
  AND detected_at > NOW() - INTERVAL '7 days'
ORDER BY detected_at DESC;
```

### `state_benefit_categories`

Maps canonical category names to state-specific labels.

**Purpose:**
- Different states use different terminology
- Maintain consistent internal naming
- Support display in state-specific language

**Example:**
```sql
INSERT INTO state_benefit_categories (state, canonical_name, state_label, sort_order)
VALUES
  ('MI', 'milk_whole', 'Whole Milk', 1),
  ('MI', 'milk_reduced_fat', '2% Milk', 2),
  ('NC', 'milk_whole', 'Milk - Whole', 1),
  ('NC', 'milk_reduced_fat', 'Milk - 2% or Reduced Fat', 2);
```

### `upc_variants`

UPC normalization lookup table.

**Purpose:**
- Cache normalized UPC variants
- Fast lookup without re-computing normalization
- Handle UPC-A, UPC-E, EAN-13 variations

**Example:**
```sql
SELECT * FROM upc_variants WHERE original = '11110416605';
-- Returns: upc12='011110416605', ean13='0011110416605', trimmed='11110416605'
```

## Views

### `apl_entries_current`

Pre-filtered view of currently-valid APL entries.

```sql
CREATE VIEW apl_entries_current AS
SELECT *
FROM apl_entries
WHERE (expiration_date IS NULL OR expiration_date > NOW())
  AND effective_date <= NOW();
```

**Use Case:** Most common query pattern (only care about current eligibility)

### `apl_sync_health`

Dashboard view of sync status across all states.

```sql
SELECT * FROM apl_sync_health WHERE health_status = 'critical';
```

**Returns:**
- `state`, `data_source`
- `hours_since_sync`
- `health_status`: healthy, warning, critical

### `apl_recent_changes`

Last 30 days of APL changes.

```sql
SELECT * FROM apl_recent_changes WHERE state = 'OR' LIMIT 20;
```

## Functions

### `normalize_upc(upc_input TEXT)`

Normalizes UPC to standard formats.

**Returns:**
- `upc12`: 12-digit UPC-A
- `ean13`: 13-digit EAN-13
- `trimmed`: Without leading zeros
- `check_digit`: Last digit
- `is_valid`: Boolean validation

**Example:**
```sql
SELECT * FROM normalize_upc('11110416605');
-- Returns: upc12='011110416605', ean13='0011110416605', trimmed='11110416605', check_digit='5', is_valid=true
```

### `lookup_apl_by_upc(p_upc, p_state, p_as_of_date)`

Intelligent UPC lookup with automatic variant matching.

**Parameters:**
- `p_upc`: UPC to search (any format)
- `p_state`: State code
- `p_as_of_date`: Point-in-time query (default: NOW())

**Returns:** Matching APL entry or NULL

**Example:**
```sql
-- Find entry for Cheerios in Michigan (works with any UPC variant)
SELECT * FROM lookup_apl_by_upc('11110416605', 'MI', NOW());
SELECT * FROM lookup_apl_by_upc('011110416605', 'MI', NOW()); -- Same result
SELECT * FROM lookup_apl_by_upc('0011110416605', 'MI', NOW()); -- Same result
```

## Common Queries

### Check Product Eligibility

```sql
-- Is this UPC eligible in Florida?
SELECT eligible, benefit_category, size_restriction
FROM lookup_apl_by_upc('011110416605', 'FL', NOW());
```

### Find All Products in Category

```sql
-- All cereals eligible in North Carolina
SELECT upc, benefit_subcategory, size_restriction
FROM apl_entries_current
WHERE state = 'NC'
  AND benefit_category = 'Cereal'
ORDER BY benefit_subcategory;
```

### Find Products for Participant Type

```sql
-- All products available to infants in Oregon
SELECT benefit_category, COUNT(*) as product_count
FROM apl_entries_current
WHERE state = 'OR'
  AND 'infant' = ANY(participant_types)
GROUP BY benefit_category
ORDER BY product_count DESC;
```

### Track Changes Over Time

```sql
-- Products added to Michigan APL this month
SELECT upc, new_entry->>'benefitCategory' as category, detected_at
FROM apl_change_log
WHERE state = 'MI'
  AND change_type = 'added'
  AND detected_at >= DATE_TRUNC('month', NOW())
ORDER BY detected_at DESC;
```

### Find Contract Brands (Formula)

```sql
-- Current contract infant formula brands by state
SELECT
  state,
  brand_restriction->>'contractBrand' as brand,
  brand_restriction->>'contractStartDate' as start_date,
  brand_restriction->>'contractEndDate' as end_date
FROM apl_entries_current
WHERE benefit_category = 'Infant Formula'
  AND brand_restriction->>'contractBrand' IS NOT NULL
ORDER BY state;
```

## Data Sources

### Michigan (FIS)

- **Format:** Excel (.xlsx)
- **Update Frequency:** Monthly (public), Daily (vendor portal)
- **Source:** https://www.michigan.gov/mdhhs

### North Carolina (Conduent)

- **Format:** Web/FTP
- **Update Frequency:** Rolling updates
- **Source:** https://www.ncdhhs.gov/ncwicfoods

### Florida (FIS)

- **Format:** PDF
- **Update Frequency:** Phased rollout (Oct 2025 - Mar 2026)
- **Source:** https://www.floridahealth.gov/programs-and-services/wic

### Oregon (State)

- **Format:** Excel (.xlsx)
- **Update Frequency:** Quarterly major, ongoing minor
- **Source:** https://www.oregon.gov/oha/ph/healthypeoplefamilies/wic

## Performance Optimization

### Most Common Query Pattern

```sql
-- This query is heavily optimized with specialized index
SELECT * FROM apl_entries
WHERE state = 'MI'
  AND upc = '011110416605'
  AND (expiration_date IS NULL OR expiration_date > NOW());

-- Uses index: idx_apl_entries_current
```

### Batch Lookups

```sql
-- Lookup multiple UPCs at once
SELECT upc, eligible, benefit_category
FROM apl_entries_current
WHERE state = 'NC'
  AND upc = ANY(ARRAY['011110416605', '041220676507', '051000012081']);
```

### Category Browsing

```sql
-- Fast category enumeration
SELECT DISTINCT benefit_category, COUNT(*) as product_count
FROM apl_entries_current
WHERE state = 'FL'
GROUP BY benefit_category
ORDER BY product_count DESC;

-- Uses index: idx_apl_entries_category
```

## Maintenance

### Cleanup Old Change Logs

```sql
-- Archive or delete change logs older than 2 years
DELETE FROM apl_change_log
WHERE detected_at < NOW() - INTERVAL '2 years';
```

### Vacuum and Analyze

```sql
-- Periodic maintenance for optimal performance
VACUUM ANALYZE apl_entries;
VACUUM ANALYZE apl_change_log;
```

### Monitor Index Usage

```sql
-- Check if indexes are being used
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename LIKE 'apl_%'
ORDER BY idx_scan DESC;
```

## Migration Path

### Initial Setup

1. Create schema: `psql -f apl.schema.sql`
2. Insert state benefit categories
3. Run initial APL data ingestion
4. Verify data with sample queries

### Updates

1. Check sync status: `SELECT * FROM apl_sync_health`
2. Run sync worker (A1.3 task)
3. Review changes: `SELECT * FROM apl_recent_changes LIMIT 50`
4. Update `apl_sync_status` table

## Next Steps

- **A1.3**: Build Michigan APL ingestion (FIS processor)
- **A1.4**: Build North Carolina APL ingestion (Conduent)
- **A1.5**: Build Florida APL ingestion (FIS)
- **A1.6**: Build Oregon APL ingestion (state-specific)
- **A1.7**: Design state eligibility rules engine
- **A1.8**: Create APL update monitoring and sync jobs
