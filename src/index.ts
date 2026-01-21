/**
 * WIC Benefits Assistant - Main Module Exports
 * Store Detection, Inventory Management, and Product Database
 */

// ============================================================================
// Database Layer
// ============================================================================

export {
  ProductRepository,
  getDatabaseConfig,
  validateDatabaseConfig,
} from './database';
export type { DatabaseConfig } from './database';

// ============================================================================
// Product Services
// ============================================================================

export {
  OpenFoodFactsClient,
  openFoodFactsClient,
  UPCDatabaseClient,
  ProductService,
  productService,
  ProductServiceWithDB,
  productConfig,
  getProductServiceConfig,
} from './services/product';

// Product Types
export type {
  Product,
  ProductDataSource,
  ProductLookupResult,
  ProductQueryParams,
  ProductCoverageStats,
  ProductSubmission,
  UnknownProductReport,
  NutritionInfo,
} from './types/product.types';

// ============================================================================
// Store Detection Services
// ============================================================================

export { default as LocationService } from './services/LocationService';
export { default as StoreDetectionService } from './services/StoreDetectionService';
export { default as StoreApiService } from './services/StoreApiService';

// Store Detection Hooks
export { useStoreDetection } from './hooks/useStoreDetection';
export type { UseStoreDetectionResult } from './hooks/useStoreDetection';

// Store Detection Components
export { StoreDetectionBanner } from './components/StoreDetectionBanner';
export { StoreSelectionModal } from './components/StoreSelectionModal';

// Store Contexts
export { StoreProvider, useStore } from './contexts/StoreContext';

// Store Types
export type {
  Store,
  StoreDetectionResult,
  LocationPermissionStatus,
  GeoPoint,
  Address,
  StoreFeatures,
  WiFiNetwork,
  Beacon,
  DataSource,
} from './types/store.types';

// Store Config
export { STORE_DETECTION_CONFIG } from './config/storeDetection.config';

// Store Utils
export {
  showPermissionSettingsAlert,
  openAppSettings,
  getPermissionStatusMessage,
  shouldShowPermissionRationale,
  showPermissionRationale,
} from './utils/permissions';

// ============================================================================
// Inventory Services (Walmart API Integration)
// ============================================================================

export {
  InventoryManager,
  getInventoryManager,
  resetInventoryManager,
  InventoryConfigManager,
  getInventoryConfig,
  WalmartApiClient,
  WalmartInventoryService,
  RateLimiter,
  RateLimiterFactory,
  RetryHandler,
  retry,
  withRetry,
} from './services/inventory';

// Legacy Inventory Exports
export {
  InventoryService,
  inventoryService,
  createWalmartClient,
} from './services/inventory';

// Inventory Types
export type {
  Inventory,
  StockStatus,
  QuantityRange,
  IInventoryService,
  RetailerApiType,
  InventoryCacheEntry,
  InventorySyncConfig,
  RateLimitConfig,
  WalmartConfig,
  KrogerConfig,
  RetailerConfig,
  CacheConfig,
  InventoryServiceConfig,
  WalmartInventoryServiceConfig,
  RetryConfig,
  WalmartAPI,
  KrogerAPI,
} from './services/inventory';

// Inventory Errors
export {
  InventoryAPIError,
  RateLimitError,
  AuthenticationError,
  ProductNotFoundError,
} from './services/inventory';

// Inventory Hooks
export {
  useInventory,
  useInventoryBatch,
  useCrossStoreInventory,
  useFormulaAlert,
  useInventoryHealth,
} from './hooks/useInventory';

// Inventory Components
export {
  StockIndicator,
  InventoryCard,
  FormulaAvailabilityAlert,
} from './components/inventory';
