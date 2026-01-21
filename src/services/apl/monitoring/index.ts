/**
 * APL Monitoring and Sync Jobs
 *
 * Central export point for APL update monitoring and sync job services.
 *
 * @module services/apl/monitoring
 */

// Monitoring
export {
  APLMonitorService,
  createAPLMonitor,
  type MonitorCheckResult,
  type DataFreshnessStatus,
  type StateMonitorConfig,
  type MonitorAlert,
} from './apl-monitor.service';

// Sync Orchestration
export {
  APLSyncOrchestrator,
  createSyncOrchestrator,
  type SyncJobResult,
  type SyncJobStatus,
  type OrchestratorConfig,
} from '../jobs/sync-orchestrator';

// Scheduled Jobs
export {
  ScheduledAPLSyncJob,
  createScheduledSyncJob,
  type ScheduleConfig,
  type JobHistoryEntry,
} from '../jobs/scheduled-sync-job';

// Emergency Sync
export {
  EmergencySyncTrigger,
  createEmergencySyncTrigger,
  type EmergencyReason,
  type EmergencySyncRequest,
  type EmergencySyncResult,
} from '../jobs/emergency-sync-trigger';

// Health Monitoring
export {
  SyncHealthMonitor,
  createSyncHealthMonitor,
  type HealthStatus,
  type HealthMetric,
  type StateHealthReport,
  type SystemHealthReport,
  type HealthCheckConfig,
} from '../health/sync-health-monitor';

/**
 * Complete APL Sync System
 * Combines all monitoring and sync components
 */
export interface APLSyncSystem {
  monitor: APLMonitorService;
  orchestrator: APLSyncOrchestrator;
  scheduler: ScheduledAPLSyncJob;
  emergencyTrigger: EmergencySyncTrigger;
  healthMonitor: SyncHealthMonitor;
}

/**
 * Create complete APL sync system with all components
 */
export function createAPLSyncSystem(dbPool: any): APLSyncSystem {
  // Create monitor
  const monitor = createAPLMonitor(dbPool);

  // Create orchestrator
  const orchestrator = createSyncOrchestrator(dbPool, monitor, {
    maxParallelJobs: 2,
    retryAttempts: 3,
    checkForUpdatesFirst: true,
    skipIfNoUpdate: true,
  });

  // Create scheduler (daily at 2 AM)
  const scheduler = createScheduledSyncJob(orchestrator, monitor, 'daily');

  // Create emergency trigger
  const emergencyTrigger = createEmergencySyncTrigger(orchestrator, monitor);

  // Create health monitor
  const healthMonitor = createSyncHealthMonitor(dbPool, monitor);

  return {
    monitor,
    orchestrator,
    scheduler,
    emergencyTrigger,
    healthMonitor,
  };
}

/**
 * Initialize and start APL sync system
 */
export async function startAPLSyncSystem(dbPool: any): Promise<APLSyncSystem> {
  console.log('🚀 Initializing APL Sync System...');

  const system = createAPLSyncSystem(dbPool);

  // Start scheduler
  system.scheduler.start();

  // Perform initial health check
  await system.healthMonitor.performHealthCheck();

  console.log('✅ APL Sync System initialized and running');

  return system;
}

/**
 * Stop APL sync system
 */
export function stopAPLSyncSystem(system: APLSyncSystem): void {
  console.log('⏹️  Stopping APL Sync System...');
  system.scheduler.stop();
  console.log('✅ APL Sync System stopped');
}
