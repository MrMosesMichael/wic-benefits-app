# APL Coverage System (A2.6)

## Overview

The APL Coverage System ensures **95%+ coverage** of WIC-eligible UPCs from the APL (Approved Product List) database in the product database. This is critical because users need product information for every item they scan.

### Key Goals

- ✅ **95%+ Coverage**: Maintain at least 95% coverage of all WIC-eligible UPCs
- 🔄 **Auto-Sync**: Automatically fill gaps in product database
- 📊 **Monitoring**: Continuous coverage monitoring and alerts
- 🎯 **Priority**: Focus on high-priority categories (formula, dairy) and states (MI, NC, FL, OR)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   APL Coverage System                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │ APLCoverageService│      │APLCoverageMonitor│        │
│  │                   │      │                  │        │
│  │ • Analyze coverage│      │ • Periodic checks│        │
│  │ • Get missing UPCs│──────▶ • Auto-sync      │        │
│  │ • Generate reports│      │ • Alerts         │        │
│  │ • Sync to target  │      │                  │        │
│  └──────────────────┘      └──────────────────┘        │
│           │                         │                   │
│           ▼                         ▼                   │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │ apl_entries (DB) │      │ ProductSyncService│       │
│  │ WIC-eligible UPCs│      │ Sync from sources│        │
│  └──────────────────┘      └──────────────────┘        │
│           │                         │                   │
│           └────────┬────────────────┘                   │
│                    ▼                                     │
│           ┌──────────────────┐                          │
│           │  products (DB)   │                          │
│           │  Product info    │                          │
│           └──────────────────┘                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. APLCoverageService

**File:** `src/services/product/APLCoverageService.ts`

Core service for coverage analysis and sync orchestration.

**Key Methods:**

- `analyzeCoverage()` - Analyzes current coverage against APL
- `getMissingUPCs()` - Gets list of UPCs not in product database
- `getSyncRecommendation()` - Recommends sync operation based on gaps
- `autoSyncToTarget()` - Auto-syncs missing UPCs to reach 95% target
- `generateReport()` - Generates coverage reports (text/JSON/markdown)

**Example Usage:**

```typescript
import { createAPLCoverageService } from './services/product';
import { Pool } from 'pg';

const pool = new Pool(dbConfig);
const repository = new ProductRepository(dbConfig);

const coverageService = createAPLCoverageService(pool, repository, {
  targetCoverage: 95.0,
  priorityStates: ['MI', 'NC', 'FL', 'OR'],
  priorityCategories: ['formula', 'infant_formula'],
});

// Analyze coverage
const analysis = await coverageService.analyzeCoverage();
console.log(`Coverage: ${analysis.coveragePercent}%`);

// Auto-sync to target
if (!analysis.meetsTarget) {
  await coverageService.autoSyncToTarget({
    batchSize: 100,
    concurrency: 5,
  });
}
```

### 2. APLCoverageMonitor

**File:** `src/services/product/APLCoverageMonitor.ts`

Daemon service for continuous monitoring and auto-sync.

**Features:**

- Periodic coverage checks (configurable interval)
- Automatic sync when coverage drops below target
- Alert system for coverage warnings
- Event-driven architecture for extensibility

**Example Usage:**

```typescript
import { createCoverageMonitor } from './services/product';

const monitor = createCoverageMonitor(pool, repository, {
  targetCoverage: 95.0,
  checkIntervalMs: 3600000, // 1 hour
  autoSync: true,
  alertThreshold: 90.0,
});

// Event handlers
monitor.on('alert', (alert) => {
  console.log(`ALERT: ${alert.message}`);
});

monitor.on('syncComplete', (result) => {
  console.log(`Sync complete: ${result.afterAnalysis.coveragePercent}%`);
});

// Start monitoring
monitor.start();
```

### 3. CLI Tools

#### check-coverage

**File:** `src/services/product/cli/check-coverage.ts`

One-time coverage analysis and reporting.

```bash
# Show coverage report
npm run check-coverage

# JSON output
npm run check-coverage -- --json

# Markdown report
npm run check-coverage -- --markdown

# Auto-sync to target
npm run check-coverage -- --auto-sync

# Show missing UPCs
npm run check-coverage -- --missing --missing-limit 500

# Auto-sync with images
npm run check-coverage -- --auto-sync --images --max-upcs 5000
```

#### coverage-daemon

**File:** `src/services/product/cli/coverage-daemon.ts`

Long-running daemon for continuous monitoring.

```bash
# Start daemon with defaults (check every hour)
npm run coverage-daemon

# Custom check interval (30 minutes)
npm run coverage-daemon -- --interval 1800

# Monitoring only (no auto-sync)
npm run coverage-daemon -- --no-auto-sync

# With image sync
npm run coverage-daemon -- --images

# Custom thresholds
npm run coverage-daemon -- --target 97 --alert-threshold 92
```

**Daemon Signals:**

