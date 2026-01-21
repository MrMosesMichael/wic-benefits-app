/**
 * APL Update Monitoring Service
 *
 * Monitors state APL data sources for changes and triggers sync jobs.
 * Tracks data freshness, detects stale data, and alerts on failures.
 *
 * @module services/apl/monitoring/apl-monitor
 */

import { createHash } from 'crypto';
import axios from 'axios';
import { APLSyncStatus, StateCode, APLDataSource } from '../../../types/apl.types';

/**
 * Monitoring check result
 */
export interface MonitorCheckResult {
  state: StateCode;
  dataSource: APLDataSource;
  hasUpdate: boolean;
  currentHash?: string;
  previousHash?: string;
  lastModified?: Date;
  fileSize?: number;
  error?: string;
  checkTimestamp: Date;
}

/**
 * Data freshness status
 */
export interface DataFreshnessStatus {
  state: StateCode;
  dataSource: APLDataSource;
  lastSyncAt?: Date;
  ageHours: number;
  isFresh: boolean;
  isStale: boolean;
  isCritical: boolean;
  status: 'fresh' | 'aging' | 'stale' | 'critical' | 'unknown';
}

/**
 * Monitoring configuration for a state
 */
export interface StateMonitorConfig {
  state: StateCode;
  dataSource: APLDataSource;
  checkUrl: string;
  checkMethod: 'HEAD' | 'GET' | 'ETAG';
  checkIntervalMinutes: number;
  freshnessThresholdHours: 24;
  staleThresholdHours: 168; // 7 days
  criticalThresholdHours: 336; // 14 days
  enabled: boolean;
}

/**
 * Monitoring alert
 */
export interface MonitorAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  state: StateCode;
  message: string;
  details?: any;
  timestamp: Date;
  acknowledged: boolean;
}

/**
 * APL Update Monitor Service
 * Monitors APL data sources for changes and data freshness
 */
export class APLMonitorService {
  private dbPool: any;
  private stateConfigs: Map<StateCode, StateMonitorConfig>;
  private alerts: MonitorAlert[] = [];

  constructor(dbPool: any, stateConfigs: StateMonitorConfig[]) {
    this.dbPool = dbPool;
    this.stateConfigs = new Map(
      stateConfigs.map(config => [config.state, config])
    );
  }

