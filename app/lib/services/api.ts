/**
 * API Service for WIC Benefits Backend
 */
import axios from 'axios';

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

/**
 * Check if a product is WIC-eligible
 */
export async function checkEligibility(upc: string): Promise<EligibilityResult> {
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

export default api;
