/**
 * Product Database Types
 *
 * Defines schemas for product information from multiple data sources
 * (Open Food Facts, UPC Database API, retailer feeds, crowdsourced data).
 */

/**
 * Data source for product information provenance tracking
 */
export type ProductDataSource =
  | 'open_food_facts'     // Open Food Facts (priority)
  | 'upc_database'        // UPC Database API
  | 'retailer_feed'       // Retailer product feeds
  | 'manual'              // Manual data entry
  | 'crowdsourced';       // User-submitted additions

/**
 * Product category hierarchy
 * Multi-level categorization for filtering and navigation
 */
export type ProductCategory = string[];

/**
 * Nutrition information
 * Standardized nutritional facts per serving
 */
export interface NutritionInfo {
  /** Serving size (e.g., "1 cup", "240ml") */
  servingSize: string;

  /** Servings per container */
  servingsPerContainer?: number;

  /** Calories per serving */
  calories?: number;

  /** Total fat (grams) */
  totalFat?: number;

  /** Saturated fat (grams) */
  saturatedFat?: number;

  /** Trans fat (grams) */
  transFat?: number;

  /** Cholesterol (mg) */
  cholesterol?: number;

  /** Sodium (mg) */
  sodium?: number;

  /** Total carbohydrates (grams) */
  totalCarbs?: number;

  /** Dietary fiber (grams) */
  dietaryFiber?: number;

  /** Total sugars (grams) */
  sugars?: number;

  /** Added sugars (grams) */
  addedSugars?: number;

  /** Protein (grams) */
  protein?: number;

  /** Vitamin D (mcg) */
  vitaminD?: number;

  /** Calcium (mg) */
  calcium?: number;

  /** Iron (mg) */
  iron?: number;

  /** Potassium (mg) */
  potassium?: number;

  /** Additional nutrients */
  additionalNutrients?: Record<string, number>;
}

/**
 * Core Product Record
 *
 * Represents comprehensive product information from all sources.
 * Designed for 95%+ coverage of WIC-eligible UPCs.
 */
export interface Product {
  /** Universal Product Code (12-14 digits, normalized) */
  upc: string;

  /** Product name */
  name: string;

  /** Brand name */
  brand: string;

  /** Manufacturer/company */
  manufacturer?: string;

  /** Hierarchical category (e.g., ["Dairy", "Milk", "Whole Milk"]) */
  category: ProductCategory;

  /** Product size (numeric value) */
  size: string;

  /** Size unit (oz, lb, gal, etc.) */
  sizeUnit: string;

  /** Size converted to ounces for comparison */
  sizeOz?: number;

  /** Primary product image URL */
  imageUrl?: string;

  /** Thumbnail image URL (optimized for mobile) */
  thumbnailUrl?: string;

  /** Ingredients list */
  ingredients?: string;

  /** Nutrition facts */
  nutrition?: NutritionInfo;

  /** Allergen warnings (e.g., ["milk", "soy"]) */
  allergens?: string[];

  /** Is product USDA Organic certified? */
  isOrganic?: boolean;

  /** Is product a generic/store brand? */
  isGeneric?: boolean;

  /** Original data source */
  dataSource: ProductDataSource;

  /** Last time this product was updated */
  lastUpdated: Date;

  /** Has this product been manually verified? */
  verified: boolean;

  /** Who verified this product (user ID or "system") */
  verifiedBy?: string;

  /** Additional metadata from source */
  metadata?: Record<string, any>;

  /** Created timestamp */
  createdAt: Date;

  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Product Lookup Result
 *
 * Result of a product database query
 */
export interface ProductLookupResult {
  /** UPC queried */
  upc: string;

  /** Was product found? */
  found: boolean;

  /** Product information (if found) */
  product?: Product;

  /** Data source used */
  dataSource?: ProductDataSource;

  /** Cache hit/miss indicator */
  cached: boolean;

  /** Response time (ms) */
  responseTime?: number;

  /** Confidence score (0-100) */
  confidence: number;
}

/**
 * Product Query Parameters
 *
 * Structured parameters for querying the product database
 */
export interface ProductQueryParams {
  /** UPC filter */
  upc?: string;

  /** Product name search */
  name?: string;

  /** Brand filter */
  brand?: string;

  /** Category filter */
  category?: string | string[];

  /** Manufacturer filter */
  manufacturer?: string;

  /** Only include verified products */
  verifiedOnly?: boolean;

  /** Data source filter */
  dataSource?: ProductDataSource | ProductDataSource[];

  /** Search query (name, brand, UPC) */
  search?: string;

  /** Pagination: page number */
  page?: number;

  /** Pagination: items per page */
  limit?: number;
}

/**
 * Product Coverage Stats
 *
 * Metrics for tracking product database coverage
 */
export interface ProductCoverageStats {
  /** Total products in database */
  totalProducts: number;

  /** Products with images */
  productsWithImages: number;

  /** Products with nutrition info */
  productsWithNutrition: number;

  /** Verified products */
  verifiedProducts: number;

  /** Coverage by data source */
  coverageBySource: Record<ProductDataSource, number>;

  /** Coverage by category */
  coverageByCategory: Record<string, number>;

  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * Product Submission
 *
 * User-submitted product information for crowdsourcing
 */
export interface ProductSubmission {
  /** Unique identifier */
  id: string;

  /** UPC of submitted product */
  upc: string;

  /** Submitted product data */
  productData: Partial<Product>;

  /** User who submitted (user ID) */
  submittedBy: string;

  /** Submission timestamp */
  submittedAt: Date;

  /** Review status */
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';

  /** Reviewer notes */
  reviewerNotes?: string;

  /** Reviewed by (user ID) */
  reviewedBy?: string;

  /** Reviewed timestamp */
  reviewedAt?: Date;

  /** Supporting evidence (photo URLs, etc.) */
  evidence?: string[];
}

/**
 * Unknown Product Report
 *
 * When a user scans a UPC not in the database
 */
export interface UnknownProductReport {
  /** Unique identifier */
  id: string;

  /** UPC not found */
  upc: string;

  /** User who reported (user ID) */
  reportedBy: string;

  /** Report timestamp */
  reportedAt: Date;

  /** Optional product info provided by user */
  userProvidedInfo?: Partial<Product>;

  /** Was this resolved? */
  resolved: boolean;

  /** Resolution notes */
  resolutionNotes?: string;

  /** Resolved timestamp */
  resolvedAt?: Date;
}
