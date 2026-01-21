/**
 * UPC Database API Client
 *
 * Integrates with UPC Database (https://upcdatabase.org)
 * - Secondary data source for products not in Open Food Facts
 * - Requires API key (free tier available)
 * - Good coverage of US retail products
 */

import { Product } from '../../types/product.types';

/**
 * UPC Database API Response
 * Raw response structure from the API
 */
interface UPCDatabaseResponse {
  code: string;
  total: number;
  offset: number;
  items?: UPCDatabaseItem[];
}

/**
 * UPC Database Item Structure
 */
interface UPCDatabaseItem {
  ean: string;
  title: string;
  description?: string;
  brand?: string;
  model?: string;
  category?: string;
  upc?: string;
  elid?: string;
  asin?: string;
  color?: string;
  size?: string;
  dimension?: string;
  weight?: string;
  currency?: string;
  lowest_recorded_price?: number;
  highest_recorded_price?: number;
  images?: string[];
  offers?: Array<{
    merchant?: string;
    domain?: string;
    title?: string;
    currency?: string;
    list_price?: string;
    price?: number;
    shipping?: string;
    condition?: string;
    availability?: string;
    link?: string;
    updated_t?: number;
  }>;
}

/**
 * Configuration for UPC Database API
 */
interface UPCDatabaseConfig {
  /** API key (required) */
  apiKey: string;
  /** API base URL */
  baseUrl: string;
  /** Request timeout (ms) */
  timeout: number;
}

/**
 * Default configuration (requires API key to be set)
 */
const DEFAULT_CONFIG: Partial<UPCDatabaseConfig> = {
  baseUrl: 'https://api.upcdatabase.org',
  timeout: 5000,
};

/**
 * UPC Database API Client
 */
export class UPCDatabaseClient {
  private config: UPCDatabaseConfig;

