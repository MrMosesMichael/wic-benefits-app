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

export interface UseStoreDetectionResult {
  currentStore: Store | null;
  nearbyStores: Store[];
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
}

export function useStoreDetection(): UseStoreDetectionResult {
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
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
   * Check permissions on mount
   */
  useEffect(() => {
    checkPermissions();
    loadConfirmedStores();
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
  const confirmStore = useCallback((storeId: string) => {
    storeDetectionService.current.confirmStore(storeId);
    setRequiresConfirmation(false);
  }, []);

  /**
   * Manually select a store
   */
  const selectStore = useCallback((store: Store) => {
    const result = storeDetectionService.current.selectStoreManually(store);
    updateStoreDetectionState(result);
  }, [updateStoreDetectionState]);

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

  return {
    currentStore,
    nearbyStores,
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
  };
}
