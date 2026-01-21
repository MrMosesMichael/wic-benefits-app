#!/usr/bin/env node
/**
 * CLI script to manually run North Carolina APL ingestion
 *
 * Usage:
 *   node ingest-north-carolina.ts
 *   node ingest-north-carolina.ts --local path/to/file.xlsx
 *   node ingest-north-carolina.ts --url https://example.com/apl.xlsx
 *
 * Environment variables:
 *   NORTH_CAROLINA_APL_DOWNLOAD_URL - URL to download APL file
 *   DATABASE_URL - PostgreSQL connection string
 *
 * @module services/apl/cli/ingest-north-carolina
 */

import { Pool } from 'pg';
import { ingestNorthCarolinaAPL, NorthCarolinaAPLIngestionService } from '../north-carolina-ingestion.service';
import { getNorthCarolinaAPLConfig, validateNorthCarolinaConfig } from '../config/north-carolina.config';

/**
 * Parse command line arguments
 */
function parseArgs(): { localFile?: string; url?: string; dryRun?: boolean } {
  const args = process.argv.slice(2);
  const options: { localFile?: string; url?: string; dryRun?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--local' && i + 1 < args.length) {
      options.localFile = args[i + 1];
      i++;
    } else if (arg === '--url' && i + 1 < args.length) {
      options.url = args[i + 1];
      i++;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
North Carolina APL Ingestion Tool

Usage:
  node ingest-north-carolina.ts [options]

Options:
  --local <path>    Use local file instead of downloading
  --url <url>       Download from specific URL
  --dry-run         Run without saving to database
  --help, -h        Show this help message

Environment Variables:
  NORTH_CAROLINA_APL_DOWNLOAD_URL    URL to download APL file
  DATABASE_URL                       PostgreSQL connection string

Examples:
  # Download from configured URL and save to database
  node ingest-north-carolina.ts

  # Use local file for testing
  node ingest-north-carolina.ts --local ./nc-apl.xlsx

  # Download from specific URL
  node ingest-north-carolina.ts --url https://example.com/nc-apl.xlsx

  # Dry run (no database changes)
  node ingest-north-carolina.ts --dry-run
`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🏛️  North Carolina APL Ingestion Tool\n');

  // Parse arguments
  const options = parseArgs();

  // Validate configuration
  const configValidation = validateNorthCarolinaConfig();
  if (!configValidation.valid && !options.localFile && !options.url) {
    console.error('❌ Configuration validation failed:');
    configValidation.errors.forEach(err => console.error(`   - ${err}`));
    console.error('\nRun with --help for usage information');
    process.exit(1);
  }

  // Create database pool (if not dry run)
  let dbPool: Pool | undefined;
  if (!options.dryRun) {
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL not set in environment');
      console.error('   Set DATABASE_URL or use --dry-run flag');
      process.exit(1);
    }

    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    console.log('✅ Connected to database');
  } else {
    console.log('ℹ️  DRY RUN MODE - No database changes will be made\n');
  }

  try {
    // Build configuration
    const config = getNorthCarolinaAPLConfig();
    const ingestionConfig = {
      downloadUrl: options.url || config.downloadUrl,
      localFilePath: options.localFile,
      useLocalFile: !!options.localFile,
      dbPool,
    };

    // Validate download URL
    if (!ingestionConfig.useLocalFile && !ingestionConfig.downloadUrl) {
      console.error('❌ No download URL configured');
      console.error('   Set NORTH_CAROLINA_APL_DOWNLOAD_URL environment variable');
      console.error('   Or use --url or --local flags');
      process.exit(1);
    }

    // Display configuration
    console.log('Configuration:');
    if (ingestionConfig.useLocalFile) {
      console.log(`   Source: Local file (${ingestionConfig.localFilePath})`);
    } else {
      console.log(`   Source: Download (${ingestionConfig.downloadUrl})`);
    }
    console.log(`   Database: ${options.dryRun ? 'Dry run (no changes)' : 'Connected'}`);
    console.log('');

    // Run ingestion
    const stats = await ingestNorthCarolinaAPL(ingestionConfig);

    // Display summary
    console.log('\n✅ Ingestion completed successfully!\n');
    console.log('Summary:');
    console.log(`   Total rows processed: ${stats.totalRows}`);
    console.log(`   Valid entries: ${stats.validEntries}`);
    console.log(`   Invalid entries: ${stats.invalidEntries}`);
    if (!options.dryRun) {
      console.log(`   New entries added: ${stats.additions}`);
      console.log(`   Existing entries updated: ${stats.updates}`);
    }
    console.log(`   Duration: ${stats.durationMs}ms`);

    if (stats.warnings.length > 0) {
      console.log(`\n⚠️  Warnings: ${stats.warnings.length}`);
      stats.warnings.slice(0, 5).forEach(warn => console.log(`   - ${warn}`));
      if (stats.warnings.length > 5) {
        console.log(`   ... and ${stats.warnings.length - 5} more`);
      }
    }

    if (stats.errors.length > 0) {
      console.log(`\n❌ Errors: ${stats.errors.length}`);
      stats.errors.slice(0, 5).forEach(err => console.log(`   - ${err}`));
      if (stats.errors.length > 5) {
        console.log(`   ... and ${stats.errors.length - 5} more`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ingestion failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (dbPool) {
      await dbPool.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

// Run main function
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { main };
