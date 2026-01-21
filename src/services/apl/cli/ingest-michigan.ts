#!/usr/bin/env node
/**
 * CLI Tool for Michigan APL Ingestion
 *
 * Usage:
 *   npm run ingest:michigan -- --url <url>
 *   npm run ingest:michigan -- --file <path>
 *
 * Options:
 *   --url <url>       Download APL from URL
 *   --file <path>     Use local Excel file
 *   --db-uri <uri>    Database connection string
 *   --dry-run         Parse and validate without storing
 *   --verbose         Enable verbose logging
 *
 * @module services/apl/cli/ingest-michigan
 */

import { Pool } from 'pg';
import { MichiganAPLIngestionService } from '../michigan-ingestion.service';

interface CLIOptions {
  url?: string;
  file?: string;
  dbUri?: string;
  dryRun: boolean;
  verbose: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--url':
        options.url = args[++i];
        break;
      case '--file':
        options.file = args[++i];
        break;
      case '--db-uri':
        options.dbUri = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Michigan APL Ingestion Tool

Usage:
  npm run ingest:michigan -- [options]

Options:
  --url <url>       Download APL from Michigan DHHS website
  --file <path>     Use local Excel file for testing
  --db-uri <uri>    PostgreSQL connection string (default: from env)
  --dry-run         Parse and validate without storing in database
  --verbose, -v     Enable verbose logging
  --help, -h        Show this help message

Examples:
  # Download from official source
  npm run ingest:michigan -- --url https://www.michigan.gov/.../apl.xlsx

  # Use local file for testing
  npm run ingest:michigan -- --file ./test-data/michigan-apl.xlsx

  # Dry run (no database writes)
  npm run ingest:michigan -- --file ./michigan-apl.xlsx --dry-run

  # Custom database URI
  npm run ingest:michigan -- --url <url> --db-uri postgresql://user:pass@localhost/wic

Environment Variables:
  DATABASE_URL      PostgreSQL connection string (if --db-uri not provided)
  `);
}

/**
 * Validate options
 */
function validateOptions(options: CLIOptions): void {
  if (!options.url && !options.file) {
    console.error('❌ Error: Must provide either --url or --file');
    printHelp();
    process.exit(1);
  }

  if (options.url && options.file) {
    console.error('❌ Error: Cannot use both --url and --file');
    printHelp();
    process.exit(1);
  }

  if (!options.dryRun && !options.dbUri && !process.env.DATABASE_URL) {
    console.error('❌ Error: Database URI required (use --db-uri or set DATABASE_URL env var)');
    console.error('   Or use --dry-run to skip database storage');
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();
  validateOptions(options);

  console.log('🚀 Michigan APL Ingestion Tool\n');

  if (options.verbose) {
    console.log('Configuration:');
    console.log(`  Source: ${options.url ? 'Download' : 'Local File'}`);
    console.log(`  URL/Path: ${options.url || options.file}`);
    console.log(`  Dry Run: ${options.dryRun}`);
    console.log(`  Database: ${options.dryRun ? 'N/A' : (options.dbUri || process.env.DATABASE_URL)}`);
    console.log();
  }

  // Setup database pool (if not dry run)
  let dbPool: Pool | undefined;
  if (!options.dryRun) {
    const connectionString = options.dbUri || process.env.DATABASE_URL;
    dbPool = new Pool({ connectionString });

    // Test connection
    try {
      await dbPool.query('SELECT 1');
      console.log('✅ Database connection successful\n');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }
  }

  // Configure ingestion service
  const service = new MichiganAPLIngestionService({
    downloadUrl: options.url || '',
    localFilePath: options.file,
    useLocalFile: !!options.file,
    dbPool: dbPool,
  });

  try {
    // Run ingestion
    const stats = await service.ingest();

    // Print results
    console.log('\n✅ Ingestion completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Total Rows Processed: ${stats.totalRows}`);
    console.log(`   Valid Entries: ${stats.validEntries}`);
    console.log(`   Invalid Entries: ${stats.invalidEntries}`);

    if (!options.dryRun) {
      console.log(`   New Additions: ${stats.additions}`);
      console.log(`   Updates: ${stats.updates}`);
    }

    console.log(`   Duration: ${stats.durationMs}ms`);

    if (stats.errors.length > 0) {
      console.log(`\n❌ Errors encountered: ${stats.errors.length}`);
      if (options.verbose) {
        stats.errors.forEach(err => console.log(`   - ${err}`));
      } else {
        console.log('   Use --verbose to see full error list');
      }
    }

    if (stats.warnings.length > 0) {
      console.log(`\n⚠️  Warnings: ${stats.warnings.length}`);
      if (options.verbose) {
        stats.warnings.forEach(warn => console.log(`   - ${warn}`));
      } else {
        console.log('   Use --verbose to see full warning list');
      }
    }

    if (options.dryRun) {
      console.log('\n💡 Dry run mode - no data was written to database');
    }

    // Cleanup
    if (dbPool) {
      await dbPool.end();
    }

    process.exit(stats.errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Ingestion failed:', error.message);

    if (options.verbose) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    // Cleanup
    if (dbPool) {
      await dbPool.end();
    }

    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
