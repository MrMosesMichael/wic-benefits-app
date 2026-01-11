/**
 * Inventory Service - Main Export
 * Centralized exports for all inventory-related functionality
 */

// Main manager
export { InventoryManager, getInventoryManager, resetInventoryManager } from './InventoryManager';

// Configuration
export {
  InventoryConfigManager,
  getInventoryConfig,
  type InventoryServiceConfig,
  type WalmartConfig,
  type KrogerConfig,
  type RetailerConfig,
  type CacheConfig,
} from './InventoryConfig';

// Walmart-specific
export { WalmartInventoryService } from './walmart/WalmartInventoryService';
export { WalmartApiClient } from './walmart/WalmartApiClient';

// Utilities
export { RateLimiter, RateLimiterFactory } from './utils/RateLimiter';
export { RetryHandler, retry, withRetry } from './utils/RetryHandler';

// Types (re-export from types/inventory.types.ts)
export type {
  Inventory,
  InventoryService,
  RetailerApiType,
  StockStatus,
  QuantityRange,
  InventoryCacheEntry,
  InventorySyncConfig,
  RateLimitConfig,
} from '../../types/inventory.types';

export {
  InventoryAPIError,
  RateLimitError,
  AuthenticationError,
  ProductNotFoundError,
} from '../../types/inventory.types';
