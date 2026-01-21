/**
 * Emergency APL Sync Trigger
 *
 * Handles emergency/priority sync scenarios:
 * - Critical formula shortages
 * - State policy changes
 * - Manual emergency updates
 * - Push notification triggers
 *
 * @module services/apl/jobs/emergency-sync-trigger
 */

import { EventEmitter } from 'events';
import { APLSyncOrchestrator, SyncJobResult } from './sync-orchestrator';
import { APLMonitorService } from '../monitoring/apl-monitor.service';
import { StateCode } from '../../../types/apl.types';

/**
 * Emergency trigger reason
 */
export type EmergencyReason =
  | 'formula_shortage'
  | 'policy_change'
  | 'manual_override'
  | 'data_corruption'
  | 'push_notification'
  | 'user_report'
  | 'scheduled_check';

/**
 * Emergency sync request
 */
export interface EmergencySyncRequest {
  id: string;
  reason: EmergencyReason;
  states: StateCode[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
  requestedAt: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Emergency sync result
 */
export interface EmergencySyncResult {
  requestId: string;
  request: EmergencySyncRequest;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  jobResults: SyncJobResult[];
  error?: string;
}

/**
 * Emergency Sync Trigger Service
 * Manages high-priority sync operations outside of regular schedule
 */
export class EmergencySyncTrigger extends EventEmitter {
  private orchestrator: APLSyncOrchestrator;
  private monitor: APLMonitorService;
  private activeRequests: Map<string, EmergencySyncResult> = new Map();
  private requestHistory: EmergencySyncResult[] = [];

  constructor(orchestrator: APLSyncOrchestrator, monitor: APLMonitorService) {
    super();
    this.orchestrator = orchestrator;
    this.monitor = monitor;
  }

  /**
   * Trigger emergency sync for specific states
   */
  async triggerSync(
    states: StateCode[],
    reason: EmergencyReason,
    options: {
      priority?: 'low' | 'medium' | 'high' | 'critical';
      requestedBy?: string;
      notes?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<EmergencySyncResult> {
    const request: EmergencySyncRequest = {
      id: this.generateRequestId(),
      reason,
      states,
      priority: options.priority || 'high',
      requestedBy: options.requestedBy || 'system',
      requestedAt: new Date(),
      notes: options.notes,
      metadata: options.metadata,
    };

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚨 EMERGENCY SYNC TRIGGERED`);
    console.log(`   Request ID: ${request.id}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Priority: ${request.priority.toUpperCase()}`);
    console.log(`   States: ${states.join(', ')}`);
    console.log(`   Requested by: ${request.requestedBy}`);
    if (request.notes) {
      console.log(`   Notes: ${request.notes}`);
    }
    console.log(`${'='.repeat(60)}\n`);

    const result: EmergencySyncResult = {
      requestId: request.id,
      request,
      startTime: new Date(),
      status: 'running',
      jobResults: [],
    };

    this.activeRequests.set(request.id, result);
    this.emit('syncStarted', result);

    try {
      // Execute sync for requested states
      const jobResults: SyncJobResult[] = [];

      for (const state of states) {
        console.log(`🚀 Emergency sync: ${state}`);
        const jobResult = await this.orchestrator.syncState(state);
        jobResults.push(jobResult);
      }

      result.jobResults = jobResults;
      result.status = 'completed';
      result.endTime = new Date();
      result.durationMs = result.endTime.getTime() - result.startTime.getTime();

      const successCount = jobResults.filter(r => r.status === 'completed').length;
      const failedCount = jobResults.filter(r => r.status === 'failed').length;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ EMERGENCY SYNC COMPLETE`);
      console.log(`   Request ID: ${request.id}`);
      console.log(`   Duration: ${this.formatDuration(result.durationMs)}`);
      console.log(`   Success: ${successCount}/${states.length}`);
      console.log(`   Failed: ${failedCount}`);
      console.log(`${'='.repeat(60)}\n`);

      this.emit('syncCompleted', result);

      return result;
    } catch (error: any) {
      console.error(`❌ Emergency sync failed:`, error);

      result.status = 'failed';
      result.error = error.message;
      result.endTime = new Date();
      result.durationMs = result.endTime.getTime() - result.startTime.getTime();

      this.emit('syncFailed', result);

      return result;
    } finally {
      this.activeRequests.delete(request.id);
      this.addToHistory(result);
    }
  }

  /**
   * Trigger sync for formula shortage emergency
   */
  async triggerFormulaShortageSyncc(states: StateCode[]): Promise<EmergencySyncResult> {
    return this.triggerSync(states, 'formula_shortage', {
      priority: 'critical',
      requestedBy: 'formula_alert_system',
      notes: 'Critical formula shortage detected - syncing APL for alternative products',
    });
  }

  /**
   * Trigger sync for policy change
   */
  async triggerPolicyChange(
    states: StateCode[],
    policyDetails: string
  ): Promise<EmergencySyncResult> {
    return this.triggerSync(states, 'policy_change', {
      priority: 'high',
      requestedBy: 'policy_monitor',
      notes: `Policy change: ${policyDetails}`,
    });
  }

  /**
   * Trigger manual emergency sync
   */
  async triggerManualOverride(
    states: StateCode[],
    operator: string,
    reason: string
  ): Promise<EmergencySyncResult> {
    return this.triggerSync(states, 'manual_override', {
      priority: 'high',
      requestedBy: operator,
      notes: reason,
    });
  }

  /**
   * Handle push notification trigger
   */
  async handlePushNotification(
    states: StateCode[],
    notificationData: any
  ): Promise<EmergencySyncResult> {
    return this.triggerSync(states, 'push_notification', {
      priority: 'medium',
      requestedBy: 'push_notification_service',
      metadata: notificationData,
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `emergency_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Format duration
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Add result to history
   */
  private addToHistory(result: EmergencySyncResult): void {
    this.requestHistory.push(result);

    // Keep only last 1000 requests
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-1000);
    }
  }

  /**
   * Get active emergency syncs
   */
  getActiveRequests(): EmergencySyncResult[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Get emergency sync history
   */
  getHistory(limit: number = 50): EmergencySyncResult[] {
    return this.requestHistory.slice(-limit);
  }

  /**
   * Get statistics by reason
   */
  getStatisticsByReason() {
    const stats: Record<EmergencyReason, number> = {
      formula_shortage: 0,
      policy_change: 0,
      manual_override: 0,
      data_corruption: 0,
      push_notification: 0,
      user_report: 0,
      scheduled_check: 0,
    };

    for (const result of this.requestHistory) {
      stats[result.request.reason]++;
    }

    return stats;
  }

  /**
   * Get statistics by priority
   */
  getStatisticsByPriority() {
    const stats = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const result of this.requestHistory) {
      stats[result.request.priority]++;
    }

    return stats;
  }

  /**
   * Get overall statistics
   */
  getStatistics() {
    const completed = this.requestHistory.filter(r => r.status === 'completed');
    const failed = this.requestHistory.filter(r => r.status === 'failed');

    const totalDuration = completed.reduce((sum, r) => sum + (r.durationMs || 0), 0);

    return {
      totalRequests: this.requestHistory.length,
      completedRequests: completed.length,
      failedRequests: failed.length,
      activeRequests: this.activeRequests.size,
      successRate: this.requestHistory.length > 0
        ? (completed.length / this.requestHistory.length) * 100
        : 0,
      averageDurationMs: completed.length > 0 ? totalDuration / completed.length : 0,
      byReason: this.getStatisticsByReason(),
      byPriority: this.getStatisticsByPriority(),
    };
  }
}

/**
 * Create emergency sync trigger
 */
export function createEmergencySyncTrigger(
  orchestrator: APLSyncOrchestrator,
  monitor: APLMonitorService
): EmergencySyncTrigger {
  return new EmergencySyncTrigger(orchestrator, monitor);
}
