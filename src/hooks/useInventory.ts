/**
 * useInventory Hook
 * React hook for managing product inventory queries
 */

import { useState, useEffect, useCallback } from 'react';
import { getInventoryManager } from '../services/inventory';
import type { Inventory, InventoryAPIError } from '../types/inventory.types';

interface UseInventoryOptions {
  /**
   * Auto-fetch on mount
   */
  autoFetch?: boolean;

  /**
   * Refetch interval in milliseconds (0 to disable)
   */
  refetchInterval?: number;

  /**
   * Enable caching (default: true)
   */
  cache?: boolean;

  /**
   * Treat as formula product (shorter cache TTL, higher priority)
   */
  isFormula?: boolean;
}

interface UseInventoryResult {
  /**
   * Inventory data (null if not fetched)
   */
  inventory: Inventory | null;

  /**
   * Loading state
   */
  loading: boolean;

  /**
   * Error state
   */
  error: Error | null;

  /**
   * Manually refetch inventory
   */
  refetch: () => Promise<void>;

  /**
   * Clear current inventory data
   */
  clear: () => void;
}

/**
 * Hook for fetching inventory for a single product
 */
export function useInventory(
  upc: string | null,
  storeId: string | null,
  options: UseInventoryOptions = {}
): UseInventoryResult {
  const {
    autoFetch = true,
    refetchInterval = 0,
    cache = true,
    isFormula = false,
  } = options;

  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!upc || !storeId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const manager = getInventoryManager();

      let result: Inventory;
      if (isFormula) {
        result = await manager.getFormulaInventory(upc, storeId);
      } else {
        result = await manager.getInventory(upc, storeId);
      }

      setInventory(result);
    } catch (err) {
      setError(err as Error);
      setInventory(null);
    } finally {
      setLoading(false);
    }
  }, [upc, storeId, isFormula]);

  const clear = useCallback(() => {
    setInventory(null);
    setError(null);
  }, []);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch && upc && storeId) {
      fetchInventory();
    }
  }, [autoFetch, upc, storeId, fetchInventory]);

  // Set up refetch interval if specified
  useEffect(() => {
    if (refetchInterval > 0 && upc && storeId) {
      const intervalId = setInterval(() => {
        fetchInventory();
      }, refetchInterval);

      return () => clearInterval(intervalId);
    }
  }, [refetchInterval, upc, storeId, fetchInventory]);

  return {
    inventory,
    loading,
    error,
    refetch: fetchInventory,
    clear,
  };
}

interface UseInventoryBatchOptions {
  autoFetch?: boolean;
  refetchInterval?: number;
  cache?: boolean;
}

