#!/usr/bin/env ts-node
/**
 * APL Sync System Quick Start Script
 *
 * This script provides an easy way to start the APL sync system
 * with sensible defaults for development and production.
 *
 * Usage:
 *   npm run apl:sync:start
 *   OR
 *   npx ts-node src/services/apl/monitoring/quick-start.ts
 *
 * Environment Variables:
 *   DB_HOST - Database host (default: localhost)
 *   DB_PORT - Database port (default: 5432)
 *   DB_NAME - Database name (default: wic_benefits)
 *   DB_USER - Database user
 *   DB_PASSWORD - Database password
 *   APL_SYNC_SCHEDULE - Cron schedule (default: "0 2 * * *")
 *   APL_RUN_ON_INIT - Run sync on startup (default: false)
 *   NODE_ENV - Environment (development/production)
 *
 * @module services/apl/monitoring/quick-start
 */

import { Pool } from 'pg';
import {
  startAPLSyncSystem,
  stopAPLSyncSystem,
  type APLSyncSystem,
} from './index';

/**
 * Configuration from environment
 */
const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'wic_benefits',
    user: process.env.DB_USER || 'wic_user',
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    max: 20,
  },
  sync: {
    schedule: process.env.APL_SYNC_SCHEDULE || '0 2 * * *',
    runOnInit: process.env.APL_RUN_ON_INIT === 'true',
  },
  environment: process.env.NODE_ENV || 'development',
};

/**
 * Main function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 APL Sync System Quick Start');
  console.log('='.repeat(60));
  console.log(`\nEnvironment: ${config.environment}`);
  console.log(`Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
  console.log(`Schedule: ${config.sync.schedule}`);
  console.log(`Run on init: ${config.sync.runOnInit}`);
  console.log();

  // Create database pool
  const pool = new Pool(config.database);

  // Test database connection
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    console.error('\nPlease check:');
    console.error('1. PostgreSQL is running');
    console.error('2. Database credentials are correct');
    console.error('3. Database "wic_benefits" exists');
    console.error('4. Required tables exist (run migration if needed)');
    process.exit(1);
  }

  // Check if tables exist
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'apl_sync_status'
      );
    `);
    client.release();

    if (!result.rows[0].exists) {
      console.log('\n⚠️  Warning: APL sync tables not found');
      console.log('Please run the migration:');
      console.log('  psql -U wic_user -d wic_benefits -f src/services/apl/migrations/001_apl_sync_monitoring_tables.sql');
      console.log('\nContinuing anyway (some features may not work)...\n');
    }
  } catch (error) {
    // Ignore errors, continue anyway
  }

  let system: APLSyncSystem;

  try {
    // Start APL sync system
    console.log('🚀 Starting APL Sync System...\n');
    system = await startAPLSyncSystem(pool);

    // Log system status
    const status = system.scheduler.getStatus();
    console.log('\n' + '='.repeat(60));
    console.log('✅ APL Sync System Running');
    console.log('='.repeat(60));
    console.log(`\n📅 Next scheduled run: ${status.nextRun || 'Not scheduled'}`);
    console.log('📊 Monitoring: Active');
    console.log('🏥 Health checks: Enabled');
    console.log('🚨 Emergency sync: Available');
    console.log();

    // Run initial sync if configured
    if (config.sync.runOnInit) {
      console.log('🚀 Running initial sync (runOnInit=true)...\n');
      const results = await system.orchestrator.syncAll();
      const summary = system.orchestrator.getSummary();
      console.log('\n📊 Initial Sync Results:');
      console.log(`   Completed: ${summary.completed}`);
      console.log(`   Failed: ${summary.failed}`);
      console.log(`   Entries Added: ${summary.totalEntriesAdded}`);
      console.log(`   Entries Updated: ${summary.totalEntriesUpdated}`);
      console.log();
    }

    // Perform initial health check
    console.log('🏥 Performing initial health check...\n');
    const healthReport = await system.healthMonitor.performHealthCheck();

    // Log monitoring summary
    console.log('\n📊 Getting monitoring summary...');
    const monitoringSummary = await system.monitor.getMonitoringSummary();
    console.log(`   Fresh states: ${monitoringSummary.freshStates}/${monitoringSummary.totalStates}`);
    console.log(`   Stale states: ${monitoringSummary.staleStates}`);
    console.log(`   Critical states: ${monitoringSummary.criticalStates}`);
    console.log(`   Unacknowledged alerts: ${monitoringSummary.unacknowledgedAlerts}`);

    // Show available commands
    console.log('\n' + '='.repeat(60));
    console.log('💡 Useful Commands');
    console.log('='.repeat(60));
    console.log('\n# Manual sync:');
    console.log('  system.orchestrator.syncState("MI")');
    console.log('  system.orchestrator.syncAll()');
    console.log('\n# Emergency sync:');
    console.log('  system.emergencyTrigger.triggerFormulaShortageSyncc(["MI", "NC"])');
    console.log('\n# Health check:');
    console.log('  system.healthMonitor.performHealthCheck()');
    console.log('\n# Check freshness:');
    console.log('  system.monitor.checkAllFreshness()');
    console.log('\n# Check for updates:');
    console.log('  system.monitor.checkAllStates()');
    console.log('\n# Trigger manual run:');
    console.log('  system.scheduler.triggerManual()');
    console.log();

    // Setup graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n⏹️  Shutting down...');
      stopAPLSyncSystem(system);
      await pool.end();
      console.log('✅ Shutdown complete');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n\n⏹️  Shutting down...');
      stopAPLSyncSystem(system);
      await pool.end();
      console.log('✅ Shutdown complete');
      process.exit(0);
    });

    // Keep process running
    console.log('⏰ System running... Press Ctrl+C to stop\n');
    await new Promise(() => {}); // Run forever
  } catch (error: any) {
    console.error('\n❌ Failed to start APL Sync System:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
