/**
 * Product Database Sync Service
 *
 * Orchestrates product data synchronization from external sources to local database.
 * Implements batch processing, retry logic, and progress tracking.
 *
 * @module services/product/ProductSyncService
 */

import { EventEmitter } from 'events';
import { ProductRepository } from '../../database/ProductRepository';
import { OpenFoodFactsClient } from './OpenFoodFactsClient';
import { UPCDatabaseClient } from './UPCDatabaseClient';
import { ImageStorageService } from './ImageStorageService';
import { Product, ProductDataSource } from '../../types/product.types';

/**
 * Sync job status
 */
export type SyncJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

/**
 * Sync source type
 */
export type SyncSourceType = 'open_food_facts' | 'upc_database' | 'apl_upcs';

/**
 * Sync job configuration
 */
export interface SyncJobConfig {
  /** Database repository */
  repository: ProductRepository;

  /** Data sources to sync from */
  sources: SyncSourceType[];

  /** Batch size for processing */
  batchSize: number;

  /** Maximum concurrent requests */
  concurrency: number;

  /** Retry failed items */
  retryFailures: boolean;

  /** Maximum retry attempts per item */
  maxRetries: number;

  /** Delay between retries (ms) */
  retryDelayMs: number;

  /** Skip products that already exist */
  skipExisting: boolean;

  /** Sync product images */
  syncImages: boolean;

  /** Image storage service (required if syncImages = true) */
  imageService?: ImageStorageService;

  /** UPC Database API key (optional) */
  upcDatabaseApiKey?: string;

  /** Target UPCs to sync (if null, sync from APL database) */
  targetUPCs?: string[];

  /** Filter to specific categories */
  categories?: string[];

  /** Maximum products to sync (for testing) */
  limit?: number;
}

/**
 * Sync job result
 */
export interface SyncJobResult {
  jobId: string;
  status: SyncJobStatus;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  totalProducts: number;
  productsAdded: number;
  productsUpdated: number;
  productsSkipped: number;
  productsFailed: number;
  imagesProcessed: number;
  imagesFailed: number;
  errors: SyncError[];
  progress: number; // 0-100
}

/**
 * Sync error record
 */
export interface SyncError {
  upc: string;
  source: SyncSourceType;
  error: string;
  timestamp: Date;
  retries: number;
}

/**
 * Progress callback
 */
export type ProgressCallback = (result: SyncJobResult) => void;

/**
 * Product Database Sync Service
 *
 * Manages synchronization of product data from multiple sources:
 * 1. Open Food Facts (primary source)
 * 2. UPC Database (fallback)
 * 3. APL UPCs (ensures WIC products are covered)
 */
export class ProductSyncService extends EventEmitter {
  private config: SyncJobConfig;
  private offClient: OpenFoodFactsClient;
  private upcClient?: UPCDatabaseClient;
  private currentJob?: SyncJobResult;
  private isPaused = false;
  private isCancelled = false;

  constructor(config: SyncJobConfig) {
    super();
    this.config = config;

    // Initialize clients
    this.offClient = new OpenFoodFactsClient();

    if (config.upcDatabaseApiKey) {
      this.upcClient = new UPCDatabaseClient(config.upcDatabaseApiKey);
    }
  }

