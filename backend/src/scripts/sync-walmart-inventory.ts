/**
 * Sync Walmart Inventory Script
 * Production-ready script to sync inventory data from Walmart API to database
 */

import dotenv from 'dotenv';
import { inventorySyncService } from '../services/InventorySyncService';
import { walmartInventoryIntegration } from '../services/WalmartInventoryIntegration';
import pool from '../config/database';

dotenv.config();

/**
 * Sync inventory for specific stores and products
 */
async function syncStoreInventory(storeIds: string[], upcs: string[]) {
  console.log('🔄 Starting Walmart Inventory Sync\n');
  console.log(`Stores: ${storeIds.length}`);
  console.log(`Products: ${upcs.length}`);
  console.log(`Total combinations: ${storeIds.length * upcs.length}\n`);

  if (!walmartInventoryIntegration) {
    console.error('❌ Walmart API credentials not configured');
    console.error('   Set WALMART_CLIENT_ID and WALMART_CLIENT_SECRET in .env file');
    process.exit(1);
  }

  try {
    const result = await walmartInventoryIntegration.syncInventory(storeIds, upcs);

    console.log('\n✅ Sync complete!');
    console.log(`   Job ID: ${result.jobId}`);
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Succeeded: ${result.succeeded}`);
    console.log(`   Failed: ${result.failed}`);

    return result;
  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
}

/**
 * Sync formula products (high priority)
 */
async function syncFormulaInventory() {
  console.log('🍼 Syncing formula inventory (high priority)\n');

  if (!walmartInventoryIntegration) {
    console.error('❌ Walmart API credentials not configured');
    process.exit(1);
  }

  // Get Walmart stores from database
  const storeIds = await walmartInventoryIntegration.getWalmartStores(10);

  if (storeIds.length === 0) {
    console.log('No Walmart stores found in database');
    console.log('Add stores with IDs like "walmart-1234" to the stores table');
    return;
  }

  console.log(`Found ${storeIds.length} Walmart stores`);

  await walmartInventoryIntegration.syncFormulaInventory(storeIds);
}

/**
 * Show sync statistics
 */
async function showSyncStats() {
  console.log('\n📊 Sync Statistics (last 7 days)\n');

  const stats = await inventorySyncService.getSyncJobStats('walmart', 7);

  console.log(`Total jobs: ${stats.total_jobs || 0}`);
  console.log(`Completed: ${stats.completed || 0}`);
  console.log(`Failed: ${stats.failed || 0}`);
  console.log(`Items processed: ${stats.total_items || 0}`);
  console.log(`Items succeeded: ${stats.total_succeeded || 0}`);
  console.log(`Items failed: ${stats.total_failed || 0}`);

  if (stats.avg_duration_seconds) {
    console.log(`Avg duration: ${Math.round(stats.avg_duration_seconds)}s`);
  }

  console.log('\n📋 Recent jobs:');
  const recentJobs = await inventorySyncService.getRecentSyncJobs(5);

  recentJobs.forEach(job => {
    console.log(`\nJob #${job.job_id} (${job.retailer})`);
    console.log(`  Status: ${job.status}`);
    console.log(`  Items: ${job.items_succeeded}/${job.items_processed}`);
    console.log(`  Created: ${new Date(job.created_at).toLocaleString()}`);
  });

  console.log('\n🕐 Inventory Freshness:');
  const freshness = await inventorySyncService.getInventoryFreshness();

  console.log(`Total records: ${freshness.total}`);
  console.log(`Fresh (< 1 hour): ${freshness.fresh} (${((freshness.fresh / freshness.total) * 100).toFixed(1)}%)`);
  console.log(`Stale (1-6 hours): ${freshness.stale} (${((freshness.stale / freshness.total) * 100).toFixed(1)}%)`);
  console.log(`Very stale (> 6 hours): ${freshness.veryStale} (${((freshness.veryStale / freshness.total) * 100).toFixed(1)}%)`);
}

/**
 * Cleanup old crowdsourced data
 */
async function cleanupOldData() {
  console.log('\n🧹 Cleaning up stale crowdsourced data...\n');

  const deleted = await inventorySyncService.cleanupStaleInventory(24);

  console.log(`✅ Deleted ${deleted} stale records (older than 24 hours)`);
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || 'sync';

  try {
    switch (command) {
      case 'sync':
        // Example: Sync specific stores and products
        await syncStoreInventory(
          ['walmart-1234', 'walmart-5678'],
          ['055000012345', '078742101286', '016000119468']
        );
        break;

      case 'formula':
        // High-priority formula sync
        await syncFormulaInventory();
        break;

      case 'stats':
        // Show statistics
        await showSyncStats();
        break;

      case 'cleanup':
        // Cleanup old data
        await cleanupOldData();
        break;

      default:
        console.log('Usage: npm run sync-inventory [command]');
        console.log('\nCommands:');
        console.log('  sync     - Sync sample inventory (default)');
        console.log('  formula  - Sync high-priority formula inventory');
        console.log('  stats    - Show sync statistics');
        console.log('  cleanup  - Clean up stale data');
        process.exit(1);
    }

    console.log('\n✨ Done!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
