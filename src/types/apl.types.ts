/**
 * APL (Approved Product List) Data Types
 *
 * Defines the schema for WIC-approved products across states.
 * Supports state-specific eligibility rules, size/brand restrictions,
 * and participant type targeting.
 */

/**
 * Participant types for WIC eligibility
 * Each product can be restricted to specific participant categories
 */
export type ParticipantType =
  | 'pregnant'
  | 'postpartum'
  | 'breastfeeding'
  | 'infant'
  | 'child';

/**
 * Data source for APL entry provenance tracking
 */
export type APLDataSource =
  | 'fis'        // FIS processor (Michigan, Florida)
  | 'conduent'   // Conduent processor (North Carolina)
  | 'state'      // State-specific system (Oregon)
  | 'manual'     // Manually entered
  | 'usda';      // USDA National UPC Database

/**
 * US states (2-letter codes) for priority states
 * Expandable to all 50 states + territories
 */
export type StateCode =
  | 'MI'  // Michigan
  | 'NC'  // North Carolina
  | 'FL'  // Florida
  | 'OR'  // Oregon
  | string; // Expandable to other states

/**
 * Size unit types for product restrictions
 */
export type SizeUnit =
  | 'oz'   // Ounces (fluid or weight)
  | 'lb'   // Pounds
  | 'gal'  // Gallons
  | 'qt'   // Quarts
  | 'pt'   // Pints
  | 'ml'   // Milliliters
  | 'l'    // Liters
  | 'g'    // Grams
  | 'kg'   // Kilograms
  | 'ct'   // Count (individual items)
  | 'doz'; // Dozen

/**
 * Size restriction specification
 *
 * Examples:
 * - Exact size: { exactSize: 12, unit: 'oz' } → Must be exactly 12 oz
 * - Range: { minSize: 8, maxSize: 16, unit: 'oz' } → 8-16 oz allowed
 * - Minimum only: { minSize: 12, unit: 'oz' } → 12 oz or larger
 */
export interface SizeRestriction {
  /** Minimum size allowed (inclusive) */
  minSize?: number;

  /** Maximum size allowed (inclusive) */
  maxSize?: number;

  /** Exact size required (overrides min/max if specified) */
  exactSize?: number;

  /** Unit of measurement */
  unit: SizeUnit;

  /** Alternative sizes allowed (e.g., "12 oz or 18 oz") */
  allowedSizes?: number[];
}

/**
 * Brand restriction specification
 *
 * Examples:
 * - Contract formula: { contractBrand: 'Similac' } → Only Similac allowed
 * - Allowed list: { allowedBrands: ['Kroger', 'Great Value'] } → Store brands only
 * - Excluded list: { excludedBrands: ['Premium Brand'] } → Any except Premium
 */
export interface BrandRestriction {
  /** List of explicitly allowed brands */
  allowedBrands?: string[];

  /** List of explicitly excluded brands */
  excludedBrands?: string[];

  /** Contract brand (exclusive) - common for infant formula */
  contractBrand?: string;

  /** Contract start date for contract brands */
  contractStartDate?: Date;

  /** Contract end date for contract brands */
  contractEndDate?: Date;
}

/**
 * Additional product restrictions
 * State-specific rules that don't fit size/brand categories
 */
export interface AdditionalRestrictions {
  /** Product must be whole grain */
  wholeGrainRequired?: boolean;

  /** Maximum sugar content (grams per serving) */
  maxSugarGrams?: number;

  /** Maximum sodium content (mg per serving) */
  maxSodiumMg?: number;

  /** Organic certification required */
  organicRequired?: boolean;

  /** Artificial dyes prohibited (Florida policy) */
  noArtificialDyes?: boolean;

  /** Low-fat/reduced-fat required */
  lowFatRequired?: boolean;

  /** Fortification requirements (e.g., "Vitamin D fortified") */
  fortificationRequired?: string[];

  /** Free-text restriction notes */
  restrictionNotes?: string;
}

/**
 * Core APL Entry
 *
 * Represents a single UPC's WIC eligibility in a specific state.
 * Multiple entries per UPC are possible (different states, different time periods).
 */
export interface APLEntry {
  /** Unique identifier (UUID) */
  id: string;

  /** State code (MI, NC, FL, OR, etc.) */
  state: StateCode;

  /** Universal Product Code (12-14 digits, normalized) */
  upc: string;

  /** Is this product WIC-eligible in this state? */
  eligible: boolean;

  /** Primary benefit category (e.g., "Milk", "Infant Formula", "Cereal") */
  benefitCategory: string;

  /** Optional subcategory for finer classification */
  benefitSubcategory?: string;

  /** Participant types who can purchase this product */
  participantTypes?: ParticipantType[];

  /** Size restrictions (min/max/exact) */
  sizeRestriction?: SizeRestriction;

  /** Brand restrictions (allowed/excluded/contract) */
  brandRestriction?: BrandRestriction;

  /** Additional state-specific restrictions */
  additionalRestrictions?: AdditionalRestrictions;

  /** Date this approval becomes effective */
  effectiveDate: Date;

  /** Date this approval expires (null = no expiration) */
  expirationDate?: Date | null;

