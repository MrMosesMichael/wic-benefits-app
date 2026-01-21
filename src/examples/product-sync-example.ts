/**
 * Product Sync Pipeline Examples
 *
 * Demonstrates how to use the product database sync pipeline components.
 */

import { ProductRepository } from '../database/ProductRepository';
import { ProductSyncService, createProductSyncService } from '../services/product/ProductSyncService';
import { ProductSyncScheduler, createProductSyncScheduler } from '../services/product/ProductSyncScheduler';
import { ProductSyncMonitor, createProductSyncMonitor } from '../services/product/ProductSyncMonitor';
import { ImageStorageService } from '../services/product/ImageStorageService';
import { getDatabaseConfig } from '../database/config';
import { getImageStorageConfig } from '../services/product/image-storage.config';

/**
 * Example 1: Basic Product Sync
 *
 * Run a simple incremental sync of products from Open Food Facts
 */
async function example1_BasicSync() {
  console.log('Example 1: Basic Product Sync');
  console.log('==============================\n');

  const dbConfig = getDatabaseConfig();
  const repository = new ProductRepository(dbConfig);

  try {
    // Create sync service
    const syncService = createProductSyncService(repository, {
      sources: ['open_food_facts'],
      batchSize: 50,
      concurrency: 3,
      skipExisting: true,
      limit: 100, // Limit to 100 products for testing
    });

    // Run sync
    const result = await syncService.sync();

    console.log(`\nSync Result:`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Products Added: ${result.productsAdded}`);
    console.log(`  Products Updated: ${result.productsUpdated}`);
    console.log(`  Duration: ${(result.durationMs! / 1000).toFixed(1)}s`);
  } finally {
    await repository.close();
  }
}

/**
 * Example 2: Full Sync with Images
 *
 * Run a full sync including product images to CDN
 */
async function example2_FullSyncWithImages() {
  console.log('Example 2: Full Sync with Images');
  console.log('=================================\n');

  const dbConfig = getDatabaseConfig();
  const repository = new ProductRepository(dbConfig);

  try {
    // Create image service
    const imageConfig = getImageStorageConfig();
    const imageService = new ImageStorageService(imageConfig);

    // Create sync service with image support
    const syncService = createProductSyncService(repository, {
      sources: ['open_food_facts', 'upc_database'],
      batchSize: 100,
      concurrency: 5,
      skipExisting: false, // Full sync
      syncImages: true,
      imageService,
      limit: 500,
    });

    // Run sync with progress callback
    const result = await syncService.sync((progress) => {
      if (progress.progress % 10 === 0) {
        console.log(`  Progress: ${progress.progress}%`);
      }
    });

    console.log(`\nSync Result:`);
    console.log(`  Products Added: ${result.productsAdded}`);
    console.log(`  Products Updated: ${result.productsUpdated}`);
    console.log(`  Images Processed: ${result.imagesProcessed}`);
    console.log(`  Images Failed: ${result.imagesFailed}`);
  } finally {
    await repository.close();
  }
}

/**
 * Example 3: Sync Specific UPCs
 *
 * Sync a specific list of UPCs (useful for targeted updates)
 */
async function example3_SyncSpecificUPCs() {
  console.log('Example 3: Sync Specific UPCs');
  console.log('==============================\n');

  const dbConfig = getDatabaseConfig();
  const repository = new ProductRepository(dbConfig);

  try {
    const targetUPCs = [
      '012345678901',
      '098765432109',
      '111111111111',
    ];

    const syncService = createProductSyncService(repository, {
      sources: ['open_food_facts', 'upc_database'],
      targetUPCs,
      skipExisting: false,
    });

    const result = await syncService.sync();

    console.log(`\nSynced ${targetUPCs.length} UPCs:`);
    console.log(`  Added: ${result.productsAdded}`);
    console.log(`  Updated: ${result.productsUpdated}`);
    console.log(`  Failed: ${result.productsFailed}`);

    if (result.errors.length > 0) {
      console.log(`\nErrors:`);
      result.errors.forEach((err) => {
        console.log(`  ${err.upc}: ${err.error}`);
      });
    }
  } finally {
    await repository.close();
  }
}

/**
 * Example 4: Scheduled Daily Sync
 *
 * Set up automatic daily sync at 2am
 */
async function example4_ScheduledSync() {
  console.log('Example 4: Scheduled Daily Sync');
  console.log('================================\n');

  const dbConfig = getDatabaseConfig();
  const repository = new ProductRepository(dbConfig);

  // Create scheduler
  const scheduler = createProductSyncScheduler(repository, {
    intervalHours: 24,
    syncHour: 2, // 2am
    incrementalSync: true,
    targetCoverage: 95,
    syncConfig: {
      batchSize: 100,
      concurrency: 5,
      syncImages: false,
    },
    autoStart: false, // Don't auto-start for example
  });

  // Listen for events
  scheduler.on('schedulerStarted', () => {
    console.log('Scheduler started');
  });

  scheduler.on('syncComplete', (result) => {
    console.log(`Sync completed: ${result.productsAdded} added, ${result.productsUpdated} updated`);
  });

  scheduler.on('syncFailed', (result) => {
    console.error(`Sync failed: ${result.errors[0]?.error}`);
  });

  // Start scheduler
  scheduler.start();

  // Get status
  const status = scheduler.getStatus();
  console.log(`\nScheduler Status:`);
  console.log(`  Enabled: ${status.enabled}`);
  console.log(`  Next Run: ${status.nextRun?.toLocaleString()}`);
  console.log(`  Total Runs: ${status.totalRuns}`);
  console.log(`  Success Rate: ${((status.successfulRuns / (status.totalRuns || 1)) * 100).toFixed(1)}%`);

  // Run once immediately for testing
  console.log(`\nRunning sync now...`);
  await scheduler.runSync();

  // Stop scheduler (in production, this would run continuously)
  scheduler.stop();

  await repository.close();
}

/**
 * Example 5: Health Monitoring
 *
 * Monitor product database health and get alerts
 */
async function example5_HealthMonitoring() {
  console.log('Example 5: Health Monitoring');
  console.log('=============================\n');

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

    // Run health check
    const health = await monitor.checkHealth();

    console.log(`\nHealth Check Results:`);
    console.log(`  Overall Health: ${health.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    console.log(`  Health Score: ${health.score.toFixed(1)}/100`);
    console.log(`\nCoverage:`);
    console.log(`  Current: ${health.coverage.currentCoverage.toFixed(1)}%`);
    console.log(`  Target: ${health.coverage.targetCoverage}%`);
    console.log(`  Status: ${health.coverage.status}`);
    console.log(`\nFreshness:`);
    console.log(`  Last Sync: ${health.freshness.lastSyncAge.toFixed(1)} hours ago`);
    console.log(`  Status: ${health.freshness.status}`);
    console.log(`\nQuality:`);
    console.log(`  Verified: ${health.quality.verifiedPercentage.toFixed(1)}%`);
    console.log(`  Image Quality: ${health.quality.imageQuality.toFixed(1)}%`);
    console.log(`  Nutrition Quality: ${health.quality.nutritionQuality.toFixed(1)}%`);

    if (health.alerts.length > 0) {
      console.log(`\nAlerts:`);
      health.alerts.forEach((alert) => {
        console.log(`  [${alert.severity}] ${alert.message}`);
      });
    }

    // Get critical alerts only
    const criticalAlerts = monitor.getCriticalAlerts();
    if (criticalAlerts.length > 0) {
      console.log(`\n⚠️  ${criticalAlerts.length} Critical Alerts Require Immediate Action`);
    }
  } finally {
    await repository.close();
  }
}

/**
 * Example 6: Sync with Pause/Resume
 *
 * Demonstrate pausing and resuming a sync job
 */
async function example6_PauseResumeSync() {
  console.log('Example 6: Sync with Pause/Resume');
  console.log('==================================\n');

  const dbConfig = getDatabaseConfig();
  const repository = new ProductRepository(dbConfig);

  try {
    const syncService = createProductSyncService(repository, {
      sources: ['open_food_facts'],
      batchSize: 50,
      concurrency: 3,
      limit: 200,
    });

    // Start sync in background
    const syncPromise = syncService.sync((progress) => {
      console.log(`  Progress: ${progress.progress}%`);

      // Pause at 50%
      if (progress.progress === 50) {
        console.log('  Pausing sync...');
        syncService.pause();

        // Resume after 2 seconds
        setTimeout(() => {
          console.log('  Resuming sync...');
          syncService.resume();
        }, 2000);
      }
    });

    const result = await syncPromise;

    console.log(`\nSync completed with pause/resume:`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Products Added: ${result.productsAdded}`);
  } finally {
    await repository.close();
  }
}

/**
 * Example 7: Combined Pipeline
 *
 * Full example showing sync + scheduling + monitoring together
 */
async function example7_CombinedPipeline() {
  console.log('Example 7: Combined Product Sync Pipeline');
  console.log('==========================================\n');

  const dbConfig = getDatabaseConfig();
  const repository = new ProductRepository(dbConfig);

  try {
    // Step 1: Run initial health check
    console.log('Step 1: Health Check');
    const monitor = createProductSyncMonitor(repository);
    const initialHealth = await monitor.checkHealth();
    console.log(`  Initial Health Score: ${initialHealth.score.toFixed(1)}/100\n`);

    // Step 2: Run sync if health is poor
    if (initialHealth.score < 80) {
      console.log('Step 2: Running Sync (health below 80)');
      const syncService = createProductSyncService(repository, {
        sources: ['open_food_facts', 'upc_database'],
        batchSize: 100,
        concurrency: 5,
        skipExisting: true,
      });

      const result = await syncService.sync();
      console.log(`  Sync Complete: +${result.productsAdded} products\n`);
    }

    // Step 3: Set up scheduled sync
    console.log('Step 3: Setting up Scheduler');
    const scheduler = createProductSyncScheduler(repository, {
      intervalHours: 24,
      syncHour: 2,
      incrementalSync: true,
      targetCoverage: 95,
      autoStart: true,
    });

    const status = scheduler.getStatus();
    console.log(`  Scheduler enabled: ${status.enabled}`);
    console.log(`  Next run: ${status.nextRun?.toLocaleString()}\n`);

    // Step 4: Final health check
    console.log('Step 4: Final Health Check');
    const finalHealth = await monitor.checkHealth();
    console.log(`  Final Health Score: ${finalHealth.score.toFixed(1)}/100`);
    console.log(`  Improvement: +${(finalHealth.score - initialHealth.score).toFixed(1)}`);

    // Cleanup
    scheduler.stop();
  } finally {
    await repository.close();
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  const examples = [
    example1_BasicSync,
    example2_FullSyncWithImages,
    example3_SyncSpecificUPCs,
    example4_ScheduledSync,
    example5_HealthMonitoring,
    example6_PauseResumeSync,
    example7_CombinedPipeline,
  ];

  for (const example of examples) {
    try {
      await example();
      console.log('\n');
    } catch (error: any) {
      console.error(`Error in ${example.name}:`, error.message);
    }
  }
}

// Run examples if called directly
if (require.main === module) {
  runAllExamples()
    .then(() => {
      console.log('All examples completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Example failed:', error);
      process.exit(1);
    });
}

// Export examples for selective execution
export {
  example1_BasicSync,
  example2_FullSyncWithImages,
  example3_SyncSpecificUPCs,
  example4_ScheduledSync,
  example5_HealthMonitoring,
  example6_PauseResumeSync,
  example7_CombinedPipeline,
};