  /**
   * Start sync job
   *
   * @param progressCallback - Optional callback for progress updates
   * @returns Sync job result
   */
  async sync(progressCallback?: ProgressCallback): Promise<SyncJobResult> {
    const jobId = this.generateJobId();

    this.currentJob = {
      jobId,
      status: 'pending',
      startTime: new Date(),
      totalProducts: 0,
      productsAdded: 0,
      productsUpdated: 0,
      productsSkipped: 0,
      productsFailed: 0,
      imagesProcessed: 0,
      imagesFailed: 0,
      errors: [],
      progress: 0,
    };

    this.isPaused = false;
    this.isCancelled = false;

    this.emit('jobStart', this.currentJob);
    console.log(`🚀 Starting product sync job ${jobId}...`);

    try {
      // Step 1: Get UPCs to sync
      const upcs = await this.getTargetUPCs();
      this.currentJob.totalProducts = upcs.length;

      console.log(`📋 Found ${upcs.length} products to sync`);
      console.log(`   Sources: ${this.config.sources.join(', ')}`);
      console.log(`   Batch size: ${this.config.batchSize}`);
      console.log(`   Concurrency: ${this.config.concurrency}`);

      this.currentJob.status = 'running';

      // Step 2: Process UPCs in batches
      await this.processBatches(upcs, progressCallback);

      // Step 3: Complete job
      this.currentJob.status = this.isCancelled ? 'cancelled' : 'completed';
      this.currentJob.endTime = new Date();
      this.currentJob.durationMs =
        this.currentJob.endTime.getTime() - this.currentJob.startTime.getTime();
      this.currentJob.progress = 100;

      console.log('✅ Product sync job complete');
      console.log(`   Added: ${this.currentJob.productsAdded}`);
      console.log(`   Updated: ${this.currentJob.productsUpdated}`);
      console.log(`   Skipped: ${this.currentJob.productsSkipped}`);
      console.log(`   Failed: ${this.currentJob.productsFailed}`);
      console.log(
        `   Duration: ${(this.currentJob.durationMs / 1000).toFixed(1)}s`
      );

      this.emit('jobComplete', this.currentJob);

      return this.currentJob;
    } catch (error: any) {
      console.error('❌ Product sync job failed:', error.message);

      this.currentJob.status = 'failed';
      this.currentJob.endTime = new Date();
      this.currentJob.durationMs =
        this.currentJob.endTime.getTime() - this.currentJob.startTime.getTime();

      this.emit('jobFailed', this.currentJob);

      return this.currentJob;
    }
  }

  /**
   * Pause current sync job
   */
  pause(): void {
    if (this.currentJob?.status === 'running') {
      this.isPaused = true;
      this.currentJob.status = 'paused';
      console.log('⏸️  Sync job paused');
      this.emit('jobPaused', this.currentJob);
    }
  }

  /**
   * Resume paused sync job
   */
  resume(): void {
    if (this.currentJob?.status === 'paused') {
      this.isPaused = false;
      this.currentJob.status = 'running';
      console.log('▶️  Sync job resumed');
      this.emit('jobResumed', this.currentJob);
    }
  }

  /**
   * Cancel current sync job
   */
  cancel(): void {
    if (this.currentJob && this.currentJob.status !== 'completed') {
      this.isCancelled = true;
      this.currentJob.status = 'cancelled';
      console.log('🛑 Sync job cancelled');
      this.emit('jobCancelled', this.currentJob);
    }
  }

  /**
   * Get current job status
   */
  getStatus(): SyncJobResult | null {
    return this.currentJob || null;
  }

  /**
   * Get target UPCs to sync
   */
  private async getTargetUPCs(): Promise<string[]> {
    // If specific UPCs provided, use those
    if (this.config.targetUPCs && this.config.targetUPCs.length > 0) {
      return this.config.targetUPCs.slice(0, this.config.limit);
    }

    // Otherwise, get UPCs from APL database
    const upcs = await this.getAPLUPCs();

    // Apply limit if specified
    return this.config.limit ? upcs.slice(0, this.config.limit) : upcs;
  }

  /**
   * Get UPCs from APL database
   */
  private async getAPLUPCs(): Promise<string[]> {
    // TODO: Query APL database for all UPCs
    // For now, return placeholder
    // In production, this should query the apl_entries table
    console.log('ℹ️  Getting UPCs from APL database...');

    // Placeholder implementation
    // In real implementation, query: SELECT DISTINCT upc FROM apl_entries
    return [];
  }

  /**
   * Process UPCs in batches
   */
  private async processBatches(
    upcs: string[],
    progressCallback?: ProgressCallback
  ): Promise<void> {
    const batches = this.createBatches(upcs, this.config.batchSize);

    for (let i = 0; i < batches.length; i++) {
      // Check for pause/cancel
      while (this.isPaused && !this.isCancelled) {
        await this.delay(1000);
      }

      if (this.isCancelled) {
        console.log('🛑 Batch processing cancelled');
        break;
      }

      const batch = batches[i];
      console.log(
        `📦 Processing batch ${i + 1}/${batches.length} (${batch.length} products)...`
      );

      await this.processBatch(batch);

      // Update progress
      if (this.currentJob) {
        const processed =
          this.currentJob.productsAdded +
          this.currentJob.productsUpdated +
          this.currentJob.productsSkipped +
          this.currentJob.productsFailed;

        this.currentJob.progress = Math.min(
          100,
          Math.floor((processed / this.currentJob.totalProducts) * 100)
        );

        if (progressCallback) {
          progressCallback(this.currentJob);
        }

        this.emit('progress', this.currentJob);
      }
    }
  }

