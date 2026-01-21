#!/usr/bin/env node
/**
 * Oregon APL Ingestion CLI
 *
 * Command-line tool to ingest Oregon WIC Approved Product List data
 *
 * Usage:
 *   npm run ingest:oregon
 *   npm run ingest:oregon -- --local
 *   npm run ingest:oregon -- --file path/to/oregon_apl.xlsx
 *
 * @module services/apl/cli/ingest-oregon
 */

import { Pool } from 'pg';
import { OregonAPLIngestionService } from '../oregon-ingestion.service';
import {
  createOregonAPLConfig,
  validateOregonAPLConfig,
  OREGON_APL_LOCAL_PATH,
} from '../config/oregon.config';

/**
 * Parse command line arguments
 */
function parseArgs(): {
  useLocal: boolean;
  filePath?: string;
  help: boolean;
} {
  const args = process.argv.slice(2);

  const config = {
    useLocal: false,
    filePath: undefined as string | undefined,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      config.help = true;
    } else if (arg === '--local' || arg === '-l') {
      config.useLocal = true;
    } else if (arg === '--file' || arg === '-f') {
      config.filePath = args[++i];
      config.useLocal = true;
    }
  }

  return config;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Oregon APL Ingestion Tool

Downloads and imports Oregon WIC Approved Product List into the database.

Usage:
  npm run ingest:oregon [options]

Options:
  --help, -h         Show this help message
  --local, -l        Use local file instead of downloading
  --file, -f PATH    Use specific file path (implies --local)

Environment Variables:
  DATABASE_URL       PostgreSQL connection string (required)
  OREGON_APL_URL     Override default download URL
  OREGON_APL_LOCAL_PATH  Override default local file path

Examples:
  # Download from Oregon WIC website and import
  npm run ingest:oregon

  # Use local file
  npm run ingest:oregon -- --local

  # Use specific file
  npm run ingest:oregon -- --file ./data/oregon_apl_2026.xlsx

  # Use environment variables
  DATABASE_URL=postgresql://localhost/wic_db npm run ingest:oregon
`);
}

/**
 * Main execution
 */
async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log('🌲 Oregon APL Ingestion Tool');
  console.log('================================\n');

  // Check for database URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL environment variable not set');
    console.error('   Set it to your PostgreSQL connection string:');
    console.error('   export DATABASE_URL=postgresql://user:pass@localhost/wic_db\n');
    process.exit(1);
  }

  // Create database pool
  const dbPool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    // Test database connection
    console.log('🔍 Testing database connection...');
    await dbPool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Create configuration
    const config = createOregonAPLConfig(dbPool, {
      useLocalFile: args.useLocal,
      localFilePath: args.filePath || OREGON_APL_LOCAL_PATH,
    });

    // Validate configuration
    validateOregonAPLConfig(config);

    // Log configuration
    console.log('📋 Configuration:');
    console.log(`   Mode: ${config.useLocalFile ? 'Local File' : 'Download'}`);
    if (config.useLocalFile) {
      console.log(`   File Path: ${config.localFilePath}`);
    } else {
      console.log(`   Download URL: ${config.downloadUrl}`);
    }
    console.log('');

    // Create and run ingestion service
    const service = new OregonAPLIngestionService(config);
    const stats = await service.ingest();

    // Print summary
    console.log('\n✅ Ingestion Complete!\n');
    console.log('Summary:');
    console.log(`   Total Rows Processed: ${stats.totalRows}`);
    console.log(`   Valid Entries: ${stats.validEntries}`);
    console.log(`   Invalid Entries: ${stats.invalidEntries}`);
    console.log(`   New Additions: ${stats.additions}`);
    console.log(`   Updates: ${stats.updates}`);
    console.log(`   Organic Products: ${stats.organicProducts}`);
    console.log(`   Local Products: ${stats.localProducts}`);
    console.log(`   Duration: ${stats.durationMs}ms`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${stats.errors.length}`);
      console.log('   Run with DEBUG=1 for details');
    }

    if (stats.warnings.length > 0) {
      console.log(`\n⚠️  Warnings: ${stats.warnings.length}`);
      console.log('   Run with DEBUG=1 for details');
    }

    console.log('\n🎉 Oregon APL data successfully imported!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ingestion Failed!\n');
    console.error('Error:', error.message);

    if (process.env.DEBUG) {
      console.error('\nStack Trace:');
      console.error(error.stack);
    }

    process.exit(1);
  } finally {
    await dbPool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main };
