/**
 * Oregon APL Example Usage
 *
 * Demonstrates how to use the Oregon APL ingestion service
 * and sync worker.
 *
 * @module examples/oregon-apl-example
 */

import { Pool } from 'pg';
import { OregonAPLIngestionService } from '../services/apl/oregon-ingestion.service';
import {
  createOregonAPLConfig,
  OREGON_POLICIES,
} from '../services/apl/config/oregon.config';
import {
  OregonAPLSyncWorker,
  startOregonSyncWorker,
} from '../services/apl/workers/oregon-sync-worker';

/**
 * Example 1: One-time manual ingestion
 */
async function exampleManualIngestion() {
  console.log('Example 1: Manual Oregon APL Ingestion\n');

  // Create database pool
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost/wic_db',
  });

  try {
    // Create configuration
    const config = createOregonAPLConfig(dbPool, {
      useLocalFile: false, // Download from Oregon WIC website
    });

    // Create and run ingestion service
    const service = new OregonAPLIngestionService(config);
    const stats = await service.ingest();

    // Display results
    console.log('Ingestion Results:');
    console.log(`  Total Rows: ${stats.totalRows}`);
    console.log(`  Valid Entries: ${stats.validEntries}`);
    console.log(`  Additions: ${stats.additions}`);
    console.log(`  Updates: ${stats.updates}`);
    console.log(`  Organic Products: ${stats.organicProducts}`);
    console.log(`  Local Products: ${stats.localProducts}`);
    console.log(`  Duration: ${stats.durationMs}ms`);

    if (stats.errors.length > 0) {
      console.log(`\n  Errors: ${stats.errors.length}`);
      stats.errors.slice(0, 5).forEach(err => console.log(`    - ${err}`));
    }
  } finally {
    await dbPool.end();
  }
}

/**
 * Example 2: Use local file for testing
 */
async function exampleLocalFileIngestion() {
  console.log('Example 2: Local File Ingestion\n');

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost/wic_db',
  });

  try {
    // Create configuration for local file
    const config = createOregonAPLConfig(dbPool, {
      useLocalFile: true,
      localFilePath: './data/apl/oregon/oregon_apl_test.xlsx',
    });

    // Run ingestion
    const service = new OregonAPLIngestionService(config);
    const stats = await service.ingest();

    console.log(`Processed ${stats.validEntries} entries from local file`);
  } finally {
    await dbPool.end();
  }
}

/**
 * Example 3: Start background sync worker
 */
async function exampleSyncWorker() {
  console.log('Example 3: Background Sync Worker\n');

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost/wic_db',
  });

  // Start worker with custom configuration
  const worker = await startOregonSyncWorker(dbPool, {
    checkIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
    maxConsecutiveFailures: 3,
    onSuccess: (stats) => {
      console.log(`✅ Sync successful: ${stats.additions} additions, ${stats.updates} updates`);

      // Send notification, log to monitoring system, etc.
      if (stats.additions > 0) {
        console.log(`   New products added to Oregon APL!`);
      }
    },
    onFailure: (error) => {
      console.error(`❌ Sync failed: ${error.message}`);

      // Send alert, log to error tracking, etc.
    },
    onStopped: (reason) => {
      console.log(`🛑 Worker stopped: ${reason}`);

      // Send alert about worker stopping
    },
  });

  console.log('Worker started. Running in background...');
  console.log('Press Ctrl+C to stop.');

  // Trigger an immediate sync
  await worker.triggerSync();

  // Keep process alive
  await new Promise(() => {});
}

/**
 * Example 4: Query Oregon-specific policies
 */
async function exampleOregonPolicies() {
  console.log('Example 4: Oregon-Specific Policies\n');

  console.log('Oregon WIC Policies:');
  console.log(`  Organic Preference: ${OREGON_POLICIES.organicPreference}`);
  console.log(`  Local Preference: ${OREGON_POLICIES.localPreference}`);
  console.log(`  Enhanced Produce Benefits: ${OREGON_POLICIES.enhancedProduceBenefits}`);

  // Example: Check if product meets Oregon organic requirements
  const productEntry = {
    state: 'OR',
    upc: '012345678901',
    additionalRestrictions: {
      organicRequired: true,
      localPreferred: true,
    },
  };

  console.log('\nProduct Requirements:');
  console.log(`  UPC: ${productEntry.upc}`);
  console.log(`  Organic Required: ${productEntry.additionalRestrictions.organicRequired}`);
  console.log(`  Local Preferred: ${productEntry.additionalRestrictions.localPreferred}`);
}

/**
 * Example 5: Error handling and retries
 */
async function exampleErrorHandling() {
  console.log('Example 5: Error Handling\n');

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost/wic_db',
  });

  try {
    const config = createOregonAPLConfig(dbPool, {
      downloadUrl: 'https://invalid-url.example.com/apl.xlsx', // Intentionally invalid
    });

    const service = new OregonAPLIngestionService(config);
    await service.ingest();
  } catch (error) {
    console.log('Caught expected error:');
    console.log(`  Message: ${error.message}`);
    console.log(`  Handling: Retry with exponential backoff`);

    // Example: Implement retry logic
    let retries = 0;
    const maxRetries = 3;
    const baseDelay = 1000;

    while (retries < maxRetries) {
      try {
        // Switch to local file fallback
        const fallbackConfig = createOregonAPLConfig(dbPool, {
          useLocalFile: true,
        });

        const service = new OregonAPLIngestionService(fallbackConfig);
        await service.ingest();
        console.log('✅ Fallback to local file successful');
        break;
      } catch (retryError) {
        retries++;
        const delay = baseDelay * Math.pow(2, retries);
        console.log(`  Retry ${retries}/${maxRetries} failed, waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  } finally {
    await dbPool.end();
  }
}

/**
 * Example 6: Integration with state detection
 */
async function exampleStateDetection() {
  console.log('Example 6: State Detection Integration\n');

  // Simulate user's location in Oregon
  const userLocation = {
    latitude: 45.5152,
    longitude: -122.6784,
    state: 'OR',
  };

  console.log(`User location: ${userLocation.state}`);
  console.log('Loading appropriate APL data...');

  // In real app, this would check which APL to use based on user's state
  if (userLocation.state === 'OR') {
    console.log('✅ Using Oregon APL (state-specific system)');
    console.log('   Features available:');
    console.log('   - Organic product filtering');
    console.log('   - Local product preferences');
    console.log('   - Enhanced produce benefits');
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('======================================');
  console.log('Oregon APL Usage Examples');
  console.log('======================================\n');

  try {
    // Run non-interactive examples
    await exampleOregonPolicies();
    console.log('\n--------------------------------------\n');

    await exampleStateDetection();
    console.log('\n--------------------------------------\n');

    // Uncomment to run interactive examples (require database)
    // await exampleManualIngestion();
    // await exampleLocalFileIngestion();
    // await exampleErrorHandling();
    // await exampleSyncWorker(); // Runs indefinitely

    console.log('Examples complete!');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runAllExamples();
}

export {
  exampleManualIngestion,
  exampleLocalFileIngestion,
  exampleSyncWorker,
  exampleOregonPolicies,
  exampleErrorHandling,
  exampleStateDetection,
};