interface UseInventoryBatchResult {
  inventories: Inventory[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clear: () => void;
  getInventory: (upc: string) => Inventory | undefined;
}

/**
 * Hook for fetching inventory for multiple products at once
 */
export function useInventoryBatch(
  upcs: string[],
  storeId: string | null,
  options: UseInventoryBatchOptions = {}
): UseInventoryBatchResult {
  const { autoFetch = true, refetchInterval = 0 } = options;

  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchInventories = useCallback(async () => {
    if (upcs.length === 0 || !storeId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const manager = getInventoryManager();
      const results = await manager.getInventoryBatch(upcs, storeId);
      setInventories(results);
    } catch (err) {
      setError(err as Error);
      setInventories([]);
    } finally {
      setLoading(false);
    }
  }, [upcs, storeId]);

  const clear = useCallback(() => {
    setInventories([]);
    setError(null);
  }, []);

  const getInventory = useCallback(
    (upc: string): Inventory | undefined => {
      return inventories.find(inv => inv.upc === upc);
    },
    [inventories]
  );

  useEffect(() => {
    if (autoFetch && upcs.length > 0 && storeId) {
      fetchInventories();
    }
  }, [autoFetch, upcs, storeId, fetchInventories]);

  useEffect(() => {
    if (refetchInterval > 0 && upcs.length > 0 && storeId) {
      const intervalId = setInterval(() => {
        fetchInventories();
      }, refetchInterval);

      return () => clearInterval(intervalId);
    }
  }, [refetchInterval, upcs, storeId, fetchInventories]);

  return {
    inventories,
    loading,
    error,
    refetch: fetchInventories,
    clear,
    getInventory,
  };
}

interface UseCrossStoreInventoryOptions {
  autoFetch?: boolean;
  sortByDistance?: boolean;
}

interface StoreInventoryResult {
  storeId: string;
  inventory: Inventory;
  distance?: number;
}

interface UseCrossStoreInventoryResult {
  results: StoreInventoryResult[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clear: () => void;
  inStockStores: StoreInventoryResult[];
  closestInStock: StoreInventoryResult | null;
}

/**
 * Hook for searching inventory across multiple stores
 */
export function useCrossStoreInventory(
  upc: string | null,
  storeIds: string[],
  storeDistances?: Record<string, number>,
  options: UseCrossStoreInventoryOptions = {}
): UseCrossStoreInventoryResult {
  const { autoFetch = true, sortByDistance = true } = options;

  const [results, setResults] = useState<StoreInventoryResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCrossStore = useCallback(async () => {
    if (!upc || storeIds.length === 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const manager = getInventoryManager();
      const inventoryMap = await manager.searchInventoryAcrossStores(upc, storeIds);

      let storeResults: StoreInventoryResult[] = Array.from(inventoryMap.entries()).map(
        ([storeId, inventory]) => ({
          storeId,
          inventory,
          distance: storeDistances?.[storeId],
        })
      );

      // Sort by distance if enabled and distances provided
      if (sortByDistance && storeDistances) {
        storeResults = storeResults.sort((a, b) => {
          const distA = a.distance ?? Infinity;
          const distB = b.distance ?? Infinity;
          return distA - distB;
        });
      }

      setResults(storeResults);
    } catch (err) {
      setError(err as Error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [upc, storeIds, storeDistances, sortByDistance]);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  // Get stores with in-stock status
  const inStockStores = results.filter(r => r.inventory.status === 'in_stock');

  // Get closest in-stock store
  const closestInStock = inStockStores.length > 0 ? inStockStores[0] : null;

  useEffect(() => {
    if (autoFetch && upc && storeIds.length > 0) {
      fetchCrossStore();
    }
  }, [autoFetch, upc, storeIds, fetchCrossStore]);

  return {
    results,
    loading,
    error,
    refetch: fetchCrossStore,
    clear,
    inStockStores,
    closestInStock,
  };
}

/**
 * Hook for monitoring formula availability with alerts
 */
export function useFormulaAlert(
  formulaUPCs: string[],
  monitoredStores: string[],
  onFormulaAvailable?: (upc: string, storeId: string, inventory: Inventory) => void,
  checkIntervalMs: number = 15 * 60 * 1000 // 15 minutes default
) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkAvailability = useCallback(async () => {
    if (formulaUPCs.length === 0 || monitoredStores.length === 0) {
      return;
    }

    const manager = getInventoryManager();

    for (const upc of formulaUPCs) {
      try {
        const results = await manager.searchInventoryAcrossStores(upc, monitoredStores);

        for (const [storeId, inventory] of results) {
          if (inventory.status === 'in_stock' && onFormulaAvailable) {
            onFormulaAvailable(upc, storeId, inventory);
          }
        }
      } catch (error) {
        console.error(`Error checking formula ${upc}:`, error);
      }
    }

    setLastCheck(new Date());
  }, [formulaUPCs, monitoredStores, onFormulaAvailable]);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  // Set up monitoring interval
  useEffect(() => {
    if (isMonitoring && formulaUPCs.length > 0 && monitoredStores.length > 0) {
      // Initial check
      checkAvailability();

      // Set up interval
      const intervalId = setInterval(checkAvailability, checkIntervalMs);

      return () => clearInterval(intervalId);
    }
  }, [isMonitoring, formulaUPCs, monitoredStores, checkAvailability, checkIntervalMs]);

  return {
    isMonitoring,
    lastCheck,
    startMonitoring,
    stopMonitoring,
    checkNow: checkAvailability,
  };
}

/**
 * Hook for inventory manager health and stats
 */
export function useInventoryHealth() {
  const [health, setHealth] = useState<Map<string, boolean>>(new Map());
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    try {
      const manager = getInventoryManager();
      const healthStatus = await manager.getHealthStatus();
      setHealth(healthStatus);

      // Get rate limiter stats for Walmart
      const walmartStats = manager.getRateLimiterStats('walmart');
      setStats(walmartStats);
    } catch (error) {
      console.error('Error checking inventory health:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    health,
    stats,
    loading,
    refresh: checkHealth,
  };
}
