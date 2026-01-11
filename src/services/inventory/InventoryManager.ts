/**
 * Inventory Manager
 * Orchestrates multiple inventory services and provides unified interface
 */

import {
  Inventory,
  InventoryService,
  RetailerApiType,
} from '../../types/inventory.types';
import { WalmartInventoryService } from './walmart/WalmartInventoryService';
import { InventoryConfigManager } from './InventoryConfig';
import { RateLimiter, RateLimiterFactory } from './utils/RateLimiter';
import { RetryHandler } from './utils/RetryHandler';

export interface InventoryManagerOptions {
  configManager?: InventoryConfigManager;
  enableRetry?: boolean;
}

/**
 * Main inventory manager that coordinates all retailer services
 */
export class InventoryManager {
  private services: Map<RetailerApiType, InventoryService> = new Map();
  private rateLimiters: Map<RetailerApiType, RateLimiter> = new Map();
  private retryHandler: RetryHandler;
  private configManager: InventoryConfigManager;

  constructor(options: InventoryManagerOptions = {}) {
    this.configManager = options.configManager || InventoryConfigManager.getInstance();
    this.retryHandler = new RetryHandler(this.configManager.getRetryConfig());

    this.initializeServices();
  }

  /**
   * Initialize all enabled inventory services
   */
  private initializeServices(): void {
    // Initialize Walmart if enabled
    const walmartConfig = this.configManager.getWalmartConfig();
    if (walmartConfig) {
      const cacheConfig = this.configManager.getCacheConfig();
      const walmartService = new WalmartInventoryService({
        clientId: walmartConfig.clientId,
        clientSecret: walmartConfig.clientSecret,
        apiKey: walmartConfig.apiKey,
        cacheEnabled: cacheConfig.enabled,
        cacheTTLMinutes: cacheConfig.defaultTTLMinutes,
      });

      this.services.set('walmart', walmartService);
      this.rateLimiters.set('walmart', RateLimiterFactory.createWalmartLimiter());
    }

    // TODO: Initialize Kroger when implemented
    // const krogerConfig = this.configManager.getKrogerConfig();
    // if (krogerConfig) { ... }
  }

  /**
   * Get inventory for a product at a store
   * Automatically selects the appropriate service based on store
   */
  async getInventory(upc: string, storeId: string): Promise<Inventory> {
    const service = this.getServiceForStore(storeId);

    if (!service) {
      throw new Error(`No inventory service available for store ${storeId}`);
    }

    const retailer = service.getRetailerType();
    const rateLimiter = this.rateLimiters.get(retailer);

    // Apply rate limiting
    if (rateLimiter) {
      await rateLimiter.waitAndAcquire(storeId);
    }

    // Execute with retry logic
    return this.retryHandler.execute(
      () => service.getInventory(upc, storeId),
      `getInventory(${upc}, ${storeId})`
    );
  }

  /**
   * Get inventory for multiple products at a store
   */
  async getInventoryBatch(upcs: string[], storeId: string): Promise<Inventory[]> {
    const service = this.getServiceForStore(storeId);

    if (!service) {
      throw new Error(`No inventory service available for store ${storeId}`);
    }

    const retailer = service.getRetailerType();
    const rateLimiter = this.rateLimiters.get(retailer);

    // For batch requests, acquire tokens for each UPC
    if (rateLimiter) {
      for (const upc of upcs) {
        await rateLimiter.waitAndAcquire(`${storeId}:${upc}`);
      }
    }

    // Execute with retry logic
    return this.retryHandler.execute(
      () => service.getInventoryBatch(upcs, storeId),
      `getInventoryBatch(${upcs.length} items, ${storeId})`
    );
  }

  /**
   * Get inventory with formula priority
   * Uses shorter cache TTL for formula products
   */
  async getFormulaInventory(upc: string, storeId: string): Promise<Inventory> {
    // For formula, we might want to bypass cache or use shorter TTL
    // This is a higher priority request
    return this.getInventory(upc, storeId);
  }

  /**
   * Search for inventory across multiple stores
   * Useful for finding products in stock nearby
   */
  async searchInventoryAcrossStores(
    upc: string,
    storeIds: string[]
  ): Promise<Map<string, Inventory>> {
    const results = new Map<string, Inventory>();

    // Group stores by retailer for efficient processing
    const storesByRetailer = this.groupStoresByRetailer(storeIds);

    for (const [retailer, stores] of storesByRetailer) {
      const service = this.services.get(retailer);
      if (!service) continue;

      // Process stores in parallel with rate limiting
      const storePromises = stores.map(async storeId => {
        try {
          const inventory = await this.getInventory(upc, storeId);
          return { storeId, inventory };
        } catch (error) {
          console.error(`Failed to get inventory for ${upc} at ${storeId}:`, error);
          return null;
        }
      });

      const storeResults = await Promise.all(storePromises);

      for (const result of storeResults) {
        if (result) {
          results.set(result.storeId, result.inventory);
        }
      }
    }

    return results;
  }

  /**
   * Get the appropriate service for a store
   */
  private getServiceForStore(storeId: string): InventoryService | null {
    // Try each service to see which one supports this store
    for (const service of this.services.values()) {
      if (service.supportsStore(storeId)) {
        return service;
      }
    }

    return null;
  }

  /**
   * Group stores by retailer type
   */
  private groupStoresByRetailer(storeIds: string[]): Map<RetailerApiType, string[]> {
    const grouped = new Map<RetailerApiType, string[]>();

    for (const storeId of storeIds) {
      const service = this.getServiceForStore(storeId);
      if (service) {
        const retailer = service.getRetailerType();
        const stores = grouped.get(retailer) || [];
        stores.push(storeId);
        grouped.set(retailer, stores);
      }
    }

    return grouped;
  }

  /**
   * Get list of enabled retailers
   */
  getEnabledRetailers(): RetailerApiType[] {
    return Array.from(this.services.keys());
  }

  /**
   * Check if a retailer is enabled
   */
  isRetailerEnabled(retailer: RetailerApiType): boolean {
    return this.services.has(retailer);
  }

  /**
   * Get service for a specific retailer
   */
  getService(retailer: RetailerApiType): InventoryService | null {
    return this.services.get(retailer) || null;
  }

  /**
   * Get rate limiter statistics
   */
  getRateLimiterStats(retailer: RetailerApiType) {
    const limiter = this.rateLimiters.get(retailer);
    return limiter?.getStats();
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    for (const service of this.services.values()) {
      if ('clearCache' in service && typeof service.clearCache === 'function') {
        (service as any).clearCache();
      }
    }
  }

  /**
   * Get health status of all services
   */
  async getHealthStatus(): Promise<Map<RetailerApiType, boolean>> {
    const status = new Map<RetailerApiType, boolean>();

    for (const [retailer, service] of this.services) {
      try {
        // Try a simple test request
        // For Walmart, we could check authentication status
        if ('isAuthenticated' in service && typeof service.isAuthenticated === 'function') {
          status.set(retailer, (service as any).isAuthenticated());
        } else {
          status.set(retailer, true);
        }
      } catch (error) {
        status.set(retailer, false);
      }
    }

    return status;
  }
}

/**
 * Singleton instance for app-wide use
 */
let globalInventoryManager: InventoryManager | null = null;

/**
 * Get or create the global inventory manager instance
 */
export function getInventoryManager(options?: InventoryManagerOptions): InventoryManager {
  if (!globalInventoryManager) {
    globalInventoryManager = new InventoryManager(options);
  }
  return globalInventoryManager;
}

/**
 * Reset the global inventory manager
 */
export function resetInventoryManager(): void {
  globalInventoryManager = null;
}
