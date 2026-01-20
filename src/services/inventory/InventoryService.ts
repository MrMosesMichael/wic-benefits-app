/**
 * Inventory Service
 * Main service for retrieving product inventory from multiple retailers
 */

import {
  Inventory,
  InventoryService as IInventoryService,
  RetailerApiType,
  InventoryAPIError,
} from '../../types/inventory.types';
import { WalmartApiClient } from './WalmartApiClient';

export class InventoryService implements IInventoryService {
  private walmartClient: WalmartApiClient | null = null;

  constructor(walmartClient?: WalmartApiClient) {
    this.walmartClient = walmartClient || null;
  }

  /**
   * Get inventory for a specific product at a store
   */
  async getInventory(upc: string, storeId: string): Promise<Inventory> {
    const retailerType = this.getRetailerTypeFromStoreId(storeId);

    switch (retailerType) {
      case 'walmart':
        if (!this.walmartClient) {
          return this.createUnknownInventory(upc, storeId, 'Walmart API not configured');
        }
        try {
          return await this.walmartClient.getInventory(upc, storeId);
        } catch (error) {
          console.error(`Walmart inventory fetch failed for ${upc} at ${storeId}:`, error);
          return this.createUnknownInventory(
            upc,
            storeId,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }

      case 'kroger':
      case 'target':
      case 'heb':
      case 'publix':
      case 'safeway':
      case 'albertsons':
        // Not yet implemented
        return this.createUnknownInventory(
          upc,
          storeId,
          `${retailerType} API not yet implemented`
        );

      default:
        return this.createUnknownInventory(upc, storeId, 'Unsupported retailer');
    }
  }

  /**
   * Get inventory for multiple products at once
   */
  async getInventoryBatch(upcs: string[], storeId: string): Promise<Inventory[]> {
    const retailerType = this.getRetailerTypeFromStoreId(storeId);

    switch (retailerType) {
      case 'walmart':
        if (!this.walmartClient) {
          return upcs.map(upc =>
            this.createUnknownInventory(upc, storeId, 'Walmart API not configured')
          );
        }
        try {
          return await this.walmartClient.getInventoryBatch(upcs, storeId);
        } catch (error) {
          console.error(`Walmart batch inventory fetch failed at ${storeId}:`, error);
          return upcs.map(upc =>
            this.createUnknownInventory(
              upc,
              storeId,
              error instanceof Error ? error.message : 'Unknown error'
            )
          );
        }

      default:
        return upcs.map(upc =>
          this.createUnknownInventory(upc, storeId, 'Unsupported retailer')
        );
    }
  }

  /**
   * Check if the service supports a given store
   */
  supportsStore(storeId: string): boolean {
    const retailerType = this.getRetailerTypeFromStoreId(storeId);

    switch (retailerType) {
      case 'walmart':
        return this.walmartClient !== null;
      case 'kroger':
      case 'target':
      case 'heb':
      case 'publix':
      case 'safeway':
      case 'albertsons':
        return false; // Not yet implemented
      default:
        return false;
    }
  }

  /**
   * Get the retailer type this service handles
   */
  getRetailerType(): RetailerApiType {
    // This service is a multi-retailer aggregator
    // Individual clients handle specific retailers
    return 'walmart'; // Default/primary retailer
  }

  /**
   * Determine retailer type from store ID
   * Store IDs should follow format: "{retailer}-{storeNumber}"
   * Examples: "walmart-1234", "kroger-567", "target-890"
   */
  private getRetailerTypeFromStoreId(storeId: string): RetailerApiType | 'unknown' {
    const storeIdLower = storeId.toLowerCase();

    if (storeIdLower.startsWith('walmart-')) return 'walmart';
    if (storeIdLower.startsWith('kroger-')) return 'kroger';
    if (storeIdLower.startsWith('target-')) return 'target';
    if (storeIdLower.startsWith('heb-')) return 'heb';
    if (storeIdLower.startsWith('publix-')) return 'publix';
    if (storeIdLower.startsWith('safeway-')) return 'safeway';
    if (storeIdLower.startsWith('albertsons-')) return 'albertsons';

    return 'unknown';
  }

  /**
   * Create an "unknown" inventory entry when data is unavailable
   */
  private createUnknownInventory(
    upc: string,
    storeId: string,
    reason: string
  ): Inventory {
    return {
      storeId,
      upc,
      status: 'unknown',
      quantity: undefined,
      quantityRange: undefined,
      aisle: undefined,
      lastUpdated: new Date(),
      source: 'api',
      confidence: 0,
    };
  }

  /**
   * Get service health/status
   */
  getStatus(): {
    walmart: { configured: boolean; rateLimitStatus?: any };
    kroger: { configured: boolean };
    target: { configured: boolean };
  } {
    return {
      walmart: {
        configured: this.walmartClient !== null,
        rateLimitStatus: this.walmartClient?.getRateLimitStatus(),
      },
      kroger: {
        configured: false,
      },
      target: {
        configured: false,
      },
    };
  }

  /**
   * Factory method to create service with environment-based configuration
   */
  static fromEnvironment(): InventoryService {
    let walmartClient: WalmartApiClient | null = null;

    // Initialize Walmart client if credentials are available
    const walmartClientId = process.env.WALMART_CLIENT_ID;
    const walmartClientSecret = process.env.WALMART_CLIENT_SECRET;

    if (walmartClientId && walmartClientSecret) {
      walmartClient = new WalmartApiClient({
        clientId: walmartClientId,
        clientSecret: walmartClientSecret,
        apiKey: process.env.WALMART_API_KEY,
      });
    } else {
      console.warn(
        'Walmart API credentials not configured. Set WALMART_CLIENT_ID and WALMART_CLIENT_SECRET environment variables.'
      );
    }

    return new InventoryService(walmartClient);
  }
}

// Export singleton instance
export const inventoryService = InventoryService.fromEnvironment();
