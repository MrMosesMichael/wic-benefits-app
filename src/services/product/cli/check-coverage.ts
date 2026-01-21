#!/usr/bin/env node
/**
 * APL Coverage Check CLI Tool
 *
 * Analyzes product database coverage against APL UPCs and provides recommendations.
 *
 * Usage:
 *   npm run check-coverage                  # Show coverage report
 *   npm run check-coverage -- --json        # Output JSON format
 *   npm run check-coverage -- --markdown    # Output Markdown format
 *   npm run check-coverage -- --auto-sync   # Auto-sync to reach target
 *   npm run check-coverage -- --missing     # Show missing UPCs
 */

import { Pool } from 'pg';
import { ProductRepository } from '../../../database/ProductRepository';
import { APLCoverageService, createAPLCoverageService } from '../APLCoverageService';
import { ImageStorageService } from '../ImageStorageService';
import { getImageStorageConfig } from '../image-storage.config';
import { getDatabaseConfig } from '../../../database/config';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options: Record<string, any> = {
    format: 'text',
    autoSync: false,
    showMissing: false,
    missingLimit: 100,
    syncImages: false,
    batchSize: 100,
    concurrency: 5,
    maxUPCs: undefined,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--json':
        options.format = 'json';
        break;
      case '--markdown':
      case '--md':
        options.format = 'markdown';
        break;
      case '--auto-sync':
        options.autoSync = true;
        break;
      case '--missing':
        options.showMissing = true;
        break;
      case '--missing-limit':
        options.missingLimit = parseInt(args[++i]);
        break;
      case '--images':
        options.syncImages = true;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]);
        break;
      case '--concurrency':
        options.concurrency = parseInt(args[++i]);
        break;
      case '--max-upcs':
        options.maxUPCs = parseInt(args[++i]);
        break;
      case '--help':
        printHelp();
        process.exit(0);
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
APL Coverage Check Tool

Analyzes product database coverage against WIC APL UPCs.

Usage: npm run check-coverage [options]

Options:
  --json              Output report in JSON format
  --markdown, --md    Output report in Markdown format
  --auto-sync         Automatically sync missing UPCs to reach target
  --missing           Show list of missing UPCs
  --missing-limit <n> Limit missing UPCs list (default: 100)
  --images            Sync product images during auto-sync
  --batch-size <n>    Batch size for auto-sync (default: 100)
  --concurrency <n>   Concurrent requests for auto-sync (default: 5)
  --max-upcs <n>      Maximum UPCs to sync in auto-sync
  --help              Show this help message

Examples:
  npm run check-coverage                     # Show text report
  npm run check-coverage -- --json           # JSON output
  npm run check-coverage -- --markdown       # Markdown report
  npm run check-coverage -- --auto-sync      # Sync to reach 95%
  npm run check-coverage -- --missing        # Show missing UPCs
  npm run check-coverage -- --auto-sync --images --max-upcs 1000
`);
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();

  console.log('🔍 WIC APL Coverage Check');
  console.log('');

  // Initialize database connections
  const dbConfig = getDatabaseConfig();
  const pool = new Pool(dbConfig);
  const repository = new ProductRepository(dbConfig);

  try {
    // Create coverage service
    const coverageService = createAPLCoverageService(pool, repository, {
      targetCoverage: 95.0,
      priorityStates: ['MI', 'NC', 'FL', 'OR'],
      priorityCategories: ['formula', 'infant_formula'],
    });

    // Auto-sync mode
    if (options.autoSync) {
      console.log('🚀 Auto-sync mode enabled');
      console.log('');

      let imageService: ImageStorageService | undefined;
      if (options.syncImages) {
        const imageConfig = getImageStorageConfig();
        imageService = new ImageStorageService(imageConfig);
        console.log('🖼️  Image sync enabled');
      }

      const result = await coverageService.autoSyncToTarget({
        batchSize: options.batchSize,
        concurrency: options.concurrency,
        syncImages: options.syncImages,
        imageService,
        maxUPCs: options.maxUPCs,
      });

      if (result.status === 'already_at_target') {
        console.log('✓ Already at target coverage');
      } else {
        console.log('');
        console.log('✅ Auto-sync complete');
      }

      process.exit(0);
    }

    // Show missing UPCs
    if (options.showMissing) {
      console.log(`📋 Missing UPCs (first ${options.missingLimit}):`);
      console.log('');

      const missingUPCs = await coverageService.getMissingUPCs(options.missingLimit);

      if (missingUPCs.length === 0) {
        console.log('✓ No missing UPCs found!');
      } else {
        for (const upc of missingUPCs) {
          console.log(`  ${upc}`);
        }

        if (missingUPCs.length === options.missingLimit) {
          console.log('');
          console.log(`... (showing first ${options.missingLimit}, use --missing-limit to see more)`);
        }
      }

      console.log('');
      process.exit(0);
    }

    // Generate coverage report
    const report = await coverageService.generateReport(options.format);

    // Output report
    if (options.format === 'json') {
      console.log(report);
    } else {
      console.log(report);
    }

    // Check if meets target
    const analysis = await coverageService.analyzeCoverage();
    const exitCode = analysis.meetsTarget ? 0 : 1;

    process.exit(exitCode);
  } catch (error: any) {
    console.error('❌ Coverage check failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
    await repository.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
