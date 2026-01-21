/**
 * APL Sync Orchestrator
 *
 * Coordinates APL sync jobs across all states.
 * Manages scheduling, parallel execution, retry logic, and failure handling.
 *
 * @module services/apl/jobs/sync-orchestrator
 */

import { EventEmitter } from 'events';
import { APLMonitorService, MonitorCheckResult } from '../monitoring/apl-monitor.service';
import { ingestMichiganAPL, MichiganAPLConfig } from '../michigan-ingestion.service';
import { ingestNorthCarolinaAPL, NorthCarolinaAPLConfig } from '../north-carolina-ingestion.service';
import { ingestFloridaAPL, FloridaAPLConfig } from '../florida-ingestion.service';
import { ingestOregonAPL, OregonAPLConfig } from '../oregon-ingestion.service';
import { StateCode } from '../../../types/apl.types';

/**
 * Sync job status
 */
export type SyncJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

/**
 * Sync job result
 */
export interface SyncJobResult {
  jobId: string;
  state: StateCode;
  status: SyncJobStatus;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  entriesProcessed?: number;
  entriesAdded?: number;
  entriesUpdated?: number;
  entriesRemoved?: number;
  error?: string;
  retries: number;
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  dbPool: any;
  maxParallelJobs: number;
  retryAttempts: number;
  retryDelayMs: number;
  checkForUpdatesFirst: boolean;
  skipIfNoUpdate: boolean;
  states: StateCode[];
}

/**
 * Orchestrator events
 */
export interface OrchestratorEvents {
  jobStart: (job: SyncJobResult) => void;
  jobComplete: (job: SyncJobResult) => void;
  jobFailed: (job: SyncJobResult) => void;
  allComplete: (results: SyncJobResult[]) => void;
  error: (error: Error) => void;
}

/**
 * APL Sync Orchestrator
 * Manages and coordinates sync jobs across all states
 */
