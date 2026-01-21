/**
 * Florida APL Ingestion - Example Usage
 *
 * Demonstrates how to use the Florida APL ingestion service
 * in various scenarios.
 *
 * @module examples/florida-apl-example
 */

import { Pool } from 'pg';
import {
  FloridaAPLIngestionService,
  ingestFloridaAPL,
} from '../services/apl/florida-ingestion.service';
import {
  defaultFloridaConfig,
  getFloridaProductionConfig,
  getFloridaTestConfig,
  FLORIDA_APL_URLS,
  FLORIDA_POLICY_DATES,
  getCurrentFormulaContract,
  getFloridaSyncSchedule,
  isArtificialDyeBanActive,
} from '../services/apl/config/florida.config';
import { createFloridaSyncWorker } from '../services/apl/workers/florida-sync-worker';

/**
 * Example 1: Basic ingestion with local file
 */
export async function example1_BasicIngestion() {
  console.log('Example 1: Basic Florida APL Ingestion\n');

  // Configure for local test file
  const config = getFloridaTestConfig('./test-data/florida-apl.xlsx');

  // Run ingestion
  const stats = await ingestFloridaAPL(config);

  console.log('\nResults:');
  console.log(`  Processed: ${stats.totalRows} rows`);
  console.log(`  Added: ${stats.additions} entries`);
  console.log(`  Rejected (dyes): ${stats.rejectedArtificialDyes} products`);
  console.log(`  Formula changes: ${stats.contractFormulaChanges}`);
}

/**
 * Example 2: Production ingestion with database
 */
export async function example2_ProductionIngestion() {
  console.log('Example 2: Production Florida APL Ingestion\n');

  // Create database connection pool
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

  try {
    // Configure for production
    const config = getFloridaProductionConfig(dbPool);

    // Run ingestion
    const stats = await ingestFloridaAPL(config);

    console.log('\nResults:');
    console.log(`  Database additions: ${stats.additions}`);
    console.log(`  Database updates: ${stats.updates}`);
    console.log(`  Duration: ${stats.durationMs}ms`);

    // Query some results
    const result = await dbPool.query(
      'SELECT COUNT(*) as count FROM apl_entries WHERE state = $1',
      ['FL']
    );
    console.log(`  Total FL entries in DB: ${result.rows[0].count}`);
  } finally {
    await dbPool.end();
  }
}

/**
 * Example 3: Check Florida policy status
 */
export async function example3_PolicyStatus() {
  console.log('Example 3: Florida WIC Policy Status\n');

  // Check if artificial dye ban is active
  const dyeBanActive = isArtificialDyeBanActive();
  console.log(`Artificial Dye Ban: ${dyeBanActive ? 'ACTIVE ✅' : 'Not Active ❌'}`);
  console.log(`Ban Date: ${FLORIDA_POLICY_DATES.artificialDyeBanDate.toLocaleDateString()}`);

  // Get current formula contract
  const formulaContract = getCurrentFormulaContract();
  console.log(`\nFormula Contract:`);
  console.log(`  Brand: ${formulaContract.primaryBrand || 'Unknown'}`);
  console.log(`  Start: ${formulaContract.startDate.toLocaleDateString()}`);
  console.log(`  End: ${formulaContract.endDate?.toLocaleDateString() || 'Ongoing'}`);

  // Check phased rollout status
  const now = new Date();
  const isInPhasedRollout =
    now >= FLORIDA_POLICY_DATES.phasedRolloutStart &&
    now <= FLORIDA_POLICY_DATES.phasedRolloutEnd;

  console.log(`\nPhased Rollout:`);
  console.log(`  Period: ${FLORIDA_POLICY_DATES.phasedRolloutStart.toLocaleDateString()} - ${FLORIDA_POLICY_DATES.phasedRolloutEnd.toLocaleDateString()}`);
  console.log(`  Status: ${isInPhasedRollout ? 'IN PROGRESS 🚧' : 'COMPLETE ✅'}`);

  // Get recommended sync schedule
  const syncSchedule = getFloridaSyncSchedule();
  console.log(`\nRecommended Sync: ${syncSchedule.toUpperCase()}`);
  console.log(`  ${syncSchedule === 'daily' ? '📅 Daily (phased rollout)' : '📅 Weekly (stable)'}`);
}

