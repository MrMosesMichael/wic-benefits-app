/**
 * Florida APL Sync Worker
 *
 * Background worker for automated Florida WIC APL synchronization.
 * Runs on a schedule to keep APL data current.
 *
 * During phased rollout (Oct 2025 - Mar 2026): Runs daily
 * After rollout: Runs weekly
 *
 * Features:
 * - Automatic scheduling based on policy phase
 * - Error handling with exponential backoff
 * - Change detection and alerting
 * - Health monitoring
 *
 * @module services/apl/workers/florida-sync-worker
 */

import { CronJob } from 'cron';
import { Pool } from 'pg';
import {
  FloridaAPLIngestionService,
  FloridaAPLConfig,
  IngestionStats,
} from '../florida-ingestion.service';
import {
  getFloridaProductionConfig,
  getFloridaSyncSchedule,
  isArtificialDyeBanActive,
  getCurrentFormulaContract,
  FLORIDA_POLICY_DATES,
} from '../config/florida.config';

/**
 * Worker configuration
 */
export interface FloridaSyncWorkerConfig {
  /** Database connection pool */
  dbPool: Pool;

  /** Cron schedule override (defaults to automatic based on policy phase) */
  cronSchedule?: string;

  /** Enable Slack/email notifications on sync failures */
  enableAlerts?: boolean;

  /** Webhook URL for alerts */
  alertWebhookUrl?: string;

  /** Maximum consecutive failures before alerting */
  maxConsecutiveFailures?: number;

  /** Retry delay in milliseconds (exponential backoff) */
  retryDelayMs?: number;
}

/**
 * Worker status
 */
export interface WorkerStatus {
  running: boolean;
  lastRun?: Date;
  lastSuccess?: Date;
  lastFailure?: Date;
  consecutiveFailures: number;
  nextScheduledRun?: Date;
  currentSchedule: string;
}

/**
 * Florida APL Sync Worker
 *
 * Automated background synchronization of Florida WIC APL data
 */
export class FloridaSyncWorker {
  private config: FloridaSyncWorkerConfig;
  private cronJob?: CronJob;
  private status: WorkerStatus;
  private isRunning = false;

  constructor(config: FloridaSyncWorkerConfig) {
    this.config = {
      maxConsecutiveFailures: 3,
      retryDelayMs: 60000, // 1 minute
      enableAlerts: false,
      ...config,
    };

    this.status = {
      running: false,
      consecutiveFailures: 0,
      currentSchedule: this.determineCronSchedule(),
    };
  }

  /**
   * Determine cron schedule based on Florida policy phase
   *
   * During phased rollout: 0 3 * * * (daily at 3 AM)
   * After rollout: 0 3 * * 1 (weekly on Monday at 3 AM)
   */
  private determineCronSchedule(): string {
    if (this.config.cronSchedule) {
      return this.config.cronSchedule;
    }

    const syncSchedule = getFloridaSyncSchedule();

    if (syncSchedule === 'daily') {
      // Daily at 3:00 AM
      return '0 3 * * *';
    } else {
      // Weekly on Monday at 3:00 AM
      return '0 3 * * 1';
    }
  }

  /**
   * Start the sync worker
   */
  public start(): void {
    if (this.cronJob) {
      console.log('⚠️  Florida sync worker already running');
      return;
    }

    const schedule = this.determineCronSchedule();
    console.log(`🌴 Starting Florida APL sync worker with schedule: ${schedule}`);

    this.cronJob = new CronJob(
      schedule,
      () => this.runSync(),
      null, // onComplete
      true, // start immediately
      'America/New_York' // Florida timezone
    );

    this.status.running = true;
    this.status.currentSchedule = schedule;
    this.status.nextScheduledRun = this.cronJob.nextDate().toJSDate();

    console.log(`✅ Florida sync worker started`);
    console.log(`   Next run: ${this.status.nextScheduledRun.toLocaleString()}`);
    this.printPolicyStatus();
  }

  /**
   * Stop the sync worker
   */
  public stop(): void {
    if (!this.cronJob) {
      console.log('⚠️  Florida sync worker not running');
      return;
    }

    this.cronJob.stop();
    this.cronJob = undefined;
    this.status.running = false;
    this.status.nextScheduledRun = undefined;

    console.log('🛑 Florida sync worker stopped');
  }

  /**
   * Run sync immediately (manual trigger)
   */
  public async runSyncNow(): Promise<IngestionStats> {
    console.log('🚀 Manual Florida APL sync triggered');
    return await this.runSync();
  }

