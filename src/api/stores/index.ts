/**
 * Store API Endpoints
 * Exports all store-related API handlers
 */

export { searchStores, createSearchHandler } from './search';
export type {
  StoreSearchParams,
  StoreSearchResult,
  StoreSearchResponse,
  StoreApiError,
} from './types';
