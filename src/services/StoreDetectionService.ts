/**
 * Store Detection Service
 * Implements GPS-based store detection and geofence matching logic
 */

import LocationService from './LocationService';
import {
  Store,
  GeoPoint,
  StoreDetectionResult,
  WiFiNetwork,
} from '../types/store.types';
import {
  isPointInGeofence,
  isPointInBoundingBox,
  distanceToPolygonEdge,
} from '../utils/geofence.utils';

export interface StoreDetectionConfig {
  maxDistanceMeters: number; // Default: 50 meters
  minConfidence: number; // 0-100, Default: 70
  enableWifiMatching: boolean;
  enableBeaconMatching: boolean;
}

export class StoreDetectionService {
  private static instance: StoreDetectionService;
  private locationService: LocationService;
  private config: StoreDetectionConfig;
  private storeCache: Store[] = [];
  private confirmedStores: Set<string> = new Set();

  private constructor(config?: Partial<StoreDetectionConfig>) {
    this.locationService = LocationService.getInstance();
    this.config = {
      maxDistanceMeters: config?.maxDistanceMeters ?? 50,
      minConfidence: config?.minConfidence ?? 70,
      enableWifiMatching: config?.enableWifiMatching ?? true,
      enableBeaconMatching: config?.enableBeaconMatching ?? false,
    };
  }

  public static getInstance(
    config?: Partial<StoreDetectionConfig>
  ): StoreDetectionService {
    if (!StoreDetectionService.instance) {
      StoreDetectionService.instance = new StoreDetectionService(config);
    }
    return StoreDetectionService.instance;
  }

  /**
   * Detect current store based on GPS location
   */
  public async detectStore(): Promise<StoreDetectionResult> {
    try {
      // Get current GPS position
      const currentPosition = await this.locationService.getCurrentPosition();

      // Get nearby stores from API/cache
      const nearbyStores = await this.getNearbyStores(
        currentPosition,
        this.config.maxDistanceMeters * 3 // Search in wider radius
      );

      if (nearbyStores.length === 0) {
        return {
          store: null,
          confidence: 0,
          method: 'gps',
          nearbyStores: [],
          requiresConfirmation: false,
        };
      }

      // Find best matching store using geofence or distance
      const matchedStore = this.findBestMatch(currentPosition, nearbyStores);

      if (!matchedStore) {
        return {
          store: null,
          confidence: 0,
          method: 'gps',
          nearbyStores,
          requiresConfirmation: false,
        };
      }

      // Calculate confidence based on distance and geofence status
      const confidence = this.calculateConfidence(
        matchedStore.distance,
        matchedStore.insideGeofence
      );

      // Determine detection method
      const method = matchedStore.insideGeofence ? 'geofence' : 'gps';

      // Check if confirmation is needed
      // Geofence matches with high confidence don't need confirmation
      const requiresConfirmation =
        !this.confirmedStores.has(matchedStore.store.id) &&
        confidence < 95;

      return {
        store: matchedStore.store,
        confidence,
        method,
        distanceMeters: matchedStore.distance,
        insideGeofence: matchedStore.insideGeofence,
        nearbyStores: nearbyStores.filter(
          (s) => s.id !== matchedStore.store.id
        ),
        requiresConfirmation,
      };
    } catch (error) {
      console.error('Store detection failed:', error);
      return {
        store: null,
        confidence: 0,
        method: 'gps',
        nearbyStores: [],
        requiresConfirmation: false,
      };
    }
  }

  /**
   * Detect store using WiFi network information (supplementary)
   */
  public async detectStoreByWifi(
    wifiNetwork: WiFiNetwork
  ): Promise<StoreDetectionResult | null> {
    if (!this.config.enableWifiMatching) {
      return null;
    }

    try {
      // Search for stores with matching WiFi networks
      const matchingStores = this.storeCache.filter((store) =>
        store.wifiNetworks?.some(
          (network) =>
            network.ssid === wifiNetwork.ssid ||
            network.bssid === wifiNetwork.bssid
        )
      );

      if (matchingStores.length === 0) {
        return null;
      }

      // If we have GPS, combine with WiFi for higher confidence
      const store = matchingStores[0];
      return {
        store,
        confidence: 90, // High confidence for WiFi match
        method: 'wifi',
        nearbyStores: matchingStores.slice(1),
        requiresConfirmation: !this.confirmedStores.has(store.id),
      };
    } catch (error) {
      console.error('WiFi-based detection failed:', error);
      return null;
    }
  }