- `SIGTERM`, `SIGINT` - Graceful shutdown
- `SIGUSR1` - Force immediate coverage check
- `SIGUSR2` - Print current status

```bash
# Force immediate check
kill -USR1 <PID>

# Print status
kill -USR2 <PID>

# Graceful shutdown
kill -TERM <PID>
```

## Coverage Analysis

### Analysis Metrics

```typescript
interface CoverageAnalysis {
  totalAPLUPCs: number;       // Total UPCs in APL database
  coveredUPCs: number;        // UPCs with product data
  missingUPCs: number;        // UPCs without product data
  coveragePercent: number;    // Coverage percentage
  stateBreakdown: StatesCoverage[];
  categoryBreakdown: CategoryCoverage[];
  missingUPCList: string[];   // Sample of missing UPCs
  meetsTarget: boolean;       // True if >= 95%
}
```

### Coverage Report Example

```
═══════════════════════════════════════════════════════════
  WIC APL Product Coverage Report
═══════════════════════════════════════════════════════════

Generated: 1/21/2026, 12:00:00 AM

OVERALL COVERAGE
─────────────────────────────────────────────────────────
Total APL UPCs:        45,328
Covered UPCs:          43,062
Missing UPCs:          2,266
Coverage Percentage:   95.00%
Target:                95%
Status:                ✓ MEETS TARGET

COVERAGE BY STATE
─────────────────────────────────────────────────────────
MI   ✓   96.2%  (12,450/12,934)
NC   ✓   95.8%  (10,123/10,565)
FL   ✗   93.1%  (9,876/10,602)
OR   ✓   95.5%  (8,234/8,621)

COVERAGE BY CATEGORY (Top 10)
─────────────────────────────────────────────────────────
⚠ ✓  Infant Formula                   98.5%  (1,234/1,252)
  ✓  Milk                              96.8%  (4,567/4,718)
  ✓  Cheese                            95.2%  (2,345/2,464)
  ✗  Cereal                            93.8%  (3,456/3,685)
  ✓  Juice                             97.1%  (2,123/2,186)

SYNC RECOMMENDATION
─────────────────────────────────────────────────────────
Should Sync:           NO
Priority:              LOW
Estimated UPCs:        0
Estimated Duration:    0 minutes

Reason: Coverage is at 95.0%, which meets the 95.0% target.

═══════════════════════════════════════════════════════════
```

## Database Queries

### Coverage Analysis Query

The service uses optimized SQL queries to analyze coverage:

```sql
-- Total APL UPCs
SELECT COUNT(DISTINCT upc) as count
FROM apl_entries
WHERE (expiration_date IS NULL OR expiration_date > NOW())
  AND effective_date <= NOW()

-- Covered UPCs (in both APL and products)
SELECT COUNT(DISTINCT a.upc) as count
FROM apl_entries a
INNER JOIN products p ON (
  p.upc = a.upc OR
  p.upc_normalized = a.upc OR
  LPAD(p.upc, 12, '0') = LPAD(a.upc, 12, '0')
)
WHERE (a.expiration_date IS NULL OR a.expiration_date > NOW())
  AND a.effective_date <= NOW()

-- Missing UPCs (in APL but not products)
SELECT DISTINCT a.upc
FROM apl_entries a
LEFT JOIN products p ON (
  p.upc = a.upc OR
  p.upc_normalized = a.upc OR
  LPAD(p.upc, 12, '0') = LPAD(a.upc, 12, '0')
)
WHERE p.upc IS NULL
  AND (a.expiration_date IS NULL OR a.expiration_date > NOW())
  AND a.effective_date <= NOW()
```

## Auto-Sync Process

When coverage drops below target:

1. **Identify Missing UPCs**
   - Query APL database for UPCs not in products table
   - Prioritize by state and category

2. **Fetch Product Data**
   - Try Open Food Facts first (free, comprehensive)
   - Fallback to UPC Database API
   - Handle rate limits and retries

3. **Store Product Data**
   - Insert into products table
   - Optionally sync images to CDN
   - Normalize UPCs for consistent lookups

4. **Re-Analyze Coverage**
   - Verify coverage improvement
   - Alert if still below target

## Priority System

### Priority States

Focus on these states first:
- **Michigan (MI)** - FIS processor
- **North Carolina (NC)** - Conduent processor
- **Florida (FL)** - FIS processor
- **Oregon (OR)** - State-specific

### Priority Categories

High-priority categories (critical for users):
- **Infant Formula** - SURVIVAL priority
- **Milk** - High usage
- **Cheese** - High usage
- **Cereal** - Infant cereal

## Configuration

### Environment Variables

