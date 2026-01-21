/**
 * Product Image Sync Service
 *
 * Background worker that syncs product images from external sources to CDN
 *
 * Responsibilities:
 * - Fetch images from Open Food Facts and other sources
 * - Process and upload to S3/CDN
 * - Update product records with CDN URLs
 * - Handle missing images gracefully
 * - Monitor sync progress and errors
 *
 * Usage:
 * - Run as cron job: Daily sync for new products
 * - Run on-demand: When new products are added
 * - Run for specific products: When images are missing
 */

import { ProductRepository } from '../../src/database/ProductRepository';
import { ImageStorageService } from '../../src/services/product/ImageStorageService';
import { Product } from '../../src/types/product.types';

/**
 * Sync configuration
 */
export interface SyncConfig {
  /** Batch size for processing */
  batchSize: number;
  /** Concurrent uploads */
  concurrency: number;
  /** Skip products with existing images */
  skipExisting: boolean;
  /** Max retries per image */
  maxRetries: number;
  /** Delay between batches (ms) */
  batchDelay: number;
}

/**
 * Sync statistics
 */
export interface SyncStats {
  /** Total products processed */
  totalProcessed: number;
  /** Successfully synced images */
  successCount: number;
  /** Failed syncs */
  failureCount: number;
  /** Skipped (already have images) */
  skippedCount: number;
  /** Start time */
  startTime: Date;
  /** End time */
  endTime?: Date;
  /** Duration in seconds */
  duration?: number;
  /** Errors encountered */
  errors: Array<{ upc: string; error: string }>;
}

/**
 * Product Image Sync Service
 */
export class ProductImageSyncService {
  private repository: ProductRepository;
  private imageService: ImageStorageService;
  private config: SyncConfig;

  constructor(
    repository: ProductRepository,
    imageService: ImageStorageService,
    config?: Partial<SyncConfig>
  ) {
    this.repository = repository;
    this.imageService = imageService;
    this.config = {
      batchSize: 100,
      concurrency: 5,
      skipExisting: true,
      maxRetries: 3,
      batchDelay: 1000,
      ...config,
    };
  }

  /**
   * Sync all products with missing images
   *
   * @returns Sync statistics
   */
  async syncAll(): Promise<SyncStats> {
    console.log('Starting product image sync...');

    const stats: SyncStats = {
      totalProcessed: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      startTime: new Date(),
      errors: [],
    };

    try {
      // Get products with missing images
      const products = await this.getProductsWithoutImages();
      console.log(`Found ${products.length} products with missing images`);

      // Process in batches
      for (let i = 0; i < products.length; i += this.config.batchSize) {
        const batch = products.slice(i, i + this.config.batchSize);
        console.log(`Processing batch ${Math.floor(i / this.config.batchSize) + 1}...`);

        await this.processBatch(batch, stats);

        // Delay between batches to avoid rate limiting
        if (i + this.config.batchSize < products.length) {
          await this.delay(this.config.batchDelay);
        }
      }

      stats.endTime = new Date();
      stats.duration = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000;

      console.log('Sync complete:', {
        totalProcessed: stats.totalProcessed,
        successCount: stats.successCount,
        failureCount: stats.failureCount,
        skippedCount: stats.skippedCount,
        duration: stats.duration,
      });

      return stats;
    } catch (error) {
      console.error('Sync failed:', error);
      stats.endTime = new Date();
      throw error;
    }
  }

  /**
   * Sync images for specific products
   *
   * @param upcs Array of UPCs to sync
   * @returns Sync statistics
   */
  async syncProducts(upcs: string[]): Promise<SyncStats> {
    console.log(`Syncing images for ${upcs.length} products...`);

    const stats: SyncStats = {
      totalProcessed: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      startTime: new Date(),
      errors: [],
    };

    try {
      const products = await Promise.all(
        upcs.map(upc => this.repository.findByUpc(upc))
      );

      const validProducts = products.filter((p): p is Product => p !== null);

      await this.processBatch(validProducts, stats);

      stats.endTime = new Date();
      stats.duration = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000;

      return stats;
    } catch (error) {
      console.error('Sync failed:', error);
      stats.endTime = new Date();
      throw error;
    }
  }