  /**
   * Find best matching store based on geofence or distance
   * Prioritizes geofence matching over distance-based matching
   */
  private findBestMatch(
    currentPosition: GeoPoint,
    stores: Store[]
  ): { store: Store; distance: number; insideGeofence: boolean } | null {
    let bestMatch: { store: Store; distance: number; insideGeofence: boolean } | null = null;

    // First pass: Check for geofence matches
    for (const store of stores) {
      if (store.geofence) {
        // Quick pre-check with bounding box for polygons
        if (store.geofence.type === 'polygon') {
          if (!isPointInBoundingBox(currentPosition, store.geofence.coordinates)) {
            continue; // Skip expensive polygon check if outside bounding box
          }
        }

        // Check if point is inside geofence
        const insideGeofence = isPointInGeofence(
          currentPosition,
          store.geofence,
          LocationService.calculateDistance
        );

        if (insideGeofence) {
          const distance = LocationService.calculateDistance(
            currentPosition,
            store.location
          );

          // Prioritize stores where user is actually inside geofence
          // If both have geofence matches, pick the closer one
          if (!bestMatch || distance < bestMatch.distance) {
            bestMatch = { store, distance, insideGeofence: true };
          }
        }
      }
    }

    // If we found a store with geofence match, return it
    if (bestMatch && bestMatch.insideGeofence) {
      return bestMatch;
    }

    // Second pass: Fall back to distance-based matching for stores without geofence
    for (const store of stores) {
      const distance = LocationService.calculateDistance(
        currentPosition,
        store.location
      );

      if (distance <= this.config.maxDistanceMeters) {
        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = { store, distance, insideGeofence: false };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Calculate confidence score based on distance and geofence status
   * Geofence match = very high confidence
   * Closer distance = higher confidence
   */
  private calculateConfidence(distanceMeters: number, insideGeofence: boolean = false): number {
    // If inside geofence, confidence is very high
    if (insideGeofence) {
      if (distanceMeters <= 25) {
        return 100; // Inside geofence and very close to center
      } else if (distanceMeters <= 100) {
        return 98; // Inside geofence, high confidence
      } else {
        return 95; // Inside geofence but far from center
      }
    }

    // Distance-based confidence (fallback when no geofence)
    if (distanceMeters <= 10) {
      return 100; // Very close, high confidence
    } else if (distanceMeters <= 25) {
      return 95; // Close, high confidence
    } else if (distanceMeters <= 50) {
      return 85; // Within likely store boundary
    } else if (distanceMeters <= 100) {
      return 70; // Nearby, moderate confidence
    } else if (distanceMeters <= 200) {
      return 50; // Possibly at this store
    } else {
      return 30; // Low confidence
    }
  }

  /**
   * Get nearby stores from API
   * In a real implementation, this would call the backend API
   */
  private async getNearbyStores(
    location: GeoPoint,
    radiusMeters: number
  ): Promise<Store[]> {
    // TODO: Replace with actual API call
    // For now, return from cache or mock data
    return this.storeCache.filter((store) => {
      const distance = LocationService.calculateDistance(
        location,
        store.location
      );
      return distance <= radiusMeters;
    });
  }

  /**
   * Update store cache (called after fetching from API)
   */
  public updateStoreCache(stores: Store[]): void {
    this.storeCache = stores;
  }

  /**
   * Confirm a detected store (user verification)
   */
  public confirmStore(storeId: string): void {
    this.confirmedStores.add(storeId);
    // Persist to local storage
    this.saveConfirmedStores();
  }

  /**
   * Load confirmed stores from storage
   */
  public async loadConfirmedStores(): Promise<void> {
    // TODO: Implement storage persistence
    // For now, this is a placeholder
  }

  /**
   * Save confirmed stores to storage
   */
  private async saveConfirmedStores(): Promise<void> {
    // TODO: Implement storage persistence
    // For now, this is a placeholder
  }

  /**
   * Get all confirmed stores
   */
  public getConfirmedStores(): string[] {
    return Array.from(this.confirmedStores);
  }

  /**
   * Manual store selection (bypasses GPS detection)
   */
  public selectStoreManually(store: Store): StoreDetectionResult {
    this.confirmStore(store.id);
    return {
      store,
      confidence: 100,
      method: 'manual',
      nearbyStores: [],
      requiresConfirmation: false,
    };
  }

  /**
   * Search stores by query (name, address, city, zip)
   */
  public async searchStores(query: string): Promise<Store[]> {
    // TODO: Replace with actual API call
    const lowerQuery = query.toLowerCase();
    return this.storeCache.filter(
      (store) =>
        store.name.toLowerCase().includes(lowerQuery) ||
        store.chain?.toLowerCase().includes(lowerQuery) ||
        store.address.street.toLowerCase().includes(lowerQuery) ||
        store.address.city.toLowerCase().includes(lowerQuery) ||
        store.address.zip.includes(query)
    );
  }

  /**
   * Watch for store changes (continuous detection)
   */
  public startContinuousDetection(
    onStoreChange: (result: StoreDetectionResult) => void,
    onError?: (error: Error) => void
  ): void {
    this.locationService.watchPosition(
      async (position) => {
        try {
          const nearbyStores = await this.getNearbyStores(position, 150);
          const matchedStore = this.findBestMatch(position, nearbyStores);

          if (matchedStore) {
            const confidence = this.calculateConfidence(
              matchedStore.distance,
              matchedStore.insideGeofence
            );
            const method = matchedStore.insideGeofence ? 'geofence' : 'gps';

            onStoreChange({
              store: matchedStore.store,
              confidence,
              method,
              distanceMeters: matchedStore.distance,
              insideGeofence: matchedStore.insideGeofence,
              nearbyStores: nearbyStores.filter(
                (s) => s.id !== matchedStore.store.id
              ),
              requiresConfirmation:
                !this.confirmedStores.has(matchedStore.store.id) &&
                confidence < 95,
            });
          }
        } catch (error) {
          if (onError) {
            onError(
              error instanceof Error ? error : new Error('Detection failed')
            );
          }
        }
      },
      onError
    );
  }

  /**
   * Stop continuous detection
   */
  public stopContinuousDetection(): void {
    this.locationService.clearWatch();
  }
}

export default StoreDetectionService;
