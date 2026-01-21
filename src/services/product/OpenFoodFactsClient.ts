/**
 * Open Food Facts API Client
 *
 * Integrates with Open Food Facts (https://world.openfoodfacts.org)
 * - Open source product database
 * - Priority data source for WIC products
 * - Free API with good coverage of US products
 */

import { Product, NutritionInfo } from '../../types/product.types';

/**
 * Open Food Facts API Response
 * Raw response structure from the API
 */
interface OpenFoodFactsResponse {
  status: number;
  status_verbose: string;
  code: string;
  product?: OpenFoodFactsProduct;
}

/**
 * Open Food Facts Product Structure
 * Subset of fields we care about from their extensive schema
 */
interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  brands_tags?: string[];
  manufacturer?: string;
  categories?: string;
  categories_tags?: string[];
  quantity?: string;
  image_url?: string;
  image_small_url?: string;
  image_thumb_url?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  allergens?: string;
  allergens_tags?: string[];
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kcal_serving'?: number;
    fat_100g?: number;
    fat_serving?: number;
    'saturated-fat_100g'?: number;
    'saturated-fat_serving'?: number;
    'trans-fat_100g'?: number;
    'trans-fat_serving'?: number;
    cholesterol_100g?: number;
    cholesterol_serving?: number;
    sodium_100g?: number;
    sodium_serving?: number;
    carbohydrates_100g?: number;
    carbohydrates_serving?: number;
    fiber_100g?: number;
    fiber_serving?: number;
    sugars_100g?: number;
    sugars_serving?: number;
    proteins_100g?: number;
    proteins_serving?: number;
    'vitamin-d_100g'?: number;
    'vitamin-d_serving'?: number;
    calcium_100g?: number;
    calcium_serving?: number;
    iron_100g?: number;
    iron_serving?: number;
    potassium_100g?: number;
    potassium_serving?: number;
  };
  nutrient_levels?: {
    fat?: string;
    salt?: string;
    'saturated-fat'?: string;
    sugars?: string;
  };
  serving_size?: string;
  serving_quantity?: string;
  labels?: string;
  labels_tags?: string[];
  states_tags?: string[];
  generic_name?: string;
  last_modified_t?: number;
}

/**
 * Configuration for Open Food Facts API
 */
interface OpenFoodFactsConfig {
  /** API base URL */
  baseUrl: string;
  /** User agent for API requests (required by OFF) */
  userAgent: string;
  /** Request timeout (ms) */
  timeout: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: OpenFoodFactsConfig = {
  baseUrl: 'https://world.openfoodfacts.org/api/v2',
  userAgent: 'WICBenefitsApp/1.0 (https://github.com/MrMosesMichael/wic-benefits-app)',
  timeout: 5000,
};

/**
 * Open Food Facts API Client
 */
export class OpenFoodFactsClient {
  private config: OpenFoodFactsConfig;

