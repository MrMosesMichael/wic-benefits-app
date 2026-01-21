/**
 * Store API Types
 * Type definitions for store search API requests and responses
 */

import { Store } from '../../types/store.types';

/**
 * Query parameters for store search endpoint
 */
export interface StoreSearchParams {
  lat: number;
  lng: number;
  radiusMiles?: number;
  wicAuthorizedOnly?: boolean;
  limit?: number;
  offset?: number;
  state?: string;
  features?: string[];
}

/**
 * Store search result with distance information
 */
export interface StoreSearchResult extends Store {
  distanceMeters: number;
  distanceMiles: number;
}

/**
 * Store search API response
 */
export interface StoreSearchResponse {
  stores: StoreSearchResult[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * API error response
 */
export interface StoreApiError {
  error: string;
  message: string;
}
