/**
 * Product Service Configuration
 *
 * Centralized configuration for product database integrations.
 * Environment variables should be used in production for API keys.
 */

/**
 * Product database configuration
 */
export const productConfig = {
  /**
   * Open Food Facts configuration
   * No API key required - public API
   */
  openFoodFacts: {
    enabled: true,
    baseUrl: 'https://world.openfoodfacts.org/api/v2',
    userAgent: 'WICBenefitsApp/1.0 (https://github.com/MrMosesMichael/wic-benefits-app)',
    timeout: 5000,
  },

  /**
   * UPC Database configuration
   * Requires API key from https://upcdatabase.org
   *
   * Free tier: 100 requests/day
   * Paid tier: Higher limits available
   */
  upcDatabase: {
    enabled: !!process.env.UPC_DATABASE_API_KEY,
    apiKey: process.env.UPC_DATABASE_API_KEY || '',
    baseUrl: 'https://api.upcdatabase.org',
    timeout: 5000,
  },

  /**
   * Caching configuration
   */
  cache: {
    enabled: true,
    ttl: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    maxSize: 1000, // Maximum cache entries
  },

  /**
   * Retry configuration
   */
  retry: {
    enabled: true,
    maxAttempts: 2,
    backoffMultiplier: 2, // Exponential backoff: 1s, 2s, 4s...
  },

  /**
   * Coverage targets (for monitoring)
   */
  coverageTargets: {
    wicEligibleProducts: 0.95, // 95%+ of WIC-eligible UPCs
    commonProducts: 0.90, // 90%+ of commonly scanned products
    formulaProducts: 1.0, // 100% of formula products
  },
};

/**
 * Get product service configuration
 *
 * @returns ProductService configuration object
 */
export function getProductServiceConfig() {
  return {
    upcDatabaseApiKey: productConfig.upcDatabase.enabled
      ? productConfig.upcDatabase.apiKey
      : undefined,
    enableCache: productConfig.cache.enabled,
    cacheTtl: productConfig.cache.ttl,
    timeout: productConfig.openFoodFacts.timeout,
    enableRetry: productConfig.retry.enabled,
    maxRetries: productConfig.retry.maxAttempts,
  };
}