export class APLSyncOrchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private monitor: APLMonitorService;
  private activeJobs: Map<string, SyncJobResult> = new Map();
  private jobQueue: Array<{ state: StateCode; priority: number }> = [];
  private results: SyncJobResult[] = [];

  constructor(config: OrchestratorConfig, monitor: APLMonitorService) {
    super();
    this.config = config;
    this.monitor = monitor;
  }

  /**
   * Run sync for all configured states
   */
  async syncAll(): Promise<SyncJobResult[]> {
    console.log('🚀 Starting APL sync orchestration...');
    console.log(`   States: ${this.config.states.join(', ')}`);
    console.log(`   Max parallel: ${this.config.maxParallelJobs}`);

    this.results = [];
    this.activeJobs.clear();
    this.jobQueue = [];

    try {
      // Step 1: Check for updates (optional)
      if (this.config.checkForUpdatesFirst) {
        await this.checkForUpdates();
      }

      // Step 2: Queue jobs
      this.queueJobs();

      // Step 3: Process jobs
      await this.processJobQueue();

      console.log('✅ APL sync orchestration complete');
      this.emit('allComplete', this.results);

      return this.results;
    } catch (error: any) {
      console.error('❌ Orchestration failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Run sync for a specific state
   */
  async syncState(state: StateCode): Promise<SyncJobResult> {
    console.log(`🚀 Starting sync for ${state}...`);

    const jobId = this.generateJobId(state);
    const job: SyncJobResult = {
      jobId,
      state,
      status: 'pending',
      startTime: new Date(),
      retries: 0,
    };

    this.activeJobs.set(jobId, job);
    this.emit('jobStart', job);

    try {
      // Check for update first (optional)
      if (this.config.checkForUpdatesFirst && this.config.skipIfNoUpdate) {
        const updateCheck = await this.monitor.checkForUpdates(state);
        if (!updateCheck.hasUpdate) {
          console.log(`ℹ️  Skipping ${state} - no update available`);
          job.status = 'skipped';
          job.endTime = new Date();
          job.durationMs = job.endTime.getTime() - job.startTime.getTime();
          this.emit('jobComplete', job);
          return job;
        }
      }

      // Execute sync
      const result = await this.executeSync(state);

      // Update job result
      job.status = 'completed';
      job.endTime = new Date();
      job.durationMs = job.endTime.getTime() - job.startTime.getTime();
      job.entriesProcessed = result.totalRows;
      job.entriesAdded = result.additions;
      job.entriesUpdated = result.updates;

      console.log(`✅ Sync complete for ${state}`);
      this.emit('jobComplete', job);

      return job;
    } catch (error: any) {
      console.error(`❌ Sync failed for ${state}:`, error.message);

      job.status = 'failed';
      job.error = error.message;
      job.endTime = new Date();
      job.durationMs = job.endTime.getTime() - job.startTime.getTime();

      this.emit('jobFailed', job);

      // Retry if configured
      if (job.retries < this.config.retryAttempts) {
        console.log(`♻️  Retrying ${state} (attempt ${job.retries + 1}/${this.config.retryAttempts})...`);
        await this.delay(this.config.retryDelayMs);
        job.retries++;
        return this.syncState(state);
      }

      return job;
    } finally {
      this.activeJobs.delete(jobId);
      this.results.push(job);
    }
  }

  /**
   * Check all states for updates
   */
  private async checkForUpdates(): Promise<void> {
    console.log('🔍 Checking for updates across all states...');
    const results = await this.monitor.checkAllStates();

    for (const result of results) {
      if (result.hasUpdate) {
        console.log(`   ✅ ${result.state}: Update available`);
      } else if (result.error) {
        console.log(`   ❌ ${result.state}: Check failed (${result.error})`);
      } else {
        console.log(`   ℹ️  ${result.state}: No update`);
      }
    }
  }

  /**
   * Queue jobs for processing
   */
  private queueJobs(): void {
    // Priority order: MI (1), NC (2), FL (3), OR (4), others (5)
    const priorities: Record<string, number> = {
      MI: 1,
      NC: 2,
      FL: 3,
      OR: 4,
    };

    for (const state of this.config.states) {
      this.jobQueue.push({
        state,
        priority: priorities[state] || 5,
      });
    }

    // Sort by priority
    this.jobQueue.sort((a, b) => a.priority - b.priority);

    console.log(`📋 Queued ${this.jobQueue.length} jobs`);
  }

  /**
   * Process job queue with parallel execution
   */
  private async processJobQueue(): Promise<void> {
    const workers: Promise<void>[] = [];

    // Start workers
    for (let i = 0; i < this.config.maxParallelJobs; i++) {
      workers.push(this.worker());
    }

    // Wait for all workers to complete
    await Promise.all(workers);
  }

  /**
   * Worker that processes jobs from queue
   */
  private async worker(): Promise<void> {
    while (this.jobQueue.length > 0) {
      const job = this.jobQueue.shift();
      if (!job) break;

      await this.syncState(job.state);
    }
  }

  /**
   * Execute sync for a specific state
   */
  private async executeSync(state: StateCode): Promise<any> {
    const dbPool = this.config.dbPool;

    switch (state) {
      case 'MI':
        return await ingestMichiganAPL({
          downloadUrl: 'https://www.michigan.gov/mdhhs/-/media/Project/Websites/mdhhs/Folder2/Folder38/Folder1/Folder138/WIC_APL.xlsx',
          dbPool,
        } as MichiganAPLConfig);

      case 'NC':
        return await ingestNorthCarolinaAPL({
          downloadUrl: 'https://www.nutritionnc.com/wic/apl',
          dbPool,
        } as NorthCarolinaAPLConfig);

      case 'FL':
        return await ingestFloridaAPL({
          downloadUrl: 'https://www.floridahealth.gov/programs-and-services/wic/_documents/apl.xlsx',
          dbPool,
        } as FloridaAPLConfig);

      case 'OR':
        return await ingestOregonAPL({
          downloadUrl: 'https://www.oregon.gov/oha/PH/HEALTHYPEOPLEFAMILIES/WIC/Documents/apl.xlsx',
          dbPool,
        } as OregonAPLConfig);

      default:
        throw new Error(`Unsupported state: ${state}`);
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(state: StateCode): string {
    return `job_${state}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      activeJobs: Array.from(this.activeJobs.values()),
      queuedJobs: this.jobQueue.length,
      completedJobs: this.results.filter(r => r.status === 'completed').length,
      failedJobs: this.results.filter(r => r.status === 'failed').length,
      skippedJobs: this.results.filter(r => r.status === 'skipped').length,
      totalJobs: this.results.length,
    };
  }

  /**
   * Get all results
   */
  getResults(): SyncJobResult[] {
    return [...this.results];
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const completed = this.results.filter(r => r.status === 'completed');
    const failed = this.results.filter(r => r.status === 'failed');
    const skipped = this.results.filter(r => r.status === 'skipped');

    const totalEntriesAdded = completed.reduce((sum, r) => sum + (r.entriesAdded || 0), 0);
    const totalEntriesUpdated = completed.reduce((sum, r) => sum + (r.entriesUpdated || 0), 0);
    const totalDurationMs = completed.reduce((sum, r) => sum + (r.durationMs || 0), 0);

    return {
      total: this.results.length,
      completed: completed.length,
      failed: failed.length,
      skipped: skipped.length,
      totalEntriesAdded,
      totalEntriesUpdated,
      totalDurationMs,
      averageDurationMs: completed.length > 0 ? totalDurationMs / completed.length : 0,
      successRate: this.results.length > 0 ? (completed.length / this.results.length) * 100 : 0,
    };
  }
}

/**
 * Create orchestrator with default config
 */
export function createSyncOrchestrator(
  dbPool: any,
  monitor: APLMonitorService,
  options: Partial<OrchestratorConfig> = {}
): APLSyncOrchestrator {
  const config: OrchestratorConfig = {
    dbPool,
    maxParallelJobs: 2,
    retryAttempts: 3,
    retryDelayMs: 5000,
    checkForUpdatesFirst: true,
    skipIfNoUpdate: true,
    states: ['MI', 'NC', 'FL', 'OR'],
    ...options,
  };

  return new APLSyncOrchestrator(config, monitor);
}
