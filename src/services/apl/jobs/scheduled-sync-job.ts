/**
 * Scheduled APL Sync Job
 *
 * Runs APL sync on a schedule (cron-style).
 * Supports daily, weekly, and custom schedules.
 *
 * @module services/apl/jobs/scheduled-sync-job
 */

import { CronJob } from 'cron';
import { APLSyncOrchestrator, SyncJobResult } from './sync-orchestrator';
import { APLMonitorService } from '../monitoring/apl-monitor.service';
import { StateCode } from '../../../types/apl.types';

/**
 * Schedule configuration
 */
export interface ScheduleConfig {
  /**
   * Cron expression (e.g., '0 2 * * *' for 2 AM daily)
   * Examples:
   * - '0 2 * * *' - Daily at 2 AM
   * - '0 2 * * 0' - Weekly on Sunday at 2 AM
   * - '0 */6 * * *' - Every 6 hours
   * - '0 0 1 * *' - Monthly on 1st at midnight
   */
  cronExpression: string;

  /** Timezone for cron (e.g., 'America/New_York') */
  timezone?: string;

  /** Run immediately on start */
  runOnInit?: boolean;

  /** States to sync */
  states?: StateCode[];

  /** Enable/disable the job */
  enabled: boolean;
}

/**
 * Job execution history entry
 */
export interface JobHistoryEntry {
  runId: string;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  results: SyncJobResult[];
  totalCompleted: number;
  totalFailed: number;
  totalSkipped: number;
  totalEntriesAdded: number;
  totalEntriesUpdated: number;
  status: 'running' | 'completed' | 'failed';
  error?: string;
}

/**
 * Scheduled APL Sync Job
 * Manages scheduled execution of APL sync operations
 */
export class ScheduledAPLSyncJob {
  private orchestrator: APLSyncOrchestrator;
  private monitor: APLMonitorService;
  private schedule: ScheduleConfig;
  private cronJob: CronJob | null = null;
  private isRunning = false;
  private history: JobHistoryEntry[] = [];
  private currentRun: JobHistoryEntry | null = null;

  constructor(
    orchestrator: APLSyncOrchestrator,
    monitor: APLMonitorService,
    schedule: ScheduleConfig
  ) {
    this.orchestrator = orchestrator;
    this.monitor = monitor;
    this.schedule = schedule;
  }

  /**
   * Start the scheduled job
   */
  start(): void {
    if (!this.schedule.enabled) {
      console.log('⏸️  Scheduled sync job is disabled');
      return;
    }

    if (this.cronJob) {
      console.log('⚠️  Job already started');
      return;
    }

    console.log('🕐 Starting scheduled APL sync job...');
    console.log(`   Schedule: ${this.schedule.cronExpression}`);
    console.log(`   Timezone: ${this.schedule.timezone || 'system'}`);

    this.cronJob = new CronJob(
      this.schedule.cronExpression,
      () => this.execute(),
      null,
      true,
      this.schedule.timezone
    );

    console.log(`   Next run: ${this.cronJob.nextDate().toLocaleString()}`);

    // Run immediately if configured
    if (this.schedule.runOnInit) {
      console.log('🚀 Running initial sync...');
      this.execute();
    }
  }

  /**
   * Stop the scheduled job
   */
  stop(): void {
    if (!this.cronJob) {
      console.log('⚠️  Job not running');
      return;
    }

    console.log('⏹️  Stopping scheduled APL sync job...');
    this.cronJob.stop();
    this.cronJob = null;
  }

  /**
   * Execute sync (called by cron)
   */
  private async execute(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Sync already running, skipping this execution');
      return;
    }

