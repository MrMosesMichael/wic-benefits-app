/**
 * Inventory Services - Main Export
 * Consolidated exports for Walmart inventory API integration
 */

// Core Manager and Configuration
export { InventoryManager, getInventoryManager, resetInventoryManager } from './InventoryManager';
export { InventoryConfigManager, getInventoryConfig } from './InventoryConfig';

// Walmart Service
export { WalmartApiClient } from './walmart/WalmartApiClient';
export { WalmartInventoryService } from './walmart/WalmartInventoryService';

// Utilities
export { RateLimiter, RateLimiterFactory } from './utils/RateLimiter';
export { RetryHandler, withRetry, retry } from './utils/RetryHandler';

// Legacy exports (for backward compatibility)
export { WalmartApiClient as WalmartApiClientLegacy } from './WalmartApiClient';
export { RateLimiter as RateLimiterLegacy } from './RateLimiter';
export { InventoryService } from './InventoryService';
export { inventoryService } from './InventoryService';
export { createWalmartClient } from './WalmartApiClient';

// Configuration Types
export type {
  WalmartConfig,
  KrogerConfig,
  RetailerConfig,
  CacheConfig,
  InventoryServiceConfig,
} from './InventoryConfig';

export type {
  WalmartInventoryServiceConfig,
} from './walmart/WalmartInventoryService';

export type {
  RetryConfig,
} from './utils/RetryHandler';

// Re-export types from types/inventory.types.ts
export type {
  Inventory,
  StockStatus,
  QuantityRange,
  InventoryService as IInventoryService,
  RetailerApiType,
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

export type {
  WalmartAPI,
  KrogerAPI,
} from '../../types/inventory.types';
