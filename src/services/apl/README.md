# APL (Approved Product List) Ingestion Services

State-specific APL data ingestion services for the WIC Benefits App.

## Overview

Each state maintains its own Approved Product List (APL) of WIC-eligible products. This module provides services to download, parse, validate, and store APL data from various state sources.

### Supported States

| State | Processor | Status | Module |
|-------|-----------|--------|--------|
| Michigan (MI) | FIS / CDP | ✅ Implemented | `michigan-ingestion.service.ts` |
| North Carolina (NC) | Conduent | 🚧 Planned | `north-carolina-ingestion.service.ts` |
| Florida (FL) | FIS | 🚧 Planned | `florida-ingestion.service.ts` |
| Oregon (OR) | State-specific | 🚧 Planned | `oregon-ingestion.service.ts` |

## Architecture

```
┌─────────────────────────────────────────┐
│      State APL Data Sources             │
│  (Excel, PDF, Web, FTP, API)            │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│    Ingestion Services (by state)        │
│  - Download/Fetch data                  │
│  - Parse format-specific files          │
│  - Transform to standard schema         │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│    Validation Layer                     │
│  - UPC normalization                    │
│  - Schema compliance                    │
│  - Data quality checks                  │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│    PostgreSQL Database                  │
│  - apl_entries table                    │
│  - apl_sync_status table                │
│  - apl_change_log table                 │
└─────────────────────────────────────────┘
```

## Michigan APL Ingestion

### Data Source

- **URL**: https://www.michigan.gov/mdhhs/assistance-programs/wic/wicvendors/wic-foods
- **Format**: Excel (.xlsx)
- **Update Frequency**: Monthly (public), Daily (vendor portal)
- **Processor**: FIS / Custom Data Processing (CDP)

### Usage

#### Command Line Interface

```bash
# Download from official source
npm run ingest:michigan -- --url https://michigan.gov/.../apl.xlsx

# Use local file for testing
npm run ingest:michigan -- --file ./test-data/michigan-apl.xlsx

# Dry run (no database writes)
npm run ingest:michigan -- --file ./michigan-apl.xlsx --dry-run

# With verbose logging
npm run ingest:michigan -- --url <url> --verbose
```

#### Programmatic Usage

```typescript
import { MichiganAPLIngestionService } from './services/apl/michigan-ingestion.service';
import { Pool } from 'pg';

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const service = new MichiganAPLIngestionService({
  downloadUrl: 'https://michigan.gov/.../apl.xlsx',
  dbPool: dbPool,
});

const stats = await service.ingest();
console.log(`Processed ${stats.validEntries} entries`);
```

#### Automated Sync Worker

```typescript
import { startMichiganSyncWorker } from './services/apl/workers/michigan-sync-worker';
import { Pool } from 'pg';

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const worker = startMichiganSyncWorker({
  downloadUrl: 'https://michigan.gov/.../apl.xlsx',
  dbPool,
  cronSchedule: '0 2 * * *', // Daily at 2 AM EST
  onSuccess: (stats) => {
    console.log(`Sync successful: ${stats.additions} new, ${stats.updates} updated`);
  },
  onError: (error) => {
    console.error(`Sync failed: ${error.message}`);
    // Send alert notification
  },
});

// Worker runs automatically on schedule
```

### Configuration

Environment variables:

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/wic
MICHIGAN_APL_DOWNLOAD_URL=https://michigan.gov/.../apl.xlsx

