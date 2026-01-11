/**
 * Inventory Service Configuration
 * Centralized configuration management for inventory APIs
 */

import { RetailerApiType, RateLimitConfig } from '../../types/inventory.types';

export interface WalmartConfig {
  clientId: string;
  clientSecret: string;
  apiKey?: string;
  enabled: boolean;
}

export interface KrogerConfig {
  clientId: string;
  clientSecret: string;
  enabled: boolean;
}

export interface RetailerConfig {
  walmart?: WalmartConfig;
  kroger?: KrogerConfig;
  // Future retailers can be added here
}

export interface CacheConfig {
  enabled: boolean;
  defaultTTLMinutes: number;
  formulaTTLMinutes: number; // Shorter TTL for formula products
  maxCacheSize?: number;
}

export interface InventoryServiceConfig {
  retailers: RetailerConfig;
  cache: CacheConfig;
  rateLimits: {
    walmart?: RateLimitConfig;
    kroger?: RateLimitConfig;
  };
  retryConfig: {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: InventoryServiceConfig = {
  retailers: {
    walmart: {
      clientId: process.env.WALMART_CLIENT_ID || '',
      clientSecret: process.env.WALMART_CLIENT_SECRET || '',
      apiKey: process.env.WALMART_API_KEY,
      enabled: !!process.env.WALMART_CLIENT_ID,
    },
    kroger: {
      clientId: process.env.KROGER_CLIENT_ID || '',
      clientSecret: process.env.KROGER_CLIENT_SECRET || '',
      enabled: !!process.env.KROGER_CLIENT_ID,
    },
  },
  cache: {
    enabled: true,
    defaultTTLMinutes: 30, // 30 minutes for regular products
    formulaTTLMinutes: 15, // 15 minutes for formula (critical)
    maxCacheSize: 10000, // Max cache entries
  },
  rateLimits: {
    walmart: {
      requestsPerDay: 5000, // Walmart free tier
      burstSize: 10,
    },
    kroger: {
      requestsPerDay: 10000, // Estimated Kroger limit
      burstSize: 20,
    },
  },
  retryConfig: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
  },
};

/**
 * Configuration Manager
 */
export class InventoryConfigManager {
  private static instance: InventoryConfigManager;
  private config: InventoryServiceConfig;

  private constructor(config?: Partial<InventoryServiceConfig>) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);
    this.validate();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<InventoryServiceConfig>): InventoryConfigManager {
    if (!InventoryConfigManager.instance) {
      InventoryConfigManager.instance = new InventoryConfigManager(config);
    }
    return InventoryConfigManager.instance;
  }

  /**
   * Get full configuration
   */
  getConfig(): InventoryServiceConfig {
    return { ...this.config };
  }

  /**
   * Get Walmart configuration
   */
  getWalmartConfig(): WalmartConfig | null {
    return this.config.retailers.walmart?.enabled ? this.config.retailers.walmart : null;
  }

  /**
   * Get Kroger configuration
   */
  getKrogerConfig(): KrogerConfig | null {
    return this.config.retailers.kroger?.enabled ? this.config.retailers.kroger : null;
  }

  /**
   * Get cache configuration
   */
  getCacheConfig(): CacheConfig {
    return { ...this.config.cache };
  }

  /**
   * Get rate limit configuration for a retailer
   */
  getRateLimitConfig(retailer: RetailerApiType): RateLimitConfig | null {
    return this.config.rateLimits[retailer] || null;
  }

  /**
   * Get retry configuration
   */
  getRetryConfig() {
    return { ...this.config.retryConfig };
  }

  /**
   * Check if a retailer is enabled
   */
  isRetailerEnabled(retailer: RetailerApiType): boolean {
    const config = this.config.retailers[retailer];
    return config?.enabled ?? false;
  }

  /**
   * Get list of enabled retailers
   */
  getEnabledRetailers(): RetailerApiType[] {
    const enabled: RetailerApiType[] = [];

    if (this.config.retailers.walmart?.enabled) {
      enabled.push('walmart');
    }
    if (this.config.retailers.kroger?.enabled) {
      enabled.push('kroger');
    }

    return enabled;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<InventoryServiceConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.validate();
  }

  /**
   * Validate configuration
   */
  private validate(): void {
    const errors: string[] = [];

    // Validate Walmart config if enabled
    if (this.config.retailers.walmart?.enabled) {
      const walmart = this.config.retailers.walmart;
      if (!walmart.clientId) {
        errors.push('Walmart client ID is required when Walmart is enabled');
      }
      if (!walmart.clientSecret) {
        errors.push('Walmart client secret is required when Walmart is enabled');
      }
    }

    // Validate Kroger config if enabled
    if (this.config.retailers.kroger?.enabled) {
      const kroger = this.config.retailers.kroger;
      if (!kroger.clientId) {
        errors.push('Kroger client ID is required when Kroger is enabled');
      }
      if (!kroger.clientSecret) {
        errors.push('Kroger client secret is required when Kroger is enabled');
      }
    }

    // Validate cache config
    if (this.config.cache.defaultTTLMinutes <= 0) {
      errors.push('Cache TTL must be greater than 0');
    }
    if (this.config.cache.formulaTTLMinutes <= 0) {
      errors.push('Formula cache TTL must be greater than 0');
    }

    // Validate retry config
    if (this.config.retryConfig.maxAttempts < 1) {
      errors.push('Max retry attempts must be at least 1');
    }

    if (errors.length > 0) {
      throw new Error(`Invalid inventory configuration:\n${errors.join('\n')}`);
    }
  }

  /**
   * Merge configurations
   */
  private mergeConfig(
    base: InventoryServiceConfig,
    updates?: Partial<InventoryServiceConfig>
  ): InventoryServiceConfig {
    if (!updates) {
      return { ...base };
    }

    return {
      retailers: {
        ...base.retailers,
        ...updates.retailers,
      },
      cache: {
        ...base.cache,
        ...updates.cache,
      },
      rateLimits: {
        ...base.rateLimits,
        ...updates.rateLimits,
      },
      retryConfig: {
        ...base.retryConfig,
        ...updates.retryConfig,
      },
    };
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Load configuration from environment variables
   */
  static fromEnvironment(): InventoryConfigManager {
    return new InventoryConfigManager({
      retailers: {
        walmart: {
          clientId: process.env.WALMART_CLIENT_ID || '',
          clientSecret: process.env.WALMART_CLIENT_SECRET || '',
          apiKey: process.env.WALMART_API_KEY,
          enabled: !!process.env.WALMART_CLIENT_ID && !!process.env.WALMART_CLIENT_SECRET,
        },
        kroger: {
          clientId: process.env.KROGER_CLIENT_ID || '',
          clientSecret: process.env.KROGER_CLIENT_SECRET || '',
          enabled: !!process.env.KROGER_CLIENT_ID && !!process.env.KROGER_CLIENT_SECRET,
        },
      },
    });
  }
}

/**
 * Get default configuration instance
 */
export function getInventoryConfig(): InventoryConfigManager {
  return InventoryConfigManager.getInstance();
}
