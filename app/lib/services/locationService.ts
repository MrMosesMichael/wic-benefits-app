/**
 * Centralized Location Service
 *
 * Manages GPS detection and manual zip code entry with AsyncStorage persistence.
 * Provides state detection for all location-dependent screens.
 */
import * as ExpoLocation from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const STORAGE_KEY = '@wic_location';
const PREFERENCE_KEY = '@wic_location_preference';
const LOCATION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type LocationSource = 'gps' | 'manual' | 'none';
export type LocationPreference = 'gps' | 'manual' | 'ask';

export interface UserLocation {
  lat: number;
  lng: number;
  state: string;
  zipCode?: string;
  city?: string;
  source: LocationSource;
  supported: boolean;
  timestamp: number;
}

export const SUPPORTED_STATES = ['MI', 'NC', 'FL', 'OR', 'NY'];

/**
 * Get saved location from AsyncStorage
 */
export async function getSavedLocation(): Promise<UserLocation | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as UserLocation;
  } catch {
    return null;
  }
}

/**
 * Save location to AsyncStorage
 */
async function saveLocation(location: UserLocation): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(location));
}

/**
 * Get user's location preference
 */
export async function getLocationPreference(): Promise<LocationPreference> {
  try {
    const pref = await AsyncStorage.getItem(PREFERENCE_KEY);
    if (pref === 'gps' || pref === 'manual' || pref === 'ask') return pref;
    return 'ask';
  } catch {
    return 'ask';
  }
}

/**
 * Set user's location preference
 */
export async function setLocationPreference(pref: LocationPreference): Promise<void> {
  await AsyncStorage.setItem(PREFERENCE_KEY, pref);
}

/**
 * Check if saved location is stale (>30 days old)
 */
export function isLocationStale(location: UserLocation): boolean {
  return Date.now() - location.timestamp > LOCATION_MAX_AGE_MS;
}

/**
 * Request GPS location, detect state via backend, cache result
 */
export async function requestGPSLocation(): Promise<UserLocation> {
  const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('PERMISSION_DENIED');
  }

  const loc = await ExpoLocation.getCurrentPositionAsync({
    accuracy: ExpoLocation.Accuracy.Balanced,
  });

  // Detect state from coordinates via backend
  try {
    const response = await api.get(
      `/location/detect-state?lat=${loc.coords.latitude}&lng=${loc.coords.longitude}`
    );

    if (response.data.success) {
      const result: UserLocation = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        state: response.data.location.state,
        city: response.data.location.city,
        zipCode: response.data.location.zipCode,
        source: 'gps',
        supported: response.data.location.supported,
        timestamp: Date.now(),
      };
      await saveLocation(result);
      return result;
    }
  } catch {
    // API unavailable — fall back to coordinates only with unknown state
  }

  // Fallback: save coords without state detection
  const fallback: UserLocation = {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    state: 'MI', // Default fallback
    source: 'gps',
    supported: true,
    timestamp: Date.now(),
  };
  await saveLocation(fallback);
  return fallback;
}

/**
 * Resolve a zip code via backend, cache result
 */
export async function setManualZipCode(zipCode: string): Promise<UserLocation> {
  if (!/^\d{5}$/.test(zipCode)) {
    throw new Error('INVALID_ZIP');
  }

  const response = await api.post('/location/resolve', { zipCode });

  if (!response.data.success) {
    throw new Error(response.data.error || 'ZIP_NOT_FOUND');
  }

  const loc = response.data.location;
  const result: UserLocation = {
    lat: loc.lat,
    lng: loc.lng,
    state: loc.state,
    city: loc.city,
    zipCode: loc.zipCode,
    source: 'manual',
    supported: loc.supported,
    timestamp: Date.now(),
  };

  await saveLocation(result);
  await setLocationPreference('manual');
  return result;
}

/**
 * Clear saved location and preference
 */
export async function clearLocation(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_KEY, PREFERENCE_KEY]);
}

/**
 * Get location: returns cached, or null if none saved
 * Screens should check this first, then prompt user if null
 */
export async function getLocation(): Promise<UserLocation | null> {
  const saved = await getSavedLocation();
  if (saved) return saved;
  return null;
}
