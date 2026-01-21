# Florida APL Ingestion - Quick Start Guide

Get Florida WIC APL data ingested in 5 minutes.

## Prerequisites

- Node.js 16+
- PostgreSQL database
- Florida APL data file (Excel/CSV)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Database URL

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/wic_benefits"
```

## Step 3: Prepare Test Data

Download Florida APL from [Florida DOH](https://www.floridahealth.gov/programs-and-services/wic/wic-foods.html) or use sample data:

```bash
# Create test data directory
mkdir -p test-data

# Place your Florida APL Excel file here
# test-data/florida-apl.xlsx
```

## Step 4: Run Ingestion

```bash
# Test run (no database writes)
npm run ingest:florida -- --file test-data/florida-apl.xlsx --no-db

# Production run (writes to database)
npm run ingest:florida -- --file test-data/florida-apl.xlsx
```

## Step 5: Verify Results

Check console output:

```
📊 Florida APL Ingestion Statistics:
   Total Rows: 5000
   Valid Entries: 4850
   Additions: 4850
   Rejected (Artificial Dyes): 150 🚫
```

Query database:

```sql
-- Check Florida entries
SELECT COUNT(*) FROM apl_entries WHERE state = 'FL';

-- Sample entries
SELECT upc, benefit_category, notes
FROM apl_entries
WHERE state = 'FL'
LIMIT 10;

-- Check for artificial dye rejections
SELECT COUNT(*) FROM apl_entries
WHERE state = 'FL'
AND additional_restrictions->>'noArtificialDyes' = 'true';
```

## Done!

You now have Florida APL data in your database.

### Next Steps

1. **Set up automated sync**:
   ```typescript
   import { createFloridaSyncWorker } from './workers/florida-sync-worker';

   const worker = createFloridaSyncWorker({ dbPool });
   // Automatically syncs daily during phased rollout
   ```

2. **Test eligibility lookups**:
   ```typescript
   // Query Florida APL
   const result = await client.query(
     'SELECT * FROM apl_entries WHERE state = $1 AND upc = $2',
     ['FL', '011110416605']
   );
   ```

3. **Monitor sync status**:
   ```sql
   SELECT * FROM apl_sync_status WHERE state = 'FL';
   ```

## Florida Policy Notes

- ✅ Artificial dye ban active since Oct 2025
- 🍼 New formula contract: Feb 1, 2026
- 📅 Phased rollout: Oct 2025 - Mar 2026 (daily sync)
- 📅 After rollout: Weekly sync

## Troubleshooting

**Issue**: No Excel file, only PDF available

**Solution**: PDF parsing coming soon. Request Excel export from FIS vendor portal or manually convert PDF to Excel.

**Issue**: High rejection rate

**Expected**: 100-200 products rejected due to artificial dyes (if using current APL data post-Oct 2025)

## Need Help?

See [README-florida.md](./README-florida.md) for detailed documentation.
