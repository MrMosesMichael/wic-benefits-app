/**
 * useStoreDetection Hook
 * React hook for GPS-based store detection
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import StoreDetectionService from '../services/StoreDetectionService';
import LocationService from '../services/LocationService';
import {
  Store,
  StoreDetectionResult,
  LocationPermissionStatus,
} from '../types/store.types';
import * as StoreStorage from '../utils/storeStorage';

export interface UseStoreDetectionResult {
  currentStore: Store | null;
  nearbyStores: Store[];
  favoriteStores: Store[];
  recentStores: Store[];
  confidence: number;
  isDetecting: boolean;
  error: Error | null;
  permissionStatus: LocationPermissionStatus | null;
  requiresConfirmation: boolean;
  detectStore: () => Promise<void>;
  confirmStore: (storeId: string) => void;
  selectStore: (store: Store) => void;
  requestPermissions: () => Promise<void>;
  searchStores: (query: string) => Promise<Store[]>;
  startContinuousDetection: () => void;
  stopContinuousDetection: () => void;
  toggleFavorite: (store: Store) => Promise<boolean>;
  isFavorite: (storeId: string) => boolean;
  setAsDefault: (storeId: string) => Promise<void>;
}

export function useStoreDetection(): UseStoreDetectionResult {
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [favoriteStores, setFavoriteStores] = useState<Store[]>([]);
  const [recentStores, setRecentStores] = useState<Store[]>([]);
  const [confidence, setConfidence] = useState<number>(0);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<LocationPermissionStatus | null>(null);
  const [requiresConfirmation, setRequiresConfirmation] =
    useState<boolean>(false);

  const storeDetectionService = useRef(StoreDetectionService.getInstance());
  const locationService = useRef(LocationService.getInstance());

  /**
   * Check permissions on mount and load stored data
   */
  useEffect(() => {
    checkPermissions();
    loadConfirmedStores();
    loadFavoriteStores();
    loadRecentStores();
  }, []);

  /**
   * Check location permissions
   */
  const checkPermissions = useCallback(async () => {
    try {
      const status = await locationService.current.checkPermissions();
      setPermissionStatus(status);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Permission check failed')
      );
    }
  }, []);

  /**
   * Request location permissions
   */
  const requestPermissions = useCallback(async () => {
    try {
      const status = await locationService.current.requestPermissions();
      setPermissionStatus(status);

      if (status.granted) {
        // Auto-detect store after permission granted
        await detectStore();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Permission request failed')
      );
    }
  }, []);

  /**
   * Load confirmed stores from storage
   */
  const loadConfirmedStores = useCallback(async () => {
    try {
      await storeDetectionService.current.loadConfirmedStores();
    } catch (err) {
      console.error('Failed to load confirmed stores:', err);
    }
  }, []);

  /**
   * Load favorite stores from storage
   */
  const loadFavoriteStores = useCallback(async () => {
    try {
      const favorites = await StoreStorage.getFavoriteStores();
      setFavoriteStores(favorites);
    } catch (err) {
      console.error('Failed to load favorite stores:', err);
    }
  }, []);

  /**
   * Load recent stores from storage
   */
  const loadRecentStores = useCallback(async () => {
    try {
      const recent = await StoreStorage.getRecentStores();
      setRecentStores(recent);
    } catch (err) {
      console.error('Failed to load recent stores:', err);
    }
  }, []);

  /**
   * Detect current store
   */
  const detectStore = useCallback(async () => {
    setIsDetecting(true);
    setError(null);

    try {
      const result = await storeDetectionService.current.detectStore();
      updateStoreDetectionState(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Detection failed'));
      setCurrentStore(null);
      setNearbyStores([]);
      setConfidence(0);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  /**
   * Update state from detection result
   */
  const updateStoreDetectionState = useCallback(
    (result: StoreDetectionResult) => {
      setCurrentStore(result.store);
      setNearbyStores(result.nearbyStores || []);
      setConfidence(result.confidence);
      setRequiresConfirmation(result.requiresConfirmation);
    },
    []
  );

  /**
   * Confirm detected store
   */
  const confirmStore = useCallback(async (storeId: string) => {
    storeDetectionService.current.confirmStore(storeId);
    setRequiresConfirmation(false);

    // Add to recent stores
    if (currentStore && currentStore.id === storeId) {
      await StoreStorage.addRecentStore(currentStore);
      await loadRecentStores();
    }
  }, [currentStore, loadRecentStores]);

  /**
   * Manually select a store
   */
  const selectStore = useCallback(async (store: Store) => {
    const result = storeDetectionService.current.selectStoreManually(store);
    updateStoreDetectionState(result);

    // Add to recent stores
    await StoreStorage.addRecentStore(store);
    await loadRecentStores();
  }, [updateStoreDetectionState, loadRecentStores]);

  /**
   * Search for stores
   */
  const searchStores = useCallback(async (query: string): Promise<Store[]> => {
    try {
      return await storeDetectionService.current.searchStores(query);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Search failed'));
      return [];
    }
  }, []);

  /**
   * Start continuous store detection
   */
  const startContinuousDetection = useCallback(() => {
    storeDetectionService.current.startContinuousDetection(
      (result) => {
        updateStoreDetectionState(result);
      },
      (err) => {
        setError(err);
      }
    );
  }, [updateStoreDetectionState]);

  /**
   * Stop continuous detection
   */
  const stopContinuousDetection = useCallback(() => {
    storeDetectionService.current.stopContinuousDetection();
  }, []);

  /**
   * Toggle favorite status of a store
   */
  const toggleFavorite = useCallback(async (store: Store): Promise<boolean> => {
    try {
      const isFavoriteNow = await StoreStorage.toggleFavoriteStore(store);
      await loadFavoriteStores();
      return isFavoriteNow;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Toggle favorite failed'));
      return false;
    }
  }, [loadFavoriteStores]);

  /**
   * Check if a store is favorited
   */
  const isFavorite = useCallback((storeId: string): boolean => {
    return favoriteStores.some(f => f.id === storeId);
  }, [favoriteStores]);

  /**
   * Set a store as default
   */
  const setAsDefault = useCallback(async (storeId: string): Promise<void> => {
    try {
      await StoreStorage.setDefaultStore(storeId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Set default failed'));
    }
  }, []);

  return {
    currentStore,
    nearbyStores,
    favoriteStores,
    recentStores,
    confidence,
    isDetecting,
    error,
    permissionStatus,
    requiresConfirmation,
    detectStore,
    confirmStore,
    selectStore,
    requestPermissions,
    searchStores,
    startContinuousDetection,
    stopContinuousDetection,
    toggleFavorite,
    isFavorite,
    setAsDefault,
  };
}
