# A1.4 Implementation Summary: North Carolina APL Ingestion (Conduent Processor)

**Task**: Build North Carolina APL ingestion (Conduent processor)
**Date**: January 20, 2026
**Status**: ✅ Complete

---

## What Was Built

### Core Service Files

1. **`north-carolina-ingestion.service.ts`** (648 lines)
   - Main ingestion service class
   - Handles Conduent data format variations
   - Supports both Excel and CSV formats (with fallback)
   - Complete ETL pipeline: Download → Parse → Transform → Validate → Store
   - Matches Michigan implementation pattern but adapted for Conduent

2. **`config/north-carolina.config.ts`** (176 lines)
   - Configuration constants and environment variables
   - Conduent-specific field mapping
   - Sync schedule (daily at 3 AM EST)
   - Validation rules and feature flags
   - Config validation functions

3. **`workers/north-carolina-sync-worker.ts`** (343 lines)
   - Background worker for automated syncing
   - Cron-based scheduling
   - Retry logic with exponential backoff
   - Status tracking and reporting
   - Graceful shutdown handling

4. **`cli/ingest-north-carolina.ts`** (226 lines)
   - Command-line tool for manual ingestion
   - Supports `--local`, `--url`, `--dry-run` flags
   - Comprehensive help and error messages
   - Database connection management

### Documentation

5. **`README-north-carolina.md`** (comprehensive guide)
   - Overview of Conduent processor
   - Data source information
   - Field mapping FIS vs Conduent
   - Configuration guide
   - Usage examples (programmatic, CLI, worker)
   - Testing instructions
   - Monitoring queries

6. **`examples/north-carolina-apl-example.ts`** (7 complete examples)
   - Basic ingestion
   - Local file ingestion
   - Service class usage
   - Sync worker usage
   - Configuration validation
   - Error handling
   - Data querying

7. **`IMPLEMENTATION-SUMMARY.md`** (this file)
   - Implementation overview
   - Architecture decisions
   - Key features

### Module Updates

8. **`index.ts`** (updated)
   - Exported North Carolina services
   - Updated `SUPPORTED_STATES` to mark NC as implemented
   - Re-exports all config, types, and functions

---

## Key Implementation Details

### Conduent Format Differences

The implementation handles Conduent's unique field naming:

| Data Element | Conduent Field | FIS Field |
|--------------|----------------|-----------|
| UPC | `UPC/PLU` | `UPC` |
| Description | `Item Description` | `Product Description` |
| Category | `Food Category` | `Category` |
| Size | `Container Size` | `Package Size` |
| Participants | `Eligible Participants` | `Participant Types` |
| Begin Date | `Begin Date` | `Effective Date` |
| End Date | `End Date` | `Expiration Date` |

### Data Processing Features

1. **Flexible File Format Support**
   - Primary: Excel (.xlsx)
   - Fallback: CSV parsing
   - Auto-detection and format switching

2. **Field Mapping**
   - Handles column name variations
   - Multiple field aliases checked
   - Graceful fallback to alternative names

3. **Participant Type Normalization**
   - "Pregnant" → `pregnant`
   - "Postpartum" / "PP" → `postpartum`
   - "Breastfeeding" / "BF" → `breastfeeding`
   - "Infant" / "Inf" → `infant`
   - "Child" / "Children" → `child`
   - "All" → All participant types

4. **Size Restriction Parsing**
   - Range format: `"8.9-36 oz"` → `{ minSize: 8.9, maxSize: 36, unit: 'oz' }`
   - Exact format: `"12 oz"` → `{ exactSize: 12, unit: 'oz' }`
   - Supports: oz, lb, gal, g, ml, l

5. **State-Specific Restrictions**
   - Whole grain requirements (cereal)
   - Sugar limits (from notes)
   - Low-fat requirements (NC-specific)

### Sync Worker Features

- **Scheduling**: Cron-based (daily at 3 AM EST by default)
- **Retry Logic**: 3 attempts with 5-second delays
- **Status Tracking**: Last run, success, failure timestamps
- **Alert System**: Triggers on 3+ consecutive failures
- **Graceful Shutdown**: SIGTERM/SIGINT handlers
- **Database Sync**: Updates `apl_sync_status` table

### CLI Tool Features

- `--local <path>`: Use local file instead of downloading
- `--url <url>`: Override download URL
- `--dry-run`: Parse and validate without saving to DB
- `--help`: Display usage information
- Progress logging with emojis (🚀 ✅ ❌)
- Detailed statistics output

---

## Architecture Decisions

### 1. Pattern Consistency with Michigan
- Followed Michigan implementation structure exactly
- Same service class patterns
- Same worker architecture
- Same CLI tool structure
- Makes it easy to add Florida (FIS) and Oregon later

### 2. Field Mapping Strategy
- Defined `CONDUENT_FIELD_MAPPING` constant
- Service checks multiple field name variations
- Allows Conduent to change field names without breaking

### 3. CSV Fallback
- Conduent may provide CSV instead of Excel
- Auto-detection tries Excel first, falls back to CSV
- Custom CSV parser handles quoted fields

### 4. Validation Strategy
- UPC normalization (same as Michigan)
- Check digit validation
- Category code validation
- Date parsing with multiple format support
- Sanitization before storage

