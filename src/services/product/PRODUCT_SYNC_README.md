# Product Database Sync Pipeline

**Task:** A2.5 - Create product database sync pipeline
**Status:** ✅ Complete
**Date:** 2026-01-21

## Overview

The Product Database Sync Pipeline automatically synchronizes product data from external sources (Open Food Facts, UPC Database) to the local PostgreSQL database. It provides:

- **Automated sync jobs** with batch processing and retry logic
- **Scheduled synchronization** (daily, hourly, custom intervals)
- **Health monitoring** with coverage and freshness metrics
- **Image synchronization** integration with CDN
- **Progress tracking** and error reporting
- **CLI tools** for manual sync and monitoring

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   External Data Sources                     │
├──────────────────┬──────────────────┬──────────────────────┤
│  Open Food Facts │  UPC Database    │  APL Database        │
│  (Primary)       │  (Fallback)      │  (Target UPCs)       │
└────────┬─────────┴────────┬─────────┴──────────┬───────────┘
         │                  │                    │
         ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  ProductSyncService                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Fetcher   │  │  Processor │  │  Upserter  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌────────────┐  ┌────────────┐  ┌────────────┐
│   Sync     │  │   Health   │  │  Coverage  │
│ Scheduler  │  │  Monitor   │  │  Metrics   │
└────────────┘  └────────────┘  └────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL Database                          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ products │  │ sync_jobs    │  │ coverage_metrics │      │
│  └──────────┘  └──────────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. ProductSyncService

Core sync engine that orchestrates product data synchronization.

**Key Features:**
- Multi-source data fetching (Open Food Facts → UPC Database)
- Batch processing with configurable concurrency
- Automatic retry with exponential backoff
- Skip existing products (incremental sync)
- Progress tracking and callbacks
- Pause/resume/cancel support
- Image sync integration (optional)

**Usage:**

```typescript
import { createProductSyncService } from './services/product';

const syncService = createProductSyncService(repository, {
  sources: ['open_food_facts', 'upc_database'],
  batchSize: 100,
  concurrency: 5,
  skipExisting: true,
  syncImages: true,
  imageService: imageStorageService,
  limit: 1000,
});

const result = await syncService.sync((progress) => {
  console.log(`Progress: ${progress.progress}%`);
});
```

### 2. ProductSyncScheduler

Manages automated scheduled synchronization jobs.

**Key Features:**
- Cron-style scheduling (daily, hourly, custom intervals)
- Specific hour scheduling (e.g., 2am daily)
- Incremental vs. full sync strategies
- Target coverage monitoring
- Automatic sync triggering based on coverage
- Event-driven architecture
- Sync history tracking (last 30 runs)

**Usage:**

```typescript
import { createProductSyncScheduler } from './services/product';

const scheduler = createProductSyncScheduler(repository, {
  intervalHours: 24,
  syncHour: 2, // 2am
  incrementalSync: true,
  targetCoverage: 95,
  autoStart: true,
});

// Events
scheduler.on('syncComplete', (result) => {
  console.log(`Sync completed: +${result.productsAdded} products`);
});

// Manual trigger
await scheduler.runSync();
```

### 3. ProductSyncMonitor

Monitors product database health and generates alerts.

**Key Features:**
- **Coverage monitoring** - tracks % of APL UPCs with product data
- **Freshness monitoring** - detects stale data and missing syncs
- **Quality monitoring** - tracks verified products, images, nutrition
- **Alert system** - info, warning, critical severity levels
- **Health scoring** - 0-100 overall health score
- **Configurable thresholds** for alerts

**Usage:**

```typescript
import { createProductSyncMonitor } from './services/product';

const monitor = createProductSyncMonitor(repository, {
  coverageThresholds: {
    minimumCoverage: 85,
    targetCoverage: 95,
    criticalCoverage: 70,
  },
  freshnessThresholds: {
    warnNoSyncHours: 48,
    alertNoSyncHours: 72,
  },
});

const health = await monitor.checkHealth();

if (!health.healthy) {
  const criticalAlerts = monitor.getCriticalAlerts();
  // Send notifications...
}
```

## CLI Tools

### sync-products

Run manual product sync jobs.

```bash
# Incremental sync (skip existing products)
npm run sync-products

# Full sync (update all products)
npm run sync-products -- --full

# Sync with images
npm run sync-products -- --images

# Sync specific UPCs
npm run sync-products -- --upcs 012345678901,098765432109

# Limit to first N products
npm run sync-products -- --limit 100

# Custom batch size and concurrency
npm run sync-products -- --batch-size 50 --concurrency 3

# Show statistics only (no sync)
npm run sync-products -- --stats
```

### monitor-products

Monitor product database health.

```bash
# Single health check
npm run monitor-products

# Continuous monitoring (every 5 minutes)
npm run monitor-products -- --watch

# Show alerts only
npm run monitor-products -- --alerts

# Custom interval
npm run monitor-products -- --watch --interval 600
```

## Database Tables

### product_sync_jobs

Tracks individual sync job executions.

