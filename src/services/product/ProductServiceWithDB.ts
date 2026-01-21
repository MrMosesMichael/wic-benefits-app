/**
 * Product Service with Database Integration
 *
 * Enhanced product service that integrates database persistence
 * with external API sources (Open Food Facts, UPC Database).
 *
 * Data flow:
 * 1. Check memory cache
 * 2. Check database
 * 3. Fetch from Open Food Facts
 * 4. Fetch from UPC Database (fallback)
 * 5. Save to database and cache
 *
 * This service bridges the gap between external APIs and local storage.
 */

import { Product, ProductLookupResult, ProductQueryParams } from '../../types/product.types';
import { ProductRepository } from '../../database/ProductRepository';
import { OpenFoodFactsClient } from './OpenFoodFactsClient';
import { UPCDatabaseClient } from './UPCDatabaseClient';

/**
 * Service configuration
 */
interface ProductServiceConfig {
  /** UPC Database API key (optional) */
  upcDatabaseApiKey?: string;

  /** Enable memory cache */
  enableCache: boolean;

  /** Cache TTL in milliseconds */
  cacheTtl: number;

  /** Request timeout in milliseconds */
  timeout: number;

  /** Enable retry on failure */
  enableRetry: boolean;

  /** Maximum retry attempts */
  maxRetries: number;

  /** Auto-save to database */
  autoSaveToDb: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ProductServiceConfig = {
  enableCache: true,
  cacheTtl: 30 * 24 * 60 * 60 * 1000, // 30 days
  timeout: 5000,
  enableRetry: true,
  maxRetries: 2,
  autoSaveToDb: true,
};

/**
 * Cache entry
 */
interface CacheEntry {
  product: Product | null;
  timestamp: number;
}

/**
 * Enhanced Product Service with Database
 *
 * Provides product lookup with multi-layer caching:
 * - Memory cache (fastest)
 * - Database cache (persistent)
 * - External APIs (fallback)
 */
export class ProductServiceWithDB {
  private config: ProductServiceConfig;
  private repository: ProductRepository;
  private openFoodFactsClient: OpenFoodFactsClient;
  private upcDatabaseClient?: UPCDatabaseClient;
  private cache: Map<string, CacheEntry>;

  constructor(repository: ProductRepository, config?: Partial<ProductServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.repository = repository;

    // Initialize API clients
    this.openFoodFactsClient = new OpenFoodFactsClient({
      timeout: this.config.timeout,
    });

    if (this.config.upcDatabaseApiKey) {
      this.upcDatabaseClient = new UPCDatabaseClient(
        this.config.upcDatabaseApiKey,
        { timeout: this.config.timeout }
      );
    }

    // Initialize memory cache
    this.cache = new Map();
  }

  /**
   * Lookup product by UPC
   *
   * Priority order:
   * 1. Memory cache (if enabled and fresh)
   * 2. Database
   * 3. Open Food Facts
   * 4. UPC Database (if API key provided)
   *
   * @param upc - Universal Product Code
   * @returns ProductLookupResult with product info if found
   */
  async lookupProduct(upc: string): Promise<ProductLookupResult> {
    const startTime = Date.now();

    // 1. Check memory cache
    if (this.config.enableCache) {
      const cached = this.getFromCache(upc);
      if (cached !== undefined) {
        return {
          upc,
          found: cached !== null,
          product: cached || undefined,
          dataSource: cached?.dataSource,
          cached: true,
          responseTime: Date.now() - startTime,
          confidence: cached ? 90 : 100,
        };
      }
    }

    // 2. Check database
    try {
      const dbProduct = await this.repository.getProductByUPC(upc);
      if (dbProduct) {
        this.addToCache(upc, dbProduct);
        return {
          upc,
          found: true,
          product: dbProduct,
          dataSource: dbProduct.dataSource,
          cached: false,
          responseTime: Date.now() - startTime,
          confidence: 85, // Database is authoritative
        };
      }
    } catch (error) {
      console.warn(`Database lookup failed for UPC ${upc}:`, error);
      // Continue to API fallback
    }

    // 3. Try Open Food Facts
    try {
      const offProduct = await this.fetchWithRetry(() =>
        this.openFoodFactsClient.getProduct(upc)
      );

      if (offProduct) {
        // Save to database if auto-save enabled
        if (this.config.autoSaveToDb) {
          await this.saveProductToDatabase(offProduct);
        }

        this.addToCache(upc, offProduct);

        return {
          upc,
          found: true,
          product: offProduct,
          dataSource: 'open_food_facts',
          cached: false,
          responseTime: Date.now() - startTime,
          confidence: 85,
        };
      }
    } catch (error) {
      console.warn(`Open Food Facts lookup failed for UPC ${upc}:`, error);
      // Continue to next fallback
    }

    // 4. Try UPC Database if available
    if (this.upcDatabaseClient) {
      try {
        const upcDbProduct = await this.fetchWithRetry(() =>
          this.upcDatabaseClient!.getProduct(upc)
        );

        if (upcDbProduct) {
          // Save to database if auto-save enabled
          if (this.config.autoSaveToDb) {
            await this.saveProductToDatabase(upcDbProduct);
          }

          this.addToCache(upc, upcDbProduct);

          return {
            upc,
            found: true,
            product: upcDbProduct,
            dataSource: 'upc_database',
            cached: false,
            responseTime: Date.now() - startTime,
            confidence: 75,
          };
        }
      } catch (error) {
        console.warn(`UPC Database lookup failed for UPC ${upc}:`, error);
      }
    }

    // Product not found in any source
    this.addToCache(upc, null);

    return {
      upc,
      found: false,
      cached: false,
      responseTime: Date.now() - startTime,
      confidence: 100, // High confidence that product doesn't exist
    };
  }

