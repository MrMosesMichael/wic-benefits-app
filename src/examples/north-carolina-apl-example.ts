/**
 * North Carolina APL Ingestion Example
 *
 * Demonstrates how to use the North Carolina APL ingestion service.
 */

import { Pool } from 'pg';
import {
  ingestNorthCarolinaAPL,
  NorthCarolinaAPLIngestionService,
  NorthCarolinaSyncWorker,
  getNorthCarolinaAPLConfig,
  validateNorthCarolinaConfig,
} from '../services/apl';

/**
 * Example 1: Basic ingestion
 */
async function example1_basicIngestion() {
  console.log('Example 1: Basic North Carolina APL Ingestion\n');

  // Create database connection pool
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

  try {
    // Run ingestion
    const stats = await ingestNorthCarolinaAPL({
      downloadUrl: process.env.NORTH_CAROLINA_APL_DOWNLOAD_URL!,
      dbPool,
    });

    // Display results
    console.log('Ingestion completed successfully!');
    console.log(`Total rows: ${stats.totalRows}`);
    console.log(`Valid entries: ${stats.validEntries}`);
    console.log(`Additions: ${stats.additions}`);
    console.log(`Updates: ${stats.updates}`);
    console.log(`Duration: ${stats.durationMs}ms`);
  } finally {
    await dbPool.end();
  }
}

/**
 * Example 2: Ingestion from local file
 */
async function example2_localFileIngestion() {
  console.log('Example 2: Ingestion from Local File\n');

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const stats = await ingestNorthCarolinaAPL({
      downloadUrl: '', // Not used when using local file
      localFilePath: './data/nc-apl-test.xlsx',
      useLocalFile: true,
      dbPool,
    });

    console.log('Local file ingestion completed!');
    console.log(`Processed ${stats.totalRows} rows`);
  } finally {
    await dbPool.end();
  }
}

/**
 * Example 3: Using the service class directly
 */
async function example3_serviceClass() {
  console.log('Example 3: Using Service Class Directly\n');

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Create service instance
    const service = new NorthCarolinaAPLIngestionService({
      downloadUrl: process.env.NORTH_CAROLINA_APL_DOWNLOAD_URL!,
      dbPool,
    });

    // Run ingestion
    const stats = await service.ingest();

    // Get detailed statistics
    console.log('Service ingestion completed!');
    console.log('Statistics:', stats);

    if (stats.errors.length > 0) {
      console.log('\nErrors encountered:');
      stats.errors.forEach(err => console.log(`  - ${err}`));
    }

    if (stats.warnings.length > 0) {
      console.log('\nWarnings:');
      stats.warnings.forEach(warn => console.log(`  - ${warn}`));
    }
  } finally {
    await dbPool.end();
  }
}

/**
 * Example 4: Automated sync worker
 */
async function example4_syncWorker() {
  console.log('Example 4: Automated Sync Worker\n');

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

  // Create and start worker
  const worker = new NorthCarolinaSyncWorker(dbPool);
  worker.start();

  console.log('Sync worker started!');
  console.log('Worker will run on schedule...');

  // Check status
  const status = worker.getStatus();
  console.log('\nWorker Status:');
  console.log(`  Running: ${status.isRunning}`);
  console.log(`  Next run: ${status.nextScheduledRun}`);
  console.log(`  Last success: ${status.lastSuccessAt || 'Never'}`);
  console.log(`  Consecutive failures: ${status.consecutiveFailures}`);

  // Run sync immediately (outside of schedule)
  console.log('\nTriggering immediate sync...');
  await worker.runSyncNow();

  // Stop worker when done
  setTimeout(() => {
    worker.stop();
    dbPool.end();
    console.log('\nWorker stopped');
  }, 5000);
}

/**
 * Example 5: Configuration validation
 */
async function example5_configValidation() {
  console.log('Example 5: Configuration Validation\n');

  // Validate configuration
  const validation = validateNorthCarolinaConfig();

  if (validation.valid) {
    console.log('✅ Configuration is valid');

    // Get configuration
    const config = getNorthCarolinaAPLConfig();
    console.log('\nConfiguration:');
    console.log(`  Download URL: ${config.downloadUrl}`);
    console.log(`  Cron Schedule: ${config.cronSchedule}`);
    console.log(`  Timezone: ${config.timezone}`);
    console.log(`  Validate Check Digit: ${config.validateCheckDigit}`);
    console.log(`  CSV Fallback: ${config.enableCsvFallback}`);
  } else {
    console.log('❌ Configuration is invalid');
    console.log('\nErrors:');
    validation.errors.forEach(err => console.log(`  - ${err}`));
  }
}

