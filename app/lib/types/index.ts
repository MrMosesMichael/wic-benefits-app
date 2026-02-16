/**
 * Type definitions for WIC Benefits App - Michigan MVP
 */

// Product and Eligibility Types
export interface Product {
  upc: string;
  name: string;
  brand?: string;
  size?: string;
  category?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  product: Product;
  reason?: string;
  restrictions?: string[];
  category?: BenefitCategory;
}

// Benefits Types - expanded to match full WIC food package categories
export type BenefitCategory =
  | 'milk'
  | 'cheese'
  | 'eggs'
  | 'fruits_vegetables'
  | 'whole_grains'
  | 'juice'
  | 'peanut_butter'
  | 'infant_formula'
  | 'cereal'
  | 'infant_food'
  | 'baby_food_meat'
  | 'yogurt'
  | 'fish';

// Benefit units - based on design.md BenefitUnit type
export type BenefitUnit =
  | 'gal'
  | 'oz'
  | 'lb'
  | 'doz'
  | 'can'
  | 'box'
  | 'count'
  | 'dollars';

export interface BenefitAmount {
  category: BenefitCategory;
  categoryLabel: string;
  available: string;
  inCart: string;
  consumed: string;
  total: string;
  unit: BenefitUnit;
  periodStart?: string;
  periodEnd?: string;
}

export interface Participant {
  id: string;
  type: 'pregnant' | 'postpartum' | 'breastfeeding' | 'infant' | 'child';
  name: string;
  benefits: BenefitAmount[];
}

export interface Household {
  id: string;
  participants: Participant[];
}

// Shopping Cart Types
export interface CartItem {
  id: string;
  upc: string;
  product_name: string;
  brand?: string;
  size?: string;
  category: string;
  quantity: number;
  unit: string;
  participant_id: string;
  participant_name: string;
  participant_type: string;
  added_at: string;
}

export interface Cart {
  household_id?: string;
  items: CartItem[];
  created_at?: string;
  updated_at?: string;
}

// Product Sightings Types (Crowdsourced Inventory)
export type StockLevel = 'plenty' | 'some' | 'few' | 'out';

export interface ProductSighting {
  id: string;
  storeName: string;
  storeId?: string | null;
  stockLevel: StockLevel;
  reportedAt: string;
  ageHours: number;
  distance?: number | null;
  confidence: number;
  helpfulCount: number;
  locationVerified: boolean;
}

export interface ReportSightingRequest {
  upc: string;
  storeName: string;
  storeId?: string;
  stockLevel: StockLevel;
  latitude?: number;
  longitude?: number;
  reportedBy?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface EligibilityCheckRequest {
  upc: string;
  state: 'MI'; // Michigan only for MVP
}

// ==================== Formula Finder Types ====================

export interface WicFormula {
  id: number;
  upc: string;
  brand: string;
  productName: string;
  formulaType: FormulaType;
  form: FormulaForm;
  size: string | null;
  sizeOz: number | null;
  stateContractBrand: boolean;
  statesApproved: string[] | null;
  manufacturer: string | null;
  imageUrl: string | null;
  active: boolean;
}

export type FormulaType =
  | 'standard'
  | 'sensitive'
  | 'gentle'
  | 'hypoallergenic'
  | 'organic'
  | 'soy'
  | 'specialty'
  | 'store_brand';

export type FormulaForm = 'powder' | 'ready_to_feed' | 'concentrate';

export interface FormulaTypeOption {
  value: FormulaType;
  label: string;
  description: string;
  count: number;
}

export interface Store {
  id: number;
  storeId: string;
  chain: string;
  name: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  wicAuthorized: boolean;
  distanceMiles?: number;
}

export interface StoreResult {
  id: number;
  storeId: string;
  chain: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  phone: string | null;
  wicAuthorized: boolean;
  distanceMiles: number;
  likelihood: {
    level: LikelihoodLevel;
    notes: string | null;
  } | null;
  crowdsourced: {
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
    quantityRange: 'few' | 'some' | 'plenty' | null;
    lastUpdated: string;
    confidence: number;
    reportCount: number;
  } | null;
  score: number;
}

export type LikelihoodLevel = 'always' | 'usually' | 'sometimes' | 'rarely';

export type QuantitySeen = 'none' | 'few' | 'some' | 'plenty';

export interface FormulaAlternative {
  upc: string;
  brand: string;
  productName: string;
  formulaType: FormulaType;
  form: FormulaForm;
  size: string | null;
  sizeOz: number | null;
  stateContractBrand: boolean;
  relationship: 'same_product_different_size' | 'same_brand_different_type' | 'generic_equivalent' | 'medical_alternative' | 'same_type_different_brand';
  reason: string;
  notes: string | null;
  priority: number;
  availability?: Array<{
    storeName: string;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
    lastUpdated: string;
    confidence: number;
    distanceMiles: number | null;
  }>;
  availableNearby?: boolean;
  inStockNearby?: boolean;
}

export interface FormulaAlternativesResponse {
  success: boolean;
  primary: {
    upc: string;
    brand: string;
    productName: string;
    formulaType: FormulaType;
    form: FormulaForm;
    size: string | null;
    sizeOz: number | null;
    stateContractBrand: boolean;
  };
  alternatives: FormulaAlternative[];
  count: number;
}

export interface ParticipantFormula {
  upc: string;
  name: string | null;
  source: 'manual' | 'wic_auth' | 'imported';
  details?: {
    brand: string;
    productName: string;
    formulaType: FormulaType;
    form: FormulaForm;
    size: string | null;
    imageUrl: string | null;
  } | null;
}

// ==================== Cross-Store Search Types ====================

export interface CrossStoreSearchRequest {
  lat: number;
  lng: number;
  radiusMiles?: number;
  upc?: string;
  upcs?: string[];
  brand?: string;
  formulaType?: FormulaType;
  searchQuery?: string;
  inStockOnly?: boolean;
  maxAgeHours?: number;
  wicAuthorizedOnly?: boolean;
}

export interface CrossStoreAvailability {
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  quantityRange: 'few' | 'some' | 'plenty' | null;
  lastReportedAt: string;
  lastReportedAgo: string;
  confidence: number;
  totalReports: number;
  formulasInStock: string[];
}

export interface CrossStoreResult {
  storeId: string;
  chain: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  phone: string | null;
  wicAuthorized: boolean;
  distanceMiles: number;
  availability: CrossStoreAvailability | null;
  likelihood: {
    level: LikelihoodLevel;
    notes: string | null;
  } | null;
  score: number;
}

export interface CrossStoreSearchResponse {
  success: boolean;
  searchCriteria: CrossStoreSearchRequest;
  matchedFormulas: {
    upc: string;
    brand: string;
    productName: string;
    formulaType: FormulaType;
    form: FormulaForm;
    size: string | null;
    sizeOz: number | null;
  }[];
  stores: CrossStoreResult[];
  count: number;
  message?: string;
}

export interface FormulaBrand {
  name: string;
  formulaCount: number;
}

// ==================== WIC Clinic Types ====================

export interface WicClinic {
  id: number;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    county: string | null;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  phone: string | null;
  website: string | null;
  appointmentUrl: string | null;
  hours: Array<{ day: string; hours: string }>;
  hoursNotes: string | null;
  services: string[];
  languages: string[];
  distanceMiles: number;
}

// Re-export FAQ types
export * from './faq';
