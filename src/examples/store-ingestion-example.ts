/**
 * Store Ingestion Pipeline Example Usage
 *
 * Demonstrates how to use the store ingestion pipeline
 */

import { StoreIngestionPipeline } from '../services/store/StoreIngestionPipeline';
import { DataQualityValidator } from '../services/store/data-quality-validator';
import { IngestionMonitor } from '../services/store/ingestion-monitoring';

/**
 * Example 1: Ingest all states
 */
async function exampleIngestAllStates() {
  console.log('\n=== Example 1: Ingest All States ===\n');

  const pipeline = new StoreIngestionPipeline();
  const result = await pipeline.ingest();

  console.log(`\nIngestion complete:`);
  console.log(`  - Scraped: ${result.totalScraped}`);
  console.log(`  - Normalized: ${result.totalNormalized}`);
  console.log(`  - Inserted: ${result.totalInserted}`);
  console.log(`  - Updated: ${result.totalUpdated}`);
  console.log(`  - Errors: ${result.totalErrors}`);
  console.log(`  - Duration: ${(result.durationMs / 1000).toFixed(2)}s`);
}

/**
 * Example 2: Ingest specific states
 */
async function exampleIngestSpecificStates() {
  console.log('\n=== Example 2: Ingest Specific States ===\n');

  const pipeline = new StoreIngestionPipeline();
  const result = await pipeline.ingest({
    states: ['MI', 'NC'],
  });

  console.log(`\nIngested ${result.stateResults.length} states`);
  for (const stateResult of result.stateResults) {
    console.log(`\n${stateResult.state}:`);
    console.log(`  - Success: ${stateResult.success}`);
    console.log(`  - Inserted: ${stateResult.inserted}`);
    console.log(`  - Updated: ${stateResult.updated}`);
  }
}

/**
 * Example 3: Dry run (test without database writes)
 */
async function exampleDryRun() {
  console.log('\n=== Example 3: Dry Run (No Database Writes) ===\n');

  const pipeline = new StoreIngestionPipeline();
  const result = await pipeline.ingest({
    dryRun: true,
  });

  console.log(`\nDry run complete - no data written to database`);
  console.log(`Would have processed ${result.totalNormalized} stores`);
}

/**
 * Example 4: Validate data quality
 */
async function exampleDataQualityValidation() {
  console.log('\n=== Example 4: Data Quality Validation ===\n');

  // This would typically validate stores from the database
  // For demo, we'll show how to use the validator

  const validator = new DataQualityValidator();

  // Example store data (would come from database)
  const sampleStores = [
    {
      id: '1',
      name: 'Walmart Supercenter',
      chain: 'walmart',
      chainId: 'walmart-1791',
      address: {
        street: '29574 7 Mile Rd',
        city: 'Livonia',
        state: 'MI',
        zip: '48152',
        country: 'USA',
      },
      location: {
        lat: 42.4259,
        lng: -83.3724,
      },
      wicAuthorized: true,
      wicVendorId: 'MI-1791',
      phone: '(248) 476-1940',
      hours: [],
      holidayHours: [],
      timezone: 'America/Detroit',
      features: {
        hasPharmacy: true,
        hasDeliCounter: true,
        hasBakery: true,
        acceptsEbt: true,
        acceptsWic: true,
      },
      inventoryApiAvailable: false,
      lastVerified: new Date(),
      dataSource: 'scrape' as const,
      active: true,
    },
  ];

  const report = validator.validateBatch(sampleStores);
  validator.printReport(report);
}

/**
 * Example 5: Monitor ingestion health
 */
async function exampleIngestionMonitoring() {
  console.log('\n=== Example 5: Ingestion Health Monitoring ===\n');

  const monitor = new IngestionMonitor();
  const health = await monitor.getHealthCheck();

  console.log(`Health Status: ${health.healthy ? '✅ Healthy' : '⚠️  Unhealthy'}`);
  console.log(`Last Successful Run: ${health.lastSuccessfulRun || 'Never'}`);
  console.log(`Days Since Last Run: ${health.daysSinceLastRun}`);
  console.log(`Recent Failures: ${health.recentFailures}`);

  if (health.alerts.length > 0) {
    console.log('\nAlerts:');
    health.alerts.forEach(alert => console.log(`  - ${alert}`));
  }
}

/**
 * Example 6: Generate monitoring report
 */
async function exampleGenerateReport() {
  console.log('\n=== Example 6: Generate Monitoring Report ===\n');

  const monitor = new IngestionMonitor();
  const report = await monitor.generateReport();

  console.log(report);
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    // Note: Most examples are for demonstration only
    // Actual database operations would require proper setup

    await exampleDryRun();
    await exampleDataQualityValidation();
    await exampleIngestionMonitoring();
    await exampleGenerateReport();

    console.log('\n✅ All examples completed\n');
  } catch (error) {
    console.error('Example failed:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  exampleIngestAllStates,
  exampleIngestSpecificStates,
  exampleDryRun,
  exampleDataQualityValidation,
  exampleIngestionMonitoring,
  exampleGenerateReport,
};
