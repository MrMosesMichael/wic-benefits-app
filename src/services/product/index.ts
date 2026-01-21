/**
 * Product Database Services
 *
 * Export all product-related services and utilities.
 */

export { OpenFoodFactsClient, openFoodFactsClient } from './OpenFoodFactsClient';
export { UPCDatabaseClient } from './UPCDatabaseClient';
export { ProductService, productService } from './ProductService';
export { productConfig, getProductServiceConfig } from './config';

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
