/**
 * Store Ingestion Monitoring Utilities
 *
 * Tracks ingestion health, data quality, and pipeline performance
 */

import { IngestionResult, StateIngestionResult } from './StoreIngestionPipeline';
import * as fs from 'fs';
import * as path from 'path';

export interface IngestionHealthCheck {
  timestamp: string;
  healthy: boolean;
  lastSuccessfulRun?: string;
  daysSinceLastRun: number;
  recentFailures: number;
  dataQuality: DataQualityMetrics;
  alerts: string[];
}

export interface DataQualityMetrics {
  totalStores: number;
  storesWithCoordinates: number;
  storesWithPhone: number;
  storesWithHours: number;
  wicAuthorizedStores: number;
  coordinateCompleteness: number; // percentage
  phoneCompleteness: number;
  averageStoreAge: number; // days since last verified
}

export class IngestionMonitor {
  private logDir: string;

  constructor(logDir = './logs/ingestion') {
    this.logDir = logDir;
    this.ensureLogDirectory();
  }

  /**
   * Log ingestion result to file
   */
  async logIngestionResult(result: IngestionResult): Promise<void> {
    const logFile = path.join(this.logDir, `ingestion-${this.getDateString()}.json`);

    const logEntry = {
      timestamp: result.completedAt,
      result,
    };

    try {
      await fs.promises.appendFile(logFile, JSON.stringify(logEntry, null, 2) + '\n');
      console.log(`[IngestionMonitor] Logged result to ${logFile}`);
    } catch (error) {
      console.error('[IngestionMonitor] Failed to write log:', error);
    }
  }

  /**
   * Get health status of ingestion pipeline
   */
  async getHealthCheck(): Promise<IngestionHealthCheck> {
    const recentRuns = await this.getRecentRuns(30); // Last 30 days
    const lastSuccessful = recentRuns.find(r => r.result.totalErrors === 0);
    const recentFailures = recentRuns.filter(r => r.result.totalErrors > 0).length;

    const daysSinceLastRun = lastSuccessful
      ? this.getDaysSince(lastSuccessful.timestamp)
      : 999;

    const alerts: string[] = [];

    // Check if data is stale
    if (daysSinceLastRun > 35) {
      alerts.push('CRITICAL: No successful ingestion in over 35 days');
    } else if (daysSinceLastRun > 30) {
      alerts.push('WARNING: No successful ingestion in over 30 days');
    }

    // Check failure rate
    if (recentFailures > 5) {
      alerts.push(`WARNING: ${recentFailures} failed ingestions in last 30 days`);
    }

    const healthy = alerts.length === 0 && daysSinceLastRun <= 30;

    return {
      timestamp: new Date().toISOString(),
      healthy,
      lastSuccessfulRun: lastSuccessful?.timestamp,
      daysSinceLastRun,
      recentFailures,
      dataQuality: await this.getDataQualityMetrics(),
      alerts,
    };
  }

  /**
   * Get recent ingestion runs from logs
   */
  private async getRecentRuns(days: number): Promise<Array<{ timestamp: string; result: IngestionResult }>> {
    const runs: Array<{ timestamp: string; result: IngestionResult }> = [];

    try {
      const files = await fs.promises.readdir(this.logDir);
      const logFiles = files.filter(f => f.startsWith('ingestion-') && f.endsWith('.json'));

      for (const file of logFiles) {
        const filePath = path.join(this.logDir, file);
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const entries = content.split('\n').filter(line => line.trim());

        for (const entry of entries) {
          try {
            const parsed = JSON.parse(entry);
            const runDate = new Date(parsed.timestamp);
            const age = this.getDaysSince(parsed.timestamp);

            if (age <= days) {
              runs.push(parsed);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (error) {
      console.error('[IngestionMonitor] Failed to read logs:', error);
    }

    return runs.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get data quality metrics (placeholder - would query database in production)
   */
  private async getDataQualityMetrics(): Promise<DataQualityMetrics> {
    // TODO: Query actual database for metrics
    // For now, return placeholder values
    return {
      totalStores: 0,
      storesWithCoordinates: 0,
      storesWithPhone: 0,
      storesWithHours: 0,
      wicAuthorizedStores: 0,
      coordinateCompleteness: 0,
      phoneCompleteness: 0,
      averageStoreAge: 0,
    };
  }

  /**
   * Get days since a timestamp
   */
  private getDaysSince(timestamp: string): number {
    const then = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - then.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Get date string for log files
   */
  private getDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Generate human-readable report
   */
  async generateReport(): Promise<string> {
    const health = await this.getHealthCheck();

    let report = `
Store Ingestion Health Report
==============================
Generated: ${health.timestamp}
Status: ${health.healthy ? '✅ HEALTHY' : '⚠️  UNHEALTHY'}

Last Successful Run: ${health.lastSuccessfulRun || 'Never'}
Days Since Last Run: ${health.daysSinceLastRun}
Recent Failures (30d): ${health.recentFailures}

Data Quality Metrics:
--------------------
Total Stores: ${health.dataQuality.totalStores}
WIC Authorized: ${health.dataQuality.wicAuthorizedStores}
Coordinate Completeness: ${health.dataQuality.coordinateCompleteness.toFixed(1)}%
Phone Completeness: ${health.dataQuality.phoneCompleteness.toFixed(1)}%
Average Store Age: ${health.dataQuality.averageStoreAge} days

`;

    if (health.alerts.length > 0) {
      report += 'Alerts:\n';
      report += '-------\n';
      for (const alert of health.alerts) {
        report += `${alert}\n`;
      }
    }

    return report;
  }
}
