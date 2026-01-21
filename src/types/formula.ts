/**
 * Formula Tracking Type Definitions
 * A4.1 - Formula availability tracking
 */

/**
 * Core formula product information
 */
export interface FormulaProduct {
  upc: string;
  brand: string;
  name: string;
  size: string;
  wicApproved: boolean;
  alternativeUPCs: Set<string>;  // Similar formulas that can be substituted (use Set for O(1) lookups)
}

/**
 * Real-time formula availability at a specific store
 */
export interface FormulaAvailability {
  storeId: string;
  upc: string;
  inStock: boolean;
  quantity?: number;
  lastChecked: Date;
  source: 'api' | 'crowdsourced' | 'manual';
}

/**
 * User-reported formula sighting (crowdsourced data)
 */
export interface FormulaSighting {
  id: string;
  userId: string;
  storeId: string;
  upc: string;
  quantity: number;
  timestamp: Date;
  verified: boolean;
}

/**
 * Formula availability tracking service options
 */
export interface FormulaTrackingOptions {
  storeId: string;
  upc: string;
  source?: 'api' | 'crowdsourced' | 'manual';
}

/**
 * Formula availability query parameters
 */
export interface FormulaAvailabilityQuery {
  storeIds?: string[];
  upcs?: string[];
  inStockOnly?: boolean;
  maxAge?: number;  // Max age of data in hours
}

/**
 * Formula availability update payload
 */
export interface FormulaAvailabilityUpdate {
  storeId: string;
  upc: string;
  inStock: boolean;
  quantity?: number;
  source: 'api' | 'crowdsourced' | 'manual';
}
