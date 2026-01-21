# Store Data Ingestion Pipeline (A3.3)

**Task**: Build store data ingestion pipeline
**Status**: ✅ COMPLETE
**Date**: January 21, 2026

## Overview

The Store Data Ingestion Pipeline orchestrates the complete flow of WIC store data from raw sources through normalization to database storage. It integrates:

- **A3.1**: Retailer data scrapers (source raw data from state websites)
- **A3.2**: Database schema (structured storage for store data)
- **A3.3**: Ingestion pipeline (this implementation)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Store Ingestion Pipeline                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │  1. SCRAPE (A3.1 Integration)        │
        │  - MichiganRetailerScraper           │
        │  - NorthCarolinaRetailerScraper      │
        │  - FloridaRetailerScraper            │
        │  - OregonRetailerScraper             │
        └──────────────┬───────────────────────┘
                       │ Raw WICRetailerData
                       ▼
        ┌──────────────────────────────────────┐
        │  2. NORMALIZE                        │
        │  - Address standardization           │
        │  - Chain detection                   │
        │  - Deduplication                     │
        │  - Data quality validation           │
        └──────────────┬───────────────────────┘
                       │ NormalizedRetailerData
                       ▼
        ┌──────────────────────────────────────┐
        │  3. TRANSFORM                        │
        │  - Convert to Store entities         │
        │  - Map features & attributes         │
        │  - Set timezones & defaults          │
        └──────────────┬───────────────────────┘
                       │ Store[]
                       ▼
        ┌──────────────────────────────────────┐
        │  4. UPSERT (A3.2 Integration)        │
        │  - Insert new stores                 │
        │  - Update existing stores            │
        │  - Batch processing                  │
        │  - Error handling                    │
        └──────────────┬───────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │  5. MONITOR & LOG                    │
        │  - Track ingestion metrics           │
        │  - Data quality reports              │
        │  - Health checks                     │
        │  - Alert on failures                 │
        └──────────────────────────────────────┘
```

## Components

### 1. StoreIngestionPipeline

**File**: `src/services/store/StoreIngestionPipeline.ts`

Main orchestrator that coordinates the entire ingestion process.

**Key Methods**:
- `ingest(options)` - Run full pipeline for specified states
- `scrapeStates(states)` - Fetch raw data from scrapers
- `ingestState(scrapeResult, options)` - Process single state
- `convertToStores(normalizedData)` - Transform to Store entities
- `upsertStore(store)` - Insert or update store in database

**Usage**:
```typescript
const pipeline = new StoreIngestionPipeline();

// Ingest all states
const result = await pipeline.ingest();

// Ingest specific states
const result = await pipeline.ingest({ states: ['MI', 'NC'] });

// Dry run (no database writes)
const result = await pipeline.ingest({ dryRun: true });
```

### 2. DataQualityValidator

**File**: `src/services/store/data-quality-validator.ts`

Validates store data quality and generates quality reports.

**Key Methods**:
- `validateStore(store)` - Validate single store record
- `validateBatch(stores)` - Validate batch and generate report
- `printReport(report)` - Print human-readable report

**Validation Checks**:
- ✅ Required fields (name, address, coordinates)
- ✅ Data format (ZIP code, phone, coordinates)
- ✅ WIC authorization status
- ✅ Data freshness (last verified date)
- ⚠️  Optional fields (phone, hours, features)

**Quality Score**: 0-100 based on completeness and accuracy

### 3. IngestionMonitor

**File**: `src/services/store/ingestion-monitoring.ts`

Monitors pipeline health and tracks ingestion history.

**Key Methods**:
- `logIngestionResult(result)` - Log ingestion to file
- `getHealthCheck()` - Get pipeline health status
- `generateReport()` - Generate human-readable report

**Health Metrics**:
- Days since last successful run
- Recent failure count
- Data quality metrics
- Alerts for stale data or failures

### 4. CLI Tool

**File**: `src/cli/ingest-stores.ts`

Command-line interface for manual ingestion.

**Usage**:
```bash
# Ingest all states
npm run ingest-stores

# Ingest specific states
npm run ingest-stores -- --states=MI,NC