  constructor(apiKey: string, config?: Partial<UPCDatabaseConfig>) {
    if (!apiKey) {
      throw new Error('UPC Database API key is required');
    }

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      apiKey,
    } as UPCDatabaseConfig;
  }

  /**
   * Fetch product by UPC
   *
   * @param upc - Universal Product Code (normalized)
   * @returns Product if found, null if not found
   * @throws Error if API request fails
   */
  async getProduct(upc: string): Promise<Product | null> {
    const url = `${this.config.baseUrl}/product/${upc}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (response.status === 404) {
        return null; // Product not found
      }

      if (!response.ok) {
        throw new Error(`UPC Database API error: ${response.status} ${response.statusText}`);
      }

      const data: UPCDatabaseResponse = await response.json();

      // No items found
      if (!data.items || data.items.length === 0) {
        return null;
      }

      // Transform first item to our Product schema
      return this.transformProduct(data.items[0]);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('UPC Database request timeout');
      }
      throw error;
    }
  }

  /**
   * Search products by text query
   *
   * @param query - Search query
   * @param offset - Result offset for pagination
   * @param limit - Maximum results to return
   * @returns Array of matching products
   */
  async searchProducts(
    query: string,
    offset: number = 0,
    limit: number = 20
  ): Promise<Product[]> {
    const url = `${this.config.baseUrl}/search/${encodeURIComponent(query)}`;
    const params = new URLSearchParams({
      offset: offset.toString(),
      limit: limit.toString(),
    });

    try {
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`UPC Database API error: ${response.status} ${response.statusText}`);
      }

      const data: UPCDatabaseResponse = await response.json();

      if (!data.items || data.items.length === 0) {
        return [];
      }

      return data.items
        .map(item => this.transformProduct(item))
        .filter((p: Product | null): p is Product => p !== null);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('UPC Database request timeout');
      }
      throw error;
    }
  }

  /**
   * Transform UPC Database item to our Product schema
   *
   * @param item - Raw UPC Database item
   * @returns Normalized Product object
   */
  private transformProduct(item: UPCDatabaseItem): Product | null {
    // Must have UPC and title
    if (!item.ean && !item.upc) {
      return null;
    }
    if (!item.title) {
      return null;
    }

    const upc = item.ean || item.upc!;
    const brand = item.brand || 'Unknown Brand';
    const category = this.extractCategory(item);
    const { size, sizeUnit, sizeOz } = this.extractSize(item);
    const imageUrl = this.extractImage(item);

    return {
      upc,
      name: item.title,
      brand,
      manufacturer: item.brand, // UPC Database doesn't distinguish manufacturer
      category,
      size,
      sizeUnit,
      sizeOz,
      imageUrl,
      thumbnailUrl: imageUrl, // UPC Database doesn't provide separate thumbnails
      ingredients: undefined, // UPC Database doesn't include ingredients
      nutrition: undefined, // UPC Database doesn't include nutrition
      allergens: undefined, // UPC Database doesn't include allergens
      isOrganic: false, // Can't determine from UPC Database
      isGeneric: this.isGeneric(brand),
      dataSource: 'upc_database',
      lastUpdated: new Date(),
      verified: false,
      metadata: {
        description: item.description,
        model: item.model,
        asin: item.asin,
        elid: item.elid,
        dimension: item.dimension,
        weight: item.weight,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Extract category from UPC Database item
   */
  private extractCategory(item: UPCDatabaseItem): string[] {
    if (item.category) {
      // UPC Database category is usually a single string
      return item.category.split('>').map(c => c.trim());
    }
    return ['Unknown'];
  }

  /**
   * Extract size information from UPC Database item
   *
   * Size info may be in 'size', 'weight', or 'dimension' fields
   */
  private extractSize(item: UPCDatabaseItem): {
    size: string;
    sizeUnit: string;
    sizeOz?: number;
  } {
    // Try size field first
    if (item.size) {
      const parsed = this.parseSize(item.size);
      if (parsed) return parsed;
    }

    // Try weight field
    if (item.weight) {
      const parsed = this.parseSize(item.weight);
      if (parsed) return parsed;
    }

    // Default
    return { size: '0', sizeUnit: 'oz' };
  }

  /**
   * Parse size string into components
   */
  private parseSize(sizeStr: string): {
    size: string;
    sizeUnit: string;
    sizeOz?: number;
  } | null {
    const match = sizeStr.match(/^([\d.]+)\s*([a-zA-Z ]+)$/);
    if (match) {
      const size = match[1];
      const unit = match[2].trim().toLowerCase();
      const sizeUnit = this.normalizeUnit(unit);
      const sizeOz = this.convertToOunces(parseFloat(size), sizeUnit);

      return { size, sizeUnit, sizeOz };
    }
    return null;
  }

  /**
   * Normalize size unit to standard abbreviations
   */
  private normalizeUnit(unit: string): string {
    const normalized = unit.toLowerCase().replace(/\s+/g, '');

    const unitMap: Record<string, string> = {
      'oz': 'oz',
      'floz': 'oz',
      'ounce': 'oz',
      'ounces': 'oz',
      'lb': 'lb',
      'lbs': 'lb',
      'pound': 'lb',
      'pounds': 'lb',
      'gal': 'gal',
      'gallon': 'gal',
      'gallons': 'gal',
      'qt': 'qt',
      'quart': 'qt',
      'quarts': 'qt',
      'pt': 'pt',
      'pint': 'pt',
      'pints': 'pt',
      'ml': 'ml',
      'milliliter': 'ml',
      'milliliters': 'ml',
      'l': 'l',
      'liter': 'l',
      'liters': 'l',
      'g': 'g',
      'gram': 'g',
      'grams': 'g',
      'kg': 'kg',
      'kilogram': 'kg',
      'kilograms': 'kg',
    };

    return unitMap[normalized] || unit;
  }

  /**
   * Convert size to ounces for standardized comparison
   */
  private convertToOunces(size: number, unit: string): number {
    const conversionFactors: Record<string, number> = {
      'oz': 1,
      'lb': 16,
      'gal': 128,
      'qt': 32,
      'pt': 16,
      'ml': 0.033814,
      'l': 33.814,
      'g': 0.035274,
      'kg': 35.274,
    };

    return size * (conversionFactors[unit] || 1);
  }

  /**
   * Extract image URL from UPC Database item
   */
  private extractImage(item: UPCDatabaseItem): string | undefined {
    if (item.images && item.images.length > 0) {
      return item.images[0];
    }
    return undefined;
  }

  /**
   * Determine if product is a generic/store brand
   */
  private isGeneric(brand: string): boolean {
    const genericBrands = [
      'great value',
      'kirkland',
      'kroger',
      'safeway',
      'albertsons',
      'target',
      'walmart',
      'amazon basics',
      'trader joe\'s',
      'whole foods 365',
      '365',
      'store brand',
      'generic',
    ];

    const brandLower = brand.toLowerCase();
    return genericBrands.some(gb => brandLower.includes(gb));
  }
}
