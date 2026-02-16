/**
 * Kroger API Integration
 * Provides real-time store locations and product availability for WIC formulas
 * via Kroger's public developer API.
 *
 * Kroger family banners: Kroger (MI, NC), Harris Teeter (NC), Fred Meyer (OR), QFC (OR)
 */

import { inventorySyncService } from './InventorySyncService';
import pool from '../config/database';

interface KrogerConfig {
  clientId: string;
  clientSecret: string;
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

interface KrogerLocation {
  locationId: string;
  chain: string;
  name: string;
  address: {
    addressLine1: string;
    city: string;
    state: string;
    zipCode: string;
    county: string;
  };
  geolocation: {
    latitude: number;
    longitude: number;
  };
  phone: string;
  departments: string[];
}

interface KrogerProduct {
  productId: string;
  upc: string;
  description: string;
  brand: string;
  items: Array<{
    itemId: string;
    inventory?: {
      stockLevel: string; // 'HIGH' | 'LOW' | 'TEMPORARILY_OUT_OF_STOCK' | null
    };
    price?: {
      regular: number;
      promo: number;
    };
    size: string;
  }>;
}

// In-memory cache for rate limit protection
const availabilityCache = new Map<string, { data: InventoryData; expiry: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Zip-level cache to avoid re-querying the locations API for known areas
// Key: 5-digit zip prefix, Value: expiry timestamp
const discoveredZips = new Map<string, number>();
const ZIP_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class KrogerIntegration {
  private config: KrogerConfig;
  private baseUrl = 'https://api.kroger.com';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: KrogerConfig) {
    this.config = config;
  }

  /**
   * OAuth2 client credentials flow
   */
  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const authString = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64');

    const response = await fetch(`${this.baseUrl}/v1/connect/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=product.compact',
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Kroger auth failed: ${response.status} ${text}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    // Cache token at 95% of its lifetime
    this.tokenExpiry = Date.now() + data.expires_in * 950;

    return this.accessToken;
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    const token = await this.authenticate();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (response.status === 429) {
      throw new Error('Kroger rate limit exceeded');
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Kroger API ${response.status}: ${text}`);
    }

