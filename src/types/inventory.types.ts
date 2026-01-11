/**
 * Inventory Types
 * Based on WIC Benefits Assistant Design Specification
 */

import { DataSource } from './store.types';

/**
 * Stock status for a product at a store
 */
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';

/**
 * Quantity range indicator when exact count is unavailable
 */
export type QuantityRange = 'few' | 'some' | 'plenty';

/**
 * Inventory data for a product at a specific store
 */
export interface Inventory {
  storeId: string;
  upc: string;
  status: StockStatus;
  quantity?: number;
  quantityRange?: QuantityRange;
  aisle?: string;
  lastUpdated: Date;
  source: DataSource;
  confidence: number; // 0-100
  reportCount?: number; // For crowdsourced data
}

/**
 * Retailer-specific inventory API types
 */
export type RetailerApiType = 'walmart' | 'kroger' | 'target' | 'heb' | 'publix' | 'safeway' | 'albertsons';

/**
 * Base interface for all inventory services
 */
export interface InventoryService {
  /**
   * Get inventory for a specific product at a store
   */
  getInventory(upc: string, storeId: string): Promise<Inventory>;

  /**
   * Get inventory for multiple products at once
   */
  getInventoryBatch(upcs: string[], storeId: string): Promise<Inventory[]>;

  /**
   * Check if the service supports a given store
   */
  supportsStore(storeId: string): boolean;

  /**
   * Get the retailer type this service handles
   */
  getRetailerType(): RetailerApiType;
}

/**
 * Walmart-specific types
 */
export namespace WalmartAPI {
  export interface AuthConfig {
    clientId: string;
    clientSecret: string;
    apiKey?: string;
  }

  export interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
  }

  export interface ProductItem {
    itemId: string;
    name: string;
    upc: string;
    stock: string; // "Available", "Not Available", etc.
    salePrice: number;
    largeImage?: string;
    categoryPath?: string;
    availableOnline?: boolean;
    offerType?: string;
  }

  export interface ProductResponse {
    items: ProductItem[];
  }

  export interface StoreInventoryResponse {
    itemId: string;
    storeNo: string;
    inventory: {
      quantity: number;
      status: string; // "InStock", "OutOfStock", "LimitedStock"
    };
  }
}

/**
 * Kroger-specific types
 */
export namespace KrogerAPI {
  export interface AuthConfig {
    clientId: string;
    clientSecret: string;
  }

  export interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
  }

  export interface Product {
    productId: string;
    description: string;
    items: ProductItem[];
    aisle?: string;
  }

  export interface ProductItem {
    itemId: string;
    inventory?: {
      stockLevel: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    };
    price?: {
      regular: number;
      promo?: number;
    };
  }

  export interface ProductResponse {
    data: Product[];
    meta?: {
      pagination?: {
        total: number;
        limit: number;
        start: number;
      };
    };
  }
}

/**
 * Inventory cache entry
 */
export interface InventoryCacheEntry {
  inventory: Inventory;
  cachedAt: Date;
  expiresAt: Date;
}

/**
 * Inventory sync job configuration
 */
export interface InventorySyncConfig {
  retailer: RetailerApiType;
  storeIds: string[];
  upcs: string[];
  intervalMinutes: number;
  priority: 'high' | 'medium' | 'low';
  isFormula?: boolean; // Formula products get priority treatment
}

/**
 * Rate limiter configuration
 */
export interface RateLimitConfig {
  requestsPerDay?: number;
  requestsPerHour?: number;
  requestsPerMinute?: number;
  burstSize?: number;
}

/**
 * API error types
 */
export class InventoryAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public retailer: RetailerApiType,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'InventoryAPIError';
  }
}

export class RateLimitError extends InventoryAPIError {
  constructor(retailer: RetailerApiType, public retryAfter?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', retailer, 429);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends InventoryAPIError {
  constructor(retailer: RetailerApiType) {
    super('Authentication failed', 'AUTH_FAILED', retailer, 401);
    this.name = 'AuthenticationError';
  }
}

export class ProductNotFoundError extends InventoryAPIError {
  constructor(retailer: RetailerApiType, upc: string) {
    super(`Product not found: ${upc}`, 'PRODUCT_NOT_FOUND', retailer, 404);
    this.name = 'ProductNotFoundError';
  }
}
