/**
 * Walmart Inventory Service
 * Implements the InventoryService interface for Walmart stores
 */

import {
  Inventory,
  InventoryService,
  RetailerApiType,
  StockStatus,
  ProductNotFoundError,
  WalmartAPI,
} from '../../../types/inventory.types';
import { WalmartApiClient } from './WalmartApiClient';

export interface WalmartInventoryServiceConfig {
  clientId: string;
  clientSecret: string;
  apiKey?: string;
  cacheEnabled?: boolean;
  cacheTTLMinutes?: number;
}

export class WalmartInventoryService implements InventoryService {
  private client: WalmartApiClient;
  private cacheEnabled: boolean;
  private cacheTTLMinutes: number;
  private cache: Map<string, { data: Inventory; expiresAt: Date }>;

  constructor(config: WalmartInventoryServiceConfig) {
    this.client = new WalmartApiClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      apiKey: config.apiKey,
    });

    this.cacheEnabled = config.cacheEnabled ?? true;
    this.cacheTTLMinutes = config.cacheTTLMinutes ?? 30; // 30 minutes default
    this.cache = new Map();
  }

  /**
   * Get inventory for a specific product at a store
   */
  async getInventory(upc: string, storeId: string): Promise<Inventory> {
    // Check cache first
    if (this.cacheEnabled) {
      const cached = this.getFromCache(upc, storeId);
      if (cached) {
        return cached;
      }
    }

    try {
      // Get product information from Walmart API
      const productResponse = await this.client.getProduct(upc);

      if (!productResponse.items || productResponse.items.length === 0) {
        throw new ProductNotFoundError('walmart', upc);
      }

      const product = productResponse.items[0];

      // Try to get store-specific inventory (may not be available)
      let storeInventory: WalmartAPI.StoreInventoryResponse | null = null;
      try {
        storeInventory = await this.client.getStoreInventory(product.itemId, storeId);
      } catch (error) {
        // Store inventory API may not be available - continue with product-level data
        console.warn(`Store inventory not available for ${upc} at store ${storeId}`);
      }

      // Normalize to unified schema
      const inventory = this.normalizeInventory(product, storeId, storeInventory);

      // Cache the result
      if (this.cacheEnabled) {
        this.addToCache(upc, storeId, inventory);
      }

      return inventory;
    } catch (error) {
      if (error instanceof ProductNotFoundError) {
        throw error;
      }

      // Return unknown status if we can't fetch inventory
      return this.createUnknownInventory(upc, storeId);
    }
  }

  /**
   * Get inventory for multiple products at once
   */
  async getInventoryBatch(upcs: string[], storeId: string): Promise<Inventory[]> {
    const results: Inventory[] = [];

    // Process in batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < upcs.length; i += batchSize) {
      const batch = upcs.slice(i, i + batchSize);
      const batchPromises = batch.map(upc =>
        this.getInventory(upc, storeId).catch(error => {
          console.error(`Failed to get inventory for ${upc}:`, error);
          return this.createUnknownInventory(upc, storeId);
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < upcs.length) {
        await this.delay(200); // 200ms delay
      }
    }

    return results;
  }

  /**
   * Check if this service supports a given store
   */
  supportsStore(storeId: string): boolean {
    // Check if the store ID matches Walmart's format
    // Walmart store IDs are typically numeric
    return /^walmart-\d+$/.test(storeId) || /^\d+$/.test(storeId);
  }

  /**
   * Get the retailer type this service handles
   */
  getRetailerType(): RetailerApiType {
    return 'walmart';
  }

  /**
   * Normalize Walmart API response to unified inventory schema
   */
  private normalizeInventory(
    product: WalmartAPI.ProductItem,
    storeId: string,
    storeInventory: WalmartAPI.StoreInventoryResponse | null
  ): Inventory {
    // If we have store-specific inventory, use it
    if (storeInventory?.inventory) {
      return {
        storeId,
        upc: product.upc,
        status: this.normalizeStoreInventoryStatus(storeInventory.inventory.status),
        quantity: storeInventory.inventory.quantity > 0 ? storeInventory.inventory.quantity : undefined,
        lastUpdated: new Date(),
        source: 'api',
        confidence: 90, // High confidence for API data
      };
    }

    // Otherwise, use product-level availability
    const status = this.normalizeProductStock(product.stock);

    return {
      storeId,
      upc: product.upc,
      status,
      lastUpdated: new Date(),
      source: 'api',
      confidence: 70, // Lower confidence when using product-level data
    };
  }

  /**
   * Normalize Walmart store inventory status to our StockStatus enum
   */
  private normalizeStoreInventoryStatus(status: string): StockStatus {
    const statusLower = status.toLowerCase();

    if (statusLower.includes('instock') || statusLower.includes('in stock')) {
      return 'in_stock';
    }
    if (statusLower.includes('limited') || statusLower.includes('low')) {
      return 'low_stock';
    }
    if (statusLower.includes('outofstock') || statusLower.includes('out of stock')) {
      return 'out_of_stock';
    }

    return 'unknown';
  }

  /**
   * Normalize Walmart product stock string to our StockStatus enum
   */
  private normalizeProductStock(stock: string): StockStatus {
    const stockLower = stock.toLowerCase();

    if (stockLower.includes('available') && !stockLower.includes('not')) {
      return 'in_stock';
    }
    if (stockLower.includes('limited')) {
      return 'low_stock';
    }
    if (stockLower.includes('not available') || stockLower.includes('unavailable')) {
      return 'out_of_stock';
    }

    return 'unknown';
  }

  /**
   * Create an unknown inventory entry
   */
  private createUnknownInventory(upc: string, storeId: string): Inventory {
    return {
      storeId,
      upc,
      status: 'unknown',
      lastUpdated: new Date(),
      source: 'api',
      confidence: 0,
    };
  }

  /**
   * Get inventory from cache
   */
  private getFromCache(upc: string, storeId: string): Inventory | null {
    const key = this.getCacheKey(upc, storeId);
    const cached = this.cache.get(key);

    if (cached && new Date() < cached.expiresAt) {
      return cached.data;
    }

    // Remove expired entry
    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * Add inventory to cache
   */
  private addToCache(upc: string, storeId: string, inventory: Inventory): void {
    const key = this.getCacheKey(upc, storeId);
    const expiresAt = new Date(Date.now() + this.cacheTTLMinutes * 60 * 1000);

    this.cache.set(key, {
      data: inventory,
      expiresAt,
    });
  }

  /**
   * Generate cache key
   */
  private getCacheKey(upc: string, storeId: string): string {
    return `walmart:${storeId}:${upc}`;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = new Date();
    for (const [key, value] of this.cache.entries()) {
      if (now >= value.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; ttlMinutes: number; enabled: boolean } {
    return {
      size: this.cache.size,
      ttlMinutes: this.cacheTTLMinutes,
      enabled: this.cacheEnabled,
    };
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
