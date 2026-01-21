#!/usr/bin/env node
/**
 * Product Image Sync Script
 *
 * CLI tool to sync product images from external sources to CDN
 *
 * Usage:
 *   npm run sync-images              # Sync all products with missing images
 *   npm run sync-images -- --all     # Force sync all products
 *   npm run sync-images -- --upc 012345678901  # Sync specific product
 *   npm run sync-images -- --stats   # Show sync statistics
 */

import { ProductRepository } from '../../src/database/ProductRepository';
import { ImageStorageService } from '../../src/services/product/ImageStorageService';
import { ProductImageSyncService } from '../services/ProductImageSyncService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    all: false,
    stats: false,
    upc: null as string | null,
    batchSize: 100,
    concurrency: 5,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--all':
        options.all = true;
        break;
      case '--stats':
        options.stats = true;
        break;
      case '--upc':
        options.upc = args[++i];
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
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Product Image Sync Tool

Usage:
  sync-product-images [options]

Options:
  --all               Force sync all products (even if they have images)
  --stats             Show sync statistics and exit
  --upc <upc>         Sync specific product by UPC
  --batch-size <n>    Batch size for processing (default: 100)
  --concurrency <n>   Concurrent uploads (default: 5)
  --help              Show this help message

Examples:
  sync-product-images
  sync-product-images --all
  sync-product-images --upc 012345678901
  sync-product-images --stats
  sync-product-images --batch-size 50 --concurrency 3
`);
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();

  console.log('Initializing services...');

  // Initialize repository
  const repository = new ProductRepository({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'wic_benefits',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  // Initialize image storage service
  const imageService = new ImageStorageService({
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'wic-benefits-product-images',
    keyPrefix: 'product-images',
    cdnBaseUrl: process.env.CDN_BASE_URL,
    enableLocalFallback: process.env.NODE_ENV === 'development',
    localStoragePath: process.env.LOCAL_IMAGE_PATH || './storage/images',
    enableProxy: true,
    proxyCacheTtl: 7 * 24 * 60 * 60,
  });

  // Initialize sync service
  const syncService = new ProductImageSyncService(repository, imageService, {
    batchSize: options.batchSize,
    concurrency: options.concurrency,
    skipExisting: !options.all,
    maxRetries: 3,
    batchDelay: 1000,
  });

  try {
    // Show statistics
    if (options.stats) {
      console.log('Fetching sync statistics...\n');
      const stats = await syncService.getSyncStats();

      console.log('Product Image Coverage:');
      console.log('─'.repeat(50));
      console.log(`Total products:           ${stats.totalProducts.toLocaleString()}`);
      console.log(`Products with images:     ${stats.productsWithImages.toLocaleString()}`);
      console.log(`Products without images:  ${stats.productsWithoutImages.toLocaleString()}`);
      console.log(`Coverage:                 ${stats.coveragePercentage.toFixed(2)}%`);
      console.log('─'.repeat(50));
      return;
    }

    // Sync specific product
    if (options.upc) {
      console.log(`Syncing image for product ${options.upc}...\n`);
      const result = await syncService.syncProducts([options.upc]);

      console.log('\nSync Results:');
      console.log('─'.repeat(50));
      console.log(`Total processed:  ${result.totalProcessed}`);
      console.log(`Successful:       ${result.successCount}`);
      console.log(`Failed:           ${result.failureCount}`);
      console.log(`Skipped:          ${result.skippedCount}`);
      console.log(`Duration:         ${result.duration?.toFixed(2)}s`);

      if (result.errors.length > 0) {
        console.log('\nErrors:');
        result.errors.forEach(err => {
          console.log(`  - ${err.upc}: ${err.error}`);
        });
      }

      console.log('─'.repeat(50));
      return;
    }

    // Sync all products
    console.log(options.all
      ? 'Syncing images for all products (forced)...\n'
      : 'Syncing images for products with missing images...\n'
    );

    const result = await syncService.syncAll();

    console.log('\n' + '='.repeat(50));
    console.log('SYNC COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total processed:  ${result.totalProcessed}`);
    console.log(`Successful:       ${result.successCount}`);
    console.log(`Failed:           ${result.failureCount}`);
    console.log(`Skipped:          ${result.skippedCount}`);
    console.log(`Duration:         ${result.duration?.toFixed(2)}s`);

    if (result.errors.length > 0) {
      console.log(`\nErrors (${result.errors.length}):`);
      result.errors.slice(0, 10).forEach(err => {
        console.log(`  - ${err.upc}: ${err.error}`);
      });

      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more errors`);
      }
    }

    console.log('='.repeat(50));

    // Show updated statistics
    const finalStats = await syncService.getSyncStats();
    console.log(`\nFinal coverage: ${finalStats.coveragePercentage.toFixed(2)}%`);

  } catch (error) {
    console.error('\nSync failed:', error);
    process.exit(1);
  }
}

// Run main function
main()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
