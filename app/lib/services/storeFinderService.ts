import { getNearbyStores, getStoreChains } from './api';
import type { Store } from '../types';

/** Shape the store finder UI expects (nested address/location) */
export interface StoreFinderStore {
  id: number;
  storeId: string;
  chain: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  phone: string | null;
  wicAuthorized: boolean;
  distanceMiles?: number;
}

/** Transform flat API response to nested shape */
function toFinderStore(store: Store): StoreFinderStore {
  return {
    id: store.id,
    storeId: store.storeId,
    chain: store.chain,
    name: store.name,
    address: {
      street: store.streetAddress,
      city: store.city,
      state: store.state,
      zip: store.zip,
    },
    location: {
      latitude: store.latitude,
      longitude: store.longitude,
    },
    phone: store.phone,
    wicAuthorized: store.wicAuthorized,
    distanceMiles: store.distanceMiles,
  };
}

export async function searchStores(
  lat: number,
  lng: number,
  radiusMiles: number = 10,
  chain?: string,
  wicOnly?: boolean
): Promise<StoreFinderStore[]> {
  const stores = await getNearbyStores(lat, lng, radiusMiles, chain, wicOnly);
  return stores.map(toFinderStore);
}

export async function getChains(): Promise<{ id: string; displayName: string; storeCount: number }[]> {
  return getStoreChains();
}
