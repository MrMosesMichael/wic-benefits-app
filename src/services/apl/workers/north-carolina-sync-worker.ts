/**
 * North Carolina APL Sync Worker
 *
 * Background worker that runs on a schedule to keep North Carolina APL data fresh.
 * Handles retry logic, error reporting, and status tracking.
 *
 * @module services/apl/workers/north-carolina-sync-worker
 */

import { Pool } from 'pg';
import { CronJob } from 'cron';
import { ingestNorthCarolinaAPL } from '../north-carolina-ingestion.service';
import {
  getNorthCarolinaAPLConfig,
  validateNorthCarolinaConfig,
  NORTH_CAROLINA_SYNC_CONFIG,
} from '../config/north-carolina.config';

/**
 * Sync worker status
 */
export interface SyncWorkerStatus {
  isRunning: boolean;
  lastRunAt?: Date;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  consecutiveFailures: number;
  nextScheduledRun?: Date;
}

/**
 * North Carolina APL Sync Worker
 *
 * Automated background worker that syncs North Carolina APL data on schedule
 */
export class NorthCarolinaSyncWorker {
  private dbPool: Pool;
  private cronJob?: CronJob;
  private status: SyncWorkerStatus;
  private isShuttingDown: boolean = false;

  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
    this.status = {
      isRunning: false,
      consecutiveFailures: 0,
    };
  }

  /**
   * Start the sync worker
   */
  public start(): void {
    console.log('🚀 Starting North Carolina APL Sync Worker...');

    // Validate configuration
    const configValidation = validateNorthCarolinaConfig();
    if (!configValidation.valid) {
      console.error('❌ Configuration validation failed:');
      configValidation.errors.forEach(err => console.error(`   - ${err}`));
      throw new Error('Invalid configuration');
    }

    // Get configuration
    const config = getNorthCarolinaAPLConfig();

    // Create cron job
    this.cronJob = new CronJob(
      config.cronSchedule,
      () => this.runSync(),
      null, // onComplete
      true, // start immediately
      config.timezone
    );

    // Calculate next run time
    const nextRun = this.cronJob.nextDate();
    this.status.nextScheduledRun = nextRun.toDate();

    console.log('✅ Sync worker started');
    console.log(`   Schedule: ${config.cronSchedule} (${config.timezone})`);
    console.log(`   Next run: ${this.status.nextScheduledRun.toISOString()}`);

    // Setup graceful shutdown
    this.setupShutdownHandlers();
  }

  /**
   * Stop the sync worker
   */
  public stop(): void {
    console.log('🛑 Stopping North Carolina APL Sync Worker...');
    this.isShuttingDown = true;

    if (this.cronJob) {
      this.cronJob.stop();
      console.log('✅ Sync worker stopped');
    }
  }

  /**
   * Run sync immediately (outside of schedule)
   */
  public async runSyncNow(): Promise<void> {
    console.log('🔄 Running manual sync...');
    await this.runSync();
  }

  /**
   * Get worker status
   */
  public getStatus(): SyncWorkerStatus {
    return { ...this.status };
  }

  /**
   * Run the sync process
   */
  private async runSync(): Promise<void> {
    // Skip if already running
    if (this.status.isRunning) {
      console.log('⏭️  Sync already in progress, skipping this run');
      return;
    }

    // Skip if shutting down
    if (this.isShuttingDown) {
      console.log('⏭️  Worker is shutting down, skipping sync');
      return;
    }

    this.status.isRunning = true;
    this.status.lastRunAt = new Date();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`North Carolina APL Sync - ${this.status.lastRunAt.toISOString()}`);
    console.log('='.repeat(60));

    try {
      // Get configuration
      const config = getNorthCarolinaAPLConfig();

      // Build ingestion config
      const ingestionConfig = {
        downloadUrl: config.downloadUrl,
        dbPool: this.dbPool,
      };

      // Run ingestion with retry logic
      const stats = await this.runWithRetry(async () => {
        return await ingestNorthCarolinaAPL(ingestionConfig);
      });

      // Update status on success
      this.status.lastSuccessAt = new Date();
      this.status.consecutiveFailures = 0;

      // Log success
      console.log('\n✅ Sync completed successfully');
      console.log(`   Entries added: ${stats.additions}`);
      console.log(`   Entries updated: ${stats.updates}`);
      console.log(`   Duration: ${stats.durationMs}ms`);

      // Update database sync status
      await this.updateSyncStatus('success', null, stats);

      // Check for alerts
      this.checkAlertThresholds(stats);

    } catch (error) {
      // Update status on failure
      this.status.lastFailureAt = new Date();
      this.status.consecutiveFailures++;

      // Log error
      console.error('\n❌ Sync failed:', error.message);
      console.error(`   Consecutive failures: ${this.status.consecutiveFailures}`);

      // Update database sync status
      await this.updateSyncStatus('failure', error.message, null);

      // Send alert if threshold exceeded
      if (this.status.consecutiveFailures >= NORTH_CAROLINA_SYNC_CONFIG.ALERT_AFTER_CONSECUTIVE_FAILURES) {
        await this.sendAlert(`North Carolina APL sync has failed ${this.status.consecutiveFailures} times consecutively`);
      }

      // Re-throw if too many consecutive failures
      if (this.status.consecutiveFailures >= NORTH_CAROLINA_SYNC_CONFIG.MAX_RETRIES * 2) {
        throw error;
      }
    } finally {
      this.status.isRunning = false;

      // Update next scheduled run
      if (this.cronJob) {
        const nextRun = this.cronJob.nextDate();
        this.status.nextScheduledRun = nextRun.toDate();
        console.log(`   Next scheduled run: ${this.status.nextScheduledRun.toISOString()}`);
      }

      console.log('='.repeat(60) + '\n');
    }
  }

  /**
   * Run function with retry logic
   */
  private async runWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= NORTH_CAROLINA_SYNC_CONFIG.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.error(`   Attempt ${attempt}/${NORTH_CAROLINA_SYNC_CONFIG.MAX_RETRIES} failed: ${error.message}`);

        if (attempt < NORTH_CAROLINA_SYNC_CONFIG.MAX_RETRIES) {
          const delay = NORTH_CAROLINA_SYNC_CONFIG.RETRY_DELAY_MS * attempt;
          console.log(`   Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Update sync status in database
   */
  private async updateSyncStatus(
    status: 'success' | 'failure',
    errorMessage: string | null,
    stats: any
  ): Promise<void> {
    try {
      await this.dbPool.query(
        `INSERT INTO apl_sync_status (
          state, data_source, last_sync_at, last_success_at, sync_status,
          entries_count, last_error, consecutive_failures
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (state, data_source) DO UPDATE SET
          last_sync_at = $3,
          last_success_at = CASE WHEN $5 = 'success' THEN $4 ELSE apl_sync_status.last_success_at END,
          sync_status = $5,
          entries_count = COALESCE($6, apl_sync_status.entries_count),
          last_error = $7,
          consecutive_failures = CASE WHEN $5 = 'success' THEN 0 ELSE apl_sync_status.consecutive_failures + 1 END`,
        [
          'NC',
          'conduent',
          new Date(),
          status === 'success' ? new Date() : null,
          status,
          stats ? stats.additions + stats.updates : null,
          errorMessage,
          this.status.consecutiveFailures,
        ]
      );
    } catch (error) {
      console.error('⚠️  Failed to update sync status in database:', error.message);
    }
  }

  /**
   * Check alert thresholds
   */
  private checkAlertThresholds(stats: any): void {
    // Check if data hasn't been updated in too long
    // This would require checking file hash changes in the database
    // Placeholder for future implementation
  }

  /**
   * Send alert (placeholder for notification system)
   */
  private async sendAlert(message: string): Promise<void> {
    console.error(`\n🚨 ALERT: ${message}`);
    // TODO: Implement actual notification system (email, Slack, etc.)
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = () => {
      console.log('\n📛 Received shutdown signal');
      this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Run worker as standalone process
 */
export async function runStandaloneWorker(): Promise<void> {
  console.log('🏛️  North Carolina APL Sync Worker (Standalone)\n');

  // Validate environment
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in environment');
    process.exit(1);
  }

  // Create database pool
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  console.log('✅ Connected to database');

  // Create and start worker
  const worker = new NorthCarolinaSyncWorker(dbPool);
  worker.start();

  // Keep process alive
  process.on('exit', () => {
    dbPool.end();
    console.log('✅ Database connection closed');
  });
}

// Run as standalone if executed directly
if (require.main === module) {
  runStandaloneWorker().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