  /**
   * Batch lookup multiple products by UPCs
   *
   * More efficient than individual lookups.
   * Checks database first, then fetches missing from APIs.
   *
   * @param upcs - Array of UPCs to lookup
   * @returns Array of ProductLookupResults
   */
  async lookupProducts(upcs: string[]): Promise<ProductLookupResult[]> {
    if (upcs.length === 0) {
      return [];
    }

    const results: ProductLookupResult[] = [];
    const missingUpcs: string[] = [];

    // 1. Check memory cache and database
    const dbProducts = await this.repository.getProductsByUPCs(upcs);

    for (const upc of upcs) {
      // Check memory cache first
      const cached = this.getFromCache(upc);
      if (cached !== undefined) {
        results.push({
          upc,
          found: cached !== null,
          product: cached || undefined,
          dataSource: cached?.dataSource,
          cached: true,
          confidence: cached ? 90 : 100,
        });
        continue;
      }

      // Check database
      const dbProduct = dbProducts.get(upc);
      if (dbProduct) {
        this.addToCache(upc, dbProduct);
        results.push({
          upc,
          found: true,
          product: dbProduct,
          dataSource: dbProduct.dataSource,
          cached: false,
          confidence: 85,
        });
        continue;
      }

      // Not found in cache or DB
      missingUpcs.push(upc);
    }

    // 2. Fetch missing products from APIs
    if (missingUpcs.length > 0) {
      // Note: Batch API calls not supported by current clients
      // Fall back to individual lookups
      const apiResults = await Promise.all(
        missingUpcs.map(upc => this.lookupProduct(upc))
      );
      results.push(...apiResults);
    }

    return results;
  }

  /**
   * Search products by query parameters
   *
   * Searches database first, then external APIs if needed.
   *
   * @param params - Search parameters
   * @returns Array of matching products
   */
  async searchProducts(params: ProductQueryParams): Promise<Product[]> {
    // Search database first
    try {
      const dbResults = await this.repository.searchProducts(params);

      // If we have enough results, return them
      const limit = params.limit || 20;
      if (dbResults.length >= limit) {
        return dbResults;
      }

      // Otherwise, supplement with API results
      const apiResults = await this.searchAPIs(params);

      // Merge and deduplicate
      const allResults = [...dbResults, ...apiResults];
      return this.deduplicateProducts(allResults).slice(0, limit);
    } catch (error) {
      console.error('Database search failed:', error);
      // Fall back to API-only search
      return this.searchAPIs(params);
    }
  }

