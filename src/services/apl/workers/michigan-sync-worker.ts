/**
 * Michigan APL Sync Worker
 *
 * Automated scheduled worker for syncing Michigan WIC APL data.
 * Designed to run as a cron job or scheduled task.
 *
 * Schedule Recommendations:
 * - Development/Testing: Hourly or on-demand
 * - Production (Public Source): Daily at 2 AM EST
 * - Production (Vendor Portal): Daily at 1 AM EST
 *
 * @module services/apl/workers/michigan-sync-worker
 */

import { Pool } from 'pg';
import { CronJob } from 'cron';
import { MichiganAPLIngestionService, IngestionStats } from '../michigan-ingestion.service';

/**
 * Worker configuration
 */
export interface MichiganSyncWorkerConfig {
  /** APL download URL */
  downloadUrl: string;
  /** Database connection pool */
  dbPool: Pool;
  /** Cron schedule (default: daily at 2 AM EST) */
  cronSchedule?: string;
  /** Timezone for cron (default: America/Detroit) */
  timezone?: string;
  /** Enable automatic scheduling */
  autoStart?: boolean;
  /** Error notification callback */
  onError?: (error: Error, stats?: IngestionStats) => void;
  /** Success notification callback */
  onSuccess?: (stats: IngestionStats) => void;
  /** Sync status notification callback */
  onSyncStatusChange?: (status: SyncStatus) => void;
}

/**
 * Sync status
 */
export interface SyncStatus {
  state: 'MI';
  dataSource: 'fis';
  status: 'pending' | 'running' | 'success' | 'failed';
  lastSyncAt?: Date;
  lastSuccessAt?: Date;
  consecutiveFailures: number;
  lastError?: string;
}

/**
 * Michigan APL Sync Worker
 * Handles automated scheduled syncing of Michigan APL data
 */
export class MichiganSyncWorker {
  private config: MichiganSyncWorkerConfig;
  private cronJob?: CronJob;
  private isRunning: boolean = false;
  private syncStatus: SyncStatus;

  constructor(config: MichiganSyncWorkerConfig) {
    this.config = {
      cronSchedule: '0 2 * * *', // 2 AM daily (default)
      timezone: 'America/Detroit', // Michigan timezone
      autoStart: false,
      ...config,
    };

    this.syncStatus = {
      state: 'MI',
      dataSource: 'fis',
      status: 'pending',
      consecutiveFailures: 0,
    };

    if (this.config.autoStart) {
      this.start();
    }
  }

  /**
   * Start the scheduled worker
   */
  public start(): void {
    if (this.cronJob) {
      console.log('⚠️  Worker already started');
      return;
    }

    console.log(`🚀 Starting Michigan APL sync worker`);
    console.log(`   Schedule: ${this.config.cronSchedule}`);
    console.log(`   Timezone: ${this.config.timezone}`);

    this.cronJob = new CronJob(
      this.config.cronSchedule!,
      () => this.runSync(),
      null, // onComplete
      true, // start
      this.config.timezone,
    );

    console.log('✅ Worker started');
  }

  /**
   * Stop the scheduled worker
   */
  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = undefined;
      console.log('🛑 Worker stopped');
    }
  }

  /**
   * Run sync immediately (manual trigger)
   */
  public async runSync(): Promise<IngestionStats> {
    if (this.isRunning) {
      console.log('⚠️  Sync already in progress, skipping...');
      throw new Error('Sync already in progress');
    }

    this.isRunning = true;
    this.updateStatus({ status: 'running', lastSyncAt: new Date() });

    console.log(`\n🔄 Starting Michigan APL sync - ${new Date().toISOString()}`);

    try {
      // Create ingestion service
      const service = new MichiganAPLIngestionService({
        downloadUrl: this.config.downloadUrl,
        dbPool: this.config.dbPool,
      });

      // Run ingestion
      const stats = await service.ingest();

      // Check for errors
      if (stats.errors.length > 0) {
        // Partial failure - some errors but sync completed
        this.updateStatus({
          status: 'failed',
          consecutiveFailures: this.syncStatus.consecutiveFailures + 1,
          lastError: `${stats.errors.length} errors during sync`,
        });

        console.log(`⚠️  Sync completed with errors: ${stats.errors.length}`);

        if (this.config.onError) {
          this.config.onError(new Error('Sync completed with errors'), stats);
        }
      } else {
        // Success
        this.updateStatus({
          status: 'success',
          lastSuccessAt: new Date(),
          consecutiveFailures: 0,
          lastError: undefined,
        });

        console.log('✅ Sync completed successfully');

        if (this.config.onSuccess) {
          this.config.onSuccess(stats);
        }
      }

      this.isRunning = false;
      return stats;
    } catch (error) {
      // Complete failure
      this.updateStatus({
        status: 'failed',
        consecutiveFailures: this.syncStatus.consecutiveFailures + 1,
        lastError: error.message,
      });

      console.error('❌ Sync failed:', error.message);

      if (this.config.onError) {
        this.config.onError(error);
      }

      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Update sync status and notify
   */
  private updateStatus(updates: Partial<SyncStatus>): void {
    const previousStatus = this.syncStatus.status;

    this.syncStatus = {
      ...this.syncStatus,
      ...updates,
    };

    // Notify if status changed
    if (previousStatus !== this.syncStatus.status && this.config.onSyncStatusChange) {
      this.config.onSyncStatusChange(this.syncStatus);
    }

    // Alert on consecutive failures
    if (this.syncStatus.consecutiveFailures >= 3) {
      console.error(
        `🚨 ALERT: ${this.syncStatus.consecutiveFailures} consecutive sync failures for Michigan APL`
      );
    }
  }

  /**
   * Get current sync status
   */
  public getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Check if worker is running
   */
  public isActive(): boolean {
    return !!this.cronJob;
  }

  /**
   * Get next scheduled run time
   */
  public getNextRunTime(): Date | null {
    if (!this.cronJob) return null;
    return this.cronJob.nextDate().toJSDate();
  }
}

/**
 * Convenience function to create and start worker
 */
export function startMichiganSyncWorker(
  config: MichiganSyncWorkerConfig
): MichiganSyncWorker {
  const worker = new MichiganSyncWorker({
    ...config,
    autoStart: true,
  });

  return worker;
}

/**
 * Example usage as standalone script
 */
if (require.main === module) {
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const worker = new MichiganSyncWorker({
    downloadUrl: process.env.MICHIGAN_APL_URL || '',
    dbPool,
    autoStart: true,
    onSuccess: (stats) => {
      console.log(`✅ Sync successful - ${stats.additions} additions, ${stats.updates} updates`);
    },
    onError: (error, stats) => {
      console.error(`❌ Sync failed: ${error.message}`);
      if (stats) {
        console.error(`   Errors: ${stats.errors.length}`);
      }
    },
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down worker...');
    worker.stop();
    dbPool.end().then(() => {
      console.log('✅ Worker stopped');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down worker...');
    worker.stop();
    dbPool.end().then(() => {
      console.log('✅ Worker stopped');
      process.exit(0);
    });
  });

  console.log('Worker started. Press Ctrl+C to stop.');
}
