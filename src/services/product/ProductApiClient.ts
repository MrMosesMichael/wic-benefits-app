/**
 * Product API Client
 *
 * Client for the product lookup API endpoint (A2.3)
 * Used by mobile app to fetch product information
 *
 * Features:
 * - Product lookup by UPC
 * - Batch product lookup
 * - Product search
 * - Unknown product reporting
 * - Coverage statistics
 */

import {
  Product,
  ProductLookupResult,
  ProductCoverageStats,
} from '../../types/product.types';

/**
 * API configuration
 */
export interface ProductApiConfig {
  /** Base API URL (e.g., http://localhost:3000/api/v1) */
  baseUrl: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** API key (if required) */
  apiKey?: string;
}

/**
 * Standard API response format
 */
interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    responseTime?: number;
    [key: string]: any;
  };
}

/**
 * API error response format
 */
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}

/**
 * Batch lookup request
 */
interface BatchLookupRequest {
  upcs: string[];
}

/**
 * Product report request
 */
interface ProductReportRequest {
  upc: string;
  reportedBy: string;
  userProvidedInfo?: Partial<Product>;
}

/**
 * Search query parameters
 */
interface SearchParams {
  q?: string;
  brand?: string;
  category?: string;
  verified?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Product API Client
 *
 * Provides methods to interact with the product lookup API
 */
export class ProductApiClient {
  private config: Required<ProductApiConfig>;

  constructor(config: ProductApiConfig) {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
      timeout: config.timeout || 10000,
      apiKey: config.apiKey || '',
    };
  }

  /**
   * Get product by UPC
   *
   * @param upc - Universal Product Code
   * @returns Product lookup result
   */
  async getProduct(upc: string): Promise<ProductLookupResult> {
    const url = `${this.config.baseUrl}/products/${upc}`;
    const response = await this.fetch<ProductLookupResult>(url);
    return response.data;
  }

  /**
   * Batch lookup multiple products
   *
   * @param upcs - Array of UPCs (max 100)
   * @returns Array of product lookup results
   */
  async batchLookup(upcs: string[]): Promise<ProductLookupResult[]> {
    if (upcs.length > 100) {
      throw new Error('Maximum 100 UPCs allowed per batch request');
    }

    const url = `${this.config.baseUrl}/products/batch`;
    const body: BatchLookupRequest = { upcs };

    const response = await this.fetch<ProductLookupResult[]>(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  /**
   * Search products
   *
   * @param params - Search parameters
   * @returns Array of matching products
   */
  async searchProducts(params: SearchParams): Promise<Product[]> {
    const queryString = new URLSearchParams();

    if (params.q) queryString.set('q', params.q);
    if (params.brand) queryString.set('brand', params.brand);
    if (params.category) queryString.set('category', params.category);
    if (params.verified !== undefined) {
      queryString.set('verified', params.verified.toString());
    }
    if (params.page) queryString.set('page', params.page.toString());
    if (params.limit) queryString.set('limit', params.limit.toString());

    const url = `${this.config.baseUrl}/products/search?${queryString.toString()}`;
    const response = await this.fetch<Product[]>(url);

    return response.data;
  }

  /**
   * Report unknown product
   *
   * @param upc - UPC not found
   * @param reportedBy - User ID
   * @param userProvidedInfo - Optional product info
   * @returns Report ID
   */
  async reportUnknownProduct(
    upc: string,
    reportedBy: string,
    userProvidedInfo?: Partial<Product>
  ): Promise<string> {
    const url = `${this.config.baseUrl}/products/report`;
    const body: ProductReportRequest = {
      upc,
      reportedBy,
      userProvidedInfo,
    };

    const response = await this.fetch<{ reportId: string }>(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data.reportId;
  }

  /**
   * Get product coverage statistics
   *
   * @returns Coverage statistics
   */
  async getCoverageStats(): Promise<ProductCoverageStats> {
    const url = `${this.config.baseUrl}/products/stats`;
    const response = await this.fetch<ProductCoverageStats>(url);
    return response.data;
  }

  /**
   * Internal fetch wrapper with timeout and error handling
   *
   * @param url - Request URL
   * @param options - Fetch options
   * @returns Parsed API response
   */
  private async fetch<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Add API key to headers if configured
    const headers: Record<string, string> = {
      ...((options.headers || {}) as Record<string, string>),
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const json = await response.json();

      // Check for error response
      if (!response.ok) {
        const error = json as ApiError;
        throw new Error(
          `API Error (${error.error.code}): ${error.error.message}`
        );
      }

      return json as ApiResponse<T>;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(
            `Request timeout after ${this.config.timeout}ms: ${url}`
          );
        }
        throw error;
      }

      throw new Error(`Unknown error fetching ${url}`);
    }
  }
}

/**
 * Default client instance
 *
 * Can be configured via environment variables:
 * - API_BASE_URL: Base API URL
 * - API_KEY: API key (optional)
 */
let defaultClient: ProductApiClient | null = null;

/**
 * Get or create default product API client
 *
 * @returns Default client instance
 */
export function getProductApiClient(): ProductApiClient {
  if (!defaultClient) {
    const baseUrl =
      process.env.API_BASE_URL ||
      process.env.EXPO_PUBLIC_API_BASE_URL ||
      'http://localhost:3000/api/v1';

    const apiKey = process.env.API_KEY || process.env.EXPO_PUBLIC_API_KEY;

    defaultClient = new ProductApiClient({
      baseUrl,
      apiKey,
      timeout: 10000,
    });
  }

  return defaultClient;
}

/**
 * Set default product API client
 *
 * Useful for testing or custom configurations
 *
 * @param client - Client instance to use as default
 */
export function setProductApiClient(client: ProductApiClient): void {
  defaultClient = client;
}
