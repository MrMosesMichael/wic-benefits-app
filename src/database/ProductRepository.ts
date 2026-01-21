/**
 * Product Repository
 *
 * Data access layer for product database operations.
 * Provides CRUD operations and queries for the products table.
 *
 * Architecture:
 * - Repository pattern separates data access from business logic
 * - Uses parameterized queries to prevent SQL injection
 * - Handles UPC normalization for consistent lookups
 * - Supports batch operations for efficiency
 */

import { Pool, PoolClient } from 'pg';
import {
  Product,
  ProductDataSource,
  ProductQueryParams,
  ProductSubmission,
  UnknownProductReport,
  ProductCoverageStats,
} from '../types/product.types';

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number; // Max pool connections
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Product Repository
 *
 * Handles all database operations for products table.
 */
export class ProductRepository {
  private pool: Pool;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Get product by UPC
   *
   * Tries multiple UPC variants (with/without leading zeros, different lengths)
   * to handle UPC normalization issues.
   *
   * @param upc - UPC to lookup
   * @returns Product if found, null otherwise
   */
  async getProductByUPC(upc: string): Promise<Product | null> {
    const normalizedUpc = this.normalizeUPC(upc);

    const query = `
      SELECT
        id,
        upc,
        upc_normalized,
        name,
        brand,
        manufacturer,
        category,
        size,
        size_unit,
        size_oz,
        image_url,
        thumbnail_url,
        ingredients,
        nutrition,
        allergens,
        is_organic,
        is_generic,
        verified,
        verified_by,
        data_source,
        source_metadata as metadata,
        last_updated,
        created_at,
        updated_at
      FROM products
      WHERE upc = $1 OR upc_normalized = $2
      LIMIT 1
    `;

    const result = await this.pool.query(query, [upc, normalizedUpc]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToProduct(result.rows[0]);
  }

  /**
   * Get multiple products by UPCs (batch lookup)
   *
   * @param upcs - Array of UPCs to lookup
   * @returns Map of UPC to Product (only found products)
   */
  async getProductsByUPCs(upcs: string[]): Promise<Map<string, Product>> {
    if (upcs.length === 0) {
      return new Map();
    }

    const normalizedUpcs = upcs.map(upc => this.normalizeUPC(upc));

    const query = `
      SELECT
        id,
        upc,
        upc_normalized,
        name,
        brand,
        manufacturer,
        category,
        size,
        size_unit,
        size_oz,
        image_url,
        thumbnail_url,
        ingredients,
        nutrition,
        allergens,
        is_organic,
        is_generic,
        verified,
        verified_by,
        data_source,
        source_metadata as metadata,
        last_updated,
        created_at,
        updated_at
      FROM products
      WHERE upc = ANY($1) OR upc_normalized = ANY($2)
    `;

    const result = await this.pool.query(query, [upcs, normalizedUpcs]);

    const productsMap = new Map<string, Product>();

    for (const row of result.rows) {
      const product = this.mapRowToProduct(row);
      productsMap.set(product.upc, product);
    }

    return productsMap;
  }

  /**
   * Insert or update product
   *
   * Uses PostgreSQL UPSERT (INSERT ... ON CONFLICT) to handle duplicates.
   * Updates existing records if UPC already exists.
   *
   * @param product - Product to insert/update
   * @returns Saved product with database-generated fields
   */
  async upsertProduct(product: Omit<Product, 'createdAt' | 'updatedAt'>): Promise<Product> {
    const normalizedUpc = this.normalizeUPC(product.upc);

    const query = `
      INSERT INTO products (
        upc,
        upc_normalized,
        name,
        brand,
        manufacturer,
        category,
        size,
        size_unit,
        size_oz,
        image_url,
        thumbnail_url,
        ingredients,
        nutrition,
        allergens,
        is_organic,
        is_generic,
        verified,
        verified_by,
        data_source,
        source_metadata,
        last_updated
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      ON CONFLICT (upc) DO UPDATE SET
        name = EXCLUDED.name,
        brand = EXCLUDED.brand,
        manufacturer = EXCLUDED.manufacturer,
        category = EXCLUDED.category,
        size = EXCLUDED.size,
        size_unit = EXCLUDED.size_unit,
        size_oz = EXCLUDED.size_oz,
        image_url = COALESCE(EXCLUDED.image_url, products.image_url),
        thumbnail_url = COALESCE(EXCLUDED.thumbnail_url, products.thumbnail_url),
        ingredients = COALESCE(EXCLUDED.ingredients, products.ingredients),
        nutrition = COALESCE(EXCLUDED.nutrition, products.nutrition),
        allergens = COALESCE(EXCLUDED.allergens, products.allergens),
        is_organic = COALESCE(EXCLUDED.is_organic, products.is_organic),
        is_generic = COALESCE(EXCLUDED.is_generic, products.is_generic),
        verified = EXCLUDED.verified,
        verified_by = EXCLUDED.verified_by,
        data_source = EXCLUDED.data_source,
        source_metadata = EXCLUDED.source_metadata,
        last_updated = EXCLUDED.last_updated,
        updated_at = NOW()
      RETURNING
        id,
        upc,
        upc_normalized,
        name,
        brand,
        manufacturer,
        category,
        size,
        size_unit,
        size_oz,
        image_url,
        thumbnail_url,
        ingredients,
        nutrition,
        allergens,
        is_organic,
        is_generic,
        verified,
        verified_by,
        data_source,
        source_metadata as metadata,
        last_updated,
        created_at,
        updated_at
    `;

    const values = [
      product.upc,
      normalizedUpc,
      product.name,
      product.brand,
      product.manufacturer || null,
      JSON.stringify(product.category),
      product.size,
      product.sizeUnit,
      product.sizeOz || null,
      product.imageUrl || null,
      product.thumbnailUrl || null,
      product.ingredients || null,
      product.nutrition ? JSON.stringify(product.nutrition) : null,
      product.allergens ? JSON.stringify(product.allergens) : null,
      product.isOrganic || false,
      product.isGeneric || false,
      product.verified,
      product.verifiedBy || null,
      product.dataSource,
      product.metadata ? JSON.stringify(product.metadata) : null,
      product.lastUpdated,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToProduct(result.rows[0]);
  }

  /**
   * Batch insert/update products
   *
   * More efficient than individual upserts for large datasets.
   *
   * @param products - Array of products to upsert
   * @returns Number of products inserted/updated
   */
  async upsertProductsBatch(products: Omit<Product, 'createdAt' | 'updatedAt'>[]): Promise<number> {
    if (products.length === 0) {
      return 0;
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      let count = 0;
      for (const product of products) {
        await this.upsertProduct(product);
        count++;
      }

      await client.query('COMMIT');
      return count;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Search products by query parameters
   *
   * Supports:
   * - Full-text search on product name
   * - Brand filter
   * - Category filter
   * - Verified status filter
   * - Data source filter
   * - Pagination
   *
   * @param params - Query parameters
   * @returns Array of matching products
   */
  async searchProducts(params: ProductQueryParams): Promise<Product[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Full-text search on name
    if (params.search) {
      conditions.push(`to_tsvector('english', name) @@ plainto_tsquery('english', $${paramIndex})`);
      values.push(params.search);
      paramIndex++;
    }

    // Exact name match
    if (params.name) {
      conditions.push(`name ILIKE $${paramIndex}`);
      values.push(`%${params.name}%`);
      paramIndex++;
    }

    // Brand filter
    if (params.brand) {
      conditions.push(`brand ILIKE $${paramIndex}`);
      values.push(`%${params.brand}%`);
      paramIndex++;
    }

    // Category filter
    if (params.category) {
      const categories = Array.isArray(params.category) ? params.category : [params.category];
      conditions.push(`category ?| $${paramIndex}`);
      values.push(categories);
      paramIndex++;
    }

    // Manufacturer filter
    if (params.manufacturer) {
      conditions.push(`manufacturer ILIKE $${paramIndex}`);
      values.push(`%${params.manufacturer}%`);
      paramIndex++;
    }

    // Verified filter
    if (params.verifiedOnly) {
      conditions.push('verified = true');
    }

    // Data source filter
    if (params.dataSource) {
      const sources = Array.isArray(params.dataSource) ? params.dataSource : [params.dataSource];
      conditions.push(`data_source = ANY($${paramIndex})`);
      values.push(sources);
      paramIndex++;
    }

    // Build query
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Pagination
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const query = `
      SELECT
        id,
        upc,
        upc_normalized,
        name,
        brand,
        manufacturer,
        category,
        size,
        size_unit,
        size_oz,
        image_url,
        thumbnail_url,
        ingredients,
        nutrition,
        allergens,
        is_organic,
        is_generic,
        verified,
        verified_by,
        data_source,
        source_metadata as metadata,
        last_updated,
        created_at,
        updated_at
      FROM products
      ${whereClause}
      ORDER BY last_updated DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRowToProduct(row));
  }

  /**
   * Get coverage statistics
   *
   * @returns Product coverage metrics
   */
  async getCoverageStats(): Promise<ProductCoverageStats> {
    const query = `
      SELECT
        COUNT(*) as total_products,
        COUNT(image_url) as products_with_images,
        COUNT(nutrition) as products_with_nutrition,
        COUNT(*) FILTER (WHERE verified = true) as verified_products,
        jsonb_object_agg(
          data_source,
          count
        ) as coverage_by_source
      FROM (
        SELECT
          data_source,
          COUNT(*) as count
        FROM products
        GROUP BY data_source
      ) source_counts,
      products
      GROUP BY source_counts.data_source
    `;

    const result = await this.pool.query(query);

    // Get category breakdown
    const categoryQuery = `
      SELECT
        category_name,
        COUNT(*) as count
      FROM products,
      jsonb_array_elements_text(category) as category_name
      GROUP BY category_name
      ORDER BY count DESC
      LIMIT 20
    `;

    const categoryResult = await this.pool.query(categoryQuery);

    const coverageByCategory: Record<string, number> = {};
    for (const row of categoryResult.rows) {
      coverageByCategory[row.category_name] = parseInt(row.count);
    }

    const stats = result.rows[0];

    return {
      totalProducts: parseInt(stats.total_products),
      productsWithImages: parseInt(stats.products_with_images),
      productsWithNutrition: parseInt(stats.products_with_nutrition),
      verifiedProducts: parseInt(stats.verified_products),
      coverageBySource: stats.coverage_by_source || {},
      coverageByCategory,
      lastUpdated: new Date(),
    };
  }

  /**
   * Report unknown product
   *
   * @param upc - UPC not found
   * @param reportedBy - User ID
   * @param userProvidedInfo - Optional product info from user
   * @returns Report ID
   */
  async reportUnknownProduct(
    upc: string,
    reportedBy: string,
    userProvidedInfo?: Partial<Product>
  ): Promise<string> {
    const query = `
      INSERT INTO unknown_product_reports (
        upc,
        reported_by,
        user_provided_info
      ) VALUES ($1, $2, $3)
      RETURNING id
    `;

    const values = [
      upc,
      reportedBy,
      userProvidedInfo ? JSON.stringify(userProvidedInfo) : null,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  }

  /**
   * Normalize UPC for consistent lookups
   *
   * - Strips non-digits
   * - Pads to 12 digits (UPC-A standard)
   *
   * @param upc - Raw UPC
   * @returns Normalized UPC
   */
  private normalizeUPC(upc: string): string {
    // Strip non-digits
    const digits = upc.replace(/\D/g, '');

    // Pad to 12 digits
    return digits.padStart(12, '0');
  }

  /**
   * Map database row to Product type
   *
   * Handles JSON parsing and type conversions
   *
   * @param row - Database row
   * @returns Product object
   */
  private mapRowToProduct(row: any): Product {
    return {
      upc: row.upc,
      name: row.name,
      brand: row.brand,
      manufacturer: row.manufacturer,
      category: Array.isArray(row.category) ? row.category : JSON.parse(row.category),
      size: row.size,
      sizeUnit: row.size_unit,
      sizeOz: row.size_oz ? parseFloat(row.size_oz) : undefined,
      imageUrl: row.image_url,
      thumbnailUrl: row.thumbnail_url,
      ingredients: row.ingredients,
      nutrition: row.nutrition,
      allergens: row.allergens,
      isOrganic: row.is_organic,
      isGeneric: row.is_generic,
      verified: row.verified,
      verifiedBy: row.verified_by,
      dataSource: row.data_source as ProductDataSource,
      lastUpdated: new Date(row.last_updated),
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
