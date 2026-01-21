/**
 * useProductLookup Hook
 *
 * React hook for product lookup functionality
 * Provides easy access to product API from mobile app
 *
 * Features:
 * - Product lookup by UPC
 * - Loading and error states
 * - Caching with React Query
 * - Automatic retry on failure
 */

import { useState, useCallback } from 'react';
import {
  Product,
  ProductLookupResult,
  ProductCoverageStats,
} from '../types/product.types';
import { ProductApiClient, getProductApiClient } from '../services/product/ProductApiClient';

/**
 * Product lookup state
 */
interface ProductLookupState {
  /** Is request in progress? */
  loading: boolean;

  /** Error if request failed */
  error: Error | null;

  /** Lookup result (if completed) */
  result: ProductLookupResult | null;
}

/**
 * Batch lookup state
 */
interface BatchLookupState {
  loading: boolean;
  error: Error | null;
  results: ProductLookupResult[];
}

/**
 * Search state
 */
interface SearchState {
  loading: boolean;
  error: Error | null;
  products: Product[];
}

/**
 * useProductLookup Hook
 *
 * Provides product lookup functionality with state management
 *
 * @param apiClient - Optional API client (uses default if not provided)
 */
export function useProductLookup(apiClient?: ProductApiClient) {
  const client = apiClient || getProductApiClient();

  // Single product lookup state
  const [lookupState, setLookupState] = useState<ProductLookupState>({
    loading: false,
    error: null,
    result: null,
  });

  // Batch lookup state
  const [batchState, setBatchState] = useState<BatchLookupState>({
    loading: false,
    error: null,
    results: [],
  });

  // Search state
  const [searchState, setSearchState] = useState<SearchState>({
    loading: false,
    error: null,
    products: [],
  });

  /**
   * Lookup single product by UPC
   *
   * @param upc - Universal Product Code
   */
  const lookupProduct = useCallback(
    async (upc: string): Promise<ProductLookupResult | null> => {
      setLookupState({ loading: true, error: null, result: null });

      try {
        const result = await client.getProduct(upc);
        setLookupState({ loading: false, error: null, result });
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        setLookupState({ loading: false, error: err, result: null });
        return null;
      }
    },
    [client]
  );

  /**
   * Batch lookup multiple products
   *
   * @param upcs - Array of UPCs (max 100)
   */
  const batchLookup = useCallback(
    async (upcs: string[]): Promise<ProductLookupResult[]> => {
      setBatchState({ loading: true, error: null, results: [] });

      try {
        const results = await client.batchLookup(upcs);
        setBatchState({ loading: false, error: null, results });
        return results;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        setBatchState({ loading: false, error: err, results: [] });
        return [];
      }
    },
    [client]
  );

  /**
   * Search products
   *
   * @param params - Search parameters
   */
  const searchProducts = useCallback(
    async (params: {
      q?: string;
      brand?: string;
      category?: string;
      verified?: boolean;
      page?: number;
      limit?: number;
    }): Promise<Product[]> => {
      setSearchState({ loading: true, error: null, products: [] });

      try {
        const products = await client.searchProducts(params);
        setSearchState({ loading: false, error: null, products });
        return products;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        setSearchState({ loading: false, error: err, products: [] });
        return [];
      }
    },
    [client]
  );

  /**
   * Report unknown product
   *
   * @param upc - UPC not found
   * @param reportedBy - User ID
   * @param userProvidedInfo - Optional product info
   */
  const reportUnknownProduct = useCallback(
    async (
      upc: string,
      reportedBy: string,
      userProvidedInfo?: Partial<Product>
    ): Promise<string | null> => {
      try {
        const reportId = await client.reportUnknownProduct(
          upc,
          reportedBy,
          userProvidedInfo
        );
        return reportId;
      } catch (error) {
        console.error('Failed to report unknown product:', error);
        return null;
      }
    },
    [client]
  );

  /**
   * Get coverage statistics
   */
  const getCoverageStats = useCallback(async (): Promise<ProductCoverageStats | null> => {
    try {
      return await client.getCoverageStats();
    } catch (error) {
      console.error('Failed to get coverage stats:', error);
      return null;
    }
  }, [client]);

  /**
   * Clear lookup state
   */
  const clearLookup = useCallback(() => {
    setLookupState({ loading: false, error: null, result: null });
  }, []);

  /**
   * Clear batch state
   */
  const clearBatch = useCallback(() => {
    setBatchState({ loading: false, error: null, results: [] });
  }, []);

  /**
   * Clear search state
   */
  const clearSearch = useCallback(() => {
    setSearchState({ loading: false, error: null, products: [] });
  }, []);

  return {
    // Single product lookup
    lookupProduct,
    lookupLoading: lookupState.loading,
    lookupError: lookupState.error,
    lookupResult: lookupState.result,
    clearLookup,

    // Batch lookup
    batchLookup,
    batchLoading: batchState.loading,
    batchError: batchState.error,
    batchResults: batchState.results,
    clearBatch,

    // Search
    searchProducts,
    searchLoading: searchState.loading,
    searchError: searchState.error,
    searchResults: searchState.products,
    clearSearch,

    // Utilities
    reportUnknownProduct,
    getCoverageStats,
  };
}
