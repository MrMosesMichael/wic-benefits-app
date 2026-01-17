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

// Benefits Types
export type BenefitCategory =
  | 'milk'
  | 'eggs'
  | 'cereal'
  | 'peanut_butter'
  | 'fruits_vegetables'
  | 'whole_grains'
  | 'juice'
  | 'cheese'
  | 'infant_formula'
  | 'infant_food';

export interface BenefitAmount {
  category: BenefitCategory;
  categoryLabel: string;
  available: string;
  total: string;
  unit: 'gal' | 'oz' | 'lb' | 'doz' | 'count' | 'dollar';
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
