/**
 * Product Sync Scheduler
 *
 * Manages scheduled product database synchronization jobs.
 * Supports cron-based scheduling, incremental sync, and coverage monitoring.
 *
 * @module services/product/ProductSyncScheduler
 */

import { EventEmitter } from 'events';
import { ProductSyncService, SyncJobResult, SyncJobConfig } from './ProductSyncService';
import { ProductRepository } from '../../database/ProductRepository';

/**
 * Sync schedule configuration
 */
export interface SyncScheduleConfig {
  /** Database repository */
  repository: ProductRepository;

  /** Sync interval in hours (default: 24) */
  intervalHours: number;

  /** Sync at specific hour (0-23, default: 2am) */
  syncHour?: number;

  /** Enable incremental sync (only new/missing products) */
  incrementalSync: boolean;

  /** Target coverage percentage (95 = 95%) */
  targetCoverage: number;

  /** Base sync job config */
  syncConfig: Partial<SyncJobConfig>;

  /** Enable automatic scheduling */
  autoStart: boolean;
}

/**
 * Sync schedule status
 */
export interface ScheduleStatus {
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  currentCoverage: number;
  targetCoverage: number;
}

/**
 * Product Sync Scheduler
 *
 * Manages automatic synchronization of product database on a schedule.
 */
export class ProductSyncScheduler extends EventEmitter {
  private config: SyncScheduleConfig;
  private scheduleStatus: ScheduleStatus;
  private intervalId?: NodeJS.Timeout;
  private syncHistory: SyncJobResult[] = [];

  constructor(config: SyncScheduleConfig) {
    super();
    this.config = config;

    this.scheduleStatus = {
      enabled: false,
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      currentCoverage: 0,
      targetCoverage: config.targetCoverage,
    };

    if (config.autoStart) {
      this.start();
    }
  }