/**
 * Example 6: Error handling
 */
async function example6_errorHandling() {
  console.log('Example 6: Error Handling\n');

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Intentionally use invalid URL to demonstrate error handling
    const stats = await ingestNorthCarolinaAPL({
      downloadUrl: 'https://invalid-url-that-does-not-exist.com/apl.xlsx',
      dbPool,
    });

    console.log('Unexpected success:', stats);
  } catch (error) {
    console.log('❌ Ingestion failed (as expected):');
    console.log(`   Error: ${error.message}`);

    // Check if it's a network error
    if (error.message.includes('ENOTFOUND') || error.message.includes('HTTP')) {
      console.log('   This is a network/download error');
    }

    // You could implement retry logic, notifications, etc.
    console.log('\n   In production, you would:');
    console.log('   - Log error to monitoring system');
    console.log('   - Send alert to ops team');
    console.log('   - Retry with exponential backoff');
    console.log('   - Fall back to cached data');
  } finally {
    await dbPool.end();
  }
}

/**
 * Example 7: Query ingested data
 */
async function example7_queryData() {
  console.log('Example 7: Query Ingested Data\n');

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Query North Carolina entries
    const result = await dbPool.query(
      `SELECT
         upc,
         benefit_category,
         benefit_subcategory,
         participant_types,
         data_source,
         last_updated
       FROM apl_entries
       WHERE state = 'NC'
         AND data_source = 'conduent'
       ORDER BY last_updated DESC
       LIMIT 10`
    );

    console.log(`Found ${result.rows.length} North Carolina entries:\n`);

    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. UPC: ${row.upc}`);
      console.log(`   Category: ${row.benefit_category}`);
      if (row.benefit_subcategory) {
        console.log(`   Subcategory: ${row.benefit_subcategory}`);
      }
      if (row.participant_types) {
        console.log(`   Participants: ${row.participant_types.join(', ')}`);
      }
      console.log(`   Last Updated: ${row.last_updated}`);
      console.log('');
    });

    // Check sync status
    const syncResult = await dbPool.query(
      `SELECT
         last_sync_at,
         last_success_at,
         sync_status,
         entries_count,
         consecutive_failures
       FROM apl_sync_status
       WHERE state = 'NC'
         AND data_source = 'conduent'`
    );

    if (syncResult.rows.length > 0) {
      const sync = syncResult.rows[0];
      console.log('Sync Status:');
      console.log(`  Last Sync: ${sync.last_sync_at}`);
      console.log(`  Last Success: ${sync.last_success_at}`);
      console.log(`  Status: ${sync.sync_status}`);
      console.log(`  Entries: ${sync.entries_count}`);
      console.log(`  Consecutive Failures: ${sync.consecutive_failures}`);
    } else {
      console.log('No sync status found');
    }
  } finally {
    await dbPool.end();
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  const examples = [
    { name: 'Basic Ingestion', fn: example1_basicIngestion },
    { name: 'Local File Ingestion', fn: example2_localFileIngestion },
    { name: 'Service Class', fn: example3_serviceClass },
    { name: 'Sync Worker', fn: example4_syncWorker },
    { name: 'Config Validation', fn: example5_configValidation },
    { name: 'Error Handling', fn: example6_errorHandling },
    { name: 'Query Data', fn: example7_queryData },
  ];

  console.log('North Carolina APL Ingestion Examples\n');
  console.log('Available examples:');
  examples.forEach((ex, i) => {
    console.log(`  ${i + 1}. ${ex.name}`);
  });
  console.log('');

  // Run example based on command line argument
  const exampleNum = parseInt(process.argv[2]) || 5; // Default to config validation

  if (exampleNum >= 1 && exampleNum <= examples.length) {
    const example = examples[exampleNum - 1];
    console.log(`Running: ${example.name}\n`);
    console.log('='.repeat(60));
    await example.fn();
    console.log('='.repeat(60));
  } else {
    console.log('Invalid example number. Please specify 1-7.');
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export {
  example1_basicIngestion,
  example2_localFileIngestion,
  example3_serviceClass,
  example4_syncWorker,
  example5_configValidation,
  example6_errorHandling,
  example7_queryData,
};
