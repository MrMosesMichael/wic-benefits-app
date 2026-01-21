# Florida WIC APL Ingestion

Florida uses **FIS** as their eWIC processor (same as Michigan). This document covers Florida-specific APL data ingestion.

## Overview

**State**: Florida (FL)
**Processor**: FIS
**Data Format**: PDF (primary), Excel/CSV (vendor portal)
**Update Frequency**: Daily during phased rollout (Oct 2025 - Mar 2026), weekly after
**Official Source**: [Florida DOH WIC Foods](https://www.floridahealth.gov/programs-and-services/wic/wic-foods.html)

## Florida-Specific Policies

### 🚫 Artificial Dye Ban (Effective Oct 2025)

Florida **banned artificial food dyes** from WIC-approved products effective October 1, 2025.

**Products containing artificial dyes are automatically rejected** during ingestion:
- Red 40, Red 3
- Yellow 5, Yellow 6
- Blue 1, Blue 2
- Green 3
- Any FD&C or Lake dyes

### 🍼 Infant Formula Contract Changes

New infant formula contract effective **February 1, 2026**.

Contract brands are tracked with start/end dates. Update `florida.config.ts` when new contracts are awarded.

### 📅 Phased Rollout (Oct 2025 - Mar 2026)

New food package assignments are being phased in over 6 months.

**Sync Schedule**:
- **During rollout** (Oct 2025 - Mar 2026): **Daily** sync recommended
- **After rollout** (Apr 2026+): **Weekly** sync sufficient

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

```bash
# Required for database storage
export DATABASE_URL="postgresql://user:password@localhost:5432/wic_benefits"

# Optional: Override default APL URL
export FL_APL_URL="https://example.com/florida-apl.xlsx"

# Optional: Alert webhook for sync failures
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

### 3. Run Ingestion

```bash
# Download and ingest from Florida DOH
npm run ingest:florida

# Use local file for testing
npm run ingest:florida -- --file ./test-data/florida-apl.xlsx

# Dry run (no database writes)
npm run ingest:florida -- --file ./test-data/florida-apl.xlsx --no-db
```

## File Formats

### PDF Format (Primary)

Florida publishes APL as PDF files:
- [Florida WIC Foods List (English)](https://www.floridahealth.gov/PROGRAMS-AND-SERVICES/wic/_documents/fl-wic-foods-eng.pdf)
- Organized by food category
- Contract formulas listed separately
- Vendor minimum inventory included

**Current Implementation**: Requires Excel/CSV export. PDF parsing to be added.

### Excel/CSV Format (Vendor Portal)

Structured data available through FIS vendor portal (requires authorization).

**Expected Columns**:
- `UPC` or `UPC Code` - Product UPC
- `Product Description` - Product name
- `Category` - Food category
- `Subcategory` - Optional subcategory
- `Package Size` - Size restriction (e.g., "12 oz")
- `Participant Types` - Eligible participant categories
- `Effective Date` - Approval start date
- `Expiration Date` - Approval end date (if applicable)
- `Contract Brand` - For infant formula contracts
- `Artificial Dyes` - YES/NO flag (optional)
- `Notes` - Additional restrictions

## Data Processing

### Ingestion Pipeline

```
Download APL File
      ↓
Parse Excel/CSV
      ↓
Detect Artificial Dyes → Reject if present
      ↓
Normalize UPC
      ↓
Parse Size/Brand Restrictions
      ↓
Apply Florida Policies
      ↓
Validate Entry
      ↓
Store in Database
```

### Florida-Specific Processing

1. **Artificial Dye Detection**
   - Check explicit flag if available
   - Scan product description for dye keywords
   - Reject products with artificial dyes
   - Log rejection count

2. **Formula Contract Tracking**
   - Identify contract infant formulas
   - Apply contract brand restrictions
   - Track contract effective dates
   - Log contract changes

3. **Policy Phase Detection**
   - Detect if in phased rollout period
   - Adjust sync schedule accordingly
   - Add policy notes to entries

## Automated Sync Worker

### Start Worker

```typescript
import { Pool } from 'pg';
import { createFloridaSyncWorker } from './workers/florida-sync-worker';

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const worker = createFloridaSyncWorker({
  dbPool,
  enableAlerts: true,
  alertWebhookUrl: process.env.SLACK_WEBHOOK_URL,
});

// Worker automatically adjusts schedule based on policy phase
// Daily during phased rollout, weekly after
```

### Sync Schedule

**Automatic schedule adjustment**:
- Oct 1, 2025 - Mar 31, 2026: Daily at 3:00 AM ET
- Apr 1, 2026 onward: Weekly (Monday) at 3:00 AM ET

Worker automatically detects policy phase transitions and adjusts schedule.

### Manual Sync

```typescript
// Trigger sync immediately
const stats = await worker.runSyncNow();
console.log('Sync complete:', stats);
```

### Health Monitoring

```typescript
// Check worker health
const health = worker.getHealthCheck();
console.log(health);
// {
//   healthy: true,
//   status: 'healthy',
//   details: { ... }
// }
```

## Configuration

### florida.config.ts

```typescript
import {
  defaultFloridaConfig,
  FLORIDA_APL_URLS,
  FLORIDA_POLICY_DATES,
  getCurrentFormulaContract,
  getFloridaSyncSchedule,
} from './config/florida.config';

// Get recommended sync schedule
const schedule = getFloridaSyncSchedule(); // 'daily' or 'weekly'

// Check current formula contract
const contract = getCurrentFormulaContract();
console.log('Contract brand:', contract.primaryBrand);

// Policy dates
console.log('Dye ban:', FLORIDA_POLICY_DATES.artificialDyeBanDate);
console.log('Formula contract:', FLORIDA_POLICY_DATES.newFormulaContractStart);
```

### Update Formula Contract

When Florida awards a new infant formula contract, update `florida.config.ts`:

```typescript
export const FLORIDA_FORMULA_CONTRACTS = {
  newContract: {
    startDate: new Date('2026-02-01'),
    endDate: null,
    primaryBrand: 'NewBrandName', // ← Update this
    alternativeBrands: ['Alternative1', 'Alternative2'], // ← Update this
  },
};
```

## Statistics

Ingestion tracks Florida-specific metrics:

```typescript
interface IngestionStats {
  totalRows: number;
  validEntries: number;
  invalidEntries: number;
  additions: number;
  updates: number;
  rejectedArtificialDyes: number;      // FL-specific
  contractFormulaChanges: number;      // FL-specific
  errors: string[];
  warnings: string[];
  durationMs: number;
}
```

## Database Schema

APL entries include Florida-specific fields:

```sql
-- apl_entries table
CREATE TABLE apl_entries (
  id VARCHAR(255) PRIMARY KEY,
  state VARCHAR(2) NOT NULL,                    -- 'FL'
  upc VARCHAR(14) NOT NULL,
  eligible BOOLEAN NOT NULL,
  benefit_category VARCHAR(255) NOT NULL,
  benefit_subcategory VARCHAR(255),
  participant_types TEXT[],
  size_restriction JSONB,
  brand_restriction JSONB,                      -- Contract brand tracking
  additional_restrictions JSONB,                -- noArtificialDyes: true
  effective_date TIMESTAMP NOT NULL,
  expiration_date TIMESTAMP,
  notes TEXT,
  data_source VARCHAR(50) NOT NULL,             -- 'fis'
  last_updated TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for Florida lookups
CREATE INDEX idx_apl_florida ON apl_entries (state, upc) WHERE state = 'FL';
```

## Testing

### Test with Sample Data

```bash
# Create test data file
cat > test-data/florida-apl-sample.xlsx

# Run ingestion (dry run)
npm run ingest:florida -- --file test-data/florida-apl-sample.xlsx --no-db
```

### Expected Output

```
🌴 Florida WIC APL Ingestion Tool

🏛️  Florida WIC Policy Status:
   Artificial Dye Ban: ✅ Active
   Formula Contract: BrandName
   Contract Period: 2/1/2026 - Ongoing
   Recommended Sync: 📅 Daily (phased rollout)

🚀 Starting Florida APL ingestion...
✅ APL file downloaded
✅ Parsed 5000 rows from file
✅ Transformed 4850 valid entries
✅ Validated 4850 entries
✅ Stored entries in database
✅ Updated sync status
🎉 Florida APL ingestion complete

📊 Florida APL Ingestion Statistics:
   Total Rows: 5000
   Valid Entries: 4850
   Invalid Entries: 0
   Additions: 4850
   Updates: 0
   Rejected (Artificial Dyes): 150 🚫
   Contract Formula Changes: 25 🍼
   Duration: 12450ms
```

## Troubleshooting

### Issue: PDF Parsing Not Implemented

**Error**: `PDF parsing not yet implemented. Please provide Excel file.`

**Solution**:
1. Request Excel/CSV export from Florida DOH or FIS vendor portal
2. Or implement PDF parsing using `pdf-parse` or `pdfjs-dist`

### Issue: High Rejection Rate (Artificial Dyes)

**Expected**: 150-200 products rejected if using pre-Oct 2025 data

**Solution**: Ensure you're using current APL data (post-Oct 2025)

### Issue: Unknown Formula Contract Brand

**Warning**: `Formula Contract: Unknown`

**Solution**: Update `FLORIDA_FORMULA_CONTRACTS` in `florida.config.ts` with current contract details

### Issue: Sync Schedule Not Changing

Worker should automatically detect policy phase transitions.

**Debug**:
```typescript
import { getFloridaSyncSchedule, FLORIDA_POLICY_DATES } from './config/florida.config';

console.log('Current date:', new Date());
console.log('Phased rollout:', FLORIDA_POLICY_DATES.phasedRolloutStart, '-', FLORIDA_POLICY_DATES.phasedRolloutEnd);
console.log('Recommended schedule:', getFloridaSyncSchedule());
```

## Next Steps

1. **Vendor Portal Access**: Contact FIS to request Excel/CSV export access
2. **PDF Parsing**: Implement PDF parsing for direct ingestion from FL DOH PDFs
3. **Formula Contract Updates**: Monitor Florida DOH for new formula contract awards
4. **Testing**: Validate eligibility lookups with real Florida products
5. **Production Deploy**: Schedule sync worker in production environment

## Resources

### Official Sources

- [Florida DOH WIC Foods](https://www.floridahealth.gov/programs-and-services/wic/wic-foods.html)
- [Florida WIC Foods List (PDF)](https://www.floridahealth.gov/PROGRAMS-AND-SERVICES/wic/_documents/fl-wic-foods-eng.pdf)
- [Changes to Florida WIC Foods](https://www.floridahealth.gov/programs-and-services/wic/_documents/fl-wic-foods-changes.pdf)
- [Florida WIC Vendor Information](https://www.floridahealth.gov/programs-and-services/wic/vendors/index.html)

### FIS Resources

- [FIS Code Connect API Marketplace](https://codeconnect.fisglobal.com/)
- FIS vendor portal (requires authorization)

### Contact

- Florida WIC Program: See [Florida DOH WIC Contact](https://www.floridahealth.gov/programs-and-services/wic/index.html)
- FIS Support: Contact through vendor portal

## License

Part of WIC Benefits Assistant - Non-profit, user-serving project