# Dry run
npm run ingest-stores -- --dry-run

# Custom batch size
npm run ingest-stores -- --batch-size=100

# Help
npm run ingest-stores -- --help
```

### 5. Scheduled Job

**File**: `src/jobs/store-ingestion.job.ts`

Automated job for scheduled ingestion (cron-based).

**Configuration**: `src/config/ingestion-schedule.config.ts`

**Default Schedule**:
- **Production**: Monthly on 1st at 2:00 AM ET
- **Development**: Daily at 3:00 AM ET

**Running Manually**:
```bash
node src/jobs/store-ingestion.job.ts
node src/jobs/store-ingestion.job.ts --dry-run
node src/jobs/store-ingestion.job.ts --states=MI,NC
node src/jobs/store-ingestion.job.ts --notify
```

## Data Flow

### Input (from A3.1 Scrapers)
```typescript
interface WICRetailerRawData {
  state: string;
  source: string;
  scrapedAt: string;
  vendorName: string;
  wicVendorId?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  chainName?: string;
  storeType?: string;
  services?: string[];
}
```

### Output (to A3.2 Database)
```typescript
interface Store {
  id: string;
  name: string;
  chain: string;
  address: Address;
  location: GeoPoint;
  wicAuthorized: boolean;
  wicVendorId?: string;
  phone?: string;
  hours: OperatingHours[];
  timezone: string;
  features: StoreFeatures;
  dataSource: DataSource;
  lastVerified: Date;
  active: boolean;
}
```

## Ingestion Process

### Step 1: Scrape
Uses A3.1 scrapers to fetch raw data from state sources:
- Michigan: FIS processor data
- North Carolina: Conduent processor data
- Florida: FIS processor data
- Oregon: State-specific data

### Step 2: Normalize
Transforms raw data to consistent format:
- Standardize addresses
- Detect chain stores
- Deduplicate records
- Validate data quality

### Step 3: Transform
Convert to Store entities:
- Map to Store interface
- Set timezones by state
- Map store features
- Parse operating hours (if available)

### Step 4: Upsert
Save to database (A3.2 schema):
- Check for existing stores (name + address + zip)
- Insert new stores
- Update existing stores
- Batch processing for efficiency

### Step 5: Monitor
Track pipeline health:
- Log results to file
- Generate quality reports
- Check health metrics
- Alert on failures

## Configuration

### Ingestion Options
```typescript
interface IngestionOptions {
  states?: StateCode[];          // Default: ['MI', 'NC', 'FL', 'OR']
  skipGeovalidation?: boolean;   // Skip coordinate validation
  batchSize?: number;            // Default: 50
  dryRun?: boolean;              // Test without DB writes
}
```

### Schedule Configuration
```typescript
interface IngestionSchedule {
  enabled: boolean;
  cronExpression: string;        // e.g., '0 2 1 * *'
  timezone: string;              // e.g., 'America/New_York'
  states: string[];
  batchSize: number;
  notifyOnFailure: boolean;
  notifyOnSuccess: boolean;
  maxRetries: number;
  retryDelayMinutes: number;
}
```

## Examples

See `src/examples/store-ingestion-example.ts` for complete examples:

1. **Ingest All States**
2. **Ingest Specific States**
3. **Dry Run (Test Mode)**
4. **Data Quality Validation**
5. **Health Monitoring**
6. **Generate Reports**

## Monitoring

### Health Check
```bash
npm run store-health-check
```

Returns:
- ✅ Healthy / ⚠️ Unhealthy
- Last successful run timestamp
- Days since last run
- Recent failure count
- Data quality metrics
- Active alerts

### Quality Metrics
- **Completeness**: % of stores with all required fields
- **Accuracy**: Coordinate validation, format checks
- **Freshness**: Days since last verification
- **Coverage**: Total stores vs. expected

### Alerts
- **CRITICAL**: No successful ingestion > 35 days
- **WARNING**: No successful ingestion > 30 days
- **WARNING**: High failure rate (>5 in 30 days)

## Error Handling

### Scraper Failures
- Log error details
- Continue with other states
- Aggregate errors in final report

### Database Errors
- Retry failed upserts
- Log store-specific errors
- Continue batch processing

### Validation Errors
- Track invalid records
- Include in quality report
- Skip invalid stores (don't block pipeline)

## Performance

### Batch Processing
- Default batch size: 50 stores
- Configurable via `batchSize` option
- Processes states sequentially to avoid overload

### Expected Performance
- **Michigan**: ~50 stores, ~10 seconds
- **North Carolina**: ~60 stores, ~12 seconds
- **Florida**: ~60 stores, ~12 seconds
- **Oregon**: ~50 stores, ~10 seconds
- **Total**: ~220 stores, ~45-60 seconds

*Note: Current scrapers return mock data. Real scraping will be slower.*

### Optimization Tips
1. Increase `batchSize` for faster processing
2. Run during off-peak hours (scheduled job)
3. Use database indexes (A3.2 schema has them)
4. Cache normalized data to avoid re-scraping

## Integration Points

### With A3.1 (Retailer Scrapers)
- Uses `RetailerDataService` to fetch raw data
- Calls state-specific scrapers
- Handles scraping errors gracefully

### With A3.2 (Database Schema)
- Uses `StoreRepository` for database operations
- Inserts into `stores`, `store_hours` tables
- Leverages indexes for efficient queries

### With A3.4 (Google Places Enrichment)
- Pipeline can be extended to call enrichment service
- Add operating hours from Google Places
- Validate/correct addresses

### With A3.5 (Store Search API)
- Populates database that powers search API
- Ensures fresh data for user queries

## Next Steps

### Immediate (For Testing)
1. Run examples: `npm run test-store-ingestion`
2. Test dry run: `npm run ingest-stores -- --dry-run`
3. Verify data in database

### Short-term (Before Production)
1. Implement real scrapers (replace mock data)
2. Add Google Places enrichment (A3.4)
3. Set up cron job on server
4. Configure alerting (email/Slack)

### Medium-term (Enhancements)
1. Add incremental updates (only changed stores)
2. Implement crowdsourced corrections
3. Add image/photo scraping
4. Build admin dashboard for monitoring

## Troubleshooting

### Pipeline Fails to Start
- Check database connection
- Verify scraper configuration
- Ensure log directory exists

### No Data Ingested
- Run dry run to test scrapers: `--dry-run`
- Check scraper logs for errors
- Verify state codes are valid

### Low Data Quality Score
- Review quality report: `printReport(report)`
- Check for missing coordinates
- Validate scraper output format

### Stale Data Alert
- Run manual ingestion: `npm run ingest-stores`
- Check cron job status
- Review recent failures in logs

## Files Created

### Core Implementation
- `src/services/store/StoreIngestionPipeline.ts` - Main pipeline
- `src/services/store/data-quality-validator.ts` - Validation
- `src/services/store/ingestion-monitoring.ts` - Health monitoring
- `src/services/store/README.md` - This documentation

### Job & CLI
- `src/jobs/store-ingestion.job.ts` - Scheduled job
- `src/cli/ingest-stores.ts` - Command-line tool

### Configuration
- `src/config/ingestion-schedule.config.ts` - Cron schedule

### Examples
- `src/examples/store-ingestion-example.ts` - Usage examples

## Success Criteria

✅ **Scraping**: Fetch data from all 4 states
✅ **Normalization**: Convert to standard format
✅ **Validation**: Quality score > 80 for valid stores
✅ **Storage**: Insert/update stores in database
✅ **Monitoring**: Track health and data quality
✅ **Scheduling**: Support manual and automated runs
✅ **Error Handling**: Graceful failure recovery
✅ **Documentation**: Complete usage guide

## Testing

```bash
# Run examples
npm run test-store-ingestion

# Dry run (no DB writes)
npm run ingest-stores -- --dry-run

# Ingest specific state
npm run ingest-stores -- --states=MI

# Check pipeline health
npm run store-health-check
```

## Dependencies

- A3.1: `RetailerDataService`, state scrapers
- A3.2: `StoreRepository`, database schema
- Node.js `fs` module for logging
- TypeScript for type safety

## License

Part of WIC Benefits App - Non-profit, open-source project serving WIC participants.
