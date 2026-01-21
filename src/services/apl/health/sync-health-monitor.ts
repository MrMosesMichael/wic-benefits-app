/**
 * APL Sync Health Monitor
 *
 * Monitors the health of APL sync operations and data pipeline.
 * Tracks metrics, detects anomalies, and generates health reports.
 *
 * @module services/apl/health/sync-health-monitor
 */

import { EventEmitter } from 'events';
import { APLMonitorService, DataFreshnessStatus } from '../monitoring/apl-monitor.service';
import { StateCode, APLDataSource } from '../../../types/apl.types';

/**
 * Health check status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'critical';

/**
 * Health metric
 */
export interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  status: HealthStatus;
  message?: string;
  timestamp: Date;
}

/**
 * State health report
 */
export interface StateHealthReport {
  state: StateCode;
  dataSource: APLDataSource;
  overallHealth: HealthStatus;
  metrics: {
    dataFreshness: HealthMetric;
    syncSuccessRate: HealthMetric;
    errorRate: HealthMetric;
    averageSyncDuration: HealthMetric;
    consecutiveFailures: HealthMetric;
  };
  issues: string[];
  recommendations: string[];
  lastCheckTime: Date;
}

/**
 * System health report
 */
export interface SystemHealthReport {
  overallHealth: HealthStatus;
  stateReports: StateHealthReport[];
  totalStates: number;
  healthyStates: number;
  degradedStates: number;
  unhealthyStates: number;
  criticalStates: number;
  systemMetrics: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageDuration: number;
    dataFreshnessScore: number;
  };
  alerts: Array<{
    severity: 'warning' | 'error' | 'critical';
    message: string;
    state?: StateCode;
  }>;
  timestamp: Date;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  freshnessThresholdHours: number;
  successRateThreshold: number;
  errorRateThreshold: number;
  consecutiveFailureThreshold: number;
  averageDurationThresholdMs: number;
}

/**
 * APL Sync Health Monitor
 * Monitors and reports on the health of APL sync operations
 */
export class SyncHealthMonitor extends EventEmitter {
  private dbPool: any;
  private monitor: APLMonitorService;
  private config: HealthCheckConfig;
  private healthHistory: SystemHealthReport[] = [];