  /**
   * Get products without images
   *
   * @returns Array of products
   */
  private async getProductsWithoutImages(): Promise<Product[]> {
    // Query products where imageUrl is null or empty
    // This is a simplified version - in production, use proper SQL query
    const allProducts = await this.repository.findAll({
      limit: 10000, // Adjust as needed
    });

    return allProducts.filter(p => !p.imageUrl || p.imageUrl === '');
  }

  /**
   * Process a batch of products
   *
   * @param products Products to process
   * @param stats Statistics object to update
   */
  private async processBatch(products: Product[], stats: SyncStats): Promise<void> {
    // Process with concurrency limit
    const chunks = this.chunkArray(products, this.config.concurrency);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(product => this.processProduct(product, stats))
      );
    }
  }

  /**
   * Process a single product
   *
   * @param product Product to process
   * @param stats Statistics object to update
   */
  private async processProduct(product: Product, stats: SyncStats): Promise<void> {
    stats.totalProcessed++;

    try {
      // Skip if already has image
      if (this.config.skipExisting && product.imageUrl) {
        stats.skippedCount++;
        return;
      }

      // Get image URL from product metadata
      const externalImageUrl = this.extractImageUrl(product);

      if (!externalImageUrl) {
        console.log(`No image URL found for product ${product.upc}`);
        stats.skippedCount++;
        return;
      }

      // Upload image with retry logic
      let lastError: Error | null = null;
      for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
        try {
          const result = await this.imageService.uploadFromUrl(
            externalImageUrl,
            product.upc
          );

          // Update product record
          await this.repository.update({
            ...product,
            imageUrl: result.fullUrl,
            thumbnailUrl: result.thumbnailUrl,
          });

          console.log(`✓ Synced image for ${product.upc}`);
          stats.successCount++;
          return;
        } catch (error) {
          lastError = error as Error;
          if (attempt < this.config.maxRetries - 1) {
            await this.delay(1000 * (attempt + 1)); // Exponential backoff
          }
        }
      }

      // All retries failed
      console.error(`✗ Failed to sync image for ${product.upc}:`, lastError?.message);
      stats.failureCount++;
      stats.errors.push({
        upc: product.upc,
        error: lastError?.message || 'Unknown error',
      });
    } catch (error) {
      console.error(`✗ Error processing product ${product.upc}:`, error);
      stats.failureCount++;
      stats.errors.push({
        upc: product.upc,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Extract image URL from product metadata
   *
   * @param product Product record
   * @returns Image URL or null
   */
  private extractImageUrl(product: Product): string | null {
    // Check imageUrl field
    if (product.imageUrl) {
      return product.imageUrl;
    }

    // Check metadata for Open Food Facts image
    if (product.metadata?.image_url) {
      return product.metadata.image_url;
    }

    // Check metadata for other sources
    if (product.metadata?.images?.front) {
      return product.metadata.images.front;
    }

    return null;
  }

  /**
   * Chunk array into smaller arrays
   *
   * @param array Input array
   * @param size Chunk size
   * @returns Array of chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Delay execution
   *
   * @param ms Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get sync statistics for monitoring
   *
   * @returns Current sync statistics
   */
  async getSyncStats(): Promise<{
    totalProducts: number;
    productsWithImages: number;
    productsWithoutImages: number;
    coveragePercentage: number;
  }> {
    const allProducts = await this.repository.findAll({ limit: 100000 });
    const totalProducts = allProducts.length;
    const productsWithImages = allProducts.filter(p => p.imageUrl).length;
    const productsWithoutImages = totalProducts - productsWithImages;
    const coveragePercentage = totalProducts > 0
      ? (productsWithImages / totalProducts) * 100
      : 0;

    return {
      totalProducts,
      productsWithImages,
      productsWithoutImages,
      coveragePercentage,
    };
  }
}
