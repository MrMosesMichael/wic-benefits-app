/**
 * Services Index
 * Central export point for all services
 */

// Store Detection Services
export { default as LocationService } from './LocationService';
export { default as StoreDetectionService } from './StoreDetectionService';
export { default as WiFiService } from './WiFiService';

export type { StoreDetectionConfig } from './StoreDetectionService';
export type { WiFiScanResult, WiFiServiceConfig } from './WiFiService';

// Purchase Logging Service
export { default as PurchaseLoggingService, purchaseLoggingService } from './PurchaseLoggingService';
export type { LogPurchaseRequest, LogPurchaseResponse, BenefitAmount } from './PurchaseLoggingService';

// Inventory Services
export {
  InventoryManager,
  getInventoryManager,
  resetInventoryManager,
  InventoryConfigManager,
  getInventoryConfig,
  WalmartInventoryService,
  WalmartApiClient,
  RateLimiter,
  RateLimiterFactory,
  RetryHandler,
  retry,
  withRetry,
  InventoryAPIError,
  RateLimitError,
  AuthenticationError,
  ProductNotFoundError,
} from './inventory';

export type {
  Inventory,
  InventoryService,
  RetailerApiType,
  StockStatus,
  QuantityRange,
  InventoryCacheEntry,
  InventorySyncConfig,
  RateLimitConfig,
  InventoryServiceConfig,
  WalmartConfig,
  KrogerConfig,
  RetailerConfig,
  CacheConfig,
} from './inventory';