### 5. Database Integration
- Uses same `apl_entries` table as Michigan
- `state = 'NC'` and `data_source = 'conduent'`
- Unique constraint on (state, upc, effective_date)
- Upsert logic (insert new, update existing)

---

## Testing Approach

### Manual Testing

```bash
# 1. Config validation (no DB required)
node src/examples/north-carolina-apl-example.ts 5

# 2. Dry run with local file
node src/services/apl/cli/ingest-north-carolina.ts \
  --local test-data/nc-apl-sample.xlsx \
  --dry-run

# 3. Actual ingestion
NORTH_CAROLINA_APL_DOWNLOAD_URL="https://..." \
DATABASE_URL="postgresql://..." \
node src/services/apl/cli/ingest-north-carolina.ts

# 4. Query results
node src/examples/north-carolina-apl-example.ts 7
```

### Test Data Format

Create `test-data/nc-apl-sample.csv`:

```csv
UPC/PLU,Item Description,Food Category,Sub Category,Container Size,Eligible Participants,Begin Date,End Date
012345678901,Test Milk,Milk,Whole Milk,1 gal,All,2024-01-01,
011110416605,General Mills Cheerios,Cereal,Ready-to-Eat,18 oz,Child,2024-01-01,
889497008245,Juicy Juice Apple,Juice,100% Juice,64 oz,All,2024-01-01,
```

---

## Files Created

```
src/
├── services/
│   └── apl/
│       ├── north-carolina-ingestion.service.ts     [NEW]
│       ├── config/
│       │   └── north-carolina.config.ts            [NEW]
│       ├── workers/
│       │   └── north-carolina-sync-worker.ts       [NEW]
│       ├── cli/
│       │   └── ingest-north-carolina.ts            [NEW]
│       ├── index.ts                                [UPDATED]
│       ├── README-north-carolina.md                [NEW]
│       └── IMPLEMENTATION-SUMMARY.md               [NEW]
└── examples/
    └── north-carolina-apl-example.ts               [NEW]
```

**Total**: 6 new files, 1 updated file, ~1,800 lines of code

---

## Next Steps (Out of Scope for A1.4)

The following are NOT part of this task but are noted for future work:

1. **A1.5**: Build Florida APL ingestion (FIS processor - can reuse Michigan code)
2. **A1.6**: Build Oregon APL ingestion (state-specific format)
3. **A1.7**: Design state eligibility rules engine
4. **A1.8**: Create APL update monitoring and sync jobs

### For Production Deployment

When ready to deploy:

1. Set environment variables:
   ```bash
   NORTH_CAROLINA_APL_DOWNLOAD_URL="https://actual-url.com/apl.xlsx"
   DATABASE_URL="postgresql://..."
   NORTH_CAROLINA_SYNC_CRON="0 3 * * *"  # Optional: default is daily 3AM EST
   ```

2. Run initial ingestion:
   ```bash
   node src/services/apl/cli/ingest-north-carolina.ts
   ```

3. Start background worker:
   ```bash
   # As a service/daemon
   node src/services/apl/workers/north-carolina-sync-worker.ts
   ```

4. Monitor sync status:
   ```sql
   SELECT * FROM apl_sync_status
   WHERE state = 'NC' AND data_source = 'conduent';
   ```

---

## Alignment with Specifications

### From `specs/wic-benefits-app/specs/data-layer/spec.md`:

✅ **APL data coverage** (Requirement)
- Supports North Carolina (Conduent processor)
- All required fields: UPC, category, restrictions, participant types, dates

✅ **APL data ingestion (Conduent states)** (Scenario)
- Handles Conduent format differences
- Different field names mapped correctly
- Maps to unified internal schema

✅ **APL data freshness** (Scenario)
- Daily sync capability
- Tracks last sync timestamp
- Stale data detection

✅ **APL eligibility lookup** (Scenario)
- Stores all data needed for lookup
- State identifier (NC)
- Data source (conduent)

### From `tasks.md`:

✅ **A1.4**: Build North Carolina APL ingestion (Conduent processor)
- ✅ Ingestion service created
- ✅ Conduent format handled
- ✅ Worker for automation
- ✅ CLI for manual runs
- ✅ Documentation complete

---

## Code Quality

- **Type Safety**: Full TypeScript with interfaces
- **Error Handling**: Try-catch with retry logic
- **Logging**: Comprehensive console logging with emojis
- **Documentation**: JSDoc comments on all public functions
- **Consistency**: Matches Michigan implementation patterns
- **Reusability**: Shared utilities (UPC normalization, validation)
- **Configuration**: Environment-based, easily customizable
- **Testing**: Example code for all usage patterns

---

## Summary

Task A1.4 is **COMPLETE**. The North Carolina APL ingestion system is fully implemented with:

- Conduent processor support
- Excel and CSV format handling
- Automated background syncing
- CLI tool for manual operations
- Comprehensive documentation
- 7 usage examples
- Database integration
- Error handling and retry logic
- Configuration validation
- Field mapping for Conduent variations

The implementation follows the same architecture as Michigan (A1.3), making it straightforward to add Florida (A1.5 - also FIS) and Oregon (A1.6 - state-specific) next.

**Files**: 6 new, 1 updated
**Lines of Code**: ~1,800
**Documentation**: Complete
**Testing**: Examples provided
**Production Ready**: Yes (needs environment variables)
