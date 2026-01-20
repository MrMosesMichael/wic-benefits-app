/**
 * Walmart API Client
 * Handles authentication and API requests to Walmart Open API
 * Docs: https://developer.walmart.com/
 */

import {
  Inventory,
  WalmartAPI,
  InventoryAPIError,
  RateLimitError,
  AuthenticationError,
  ProductNotFoundError,
} from '../../types/inventory.types';
import { RateLimiter } from './RateLimiter';

export class WalmartApiClient {
  private readonly baseUrl = 'https://developer.api.walmart.com';
  private readonly config: WalmartAPI.AuthConfig;
  private rateLimiter: RateLimiter;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: WalmartAPI.AuthConfig) {
    this.config = config;

    // Walmart API typically allows 5,000 requests per day per API key
    // We'll be conservative and limit to 4,000/day = ~2.78 per minute
    this.rateLimiter = new RateLimiter({
      requestsPerDay: 4000,
      burstSize: 10,
    });
  }

  /**
   * Authenticate with Walmart API to get access token
   * Required for certain API endpoints
   */
  private async authenticate(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      // Walmart uses OAuth 2.0 client credentials flow
      const authString = Buffer.from(
        `${this.config.clientId}:${this.config.clientSecret}`
      ).toString('base64');

      const response = await fetch(`${this.baseUrl}/v3/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'WM_SVC.NAME': 'wic-benefits-app',
          'WM_QOS.CORRELATION_ID': this.generateCorrelationId(),
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new AuthenticationError('walmart');
      }

      const data: WalmartAPI.TokenResponse = await response.json();

      this.accessToken = data.access_token;
      // Set expiry to 95% of actual expiry for safety margin
      this.tokenExpiry = Date.now() + data.expires_in * 950;

      return this.accessToken;
    } catch (error) {
      console.error('Walmart authentication failed:', error);
      throw new AuthenticationError('walmart');
    }
  }

  /**
   * Make an authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Wait for rate limit token
    await this.rateLimiter.waitAndConsume();

    // Get access token
    const token = await this.authenticate();

    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'WM_SVC.NAME': 'wic-benefits-app',
      'WM_QOS.CORRELATION_ID': this.generateCorrelationId(),
      'Accept': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError(
          'walmart',
          retryAfter ? parseInt(retryAfter) : undefined
        );
      }

      // Handle not found
      if (response.status === 404) {
        const message = await response.text();
        throw new InventoryAPIError(
          message || 'Resource not found',
          'NOT_FOUND',
          'walmart',
          404
        );
      }

      // Handle other errors
      if (!response.ok) {
        const message = await response.text();
        throw new InventoryAPIError(
          message || 'API request failed',
          'REQUEST_FAILED',
          'walmart',
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof InventoryAPIError) {
        throw error;
      }

      throw new InventoryAPIError(
        error instanceof Error ? error.message : 'Unknown error',
        'NETWORK_ERROR',
        'walmart'
      );
    }
  }

  /**
   * Get product information by UPC
   */
  async getProduct(upc: string): Promise<WalmartAPI.ProductItem | null> {
    try {
      const response = await this.makeRequest<WalmartAPI.ProductResponse>(
        `/v1/items?upc=${upc}`
      );

      if (!response.items || response.items.length === 0) {
        return null;
      }

      return response.items[0];
    } catch (error) {
      if (error instanceof InventoryAPIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get inventory status for a product at a store
   * Note: Walmart's public API has limited store-specific inventory data
   * This may require Walmart Affiliate API or store-specific partner agreements
   */
  async getInventory(upc: string, storeId: string): Promise<Inventory> {
    try {
      // First, get basic product info
      const product = await this.getProduct(upc);

      if (!product) {
        throw new ProductNotFoundError('walmart', upc);
      }

      // Determine stock status from product data
      // Note: Walmart's public API typically only shows online availability
      // Store-specific inventory requires special access or partner agreements
      const status = this.mapStockStatus(product.stock);

      const inventory: Inventory = {
        storeId,
        upc,
        status,
        quantity: undefined, // Not typically available in public API
        quantityRange: status === 'in_stock' ? 'some' : undefined,
        aisle: undefined, // Not available in public API
        lastUpdated: new Date(),
        source: 'api',
        confidence: product.availableOnline ? 85 : 60,
      };

      return inventory;
    } catch (error) {
      console.error(`Error fetching Walmart inventory for ${upc}:`, error);
      throw error;
    }
  }

  /**
   * Get inventory for multiple products (batch request)
   * More efficient than individual requests
   */
  async getInventoryBatch(
    upcs: string[],
    storeId: string
  ): Promise<Inventory[]> {
    const inventories: Inventory[] = [];
    const batchSize = 20; // Process in batches to avoid overwhelming the API

    for (let i = 0; i < upcs.length; i += batchSize) {
      const batch = upcs.slice(i, i + batchSize);

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(upc => this.getInventory(upc, storeId))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          inventories.push(result.value);
        } else {
          console.error('Batch inventory request failed:', result.reason);
        }
      }

      // Small delay between batches to be respectful of API limits
      if (i + batchSize < upcs.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return inventories;
  }

  /**
   * Search for products by query
   * Useful for finding WIC-eligible alternatives
   */
  async searchProducts(query: string, limit: number = 10): Promise<WalmartAPI.ProductItem[]> {
    try {
      const response = await this.makeRequest<WalmartAPI.ProductResponse>(
        `/v1/search?query=${encodeURIComponent(query)}`
      );

      return response.items?.slice(0, limit) || [];
    } catch (error) {
      console.error('Product search failed:', error);
      return [];
    }
  }

  /**
   * Map Walmart stock string to our stock status
   */
  private mapStockStatus(stock: string): 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown' {
    const stockLower = stock?.toLowerCase() || '';

    if (stockLower.includes('available') || stockLower.includes('in stock')) {
      return 'in_stock';
    }

    if (stockLower.includes('limited') || stockLower.includes('low')) {
      return 'low_stock';
    }

    if (
      stockLower.includes('out of stock') ||
      stockLower.includes('unavailable') ||
      stockLower.includes('not available')
    ) {
      return 'out_of_stock';
    }

    return 'unknown';
  }

  /**
   * Generate a unique correlation ID for request tracking
   */
  private generateCorrelationId(): string {
    return `wic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get rate limiter status
   */
  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }

  /**
   * Check if a store is a Walmart store
   */
  static isWalmartStore(storeId: string): boolean {
    return storeId.toLowerCase().startsWith('walmart-');
  }

  /**
   * Extract Walmart store number from store ID
   * Example: "walmart-1234" -> "1234"
   */
  static extractStoreNumber(storeId: string): string | null {
    const match = storeId.match(/walmart-(\d+)/i);
    return match ? match[1] : null;
  }
}

/**
 * Factory function to create Walmart API client from environment variables
 */
export function createWalmartClient(): WalmartApiClient | null {
  const clientId = process.env.WALMART_CLIENT_ID;
  const clientSecret = process.env.WALMART_CLIENT_SECRET;
  const apiKey = process.env.WALMART_API_KEY;

  if (!clientId || !clientSecret) {
    console.warn('Walmart API credentials not configured');
    return null;
  }

  return new WalmartApiClient({
    clientId,
    clientSecret,
    apiKey,
  });
}
