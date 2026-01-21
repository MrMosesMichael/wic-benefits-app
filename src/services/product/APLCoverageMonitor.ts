/**
 * APL Coverage Monitor
 *
 * Continuously monitors APL coverage and triggers automatic sync
 * when coverage falls below target threshold.
 *
 * @module services/product/APLCoverageMonitor
 */

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { ProductRepository } from '../../database/ProductRepository';
import {
  APLCoverageService,
  CoverageAnalysis,
  SyncRecommendation,
} from './APLCoverageService';
import { ImageStorageService } from './ImageStorageService';

/**
 * Monitor configuration
 */
export interface CoverageMonitorConfig {
  /** APL database pool */
  pool: Pool;

  /** Product repository */
  productRepository: ProductRepository;

  /** Target coverage percentage */
  targetCoverage: number;

  /** Check interval in milliseconds */
  checkIntervalMs: number;

  /** Auto-sync when coverage drops below threshold */
  autoSync: boolean;

  /** Sync images during auto-sync */
  syncImages: boolean;

  /** Image service for syncing images */
  imageService?: ImageStorageService;

  /** Alert threshold (trigger alert when below this %) */
  alertThreshold: number;

  /** Maximum UPCs to sync per auto-sync operation */
  maxUPCsPerSync: number;

  /** Batch size for sync operations */
  batchSize: number;

  /** Concurrency for sync operations */
  concurrency: number;
}

/**
 * Coverage alert
 */
export interface CoverageAlert {
  timestamp: Date;
  severity: 'warning' | 'critical' | 'info';
  message: string;
  coverage: number;
  missingUPCs: number;
  recommendation?: SyncRecommendation;
}

/**
 * Monitor status
 */
export interface MonitorStatus {
  running: boolean;
  lastCheck: Date | null;
  nextCheck: Date | null;
  lastAnalysis: CoverageAnalysis | null;
  lastAlert: CoverageAlert | null;
  checksPerformed: number;
  syncOperations: number;
  uptime: number; // milliseconds
}

/**
 * APL Coverage Monitor
 *
 * Monitors product database coverage and automatically maintains 95%+ coverage.
 */
export class APLCoverageMonitor extends EventEmitter {
  private config: CoverageMonitorConfig;
  private coverageService: APLCoverageService;
  private intervalHandle?: NodeJS.Timeout;
  private status: MonitorStatus;
  private startTime?: Date;

  constructor(config: CoverageMonitorConfig) {
    super();

    this.config = {
      targetCoverage: 95.0,
      checkIntervalMs: 3600000, // 1 hour
      autoSync: true,
      syncImages: false,
      alertThreshold: 90.0,
      maxUPCsPerSync: 10000,
      batchSize: 100,
      concurrency: 5,
      ...config,
    };

    this.coverageService = new APLCoverageService({
      pool: this.config.pool,
      productRepository: this.config.productRepository,
      targetCoverage: this.config.targetCoverage,
    });

    this.status = {
      running: false,
      lastCheck: null,
      nextCheck: null,
      lastAnalysis: null,
      lastAlert: null,
      checksPerformed: 0,
      syncOperations: 0,
      uptime: 0,
    };
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.status.running) {
      console.log('⚠️  Coverage monitor already running');
      return;
    }

    console.log('🚀 Starting APL coverage monitor...');
    console.log(`   Target coverage: ${this.config.targetCoverage}%`);
    console.log(`   Check interval: ${this.config.checkIntervalMs / 1000}s`);
    console.log(`   Auto-sync: ${this.config.autoSync ? 'enabled' : 'disabled'}`);
    console.log('');

    this.status.running = true;
    this.startTime = new Date();
    this.status.nextCheck = new Date(Date.now() + this.config.checkIntervalMs);

    // Perform initial check
    this.performCheck().catch(err => {
      console.error('❌ Initial coverage check failed:', err.message);
    });

    // Schedule periodic checks
    this.intervalHandle = setInterval(() => {
      this.performCheck().catch(err => {
        console.error('❌ Coverage check failed:', err.message);
      });
    }, this.config.checkIntervalMs);

    this.emit('started');
    console.log('✅ Coverage monitor started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.status.running) {
      console.log('⚠️  Coverage monitor not running');
      return;
    }