**Columns:**
- `job_id` - Unique job identifier
- `status` - pending, running, completed, failed, paused, cancelled
- `start_time` / `end_time` / `duration_ms`
- `total_products` / `products_added` / `products_updated` / `products_skipped` / `products_failed`
- `images_processed` / `images_failed`
- `progress` - 0-100
- `sources` - JSONB array of data sources
- `config` - JSONB sync configuration

### product_sync_errors

Stores sync errors for debugging and retry logic.

**Columns:**
- `job_id` - Foreign key to sync job
- `upc` - UPC that failed
- `source` - Data source (open_food_facts, upc_database)
- `error_message` / `error_stack`
- `retries` - Number of retry attempts
- `resolved` - Boolean flag

### product_coverage_metrics

Time-series product coverage metrics.

**Columns:**
- `total_products` / `products_with_images` / `products_with_nutrition` / `verified_products`
- `coverage_percentage` - Overall coverage vs APL UPCs
- `image_coverage_percentage` / `nutrition_coverage_percentage`
- `coverage_by_source` - JSONB breakdown by data source
- `coverage_by_category` - JSONB top 20 categories
- `timestamp`

### product_sync_schedule

Scheduled sync job configuration.

**Columns:**
- `schedule_name` - Unique schedule name
- `enabled` - Boolean
- `interval_hours` / `sync_hour`
- `incremental_sync` - Boolean
- `target_coverage` - Decimal (e.g., 95.00)
- `last_run` / `next_run`
- `total_runs` / `successful_runs` / `failed_runs`
- `config` - JSONB sync configuration

### product_health_checks

Product database health check results.

**Columns:**
- `healthy` - Boolean overall health
- `health_score` - Decimal 0-100
- `coverage_status` / `freshness_status` / `quality_status`
- `current_coverage` / `coverage_gap`
- `last_sync_age_hours`
- `verified_percentage` / `image_quality_percentage` / `nutrition_quality_percentage`
- `alert_count` / `critical_alert_count`
- `alerts` - JSONB array of alert objects

## Configuration

### Environment Variables

```bash
# Database (required)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wic_benefits
DB_USER=wic_user
DB_PASSWORD=secure_password

# UPC Database API (optional - enables UPC Database as fallback source)
UPC_DATABASE_API_KEY=your_api_key_here

# Image Storage (optional - enables image sync)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=wic-benefits-product-images
AWS_REGION=us-east-1
CLOUDFRONT_DOMAIN=d123456.cloudfront.net
```

### Sync Job Configuration

```typescript
{
  // Data sources to sync from (priority order)
  sources: ['open_food_facts', 'upc_database'],

  // Batch processing
  batchSize: 100,        // Products per batch
  concurrency: 5,        // Concurrent API requests

  // Retry logic
  retryFailures: true,
  maxRetries: 3,
  retryDelayMs: 2000,

  // Sync strategy
  skipExisting: true,    // true = incremental, false = full
  syncImages: false,     // Sync product images to CDN

  // Target scope
  targetUPCs: [],        // Empty = all APL UPCs
  categories: [],        // Empty = all categories
  limit: undefined,      // undefined = no limit
}
```

## Sync Strategies

### Incremental Sync (Default)

- Skips products already in database
- Fast, efficient for daily updates
- Catches new APL products
- Recommended for scheduled jobs

**When to use:**
- Daily/hourly scheduled syncs
- Maintaining target coverage
- Low server load periods

### Full Sync

- Updates all products regardless of existence
- Slow, resource-intensive
- Refreshes stale data
- Ensures data accuracy

**When to use:**
- Initial database population
- After data quality issues
- Major upstream data changes
- Monthly deep refresh

### Targeted Sync

- Sync specific UPCs or categories
- Fast, precise updates
- Useful for emergency updates
- Formula products, high-priority items

**When to use:**
- Critical product updates
- Formula shortage response
- Bug fixes for specific products
- Category-specific refreshes

## Health Metrics

### Coverage Score (50% weight)

Measures what % of APL UPCs have product data in database.

**Thresholds:**
- Target: 95%
- Minimum: 85%
- Critical: 70%

**Impact:** Users can't scan products without data.

### Freshness Score (30% weight)

Measures data recency and sync frequency.

**Thresholds:**
- Healthy: Last sync < 48 hours
- Warning: Last sync 48-72 hours
- Critical: Last sync > 72 hours

**Impact:** Stale data may have incorrect pricing, availability.

### Quality Score (20% weight)

Measures data completeness and verification.

**Metrics:**
- Verified products %
- Products with images %
- Products with nutrition %

**Impact:** Poor quality = bad UX, user distrust.

### Overall Health Score

Weighted average of coverage (50%) + freshness (30%) + quality (20%).

**Ranges:**
- 90-100: Excellent
- 80-89: Good
- 70-79: Fair (action recommended)
- <70: Poor (urgent action needed)

## Performance

### Sync Speed

**Open Food Facts:**
- Single product: ~200-500ms
- Batch (100 products): ~2-3 minutes
- Full sync (10K products): ~4-5 hours

**UPC Database:**
- Single product: ~300-600ms
- Batch (100 products): ~3-5 minutes

**Factors:**
- Network latency
- API rate limits
- Concurrency level
- Database performance

### Resource Usage

