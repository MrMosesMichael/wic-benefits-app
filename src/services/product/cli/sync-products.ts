#!/usr/bin/env node
/**
 * Product Sync CLI Tool
 *
 * Command-line interface for running product database sync jobs.
 *
 * Usage:
 *   npm run sync-products                    # Incremental sync
 *   npm run sync-products -- --full          # Full sync
 *   npm run sync-products -- --upcs UPC1,UPC2  # Sync specific UPCs
 *   npm run sync-products -- --limit 100     # Sync first 100 products
 *   npm run sync-products -- --images        # Sync with images
 *   npm run sync-products -- --stats         # Show statistics only
 */

import { ProductRepository } from '../../../database/ProductRepository';
import { ProductSyncService, createProductSyncService } from '../ProductSyncService';
import { ImageStorageService } from '../ImageStorageService';
import { getImageStorageConfig } from '../image-storage.config';
import { getDatabaseConfig } from '../../../database/config';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options: Record<string, any> = {
    full: false,
    images: false,
    stats: false,
    limit: undefined,
    upcs: undefined,
    batchSize: 100,
    concurrency: 5,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--full':
        options.full = true;
        break;
      case '--images':
        options.images = true;
        break;
      case '--stats':
        options.stats = true;
        break;
      case '--limit':
        options.limit = parseInt(args[++i]);
        break;
      case '--upcs':
        options.upcs = args[++i].split(',');
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]);
        break;
      case '--concurrency':
        options.concurrency = parseInt(args[++i]);
        break;
      case '--help':
        printHelp();
        process.exit(0);
      default:
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Product Database Sync Tool

Usage: npm run sync-products [options]

Options:
  --full              Run full sync (don't skip existing products)
  --images            Sync product images to CDN
  --stats             Show statistics only (no sync)
  --limit <n>         Limit sync to first N products
  --upcs <upcs>       Sync specific UPCs (comma-separated)
  --batch-size <n>    Batch size for processing (default: 100)
  --concurrency <n>   Concurrent requests (default: 5)
  --help              Show this help message

Examples:
  npm run sync-products                      # Incremental sync
  npm run sync-products -- --full            # Full sync all products
  npm run sync-products -- --upcs 012345678901,098765432109
  npm run sync-products -- --limit 100 --images
  npm run sync-products -- --stats           # Show stats only
`);
}

/**
 * Show coverage statistics
 */
async function showStats(repository: ProductRepository) {
  console.log('📊 Product Database Statistics');
  console.log('==============================');

  const stats = await repository.getCoverageStats();

  console.log(`Total Products: ${stats.totalProducts.toLocaleString()}`);
  console.log(`With Images: ${stats.productsWithImages.toLocaleString()} (${((stats.productsWithImages / stats.totalProducts) * 100).toFixed(1)}%)`);
  console.log(`With Nutrition: ${stats.productsWithNutrition.toLocaleString()} (${((stats.productsWithNutrition / stats.totalProducts) * 100).toFixed(1)}%)`);
  console.log(`Verified: ${stats.verifiedProducts.toLocaleString()} (${((stats.verifiedProducts / stats.totalProducts) * 100).toFixed(1)}%)`);
  console.log('');
  console.log('Coverage by Source:');
  for (const [source, count] of Object.entries(stats.coverageBySource)) {
    console.log(`  ${source}: ${count.toLocaleString()}`);
  }
  console.log('');
  console.log('Top Categories:');
  const sortedCategories = Object.entries(stats.coverageByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  for (const [category, count] of sortedCategories) {
    console.log(`  ${category}: ${count.toLocaleString()}`);
  }
  console.log('');
  console.log(`Last Updated: ${stats.lastUpdated.toLocaleString()}`);
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();

  console.log('🚀 Product Database Sync Tool');
  console.log('');

  // Initialize database
  const dbConfig = getDatabaseConfig();
  const repository = new ProductRepository(dbConfig);

  try {
    // Show stats only
    if (options.stats) {
      await showStats(repository);
      process.exit(0);
    }

    // Initialize image service if needed
    let imageService: ImageStorageService | undefined;
    if (options.images) {
      const imageConfig = getImageStorageConfig();
      imageService = new ImageStorageService(imageConfig);
      console.log('🖼️  Image sync enabled');
    }

    // Create sync service
    const syncService = createProductSyncService(repository, {
      sources: ['open_food_facts', 'upc_database'],
      batchSize: options.batchSize,
      concurrency: options.concurrency,
      skipExisting: !options.full,
      syncImages: options.images,
      imageService,
      targetUPCs: options.upcs,
      limit: options.limit,
    });

    // Log configuration
    console.log('Configuration:');
    console.log(`  Mode: ${options.full ? 'Full sync' : 'Incremental sync'}`);
    console.log(`  Batch size: ${options.batchSize}`);
    console.log(`  Concurrency: ${options.concurrency}`);
    if (options.limit) {
      console.log(`  Limit: ${options.limit} products`);
    }
    if (options.upcs) {
      console.log(`  Target UPCs: ${options.upcs.length} specific UPCs`);
    }
    console.log('');

    // Run sync with progress updates
    const result = await syncService.sync((progress) => {
      if (progress.progress % 10 === 0 || progress.progress === 100) {
        console.log(`  Progress: ${progress.progress}% (${progress.productsAdded + progress.productsUpdated} products processed)`);
      }
    });

    // Show results
    console.log('');
    console.log('📈 Sync Results:');
    console.log(`  Status: ${result.status}`);
    console.log(`  Duration: ${((result.durationMs || 0) / 1000).toFixed(1)}s`);
    console.log(`  Products Added: ${result.productsAdded}`);
    console.log(`  Products Updated: ${result.productsUpdated}`);
    console.log(`  Products Skipped: ${result.productsSkipped}`);
    console.log(`  Products Failed: ${result.productsFailed}`);
    if (options.images) {
      console.log(`  Images Processed: ${result.imagesProcessed}`);
      console.log(`  Images Failed: ${result.imagesFailed}`);
    }

    if (result.errors.length > 0) {
      console.log('');
      console.log('❌ Errors:');
      for (const error of result.errors.slice(0, 10)) {
        console.log(`  ${error.upc}: ${error.error}`);
      }
      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more`);
      }
    }

    console.log('');
    console.log('✅ Sync complete');

    process.exit(result.status === 'completed' ? 0 : 1);
  } catch (error: any) {
    console.error('❌ Sync failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await repository.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
