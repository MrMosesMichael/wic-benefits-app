# APL Update Monitoring and Sync Jobs

Comprehensive system for monitoring WIC Approved Product List (APL) data sources, detecting updates, and managing synchronization jobs across all supported states.

## Overview

The APL monitoring and sync system provides:

- **Update Detection**: Monitor state APL data sources for changes
- **Scheduled Sync**: Automated daily/weekly sync jobs
- **Emergency Sync**: High-priority sync triggers for urgent updates
- **Health Monitoring**: Track sync system health and detect issues
- **Data Freshness**: Monitor how current APL data is

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  APL Sync System                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Monitor    │  │ Orchestrator │  │  Scheduler   │     │
│  │  (Updates)   │→ │  (Parallel)  │← │  (Cron Job)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ↓                 ↓                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Health     │  │  Emergency   │  │   Database   │     │
│  │   Monitor    │  │   Trigger    │  │  (Postgres)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. APL Monitor Service

Monitors state APL data sources for changes without downloading full files.

**Features:**
- HEAD/ETag-based change detection
- Data freshness tracking
- Stale data alerts
- Configurable thresholds

**Usage:**
```typescript
import { createAPLMonitor } from './monitoring';

const monitor = createAPLMonitor(dbPool);

// Check for updates
const result = await monitor.checkForUpdates('MI');
if (result.hasUpdate) {
  console.log('Update available!');
}

// Check freshness
const freshness = await monitor.checkDataFreshness('MI');
if (freshness.isStale) {
  console.log(`Data is ${freshness.ageHours} hours old`);
}
```

### 2. Sync Orchestrator

Manages parallel sync job execution with retry logic.

**Features:**
- Parallel execution (max 2 states simultaneously)
- Automatic retry on failure (up to 3 attempts)
- Skip sync if no update detected
- Job queue management

**Usage:**
```typescript
import { createSyncOrchestrator } from './monitoring';

const orchestrator = createSyncOrchestrator(dbPool, monitor);

// Sync specific state
await orchestrator.syncState('MI');

// Sync all states
const results = await orchestrator.syncAll();
```

### 3. Scheduled Sync Job

Runs sync operations on a schedule using cron expressions.

**Features:**
- Daily, weekly, hourly presets
- Custom cron schedules
- Run history tracking
- Manual trigger capability

**Usage:**
```typescript
import { createScheduledSyncJob } from './monitoring';

// Daily at 2 AM
const job = createScheduledSyncJob(orchestrator, monitor, 'daily');
job.start();

// Custom schedule: every 6 hours
const customJob = createScheduledSyncJob(
  orchestrator,
  monitor,
  'custom',
  '0 */6 * * *'
);
```

### 4. Emergency Sync Trigger

Handles urgent, high-priority sync scenarios.

**Features:**
- Formula shortage triggers
- Policy change triggers
- Manual override capability
- Priority levels (low, medium, high, critical)

**Usage:**
```typescript
import { createEmergencySyncTrigger } from './monitoring';

const trigger = createEmergencySyncTrigger(orchestrator, monitor);

// Formula shortage emergency
await trigger.triggerFormulaShortageSyncc(['MI', 'NC']);

// Policy change
await trigger.triggerPolicyChange(['FL'], 'New whole grain rules');

// Manual override
await trigger.triggerManualOverride(['OR'], 'operator_name', 'Reason');
```

### 5. Sync Health Monitor

Monitors system health and generates health reports.

**Features:**
- Data freshness metrics
- Sync success rate tracking
- Error rate monitoring
- Consecutive failure detection
- Health status: healthy, degraded, unhealthy, critical

**Usage:**
```typescript
import { createSyncHealthMonitor } from './monitoring';

const healthMonitor = createSyncHealthMonitor(dbPool, monitor);

// Perform health check
const report = await healthMonitor.performHealthCheck();

console.log(`Overall health: ${report.overallHealth}`);
console.log(`Healthy states: ${report.healthyStates}`);
console.log(`Critical states: ${report.criticalStates}`);
```

## Complete System Setup

### Quick Start

```typescript
import { startAPLSyncSystem, stopAPLSyncSystem } from './monitoring';
import { Pool } from 'pg';

// Create database pool
const pool = new Pool({
  host: 'localhost',
  database: 'wic_benefits',
  user: 'wic_user',
  password: 'wic_password',
});

// Start complete system
const system = await startAPLSyncSystem(pool);

// System is now running with:
// - Daily sync at 2 AM
// - Continuous monitoring
// - Health checks
// - Emergency sync capability

// To stop:
stopAPLSyncSystem(system);
```

### Manual Setup (More Control)

```typescript
import {
  createAPLMonitor,
  createSyncOrchestrator,
  createScheduledSyncJob,
  createEmergencySyncTrigger,
  createSyncHealthMonitor,
} from './monitoring';

// 1. Create monitor
const monitor = createAPLMonitor(dbPool);

// 2. Create orchestrator
const orchestrator = createSyncOrchestrator(dbPool, monitor, {
  maxParallelJobs: 2,
  retryAttempts: 3,
  checkForUpdatesFirst: true,
  skipIfNoUpdate: true,
});

// 3. Create scheduler
const scheduler = createScheduledSyncJob(orchestrator, monitor, 'daily');
scheduler.start();

// 4. Create emergency trigger
const emergencyTrigger = createEmergencySyncTrigger(orchestrator, monitor);

// 5. Create health monitor
const healthMonitor = createSyncHealthMonitor(dbPool, monitor);
```

## Configuration

### Monitor Config