/**
 * Example 4: Custom ingestion with error handling
 */
export async function example4_CustomIngestion() {
  console.log('Example 4: Custom Florida APL Ingestion with Error Handling\n');

  const config = getFloridaTestConfig('./test-data/florida-apl.xlsx');

  // Create service instance
  const service = new FloridaAPLIngestionService(config);

  try {
    // Run ingestion
    const stats = await service.ingest();

    // Check for errors
    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      stats.errors.slice(0, 5).forEach(err => {
        console.log(`  - ${err}`);
      });
    }

    // Check for warnings
    if (stats.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      stats.warnings.slice(0, 5).forEach(warn => {
        console.log(`  - ${warn}`);
      });
    }

    // Analyze rejection reasons
    if (stats.rejectedArtificialDyes > 0) {
      console.log(`\n🚫 Artificial Dye Rejections:`);
      console.log(`  ${stats.rejectedArtificialDyes} products rejected`);
      console.log(`  Reason: Florida policy bans artificial dyes (Oct 2025)`);
    }

    // Success
    console.log(`\n✅ Ingestion completed successfully`);
  } catch (error) {
    console.error('\n❌ Ingestion failed:', error.message);
    throw error;
  }
}

/**
 * Example 5: Automated sync worker
 */
export async function example5_SyncWorker() {
  console.log('Example 5: Automated Florida APL Sync Worker\n');

  // Create database pool
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Create and start sync worker
  const worker = createFloridaSyncWorker({
    dbPool,
    enableAlerts: true,
    alertWebhookUrl: process.env.SLACK_WEBHOOK_URL,
    maxConsecutiveFailures: 3,
  });

  console.log('Sync worker started');

  // Check worker status
  const status = worker.getStatus();
  console.log('\nWorker Status:');
  console.log(`  Running: ${status.running ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  Schedule: ${status.currentSchedule}`);
  console.log(`  Next Run: ${status.nextScheduledRun?.toLocaleString()}`);
  console.log(`  Consecutive Failures: ${status.consecutiveFailures}`);

  // Health check
  const health = worker.getHealthCheck();
  console.log('\nHealth Check:');
  console.log(`  Healthy: ${health.healthy ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  Status: ${health.status}`);

  // Manual sync trigger (optional)
  // console.log('\nTriggering manual sync...');
  // const stats = await worker.runSyncNow();
  // console.log('Manual sync complete:', stats);

  // Note: Worker will continue running in background
  // Call worker.stop() and dbPool.end() when done
}

/**
 * Example 6: Query Florida APL data
 */