**Memory:**
- Sync service: ~50-100MB
- Scheduler: ~20-30MB
- Monitor: ~10-20MB

**CPU:**
- Low during idle
- Moderate during sync (JSON parsing, image processing)
- Spikes during batch upserts

**Database:**
- Read-heavy during coverage checks
- Write-heavy during sync
- Recommend separate connection pool

## Monitoring & Alerts

### Alert Levels

**INFO:**
- Informational, no action needed
- Examples: Low nutrition coverage, sync scheduled

**WARNING:**
- Action recommended soon
- Examples: Coverage below 85%, sync delayed 48h

**CRITICAL:**
- Urgent action required
- Examples: Coverage below 70%, no sync in 72h, critical errors

### Alert Channels

1. **Console Logs** - Always enabled
2. **Database** - Stored in `product_health_checks` table
3. **Email** (TODO) - Send to admins on critical alerts
4. **Slack** (TODO) - Post to #wic-alerts channel
5. **PagerDuty** (TODO) - Page on-call for critical issues

### Recommended Monitoring

- **Daily:** Run health check via cron
- **Hourly:** Check sync job status
- **Real-time:** Monitor critical alerts
- **Weekly:** Review coverage trends
- **Monthly:** Audit data quality

## Troubleshooting

### Sync Job Stuck

**Symptoms:** Job status = 'running' for hours

**Solutions:**
1. Check database connection
2. Look for network issues (external APIs)
3. Review `product_sync_errors` table
4. Cancel job and restart
5. Reduce batch size / concurrency

### Low Coverage

**Symptoms:** Coverage < 85%

**Solutions:**
1. Run full sync to catch up
2. Check APL database for new UPCs
3. Verify external API health
4. Review error logs
5. Consider adding more data sources

### High Error Rate

**Symptoms:** > 10% products failing

**Solutions:**
1. Check API keys / auth
2. Verify network connectivity
3. Review error messages in DB
4. Check API rate limits
5. Reduce concurrency
6. Add retry logic / backoff

### Stale Data

**Symptoms:** Last sync > 72 hours

**Solutions:**
1. Check scheduler is running
2. Verify cron job is active
3. Review scheduler logs
4. Check system resources
5. Manually trigger sync

## Best Practices

### Production Setup

1. **Enable scheduled sync** - Daily at 2am
2. **Set target coverage** - 95%
3. **Configure monitoring** - Health checks every hour
4. **Set up alerts** - Email + Slack for critical
5. **Log rotation** - Archive old sync jobs (>30 days)
6. **Database backups** - Before major syncs

### Performance Tuning

1. **Batch size** - 100 for balanced speed/memory
2. **Concurrency** - 5 for most APIs (respect rate limits)
3. **Skip existing** - Always for incremental sync
4. **Sync images separately** - Run as background job
5. **Off-peak hours** - Schedule syncs at 2am-4am

### Data Quality

1. **Verify products** - Mark verified after manual review
2. **Prioritize sources** - Open Food Facts > UPC Database
3. **Regular audits** - Monthly quality checks
4. **User feedback** - Allow reporting bad data
5. **De-duplication** - UPC as primary key

## Migration Strategy

### Phase 1: Initial Setup (Week 1)

1. Run database migrations
2. Configure environment variables
3. Test sync with small dataset (100 products)
4. Verify data quality

### Phase 2: Full Sync (Week 2)

1. Run full sync for all APL UPCs
2. Monitor progress and errors
3. Fix data quality issues
4. Optimize batch size / concurrency

### Phase 3: Enable Scheduler (Week 3)

1. Set up daily incremental sync
2. Configure health monitoring
3. Set up alert channels
4. Test pause/resume functionality

### Phase 4: Production (Week 4)

1. Enable automated monitoring
2. Set up log rotation
3. Document runbooks
4. Train team on troubleshooting

## Future Enhancements

- [ ] Multi-region sync for redundancy
- [ ] Machine learning for data quality scoring
- [ ] Automatic retry queue for failed products
- [ ] Real-time sync via webhooks
- [ ] GraphQL API for sync status
- [ ] Mobile app integration for sync progress
- [ ] Crowdsourced data verification
- [ ] Alternative data sources (Kroger, Walmart feeds)
- [ ] Intelligent sync scheduling based on usage patterns
- [ ] A/B testing for sync strategies

## Support

For issues or questions:
- Check troubleshooting guide above
- Review `product_sync_errors` table
- Check health monitoring dashboard
- Contact: [Engineering team]

## Related Documentation

- A2.1: [UPC-to-Product Database Sources](../docs/A2.1_IMPLEMENTATION_SUMMARY.md)
- A2.2: [Product Data Schema](../docs/A2.2_IMPLEMENTATION_SUMMARY.md)
- A2.3: [Product Lookup API](../docs/A2.3_IMPLEMENTATION_SUMMARY.md)
- A2.4: [Product Image Storage/CDN](./A2.4_IMPLEMENTATION_SUMMARY.md)
- Data Layer Spec: [specs/wic-benefits-app/specs/data-layer/spec.md](../../../specs/wic-benefits-app/specs/data-layer/spec.md)