```bash
# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wic_benefits
DB_USER=postgres
DB_PASSWORD=yourpassword

# Coverage targets
COVERAGE_TARGET=95.0
COVERAGE_ALERT_THRESHOLD=90.0

# Sync configuration
SYNC_BATCH_SIZE=100
SYNC_CONCURRENCY=5
SYNC_MAX_UPCS_PER_RUN=10000

# Image storage (optional)
IMAGE_STORAGE_TYPE=local  # or 's3', 'cloudinary'
IMAGE_BASE_PATH=/var/www/product-images
```

### Package.json Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "check-coverage": "ts-node src/services/product/cli/check-coverage.ts",
    "coverage-daemon": "ts-node src/services/product/cli/coverage-daemon.ts"
  }
}
```

## Monitoring & Alerts

### Events

The monitor emits these events:

- `started` - Monitor started
- `stopped` - Monitor stopped
- `checkComplete` - Coverage check completed
- `alert` - Coverage alert (warning/critical)
- `syncStart` - Auto-sync started
- `syncComplete` - Auto-sync completed
- `error` - Error occurred

### Alert Levels

- **INFO** - Normal operation, auto-sync triggered
- **WARNING** - Coverage below alert threshold (90%)
- **CRITICAL** - Coverage below target (95%) or sync failed

## Integration Examples

### Cron Job

```bash
# Run coverage check daily at 2 AM
0 2 * * * cd /path/to/wic_project && npm run check-coverage -- --auto-sync >> /var/log/coverage.log 2>&1
```

### Systemd Service

```ini
[Unit]
Description=WIC APL Coverage Monitor
After=network.target postgresql.service

[Service]
Type=simple
User=wic
WorkingDirectory=/opt/wic_project
ExecStart=/usr/bin/npm run coverage-daemon
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Docker Compose

```yaml
services:
  coverage-daemon:
    build: .
    command: npm run coverage-daemon
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - COVERAGE_TARGET=95.0
    depends_on:
      - postgres
    restart: unless-stopped
```

## Troubleshooting

### Low Coverage Issues

**Problem:** Coverage stuck below 95%

**Solutions:**
1. Check data sources are accessible (Open Food Facts, UPC Database API)
2. Review sync errors: `npm run check-coverage -- --json | jq '.errors'`
3. Manually verify missing UPCs: `npm run check-coverage -- --missing`
4. Check for rate limiting issues
5. Verify database connectivity

### Sync Performance

**Problem:** Sync taking too long

**Solutions:**
1. Increase concurrency: `--concurrency 10`
2. Increase batch size: `--batch-size 200`
3. Limit UPCs per run: `--max-upcs 5000`
4. Skip image sync initially: remove `--images` flag
5. Run during off-peak hours

### Database Issues

**Problem:** Coverage queries timing out

**Solutions:**
1. Check indexes on `apl_entries` and `products` tables
2. Analyze query performance: `EXPLAIN ANALYZE`
3. Increase database connection pool size
4. Consider database read replicas for reporting

## Performance Metrics

### Typical Performance

- **Coverage Analysis**: 1-5 seconds for 50K UPCs
- **Sync Rate**: 500-1000 UPCs per minute (without images)
- **Sync Rate (with images)**: 100-300 UPCs per minute
- **Memory Usage**: ~100-200 MB (depends on batch size)

### Optimization Tips

1. **Batch Size**: 100-200 for optimal throughput
2. **Concurrency**: 5-10 (avoid overwhelming APIs)
3. **Images**: Sync separately from initial product data
4. **Caching**: APL database queries are cached briefly
5. **Incremental**: Use `skipExisting: true` to avoid re-syncing

## Testing

### Manual Testing

```bash
# 1. Check current coverage
npm run check-coverage

# 2. View missing UPCs
npm run check-coverage -- --missing --missing-limit 10

# 3. Test auto-sync with small batch
npm run check-coverage -- --auto-sync --max-upcs 100

# 4. Verify coverage improved
npm run check-coverage
```

### Automated Testing

```bash
# Unit tests
npm test src/services/product/APLCoverageService.test.ts

# Integration tests (requires test database)
npm run test:integration -- coverage
```

## Maintenance

### Daily Tasks

- ✅ Monitor coverage percentage (should be ≥ 95%)
- ✅ Review sync errors and failures
- ✅ Check daemon health and uptime

### Weekly Tasks

- ✅ Review coverage by state and category
- ✅ Analyze sync performance metrics
- ✅ Update priority categories if needed

### Monthly Tasks

- ✅ Audit product data quality
- ✅ Review and update APL data sources
- ✅ Optimize database indexes
- ✅ Review storage costs (images)

## Future Enhancements

- [ ] Machine learning for product matching
- [ ] Crowdsourced product data corrections
- [ ] Real-time coverage dashboard
- [ ] Webhook notifications for critical alerts
- [ ] Advanced analytics and reporting
- [ ] Multi-region deployment support

## Support

For issues or questions:
- GitHub Issues: https://github.com/MrMosesMichael/wic-benefits-app/issues
- Documentation: See `CLAUDE.md` and `specs/wic-benefits-app/`