  /**
   * Run synchronization
   */
  private async runSync(): Promise<IngestionStats> {
    if (this.isRunning) {
      console.log('⚠️  Florida sync already in progress - skipping');
      throw new Error('Sync already in progress');
    }

    this.isRunning = true;
    this.status.lastRun = new Date();

    console.log('\n' + '='.repeat(60));
    console.log(`🌴 Florida APL Sync - ${this.status.lastRun.toLocaleString()}`);
    console.log('='.repeat(60));

    try {
      // Build ingestion config
      const aplConfig = getFloridaProductionConfig(this.config.dbPool);

      // Run ingestion
      const service = new FloridaAPLIngestionService(aplConfig);
      const stats = await service.ingest();

      // Update status
      this.status.lastSuccess = new Date();
      this.status.consecutiveFailures = 0;

      // Update next scheduled run
      if (this.cronJob) {
        this.status.nextScheduledRun = this.cronJob.nextDate().toJSDate();
      }

      // Check for significant changes
      await this.checkForSignificantChanges(stats);

      console.log('\n✅ Florida APL sync completed successfully');
      console.log(`   Next run: ${this.status.nextScheduledRun?.toLocaleString()}`);

      this.isRunning = false;
      return stats;
    } catch (error) {
      this.status.lastFailure = new Date();
      this.status.consecutiveFailures++;

      console.error('❌ Florida APL sync failed:', error.message);

      // Alert if consecutive failures exceed threshold
      if (this.status.consecutiveFailures >= this.config.maxConsecutiveFailures!) {
        await this.sendAlert('Florida APL sync failed', error);
      }

      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Check for significant changes and log/alert
   */
  private async checkForSignificantChanges(stats: IngestionStats): Promise<void> {
    const significantThreshold = 100; // Alert if 100+ products added/removed

    if (stats.additions >= significantThreshold) {
      const message = `Florida APL: ${stats.additions} products added (significant change)`;
      console.log(`⚠️  ${message}`);
      if (this.config.enableAlerts) {
        await this.sendAlert('Florida APL Significant Change', message);
      }
    }

    if (stats.rejectedArtificialDyes > 0) {
      console.log(`🚫 ${stats.rejectedArtificialDyes} products rejected (artificial dyes)`);
    }

    if (stats.contractFormulaChanges > 0) {
      const message = `Florida APL: ${stats.contractFormulaChanges} formula contract changes detected`;
      console.log(`🍼 ${message}`);
      if (this.config.enableAlerts) {
        await this.sendAlert('Florida Formula Contract Change', message);
      }
    }

    // Check if we're entering/exiting phased rollout
    await this.checkPolicyPhaseTransition();
  }

  /**
   * Check if we need to adjust sync schedule due to policy phase change
   */
  private async checkPolicyPhaseTransition(): Promise<void> {
    const now = new Date();
    const newSchedule = this.determineCronSchedule();

    // Check if we just entered phased rollout
    if (now.toDateString() === FLORIDA_POLICY_DATES.phasedRolloutStart.toDateString()) {
      const message = 'Florida phased rollout started - switching to DAILY sync';
      console.log(`📅 ${message}`);
      if (this.config.enableAlerts) {
        await this.sendAlert('Florida Policy Phase Change', message);
      }

      // Restart worker with new schedule
      this.stop();
      this.start();
    }

    // Check if we just exited phased rollout
    if (now.toDateString() === FLORIDA_POLICY_DATES.phasedRolloutEnd.toDateString()) {
      const message = 'Florida phased rollout complete - switching to WEEKLY sync';
      console.log(`📅 ${message}`);
      if (this.config.enableAlerts) {
        await this.sendAlert('Florida Policy Phase Change', message);
      }

      // Restart worker with new schedule
      this.stop();
      this.start();
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlert(title: string, message: string | Error): Promise<void> {
    if (!this.config.enableAlerts || !this.config.alertWebhookUrl) {
      return;
    }

    const errorMessage = message instanceof Error ? message.message : message;

    try {
      const axios = require('axios');
      await axios.post(this.config.alertWebhookUrl, {
        text: `🚨 ${title}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${title}*\n${errorMessage}`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Time: ${new Date().toLocaleString()} | Consecutive Failures: ${this.status.consecutiveFailures}`,
              },
            ],
          },
        ],
      });
    } catch (error) {
      console.error('Failed to send alert:', error.message);
    }
  }

  /**
   * Print current Florida policy status
   */
  private printPolicyStatus(): void {
    console.log('\n🏛️  Florida WIC Policy Status:');
    console.log(`   Artificial Dye Ban: ${isArtificialDyeBanActive() ? '✅ Active' : '❌ Not Active'}`);

    const formulaContract = getCurrentFormulaContract();
    console.log(`   Formula Contract: ${formulaContract.primaryBrand || 'Unknown'}`);

    const now = new Date();
    const isInPhasedRollout =
      now >= FLORIDA_POLICY_DATES.phasedRolloutStart &&
      now <= FLORIDA_POLICY_DATES.phasedRolloutEnd;

    if (isInPhasedRollout) {
      const daysRemaining = Math.ceil(
        (FLORIDA_POLICY_DATES.phasedRolloutEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      console.log(`   Phased Rollout: 🚧 In Progress (${daysRemaining} days remaining)`);
      console.log(`   Sync Schedule: 📅 Daily`);
    } else {
      console.log(`   Phased Rollout: ✅ Complete`);
      console.log(`   Sync Schedule: 📅 Weekly`);
    }
  }

  /**
   * Get current worker status
   */
  public getStatus(): WorkerStatus {
    return { ...this.status };
  }

  /**
   * Get health check status
   */
  public getHealthCheck(): {
    healthy: boolean;
    status: string;
    details: WorkerStatus;
  } {
    const isHealthy =
      this.status.running &&
      this.status.consecutiveFailures < this.config.maxConsecutiveFailures!;

    return {
      healthy: isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: this.getStatus(),
    };
  }
}

/**
 * Create and start Florida sync worker
 */
export function createFloridaSyncWorker(config: FloridaSyncWorkerConfig): FloridaSyncWorker {
  const worker = new FloridaSyncWorker(config);
  worker.start();
  return worker;
}

/**
 * Example usage
 */
export async function exampleUsage() {
  // Create database pool
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Create and start worker
  const worker = createFloridaSyncWorker({
    dbPool,
    enableAlerts: true,
    alertWebhookUrl: process.env.SLACK_WEBHOOK_URL,
  });

  // Check status
  console.log('Worker status:', worker.getStatus());

  // Health check endpoint
  console.log('Health check:', worker.getHealthCheck());

  // Manual sync trigger
  // await worker.runSyncNow();

  // Stop worker (cleanup)
  // worker.stop();
  // await dbPool.end();
}
