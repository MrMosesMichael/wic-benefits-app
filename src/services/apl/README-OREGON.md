# Oregon APL Ingestion Service

This service handles downloading, parsing, and storing Oregon WIC Approved Product List (APL) data.

## Overview

Oregon uses a **state-specific eWIC system** (not FIS or Conduent). This service provides:

- 📥 Download APL data from Oregon WIC website
- 🔄 Parse Excel/CSV files in Oregon's state-specific format
- ✅ Validate and normalize product data
- 💾 Store entries in PostgreSQL database
- 🌲 Track Oregon-specific policies (organic, local preference)
- 🔁 Background sync worker for automatic updates

## Oregon-Specific Features

### 1. Organic Product Support
Oregon emphasizes organic products in their WIC program.

```typescript
// Products can be marked as organic-only
additionalRestrictions: {
  organicRequired: true
}
```

### 2. Local Preference
Oregon supports local and regional producers.

```typescript
additionalRestrictions: {
  localPreferred: true
}
```

### 3. Enhanced Produce Benefits
Oregon provides expanded fruit/vegetable benefits beyond federal minimums.

## Installation

```bash
npm install
```

## Configuration

### Environment Variables

```bash
# Database connection (required)
DATABASE_URL=postgresql://user:pass@localhost/wic_db

# Oregon APL download URL (optional - defaults to Oregon WIC website)
OREGON_APL_URL=https://www.oregon.gov/oha/.../oregon_apl.xlsx

# Local file path for testing (optional)
OREGON_APL_LOCAL_PATH=./data/apl/oregon/oregon_apl.xlsx
```

### Configuration File

Edit `src/services/apl/config/oregon.config.ts`:

```typescript
export const OREGON_APL_DOWNLOAD_URL = 'https://...';
export const OREGON_APL_SYNC_SCHEDULE = {
  checkIntervalHours: 24,
  fullRefreshDays: 7,
  retryIntervalMinutes: 30,
  maxConsecutiveFailures: 3,
};
```

## Usage

### CLI Tool (One-time Ingestion)

```bash
# Download from Oregon WIC website
npm run ingest:oregon

# Use local file
npm run ingest:oregon -- --local

# Use specific file
npm run ingest:oregon -- --file ./data/oregon_apl_2026.xlsx

# Show help
npm run ingest:oregon -- --help
```

### Programmatic Usage

```typescript
import { Pool } from 'pg';
import { OregonAPLIngestionService, createOregonAPLConfig } from './services/apl';

const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });

const config = createOregonAPLConfig(dbPool, {
  useLocalFile: false, // Download from website
});

const service = new OregonAPLIngestionService(config);
const stats = await service.ingest();

console.log(`Processed ${stats.validEntries} entries`);
console.log(`Organic products: ${stats.organicProducts}`);
console.log(`Local products: ${stats.localProducts}`);
```

### Background Sync Worker

Automatically sync Oregon APL data on a schedule:

```typescript
import { startOregonSyncWorker } from './services/apl';

const worker = await startOregonSyncWorker(dbPool, {
  checkIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
  onSuccess: (stats) => {
    console.log(`Synced ${stats.additions} new products`);
  },
  onFailure: (error) => {
    console.error(`Sync failed: ${error.message}`);
  },
});

// Trigger manual sync
await worker.triggerSync();

// Stop worker
worker.stop();
```

## File Format

Oregon APL files are expected in Excel (.xlsx) or CSV format with these columns:

### Required Columns
- `UPC` or `UPC Code` - Product UPC (12-14 digits)
- `Product Description` - Product name
- `Category` or `Food Category` - Benefit category
- `Effective Date` - When approval starts

### Optional Columns
- `Subcategory` - Benefit subcategory
- `Package Size` - Size requirement (e.g., "12 oz")
- `Participant Types` - Who can purchase (e.g., "Pregnant, Infant")
- `Brand` - Brand restriction
- `Expiration Date` - When approval ends
- `Organic Only` - YES/NO flag for organic requirement
- `Local Preference` - YES/NO flag for local products
- `Notes` - Additional information

### Example Excel Format

| UPC | Product Description | Category | Subcategory | Package Size | Organic Only | Local Preference | Effective Date |
|-----|-------------------|----------|-------------|--------------|--------------|------------------|----------------|
| 012345678901 | Organic Milk | Milk | Whole Milk | 1 gal | YES | YES | 2026-01-01 |
| 012345678902 | Whole Wheat Bread | Bread | Whole Grain | 16 oz | NO | YES | 2026-01-01 |

## Database Schema

```sql
CREATE TABLE apl_entries (
  id VARCHAR(255) PRIMARY KEY,
  state VARCHAR(2) NOT NULL,
  upc VARCHAR(14) NOT NULL,
  eligible BOOLEAN NOT NULL,
  benefit_category VARCHAR(255) NOT NULL,
  benefit_subcategory VARCHAR(255),
  participant_types TEXT[],
  size_restriction JSONB,
  brand_restriction JSONB,
  additional_restrictions JSONB,  -- Contains organicRequired, localPreferred
  effective_date TIMESTAMP NOT NULL,
  expiration_date TIMESTAMP,
  notes TEXT,
  data_source VARCHAR(50) NOT NULL,
  last_updated TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_apl_state_upc ON apl_entries(state, upc);
CREATE INDEX idx_apl_effective_date ON apl_entries(effective_date);
```

## Output Statistics

After ingestion, the service reports:

```
📊 Oregon APL Ingestion Statistics:
   Total Rows: 5000
   Valid Entries: 4850
   Invalid Entries: 150
   Additions: 4800
   Updates: 50
   Organic Products: 1200
   Local Products: 800
   Duration: 15234ms
```

## Error Handling

The service handles common errors:

- **Invalid UPC format**: Logged as warning, entry skipped
- **Missing required fields**: Logged as error, entry skipped
- **Download failures**: Retries with exponential backoff
- **Database errors**: Transaction rolled back, error reported

## Testing

```bash
# Run with local test file
npm run ingest:oregon -- --file ./test/fixtures/oregon_apl_sample.xlsx

# Check specific UPCs
npm run test -- --grep "Oregon APL"
```

## Oregon WIC Contacts

- Website: https://www.oregon.gov/oha/ph/healthypeoplefamilies/wic
- Vendor Support: Contact Oregon WIC program for APL data access

## Troubleshooting

### "Failed to download APL file"
- Check `OREGON_APL_URL` is correct
- Verify network connectivity
- Try using `--local` flag with local file

### "Database pool not configured"
- Set `DATABASE_URL` environment variable
- Check database is running and accessible

### "Invalid UPC format"
- Check source data has valid UPCs (12-14 digits)
- UPCs are normalized automatically (leading zeros handled)

### High invalid entries count
- Review error log for specific validation failures
- Check file format matches expected schema
- Contact Oregon WIC for data format questions

## Related Files

- Service: `src/services/apl/oregon-ingestion.service.ts`
- Config: `src/services/apl/config/oregon.config.ts`
- CLI: `src/services/apl/cli/ingest-oregon.ts`
- Worker: `src/services/apl/workers/oregon-sync-worker.ts`
- Example: `src/examples/oregon-apl-example.ts`

## See Also

- [Michigan APL Service](./README-MICHIGAN.md) - FIS processor
- [North Carolina APL Service](./README-NORTH-CAROLINA.md) - Conduent processor
- [Florida APL Service](./README-FLORIDA.md) - FIS processor with dye ban
- [APL Types](../../types/apl.types.ts) - Shared data types
