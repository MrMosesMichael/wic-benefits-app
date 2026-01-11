/**
 * Store API Service
 * Handles API calls for store data retrieval
 */

import { Store, GeoPoint, WiFiNetwork } from '../types/store.types';

// API configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.wicbenefits.app';
const API_VERSION = 'v1';

export interface NearbyStoresParams {
  lat: number;
  lng: number;
  radius?: number; // in meters, default 500
  limit?: number; // default 20
  wicOnly?: boolean; // only WIC-authorized stores
}

export interface StoreDetectionParams {
  lat: number;
  lng: number;
  wifiBssid?: string;
  wifiSsid?: string;
}

export class StoreApiService {
  private static instance: StoreApiService;
  private apiToken: string | null = null;

  private constructor() {}

  public static getInstance(): StoreApiService {
    if (!StoreApiService.instance) {
      StoreApiService.instance = new StoreApiService();
    }
    return StoreApiService.instance;
  }

  /**
   * Set API authentication token
   */
  public setApiToken(token: string): void {
    this.apiToken = token;
  }

  /**
   * Get nearby stores
   */
  public async getNearbyStores(
    params: NearbyStoresParams
  ): Promise<Store[]> {
    const queryParams = new URLSearchParams({
      lat: params.lat.toString(),
      lng: params.lng.toString(),
      radius: (params.radius || 500).toString(),
      limit: (params.limit || 20).toString(),
    });

    if (params.wicOnly) {
      queryParams.append('wic_only', 'true');
    }

    const response = await this.fetch(
      `/stores?${queryParams.toString()}`
    );

    return response.stores || [];
  }

  /**
   * Detect store based on location and WiFi
   */
  public async detectStore(
    params: StoreDetectionParams
  ): Promise<{ store: Store | null; confidence: number; method: string }> {
    const response = await this.fetch('/stores/detect', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    return response;
  }

  /**
   * Get store by ID
   */
  public async getStoreById(storeId: string): Promise<Store> {
    const response = await this.fetch(`/stores/${storeId}`);
    return response.store;
  }

  /**
   * Search stores by query string
   */
  public async searchStores(query: string, options?: {
    lat?: number;
    lng?: number;
    radius?: number;
    wicOnly?: boolean;
  }): Promise<Store[]> {
    const queryParams = new URLSearchParams({
      q: query,
    });

    if (options?.lat !== undefined && options?.lng !== undefined) {
      queryParams.append('lat', options.lat.toString());
      queryParams.append('lng', options.lng.toString());
    }

    if (options?.radius) {
      queryParams.append('radius', options.radius.toString());
    }

    if (options?.wicOnly) {
      queryParams.append('wic_only', 'true');
    }

    const response = await this.fetch(
      `/stores/search?${queryParams.toString()}`
    );

    return response.stores || [];
  }

  /**
   * Search stores by city/zip code
   */
  public async searchStoresByLocation(
    location: string,
    options?: {
      wicOnly?: boolean;
      limit?: number;
    }
  ): Promise<Store[]> {
    const queryParams = new URLSearchParams({
      location: location,
    });

    if (options?.wicOnly) {
      queryParams.append('wic_only', 'true');
    }

    if (options?.limit) {
      queryParams.append('limit', options.limit.toString());
    }

    const response = await this.fetch(
      `/stores/search/location?${queryParams.toString()}`
    );

    return response.stores || [];
  }

  /**
   * Report store information (crowdsourced correction)
   */
  public async reportStoreInfo(
    storeId: string,
    report: {
      type: 'hours' | 'location' | 'closed' | 'other';
      details: string;
    }
  ): Promise<void> {
    await this.fetch('/stores/report', {
      method: 'POST',
      body: JSON.stringify({
        storeId,
        ...report,
      }),
    });
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetch(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${API_BASE_URL}/api/${API_VERSION}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API fetch error:', error);
      throw error;
    }
  }

  /**
   * Parse store data from API response
   */
  private parseStore(data: any): Store {
    return {
      id: data.id,
      name: data.name,
      chain: data.chain,
      chainId: data.chainId,
      address: {
        street: data.address.street,
        street2: data.address.street2,
        city: data.address.city,
        state: data.address.state,
        zip: data.address.zip,
        country: data.address.country || 'US',
      },
      location: {
        lat: data.location.lat,
        lng: data.location.lng,
      },
      wicAuthorized: data.wicAuthorized,
      wicVendorId: data.wicVendorId,
      phone: data.phone,
      hours: data.hours || [],
      holidayHours: data.holidayHours || [],
      timezone: data.timezone || 'America/New_York',
      features: {
        hasPharmacy: data.features?.hasPharmacy,
        hasDeliCounter: data.features?.hasDeliCounter,
        hasBakery: data.features?.hasBakery,
        acceptsEbt: data.features?.acceptsEbt,
        acceptsWic: data.features?.acceptsWic,
        hasWicKiosk: data.features?.hasWicKiosk,
      },
      inventoryApiAvailable: data.inventoryApiAvailable || false,
      inventoryApiType: data.inventoryApiType,
      wifiNetworks: data.wifiNetworks || [],
      beacons: data.beacons || [],
      lastVerified: new Date(data.lastVerified),
      dataSource: data.dataSource || 'api',
      active: data.active !== false,
    };
  }
}

export default StoreApiService;
