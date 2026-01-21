/**
 * Oregon APL Sync Worker
 *
 * Background worker that periodically syncs Oregon WIC APL data.
 * Runs on a schedule to keep data fresh.
 *
 * Usage:
 *   import { startOregonSyncWorker } from './workers/oregon-sync-worker';
 *   const worker = await startOregonSyncWorker(dbPool);
 *
 * @module services/apl/workers/oregon-sync-worker
 */

import { Pool } from 'pg';
import { OregonAPLIngestionService } from '../oregon-ingestion.service';
import {
  createOregonAPLConfig,
  OREGON_APL_SYNC_SCHEDULE,
} from '../config/oregon.config';

/**
 * Worker state
 */
interface WorkerState {
  running: boolean;
  lastSyncAt?: Date;
  lastSuccessAt?: Date;
  consecutiveFailures: number;
  intervalId?: NodeJS.Timeout;
}

/**
 * Worker configuration
 */
export interface OregonSyncWorkerConfig {
  /** Database connection pool */
  dbPool: Pool;

  /** Check interval in milliseconds (default: 24 hours) */
  checkIntervalMs?: number;

  /** Maximum consecutive failures before stopping (default: 3) */
  maxConsecutiveFailures?: number;

  /** Callback on successful sync */
  onSuccess?: (stats: any) => void;

  /** Callback on failed sync */
  onFailure?: (error: Error) => void;

  /** Callback on worker stopped */
  onStopped?: (reason: string) => void;
}

/**
 * Oregon APL Sync Worker
 *
 * Periodically checks for Oregon APL updates and syncs them to the database.
 */
export class OregonAPLSyncWorker {
  private config: OregonSyncWorkerConfig;
  private state: WorkerState;

  constructor(config: OregonSyncWorkerConfig) {
    this.config = config;
    this.state = {
      running: false,
      consecutiveFailures: 0,
    };
  }

  /**
   * Start the sync worker
   */
  async start(): Promise<void> {
    if (this.state.running) {
      console.warn('Oregon sync worker already running');
      return;
    }

    console.log('🌲 Starting Oregon APL sync worker...');

    this.state.running = true;

    // Run initial sync immediately
    await this.runSync();

    // Schedule periodic syncs
    const intervalMs =
      this.config.checkIntervalMs ||
      OREGON_APL_SYNC_SCHEDULE.checkIntervalHours * 60 * 60 * 1000;

    this.state.intervalId = setInterval(() => {
      this.runSync();
    }, intervalMs);

    console.log(
      `✅ Oregon sync worker started (interval: ${intervalMs / 1000 / 60} minutes)`
    );
  }

  /**
   * Stop the sync worker
   */
  stop(reason = 'Manual stop'): void {
    if (!this.state.running) {
      console.warn('Oregon sync worker not running');
      return;
    }

    console.log(`🛑 Stopping Oregon sync worker: ${reason}`);

    this.state.running = false;

    if (this.state.intervalId) {
      clearInterval(this.state.intervalId);
      this.state.intervalId = undefined;
    }

    if (this.config.onStopped) {
      this.config.onStopped(reason);
    }

    console.log('✅ Oregon sync worker stopped');
  }

  /**
   * Run a sync operation
   */
  private async runSync(): Promise<void> {
    if (!this.state.running) {
      return;
    }

    console.log('🔄 Starting Oregon APL sync...');
    this.state.lastSyncAt = new Date();

    try {
      // Create ingestion config
      const aplConfig = createOregonAPLConfig(this.config.dbPool, {
        useLocalFile: false, // Always download for scheduled sync
      });

      // Run ingestion
      const service = new OregonAPLIngestionService(aplConfig);
      const stats = await service.ingest();

      // Sync successful
      this.state.lastSuccessAt = new Date();
      this.state.consecutiveFailures = 0;

      console.log('✅ Oregon APL sync completed successfully');
      console.log(`   Additions: ${stats.additions}, Updates: ${stats.updates}`);

      if (this.config.onSuccess) {
        this.config.onSuccess(stats);
      }
    } catch (error) {
      // Sync failed
      this.state.consecutiveFailures++;

      console.error('❌ Oregon APL sync failed:', error.message);
      console.error(`   Consecutive failures: ${this.state.consecutiveFailures}`);

      if (this.config.onFailure) {
        this.config.onFailure(error);
      }

      // Check if we should stop due to too many failures
      const maxFailures =
        this.config.maxConsecutiveFailures ||
        OREGON_APL_SYNC_SCHEDULE.maxConsecutiveFailures;

      if (this.state.consecutiveFailures >= maxFailures) {
        this.stop(`Too many consecutive failures (${this.state.consecutiveFailures})`);
      }
    }
  }

  /**
   * Get worker state
   */
  getState(): WorkerState {
    return { ...this.state };
  }

  /**
   * Check if worker is running
   */
  isRunning(): boolean {
    return this.state.running;
  }

  /**
   * Trigger an immediate sync (in addition to scheduled syncs)
   */
  async triggerSync(): Promise<void> {
    console.log('🔔 Manual sync triggered for Oregon APL');
    await this.runSync();
  }
}

/**
 * Create and start Oregon sync worker
 *
 * Convenience function to create and start the worker in one step.
 *
 * @param dbPool Database connection pool
 * @param config Optional worker configuration
 * @returns Running worker instance
 */
export async function startOregonSyncWorker(
  dbPool: Pool,
  config?: Partial<OregonSyncWorkerConfig>
): Promise<OregonAPLSyncWorker> {
  const worker = new OregonAPLSyncWorker({
    dbPool,
    ...config,
  });

  await worker.start();

  return worker;
}

/**
 * Example usage for standalone execution
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const dbPool = new Pool({
    connectionString: databaseUrl,
  });

  // Start worker with callbacks
  const worker = await startOregonSyncWorker(dbPool, {
    onSuccess: (stats) => {
      console.log(`📊 Sync stats: ${stats.additions} additions, ${stats.updates} updates`);
    },
    onFailure: (error) => {
      console.error(`💥 Sync error: ${error.message}`);
    },
    onStopped: (reason) => {
      console.log(`🛑 Worker stopped: ${reason}`);
      process.exit(1);
    },
  });

  console.log('Worker running. Press Ctrl+C to stop.');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, stopping worker...');
    worker.stop('SIGINT received');
    dbPool.end();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, stopping worker...');
    worker.stop('SIGTERM received');
    dbPool.end();
    process.exit(0);
  });
}

// Run if called directly
if (require.main === module) {
  main();
}
