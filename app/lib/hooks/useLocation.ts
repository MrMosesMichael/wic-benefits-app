/**
 * useLocation — React hook for centralized location access
 *
 * Wraps locationService to provide reactive state for screens.
 * On mount, loads cached location. Screens can call refresh() for GPS
 * or setZipCode() for manual entry.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  UserLocation,
  LocationSource,
  getSavedLocation,
  requestGPSLocation,
  setManualZipCode,
  clearLocation as clearLocationService,
  isLocationStale,
} from '../services/locationService';

interface UseLocationResult {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  locationSource: LocationSource;
  isStale: boolean;
  /** Request GPS location, detect state, cache */
  refresh: () => Promise<void>;
  /** Set location from zip code, cache */
  setZipCode: (zip: string) => Promise<void>;
  /** Clear saved location */
  clear: () => Promise<void>;
}

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load saved location on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await getSavedLocation();
        if (!cancelled) {
          setLocation(saved);
        }
      } catch {
        // No saved location is fine
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loc = await requestGPSLocation();
      setLocation(loc);
    } catch (err: any) {
      if (err.message === 'PERMISSION_DENIED') {
        setError('Location permission denied. You can enter a zip code instead.');
      } else {
        setError('Failed to get location. Please try again or enter a zip code.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const setZipCode = useCallback(async (zip: string) => {
    try {
      setLoading(true);
      setError(null);
      const loc = await setManualZipCode(zip);
      setLocation(loc);
    } catch (err: any) {
      if (err.message === 'INVALID_ZIP') {
        setError('Please enter a valid 5-digit zip code.');
      } else {
        setError('Could not resolve zip code. Please check and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(async () => {
    await clearLocationService();
    setLocation(null);
    setError(null);
  }, []);

  return {
    location,
    loading,
    error,
    locationSource: location?.source || 'none',
    isStale: location ? isLocationStale(location) : false,
    refresh,
    setZipCode,
    clear,
  };
}
