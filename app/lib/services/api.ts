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
  ParticipantFormula
} from '../types';
import { checkEligibilityOffline, getTotalProductCount } from './offlineEligibility';

// Set to true to use offline data (no server needed)
export const OFFLINE_MODE = true;

// Configure based on environment
const API_BASE_URL = __DEV__
  ? 'http://192.168.12.94:3000/api/v1'
  : 'https://api.wicbenefits.app/api/v1'; // TODO: Replace with production URL

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
  cartId: string;
  items: CartItem[];
  itemCount: number;
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
 */
export async function getBenefits(householdId: string = '1'): Promise<Household> {
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
 */
export async function getCart(householdId: string = '1'): Promise<Cart> {
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
 */
export async function getSightings(
  upc: string,
  latitude?: number,
  longitude?: number,
  radiusMiles?: number,
  maxAgeHours?: number
): Promise<ProductSighting[]> {
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
 */
export async function reportSighting(request: ReportSightingRequest): Promise<{ id: string; reportedAt: string }> {
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
): Promise<{ id: string; storeName: string; status: string }> {
  try {
    const response = await api.post('/formula/report-simple', {
      upc,
      storeId,
      quantitySeen,
      latitude,
      longitude
    });
    if (response.data.success) {
      return response.data.report;
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

export default api;
