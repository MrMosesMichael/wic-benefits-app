#!/usr/bin/env node
/**
 * Florida APL Ingestion CLI
 *
 * Command-line tool to ingest Florida WIC APL data.
 *
 * Usage:
 *   npm run ingest:florida                    # Use default config (downloads from FL DOH)
 *   npm run ingest:florida -- --file path.xlsx   # Use local file
 *   npm run ingest:florida -- --url https://...  # Custom download URL
 *   npm run ingest:florida -- --no-db         # Skip database storage (dry run)
 *
 * @module services/apl/cli/ingest-florida
 */

import { FloridaAPLIngestionService, FloridaAPLConfig } from '../florida-ingestion.service';
import {
  defaultFloridaConfig,
  getFloridaProductionConfig,
  getFloridaTestConfig,
  FLORIDA_APL_URLS,
  isArtificialDyeBanActive,
  getCurrentFormulaContract,
  getFloridaSyncSchedule,
} from '../config/florida.config';
import { Pool } from 'pg';

/**
 * Parse command line arguments
 */
function parseArgs(): {
  useLocalFile: boolean;
  localFilePath?: string;
  downloadUrl?: string;
  skipDatabase: boolean;
} {
  const args = process.argv.slice(2);
  let useLocalFile = false;
  let localFilePath: string | undefined;
  let downloadUrl: string | undefined;
  let skipDatabase = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--file' || arg === '-f') {
      useLocalFile = true;
      localFilePath = args[i + 1];
      i++; // Skip next arg
    } else if (arg === '--url' || arg === '-u') {
      downloadUrl = args[i + 1];
      i++; // Skip next arg
    } else if (arg === '--no-db') {
      skipDatabase = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return { useLocalFile, localFilePath, downloadUrl, skipDatabase };
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Florida WIC APL Ingestion Tool

Usage:
  npm run ingest:florida [options]

Options:
  --file, -f <path>     Use local Excel/CSV file instead of downloading
  --url, -u <url>       Custom download URL
  --no-db               Skip database storage (dry run mode)
  --help, -h            Show this help message

Examples:
  # Download and ingest from Florida DOH website
  npm run ingest:florida

  # Use local Excel file for testing
  npm run ingest:florida -- --file ./test-data/florida-apl.xlsx

  # Dry run (parse only, don't store in database)
  npm run ingest:florida -- --file ./test-data/florida-apl.xlsx --no-db

Environment Variables:
  DATABASE_URL          PostgreSQL connection string
  FL_APL_URL            Override default APL download URL

Florida-Specific Notes:
  - Artificial dye ban in effect since Oct 2025
  - Products with artificial dyes will be automatically rejected
  - Formula contract change: Feb 1, 2026
  - During phased rollout (Oct 2025 - Mar 2026): Run daily
  - After rollout: Run weekly
`);
}

/**
 * Print Florida policy status
 */
function printPolicyStatus(): void {
  console.log('\n🏛️  Florida WIC Policy Status:');
  console.log(`   Artificial Dye Ban: ${isArtificialDyeBanActive() ? '✅ Active' : '❌ Not Active'}`);

  const formulaContract = getCurrentFormulaContract();
  console.log(`   Formula Contract: ${formulaContract.primaryBrand || 'Unknown'}`);
  console.log(`   Contract Period: ${formulaContract.startDate.toLocaleDateString()} - ${formulaContract.endDate?.toLocaleDateString() || 'Ongoing'}`);

  const syncSchedule = getFloridaSyncSchedule();
  console.log(`   Recommended Sync: ${syncSchedule === 'daily' ? '📅 Daily (phased rollout)' : '📅 Weekly (stable)'}`);
}

/**
 * Create database pool if needed
 */
function createDatabasePool(skipDatabase: boolean): Pool | undefined {
  if (skipDatabase) {
    console.log('⚠️  Database storage disabled (dry run mode)');
    return undefined;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('⚠️  DATABASE_URL not set - skipping database storage');
    return undefined;
  }

  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  console.log('🌴 Florida WIC APL Ingestion Tool\n');

  // Print Florida policy status
  printPolicyStatus();

  // Parse command line arguments
  const { useLocalFile, localFilePath, downloadUrl, skipDatabase } = parseArgs();

  // Validate arguments
  if (useLocalFile && !localFilePath) {
    console.error('❌ Error: --file requires a file path');
    process.exit(1);
  }

  // Create database pool
  const dbPool = createDatabasePool(skipDatabase);

  // Build configuration
  let config: FloridaAPLConfig;

  if (useLocalFile && localFilePath) {
    console.log(`📁 Using local file: ${localFilePath}`);
    config = getFloridaTestConfig(localFilePath);
    if (dbPool) config.dbPool = dbPool;
  } else {
    const url = downloadUrl || process.env.FL_APL_URL || defaultFloridaConfig.downloadUrl!;
    console.log(`🌐 Downloading from: ${url}`);
    config = {
      ...defaultFloridaConfig,
      downloadUrl: url,
      dbPool,
    } as FloridaAPLConfig;
  }

  // Run ingestion
  try {
    const service = new FloridaAPLIngestionService(config);
    const stats = await service.ingest();

    // Print summary
    console.log('\n✅ Ingestion completed successfully!');
    console.log('\n📈 Summary:');
    console.log(`   Duration: ${stats.durationMs}ms`);
    console.log(`   Total Rows Processed: ${stats.totalRows}`);
    console.log(`   Valid Entries: ${stats.validEntries}`);
    console.log(`   Database Additions: ${stats.additions}`);
    console.log(`   Database Updates: ${stats.updates}`);
    console.log(`   Invalid Entries: ${stats.invalidEntries}`);
    console.log(`   Rejected (Artificial Dyes): ${stats.rejectedArtificialDyes} 🚫`);
    console.log(`   Contract Formula Changes: ${stats.contractFormulaChanges} 🍼`);

    if (stats.errors.length > 0) {
      console.log(`\n❌ Errors: ${stats.errors.length}`);
      stats.errors.slice(0, 5).forEach(err => console.log(`   - ${err}`));
      if (stats.errors.length > 5) {
        console.log(`   ... and ${stats.errors.length - 5} more errors`);
      }
    }

    if (stats.warnings.length > 0) {
      console.log(`\n⚠️  Warnings: ${stats.warnings.length}`);
      stats.warnings.slice(0, 5).forEach(warn => console.log(`   - ${warn}`));
      if (stats.warnings.length > 5) {
        console.log(`   ... and ${stats.warnings.length - 5} more warnings`);
      }
    }

    // Next steps
    console.log('\n📋 Next Steps:');
    const syncSchedule = getFloridaSyncSchedule();
    if (syncSchedule === 'daily') {
      console.log('   ⏰ Schedule this script to run daily (phased rollout in progress)');
    } else {
      console.log('   ⏰ Schedule this script to run weekly');
    }
    console.log('   🔍 Verify data quality in database');
    console.log('   📱 Test Florida eligibility lookups in app');

    // Exit successfully
    if (dbPool) await dbPool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ingestion failed:');
    console.error(error);

    if (dbPool) await dbPool.end();
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