  /**
   * Check a state APL data source for updates
   */
  async checkForUpdates(state: StateCode): Promise<MonitorCheckResult> {
    const config = this.stateConfigs.get(state);

    if (!config || !config.enabled) {
      return {
        state,
        dataSource: 'manual' as APLDataSource,
        hasUpdate: false,
        error: 'State not configured or disabled',
        checkTimestamp: new Date(),
      };
    }

    try {
      console.log(`🔍 Checking for updates: ${state} (${config.dataSource})`);

      // Get previous sync status
      const previousSync = await this.getPreviousSyncStatus(state, config.dataSource);
      const previousHash = previousSync?.currentSourceHash;

      // Check remote source
      let currentHash: string | undefined;
      let lastModified: Date | undefined;
      let fileSize: number | undefined;

      if (config.checkMethod === 'HEAD') {
        // Use HEAD request to check Last-Modified without downloading
        const response = await axios.head(config.checkUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'WIC-Benefits-App/1.0 (Monitor)',
          },
        });

        lastModified = response.headers['last-modified']
          ? new Date(response.headers['last-modified'])
          : undefined;

        fileSize = response.headers['content-length']
          ? parseInt(response.headers['content-length'])
          : undefined;

        // Generate hash from metadata
        currentHash = this.hashFromMetadata(
          lastModified?.toISOString() || '',
          fileSize?.toString() || ''
        );
      } else if (config.checkMethod === 'ETAG') {
        // Use ETag for change detection
        const response = await axios.head(config.checkUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'WIC-Benefits-App/1.0 (Monitor)',
          },
        });

        currentHash = response.headers['etag']?.replace(/['"]/g, '');
        lastModified = response.headers['last-modified']
          ? new Date(response.headers['last-modified'])
          : undefined;
      } else {
        // GET method - download and hash (fallback)
        const response = await axios.get(config.checkUrl, {
          timeout: 30000,
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'WIC-Benefits-App/1.0 (Monitor)',
          },
        });

        currentHash = this.hashBuffer(Buffer.from(response.data));
        fileSize = response.data.byteLength;
      }

      const hasUpdate = previousHash !== currentHash;

      const result: MonitorCheckResult = {
        state,
        dataSource: config.dataSource,
        hasUpdate,
        currentHash,
        previousHash,
        lastModified,
        fileSize,
        checkTimestamp: new Date(),
      };

      if (hasUpdate) {
        console.log(`✅ Update detected for ${state}: ${previousHash} → ${currentHash}`);
        this.createAlert({
          severity: 'info',
          state,
          message: `APL update available for ${state}`,
          details: result,
        });
      } else {
        console.log(`ℹ️  No update for ${state}`);
      }

      return result;
    } catch (error: any) {
      console.error(`❌ Check failed for ${state}:`, error.message);

      this.createAlert({
        severity: 'error',
        state,
        message: `Failed to check ${state} APL updates`,
        details: { error: error.message },
      });

      return {
        state,
        dataSource: config.dataSource,
        hasUpdate: false,
        error: error.message,
        checkTimestamp: new Date(),
      };
    }
  }

  /**
   * Check all configured states for updates
   */
  async checkAllStates(): Promise<MonitorCheckResult[]> {
    const states = Array.from(this.stateConfigs.keys());
    const results: MonitorCheckResult[] = [];

    for (const state of states) {
      const result = await this.checkForUpdates(state);
      results.push(result);
    }

    return results;
  }

  /**
   * Check data freshness for a state
   */
  async checkDataFreshness(state: StateCode): Promise<DataFreshnessStatus> {
    const config = this.stateConfigs.get(state);

    if (!config) {
      return {
        state,
        dataSource: 'manual' as APLDataSource,
        ageHours: Infinity,
        isFresh: false,
        isStale: true,
        isCritical: true,
        status: 'unknown',
      };
    }

    const syncStatus = await this.getPreviousSyncStatus(state, config.dataSource);

    if (!syncStatus || !syncStatus.lastSyncAt) {
      return {
        state,
        dataSource: config.dataSource,
        ageHours: Infinity,
        isFresh: false,
        isStale: true,
        isCritical: true,
        status: 'unknown',
      };
    }

    const now = new Date();
    const ageMs = now.getTime() - syncStatus.lastSyncAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    const isFresh = ageHours <= config.freshnessThresholdHours;
    const isStale = ageHours > config.staleThresholdHours;
    const isCritical = ageHours > config.criticalThresholdHours;

    let status: DataFreshnessStatus['status'];
    if (isCritical) {
      status = 'critical';
    } else if (isStale) {
      status = 'stale';
    } else if (isFresh) {
      status = 'fresh';
    } else {
      status = 'aging';
    }

    const freshnessStatus: DataFreshnessStatus = {
      state,
      dataSource: config.dataSource,
      lastSyncAt: syncStatus.lastSyncAt,
      ageHours,
      isFresh,
      isStale,
      isCritical,
      status,
    };

    // Create alert for stale/critical data
    if (isCritical) {
      this.createAlert({
        severity: 'critical',
        state,
        message: `APL data critically stale for ${state} (${Math.floor(ageHours)}h old)`,
        details: freshnessStatus,
      });
    } else if (isStale) {
      this.createAlert({
        severity: 'warning',
        state,
        message: `APL data stale for ${state} (${Math.floor(ageHours)}h old)`,
        details: freshnessStatus,
      });
    }

    return freshnessStatus;
  }

  /**
   * Check freshness for all states
   */
  async checkAllFreshness(): Promise<DataFreshnessStatus[]> {
    const states = Array.from(this.stateConfigs.keys());
    const results: DataFreshnessStatus[] = [];

    for (const state of states) {
      const result = await this.checkDataFreshness(state);
      results.push(result);
    }

    return results;
  }

  /**
   * Get sync status from database
   */
  private async getPreviousSyncStatus(
    state: StateCode,
    dataSource: APLDataSource
  ): Promise<APLSyncStatus | null> {
    if (!this.dbPool) {
      return null;
    }

    const client = await this.dbPool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM apl_sync_status
         WHERE state = $1 AND data_source = $2
         ORDER BY last_sync_at DESC
         LIMIT 1`,
        [state, dataSource]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        state: row.state,
        dataSource: row.data_source,
        lastSyncAt: row.last_sync_at,
        lastAttemptAt: row.last_attempt_at,
        lastSyncStatus: row.last_sync_status,
        lastSyncError: row.last_sync_error,
        consecutiveFailures: row.consecutive_failures,
        entriesProcessed: row.entries_processed,
        entriesAdded: row.entries_added,
        entriesUpdated: row.entries_updated,
        entriesRemoved: row.entries_removed,
        currentSourceHash: row.current_source_hash,
        previousSourceHash: row.previous_source_hash,
        nextSyncAt: row.next_sync_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Hash buffer content
   */
  private hashBuffer(buffer: Buffer): string {
    const hash = createHash('sha256');
    hash.update(buffer);
    return hash.digest('hex');
  }

  /**
   * Hash metadata (Last-Modified + Content-Length)
   */
  private hashFromMetadata(...values: string[]): string {
    const hash = createHash('sha256');
    hash.update(values.join('|'));
    return hash.digest('hex');
  }

  /**
   * Create a monitoring alert
   */
  private createAlert(alert: Omit<MonitorAlert, 'id' | 'timestamp' | 'acknowledged'>) {
    const fullAlert: MonitorAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(fullAlert);

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    // Log alert
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
    }[alert.severity];

    console.log(`${emoji} [${alert.severity.toUpperCase()}] ${alert.message}`);
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit: number = 100): MonitorAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(): MonitorAlert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get monitoring summary
   */
  async getMonitoringSummary() {
    const freshnessResults = await this.checkAllFreshness();
    const unacknowledgedAlerts = this.getUnacknowledgedAlerts();

    return {
      states: freshnessResults,
      totalStates: freshnessResults.length,
      freshStates: freshnessResults.filter(s => s.isFresh).length,
      staleStates: freshnessResults.filter(s => s.isStale).length,
      criticalStates: freshnessResults.filter(s => s.isCritical).length,
      unacknowledgedAlerts: unacknowledgedAlerts.length,
      alerts: unacknowledgedAlerts.slice(-10),
      timestamp: new Date(),
    };
  }
}

/**
 * Create APL monitor with default configs
 */
export function createAPLMonitor(dbPool: any): APLMonitorService {
  const configs: StateMonitorConfig[] = [
    {
      state: 'MI',
      dataSource: 'fis',
      checkUrl: 'https://www.michigan.gov/mdhhs/-/media/Project/Websites/mdhhs/Folder2/Folder38/Folder1/Folder138/WIC_APL.xlsx',
      checkMethod: 'HEAD',
      checkIntervalMinutes: 60,
      freshnessThresholdHours: 24,
      staleThresholdHours: 168,
      criticalThresholdHours: 336,
      enabled: true,
    },
    {
      state: 'NC',
      dataSource: 'conduent',
      checkUrl: 'https://www.nutritionnc.com/wic/apl',
      checkMethod: 'HEAD',
      checkIntervalMinutes: 60,
      freshnessThresholdHours: 24,
      staleThresholdHours: 168,
      criticalThresholdHours: 336,
      enabled: true,
    },
    {
      state: 'FL',
      dataSource: 'fis',
      checkUrl: 'https://www.floridahealth.gov/programs-and-services/wic/_documents/apl.xlsx',
      checkMethod: 'HEAD',
      checkIntervalMinutes: 60,
      freshnessThresholdHours: 24,
      staleThresholdHours: 168,
      criticalThresholdHours: 336,
      enabled: true,
    },
    {
      state: 'OR',
      dataSource: 'state',
      checkUrl: 'https://www.oregon.gov/oha/PH/HEALTHYPEOPLEFAMILIES/WIC/Documents/apl.xlsx',
      checkMethod: 'HEAD',
      checkIntervalMinutes: 60,
      freshnessThresholdHours: 24,
      staleThresholdHours: 168,
      criticalThresholdHours: 336,
      enabled: true,
    },
  ];

  return new APLMonitorService(dbPool, configs);
}