  /**
   * Start scheduled sync
   */
  start(): void {
    if (this.scheduleStatus.enabled) {
      console.log('⚠️  Scheduler already running');
      return;
    }

    console.log('🚀 Starting product sync scheduler...');
    console.log(`   Interval: ${this.config.intervalHours} hours`);
    console.log(`   Target coverage: ${this.config.targetCoverage}%`);
    console.log(`   Incremental: ${this.config.incrementalSync}`);

    this.scheduleStatus.enabled = true;
    this.scheduleNextRun();

    // Set interval for periodic sync
    const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.runSync();
    }, intervalMs);

    this.emit('schedulerStarted', this.scheduleStatus);
  }

  /**
   * Stop scheduled sync
   */
  stop(): void {
    if (!this.scheduleStatus.enabled) {
      console.log('⚠️  Scheduler not running');
      return;
    }

    console.log('🛑 Stopping product sync scheduler...');

    this.scheduleStatus.enabled = false;
    this.scheduleStatus.nextRun = undefined;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.emit('schedulerStopped', this.scheduleStatus);
  }

  /**
   * Run sync immediately
   */
  async runSync(): Promise<SyncJobResult> {
    console.log('🔄 Running scheduled product sync...');

    this.scheduleStatus.lastRun = new Date();
    this.scheduleStatus.totalRuns++;

    try {
      // Check current coverage
      const coverage = await this.checkCoverage();
      this.scheduleStatus.currentCoverage = coverage;

      console.log(`   Current coverage: ${coverage.toFixed(1)}%`);

      // Decide sync strategy
      const shouldFullSync = coverage < this.config.targetCoverage;

      if (shouldFullSync) {
        console.log('   Strategy: Full sync (below target coverage)');
      } else {
        console.log('   Strategy: Incremental sync (maintaining coverage)');
      }

      // Create sync service
      const syncService = new ProductSyncService({
        ...this.config.syncConfig,
        repository: this.config.repository,
        skipExisting: this.config.incrementalSync && !shouldFullSync,
      });

      // Run sync with progress tracking
      syncService.on('progress', (result: SyncJobResult) => {
        console.log(`   Progress: ${result.progress}%`);
        this.emit('syncProgress', result);
      });

      const result = await syncService.sync();

      // Update status
      if (result.status === 'completed') {
        this.scheduleStatus.successfulRuns++;
        console.log('✅ Scheduled sync completed successfully');
      } else {
        this.scheduleStatus.failedRuns++;
        console.log('❌ Scheduled sync failed');
      }

      // Save to history
      this.syncHistory.push(result);

      // Keep only last 30 runs
      if (this.syncHistory.length > 30) {
        this.syncHistory.shift();
      }

      // Schedule next run
      this.scheduleNextRun();

      this.emit('syncComplete', result);

      return result;
    } catch (error: any) {
      console.error('❌ Sync error:', error.message);
      this.scheduleStatus.failedRuns++;

      const errorResult: SyncJobResult = {
        jobId: `error_${Date.now()}`,
        status: 'failed',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: 0,
        totalProducts: 0,
        productsAdded: 0,
        productsUpdated: 0,
        productsSkipped: 0,
        productsFailed: 0,
        imagesProcessed: 0,
        imagesFailed: 0,
        errors: [
          {
            upc: 'N/A',
            source: 'open_food_facts',
            error: error.message,
            timestamp: new Date(),
            retries: 0,
          },
        ],
        progress: 0,
      };

      this.syncHistory.push(errorResult);
      this.emit('syncFailed', errorResult);

      return errorResult;
    }
  }

  /**
   * Check current product coverage
   *
   * Coverage = (products in database / total APL UPCs) * 100
   */
  private async checkCoverage(): Promise<number> {
    try {
      const stats = await this.config.repository.getCoverageStats();

      // TODO: Get total APL UPCs count
      // For now, use total products as proxy
      // In production: SELECT COUNT(DISTINCT upc) FROM apl_entries

      const totalAPLUPCs = 10000; // Placeholder
      const productsInDB = stats.totalProducts;

      return (productsInDB / totalAPLUPCs) * 100;
    } catch (error: any) {
      console.warn('⚠️  Coverage check failed:', error.message);
      return 0;
    }
  }

  /**
   * Schedule next run
   */
  private scheduleNextRun(): void {
    if (!this.scheduleStatus.enabled) {
      return;
    }

    const now = new Date();
    const next = new Date(now);

    // If syncHour is specified, schedule for that hour
    if (this.config.syncHour !== undefined) {
      next.setHours(this.config.syncHour, 0, 0, 0);

      // If we've passed that hour today, schedule for tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
    } else {
      // Otherwise, schedule based on interval
      next.setHours(now.getHours() + this.config.intervalHours, 0, 0, 0);
    }

    this.scheduleStatus.nextRun = next;

    console.log(`📅 Next sync scheduled for: ${next.toLocaleString()}`);
  }

  /**
   * Get scheduler status
   */
  getStatus(): ScheduleStatus {
    return { ...this.scheduleStatus };
  }

  /**
   * Get sync history
   */
  getHistory(): SyncJobResult[] {
    return [...this.syncHistory];
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const totalRuns = this.syncHistory.length;

    if (totalRuns === 0) {
      return {
        totalRuns: 0,
        successRate: 0,
        averageDuration: 0,
        totalProductsAdded: 0,
        totalProductsUpdated: 0,
        averageProductsPerRun: 0,
      };
    }

    const successfulRuns = this.syncHistory.filter(r => r.status === 'completed').length;
    const totalDuration = this.syncHistory.reduce((sum, r) => sum + (r.durationMs || 0), 0);
    const totalAdded = this.syncHistory.reduce((sum, r) => sum + r.productsAdded, 0);
    const totalUpdated = this.syncHistory.reduce((sum, r) => sum + r.productsUpdated, 0);

    return {
      totalRuns,
      successRate: (successfulRuns / totalRuns) * 100,
      averageDuration: totalDuration / totalRuns,
      totalProductsAdded: totalAdded,
      totalProductsUpdated: totalUpdated,
      averageProductsPerRun: (totalAdded + totalUpdated) / totalRuns,
    };
  }
}

/**
 * Create scheduler with default config
 */
export function createProductSyncScheduler(
  repository: ProductRepository,
  options: Partial<SyncScheduleConfig> = {}
): ProductSyncScheduler {
  const config: SyncScheduleConfig = {
    repository,
    intervalHours: 24,
    syncHour: 2, // 2am
    incrementalSync: true,
    targetCoverage: 95,
    syncConfig: {},
    autoStart: false,
    ...options,
  };

  return new ProductSyncScheduler(config);
}
