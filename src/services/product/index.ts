/**
 * Product Database Services
 *
 * Export all product-related services and utilities.
 */

export { OpenFoodFactsClient, openFoodFactsClient } from './OpenFoodFactsClient';
export { UPCDatabaseClient } from './UPCDatabaseClient';
export { ProductService, productService } from './ProductService';
export { ProductServiceWithDB } from './ProductServiceWithDB';
export { ProductApiClient, getProductApiClient, setProductApiClient } from './ProductApiClient';
export { productConfig, getProductServiceConfig } from './config';
export { ImageStorageService, DEFAULT_VARIANTS } from './ImageStorageService';
export { getImageStorageConfig, validateImageStorageConfig, getProductImageUrl, isCdnUrl, isExternalUrl } from './image-storage.config';

// Product Sync Pipeline (A2.5)
export { ProductSyncService, createProductSyncService } from './ProductSyncService';
export { ProductSyncScheduler, createProductSyncScheduler } from './ProductSyncScheduler';
export { ProductSyncMonitor, createProductSyncMonitor } from './ProductSyncMonitor';

// Re-export image storage types
export type {
  ImageVariant,
  ImageStorageConfig,
  ImageUploadResult,
} from './ImageStorageService';

// Re-export sync pipeline types
export type {
  SyncJobStatus,
  SyncSourceType,
  SyncJobConfig,
  SyncJobResult,
  SyncError,
  ProgressCallback,
} from './ProductSyncService';

export type {
  SyncScheduleConfig,
  ScheduleStatus,
} from './ProductSyncScheduler';

export type {
  CoverageThresholds,
  FreshnessThresholds,
  HealthCheckResult,
  CoverageHealthCheck,
  FreshnessHealthCheck,
  QualityHealthCheck,
  HealthAlert,
  MonitorConfig,
} from './ProductSyncMonitor';

// Re-export types for convenience
export type {
  Product,
  ProductDataSource,
  ProductLookupResult,
  ProductQueryParams,
  ProductCoverageStats,
  ProductSubmission,
  UnknownProductReport,
  NutritionInfo,
} from '../../types/product.types';
