/**
 * Walmart Inventory Integration (Backend)
 * Integrates Walmart API client with backend database services
 */

import { inventorySyncService } from './InventorySyncService';
import pool from '../config/database';

// Import from frontend implementation
// In production, these would be in a shared package or backend would have its own implementation
interface WalmartConfig {
  clientId: string;
  clientSecret: string;
  apiKey?: string;
}

interface InventoryData {
  storeId: string;
  upc: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
  quantity?: number;
  quantityRange?: 'few' | 'some' | 'plenty';
  aisle?: string;
  source: 'api';
  confidence: number;
}

export class WalmartInventoryIntegration {
  private config: WalmartConfig;
  private baseUrl = 'https://developer.api.walmart.com';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: WalmartConfig) {
    this.config = config;
  }

  /**
   * Authenticate with Walmart API
   */
  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

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
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 950;

    return this.accessToken;
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.authenticate();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'WM_SVC.NAME': 'wic-benefits-app',
        'WM_QOS.CORRELATION_ID': this.generateCorrelationId(),
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 'unknown';
      throw new Error(`Rate limit exceeded. Retry after: ${retryAfter}s`);
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json() as T;
  }

  /**
   * Get product by UPC
   */
  private async getProduct(upc: string): Promise<any> {
    try {
      const response = await this.makeRequest<any>(`/v1/items?upc=${upc}`);
      return response.items?.[0] || null;
    } catch (error) {
      console.error(`Failed to fetch product ${upc}:`, error);
      return null;
    }
  }

  /**
   * Map Walmart stock status
   */
  private mapStockStatus(stock: string): 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown' {
    const stockLower = stock?.toLowerCase() || '';

    if (stockLower.includes('available') || stockLower.includes('in stock')) {
      return 'in_stock';
    }
    if (stockLower.includes('limited') || stockLower.includes('low')) {
      return 'low_stock';
    }
    if (stockLower.includes('out') || stockLower.includes('unavailable')) {
      return 'out_of_stock';
    }
    return 'unknown';
  }

  /**
   * Fetch inventory for a single product at a store
   */
  async fetchInventory(upc: string, storeId: string): Promise<InventoryData | null> {
    try {
      const product = await this.getProduct(upc);

      if (!product) {
        return null;
      }

      return {
        storeId,
        upc,
        status: this.mapStockStatus(product.stock),
        quantity: undefined,
        quantityRange: product.availableOnline ? 'some' : undefined,
        aisle: undefined,
        source: 'api',
        confidence: product.availableOnline ? 85 : 60,
      };
    } catch (error) {
      console.error(`Error fetching inventory for ${upc} at ${storeId}:`, error);
      return null;
    }
  }

  /**
   * Fetch and sync inventory for multiple products
   */
  async syncInventory(storeIds: string[], upcs: string[]): Promise<{
    jobId: number;
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    const inventories: InventoryData[] = [];

    console.log(`Syncing ${upcs.length} products across ${storeIds.length} stores`);

    for (const storeId of storeIds) {
      for (const upc of upcs) {
        const inventory = await this.fetchInventory(upc, storeId);

        if (inventory) {
          inventories.push(inventory);
        }

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }

    console.log(`Fetched ${inventories.length} inventory records`);

    // Sync to database
    const result = await inventorySyncService.syncInventoryBatch(inventories);

    return result;
  }

  /**
   * Sync formula products (high priority)
   */
  async syncFormulaInventory(storeIds: string[]): Promise<void> {
    // Get formula UPCs from database
    const formulaQuery = `
      SELECT DISTINCT upc
      FROM approved_products
      WHERE category = 'Formula'
      LIMIT 50
    `;

    const result = await pool.query(formulaQuery);
    const upcs = result.rows.map(row => row.upc);

    if (upcs.length === 0) {
      console.log('No formula products found in database');
      return;
    }

    console.log(`Syncing ${upcs.length} formula products for ${storeIds.length} stores`);

    await this.syncInventory(storeIds, upcs);
  }

  /**
   * Get Walmart stores from database
   */
  async getWalmartStores(limit: number = 10): Promise<string[]> {
    const query = `
      SELECT store_id
      FROM stores
      WHERE store_id LIKE 'walmart-%'
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows.map(row => row.store_id);
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `wic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Factory method to create from environment
   */
  static fromEnvironment(): WalmartInventoryIntegration | null {
    const clientId = process.env.WALMART_CLIENT_ID;
    const clientSecret = process.env.WALMART_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.warn('Walmart API credentials not configured');
      return null;
    }

    return new WalmartInventoryIntegration({
      clientId,
      clientSecret,
      apiKey: process.env.WALMART_API_KEY,
    });
  }
}

// Export singleton
export const walmartInventoryIntegration = WalmartInventoryIntegration.fromEnvironment();
