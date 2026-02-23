/**
 * APL Sync Monitoring Example
 *
 * Demonstrates how to use the APL update monitoring and sync job system.
 *
 * Features:
 * - Monitor APL data sources for updates
 * - Schedule automatic sync jobs
 * - Trigger emergency syncs
 * - Monitor sync health
 *
 * @module examples/apl-sync-monitoring
 */

import { Pool } from 'pg';
import {
  createAPLSyncSystem,
  startAPLSyncSystem,
  stopAPLSyncSystem,
  createAPLMonitor,
  createSyncOrchestrator,
  createScheduledSyncJob,
  createEmergencySyncTrigger,
  createSyncHealthMonitor,
} from '../services/apl/monitoring';

/**
 * Example 1: Complete APL Sync System
 * Creates and starts the full sync system with all components
 */
async function example1_CompleteSystem() {
  console.log('\n=== Example 1: Complete APL Sync System ===\n');

  // Create database pool
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'wic_benefits',
    user: process.env.DB_USER || 'wic_user',
    password: process.env.DB_PASSWORD,
  });

  try {
    // Start complete system (includes monitoring, scheduling, health checks)
    const system = await startAPLSyncSystem(pool);

    // The system is now running with:
    // - Daily scheduled sync at 2 AM
    // - Continuous monitoring for updates
    // - Health checks
    // - Emergency sync capability

    console.log('✅ System is running');

    // Check monitoring summary
    const monitoringSummary = await system.monitor.getMonitoringSummary();
    console.log('\n📊 Monitoring Summary:', JSON.stringify(monitoringSummary, null, 2));

    // Simulate running for a while, then stop
    console.log('\n⏳ System will run until stopped...');

    // To stop:
    // stopAPLSyncSystem(system);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Example 2: Manual Update Check
 * Check for updates without running full sync
 */
async function example2_CheckForUpdates() {
  console.log('\n=== Example 2: Check for Updates ===\n');

  const pool = new Pool({
    host: 'localhost',
    database: 'wic_benefits',
  });

  const monitor = createAPLMonitor(pool);

  // Check specific state
  console.log('🔍 Checking Michigan for updates...');
  const michiganResult = await monitor.checkForUpdates('MI');
  console.log('Michigan result:', michiganResult);

  // Check all states
  console.log('\n🔍 Checking all states...');
  const allResults = await monitor.checkAllStates();
  allResults.forEach(result => {
    const status = result.hasUpdate ? '✅ UPDATE AVAILABLE' : 'ℹ️  No update';
    console.log(`   ${result.state}: ${status}`);
  });

  await pool.end();
}

/**
 * Example 3: Data Freshness Monitoring
 * Check how old/stale APL data is
 */
async function example3_CheckFreshness() {
  console.log('\n=== Example 3: Data Freshness Check ===\n');

  const pool = new Pool({
    host: 'localhost',
    database: 'wic_benefits',
  });

  const monitor = createAPLMonitor(pool);

  // Check freshness for all states
  const freshnessResults = await monitor.checkAllFreshness();

  console.log('📊 Data Freshness Report:\n');
  freshnessResults.forEach(result => {
    const emoji = {
      fresh: '✅',
      aging: '⏰',
      stale: '⚠️',
      critical: '🚨',
      unknown: '❓',
    }[result.status];

    console.log(`${emoji} ${result.state}:`);
    console.log(`   Status: ${result.status.toUpperCase()}`);
    console.log(`   Age: ${Math.floor(result.ageHours)} hours`);
    if (result.lastSyncAt) {
      console.log(`   Last Sync: ${result.lastSyncAt.toLocaleString()}`);
    }
    console.log();
  });

  await pool.end();
}

/**
 * Example 4: Manual Sync Execution
 * Run sync manually for specific states
 */
async function example4_ManualSync() {
  console.log('\n=== Example 4: Manual Sync Execution ===\n');

  const pool = new Pool({
    host: 'localhost',
    database: 'wic_benefits',
  });

  const monitor = createAPLMonitor(pool);
  const orchestrator = createSyncOrchestrator(pool, monitor);

  // Sync specific state
  console.log('🚀 Syncing Michigan...');
  const michiganResult = await orchestrator.syncState('MI');
  console.log('Michigan sync result:', michiganResult);

  // Sync all states
  console.log('\n🚀 Syncing all states...');
  const allResults = await orchestrator.syncAll();

  const summary = orchestrator.getSummary();
  console.log('\n📊 Sync Summary:');
  console.log(`   Total: ${summary.total}`);
  console.log(`   Completed: ${summary.completed}`);
  console.log(`   Failed: ${summary.failed}`);
  console.log(`   Entries Added: ${summary.totalEntriesAdded}`);
  console.log(`   Entries Updated: ${summary.totalEntriesUpdated}`);
  console.log(`   Success Rate: ${summary.successRate.toFixed(1)}%`);

  await pool.end();
}

/**
 * Example 5: Scheduled Sync Job
 * Set up automated sync on a schedule
 */
async function example5_ScheduledSync() {
  console.log('\n=== Example 5: Scheduled Sync ===\n');

  const pool = new Pool({
    host: 'localhost',
    database: 'wic_benefits',
  });

  const monitor = createAPLMonitor(pool);
  const orchestrator = createSyncOrchestrator(pool, monitor);

  // Create daily scheduled job (2 AM)
  const dailyJob = createScheduledSyncJob(orchestrator, monitor, 'daily');

  // Or create custom schedule
  const customJob = createScheduledSyncJob(
    orchestrator,
    monitor,
    'custom',
    '0 */6 * * *' // Every 6 hours
  );

  // Start the scheduler
  dailyJob.start();

  console.log('✅ Scheduler started');
  console.log('📅 Next run:', dailyJob.getStatus().nextRun);

  // Manually trigger outside of schedule
  console.log('\n🔧 Triggering manual run...');
  await dailyJob.triggerManual();

  // Get statistics
  const stats = dailyJob.getStatistics();
  console.log('\n📊 Job Statistics:', stats);

  // Stop scheduler when done
  // dailyJob.stop();
}

/**
 * Example 6: Emergency Sync
 * Trigger high-priority sync for urgent situations
 */
async function example6_EmergencySync() {
  console.log('\n=== Example 6: Emergency Sync ===\n');

  const pool = new Pool({
    host: 'localhost',
    database: 'wic_benefits',
  });

  const monitor = createAPLMonitor(pool);
  const orchestrator = createSyncOrchestrator(pool, monitor);
  const emergencyTrigger = createEmergencySyncTrigger(orchestrator, monitor);

  // Scenario 1: Formula shortage emergency
  console.log('🚨 EMERGENCY: Formula shortage detected');
  const formulaResult = await emergencyTrigger.triggerFormulaShortageSyncc(['MI', 'NC']);
  console.log('Formula emergency sync result:', formulaResult);

  // Scenario 2: Policy change
  console.log('\n⚠️  Policy change detected');
  const policyResult = await emergencyTrigger.triggerPolicyChange(
    ['FL'],
    'New whole grain requirements effective immediately'
  );
  console.log('Policy change sync result:', policyResult);

  // Scenario 3: Manual override by operator
  console.log('\n🔧 Manual override triggered');
  const manualResult = await emergencyTrigger.triggerManualOverride(
    ['OR'],
    'operator_john',
    'User reports indicate APL data is outdated'
  );
  console.log('Manual override sync result:', manualResult);

  // Get statistics
  const stats = emergencyTrigger.getStatistics();
  console.log('\n📊 Emergency Sync Statistics:');
  console.log(`   Total Requests: ${stats.totalRequests}`);
  console.log(`   Success Rate: ${stats.successRate.toFixed(1)}%`);
  console.log('   By Reason:', stats.byReason);
  console.log('   By Priority:', stats.byPriority);

  await pool.end();
}

/**
 * Example 7: Health Monitoring
 * Monitor sync system health and detect issues
 */
async function example7_HealthMonitoring() {
  console.log('\n=== Example 7: Health Monitoring ===\n');

  const pool = new Pool({
    host: 'localhost',
    database: 'wic_benefits',
  });

  const monitor = createAPLMonitor(pool);
  const healthMonitor = createSyncHealthMonitor(pool, monitor);

  // Perform comprehensive health check
  const healthReport = await healthMonitor.performHealthCheck();

  console.log(`\n🏥 Overall System Health: ${healthReport.overallHealth.toUpperCase()}`);
  console.log(`\n📊 System Metrics:`);
  console.log(`   Total Syncs: ${healthReport.systemMetrics.totalSyncs}`);
  console.log(`   Successful: ${healthReport.systemMetrics.successfulSyncs}`);
  console.log(`   Failed: ${healthReport.systemMetrics.failedSyncs}`);
  console.log(`   Freshness Score: ${healthReport.systemMetrics.dataFreshnessScore.toFixed(1)}%`);

  console.log(`\n📋 State Health:`);
  healthReport.stateReports.forEach(report => {
    console.log(`\n   ${report.state}: ${report.overallHealth.toUpperCase()}`);
    console.log(`   Metrics:`);
    Object.entries(report.metrics).forEach(([key, metric]) => {
      console.log(`     - ${metric.name}: ${metric.value.toFixed(1)} ${metric.unit} (${metric.status})`);
    });

    if (report.issues.length > 0) {
      console.log(`   Issues:`);
      report.issues.forEach(issue => console.log(`     ⚠️  ${issue}`));
    }

    if (report.recommendations.length > 0) {
      console.log(`   Recommendations:`);
      report.recommendations.forEach(rec => console.log(`     💡 ${rec}`));
    }
  });

  if (healthReport.alerts.length > 0) {
    console.log(`\n🚨 Active Alerts:`);
    healthReport.alerts.forEach(alert => {
      console.log(`   ${alert.severity.toUpperCase()}: ${alert.message}`);
    });
  }

  await pool.end();
}

/**
 * Example 8: Event-Driven Monitoring
 * Listen to sync events and react
 */
async function example8_EventDrivenMonitoring() {
  console.log('\n=== Example 8: Event-Driven Monitoring ===\n');

  const pool = new Pool({
    host: 'localhost',
    database: 'wic_benefits',
  });

  const monitor = createAPLMonitor(pool);
  const orchestrator = createSyncOrchestrator(pool, monitor);

  // Listen to orchestrator events
  orchestrator.on('jobStart', (job) => {
    console.log(`🚀 Job started: ${job.state} (${job.jobId})`);
  });

  orchestrator.on('jobComplete', (job) => {
    console.log(`✅ Job completed: ${job.state} - ${job.entriesAdded} added, ${job.entriesUpdated} updated`);
  });

  orchestrator.on('jobFailed', (job) => {
    console.log(`❌ Job failed: ${job.state} - ${job.error}`);
    // Could trigger alerts, notifications, etc.
  });

  orchestrator.on('allComplete', (results) => {
    console.log(`🎉 All jobs complete - ${results.length} total`);
  });

  // Run sync to trigger events
  console.log('Running sync with event monitoring...\n');
  await orchestrator.syncAll();

  await pool.end();
}

/**
 * Example 9: Complete Production Setup
 * Real-world production configuration
 */
async function example9_ProductionSetup() {
  console.log('\n=== Example 9: Production Setup ===\n');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'wic_benefits',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    max: 20,
  });

  // Create complete system
  const system = await startAPLSyncSystem(pool);

  // Set up event handlers for production monitoring
  system.orchestrator.on('jobFailed', async (job) => {
    console.error(`🚨 PRODUCTION ALERT: Sync failed for ${job.state}`, job.error);
    // In production: send to monitoring service (Datadog, Sentry, etc.)
    // await sendToMonitoring({ type: 'sync_failure', state: job.state, error: job.error });
  });

  system.healthMonitor.on('healthReport', (report) => {
    if (report.overallHealth === 'critical' || report.overallHealth === 'unhealthy') {
      console.error('🚨 PRODUCTION ALERT: System health degraded', report.overallHealth);
      // In production: trigger PagerDuty, send Slack notification, etc.
      // await triggerPagerDuty({ severity: 'high', message: 'APL sync health critical' });
    }
  });

  // Perform health check every hour
  setInterval(async () => {
    await system.healthMonitor.performHealthCheck();
  }, 60 * 60 * 1000);

  console.log('✅ Production system running');
  console.log('   - Daily sync at 2 AM');
  console.log('   - Hourly health checks');
  console.log('   - Monitoring alerts enabled');

  // Keep running
  process.on('SIGINT', () => {
    console.log('\n⏹️  Shutting down...');
    stopAPLSyncSystem(system);
    pool.end();
    process.exit(0);
  });
}

/**
 * Main runner - uncomment the example you want to run
 */
async function main() {
  try {
    // await example1_CompleteSystem();
    // await example2_CheckForUpdates();
    // await example3_CheckFreshness();
    // await example4_ManualSync();
    // await example5_ScheduledSync();
    // await example6_EmergencySync();
    // await example7_HealthMonitoring();
    // await example8_EventDrivenMonitoring();
    // await example9_ProductionSetup();

    console.log('\n✅ Example completed successfully');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export {
  example1_CompleteSystem,
  example2_CheckForUpdates,
  example3_CheckFreshness,
  example4_ManualSync,
  example5_ScheduledSync,
  example6_EmergencySync,
  example7_HealthMonitoring,
  example8_EventDrivenMonitoring,
  example9_ProductionSetup,
};