  /** State-specific notes or special instructions */
  notes?: string;

  /** Original data source */
  dataSource: APLDataSource;

  /** Last time this entry was updated/verified */
  lastUpdated: Date;

  /** Has this entry been manually verified? */
  verified: boolean;

  /** Hash of source file/data for change detection */
  sourceHash?: string;

  /** Created timestamp */
  createdAt: Date;

  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * APL Sync Status
 *
 * Tracks the state of APL data synchronization for each state.
 * Used for monitoring data freshness and sync health.
 */
export interface APLSyncStatus {
  /** Unique identifier */
  id: string;

  /** State code */
  state: StateCode;

  /** Data source being synced */
  dataSource: APLDataSource;

  /** Last successful sync timestamp */
  lastSyncAt?: Date;

  /** Last sync attempt timestamp */
  lastAttemptAt?: Date;

  /** Status of last sync */
  lastSyncStatus: 'success' | 'failure' | 'partial' | 'pending';

  /** Error message if last sync failed */
  lastSyncError?: string;

  /** Number of consecutive failures */
  consecutiveFailures: number;

  /** Total entries synced in last run */
  entriesProcessed?: number;

  /** Entries added in last run */
  entriesAdded?: number;

  /** Entries updated in last run */
  entriesUpdated?: number;

  /** Entries removed in last run */
  entriesRemoved?: number;

  /** Hash of current source file */
  currentSourceHash?: string;

  /** Hash of previous source file */
  previousSourceHash?: string;

  /** Next scheduled sync timestamp */
  nextSyncAt?: Date;

  /** Created timestamp */
  createdAt: Date;

  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * APL Change Log
 *
 * Audit trail of changes to APL data over time.
 * Enables tracking of product additions, removals, and modifications.
 */
export interface APLChangeLog {
  /** Unique identifier */
  id: string;

  /** State code */
  state: StateCode;

  /** UPC affected */
  upc: string;

  /** Type of change */
  changeType: 'added' | 'removed' | 'modified' | 'reinstated';

  /** Previous APL entry (for modifications/removals) */
  previousEntry?: Partial<APLEntry>;

  /** New APL entry (for additions/modifications) */
  newEntry?: Partial<APLEntry>;

  /** Data source that reported the change */
  dataSource: APLDataSource;

  /** When the change was detected */
  detectedAt: Date;

  /** When the change became effective */
  effectiveAt?: Date;

  /** Reason for change (if available) */
  changeReason?: string;

  /** Created timestamp */
  createdAt: Date;
}

/**
 * UPC Normalization Result
 *
 * UPCs can have leading zeros, different lengths (UPC-A, UPC-E, EAN-13).
 * This type represents the various normalized forms of a UPC.
 */
export interface UPCVariants {
  /** Original UPC as received */
  original: string;

  /** Normalized to 12 digits (UPC-A standard) */
  upc12: string;

  /** Normalized to 13 digits (EAN-13 standard) */
  ean13: string;

  /** Without leading zeros */
  trimmed: string;

  /** Check digit */
  checkDigit: string;

  /** Is this a valid UPC format? */
  isValid: boolean;
}

/**
 * APL Query Parameters
 *
 * Structured parameters for querying the APL database
 */
export interface APLQueryParams {
  /** State code filter */
  state?: StateCode | StateCode[];

  /** UPC filter (supports variants) */
  upc?: string;

  /** Benefit category filter */
  category?: string | string[];

  /** Participant type filter */
  participantType?: ParticipantType;

  /** Only include currently effective entries */
  currentOnly?: boolean;

  /** Only include verified entries */
  verifiedOnly?: boolean;

  /** Data source filter */
  dataSource?: APLDataSource | APLDataSource[];

  /** Date for point-in-time query */
  asOfDate?: Date;

  /** Include expired entries */
  includeExpired?: boolean;

  /** Search query (product name, brand, etc.) */
  search?: string;

  /** Pagination: page number */
  page?: number;

  /** Pagination: items per page */
  limit?: number;
}

/**
 * APL Lookup Result
 *
 * Result of an eligibility check for a specific product/state
 */
export interface APLLookupResult {
  /** UPC queried */
  upc: string;

  /** State queried */
  state: StateCode;

  /** Is product eligible? */
  eligible: boolean;

  /** Matching APL entry (if found) */
  entry?: APLEntry;

  /** Reason for ineligibility (if not eligible) */
  ineligibilityReason?: string;

  /** Alternative products (if not eligible) */
  alternatives?: APLEntry[];

  /** Data freshness indicator */
  dataAge?: number; // milliseconds since last update

  /** Confidence score (0-100) */
  confidence: number;
}

/**
 * State Benefit Categories
 *
 * Different states may use different category naming conventions.
 * This maps canonical categories to state-specific labels.
 */
export interface StateBenefitCategories {
  /** State code */
  state: StateCode;

  /** Category mappings */
  categories: {
    /** Canonical category name (internal) */
    canonical: string;

    /** State-specific label (display) */
    stateLabel: string;

    /** Alternative labels/aliases */
    aliases?: string[];

    /** Icon identifier */
    icon?: string;

    /** Sort order */
    sortOrder: number;
  }[];
}
