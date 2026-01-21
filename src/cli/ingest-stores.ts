#!/usr/bin/env node
/**
 * Store Data Ingestion CLI Tool
 *
 * Usage:
 *   npm run ingest-stores                    # Ingest all states
 *   npm run ingest-stores -- --states=MI,NC  # Ingest specific states
 *   npm run ingest-stores -- --dry-run       # Test without writing to DB
 *   npm run ingest-stores -- --help          # Show help
 */

import { StoreIngestionPipeline } from '../services/store/StoreIngestionPipeline';
import { StateCode } from '../services/retailer/types/retailer.types';

interface CLIOptions {
  states?: StateCode[];
  dryRun: boolean;
  batchSize: number;
  help: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);

  const options: CLIOptions = {
    dryRun: false,
    batchSize: 50,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--states=')) {
      const statesStr = arg.split('=')[1];
      options.states = statesStr.split(',') as StateCode[];
    } else if (arg.startsWith('--batch-size=')) {
      options.batchSize = parseInt(arg.split('=')[1], 10);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Store Data Ingestion CLI Tool
==============================

Usage:
  npm run ingest-stores [options]

Options:
  --states=MI,NC,FL,OR    Specific states to ingest (default: all)
  --dry-run               Test run without writing to database
  --batch-size=N          Number of stores per batch (default: 50)
  --help, -h              Show this help message

Examples:
  # Ingest all priority states
  npm run ingest-stores

  # Ingest only Michigan and North Carolina
  npm run ingest-stores -- --states=MI,NC

  # Test ingestion without database writes
  npm run ingest-stores -- --dry-run

  # Use larger batch size for faster processing
  npm run ingest-stores -- --batch-size=100

States:
  MI  - Michigan
  NC  - North Carolina
  FL  - Florida
  OR  - Oregon
`);
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  console.log('='.repeat(60));
  console.log('WIC Benefits App - Store Data Ingestion');
  console.log('='.repeat(60));
  console.log();

  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No data will be written to database\n');
  }

  const pipeline = new StoreIngestionPipeline();

  try {
    const result = await pipeline.ingest({
      states: options.states,
      dryRun: options.dryRun,
      batchSize: options.batchSize,
    });

    if (result.totalErrors > 0) {
      console.log('\n⚠️  Ingestion completed with errors');
      process.exit(1);
    } else {
      console.log('\n✅ Ingestion completed successfully');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Ingestion failed:', error);
    process.exit(1);
  }
}

main();
