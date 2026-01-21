/**
 * Product Service
 *
 * Main service for product database operations.
 * Orchestrates multiple data sources with fallback logic:
 * 1. Open Food Facts (priority)
 * 2. UPC Database API (fallback)
 * 3. Local cache (for offline)
 *
 * Implements caching and retry strategies for optimal performance.
 */

import { Product, ProductLookupResult, ProductQueryParams } from '../../types/product.types';
import { OpenFoodFactsClient } from './OpenFoodFactsClient';
import { UPCDatabaseClient } from './UPCDatabaseClient';

/**
 * Product Service Configuration
 */
interface ProductServiceConfig {
  /** UPC Database API key (optional - if not provided, only Open Food Facts will be used) */
  upcDatabaseApiKey?: string;

  /** Enable caching */
  enableCache: boolean;

  /** Cache TTL in milliseconds */
  cacheTtl: number;

  /** Request timeout in milliseconds */
  timeout: number;

  /** Enable retry on failure */
  enableRetry: boolean;

  /** Maximum retry attempts */
  maxRetries: number;
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
};

/**
 * Cache entry structure
 */
interface CacheEntry {
  product: Product | null;
  timestamp: number;
}

/**
 * Product Service
 */
export class ProductService {
  private config: ProductServiceConfig;
  private openFoodFactsClient: OpenFoodFactsClient;
  private upcDatabaseClient?: UPCDatabaseClient;
  private cache: Map<string, CacheEntry>;

  constructor(config?: Partial<ProductServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize clients
    this.openFoodFactsClient = new OpenFoodFactsClient({
      timeout: this.config.timeout,
    });

    if (this.config.upcDatabaseApiKey) {
      this.upcDatabaseClient = new UPCDatabaseClient(
        this.config.upcDatabaseApiKey,
        { timeout: this.config.timeout }
      );
    }

    // Initialize cache
    this.cache = new Map();
  }

  /**
   * Lookup product by UPC
   *
   * Priority order:
   * 1. Cache (if enabled and fresh)
   * 2. Open Food Facts
   * 3. UPC Database (if API key provided)
   *
   * @param upc - Universal Product Code
   * @returns ProductLookupResult with product info if found
   */
  async lookupProduct(upc: string): Promise<ProductLookupResult> {
    const startTime = Date.now();

    // Check cache first
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
          confidence: cached ? 90 : 100, // Slightly lower confidence for cached data
        };
      }
    }

    // Try Open Food Facts first (priority source)
    try {
      const product = await this.fetchWithRetry(() =>
        this.openFoodFactsClient.getProduct(upc)
      );

      if (product) {
        this.addToCache(upc, product);
        return {
          upc,
          found: true,
          product,
          dataSource: 'open_food_facts',
          cached: false,
          responseTime: Date.now() - startTime,
          confidence: 85, // Open Food Facts is crowdsourced, moderate confidence
        };
      }
    } catch (error) {
      console.warn(`Open Food Facts lookup failed for UPC ${upc}:`, error);
      // Continue to fallback
    }

    // Fallback to UPC Database if available
    if (this.upcDatabaseClient) {
      try {
        const product = await this.fetchWithRetry(() =>
          this.upcDatabaseClient!.getProduct(upc)
        );

        if (product) {
          this.addToCache(upc, product);
          return {
            upc,
            found: true,
            product,
            dataSource: 'upc_database',
            cached: false,
            responseTime: Date.now() - startTime,
            confidence: 75, // UPC Database has less nutritional info, lower confidence
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
      confidence: 100, // High confidence that product doesn't exist in databases
    };
  }

  /**
   * Batch lookup multiple products by UPCs
   *
   * @param upcs - Array of UPCs to lookup
   * @returns Array of ProductLookupResults
   */
  async lookupProducts(upcs: string[]): Promise<ProductLookupResult[]> {
    // Process lookups concurrently
    const promises = upcs.map(upc => this.lookupProduct(upc));
    return Promise.all(promises);
  }

  /**
   * Search products by query string
   *
   * Searches across both Open Food Facts and UPC Database (if available),
   * merges and deduplicates results.
   *
   * @param params - Search parameters
   * @returns Array of matching products
   */
  async searchProducts(params: ProductQueryParams): Promise<Product[]> {
    const { search, page = 1, limit = 20 } = params;

    if (!search) {
      return [];
    }

    const results: Product[] = [];

    // Search Open Food Facts
    try {
      const offProducts = await this.openFoodFactsClient.searchProducts(
        search,
        page,
        limit
      );
      results.push(...offProducts);
    } catch (error) {
      console.warn('Open Food Facts search failed:', error);
    }

    // Search UPC Database (if available)
    if (this.upcDatabaseClient) {
      try {
        const offset = (page - 1) * limit;
        const upcProducts = await this.upcDatabaseClient.searchProducts(
          search,
          offset,
          limit
        );
        results.push(...upcProducts);
      } catch (error) {
        console.warn('UPC Database search failed:', error);
      }
    }

    // Deduplicate by UPC
    const deduped = this.deduplicateProducts(results);

    // Apply filters
    return this.filterProducts(deduped, params);
  }

  /**
   * Get product coverage statistics
   *
   * @returns Coverage stats for monitoring
   */
  getCoverageStats() {
    return {
      cacheSize: this.cache.size,
      cachedProducts: Array.from(this.cache.values()).filter(e => e.product !== null).length,
      hasUPCDatabaseAccess: !!this.upcDatabaseClient,
    };
  }

  /**
   * Clear product cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get product from cache
   *
   * @param upc - UPC to lookup
   * @returns Product if in cache and fresh, undefined if not in cache or stale
   */
  private getFromCache(upc: string): Product | null | undefined {
    const entry = this.cache.get(upc);

    if (!entry) {
      return undefined; // Not in cache
    }

    const age = Date.now() - entry.timestamp;
    if (age > this.config.cacheTtl) {
      this.cache.delete(upc); // Stale, remove from cache
      return undefined;
    }

    return entry.product;
  }

  /**
   * Add product to cache
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
  private async fetchWithRetry<T>(
    fetchFn: () => Promise<T>
  ): Promise<T> {
    if (!this.config.enableRetry) {
      return fetchFn();
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        return await fetchFn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on 404 (not found) or timeout
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
   * When multiple sources return the same product, prefer:
   * 1. Open Food Facts (better nutrition data)
   * 2. UPC Database
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

  /**
   * Filter products by query parameters
   *
   * @param products - Products to filter
   * @param params - Filter parameters
   * @returns Filtered products
   */
  private filterProducts(products: Product[], params: ProductQueryParams): Product[] {
    let filtered = products;

    if (params.brand) {
      filtered = filtered.filter(p =>
        p.brand.toLowerCase().includes(params.brand!.toLowerCase())
      );
    }

    if (params.category) {
      const categories = Array.isArray(params.category) ? params.category : [params.category];
      filtered = filtered.filter(p =>
        categories.some(cat => p.category.some(c => c.toLowerCase().includes(cat.toLowerCase())))
      );
    }

    if (params.verifiedOnly) {
      filtered = filtered.filter(p => p.verified);
    }

    if (params.dataSource) {
      const sources = Array.isArray(params.dataSource) ? params.dataSource : [params.dataSource];
      filtered = filtered.filter(p => sources.includes(p.dataSource));
    }

    return filtered;
  }
}

/**
 * Singleton instance for convenience
 * Note: Initialize with API key if UPC Database access is needed
 */
export const productService = new ProductService();
