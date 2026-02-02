/**
 * API Service for WIC Benefits Backend
 *
 * OFFLINE MODE: This branch uses local JSON data for eligibility checks.
 * No backend server required for basic UPC scanning.
 */
import axios from 'axios';
import type {
  ProductSighting,
  ReportSightingRequest,
  WicFormula,
  FormulaType,
  FormulaTypeOption,
  Store,
  StoreResult,
  QuantitySeen,
  ParticipantFormula,
  CrossStoreSearchRequest,
  CrossStoreSearchResponse,
  CrossStoreResult,
  FormulaBrand,
  FormulaAlternativesResponse
} from '../types';
import { checkEligibilityOffline, getTotalProductCount } from './offlineEligibility';
import { loadHousehold } from './householdStorage';

// Set to true to use offline data (no server needed)
// For production with backend: set to false
export const OFFLINE_MODE = false;

// Configure based on environment
const API_BASE_URL = __DEV__
  ? 'http://192.168.12.94:3000/api/v1'
  : 'https://mdmichael.com/wic/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Product {
  upc: string;
  name: string;
  brand?: string;
  size?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  product: Product;
  category?: string;
  subcategory?: string;
  restrictions?: string;
  reason?: string;
}

export interface BenefitAmount {
  category: string;
  categoryLabel: string;
  available: string;
  inCart: string;
  consumed: string;
  total: string;
  unit: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface Participant {
  id: string;
  type: string;
  name: string;
  benefits: BenefitAmount[];
}

export interface Household {
  id: string;
  state: string;
  participants: Participant[];
}

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

/**
 * Check if a product is WIC-eligible
 * Uses offline data when OFFLINE_MODE is true
 */
export async function checkEligibility(upc: string): Promise<EligibilityResult> {
  // Use offline mode - no server needed
  if (OFFLINE_MODE) {
    const result = checkEligibilityOffline(upc);
    return {
      eligible: result.eligible,
      product: {
        upc: result.product.upc,
        name: result.product.name,
        brand: result.product.brand,
        size: result.product.size,
      },
      category: result.category,
      reason: result.reason,
    };
  }

  // Online mode - requires backend server
  try {
    const response = await api.get(`/eligibility/${upc}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Eligibility check failed:', error);
    throw error;
  }
}

/**
 * Get household benefits
 * Priority: 1) Local AsyncStorage, 2) Empty household, 3) Backend API
 */
export async function getBenefits(householdId: string = '1'): Promise<Household> {
  // Use offline mode
  if (OFFLINE_MODE) {
    // Load from local storage (manually entered data)
    const localData = await loadHousehold();
    if (localData) {
      return localData;
    }

    // Return empty household if no manual data - user should set up household
    return {
      id: '1',
      state: 'MI',
      participants: [],
    };

    /* REMOVED MOCK DATA - User should use household setup instead
    // Fall back to mock household with sample benefits for offline testing
    return {
      id: '1',
      state: 'MI',
      participants: [
        {
          id: '1',
          name: 'Sarah Thompson',
          type: 'pregnant',
          benefits: [
            {
              category: 'milk',
              categoryLabel: 'Milk',
              total: '24.00',
              consumed: '8.00',
              inCart: '4.00',
              available: '12.00',
              unit: 'qt',
              periodStart: '2026-01-01',
              periodEnd: '2026-01-31',
            },
            {
              category: 'cheese',
              categoryLabel: 'Cheese',
              total: '16.00',
              consumed: '4.00',
              inCart: '0.00',
              available: '12.00',
              unit: 'oz',
              periodStart: '2026-01-01',
              periodEnd: '2026-01-31',
            },
            {
              category: 'eggs',
              categoryLabel: 'Eggs',
              total: '24.00',
              consumed: '12.00',
              inCart: '0.00',
              available: '12.00',
              unit: 'count',
              periodStart: '2026-01-01',
              periodEnd: '2026-01-31',
            },
            {
              category: 'cereal',
              categoryLabel: 'Cereal',
              total: '36.00',
              consumed: '12.00',
              inCart: '0.00',
              available: '24.00',
              unit: 'oz',
              periodStart: '2026-01-01',
              periodEnd: '2026-01-31',
            },
            {
              category: 'juice',
              categoryLabel: '100% Juice',
              total: '144.00',
              consumed: '48.00',
              inCart: '0.00',
              available: '96.00',
              unit: 'oz',
              periodStart: '2026-01-01',
              periodEnd: '2026-01-31',
            },
            {
              category: 'peanut_butter',
              categoryLabel: 'Peanut Butter',
              total: '18.00',
              consumed: '0.00',
              inCart: '0.00',
              available: '18.00',
              unit: 'oz',
              periodStart: '2026-01-01',
              periodEnd: '2026-01-31',
            },
            {
              category: 'beans',
              categoryLabel: 'Dried Beans/Peas',
              total: '16.00',
              consumed: '0.00',
              inCart: '0.00',
              available: '16.00',
              unit: 'oz',
              periodStart: '2026-01-01',
              periodEnd: '2026-01-31',
            },
          ],
        },
        {
          id: '2',
          name: 'Emma Thompson',
          type: 'infant',
          benefits: [
            {
              category: 'formula',
              categoryLabel: 'Infant Formula',
              total: '806.00',
              consumed: '268.00',
              inCart: '104.00',
              available: '434.00',
              unit: 'oz',
              periodStart: '2026-01-01',
              periodEnd: '2026-01-31',
            },
            {
              category: 'baby_food_fruits_vegetables',
              categoryLabel: 'Baby Food (Fruits & Vegetables)',
              total: '128.00',
              consumed: '32.00',
              inCart: '0.00',
              available: '96.00',
              unit: 'oz',
              periodStart: '2026-01-01',
              periodEnd: '2026-01-31',
            },
            {
              category: 'baby_food_meat',
              categoryLabel: 'Baby Food (Meat)',
              total: '77.50',
              consumed: '15.50',
              inCart: '0.00',
              available: '62.00',
              unit: 'oz',
              periodStart: '2026-01-01',
              periodEnd: '2026-01-31',
            },
          ],
        },
      ],
    };
    */
  }

  // Online mode - requires backend server
  try {
    const response = await api.get(`/benefits?household_id=${householdId}`);
    if (response.data.success) {
      return response.data.data.household;
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Failed to fetch benefits:', error);
    throw error;
  }
}

/**
 * Get shopping cart
 * Uses offline mock data when OFFLINE_MODE is true
 */
export async function getCart(householdId: string = '1'): Promise<Cart> {
  // Use offline mode - return mock empty cart
  if (OFFLINE_MODE) {
    return {
      household_id: householdId,
      items: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Online mode - requires backend server
  try {
    const response = await api.get(`/cart?household_id=${householdId}`);
    if (response.data.success) {
      return response.data.cart;
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Failed to fetch cart:', error);
    throw error;
  }
}

/**
 * Add item to cart
 * In offline mode, this is a no-op (returns success without persisting)
 */
export async function addToCart(
  participantId: string,
  upc: string,
  productName: string,
  category: string,
  quantity: number,
  unit: string,
  brand?: string,
  size?: string,
  householdId: string = '1'
): Promise<void> {
  // Offline mode - simulate success (cart feature not fully functional offline)
  if (OFFLINE_MODE) {
    console.log('OFFLINE MODE: Add to cart simulated', { productName, category, quantity, unit });
    return Promise.resolve();
  }

  // Online mode - call backend API
  try {
    const response = await api.post('/cart/items', {
      householdId,
      participantId,
      upc,
      productName,
      category,
      quantity,
      unit,
      brand,
      size,
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to add item to cart');
    }
  } catch (error: any) {
    console.error('Failed to add to cart:', error);
    // Re-throw with more details if available
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(itemId: string): Promise<void> {
  try {
    const response = await api.delete(`/cart/items/${itemId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to remove item from cart');
    }
  } catch (error) {
    console.error('Failed to remove from cart:', error);
    throw error;
  }
}

/**
 * Clear entire cart
 */
export async function clearCart(householdId: string = '1'): Promise<void> {
  try {
    const response = await api.delete(`/cart?household_id=${householdId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to clear cart');
    }
  } catch (error) {
    console.error('Failed to clear cart:', error);
    throw error;
  }
}

/**
 * Checkout cart
 */
export async function checkout(householdId: string = '1'): Promise<{ transactionId: string; itemsProcessed: number }> {
  try {
    const response = await api.post('/cart/checkout', { householdId });
    if (response.data.success) {
      return {
        transactionId: response.data.transactionId,
        itemsProcessed: response.data.itemsProcessed,
      };
    }
    throw new Error(response.data.error || 'Failed to checkout');
  } catch (error) {
    console.error('Failed to checkout:', error);
    throw error;
  }
}

/**
 * Get recent sightings for a product
 * Returns empty array in offline mode
 */
export async function getSightings(
  upc: string,
  latitude?: number,
  longitude?: number,
  radiusMiles?: number,
  maxAgeHours?: number
): Promise<ProductSighting[]> {
  // Offline mode - return empty sightings
  if (OFFLINE_MODE) {
    return Promise.resolve([]);
  }

  // Online mode - call backend API
  try {
    const params = new URLSearchParams();
    if (latitude !== undefined) params.append('latitude', latitude.toString());
    if (longitude !== undefined) params.append('longitude', longitude.toString());
    if (radiusMiles !== undefined) params.append('radius_miles', radiusMiles.toString());
    if (maxAgeHours !== undefined) params.append('max_age_hours', maxAgeHours.toString());

    const response = await api.get(`/sightings/${upc}?${params.toString()}`);
    if (response.data.success) {
      return response.data.sightings;
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Failed to fetch sightings:', error);
    throw error;
  }
}

/**
 * Report a product sighting
 * In offline mode, simulates success without persisting
 */
export async function reportSighting(request: ReportSightingRequest): Promise<{ id: string; reportedAt: string }> {
  // Offline mode - simulate success
  if (OFFLINE_MODE) {
    console.log('OFFLINE MODE: Sighting report simulated', request);
    return Promise.resolve({
      id: Date.now().toString(),
      reportedAt: new Date().toISOString(),
    });
  }

  // Online mode - call backend API
  try {
    const response = await api.post('/sightings/report', request);
    if (response.data.success) {
      return response.data.sighting;
    }
    throw new Error(response.data.error || 'Failed to report sighting');
  } catch (error: any) {
    console.error('Failed to report sighting:', error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

/**
 * Mark a sighting as helpful
 */
export async function markSightingHelpful(sightingId: string): Promise<{ helpfulCount: number }> {
  try {
    const response = await api.post(`/sightings/${sightingId}/helpful`);
    if (response.data.success) {
      return { helpfulCount: response.data.helpfulCount };
    }
    throw new Error(response.data.error || 'Failed to mark sighting as helpful');
  } catch (error) {
    console.error('Failed to mark sighting as helpful:', error);
    throw error;
  }
}

/**
 * Get formula availability near a location
 */
export async function getFormulaAvailability(
  latitude?: number,
  longitude?: number,
  radius?: number,
  upc?: string
): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    if (latitude !== undefined) params.append('latitude', latitude.toString());
    if (longitude !== undefined) params.append('longitude', longitude.toString());
    if (radius !== undefined) params.append('radius', radius.toString());
    if (upc) params.append('upc', upc);

    const response = await api.get(`/formula/availability?${params.toString()}`);
    if (response.data.success) {
      return response.data.availability;
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Failed to fetch formula availability:', error);
    throw error;
  }
}

/**
 * Search for formula across stores
 */
export async function searchFormula(
  upcs: string[],
  latitude?: number,
  longitude?: number,
  radiusMiles?: number,
  includeAlternatives?: boolean
): Promise<any[]> {
  try {
    const response = await api.post('/formula/search', {
      upcs,
      lat: latitude,
      lng: longitude,
      radiusMiles,
      includeAlternatives
    });
    if (response.data.success) {
      return response.data.results;
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Failed to search formula:', error);
    throw error;
  }
}

/**
 * Report formula availability
 */
export async function reportFormulaAvailability(
  upc: string,
  storeName: string,
  status: 'in_stock' | 'low_stock' | 'out_of_stock',
  storeAddress?: string,
  latitude?: number,
  longitude?: number,
  quantityRange?: 'few' | 'some' | 'plenty'
): Promise<any> {
  try {
    const response = await api.post('/formula/report', {
      upc,
      storeName,
      storeAddress,
      latitude,
      longitude,
      status,
      quantityRange
    });
    if (response.data.success) {
      return response.data.report;
    }
    throw new Error(response.data.error || 'Failed to report formula');
  } catch (error: any) {
    console.error('Failed to report formula:', error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

/**
 * Get formula alternatives
 */
export async function getFormulaAlternatives(upc: string, state: string = 'MI'): Promise<any[]> {
  try {
    const response = await api.get(`/formula/alternatives/${upc}?state=${state}`);
    if (response.data.success) {
      return response.data.alternatives;
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Failed to fetch formula alternatives:', error);
    throw error;
  }
}

/**
 * Get formula shortages
 */
export async function getFormulaShortages(region: string = 'Michigan'): Promise<any[]> {
  try {
    const response = await api.get(`/formula/shortages?region=${region}`);
    if (response.data.success) {
      return response.data.shortages;
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Failed to fetch formula shortages:', error);
    throw error;
  }
}

// ==================== Formula Products API ====================

/**
 * Get WIC-approved formulas with optional filters
 */
export async function getWicFormulas(
  state?: string,
  type?: FormulaType,
  search?: string
): Promise<WicFormula[]> {
  try {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (type) params.append('type', type);
    if (search) params.append('search', search);

    const response = await api.get(`/formula-products?${params.toString()}`);
    if (response.data.success) {
      return response.data.formulas;
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Failed to fetch WIC formulas:', error);
    throw error;
  }
}

/**
 * Get formula details by UPC
 */
export async function getFormulaByUpc(upc: string): Promise<WicFormula | null> {
  try {
    const response = await api.get(`/formula-products/${upc}`);
    if (response.data.success) {
      return response.data.formula;
    }
    return null;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error('Failed to fetch formula:', error);
    throw error;
  }
}

/**
 * Get formula type options for filter
 */
export async function getFormulaTypes(): Promise<FormulaTypeOption[]> {
  try {
    const response = await api.get('/formula-products/types');
    if (response.data.success) {
      return response.data.types;
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Failed to fetch formula types:', error);
    throw error;
  }
}

/**
 * Get alternative formulas for a given UPC
 * Optionally include availability data if location is provided
 */
export async function getFormulaAlternatives(
  upc: string,
  state?: string,
  location?: { lat: number; lng: number },
  radiusMiles?: number
): Promise<FormulaAlternativesResponse> {
  try {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (location) {
      params.append('lat', location.lat.toString());
      params.append('lng', location.lng.toString());
    }
    if (radiusMiles) params.append('radius', radiusMiles.toString());

    const response = await api.get(`/formula/alternatives/${upc}?${params.toString()}`);
    if (response.data.success) {
      return response.data;
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Failed to fetch formula alternatives:', error);
    throw error;
  }
}

// ==================== Stores API ====================

/**
 * Get nearby stores
 */
export async function getNearbyStores(
  lat: number,
  lng: number,
  radiusMiles?: number,
  chain?: string,
  wicOnly?: boolean
): Promise<Store[]> {
  try {
    const params = new URLSearchParams();
    params.append('lat', lat.toString());
    params.append('lng', lng.toString());
    if (radiusMiles) params.append('radius_miles', radiusMiles.toString());
    if (chain) params.append('chain', chain);
    if (wicOnly) params.append('wic_only', 'true');

    const response = await api.get(`/stores/nearby?${params.toString()}`);
    if (response.data.success) {
      return response.data.stores;
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Failed to fetch nearby stores:', error);
    throw error;
  }
}

/**
 * Get store chains
 */
export async function getStoreChains(): Promise<{ id: string; displayName: string; storeCount: number }[]> {
  try {
    const response = await api.get('/stores/chains');
    if (response.data.success) {
      return response.data.chains;
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Failed to fetch store chains:', error);
    throw error;
  }
}

// ==================== Formula Finder API ====================

/**
 * Search for formula availability at nearby stores
 */
export async function searchFormulaStores(
  formulaUpc: string,
  lat: number,
  lng: number,
  radiusMiles?: number,
  formulaType?: FormulaType
): Promise<{ formula: WicFormula | null; results: StoreResult[] }> {
  try {
    const response = await api.post('/formula-finder/search', {
      formulaUpc,
      lat,
      lng,
      radiusMiles: radiusMiles || 10,
      formulaType
    });
    if (response.data.success) {
      return {
        formula: response.data.formula,
        results: response.data.results
      };
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Failed to search formula stores:', error);
    throw error;
  }
}

// ==================== Participant Formula API ====================

/**
 * Set participant's assigned formula
 */
export async function setParticipantFormula(
  participantId: string,
  formulaUpc: string,
  formulaName?: string
): Promise<void> {
  try {
    const response = await api.put(`/benefits/participants/${participantId}/formula`, {
      formulaUpc,
      formulaName
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to set formula');
    }
  } catch (error: any) {
    console.error('Failed to set participant formula:', error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

/**
 * Get participant's assigned formula
 */
export async function getParticipantFormula(participantId: string): Promise<ParticipantFormula | null> {
  try {
    const response = await api.get(`/benefits/participants/${participantId}/formula`);
    if (response.data.success) {
      return response.data.formula;
    }
    return null;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error('Failed to fetch participant formula:', error);
    throw error;
  }
}

/**
 * Remove participant's formula assignment
 */
export async function removeParticipantFormula(participantId: string): Promise<void> {
  try {
    const response = await api.delete(`/benefits/participants/${participantId}/formula`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to remove formula');
    }
  } catch (error) {
    console.error('Failed to remove participant formula:', error);
    throw error;
  }
}

// ==================== Purchase Logging API ====================

export interface LogPurchaseRequest {
  participantId: string;
  category: string;
  quantity: number;
  unit: string;
  productName?: string;
}

export interface LogPurchaseResponse {
  purchase: {
    productName: string;
    category: string;
    categoryLabel: string;
    quantity: string;
    unit: string;
    participantId: number;
    participantName: string;
    timestamp: string;
  };
  benefit: BenefitAmount & {
    id: number;
    participantId: number;
  };
  participant: {
    id: number;
    householdId: number;
    type: string;
    name: string;
  };
}

/**
 * Log a purchase and decrement benefits
 */
export async function logPurchase(request: LogPurchaseRequest): Promise<LogPurchaseResponse> {
  try {
    const response = await api.post('/manual-benefits/log-purchase', request);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to log purchase');
  } catch (error: any) {
    console.error('Failed to log purchase:', error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

// ==================== Simplified Reporting API ====================

/**
 * Report formula availability (simplified)
 */
export async function reportFormulaSimple(
  upc: string,
  storeId: string,
  quantitySeen: QuantitySeen,
  latitude?: number,
  longitude?: number
): Promise<{ id: string; storeName: string; status: string; impactMessage?: string }> {
  try {
    const response = await api.post('/formula/report-simple', {
      upc,
      storeId,
      quantitySeen,
      latitude,
      longitude
    });
    if (response.data.success) {
      return {
        ...response.data.report,
        impactMessage: response.data.impactMessage
      };
    }
    throw new Error(response.data.error || 'Failed to report formula');
  } catch (error: any) {
    console.error('Failed to report formula (simple):', error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

// ==================== OCR API ====================

export interface OCRBenefit {
  category: string;
  amount: number;
  unit: string;
  confidence: number;
}

export interface OCRResult {
  benefits: OCRBenefit[];
  rawText: string;
  periodStart?: string;
  periodEnd?: string;
}

/**
 * Upload benefit statement image for OCR processing
 */
export async function uploadBenefitStatement(base64Image: string): Promise<OCRResult> {
  try {
    const response = await api.post('/benefits/ocr', {
      image: base64Image,
    });
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to process image');
  } catch (error: any) {
    console.error('Failed to process benefit statement:', error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

// ==================== Benefit Period API ====================

export interface BenefitPeriod {
  start: string;
  end: string;
  daysRemaining: number;
  daysInPeriod: number;
  daysElapsed: number;
  isActive: boolean;
  isExpired: boolean;
  isUpcoming: boolean;
}

/**
 * Get benefit period information
 */
export async function getBenefitPeriod(householdId: string = '1'): Promise<BenefitPeriod> {
  try {
    const response = await api.get(`/benefits/period?household_id=${householdId}`);
    if (response.data.success) {
      return response.data.period;
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Failed to fetch benefit period:', error);
    throw error;
  }
}

/**
 * Update benefit period dates
 */
export async function updateBenefitPeriod(
  householdId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{ start: string; end: string }> {
  try {
    const response = await api.put('/benefits/period', {
      householdId,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    });
    if (response.data.success) {
      return response.data.period;
    }
    throw new Error(response.data.error || 'Failed to update period');
  } catch (error: any) {
    console.error('Failed to update benefit period:', error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

/**
 * Rollover to new benefit period
 */
export async function rolloverBenefitPeriod(
  householdId: string,
  newPeriodStart: Date,
  newPeriodEnd: Date
): Promise<{ start: string; end: string }> {
  try {
    const response = await api.post('/benefits/rollover', {
      householdId,
      newPeriodStart: newPeriodStart.toISOString(),
      newPeriodEnd: newPeriodEnd.toISOString(),
    });
    if (response.data.success) {
      return response.data.period;
    }
    throw new Error(response.data.error || 'Failed to rollover period');
  } catch (error: any) {
    console.error('Failed to rollover benefit period:', error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

// ==================== Cross-Store Search API ====================

/**
 * Search for formula availability across multiple stores
 * Supports searching by UPC, brand, formula type, or free text
 */
export async function crossStoreSearch(
  request: CrossStoreSearchRequest
): Promise<CrossStoreSearchResponse> {
  try {
    const response = await api.post('/cross-store-search', request);
    if (response.data.success) {
      return response.data;
    }
    throw new Error(response.data.error || 'Search failed');
  } catch (error: any) {
    console.error('Cross-store search failed:', error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

/**
 * Quick search for a specific UPC across stores
 */
export async function quickCrossStoreSearch(
  upc: string,
  lat: number,
  lng: number,
  radiusMiles: number = 25
): Promise<{
  formula: WicFormula | null;
  stores: Array<{
    storeName: string;
    storeAddress: string;
    location: { latitude: number; longitude: number } | null;
    distanceMiles: number | null;
    status: string;
    quantityRange: string | null;
    lastReportedAt: string;
    lastReportedAgo: string;
    confidence: number;
    reportCount: number;
  }>;
  count: number;
}> {
  try {
    const response = await api.get(
      `/cross-store-search/quick/${upc}?lat=${lat}&lng=${lng}&radius=${radiusMiles}`
    );
    if (response.data.success) {
      return {
        formula: response.data.formula,
        stores: response.data.stores,
        count: response.data.count
      };
    }
    throw new Error(response.data.error || 'Search failed');
  } catch (error: any) {
    console.error('Quick cross-store search failed:', error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

/**
 * Get available formula brands for search autocomplete
 */
export async function getFormulaBrands(): Promise<FormulaBrand[]> {
  try {
    const response = await api.get('/cross-store-search/brands');
    if (response.data.success) {
      return response.data.brands;
    }
    throw new Error('Failed to fetch brands');
  } catch (error) {
    console.error('Failed to fetch formula brands:', error);
    throw error;
  }
}

export default api;
