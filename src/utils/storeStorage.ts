/**
 * Store Storage Utilities
 * Handles persistence of confirmed stores, favorites, and recent stores
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Store } from '../types/store.types';

// Storage keys
const STORAGE_KEYS = {
  CONFIRMED_STORES: '@wic/confirmed_stores',
  FAVORITE_STORES: '@wic/favorite_stores',
  RECENT_STORES: '@wic/recent_stores',
  DEFAULT_STORE: '@wic/default_store',
};

// Maximum number of recent stores to keep
const MAX_RECENT_STORES = 10;

/**
 * Confirmed Stores Management
 */

export async function getConfirmedStores(): Promise<Set<string>> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.CONFIRMED_STORES);
    if (!stored) return new Set();
    const storeIds = JSON.parse(stored) as string[];
    return new Set(storeIds);
  } catch (error) {
    console.error('Failed to load confirmed stores:', error);
    return new Set();
  }
}

export async function addConfirmedStore(storeId: string): Promise<void> {
  try {
    const confirmed = await getConfirmedStores();
    confirmed.add(storeId);
    await AsyncStorage.setItem(
      STORAGE_KEYS.CONFIRMED_STORES,
      JSON.stringify(Array.from(confirmed))
    );
  } catch (error) {
    console.error('Failed to save confirmed store:', error);
  }
}

export async function removeConfirmedStore(storeId: string): Promise<void> {
  try {
    const confirmed = await getConfirmedStores();
    confirmed.delete(storeId);
    await AsyncStorage.setItem(
      STORAGE_KEYS.CONFIRMED_STORES,
      JSON.stringify(Array.from(confirmed))
    );
  } catch (error) {
    console.error('Failed to remove confirmed store:', error);
  }
}

export async function isStoreConfirmed(storeId: string): Promise<boolean> {
  const confirmed = await getConfirmedStores();
  return confirmed.has(storeId);
}

/**
 * Favorite Stores Management
 */

export async function getFavoriteStores(): Promise<Store[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_STORES);
    if (!stored) return [];
    return JSON.parse(stored) as Store[];
  } catch (error) {
    console.error('Failed to load favorite stores:', error);
    return [];
  }
}

export async function addFavoriteStore(store: Store): Promise<void> {
  try {
    const favorites = await getFavoriteStores();

    // Check if already in favorites
    if (favorites.some(f => f.id === store.id)) {
      return; // Already a favorite
    }

    favorites.push(store);
    await AsyncStorage.setItem(
      STORAGE_KEYS.FAVORITE_STORES,
      JSON.stringify(favorites)
    );
  } catch (error) {
    console.error('Failed to add favorite store:', error);
  }
}

export async function removeFavoriteStore(storeId: string): Promise<void> {
  try {
    const favorites = await getFavoriteStores();
    const filtered = favorites.filter(f => f.id !== storeId);
    await AsyncStorage.setItem(
      STORAGE_KEYS.FAVORITE_STORES,
      JSON.stringify(filtered)
    );
  } catch (error) {
    console.error('Failed to remove favorite store:', error);
  }
}

export async function isStoreFavorite(storeId: string): Promise<boolean> {
  const favorites = await getFavoriteStores();
  return favorites.some(f => f.id === storeId);
}

export async function toggleFavoriteStore(store: Store): Promise<boolean> {
  const isFavorite = await isStoreFavorite(store.id);
  if (isFavorite) {
    await removeFavoriteStore(store.id);
    return false;
  } else {
    await addFavoriteStore(store);
    return true;
  }
}

/**
 * Recent Stores Management
 */

export async function getRecentStores(): Promise<Store[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_STORES);
    if (!stored) return [];
    return JSON.parse(stored) as Store[];
  } catch (error) {
    console.error('Failed to load recent stores:', error);
    return [];
  }
}

export async function addRecentStore(store: Store): Promise<void> {
  try {
    let recent = await getRecentStores();

    // Remove if already in list (we'll add to front)
    recent = recent.filter(r => r.id !== store.id);

    // Add to front
    recent.unshift(store);

    // Keep only MAX_RECENT_STORES
    recent = recent.slice(0, MAX_RECENT_STORES);

    await AsyncStorage.setItem(
      STORAGE_KEYS.RECENT_STORES,
      JSON.stringify(recent)
    );
  } catch (error) {
    console.error('Failed to add recent store:', error);
  }
}

export async function clearRecentStores(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.RECENT_STORES);
  } catch (error) {
    console.error('Failed to clear recent stores:', error);
  }
}

/**
 * Default Store Management
 */

export async function getDefaultStore(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.DEFAULT_STORE);
  } catch (error) {
    console.error('Failed to load default store:', error);
    return null;
  }
}

export async function setDefaultStore(storeId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DEFAULT_STORE, storeId);
  } catch (error) {
    console.error('Failed to set default store:', error);
  }
}

export async function clearDefaultStore(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.DEFAULT_STORE);
  } catch (error) {
    console.error('Failed to clear default store:', error);
  }
}

/**
 * Bulk Operations
 */

export async function clearAllStoreData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.CONFIRMED_STORES,
      STORAGE_KEYS.FAVORITE_STORES,
      STORAGE_KEYS.RECENT_STORES,
      STORAGE_KEYS.DEFAULT_STORE,
    ]);
  } catch (error) {
    console.error('Failed to clear all store data:', error);
  }
}

export interface StoreStorageState {
  confirmed: Set<string>;
  favorites: Store[];
  recent: Store[];
  defaultStoreId: string | null;
}

export async function getAllStoreData(): Promise<StoreStorageState> {
  const [confirmed, favorites, recent, defaultStoreId] = await Promise.all([
    getConfirmedStores(),
    getFavoriteStores(),
    getRecentStores(),
    getDefaultStore(),
  ]);

  return {
    confirmed,
    favorites,
    recent,
    defaultStoreId,
  };
}