  constructor(
    dbPool: any,
    monitor: APLMonitorService,
    config?: Partial<HealthCheckConfig>
  ) {
    super();
    this.dbPool = dbPool;
    this.monitor = monitor;
    this.config = {
      freshnessThresholdHours: 24,
      successRateThreshold: 95,
      errorRateThreshold: 5,
      consecutiveFailureThreshold: 3,
      averageDurationThresholdMs: 300000, // 5 minutes
      ...config,
    };
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<SystemHealthReport> {
    console.log('🏥 Performing APL sync health check...');

    const states: StateCode[] = ['MI', 'NC', 'FL', 'OR'];
    const stateReports: StateHealthReport[] = [];

    // Check each state
    for (const state of states) {
      const report = await this.checkStateHealth(state);
      stateReports.push(report);
    }

    // Calculate overall health
    const overallHealth = this.calculateOverallHealth(stateReports);

    // Calculate system metrics
    const systemMetrics = await this.calculateSystemMetrics();

    // Generate alerts
    const alerts = this.generateAlerts(stateReports, systemMetrics);

    const report: SystemHealthReport = {
      overallHealth,
      stateReports,
      totalStates: stateReports.length,
      healthyStates: stateReports.filter(r => r.overallHealth === 'healthy').length,
      degradedStates: stateReports.filter(r => r.overallHealth === 'degraded').length,
      unhealthyStates: stateReports.filter(r => r.overallHealth === 'unhealthy').length,
      criticalStates: stateReports.filter(r => r.overallHealth === 'critical').length,
      systemMetrics,
      alerts,
      timestamp: new Date(),
    };

    // Add to history
    this.addToHistory(report);

    // Emit health report event
    this.emit('healthReport', report);

    // Print summary
    this.printHealthSummary(report);

    return report;
  }

  /**
   * Check health for a specific state
   */
  async checkStateHealth(state: StateCode): Promise<StateHealthReport> {
    const dataSource = this.getDataSourceForState(state);

    // Get freshness data
    const freshnessData = await this.monitor.checkDataFreshness(state);

    // Get sync stats from database
    const syncStats = await this.getSyncStats(state, dataSource);

    // Calculate metrics
    const metrics = {
      dataFreshness: this.calculateFreshnessMetric(freshnessData),
      syncSuccessRate: this.calculateSuccessRateMetric(syncStats),
      errorRate: this.calculateErrorRateMetric(syncStats),
      averageSyncDuration: this.calculateDurationMetric(syncStats),
      consecutiveFailures: this.calculateFailureMetric(syncStats),
    };

    // Determine overall health
    const overallHealth = this.determineStateHealth(metrics);

    // Generate issues and recommendations
    const issues = this.identifyIssues(metrics);
    const recommendations = this.generateRecommendations(metrics, issues);

    return {
      state,
      dataSource,
      overallHealth,
      metrics,
      issues,
      recommendations,
      lastCheckTime: new Date(),
    };
  }

  /**
   * Get sync statistics from database
   */
  private async getSyncStats(state: StateCode, dataSource: APLDataSource) {
    const client = await this.dbPool.connect();
    try {
      // Get sync history for last 30 days
      const result = await client.query(
        `SELECT
          COUNT(*) as total_syncs,
          COUNT(*) FILTER (WHERE last_sync_status = 'success') as successful_syncs,
          COUNT(*) FILTER (WHERE last_sync_status = 'failure') as failed_syncs,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) as avg_duration_ms,
          MAX(consecutive_failures) as max_consecutive_failures
         FROM apl_sync_status
         WHERE state = $1 AND data_source = $2
         AND created_at >= NOW() - INTERVAL '30 days'`,
        [state, dataSource]
      );

      const row = result.rows[0];

      return {
        totalSyncs: parseInt(row.total_syncs) || 0,
        successfulSyncs: parseInt(row.successful_syncs) || 0,
        failedSyncs: parseInt(row.failed_syncs) || 0,
        avgDurationMs: parseFloat(row.avg_duration_ms) || 0,
        consecutiveFailures: parseInt(row.max_consecutive_failures) || 0,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Calculate freshness metric
   */
  private calculateFreshnessMetric(freshness: DataFreshnessStatus): HealthMetric {
    const ageHours = freshness.ageHours;
    let status: HealthStatus;

    if (ageHours <= this.config.freshnessThresholdHours) {
      status = 'healthy';
    } else if (ageHours <= 72) {
      status = 'degraded';
    } else if (ageHours <= 168) {
      status = 'unhealthy';
    } else {
      status = 'critical';
    }

    return {
      name: 'Data Freshness',
      value: ageHours,
      unit: 'hours',
      threshold: this.config.freshnessThresholdHours,
      status,
      message: `Last sync ${Math.floor(ageHours)} hours ago`,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate success rate metric
   */
  private calculateSuccessRateMetric(stats: any): HealthMetric {
    const successRate = stats.totalSyncs > 0
      ? (stats.successfulSyncs / stats.totalSyncs) * 100
      : 100;

    let status: HealthStatus;
    if (successRate >= this.config.successRateThreshold) {
      status = 'healthy';
    } else if (successRate >= 80) {
      status = 'degraded';
    } else if (successRate >= 50) {
      status = 'unhealthy';
    } else {
      status = 'critical';
    }

    return {
      name: 'Sync Success Rate',
      value: successRate,
      unit: '%',
      threshold: this.config.successRateThreshold,
      status,
      message: `${successRate.toFixed(1)}% of syncs successful`,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate error rate metric
   */
  private calculateErrorRateMetric(stats: any): HealthMetric {
    const errorRate = stats.totalSyncs > 0
      ? (stats.failedSyncs / stats.totalSyncs) * 100
      : 0;

    let status: HealthStatus;
    if (errorRate <= this.config.errorRateThreshold) {
      status = 'healthy';
    } else if (errorRate <= 20) {
      status = 'degraded';
    } else if (errorRate <= 50) {
      status = 'unhealthy';
    } else {
      status = 'critical';
    }

    return {
      name: 'Error Rate',
      value: errorRate,
      unit: '%',
      threshold: this.config.errorRateThreshold,
      status,
      message: `${errorRate.toFixed(1)}% of syncs failed`,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate duration metric
   */
  private calculateDurationMetric(stats: any): HealthMetric {
    const avgDuration = stats.avgDurationMs;

    let status: HealthStatus;
    if (avgDuration <= this.config.averageDurationThresholdMs) {
      status = 'healthy';
    } else if (avgDuration <= this.config.averageDurationThresholdMs * 2) {
      status = 'degraded';
    } else if (avgDuration <= this.config.averageDurationThresholdMs * 3) {
      status = 'unhealthy';
    } else {
      status = 'critical';
    }

    return {
      name: 'Average Sync Duration',
      value: avgDuration,
      unit: 'ms',
      threshold: this.config.averageDurationThresholdMs,
      status,
      message: `Average sync takes ${(avgDuration / 1000).toFixed(1)}s`,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate consecutive failures metric
   */
  private calculateFailureMetric(stats: any): HealthMetric {
    const failures = stats.consecutiveFailures;

    let status: HealthStatus;
    if (failures === 0) {
      status = 'healthy';
    } else if (failures < this.config.consecutiveFailureThreshold) {
      status = 'degraded';
    } else if (failures < this.config.consecutiveFailureThreshold * 2) {
      status = 'unhealthy';
    } else {
      status = 'critical';
    }

    return {
      name: 'Consecutive Failures',
      value: failures,
      unit: 'count',
      threshold: this.config.consecutiveFailureThreshold,
      status,
      message: `${failures} consecutive sync failures`,
      timestamp: new Date(),
    };
  }

  /**
   * Determine overall state health
   */
  private determineStateHealth(metrics: StateHealthReport['metrics']): HealthStatus {
    const statuses = Object.values(metrics).map(m => m.status);

    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('unhealthy')) return 'unhealthy';
    if (statuses.includes('degraded')) return 'degraded';
    return 'healthy';
  }

  /**
   * Calculate overall system health
   */
  private calculateOverallHealth(reports: StateHealthReport[]): HealthStatus {
    const criticalCount = reports.filter(r => r.overallHealth === 'critical').length;
    const unhealthyCount = reports.filter(r => r.overallHealth === 'unhealthy').length;
    const degradedCount = reports.filter(r => r.overallHealth === 'degraded').length;

    if (criticalCount > 0) return 'critical';
    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > 1) return 'degraded';
    return 'healthy';
  }

  /**
   * Calculate system-wide metrics
   */
  private async calculateSystemMetrics() {
    const client = await this.dbPool.connect();
    try {
      const result = await client.query(`
        SELECT
          COUNT(*) as total_syncs,
          COUNT(*) FILTER (WHERE last_sync_status = 'success') as successful_syncs,
          COUNT(*) FILTER (WHERE last_sync_status = 'failure') as failed_syncs,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) as avg_duration
        FROM apl_sync_status
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      const row = result.rows[0];
      const totalSyncs = parseInt(row.total_syncs) || 0;
      const successfulSyncs = parseInt(row.successful_syncs) || 0;

      return {
        totalSyncs,
        successfulSyncs,
        failedSyncs: parseInt(row.failed_syncs) || 0,
        averageDuration: parseFloat(row.avg_duration) || 0,
        dataFreshnessScore: totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Identify issues from metrics
   */
  private identifyIssues(metrics: StateHealthReport['metrics']): string[] {
    const issues: string[] = [];

    if (metrics.dataFreshness.status === 'critical') {
      issues.push('Data is critically stale');
    } else if (metrics.dataFreshness.status === 'unhealthy') {
      issues.push('Data staleness exceeds acceptable threshold');
    }

    if (metrics.syncSuccessRate.status !== 'healthy') {
      issues.push(`Low sync success rate: ${metrics.syncSuccessRate.value.toFixed(1)}%`);
    }

    if (metrics.errorRate.status !== 'healthy') {
      issues.push(`High error rate: ${metrics.errorRate.value.toFixed(1)}%`);
    }

    if (metrics.consecutiveFailures.value > 0) {
      issues.push(`${metrics.consecutiveFailures.value} consecutive sync failures`);
    }

    if (metrics.averageSyncDuration.status !== 'healthy') {
      issues.push('Sync duration exceeds normal threshold');
    }

    return issues;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    metrics: StateHealthReport['metrics'],
    issues: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (issues.length === 0) {
      return ['System is healthy - continue monitoring'];
    }

    if (metrics.dataFreshness.status !== 'healthy') {
      recommendations.push('Trigger manual sync immediately');
    }

    if (metrics.consecutiveFailures.value >= 3) {
      recommendations.push('Investigate sync errors in logs');
      recommendations.push('Verify data source availability');
    }

    if (metrics.errorRate.value > 10) {
      recommendations.push('Check network connectivity');
      recommendations.push('Verify authentication credentials');
    }

    if (metrics.averageSyncDuration.status !== 'healthy') {
      recommendations.push('Optimize sync batch size');
      recommendations.push('Check database performance');
    }

    return recommendations;
  }

  /**
   * Generate system alerts
   */
  private generateAlerts(reports: StateHealthReport[], metrics: any) {
    const alerts: SystemHealthReport['alerts'] = [];

    for (const report of reports) {
      if (report.overallHealth === 'critical') {
        alerts.push({
          severity: 'critical',
          message: `${report.state} APL data health is critical`,
          state: report.state,
        });
      } else if (report.overallHealth === 'unhealthy') {
        alerts.push({
          severity: 'error',
          message: `${report.state} APL data health is unhealthy`,
          state: report.state,
        });
      }
    }

    if (metrics.dataFreshnessScore < 50) {
      alerts.push({
        severity: 'critical',
        message: 'System-wide data freshness critically low',
      });
    }

    return alerts;
  }

  /**
   * Get data source for state
   */
  private getDataSourceForState(state: StateCode): APLDataSource {
    const mapping: Record<string, APLDataSource> = {
      MI: 'fis',
      NC: 'conduent',
      FL: 'fis',
      OR: 'state',
    };
    return mapping[state] || 'manual';
  }

  /**
   * Add report to history
   */
  private addToHistory(report: SystemHealthReport): void {
    this.healthHistory.push(report);

    // Keep only last 100 reports
    if (this.healthHistory.length > 100) {
      this.healthHistory = this.healthHistory.slice(-100);
    }
  }

  /**
   * Print health summary
   */
  private printHealthSummary(report: SystemHealthReport): void {
    const emoji = {
      healthy: '✅',
      degraded: '⚠️',
      unhealthy: '❌',
      critical: '🚨',
    };

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🏥 APL SYNC HEALTH REPORT`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\nOverall Health: ${emoji[report.overallHealth]} ${report.overallHealth.toUpperCase()}`);
    console.log(`\nState Health:`);

    for (const stateReport of report.stateReports) {
      console.log(`  ${emoji[stateReport.overallHealth]} ${stateReport.state}: ${stateReport.overallHealth}`);
      if (stateReport.issues.length > 0) {
        stateReport.issues.forEach(issue => {
          console.log(`     - ${issue}`);
        });
      }
    }

    if (report.alerts.length > 0) {
      console.log(`\nAlerts:`);
      for (const alert of report.alerts) {
        const alertEmoji = alert.severity === 'critical' ? '🚨' : alert.severity === 'error' ? '❌' : '⚠️';
        console.log(`  ${alertEmoji} ${alert.message}`);
      }
    }

    console.log(`${'='.repeat(60)}\n`);
  }

  /**
   * Get health history
   */
  getHistory(limit: number = 10): SystemHealthReport[] {
    return this.healthHistory.slice(-limit);
  }

  /**
   * Get latest health report
   */
  getLatestReport(): SystemHealthReport | null {
    return this.healthHistory[this.healthHistory.length - 1] || null;
  }
}

/**
 * Create sync health monitor
 */
export function createSyncHealthMonitor(
  dbPool: any,
  monitor: APLMonitorService,
  config?: Partial<HealthCheckConfig>
): SyncHealthMonitor {
  return new SyncHealthMonitor(dbPool, monitor, config);
}
