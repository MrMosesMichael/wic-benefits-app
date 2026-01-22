/**
 * Restock Monitoring Background Job
 * A4.3 - Automated monitoring service that runs periodically
 */

import { getFormulaRestockNotificationService } from './FormulaRestockNotificationService';

/**
 * Job configuration
 */
export interface JobConfig {
  intervalMinutes: number;  // How often to run
  enabled: boolean;
  maxRunTimeMinutes: number;  // Max execution time before timeout
}

/**
 * Job execution result
 */
export interface JobExecutionResult {
  jobId: string;
  startTime: Date;
  endTime: Date;
  success: boolean;
  restocksDetected: number;
  notificationsSent: number;
  errors?: string[];
}

/**
 * Background job for monitoring formula restocks
 * In production, this would be replaced with a proper job queue (Bull, Agenda, etc.)
 */
export class RestockMonitoringJob {
  private service = getFormulaRestockNotificationService();
  private config: JobConfig = {
    intervalMinutes: 15,
    enabled: false,
    maxRunTimeMinutes: 5,
  };

  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private executionHistory: JobExecutionResult[] = [];

  /**
   * Start the monitoring job
   */
  start(config?: Partial<JobConfig>): void {
    if (this.isRunning) {
      console.warn('Restock monitoring job is already running');
      return;
    }

    // Update config
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.config.enabled = true;
    this.isRunning = true;

    // Run immediately
    this.executeJob();

    // Schedule recurring execution
    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.executeJob();
    }, intervalMs);

    console.log(
      `Restock monitoring job started (interval: ${this.config.intervalMinutes} minutes)`
    );
  }

  /**
   * Stop the monitoring job
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('Restock monitoring job is not running');
      return;
    }

    this.config.enabled = false;
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    console.log('Restock monitoring job stopped');
  }

  /**
   * Execute a single job run
   */
  private async executeJob(): Promise<JobExecutionResult> {
    const jobId = `restock_job_${Date.now()}`;
    const startTime = new Date();
    const errors: string[] = [];

    let restocksDetected = 0;
    let notificationsSent = 0;
    let success = true;

    try {
      console.log(`[${jobId}] Starting restock monitoring job`);

      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Job execution timeout'));
        }, this.config.maxRunTimeMinutes * 60 * 1000);
      });

      // Execute monitoring
      const monitorPromise = this.service.monitorRestocks();

      // Race between execution and timeout
      const events = await Promise.race([monitorPromise, timeoutPromise]);

      restocksDetected = events.length;

      // Notification sending is handled inside monitorRestocks()
      // We can track it through subscription stats if needed
      console.log(
        `[${jobId}] Detected ${restocksDetected} restock events`
      );
    } catch (error) {
      success = false;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      console.error(`[${jobId}] Job execution failed:`, errorMessage);
    }

    const endTime = new Date();
    const result: JobExecutionResult = {
      jobId,
      startTime,
      endTime,
      success,
      restocksDetected,
      notificationsSent,
      errors: errors.length > 0 ? errors : undefined,
    };

    // Record execution
    this.recordExecution(result);

    console.log(
      `[${jobId}] Job completed in ${endTime.getTime() - startTime.getTime()}ms`
    );

    return result;
  }

  /**
   * Record job execution result
   */
  private recordExecution(result: JobExecutionResult): void {
    this.executionHistory.push(result);

    // Keep only last 100 executions
    if (this.executionHistory.length > 100) {
      this.executionHistory = this.executionHistory.slice(-100);
    }
  }

  /**
   * Get job status
   */
  getStatus(): {
    enabled: boolean;
    isRunning: boolean;
    config: JobConfig;
    lastExecution?: JobExecutionResult;
  } {
    const lastExecution =
      this.executionHistory.length > 0
        ? this.executionHistory[this.executionHistory.length - 1]
        : undefined;

    return {
      enabled: this.config.enabled,
      isRunning: this.isRunning,
      config: this.config,
      lastExecution,
    };
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit: number = 10): JobExecutionResult[] {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Update job configuration
   */
  updateConfig(config: Partial<JobConfig>): void {
    const wasRunning = this.isRunning;

    // Stop if running
    if (wasRunning) {
      this.stop();
    }

    // Update config
    this.config = { ...this.config, ...config };

    // Restart if it was running
    if (wasRunning && config.enabled !== false) {
      this.start();
    }
  }

  /**
   * Manually trigger job execution (for testing/debugging)
   */
  async triggerManually(): Promise<JobExecutionResult> {
    console.log('Manually triggering restock monitoring job');
    return this.executeJob();
  }

  /**
   * Get execution statistics
   */
  getStats(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTimeMs: number;
    totalRestocksDetected: number;
  } {
    const totalExecutions = this.executionHistory.length;
    const successful = this.executionHistory.filter((e) => e.success).length;
    const failed = totalExecutions - successful;

    const totalTimeMs = this.executionHistory.reduce(
      (sum, e) => sum + (e.endTime.getTime() - e.startTime.getTime()),
      0
    );
    const averageExecutionTimeMs =
      totalExecutions > 0 ? totalTimeMs / totalExecutions : 0;

    const totalRestocks = this.executionHistory.reduce(
      (sum, e) => sum + e.restocksDetected,
      0
    );

    return {
      totalExecutions,
      successfulExecutions: successful,
      failedExecutions: failed,
      averageExecutionTimeMs,
      totalRestocksDetected: totalRestocks,
    };
  }
}

// Singleton instance
let instance: RestockMonitoringJob | null = null;

export function getRestockMonitoringJob(): RestockMonitoringJob {
  if (!instance) {
    instance = new RestockMonitoringJob();
  }
  return instance;
}

/**
 * Initialize and start the monitoring job (call on app startup)
 */
export function initializeRestockMonitoring(config?: Partial<JobConfig>): void {
  const job = getRestockMonitoringJob();
  job.start(config);
}

/**
 * Stop the monitoring job (call on app shutdown)
 */
export function shutdownRestockMonitoring(): void {
  const job = getRestockMonitoringJob();
  job.stop();
}
