/**
 * Sync Kroger Inventory Script
 * Syncs formula inventory data from the Kroger API into the database.
 *
 * Usage:
 *   npx ts-node src/scripts/sync-kroger-inventory.ts sync              # All Kroger stores
 *   npx ts-node src/scripts/sync-kroger-inventory.ts store --store kroger-12345
 *   npx ts-node src/scripts/sync-kroger-inventory.ts stats
 *   npx ts-node src/scripts/sync-kroger-inventory.ts cleanup
 */

import dotenv from 'dotenv';
dotenv.config();

import { KrogerIntegration } from '../services/KrogerIntegration';
import { inventorySyncService } from '../services/InventorySyncService';
import pool from '../config/database';

/**
 * Sync all Kroger stores' formula inventory
 */
async function syncAll(kroger: KrogerIntegration) {
  console.log('Syncing formula inventory for all Kroger stores...\n');

  const storeIds = await kroger.getKrogerStores(50);

  if (storeIds.length === 0) {
    console.log('No Kroger stores found in database.');
    console.log('Run "npm run sync-kroger-stores" first to populate stores.');
    return;
  }

  console.log(`Found ${storeIds.length} Kroger stores`);

  const result = await kroger.syncFormulaInventory(storeIds);

  console.log('\nSync complete!');
  console.log(`  Job ID: ${result.jobId}`);
  console.log(`  Processed: ${result.processed}`);
  console.log(`  Succeeded: ${result.succeeded}`);
  console.log(`  Failed: ${result.failed}`);
}

/**
 * Sync a specific Kroger store
 */
async function syncStore(kroger: KrogerIntegration, storeId: string) {
  console.log(`Syncing inventory for store: ${storeId}\n`);

  // Verify store exists
  const storeResult = await pool.query(
    `SELECT store_id, name, city, state FROM stores WHERE store_id = $1`,
    [storeId]
  );

  if (storeResult.rows.length === 0) {
    console.error(`Store not found: ${storeId}`);
    process.exit(1);
  }

  const store = storeResult.rows[0];
  console.log(`Store: ${store.name} - ${store.city}, ${store.state}`);

  const result = await kroger.syncFormulaInventory([storeId]);

  console.log('\nSync complete!');
  console.log(`  Job ID: ${result.jobId}`);
  console.log(`  Processed: ${result.processed}`);
  console.log(`  Succeeded: ${result.succeeded}`);
  console.log(`  Failed: ${result.failed}`);
}

/**
 * Show Kroger sync job stats
 */
async function showStats() {
  console.log('Kroger Sync Statistics (last 7 days)\n');

  const stats = await inventorySyncService.getSyncJobStats('kroger', 7);

  console.log(`Total jobs: ${stats.total_jobs || 0}`);
  console.log(`Completed: ${stats.completed || 0}`);
  console.log(`Failed: ${stats.failed || 0}`);
  console.log(`Items processed: ${stats.total_items || 0}`);
  console.log(`Items succeeded: ${stats.total_succeeded || 0}`);
  console.log(`Items failed: ${stats.total_failed || 0}`);

  if (stats.avg_duration_seconds) {
    console.log(`Avg duration: ${Math.round(stats.avg_duration_seconds)}s`);
  }

  console.log('\nRecent jobs:');
  const recentJobs = await inventorySyncService.getRecentSyncJobs(5);
  for (const job of recentJobs) {
    console.log(`  Job #${job.job_id} (${job.retailer}) - ${job.status} - ${job.items_succeeded}/${job.items_processed} items`);
  }

  // Kroger-specific inventory counts
  const invResult = await pool.query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'in_stock') as in_stock,
       COUNT(*) FILTER (WHERE status = 'low_stock') as low_stock,
       COUNT(*) FILTER (WHERE status = 'out_of_stock') as out_of_stock,
       COUNT(*) FILTER (WHERE last_updated >= NOW() - INTERVAL '1 hour') as fresh
     FROM inventory
     WHERE store_id LIKE 'kroger-%' AND data_source = 'api'`
  );
  const inv = invResult.rows[0];
  console.log('\nKroger inventory records:');
  console.log(`  Total: ${inv.total}`);
  console.log(`  In stock: ${inv.in_stock}`);
  console.log(`  Low stock: ${inv.low_stock}`);
  console.log(`  Out of stock: ${inv.out_of_stock}`);
  console.log(`  Fresh (< 1h): ${inv.fresh}`);
}

/**
 * Remove stale Kroger inventory data
 */
async function cleanup() {
  console.log('Cleaning up stale Kroger inventory data...\n');

  const result = await pool.query(
    `DELETE FROM inventory
     WHERE store_id LIKE 'kroger-%'
       AND data_source = 'api'
       AND last_updated < NOW() - INTERVAL '48 hours'
     RETURNING inventory_id`
  );

  console.log(`Deleted ${result.rows.length} stale records (older than 48 hours)`);
}

async function main() {
  const command = process.argv[2] || 'sync';
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case 'sync': {
        const kroger = KrogerIntegration.fromEnvironment();
        if (!kroger) {
          console.error('Kroger API credentials not configured.');
          console.error('Set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET in .env');
          process.exit(1);
        }
        await syncAll(kroger);
        break;
      }

      case 'store': {
        const storeIdx = args.indexOf('--store');
        const storeId = storeIdx !== -1 ? args[storeIdx + 1] : null;
        if (!storeId) {
          console.error('Usage: sync-kroger-inventory store --store kroger-XXXXX');
          process.exit(1);
        }
        const kroger = KrogerIntegration.fromEnvironment();
        if (!kroger) {
          console.error('Kroger API credentials not configured.');
          process.exit(1);
        }
        await syncStore(kroger, storeId);
        break;
      }

      case 'stats':
        await showStats();
        break;

      case 'cleanup':
        await cleanup();
        break;

      default:
        console.log('Usage: npm run sync-kroger-inventory [command]');
        console.log('\nCommands:');
        console.log('  sync    - Sync all Kroger stores\' formula inventory (default)');
        console.log('  store   - Sync a specific store: --store kroger-12345');
        console.log('  stats   - Show Kroger sync job stats');
        console.log('  cleanup - Remove stale Kroger inventory data');
        process.exit(1);
    }

    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('\nError:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
