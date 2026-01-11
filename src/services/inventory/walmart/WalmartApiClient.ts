/**
 * Walmart API Client
 * Handles authentication and low-level API calls to Walmart's API
 */

import {
  WalmartAPI,
  AuthenticationError,
  InventoryAPIError,
  RateLimitError,
} from '../../../types/inventory.types';

interface WalmartApiClientConfig {
  clientId: string;
  clientSecret: string;
  apiKey?: string;
  baseUrl?: string;
}

export class WalmartApiClient {
  private config: WalmartApiClientConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private readonly baseUrl: string;

  constructor(config: WalmartApiClientConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://developer.api.walmart.com';
  }

  /**
   * Authenticate with Walmart API using OAuth 2.0
   */
  async authenticate(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api-proxy/service/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${this.encodeCredentials()}`,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) {
        throw new AuthenticationError('walmart');
      }

      const data: WalmartAPI.TokenResponse = await response.json();
      this.accessToken = data.access_token;

      // Set token expiry (with 5 minute buffer)
      const expiresInMs = (data.expires_in - 300) * 1000;
      this.tokenExpiresAt = new Date(Date.now() + expiresInMs);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('walmart');
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiresAt || new Date() >= this.tokenExpiresAt) {
      await this.authenticate();
    }
  }

  /**
   * Get product information by UPC
   */
  async getProduct(upc: string): Promise<WalmartAPI.ProductResponse> {
    await this.ensureAuthenticated();

    const url = `${this.baseUrl}/api-proxy/service/affil/product/v2/items`;
    const params = new URLSearchParams({
      upc: upc,
      format: 'json',
    });

    try {
      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError('walmart', retryAfter ? parseInt(retryAfter) : undefined);
      }

      if (!response.ok) {
        throw new InventoryAPIError(
          `Walmart API error: ${response.statusText}`,
          'WALMART_API_ERROR',
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
        `Failed to fetch product from Walmart: ${error}`,
        'WALMART_FETCH_ERROR',
        'walmart'
      );
    }
  }

  /**
   * Get store inventory for a product (Note: May require Marketplace API partnership)
   */
  async getStoreInventory(
    itemId: string,
    storeId: string
  ): Promise<WalmartAPI.StoreInventoryResponse | null> {
    await this.ensureAuthenticated();

    // Note: This endpoint may not be available in the Affiliate API
    // and may require Marketplace API access or a partnership
    const url = `${this.baseUrl}/api-proxy/service/affil/product/v2/stores/${storeId}/items/${itemId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 404 || response.status === 403) {
        // Store inventory may not be available via this API
        return null;
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError('walmart', retryAfter ? parseInt(retryAfter) : undefined);
      }

      if (!response.ok) {
        return null; // Gracefully handle unavailable endpoint
      }

      return await response.json();
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      // Gracefully return null if store inventory is not available
      return null;
    }
  }

  /**
   * Search products by keyword
   */
  async searchProducts(query: string, limit: number = 10): Promise<WalmartAPI.ProductResponse> {
    await this.ensureAuthenticated();

    const url = `${this.baseUrl}/api-proxy/service/affil/product/v2/search`;
    const params = new URLSearchParams({
      query: query,
      format: 'json',
      numItems: limit.toString(),
    });

    try {
      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError('walmart', retryAfter ? parseInt(retryAfter) : undefined);
      }

      if (!response.ok) {
        throw new InventoryAPIError(
          `Walmart API search error: ${response.statusText}`,
          'WALMART_SEARCH_ERROR',
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
        `Failed to search Walmart products: ${error}`,
        'WALMART_SEARCH_ERROR',
        'walmart'
      );
    }
  }

  /**
   * Get request headers with authentication
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    if (this.config.apiKey) {
      headers['WM_SEC.KEY_VERSION'] = '1';
      headers['WM_CONSUMER.ID'] = this.config.clientId;
      // Note: Signature generation would be needed for some endpoints
    }

    return headers;
  }

  /**
   * Encode client credentials for Basic Auth
   */
  private encodeCredentials(): string {
    const credentials = `${this.config.clientId}:${this.config.clientSecret}`;

    // In a browser environment, use btoa
    if (typeof btoa !== 'undefined') {
      return btoa(credentials);
    }

    // In Node.js environment, use Buffer
    return Buffer.from(credentials).toString('base64');
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return !!(
      this.accessToken &&
      this.tokenExpiresAt &&
      new Date() < this.tokenExpiresAt
    );
  }

  /**
   * Clear authentication state
   */
  clearAuthentication(): void {
    this.accessToken = null;
    this.tokenExpiresAt = null;
  }
}
