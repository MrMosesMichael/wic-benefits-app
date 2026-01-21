# North Carolina APL Ingestion

Implementation of North Carolina WIC Approved Product List (APL) data ingestion using the Conduent processor format.

## Overview

North Carolina uses **Conduent State & Local Solutions** as their eWIC processor. The APL data format differs from FIS-based states (Michigan, Florida) in field naming conventions and data structure.

## Data Source

- **Official Source**: [North Carolina DHHS WIC](https://www.ncdhhs.gov/divisions/public-health/wic)
- **Processor**: Conduent
- **Format**: Excel (.xlsx) or CSV
- **Update Frequency**:
  - Public: Monthly
  - Vendor Portal: Weekly

## Files

```
src/services/apl/
├── north-carolina-ingestion.service.ts   # Main ingestion service
├── config/north-carolina.config.ts       # Configuration constants
├── workers/north-carolina-sync-worker.ts # Background sync worker
└── cli/ingest-north-carolina.ts          # CLI tool for manual runs
```

## Conduent Format Differences

Conduent uses different field names compared to FIS processors:

| Data Element | Conduent Field | FIS Field |
|--------------|----------------|-----------|
| UPC | `UPC/PLU` | `UPC` |
| Description | `Item Description` | `Product Description` |
| Category | `Food Category` | `Category` |
| Subcategory | `Sub Category` | `Subcategory` |
| Size | `Container Size` | `Package Size` |
| Participants | `Eligible Participants` | `Participant Types` |
| Begin Date | `Begin Date` | `Effective Date` |
| End Date | `End Date` | `Expiration Date` |
| Notes | `Remarks` | `Notes` |

The ingestion service handles these variations automatically using field mapping.

## Configuration

### Environment Variables

```bash
# Required
NORTH_CAROLINA_APL_DOWNLOAD_URL="https://example.com/nc-apl.xlsx"
DATABASE_URL="postgresql://user:pass@localhost:5432/wic_db"

# Optional
NORTH_CAROLINA_SYNC_CRON="0 3 * * *"  # Daily at 3 AM EST (default)
```

### Configuration Files

Configuration is managed in `config/north-carolina.config.ts`:

```typescript
import { getNorthCarolinaAPLConfig } from './config/north-carolina.config';

const config = getNorthCarolinaAPLConfig();
// Returns: { downloadUrl, cronSchedule, timezone, ... }
```

## Usage

### Programmatic Usage

```typescript
import { ingestNorthCarolinaAPL } from './services/apl';
import { Pool } from 'pg';

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const stats = await ingestNorthCarolinaAPL({
  downloadUrl: 'https://example.com/nc-apl.xlsx',
  dbPool,
});

console.log(`Added ${stats.additions} entries`);
console.log(`Updated ${stats.updates} entries`);
```

### CLI Tool

```bash
# Download and ingest APL data
node src/services/apl/cli/ingest-north-carolina.ts

# Use local file for testing
node src/services/apl/cli/ingest-north-carolina.ts --local ./nc-apl.xlsx

# Dry run (no database changes)
node src/services/apl/cli/ingest-north-carolina.ts --dry-run

# Custom URL
node src/services/apl/cli/ingest-north-carolina.ts --url https://custom.url/apl.xlsx

# Help
node src/services/apl/cli/ingest-north-carolina.ts --help
```

### Background Sync Worker

```typescript
import { NorthCarolinaSyncWorker } from './services/apl';
import { Pool } from 'pg';

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const worker = new NorthCarolinaSyncWorker(dbPool);
worker.start();

// Worker runs on schedule (default: daily at 3 AM EST)
```

Run as standalone process:

```bash
node src/services/apl/workers/north-carolina-sync-worker.ts
```

## Data Transformations

### Participant Type Mapping

Conduent participant categories are normalized to internal types:

| Conduent Value | Internal Type |
|----------------|---------------|
| "Pregnant" | `pregnant` |
| "Postpartum" / "PP" | `postpartum` |
| "Breastfeeding" / "BF" | `breastfeeding` |
| "Infant" / "Inf" | `infant` |
| "Child" / "Children" | `child` |
| "All" | All participant types |

### Size Restriction Parsing

Supports multiple formats:
- Range: `"8.9-36 oz"` → `{ minSize: 8.9, maxSize: 36, unit: 'oz' }`
- Exact: `"12 oz"` → `{ exactSize: 12, unit: 'oz' }`
- Units: oz, lb, gal, g, ml, l

### UPC Normalization

- Removes leading zeros for consistency
- Validates check digit
- Handles UPC-A (12 digits) and EAN-13 (13 digits)
- Generates variants for matching

## Database Schema

APL entries are stored in the `apl_entries` table:

```sql
CREATE TABLE apl_entries (
  id VARCHAR PRIMARY KEY,
  state VARCHAR(2) NOT NULL,
  upc VARCHAR(14) NOT NULL,
  eligible BOOLEAN NOT NULL,
  benefit_category VARCHAR NOT NULL,
  benefit_subcategory VARCHAR,
  participant_types VARCHAR[],
  size_restriction JSONB,
  brand_restriction JSONB,
  additional_restrictions JSONB,
  effective_date TIMESTAMP NOT NULL,
  expiration_date TIMESTAMP,
  notes TEXT,
  data_source VARCHAR NOT NULL,
  last_updated TIMESTAMP NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(state, upc, effective_date)
);
```

Sync status tracked in `apl_sync_status`:

```sql
CREATE TABLE apl_sync_status (
  state VARCHAR(2) NOT NULL,
  data_source VARCHAR NOT NULL,
  last_sync_at TIMESTAMP,
  last_success_at TIMESTAMP,
  sync_status VARCHAR NOT NULL,
  entries_count INTEGER,
  file_hash VARCHAR,
  last_error TEXT,
  consecutive_failures INTEGER DEFAULT 0,
  PRIMARY KEY(state, data_source)
);
```

## Error Handling

### Retry Logic

- **Max Retries**: 3 attempts
- **Retry Delay**: 5 seconds (exponential backoff)
- **Download Timeout**: 60 seconds

### Validation

Entries are validated for:
- Valid UPC format (12-14 digits)
- Required fields present
- Valid category codes
- Valid dates
- No duplicate entries

Invalid entries are logged but don't stop processing.

### Alerts

Alerts triggered when:
- 3+ consecutive sync failures
- No data updates in 7+ days
- Entry count outside expected range (100-15,000)

## State-Specific Features

### North Carolina Policies

- **Whole Grain Requirement**: Applied to cereal category
- **Sugar Limits**: Flagged from notes/remarks
- **Low-Fat Requirements**: Parsed from product notes

### Additional Restrictions

```typescript
additionalRestrictions: {
  wholeGrainRequired: true,    // For cereal
  sugarLimit: true,             // If mentioned in notes
  lowFatRequired: true,         // For dairy (NC-specific)
}
```

## Testing

### Test Data

Create test APL file with minimal data:

```csv
UPC/PLU,Item Description,Food Category,Sub Category,Container Size,Eligible Participants,Begin Date,End Date
012345678901,Test Milk,Milk,Whole Milk,1 gal,All,2024-01-01,
011110416605,General Mills Cheerios,Cereal,Ready-to-Eat,18 oz,Child,2024-01-01,
```

### Run Test Ingestion

```bash
node src/services/apl/cli/ingest-north-carolina.ts \
  --local test-data/nc-apl-test.xlsx \
  --dry-run
```

## Monitoring

### Status Check

```typescript
const status = worker.getStatus();

console.log({
  isRunning: status.isRunning,
  lastSuccessAt: status.lastSuccessAt,
  consecutiveFailures: status.consecutiveFailures,
  nextScheduledRun: status.nextScheduledRun,
});
```

### Database Query

```sql
-- Check sync status
SELECT * FROM apl_sync_status
WHERE state = 'NC' AND data_source = 'conduent';

-- Count NC entries
SELECT COUNT(*) FROM apl_entries
WHERE state = 'NC' AND data_source = 'conduent';

-- Recent NC entries
SELECT upc, benefit_category, effective_date
FROM apl_entries
WHERE state = 'NC'
ORDER BY last_updated DESC
LIMIT 10;
```

## Comparison: FIS vs Conduent

| Aspect | FIS (Michigan) | Conduent (North Carolina) |
|--------|----------------|---------------------------|
| File Format | Excel | Excel or CSV |
| Field Names | Standardized | Custom variations |
| Update Frequency | Daily (vendor) | Weekly (vendor) |
| Category Codes | Consistent | May vary |
| Participant Format | Abbreviated | Full names or codes |
| CSV Fallback | No | Yes |

## Future Enhancements

- [ ] Real-time vendor portal integration
- [ ] Change detection notifications
- [ ] Product image association
- [ ] Cross-state product mapping
- [ ] Enhanced validation rules
- [ ] Automated testing suite

## Support

For issues with North Carolina APL ingestion:

1. Check environment variables are set
2. Verify download URL is accessible
3. Review logs for specific errors
4. Test with `--dry-run` flag first
5. Check database connectivity

## References

- [North Carolina WIC Program](https://www.ncdhhs.gov/divisions/public-health/wic)
- [Conduent State Healthcare](https://www.conduent.com/state-local/)
- [USDA WIC Food Packages](https://www.fns.usda.gov/wic/food-packages)