# Optional
MICHIGAN_SYNC_CRON='0 2 * * *'  # Daily at 2 AM EST
```

### Expected Data Format

Michigan APL Excel file should contain columns:

- `UPC` or `UPC Code` - Universal Product Code (12-14 digits)
- `Product Description` - Product name and details
- `Category` - Benefit category (Cereal, Milk, etc.)
- `Subcategory` - Benefit subcategory (optional)
- `Package Size` - Size with unit (e.g., "12 oz", "1 gal")
- `Participant Types` - Who can purchase ("All", "Infant", etc.)
- `Effective Date` - When approval starts (optional)
- `Expiration Date` - When approval ends (optional)
- `Brand` - Brand name (optional)
- `Notes` - Additional information (optional)

### Output Schema

All entries are normalized to the standard APL schema:

```typescript
interface APLEntry {
  id: string;                    // apl_mi_011110416605_20240101
  state: 'MI';
  upc: string;                   // Normalized 12-digit UPC
  eligible: boolean;
  benefitCategory: string;       // "Cereal", "Milk - Whole", etc.
  benefitSubcategory?: string;
  participantTypes?: ParticipantType[];
  sizeRestriction?: {
    minSize?: number;
    maxSize?: number;
    exactSize?: number;
    unit: string;
  };
  brandRestriction?: {
    allowedBrands?: string[];
    excludedBrands?: string[];
    contractBrand?: string;
  };
  additionalRestrictions?: Record<string, any>;
  effectiveDate: Date;
  expirationDate?: Date;
  notes?: string;
  dataSource: 'fis';
  lastUpdated: Date;
  verified: boolean;
}
```

### Error Handling

The ingestion service tracks errors and warnings:

```typescript
interface IngestionStats {
  totalRows: number;
  validEntries: number;
  invalidEntries: number;
  additions: number;
  updates: number;
  errors: string[];          // List of error messages
  warnings: string[];        // List of warnings
  durationMs: number;
}
```

Common errors:
- Invalid UPC format (not 8, 12, 13, or 14 digits)
- Missing required fields (UPC, category)
- Invalid dates
- Duplicate entries

### Monitoring

Sync status is tracked in the `apl_sync_status` table:

```sql
SELECT
  state,
  data_source,
  last_sync_at,
  last_success_at,
  sync_status,
  entries_count,
  consecutive_failures
FROM apl_sync_status
WHERE state = 'MI';
```

Alerts are triggered when:
- 3+ consecutive sync failures
- No successful sync in 7+ days
- Entry count below minimum threshold (100)
- Entry count above maximum threshold (10,000)

## Testing

### Unit Tests

```bash
npm test -- michigan-ingestion.service.test.ts
```

### Integration Tests

```bash
# Use sample data
npm run ingest:michigan -- --file ./src/services/apl/test-data/michigan-apl-sample.json --dry-run
```

### Sample Data

Sample Michigan APL data is provided in `test-data/michigan-apl-sample.json` for testing purposes.

## Roadmap

### Phase 1: Michigan (Complete ✅)
- [x] Excel parser
- [x] Data normalization
- [x] Validation layer
- [x] Database storage
- [x] CLI tool
- [x] Automated worker
- [x] Configuration
- [x] Documentation

### Phase 2: North Carolina (Planned)
- [ ] Web scraper / Conduent FTP parser
- [ ] NC-specific category mapping
- [ ] Nutrition criteria validation
- [ ] Integration with NC eWIC system

### Phase 3: Florida (Planned)
- [ ] PDF parser
- [ ] OCR for non-searchable PDFs
- [ ] Artificial dyes policy enforcement
- [ ] Contract formula tracking

### Phase 4: Oregon (Planned)
- [ ] Excel parser (similar to Michigan)
- [ ] Multi-language support
- [ ] High-frequency update handling
- [ ] Pictorial list integration

## Performance

### Metrics (Michigan APL)

- **File Size**: ~500KB - 2MB (compressed Excel)
- **Row Count**: 3,000 - 5,000 products
- **Parse Time**: ~5-10 seconds
- **Validation Time**: ~2-5 seconds
- **Database Insert Time**: ~10-20 seconds
- **Total Duration**: ~20-40 seconds

### Optimization

- Uses streaming for large files
- Batch inserts (100 rows per transaction)
- Parallel validation
- Connection pooling for database
- File hash comparison to skip unchanged data

## Contributing

When adding a new state:

1. Create `<state>-ingestion.service.ts`
2. Extend base `APLIngestionService` interface
3. Implement state-specific parsing logic
4. Add CLI tool in `cli/ingest-<state>.ts`
5. Add worker in `workers/<state>-sync-worker.ts`
6. Add configuration in `config/<state>.config.ts`
7. Add test data in `test-data/<state>-apl-sample.json`
8. Update this README

## License

Part of the WIC Benefits App - open source under AGPL-3.0

## Support

For issues or questions:
- GitHub Issues: https://github.com/MrMosesMichael/wic-benefits-app/issues
- Documentation: See `/docs` directory