```typescript
{
  state: 'MI',
  dataSource: 'fis',
  checkUrl: 'https://www.michigan.gov/mdhhs/.../WIC_APL.xlsx',
  checkMethod: 'HEAD',  // HEAD, GET, or ETAG
  checkIntervalMinutes: 60,
  freshnessThresholdHours: 24,
  staleThresholdHours: 168,  // 7 days
  criticalThresholdHours: 336,  // 14 days
  enabled: true,
}
```

### Orchestrator Config

```typescript
{
  dbPool: pool,
  maxParallelJobs: 2,
  retryAttempts: 3,
  retryDelayMs: 5000,
  checkForUpdatesFirst: true,
  skipIfNoUpdate: true,
  states: ['MI', 'NC', 'FL', 'OR'],
}
```

### Schedule Config

```typescript
{
  cronExpression: '0 2 * * *',  // Daily at 2 AM
  timezone: 'America/New_York',
  runOnInit: false,
  states: ['MI', 'NC', 'FL', 'OR'],
  enabled: true,
}
```

### Health Check Config

```typescript
{
  freshnessThresholdHours: 24,
  successRateThreshold: 95,  // %
  errorRateThreshold: 5,  // %
  consecutiveFailureThreshold: 3,
  averageDurationThresholdMs: 300000,  // 5 minutes
}
```

## Event Handling

All components emit events for monitoring and alerting:

```typescript
// Orchestrator events
orchestrator.on('jobStart', (job) => {
  console.log(`Job started: ${job.state}`);
});

orchestrator.on('jobComplete', (job) => {
  console.log(`Job complete: ${job.entriesAdded} added`);
});

orchestrator.on('jobFailed', (job) => {
  console.error(`Job failed: ${job.error}`);
  // Send to monitoring service
});

// Health monitor events
healthMonitor.on('healthReport', (report) => {
  if (report.overallHealth === 'critical') {
    // Trigger alerts
  }
});

// Emergency trigger events
emergencyTrigger.on('syncStarted', (result) => {
  console.log('Emergency sync started');
});

emergencyTrigger.on('syncCompleted', (result) => {
  console.log('Emergency sync completed');
});
```

## Production Deployment

### Environment Variables

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wic_benefits
DB_USER=wic_user
DB_PASSWORD=wic_password

# Sync schedule (cron)
APL_SYNC_SCHEDULE="0 2 * * *"  # Daily at 2 AM
APL_SYNC_TIMEZONE="America/New_York"

# Monitoring
APL_HEALTH_CHECK_INTERVAL=3600000  # 1 hour in ms
APL_FRESHNESS_THRESHOLD_HOURS=24
APL_STALE_THRESHOLD_HOURS=168
```

### Docker Compose

```yaml
services:
  apl-sync-worker:
    image: wic-benefits-app:latest
    command: node dist/workers/apl-sync-worker.js
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_NAME=wic_benefits
      - APL_SYNC_SCHEDULE=0 2 * * *
    depends_on:
      - postgres
    restart: unless-stopped
```

### Monitoring Integration

```typescript
// Datadog
orchestrator.on('jobComplete', (job) => {
  dogstatsd.increment('apl.sync.success', {
    state: job.state,
  });
  dogstatsd.histogram('apl.sync.duration', job.durationMs, {
    state: job.state,
  });
});

// Sentry
orchestrator.on('jobFailed', (job) => {
  Sentry.captureException(new Error(job.error), {
    tags: {
      state: job.state,
      jobId: job.jobId,
    },
  });
});

// PagerDuty
healthMonitor.on('healthReport', (report) => {
  if (report.overallHealth === 'critical') {
    pagerduty.trigger({
      severity: 'critical',
      summary: 'APL sync system health critical',
      details: report,
    });
  }
});
```

## Troubleshooting

### Data is stale

```typescript
// Check freshness
const freshness = await monitor.checkDataFreshness('MI');
console.log(`Age: ${freshness.ageHours} hours`);

// Trigger manual sync
await orchestrator.syncState('MI');
```

### Sync failures

```typescript
// Check sync status
const status = orchestrator.getStatus();
console.log(`Failed jobs: ${status.failedJobs}`);

// Get results
const results = orchestrator.getResults();
results.filter(r => r.status === 'failed').forEach(job => {
  console.log(`${job.state}: ${job.error}`);
});

// Retry failed states
for (const job of results.filter(r => r.status === 'failed')) {
  await orchestrator.syncState(job.state);
}
```

### Health issues

```typescript
// Perform health check
const report = await healthMonitor.performHealthCheck();

// Review state-specific issues
for (const stateReport of report.stateReports) {
  if (stateReport.overallHealth !== 'healthy') {
    console.log(`${stateReport.state} issues:`, stateReport.issues);
    console.log(`Recommendations:`, stateReport.recommendations);
  }
}
```

## API Reference

See TypeScript types for detailed API documentation:
- `APLMonitorService` - Update monitoring
- `APLSyncOrchestrator` - Sync coordination
- `ScheduledAPLSyncJob` - Scheduled execution
- `EmergencySyncTrigger` - Emergency sync
- `SyncHealthMonitor` - Health monitoring

## Examples

See `src/examples/apl-sync-monitoring-example.ts` for complete examples:
- Complete system setup
- Manual update checks
- Data freshness monitoring
- Manual sync execution
- Scheduled sync jobs
- Emergency sync triggers
- Health monitoring
- Event-driven monitoring
- Production setup

## Related Documentation

- [APL Ingestion Services](../README.md) - State-specific ingestion
- [State Eligibility Rules](../../lib/services/eligibility/README.md) - Rules engine
- [Database Schema](../../../../docs/database-schema.md) - APL tables
