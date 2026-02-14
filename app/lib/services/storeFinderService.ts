import { getNearbyStores, getStoreChains } from './api';
import type { Store } from '../types';

export interface StoreFinderResult {
  stores: Store[];
}

export async function searchStores(
  lat: number,
  lng: number,
  radiusMiles: number = 10,
  chain?: string,
  wicOnly?: boolean
): Promise<Store[]> {
  return getNearbyStores(lat, lng, radiusMiles, chain, wicOnly);
}

export async function getChains(): Promise<{ id: string; displayName: string; storeCount: number }[]> {
  return getStoreChains();
}
