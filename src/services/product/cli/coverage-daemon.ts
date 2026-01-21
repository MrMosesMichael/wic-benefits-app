#!/usr/bin/env node
/**
 * APL Coverage Monitor Daemon
 *
 * Runs continuous coverage monitoring and auto-sync operations.
 *
 * Usage:
 *   npm run coverage-daemon                           # Start monitor
 *   npm run coverage-daemon -- --interval 3600        # Custom interval (seconds)
 *   npm run coverage-daemon -- --no-auto-sync         # Monitoring only
 *   npm run coverage-daemon -- --images               # Sync images
 */

import { Pool } from 'pg';
import { ProductRepository } from '../../../database/ProductRepository';
import { APLCoverageMonitor, createCoverageMonitor } from '../APLCoverageMonitor';
import { ImageStorageService } from '../ImageStorageService';
import { getImageStorageConfig } from '../image-storage.config';
import { getDatabaseConfig } from '../../../database/config';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options: Record<string, any> = {
    interval: 3600, // seconds
    autoSync: true,
    syncImages: false,
    alertThreshold: 90.0,
    targetCoverage: 95.0,
    maxUPCs: 10000,
    batchSize: 100,
    concurrency: 5,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--interval':
        options.interval = parseInt(args[++i]);
        break;
      case '--no-auto-sync':
        options.autoSync = false;
        break;
      case '--images':
        options.syncImages = true;
        break;
      case '--alert-threshold':
        options.alertThreshold = parseFloat(args[++i]);
        break;
      case '--target':
        options.targetCoverage = parseFloat(args[++i]);
        break;
      case '--max-upcs':
        options.maxUPCs = parseInt(args[++i]);
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]);
        break;
      case '--concurrency':
        options.concurrency = parseInt(args[++i]);
        break;
      case '--help':
        printHelp();
        process.exit(0);
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
APL Coverage Monitor Daemon

Continuously monitors product database coverage and auto-syncs missing UPCs.

Usage: npm run coverage-daemon [options]

Options:
  --interval <seconds>      Check interval in seconds (default: 3600)
  --no-auto-sync            Disable automatic syncing (monitoring only)
  --images                  Sync product images during auto-sync
  --alert-threshold <pct>   Alert when coverage below % (default: 90)
  --target <pct>            Target coverage % (default: 95)
  --max-upcs <n>            Max UPCs to sync per operation (default: 10000)
  --batch-size <n>          Batch size for sync (default: 100)
  --concurrency <n>         Concurrent requests (default: 5)
  --help                    Show this help message

Examples:
  npm run coverage-daemon                      # Start with defaults
  npm run coverage-daemon -- --interval 1800   # Check every 30 min
  npm run coverage-daemon -- --no-auto-sync    # Monitor only
  npm run coverage-daemon -- --images          # With image sync

Signals:
  SIGTERM, SIGINT    Graceful shutdown
  SIGUSR1            Force immediate coverage check
  SIGUSR2            Print current status
