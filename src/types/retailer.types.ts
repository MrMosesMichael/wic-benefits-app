/**
 * WIC Retailer Data Types
 * Based on A3.1 - Source WIC-authorized retailer data by state
 */

export type RetailerDataSource =
  | 'michigan_web'
  | 'nc_web'
  | 'florida_web'
  | 'oregon_web'
  | 'state_request'
  | 'scrape'
  | 'manual';

export type StoreType = 'grocery' | 'pharmacy' | 'specialty' | 'convenience' | 'superstore' | 'wic_only';

export type WICProcessor = 'fis' | 'conduent' | 'state' | 'unknown';

/**
 * Raw retailer data as scraped from state sources
 * This is the format before normalization and enrichment
 */
export interface WICRetailerRawData {
  // Source metadata
  state: string; // Two-letter state code (MI, NC, FL, OR)
  source: RetailerDataSource;
  scrapedAt: string; // ISO timestamp
  processor: WICProcessor; // Which eWIC processor the state uses

  // Core vendor data
  vendorName: string;
  wicVendorId?: string; // State-specific vendor ID

  // Location
  address: string;
  address2?: string;
  city: string;
  stateCode: string; // Two-letter code
  zip: string;

  // Contact
  phone?: string;
  website?: string;

  // Services
  storeType?: StoreType;
  services?: string[]; // e.g., ['formula', 'fresh_produce', 'deli', 'pharmacy']

  // Coordinates (if available from source)
  latitude?: number;
  longitude?: number;

  // Additional metadata
  chainName?: string;
  notes?: string;

  // WIC Authorization status
  wicAuthorized: boolean;
  authorizationDate?: string; // When vendor was authorized
  authorizationExpires?: string; // If authorization has expiration
}

/**
 * Normalized and enriched retailer data
 * This is stored in the database after processing
 */
export interface WICRetailer {
  // Internal identifiers
  id: string; // Generated unique ID
  externalId?: string; // WIC vendor ID from state

  // Basic info
  name: string;
  chain?: string; // Chain name if part of a chain (e.g., "Walmart", "Kroger")
  chainId?: string; // Chain-specific store identifier

  // Location
  address: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };

  location: {
    lat: number;
    lng: number;
  };

  // WIC-specific
  wicAuthorized: boolean;
  wicVendorId: string; // State vendor ID
  wicProcessor: WICProcessor;
  wicState: string; // Which state's WIC program

  // Contact
  phone?: string;
  website?: string;

  // Operating info
  hours?: Array<{
    dayOfWeek: number; // 0 = Sunday, 6 = Saturday
    openTime: string; // "09:00"
    closeTime: string; // "21:00"
    closed?: boolean;
  }>;

  timezone?: string;

  // Features
  features: {
    storeType: StoreType;
    services?: string[];
    hasPharmacy?: boolean;
    hasDeliCounter?: boolean;
    hasBakery?: boolean;
    acceptsEbt?: boolean;
    acceptsWic: boolean;
    hasWicKiosk?: boolean;
    parkingAvailable?: boolean;
    wheelchairAccessible?: boolean;
  };

  // Inventory
  inventoryApiAvailable: boolean;
  inventoryApiType?: 'walmart' | 'kroger' | 'target' | 'scrape';

  // Data quality
  dataSource: RetailerDataSource;
  lastVerified: Date;
  lastScraped: Date;
  enrichedWithGooglePlaces: boolean;
  geocoded: boolean;
  active: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Scraper configuration for each state
 */
export interface StateScraperConfig {
  state: string;
  processor: WICProcessor;
  baseUrl: string;
  searchEndpoint?: string;
  searchMethod: 'zip' | 'city' | 'county' | 'latlong';
  rateLimitMs: number; // Milliseconds between requests
  userAgent: string;
  headers?: Record<string, string>;
  maxRetries: number;
}

/**
 * Result from a scraping operation
 */
export interface ScraperResult {
  state: string;
  timestamp: string;
  success: boolean;
  retailersFound: number;
  errors: string[];
  rawData: WICRetailerRawData[];
  durationMs: number;
}

/**
 * Statistics about retailer data coverage
 */
export interface RetailerCoverageStats {
  totalRetailers: number;
  byState: Record<string, number>;
  byStoreType: Record<StoreType, number>;
  byProcessor: Record<WICProcessor, number>;
  withCoordinates: number;
  withHours: number;
  withPhone: number;
  lastUpdated: Date;
  dataFreshness: {
    current: number; // Updated within 30 days
    stale: number; // 30-90 days old
    veryStale: number; // 90+ days old
  };
}