    const runId = this.generateRunId();
    const startTime = new Date();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Scheduled APL Sync - Run ${runId}`);
    console.log(`   Start: ${startTime.toLocaleString()}`);
    console.log(`${'='.repeat(60)}\n`);

    this.isRunning = true;

    this.currentRun = {
      runId,
      startTime,
      results: [],
      totalCompleted: 0,
      totalFailed: 0,
      totalSkipped: 0,
      totalEntriesAdded: 0,
      totalEntriesUpdated: 0,
      status: 'running',
    };

    try {
      // Execute sync
      const results = await this.orchestrator.syncAll();

      // Calculate summary
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      this.currentRun.results = results;
      this.currentRun.endTime = endTime;
      this.currentRun.durationMs = durationMs;
      this.currentRun.totalCompleted = results.filter(r => r.status === 'completed').length;
      this.currentRun.totalFailed = results.filter(r => r.status === 'failed').length;
      this.currentRun.totalSkipped = results.filter(r => r.status === 'skipped').length;
      this.currentRun.totalEntriesAdded = results.reduce((sum, r) => sum + (r.entriesAdded || 0), 0);
      this.currentRun.totalEntriesUpdated = results.reduce((sum, r) => sum + (r.entriesUpdated || 0), 0);
      this.currentRun.status = 'completed';

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ Scheduled Sync Complete - Run ${runId}`);
      console.log(`   Duration: ${this.formatDuration(durationMs)}`);
      console.log(`   Completed: ${this.currentRun.totalCompleted}`);
      console.log(`   Failed: ${this.currentRun.totalFailed}`);
      console.log(`   Skipped: ${this.currentRun.totalSkipped}`);
      console.log(`   Entries Added: ${this.currentRun.totalEntriesAdded}`);
      console.log(`   Entries Updated: ${this.currentRun.totalEntriesUpdated}`);
      console.log(`${'='.repeat(60)}\n`);

      // Check freshness after sync
      await this.checkFreshnessAfterSync();

      // Store in history
      this.addToHistory(this.currentRun);
    } catch (error: any) {
      console.error(`❌ Scheduled sync failed - Run ${runId}:`, error);

      this.currentRun.status = 'failed';
      this.currentRun.error = error.message;
      this.currentRun.endTime = new Date();
      this.currentRun.durationMs = this.currentRun.endTime.getTime() - startTime.getTime();

      this.addToHistory(this.currentRun);
    } finally {
      this.isRunning = false;

      // Log next run
      if (this.cronJob) {
        console.log(`⏰ Next scheduled run: ${this.cronJob.nextDate().toLocaleString()}`);
      }
    }
  }

  /**
   * Check data freshness after sync
   */
  private async checkFreshnessAfterSync(): Promise<void> {
    console.log('\n🔍 Checking data freshness...');
    const freshnessResults = await this.monitor.checkAllFreshness();

    for (const result of freshnessResults) {
      const emoji = {
        fresh: '✅',
        aging: '⏰',
        stale: '⚠️',
        critical: '🚨',
        unknown: '❓',
      }[result.status];

      console.log(`   ${emoji} ${result.state}: ${result.status} (${Math.floor(result.ageHours)}h old)`);
    }
  }

  /**
   * Add run to history
   */
  private addToHistory(entry: JobHistoryEntry): void {
    this.history.push(entry);

    // Keep only last 100 runs
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }
  }

  /**
   * Generate unique run ID
   */
  private generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      enabled: this.schedule.enabled,
      isRunning: this.isRunning,
      schedule: this.schedule.cronExpression,
      timezone: this.schedule.timezone,
      nextRun: this.cronJob?.nextDate().toISOString(),
      currentRun: this.currentRun,
      lastRun: this.history[this.history.length - 1],
      totalRuns: this.history.length,
    };
  }

  /**
   * Get execution history
   */
  getHistory(limit: number = 10): JobHistoryEntry[] {
    return this.history.slice(-limit);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const completedRuns = this.history.filter(h => h.status === 'completed');
    const failedRuns = this.history.filter(h => h.status === 'failed');

    const totalDuration = completedRuns.reduce((sum, h) => sum + (h.durationMs || 0), 0);
    const totalEntriesAdded = completedRuns.reduce((sum, h) => sum + h.totalEntriesAdded, 0);
    const totalEntriesUpdated = completedRuns.reduce((sum, h) => sum + h.totalEntriesUpdated, 0);

    return {
      totalRuns: this.history.length,
      completedRuns: completedRuns.length,
      failedRuns: failedRuns.length,
      successRate: this.history.length > 0 ? (completedRuns.length / this.history.length) * 100 : 0,
      averageDurationMs: completedRuns.length > 0 ? totalDuration / completedRuns.length : 0,
      totalEntriesAdded,
      totalEntriesUpdated,
      lastRunStatus: this.history[this.history.length - 1]?.status,
      lastRunTime: this.history[this.history.length - 1]?.startTime,
    };
  }

  /**
   * Manually trigger sync (outside of schedule)
   */
  async triggerManual(): Promise<void> {
    console.log('🔧 Manual sync triggered');
    await this.execute();
  }
}

/**
 * Create scheduled sync job with common presets
 */
export function createScheduledSyncJob(
  orchestrator: APLSyncOrchestrator,
  monitor: APLMonitorService,
  preset: 'daily' | 'weekly' | 'hourly' | 'custom',
  customCron?: string
): ScheduledAPLSyncJob {
  let schedule: ScheduleConfig;

  switch (preset) {
    case 'daily':
      schedule = {
        cronExpression: '0 2 * * *', // 2 AM daily
        timezone: 'America/New_York',
        runOnInit: false,
        enabled: true,
      };
      break;

    case 'weekly':
      schedule = {
        cronExpression: '0 2 * * 0', // 2 AM Sunday
        timezone: 'America/New_York',
        runOnInit: false,
        enabled: true,
      };
      break;

    case 'hourly':
      schedule = {
        cronExpression: '0 * * * *', // Every hour
        timezone: 'America/New_York',
        runOnInit: false,
        enabled: true,
      };
      break;

    case 'custom':
      if (!customCron) {
        throw new Error('Custom cron expression required');
      }
      schedule = {
        cronExpression: customCron,
        timezone: 'America/New_York',
        runOnInit: false,
        enabled: true,
      };
      break;

    default:
      throw new Error(`Unknown preset: ${preset}`);
  }

  return new ScheduledAPLSyncJob(orchestrator, monitor, schedule);
}