`);
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  WIC APL Coverage Monitor Daemon');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Initialize database connections
  const dbConfig = getDatabaseConfig();
  const pool = new Pool(dbConfig);
  const repository = new ProductRepository(dbConfig);

  // Initialize image service if needed
  let imageService: ImageStorageService | undefined;
  if (options.syncImages) {
    const imageConfig = getImageStorageConfig();
    imageService = new ImageStorageService(imageConfig);
    console.log('🖼️  Image sync enabled');
  }

  // Create monitor
  const monitor = createCoverageMonitor(pool, repository, {
    targetCoverage: options.targetCoverage,
    checkIntervalMs: options.interval * 1000,
    autoSync: options.autoSync,
    syncImages: options.syncImages,
    imageService,
    alertThreshold: options.alertThreshold,
    maxUPCsPerSync: options.maxUPCs,
    batchSize: options.batchSize,
    concurrency: options.concurrency,
  });

  // Event handlers
  monitor.on('started', () => {
    console.log('✓ Monitor started');
  });

  monitor.on('stopped', () => {
    console.log('✓ Monitor stopped');
  });

  monitor.on('checkComplete', (analysis) => {
    console.log('');
    console.log(`[${new Date().toLocaleTimeString()}] Coverage check complete`);
    console.log(`  Coverage: ${analysis.coveragePercent.toFixed(2)}%`);
    console.log(`  Status: ${analysis.meetsTarget ? '✓ Target met' : '✗ Below target'}`);
  });

  monitor.on('alert', (alert) => {
    console.log('');
    console.log(`[${alert.timestamp.toLocaleTimeString()}] ${alert.severity.toUpperCase()} ALERT`);
    console.log(`  ${alert.message}`);
    console.log(`  Coverage: ${alert.coverage.toFixed(2)}%`);
    console.log(`  Missing UPCs: ${alert.missingUPCs.toLocaleString()}`);
  });

  monitor.on('syncStart', (alert) => {
    console.log('');
    console.log(`[${alert.timestamp.toLocaleTimeString()}] Starting auto-sync`);
    if (alert.recommendation) {
      console.log(`  Priority: ${alert.recommendation.priority}`);
      console.log(`  Estimated UPCs: ${alert.recommendation.estimatedUPCs.toLocaleString()}`);
      console.log(`  Estimated duration: ${alert.recommendation.estimatedDuration}`);
    }
  });

  monitor.on('syncComplete', (result) => {
    console.log('');
    console.log(`[${new Date().toLocaleTimeString()}] Auto-sync complete`);
    if (result.afterAnalysis) {
      console.log(`  New coverage: ${result.afterAnalysis.coveragePercent.toFixed(2)}%`);
      console.log(`  Status: ${result.afterAnalysis.meetsTarget ? '✓ Target met' : '✗ Below target'}`);
    }
  });

  monitor.on('error', (error, alert) => {
    console.error('');
    console.error(`[${alert.timestamp.toLocaleTimeString()}] ERROR`);
    console.error(`  ${alert.message}`);
  });

  // Signal handlers
  let shutdownInProgress = false;

  const shutdown = async (signal: string) => {
    if (shutdownInProgress) {
      console.log('⚠️  Shutdown already in progress...');
      return;
    }

    shutdownInProgress = true;
    console.log('');
    console.log(`📡 Received ${signal} - shutting down gracefully...`);

    monitor.stop();

    console.log('🔌 Closing database connections...');
    await pool.end();
    await repository.close();

    console.log('✅ Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('SIGUSR1', async () => {
    console.log('');
    console.log('📡 Received SIGUSR1 - forcing immediate check...');
    try {
      await monitor.forceCheck();
    } catch (error: any) {
      console.error('❌ Force check failed:', error.message);
    }
  });

  process.on('SIGUSR2', () => {
    console.log('');
    console.log('📡 Received SIGUSR2 - printing status...');
    const status = monitor.getStatus();
    console.log('');
    console.log('Monitor Status:');
    console.log(`  Running: ${status.running}`);
    console.log(`  Checks performed: ${status.checksPerformed}`);
    console.log(`  Sync operations: ${status.syncOperations}`);
    console.log(`  Uptime: ${Math.floor(status.uptime / 1000)}s`);
    console.log(`  Last check: ${status.lastCheck?.toLocaleString() || 'never'}`);
    console.log(`  Next check: ${status.nextCheck?.toLocaleString() || 'n/a'}`);
    if (status.lastAnalysis) {
      console.log(`  Last coverage: ${status.lastAnalysis.coveragePercent.toFixed(2)}%`);
      console.log(`  Meets target: ${status.lastAnalysis.meetsTarget ? 'YES' : 'NO'}`);
    }
    console.log('');
  });

  // Handle uncaught errors
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', async (error) => {
    console.error('❌ Uncaught exception:', error);
    await shutdown('uncaughtException');
  });

  // Start monitor
  try {
    monitor.start();

    console.log('');
    console.log('📊 Daemon running - press Ctrl+C to stop');
    console.log('');
    console.log('Signals:');
    console.log('  SIGUSR1 - Force immediate coverage check');
    console.log('  SIGUSR2 - Print current status');
    console.log('');
  } catch (error: any) {
    console.error('❌ Failed to start monitor:', error.message);
    console.error(error.stack);
    await shutdown('startupError');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