  /**
   * Get product coverage statistics
   *
   * @returns Coverage stats from database
   */
  async getCoverageStats() {
    try {
      return await this.repository.getCoverageStats();
    } catch (error) {
      console.error('Failed to get coverage stats:', error);
      return {
        totalProducts: this.cache.size,
        productsWithImages: 0,
        productsWithNutrition: 0,
        verifiedProducts: 0,
        coverageBySource: {},
        coverageByCategory: {},
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Report unknown product
   *
   * @param upc - UPC not found
   * @param reportedBy - User ID
   * @param userProvidedInfo - Optional product info
   * @returns Report ID
   */
  async reportUnknownProduct(
    upc: string,
    reportedBy: string,
    userProvidedInfo?: Partial<Product>
  ): Promise<string> {
    return await this.repository.reportUnknownProduct(upc, reportedBy, userProvidedInfo);
  }

  /**
   * Clear memory cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Save product to database
   *
   * @param product - Product to save
   */
  private async saveProductToDatabase(product: Product): Promise<void> {
    try {
      await this.repository.upsertProduct(product);
    } catch (error) {
      console.error(`Failed to save product ${product.upc} to database:`, error);
      // Don't throw - allow lookup to succeed even if save fails
    }
  }

  /**
   * Search external APIs
   *
   * @param params - Search parameters
   * @returns Array of products from APIs
   */
  private async searchAPIs(params: ProductQueryParams): Promise<Product[]> {
    const { search, page = 1, limit = 20 } = params;

    if (!search) {
      return [];
    }

    const results: Product[] = [];

    // Search Open Food Facts
    try {
      const offProducts = await this.openFoodFactsClient.searchProducts(search, page, limit);
      results.push(...offProducts);

      // Save to database
      if (this.config.autoSaveToDb) {
        await this.repository.upsertProductsBatch(offProducts);
      }
    } catch (error) {
      console.warn('Open Food Facts search failed:', error);
    }

    // Search UPC Database if available
    if (this.upcDatabaseClient) {
      try {
        const offset = (page - 1) * limit;
        const upcProducts = await this.upcDatabaseClient.searchProducts(search, offset, limit);
        results.push(...upcProducts);

        // Save to database
        if (this.config.autoSaveToDb) {
          await this.repository.upsertProductsBatch(upcProducts);
        }
      } catch (error) {
        console.warn('UPC Database search failed:', error);
      }
    }

    return this.deduplicateProducts(results);
  }

  /**
   * Get product from memory cache
   *
   * @param upc - UPC to lookup
   * @returns Product if in cache and fresh, undefined if not in cache or stale
   */
  private getFromCache(upc: string): Product | null | undefined {
    if (!this.config.enableCache) {
      return undefined;
    }

    const entry = this.cache.get(upc);

    if (!entry) {
      return undefined;
    }

    const age = Date.now() - entry.timestamp;
    if (age > this.config.cacheTtl) {
      this.cache.delete(upc); // Stale, remove
      return undefined;
    }

    return entry.product;
  }

  /**
   * Add product to memory cache
   *
   * @param upc - UPC
   * @param product - Product (or null if not found)
   */
  private addToCache(upc: string, product: Product | null): void {
    if (!this.config.enableCache) {
      return;
    }

    this.cache.set(upc, {
      product,
      timestamp: Date.now(),
    });
  }

  /**
   * Fetch with retry logic
   *
   * @param fetchFn - Function that performs the fetch
   * @returns Result of fetch function
   */
  private async fetchWithRetry<T>(fetchFn: () => Promise<T>): Promise<T> {
    if (!this.config.enableRetry) {
      return fetchFn();
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        return await fetchFn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on 404 or timeout
        if (
          error instanceof Error &&
          (error.message.includes('404') || error.message.includes('timeout'))
        ) {
          throw error;
        }

        // Exponential backoff
        if (attempt < this.config.maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Fetch failed after retries');
  }

  /**
   * Deduplicate products by UPC
   *
   * Prefer Open Food Facts > UPC Database
   *
   * @param products - Array of products (may have duplicates)
   * @returns Deduplicated array
   */
  private deduplicateProducts(products: Product[]): Product[] {
    const upcMap = new Map<string, Product>();

    for (const product of products) {
      const existing = upcMap.get(product.upc);

      if (!existing) {
        upcMap.set(product.upc, product);
        continue;
      }

      // Prefer Open Food Facts over UPC Database
      if (
        product.dataSource === 'open_food_facts' &&
        existing.dataSource === 'upc_database'
      ) {
        upcMap.set(product.upc, product);
      }
    }

    return Array.from(upcMap.values());
  }
}
