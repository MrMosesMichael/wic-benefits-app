#!/usr/bin/env node
/**
 * Product Database Monitor CLI Tool
 *
 * Command-line interface for monitoring product database health.
 *
 * Usage:
 *   npm run monitor-products                 # Run health check
 *   npm run monitor-products -- --watch      # Continuous monitoring
 *   npm run monitor-products -- --alerts     # Show alerts only
 */

import { ProductRepository } from '../../../database/ProductRepository';
import { ProductSyncMonitor, createProductSyncMonitor } from '../ProductSyncMonitor';
import { getDatabaseConfig } from '../../../database/config';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options: Record<string, any> = {
    watch: false,
    alerts: false,
    interval: 300, // 5 minutes
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--watch':
        options.watch = true;
        break;
      case '--alerts':
        options.alerts = true;
        break;
      case '--interval':
        options.interval = parseInt(args[++i]);
        break;
      case '--help':
        printHelp();
        process.exit(0);
      default:
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Product Database Monitor Tool

Usage: npm run monitor-products [options]

Options:
  --watch             Continuous monitoring mode
  --alerts            Show alerts only
  --interval <sec>    Monitoring interval in seconds (default: 300)
  --help              Show this help message

Examples:
  npm run monitor-products                    # Single health check
  npm run monitor-products -- --watch         # Continuous monitoring
  npm run monitor-products -- --alerts        # Show alerts only
  npm run monitor-products -- --watch --interval 600
`);
}

/**
 * Show alerts
 */
async function showAlerts(monitor: ProductSyncMonitor) {
  const alerts = monitor.getAlerts();

  if (alerts.length === 0) {
    console.log('✅ No alerts');
    return;
  }

  console.log(`🚨 ${alerts.length} Alert(s):`);
  console.log('');

  for (const alert of alerts) {
    const icon = alert.severity === 'critical' ? '❌' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${alert.severity.toUpperCase()}] ${alert.category}`);
    console.log(`   ${alert.message}`);
    console.log(`   Time: ${alert.timestamp.toLocaleString()}`);
    console.log('');
  }
}

/**
 * Run health check
 */
async function runHealthCheck(monitor: ProductSyncMonitor, options: any) {
  const result = await monitor.checkHealth();

  if (options.alerts) {
    await showAlerts(monitor);
    return;
  }

  // Full results are logged by the monitor
}

/**
 * Watch mode
 */
async function watchMode(monitor: ProductSyncMonitor, options: any) {
  console.log('👁️  Starting continuous monitoring...');
  console.log(`   Interval: ${options.interval} seconds`);
  console.log('   Press Ctrl+C to stop');
  console.log('');

  // Run initial check
  await runHealthCheck(monitor, options);

  // Set up interval
  setInterval(async () => {
    console.log('');
    console.log(`⏰ Running scheduled health check at ${new Date().toLocaleString()}...`);
    console.log('');
    await runHealthCheck(monitor, options);
  }, options.interval * 1000);
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();

  console.log('🏥 Product Database Monitor');
  console.log('');

  // Initialize database
  const dbConfig = getDatabaseConfig();
  const repository = new ProductRepository(dbConfig);

  try {
    // Create monitor
    const monitor = createProductSyncMonitor(repository, {
      coverageThresholds: {
        minimumCoverage: 85,
        targetCoverage: 95,
        criticalCoverage: 70,
        minimumImagesPercentage: 80,
        minimumNutritionPercentage: 60,
      },
      freshnessThresholds: {
        maxProductAgeDays: 90,
        maxImageAgeDays: 180,
        warnNoSyncHours: 48,
        alertNoSyncHours: 72,
      },
    });

    if (options.watch) {
      await watchMode(monitor, options);
    } else {
      await runHealthCheck(monitor, options);
      await repository.close();

      const lastCheck = monitor.getLastHealthCheck();
      const exitCode = lastCheck?.healthy ? 0 : 1;
      process.exit(exitCode);
    }
  } catch (error: any) {
    console.error('❌ Monitor failed:', error.message);
    console.error(error.stack);
    await repository.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
