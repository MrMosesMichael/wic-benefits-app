/**
 * WIC Retailer Data Types
 *
 * Type definitions for WIC-authorized retailer data sourcing and processing
 */

export type StateCode = 'MI' | 'NC' | 'FL' | 'OR';

export type DataSourceType =
  | 'michigan_web'
  | 'nc_web'
  | 'florida_web'
  | 'oregon_web'
  | 'state_request'
  | 'scrape'
  | 'api'
  | 'manual';

export type StoreType =
  | 'grocery'
  | 'pharmacy'
  | 'specialty'
  | 'convenience'
  | 'farmers_market'
  | 'other';

export type RetailerProcessorType = 'fis' | 'conduent' | 'state' | 'jpmorgan' | 'other';

/**
 * Raw retailer data as scraped from state sources
 * This is the intermediate format before normalization
 */
export interface WICRetailerRawData {
  // Source metadata
  state: StateCode;
  source: DataSourceType;
  scrapedAt: string; // ISO timestamp
  processorType?: RetailerProcessorType;

  // Core vendor data
  vendorName: string;
  wicVendorId?: string;

  // Location
  address: string;
  address2?: string;
  city: string;
  stateCode: string;
  zip: string;

  // Contact
  phone?: string;
  website?: string;

  // Services
  storeType?: StoreType;
  services?: string[]; // ['formula', 'fresh_produce', 'deli', 'pharmacy']

  // Coordinates (if available from source)
  latitude?: number;
  longitude?: number;

  // Operating hours (if available)
  hours?: string;

  // Additional metadata
  chainName?: string;
  notes?: string;

  // Data quality flags
  verified?: boolean;
  lastVerified?: string;
}

/**
 * Normalized retailer data ready for database storage
 * Maps to Store interface in store.types.ts
 */
export interface NormalizedRetailerData {
  // Generated ID (UUID)
  id: string;

  // Basic info
  name: string;
  chain?: string;
  chainId?: string;

  // Address
  address: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };

  // Location
  location: {
    lat: number;
    lng: number;
  };

  // WIC authorization
  wicAuthorized: boolean;
  wicVendorId?: string;
  wicState: StateCode;

  // Contact
  phone?: string;
  website?: string;

  // Operating hours (structured)
  hours?: OperatingHours[];
  timezone: string;

  // Features
  features: {
    hasPharmacy?: boolean;
    hasDeliCounter?: boolean;
    hasBakery?: boolean;
    acceptsEbt?: boolean;
    acceptsWic: boolean;
    hasWicKiosk?: boolean;
  };

  // Store type
  storeType?: StoreType;

  // Metadata
  dataSource: DataSourceType;
  processorType?: RetailerProcessorType;
  lastVerified: string;
  active: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface OperatingHours {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  openTime: string; // "09:00"
  closeTime: string; // "21:00"
  closed?: boolean;
}

/**
 * Scraper configuration for a specific state
 */
export interface ScraperConfig {
  state: StateCode;
  baseUrl: string;
  searchEndpoint?: string;
  maxRetries: number;
  requestDelayMs: number;
  timeout: number;
  userAgent: string;
  headers?: Record<string, string>;
}

/**
 * Scraping result with metadata
 */
export interface ScrapingResult {
  state: StateCode;
  success: boolean;
  recordsScraped: number;
  data: WICRetailerRawData[];
  errors: ScrapingError[];
  scrapedAt: string;
  durationMs: number;
}

export interface ScrapingError {
  type: 'network' | 'parsing' | 'validation' | 'rate_limit' | 'other';
  message: string;
  context?: any;
  timestamp: string;
}

/**
 * Geocoding result
 */
export interface GeocodingResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  error?: string;
  source: 'google' | 'cache' | 'manual';
}

/**
 * Data enrichment result (from Google Places API)
 */
export interface EnrichmentResult {
  success: boolean;
  placeId?: string;
  phone?: string;
  website?: string;
  hours?: OperatingHours[];
  rating?: number;
  userRatingsTotal?: number;
  photos?: string[];
  error?: string;
}

/**
 * Data quality metrics
 */
export interface DataQualityMetrics {
  totalRecords: number;
  recordsWithCoordinates: number;
  recordsWithPhone: number;
  recordsWithHours: number;
  recordsWithVendorId: number;
  duplicatesFound: number;
  validationErrors: number;
  completenessScore: number; // 0-100
}

/**
 * Retailer data source service interface
 */
export interface IRetailerDataService {
  /**
   * Scrape retailer data for a specific state
   */
  scrapeState(state: StateCode): Promise<ScrapingResult>;

  /**
   * Normalize raw retailer data
   */
  normalizeData(rawData: WICRetailerRawData[]): Promise<NormalizedRetailerData[]>;

  /**
   * Geocode addresses missing coordinates
   */
  geocodeAddresses(data: WICRetailerRawData[]): Promise<GeocodingResult[]>;

  /**
   * Enrich data with Google Places API
   */
  enrichData(data: NormalizedRetailerData[]): Promise<EnrichmentResult[]>;

  /**
   * Calculate data quality metrics
   */
  calculateQualityMetrics(data: WICRetailerRawData[]): DataQualityMetrics;
}

/**
 * State-specific scraper interface
 */
export interface IStateScraper {
  state: StateCode;
  config: ScraperConfig;

  /**
   * Scrape all retailers for this state
   */
  scrapeAll(): Promise<WICRetailerRawData[]>;

  /**
   * Scrape retailers by zip code
   */
  scrapeByZip(zipCode: string): Promise<WICRetailerRawData[]>;

  /**
   * Validate scraper is working
   */
  validate(): Promise<boolean>;
}