  constructor(config?: Partial<OpenFoodFactsConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Fetch product by UPC
   *
   * @param upc - Universal Product Code (normalized)
   * @returns Product if found, null if not found
   * @throws Error if API request fails
   */
  async getProduct(upc: string): Promise<Product | null> {
    const url = `${this.config.baseUrl}/product/${upc}.json`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent,
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Open Food Facts API error: ${response.status} ${response.statusText}`);
      }

      const data: OpenFoodFactsResponse = await response.json();

      // Status 0 = product not found
      if (data.status === 0 || !data.product) {
        return null;
      }

      // Transform to our Product schema
      return this.transformProduct(data.product);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Open Food Facts request timeout');
      }
      throw error;
    }
  }

  /**
   * Batch fetch products by UPCs
   *
   * Note: Open Food Facts doesn't have a batch endpoint,
   * so we make concurrent individual requests
   *
   * @param upcs - Array of UPCs to fetch
   * @returns Array of Products (nulls for not found)
   */
  async getProducts(upcs: string[]): Promise<(Product | null)[]> {
    const promises = upcs.map(upc => this.getProduct(upc));
    return Promise.all(promises);
  }

  /**
   * Search products by text query
   *
   * @param query - Search query (product name, brand, etc.)
   * @param page - Page number (1-indexed)
   * @param pageSize - Results per page
   * @returns Array of matching products
   */
  async searchProducts(
    query: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<Product[]> {
    const url = `${this.config.baseUrl}/search`;
    const params = new URLSearchParams({
      search_terms: query,
      page: page.toString(),
      page_size: pageSize.toString(),
      json: '1',
    });

    try {
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'User-Agent': this.config.userAgent,
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Open Food Facts API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.products || !Array.isArray(data.products)) {
        return [];
      }

      return data.products
        .map((p: OpenFoodFactsProduct) => this.transformProduct(p))
        .filter((p: Product | null): p is Product => p !== null);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Open Food Facts request timeout');
      }
      throw error;
    }
  }

  /**
   * Transform Open Food Facts product to our Product schema
   *
   * @param offProduct - Raw Open Food Facts product
   * @returns Normalized Product object
   */
  private transformProduct(offProduct: OpenFoodFactsProduct): Product | null {
    // Must have UPC and name
    if (!offProduct.code || (!offProduct.product_name && !offProduct.product_name_en)) {
      return null;
    }

    const name = offProduct.product_name_en || offProduct.product_name || 'Unknown Product';
    const brand = this.extractBrand(offProduct);
    const category = this.extractCategory(offProduct);
    const { size, sizeUnit, sizeOz } = this.extractSize(offProduct.quantity);
    const nutrition = this.extractNutrition(offProduct);
    const allergens = this.extractAllergens(offProduct);
    const isOrganic = this.isOrganic(offProduct);

    return {
      upc: offProduct.code,
      name,
      brand,
      manufacturer: offProduct.manufacturer,
      category,
      size,
      sizeUnit,
      sizeOz,
      imageUrl: offProduct.image_url,
      thumbnailUrl: offProduct.image_thumb_url || offProduct.image_small_url,
      ingredients: offProduct.ingredients_text_en || offProduct.ingredients_text,
      nutrition,
      allergens,
      isOrganic,
      isGeneric: this.isGeneric(brand),
      dataSource: 'open_food_facts',
      lastUpdated: offProduct.last_modified_t
        ? new Date(offProduct.last_modified_t * 1000)
        : new Date(),
      verified: false, // Open Food Facts data is crowdsourced
      metadata: {
        offLabels: offProduct.labels_tags || [],
        offStates: offProduct.states_tags || [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Extract brand name from Open Food Facts product
   */
  private extractBrand(product: OpenFoodFactsProduct): string {
    if (product.brands) {
      // Brands field may contain comma-separated list
      const brands = product.brands.split(',').map(b => b.trim());
      return brands[0] || 'Unknown Brand';
    }
    if (product.brands_tags && product.brands_tags.length > 0) {
      return product.brands_tags[0].replace(/^en:/, '') || 'Unknown Brand';
    }
    return 'Unknown Brand';
  }

  /**
   * Extract category hierarchy from Open Food Facts
   */
  private extractCategory(product: OpenFoodFactsProduct): string[] {
    if (product.categories_tags && product.categories_tags.length > 0) {
      // Take the most specific category (last tag)
      const categoryTag = product.categories_tags[product.categories_tags.length - 1];
      const category = categoryTag.replace(/^en:/, '').replace(/-/g, ' ');
      return category.split(':').map(c => c.trim());
    }
    if (product.categories) {
      return product.categories.split(',').map(c => c.trim());
    }
    return ['Unknown'];
  }

  /**
   * Extract size information from quantity string
   *
   * Examples: "1 gal", "128 fl oz", "12.5 oz", "500ml"
   */
  private extractSize(quantity?: string): {
    size: string;
    sizeUnit: string;
    sizeOz?: number;
  } {
    if (!quantity) {
      return { size: '0', sizeUnit: 'oz' };
    }

    // Parse quantity string (e.g., "128 fl oz", "1 gal")
    const match = quantity.match(/^([\d.]+)\s*([a-zA-Z ]+)$/);
    if (match) {
      const size = match[1];
      const unit = match[2].trim().toLowerCase();

      // Normalize unit
      const sizeUnit = this.normalizeUnit(unit);

      // Convert to ounces for comparison
      const sizeOz = this.convertToOunces(parseFloat(size), sizeUnit);

      return { size, sizeUnit, sizeOz };
    }

    return { size: quantity, sizeUnit: 'oz' };
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
   * Extract nutrition information
   */
  private extractNutrition(product: OpenFoodFactsProduct): NutritionInfo | undefined {
    if (!product.nutriments) {
      return undefined;
    }

    const n = product.nutriments;

    return {
      servingSize: product.serving_size || 'Unknown',
      calories: n['energy-kcal_serving'] || n['energy-kcal_100g'],
      totalFat: n.fat_serving || n.fat_100g,
      saturatedFat: n['saturated-fat_serving'] || n['saturated-fat_100g'],
      transFat: n['trans-fat_serving'] || n['trans-fat_100g'],
      cholesterol: n.cholesterol_serving || n.cholesterol_100g,
      sodium: n.sodium_serving || n.sodium_100g,
      totalCarbs: n.carbohydrates_serving || n.carbohydrates_100g,
      dietaryFiber: n.fiber_serving || n.fiber_100g,
      sugars: n.sugars_serving || n.sugars_100g,
      protein: n.proteins_serving || n.proteins_100g,
      vitaminD: n['vitamin-d_serving'] || n['vitamin-d_100g'],
      calcium: n.calcium_serving || n.calcium_100g,
      iron: n.iron_serving || n.iron_100g,
      potassium: n.potassium_serving || n.potassium_100g,
    };
  }

  /**
   * Extract allergen list
   */
  private extractAllergens(product: OpenFoodFactsProduct): string[] | undefined {
    if (!product.allergens_tags || product.allergens_tags.length === 0) {
      return undefined;
    }

    return product.allergens_tags.map(tag => tag.replace(/^en:/, ''));
  }

  /**
   * Determine if product is organic
   */
  private isOrganic(product: OpenFoodFactsProduct): boolean {
    const organicLabels = ['en:organic', 'en:usda-organic', 'en:eu-organic'];
    if (product.labels_tags) {
      return product.labels_tags.some(label => organicLabels.includes(label));
    }
    return false;
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

/**
 * Singleton instance for convenience
 */
export const openFoodFactsClient = new OpenFoodFactsClient();