    return await response.json() as T;
  }

  /**
   * Search for Kroger-family store locations near a zip code
   */
  async searchStores(
    zip: string,
    radiusMiles: number = 50,
    chain?: string,
    limit: number = 50
  ): Promise<KrogerLocation[]> {
    let endpoint = `/v1/locations?filter.zipCode.near=${zip}&filter.radiusInMiles=${radiusMiles}&filter.limit=${limit}`;
    if (chain) {
      endpoint += `&filter.chain=${chain}`;
    }

    const data = await this.makeRequest<{ data: any[] }>(endpoint);

    return (data.data || []).map((loc: any) => ({
      locationId: loc.locationId,
      chain: loc.chain?.toLowerCase() || 'kroger',
      name: loc.name,
      address: {
        addressLine1: loc.address?.addressLine1 || '',
        city: loc.address?.city || '',
        state: loc.address?.state || '',
        zipCode: loc.address?.zipCode || '',
        county: loc.address?.county || '',
      },
      geolocation: {
        latitude: loc.geolocation?.latitude || 0,
        longitude: loc.geolocation?.longitude || 0,
      },
      phone: loc.phone || '',
      departments: (loc.departments || []).map((d: any) => d.name),
    }));
  }

  /**
   * Search products by term with optional store-specific availability
   */
  async searchProducts(
    term: string,
    locationId?: string,
    limit: number = 10
  ): Promise<KrogerProduct[]> {
    let endpoint = `/v1/products?filter.term=${encodeURIComponent(term)}&filter.limit=${limit}`;
    if (locationId) {
      endpoint += `&filter.locationId=${locationId}`;
    }

    const data = await this.makeRequest<{ data: any[] }>(endpoint);

    return (data.data || []).map((prod: any) => ({
      productId: prod.productId,
      upc: prod.upc,
      description: prod.description,
      brand: prod.brand,
      items: (prod.items || []).map((item: any) => ({
        itemId: item.itemId,
        inventory: item.inventory ? { stockLevel: item.inventory.stockLevel } : undefined,
        price: item.price ? { regular: item.price.regular, promo: item.price.promo } : undefined,
        size: item.size || '',
      })),
    }));
  }

  /**
   * Get a specific product by ID
   */
  async getProduct(productId: string, locationId?: string): Promise<KrogerProduct | null> {
    let endpoint = `/v1/products/${productId}`;
    if (locationId) {
      endpoint += `?filter.locationId=${locationId}`;
    }

    try {
      const data = await this.makeRequest<{ data: any }>(endpoint);
      const prod = data.data;
      if (!prod) return null;

      return {
        productId: prod.productId,
        upc: prod.upc,
        description: prod.description,
        brand: prod.brand,
        items: (prod.items || []).map((item: any) => ({
          itemId: item.itemId,
          inventory: item.inventory ? { stockLevel: item.inventory.stockLevel } : undefined,
          price: item.price ? { regular: item.price.regular, promo: item.price.promo } : undefined,
          size: item.size || '',
        })),
      };
    } catch {
      return null;
    }
  }

  /**
   * Map Kroger stock level to our inventory status
   */
  private mapStockStatus(stockLevel: string | undefined): InventoryData['status'] {
    if (!stockLevel) return 'unknown';
    switch (stockLevel.toUpperCase()) {
      case 'HIGH':
        return 'in_stock';
      case 'LOW':
        return 'low_stock';
      case 'TEMPORARILY_OUT_OF_STOCK':
        return 'out_of_stock';
      default:
        return 'unknown';
    }
  }

  /**
   * Map stock level to quantity range
   */
  private mapQuantityRange(stockLevel: string | undefined): InventoryData['quantityRange'] {
    if (!stockLevel) return undefined;
    switch (stockLevel.toUpperCase()) {
      case 'HIGH':
        return 'plenty';
      case 'LOW':
        return 'few';
      default:
        return undefined;
    }
  }

  /**
   * Check formula availability at a specific Kroger store.
   * Uses in-memory cache to avoid burning rate limits.
   */
  async checkFormulaAvailability(
    upc: string,
    krogerLocationId: string,
    storeId: string
  ): Promise<InventoryData | null> {
    // Check cache first
    const cacheKey = `${krogerLocationId}:${upc}`;
    const cached = availabilityCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return { ...cached.data, storeId };
    }

    try {
      let products = await this.searchProducts(upc, krogerLocationId, 5);

      // Retry with 12-digit UPC-A if 13-digit GTIN returned no results
      if (products.length === 0 && upc.length === 13 && upc.startsWith('0')) {
        products = await this.searchProducts(upc.substring(1), krogerLocationId, 5);
      }

      // Find exact or close UPC match
      const match = products.find(p =>
        p.upc === upc || p.upc === upc.substring(1) || p.upc === '0' + upc
      ) || products[0];
      if (!match || match.items.length === 0) {
        return null;
      }

      const item = match.items[0];
      const status = this.mapStockStatus(item.inventory?.stockLevel);
      const quantityRange = this.mapQuantityRange(item.inventory?.stockLevel);

      const result: InventoryData = {
        storeId,
        upc,
        status,
        quantityRange,
        source: 'api',
        confidence: status !== 'unknown' ? 90 : 50,
      };

      // Cache result
      availabilityCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });

      return result;
    } catch (error) {
      console.error(`Kroger availability check failed for ${upc} at ${krogerLocationId}:`, error);
      return null;
    }
  }

  /**
   * Batch sync formula inventory across Kroger stores.
   * Reads formula UPCs from wic_formulas and writes results via inventorySyncService.
   */
  async syncFormulaInventory(storeIds: string[], maxUpcs?: number): Promise<{
    jobId: number;
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    // Get formula UPCs from database
    const upcLimit = maxUpcs || 50;
    const formulaResult = await pool.query(
      `SELECT DISTINCT upc FROM wic_formulas WHERE active = true LIMIT $1`,
      [upcLimit]
    );
    const upcs = formulaResult.rows.map((row: any) => row.upc);

    if (upcs.length === 0) {
      console.log('No active formula UPCs found in database');
      return { jobId: 0, processed: 0, succeeded: 0, failed: 0 };
    }

    console.log(`Syncing ${upcs.length} formulas across ${storeIds.length} Kroger stores`);

    const inventories: InventoryData[] = [];

    // Log first store/UPC for debugging
    const firstStoreId = storeIds[0];
    const rawLocationId = firstStoreId.replace(/^kroger-/, '');
    console.log(`[DEBUG] First store: ${firstStoreId}, raw locationId: ${rawLocationId}, padded: ${rawLocationId.padStart(8, '0')}`);
    console.log(`[DEBUG] First 3 UPCs: ${upcs.slice(0, 3).join(', ')}`);

    for (const storeId of storeIds) {
      // Extract Kroger location ID from our store_id format (kroger-XXXXX)
      // Kroger API requires 8-character zero-padded location IDs
      const krogerLocationId = storeId.replace(/^kroger-/, '').padStart(8, '0');

      for (const upc of upcs) {
        // Debug: isolate whether the problem is locationId, UPC, or both
        if (storeId === storeIds[0] && upc === upcs[0]) {
          console.log(`[DEBUG] Calling checkFormulaAvailability(${upc}, ${krogerLocationId}, ${storeId})`);
          try {
            // Test 1: UPC search WITHOUT locationId — does the product exist at all?
            const noLocProducts = await this.searchProducts(upc, undefined, 5);
            console.log(`[DEBUG] Test 1 - UPC "${upc}" without locationId: ${noLocProducts.length} products`);
            if (noLocProducts.length > 0) {
              console.log(`[DEBUG]   First: upc=${noLocProducts[0].upc} desc="${noLocProducts[0].description}"`);
            }
            // Test 1b: 12-digit retry without locationId
            if (noLocProducts.length === 0 && upc.startsWith('0')) {
              const noLoc12 = await this.searchProducts(upc.substring(1), undefined, 5);
              console.log(`[DEBUG] Test 1b - UPC "${upc.substring(1)}" without locationId: ${noLoc12.length} products`);
            }

            // Test 2: generic term WITH locationId — is the locationId valid?
            const genericProducts = await this.searchProducts('baby formula', krogerLocationId, 3);
            console.log(`[DEBUG] Test 2 - "baby formula" at locationId ${krogerLocationId}: ${genericProducts.length} products`);
            if (genericProducts.length > 0) {
              console.log(`[DEBUG]   First: upc=${genericProducts[0].upc} desc="${genericProducts[0].description}"`);
            }

            // Test 3: UPC WITH locationId (original call)
            const withLoc = await this.searchProducts(upc, krogerLocationId, 5);
            console.log(`[DEBUG] Test 3 - UPC "${upc}" at locationId ${krogerLocationId}: ${withLoc.length} products`);
          } catch (debugErr) {
            console.log(`[DEBUG] Error: ${debugErr}`);
          }
        }

        const inventory = await this.checkFormulaAvailability(upc, krogerLocationId, storeId);
        if (inventory) {
          inventories.push(inventory);
        }

        // Rate limit: 250ms between calls
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }

    console.log(`Fetched ${inventories.length} inventory records`);

    const result = await inventorySyncService.syncInventoryBatch(inventories, 'kroger');
    return result;
  }

  /**
   * Get Kroger-family stores from database
   */
  async getKrogerStores(limit: number = 50): Promise<string[]> {
    const result = await pool.query(
      `SELECT store_id FROM stores
       WHERE store_id LIKE 'kroger-%'
         AND active = TRUE
       LIMIT $1`,
      [limit]
    );
    return result.rows.map((row: any) => row.store_id);
  }

  /**
   * Map Kroger chain name to our normalized chain value
   */
  static mapChainName(krogerChain: string): string {
    const chain = krogerChain.toLowerCase();
    if (chain.includes('harris') || chain.includes('teeter')) return 'harris-teeter';
    if (chain.includes('fred') || chain.includes('meyer')) return 'fred-meyer';
    if (chain.includes('qfc')) return 'qfc';
    return 'kroger';
  }

  /**
   * Discover and persist Kroger stores near a zip code on demand.
   * Skips if we've already discovered stores for this zip within 24h.
   * Returns the number of newly inserted stores.
   */
  async discoverStoresNear(zip: string, radiusMiles: number = 25): Promise<number> {
    // Check zip-level cache — skip if we've queried this area recently
    const zipPrefix = zip.substring(0, 5);
    const cached = discoveredZips.get(zipPrefix);
    if (cached && Date.now() < cached) {
      return 0;
    }

    // Also check DB — if we already have Kroger stores in this zip, mark as discovered
    const existingResult = await pool.query(
      `SELECT COUNT(*) as count FROM stores
       WHERE store_id LIKE 'kroger-%' AND zip = $1 AND active = TRUE`,
      [zipPrefix]
    );
    if (parseInt(existingResult.rows[0].count) > 0) {
      discoveredZips.set(zipPrefix, Date.now() + ZIP_CACHE_TTL_MS);
      return 0;
    }

    let totalInserted = 0;

    try {
      const locations = await this.searchStores(zip, radiusMiles, undefined, 20);

      for (const loc of locations) {
        const storeId = `kroger-${loc.locationId}`;
        const chainName = KrogerIntegration.mapChainName(loc.chain);

        try {
          const result = await pool.query(
            `INSERT INTO stores
             (store_id, chain, name, street_address, city, state, zip, latitude, longitude, phone, wic_authorized, active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, TRUE)
             ON CONFLICT (store_id) DO NOTHING
             RETURNING store_id`,
            [
              storeId,
              chainName,
              loc.name,
              loc.address.addressLine1,
              loc.address.city,
              loc.address.state,
              loc.address.zipCode,
              loc.geolocation.latitude,
              loc.geolocation.longitude,
              loc.phone,
            ]
          );
          if (result.rows.length > 0) {
            totalInserted++;
          }
        } catch {
          // Skip individual store errors
        }
      }

      console.log(`Kroger discovery: found ${locations.length} stores near ${zip}, inserted ${totalInserted} new`);
    } catch (error) {
      console.error(`Kroger store discovery failed for zip ${zip}:`, error);
    }

    // Mark zip as discovered regardless of result (avoid hammering on errors)
    discoveredZips.set(zipPrefix, Date.now() + ZIP_CACHE_TTL_MS);

    return totalInserted;
  }

  /**
   * Factory method — returns null if credentials aren't configured
   */
  static fromEnvironment(): KrogerIntegration | null {
    const clientId = process.env.KROGER_CLIENT_ID;
    const clientSecret = process.env.KROGER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.warn('Kroger API credentials not configured');
      return null;
    }

    return new KrogerIntegration({ clientId, clientSecret });
  }
}

// Export singleton (null if no credentials)
export const krogerIntegration = KrogerIntegration.fromEnvironment();