    console.log('⏹️  Stopping coverage monitor...');

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }

    this.status.running = false;
    this.status.nextCheck = null;

    this.emit('stopped');
    console.log('✅ Coverage monitor stopped');
  }

  /**
   * Get current status
   */
  getStatus(): MonitorStatus {
    if (this.startTime && this.status.running) {
      this.status.uptime = Date.now() - this.startTime.getTime();
    }

    return { ...this.status };
  }

  /**
   * Perform coverage check
   */
  private async performCheck(): Promise<void> {
    console.log('🔍 Performing coverage check...');

    try {
      this.status.lastCheck = new Date();
      this.status.checksPerformed++;

      // Analyze coverage
      const analysis = await this.coverageService.analyzeCoverage();
      this.status.lastAnalysis = analysis;

      console.log(`   Coverage: ${analysis.coveragePercent.toFixed(2)}%`);
      console.log(`   Missing UPCs: ${analysis.missingUPCs.toLocaleString()}`);

      // Check if below alert threshold
      if (analysis.coveragePercent < this.config.alertThreshold) {
        const severity =
          analysis.coveragePercent < this.config.targetCoverage - 10
            ? 'critical'
            : 'warning';

        const alert: CoverageAlert = {
          timestamp: new Date(),
          severity,
          message: `Coverage at ${analysis.coveragePercent.toFixed(2)}% is below ${this.config.alertThreshold}% threshold`,
          coverage: analysis.coveragePercent,
          missingUPCs: analysis.missingUPCs,
        };

        this.status.lastAlert = alert;
        this.emit('alert', alert);

        console.log(`⚠️  ${severity.toUpperCase()}: ${alert.message}`);
      }

      // Auto-sync if enabled and below target
      if (this.config.autoSync && !analysis.meetsTarget) {
        console.log('🔄 Triggering auto-sync...');

        const recommendation = await this.coverageService.getSyncRecommendation();
        this.status.lastAlert = {
          timestamp: new Date(),
          severity: 'info',
          message: 'Triggering auto-sync to reach target coverage',
          coverage: analysis.coveragePercent,
          missingUPCs: analysis.missingUPCs,
          recommendation,
        };

        this.emit('syncStart', this.status.lastAlert);

        const syncResult = await this.coverageService.autoSyncToTarget({
          batchSize: this.config.batchSize,
          concurrency: this.config.concurrency,
          syncImages: this.config.syncImages,
          imageService: this.config.imageService,
          maxUPCs: this.config.maxUPCsPerSync,
        });

        this.status.syncOperations++;
        this.emit('syncComplete', syncResult);

        console.log('✅ Auto-sync complete');
      }

      // Schedule next check
      this.status.nextCheck = new Date(Date.now() + this.config.checkIntervalMs);

      this.emit('checkComplete', analysis);
    } catch (error: any) {
      console.error('❌ Coverage check error:', error.message);

      const alert: CoverageAlert = {
        timestamp: new Date(),
        severity: 'critical',
        message: `Coverage check failed: ${error.message}`,
        coverage: 0,
        missingUPCs: 0,
      };

      this.status.lastAlert = alert;
      this.emit('error', error, alert);
    }
  }

  /**
   * Force an immediate coverage check
   */
  async forceCheck(): Promise<CoverageAnalysis> {
    console.log('⚡ Forcing immediate coverage check...');
    await this.performCheck();

    if (!this.status.lastAnalysis) {
      throw new Error('Coverage check did not produce analysis');
    }

    return this.status.lastAnalysis;
  }

  /**
   * Get coverage service for manual operations
   */
  getCoverageService(): APLCoverageService {
    return this.coverageService;
  }
}

/**
 * Create coverage monitor with default configuration
 */
export function createCoverageMonitor(
  pool: Pool,
  productRepository: ProductRepository,
  options: Partial<CoverageMonitorConfig> = {}
): APLCoverageMonitor {
  return new APLCoverageMonitor({
    pool,
    productRepository,
    targetCoverage: 95.0,
    checkIntervalMs: 3600000, // 1 hour
    autoSync: true,
    syncImages: false,
    alertThreshold: 90.0,
    maxUPCsPerSync: 10000,
    batchSize: 100,
    concurrency: 5,
    ...options,
  });
}