export async function example6_QueryAPL() {
  console.log('Example 6: Query Florida APL Data\n');

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Count total Florida entries
    const countResult = await dbPool.query(
      'SELECT COUNT(*) as count FROM apl_entries WHERE state = $1',
      ['FL']
    );
    console.log(`Total Florida APL entries: ${countResult.rows[0].count}`);

    // Get entries by category
    const categoryResult = await dbPool.query(
      `SELECT benefit_category, COUNT(*) as count
       FROM apl_entries
       WHERE state = $1
       GROUP BY benefit_category
       ORDER BY count DESC
       LIMIT 10`,
      ['FL']
    );
    console.log('\nTop Categories:');
    categoryResult.rows.forEach(row => {
      console.log(`  ${row.benefit_category}: ${row.count} products`);
    });

    // Check for artificial dye policy enforcement
    const dyeResult = await dbPool.query(
      `SELECT COUNT(*) as count
       FROM apl_entries
       WHERE state = $1
       AND additional_restrictions->>'noArtificialDyes' = 'true'`,
      ['FL']
    );
    console.log(`\nProducts with no-artificial-dyes restriction: ${dyeResult.rows[0].count}`);

    // Find contract formula products
    const formulaResult = await dbPool.query(
      `SELECT upc, benefit_category, brand_restriction
       FROM apl_entries
       WHERE state = $1
       AND benefit_category LIKE '%Formula%'
       AND brand_restriction IS NOT NULL
       LIMIT 5`,
      ['FL']
    );
    console.log('\nSample Formula Contract Products:');
    formulaResult.rows.forEach(row => {
      const brandInfo = row.brand_restriction;
      console.log(`  UPC ${row.upc}: ${row.benefit_category}`);
      console.log(`    Contract: ${brandInfo.contractBrand || 'N/A'}`);
    });

    // Check sync status
    const syncResult = await dbPool.query(
      `SELECT last_sync_at, sync_status, entries_count, consecutive_failures
       FROM apl_sync_status
       WHERE state = $1 AND data_source = $2`,
      ['FL', 'fis']
    );
    if (syncResult.rows.length > 0) {
      const sync = syncResult.rows[0];
      console.log('\nSync Status:');
      console.log(`  Last Sync: ${sync.last_sync_at?.toLocaleString() || 'Never'}`);
      console.log(`  Status: ${sync.sync_status || 'Unknown'}`);
      console.log(`  Entries: ${sync.entries_count || 0}`);
      console.log(`  Failures: ${sync.consecutive_failures || 0}`);
    }
  } finally {
    await dbPool.end();
  }
}

/**
 * Example 7: Lookup specific product
 */
export async function example7_ProductLookup() {
  console.log('Example 7: Florida Product Lookup\n');

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const testUPC = '011110416605'; // Cheerios example

    const result = await dbPool.query(
      `SELECT *
       FROM apl_entries
       WHERE state = $1
       AND upc = $2
       AND (expiration_date IS NULL OR expiration_date > NOW())
       ORDER BY effective_date DESC
       LIMIT 1`,
      ['FL', testUPC]
    );

    if (result.rows.length > 0) {
      const product = result.rows[0];
      console.log(`Product Found: UPC ${testUPC}`);
      console.log(`  Category: ${product.benefit_category}`);
      console.log(`  Eligible: ${product.eligible ? 'YES ✅' : 'NO ❌'}`);
      console.log(`  Participant Types: ${product.participant_types?.join(', ') || 'All'}`);
      console.log(`  Size Restriction: ${JSON.stringify(product.size_restriction)}`);
      console.log(`  Effective: ${product.effective_date.toLocaleDateString()}`);
      console.log(`  Notes: ${product.notes || 'None'}`);

      // Check for artificial dye restriction
      if (product.additional_restrictions?.noArtificialDyes) {
        console.log('  ✅ Artificial dyes prohibited (FL policy)');
      }
    } else {
      console.log(`Product not found in Florida APL: UPC ${testUPC}`);
    }
  } finally {
    await dbPool.end();
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('='.repeat(60));
  console.log('Florida APL Ingestion - Example Usage');
  console.log('='.repeat(60) + '\n');

  try {
    // Example 3: Policy status (no external dependencies)
    await example3_PolicyStatus();
    console.log('\n' + '='.repeat(60) + '\n');

    // Other examples require database and/or data files
    // Uncomment to run:

    // await example1_BasicIngestion();
    // console.log('\n' + '='.repeat(60) + '\n');

    // await example2_ProductionIngestion();
    // console.log('\n' + '='.repeat(60) + '\n');

    // await example4_CustomIngestion();
    // console.log('\n' + '='.repeat(60) + '\n');

    // await example5_SyncWorker();
    // console.log('\n' + '='.repeat(60) + '\n');

    // await example6_QueryAPL();
    // console.log('\n' + '='.repeat(60) + '\n');

    // await example7_ProductLookup();
    // console.log('\n' + '='.repeat(60) + '\n');

    console.log('Examples complete!');
  } catch (error) {
    console.error('Example failed:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