  /**
   * Process a single batch of UPCs
   */
  private async processBatch(upcs: string[]): Promise<void> {
    // Process with concurrency limit
    const chunks = this.createBatches(upcs, this.config.concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(upc => this.processUPC(upc));
      await Promise.all(promises);
    }
  }

  /**
   * Process a single UPC
   */
  private async processUPC(upc: string): Promise<void> {
    try {
      // Check if product already exists
      if (this.config.skipExisting) {
        const existing = await this.config.repository.getProductByUPC(upc);
        if (existing) {
          this.currentJob!.productsSkipped++;
          return;
        }
      }

      // Try each source in order
      let product: Product | null = null;

      for (const source of this.config.sources) {
        product = await this.fetchFromSource(upc, source);
        if (product) {
          break;
        }
      }

      if (!product) {
        // No product found in any source
        this.currentJob!.productsSkipped++;
        return;
      }

      // Sync images if configured
      if (this.config.syncImages && this.config.imageService && product.imageUrl) {
        try {
          const imageResult = await this.config.imageService.uploadFromUrl(
            product.imageUrl,
            product.upc
          );

          product.imageUrl = imageResult.fullUrl;
          product.thumbnailUrl = imageResult.thumbnailUrl;
          this.currentJob!.imagesProcessed++;
        } catch (error: any) {
          console.warn(`⚠️  Image sync failed for ${upc}:`, error.message);
          this.currentJob!.imagesFailed++;
          // Continue without images
        }
      }

      // Save to database
      const existing = await this.config.repository.getProductByUPC(upc);
      await this.config.repository.upsertProduct(product);

      if (existing) {
        this.currentJob!.productsUpdated++;
      } else {
        this.currentJob!.productsAdded++;
      }
    } catch (error: any) {
      console.error(`❌ Failed to process ${upc}:`, error.message);
      this.currentJob!.productsFailed++;
      this.currentJob!.errors.push({
        upc,
        source: this.config.sources[0],
        error: error.message,
        timestamp: new Date(),
        retries: 0,
      });

      // Retry if configured
      if (this.config.retryFailures) {
        await this.retryUPC(upc);
      }
    }
  }

  /**
   * Fetch product from specific source
   */
  private async fetchFromSource(
    upc: string,
    source: SyncSourceType
  ): Promise<Product | null> {
    switch (source) {
      case 'open_food_facts':
        return await this.offClient.getProduct(upc);

      case 'upc_database':
        if (!this.upcClient) {
          return null;
        }
        return await this.upcClient.getProduct(upc);

      default:
        return null;
    }
  }

  /**
   * Retry failed UPC
   */
  private async retryUPC(upc: string): Promise<void> {
    const error = this.currentJob!.errors.find(e => e.upc === upc);
    if (!error) return;

    if (error.retries >= this.config.maxRetries) {
      return;
    }

    await this.delay(this.config.retryDelayMs);

    try {
      error.retries++;
      await this.processUPC(upc);

      // Remove error if successful
      const index = this.currentJob!.errors.findIndex(e => e.upc === upc);
      if (index >= 0) {
        this.currentJob!.errors.splice(index, 1);
      }
    } catch (retryError: any) {
      console.warn(`⚠️  Retry ${error.retries} failed for ${upc}`);
    }
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create sync service with default config
 */
export function createProductSyncService(
  repository: ProductRepository,
  options: Partial<SyncJobConfig> = {}
): ProductSyncService {
  const config: SyncJobConfig = {
    repository,
    sources: ['open_food_facts', 'upc_database'],
    batchSize: 100,
    concurrency: 5,
    retryFailures: true,
    maxRetries: 3,
    retryDelayMs: 2000,
    skipExisting: true,
    syncImages: false,
    ...options,
  };

  return new ProductSyncService(config);
}
