/**
 * Geofence Manager Service
 * Manages multiple geofences and provides advanced matching capabilities
 */

import {
  Store,
  GeoPoint,
  Geofence,
  GeofencePolygon,
  GeofenceCircle,
} from '../types/store.types';
import {
  isPointInGeofence,
  isPointInBoundingBox,
  distanceToPolygonEdge,
  calculateBoundingBox,
  isValidPolygon,
  createRectangularGeofence,
  createCircularGeofence,
} from '../utils/geofence.utils';
import LocationService from './LocationService';

export interface GeofenceMatchResult {
  storeId: string;
  inside: boolean;
  distanceToCenter: number;
  distanceToEdge?: number;
  confidence: number;
}

export interface GeofenceManagerConfig {
  enableCaching: boolean;
  cacheExpiryMs: number; // Default: 5 minutes
}

export class GeofenceManager {
  private static instance: GeofenceManager;
  private geofenceCache: Map<string, Geofence> = new Map();
  private lastCacheUpdate: Map<string, number> = new Map();
  private config: GeofenceManagerConfig;

  private constructor(config?: Partial<GeofenceManagerConfig>) {
    this.config = {
      enableCaching: config?.enableCaching ?? true,
      cacheExpiryMs: config?.cacheExpiryMs ?? 5 * 60 * 1000, // 5 minutes
    };
  }

  public static getInstance(
    config?: Partial<GeofenceManagerConfig>
  ): GeofenceManager {
    if (!GeofenceManager.instance) {
      GeofenceManager.instance = new GeofenceManager(config);
    }
    return GeofenceManager.instance;
  }

  /**
   * Check which stores the point is inside
   *
   * @param point - Current GPS position
   * @param stores - Array of stores to check
   * @returns Array of stores that contain the point
   */
  public findContainingStores(point: GeoPoint, stores: Store[]): Store[] {
    const containingStores: Store[] = [];

    for (const store of stores) {
      if (store.geofence) {
        const isInside = this.isPointInStoreGeofence(point, store);
        if (isInside) {
          containingStores.push(store);
        }
      }
    }

    return containingStores;
  }

  /**
   * Check if a point is inside a store's geofence
   *
   * @param point - GPS position to check
   * @param store - Store with geofence
   * @returns true if point is inside store geofence
   */
  public isPointInStoreGeofence(point: GeoPoint, store: Store): boolean {
    if (!store.geofence) {
      return false;
    }

    // Use cached geofence if available and fresh
    const cachedGeofence = this.getCachedGeofence(store.id);
    const geofence = cachedGeofence || store.geofence;

    // Quick bounding box pre-check for polygons
    if (geofence.type === 'polygon') {
      if (!isPointInBoundingBox(point, geofence.coordinates)) {
        return false;
      }
    }

    // Full geofence check
    return isPointInGeofence(point, geofence, LocationService.calculateDistance);
  }

  /**
   * Get detailed matching information for a store
   *
   * @param point - GPS position
   * @param store - Store to check
   * @returns Detailed match result
   */
  public getMatchDetails(point: GeoPoint, store: Store): GeofenceMatchResult {
    const distanceToCenter = LocationService.calculateDistance(point, store.location);
    const inside = store.geofence ? this.isPointInStoreGeofence(point, store) : false;

    let distanceToEdge: number | undefined;
    let confidence: number;

    if (store.geofence) {
      if (store.geofence.type === 'polygon') {
        // Calculate distance to polygon edge in degrees
        const edgeDistanceDegrees = distanceToPolygonEdge(point, store.geofence.coordinates);
        // Convert to meters accounting for latitude
        // At the equator: 1 degree ≈ 111,320 meters
        // As you move towards poles, longitude distances decrease with cos(latitude)
        const latDegreesPerMeter = 1 / 111320;
        const lngDegreesPerMeter = 1 / (111320 * Math.cos((point.lat * Math.PI) / 180));
        // Use average of lat and lng conversion for rough approximation
        const avgDegreesPerMeter = (latDegreesPerMeter + lngDegreesPerMeter) / 2;
        distanceToEdge = edgeDistanceDegrees / avgDegreesPerMeter;
      } else if (store.geofence.type === 'circle') {
        distanceToEdge = Math.abs(distanceToCenter - store.geofence.radiusMeters);
      }

      // Calculate confidence
      if (inside) {
        confidence = this.calculateGeofenceConfidence(distanceToCenter, distanceToEdge);
      } else {
        // Outside geofence, low confidence
        confidence = Math.max(0, 100 - (distanceToEdge || distanceToCenter) / 2);
      }
    } else {
      // No geofence, use distance-based confidence
      confidence = this.calculateDistanceConfidence(distanceToCenter);
    }

    return {
      storeId: store.id,
      inside,
      distanceToCenter,
      distanceToEdge,
      confidence: Math.round(confidence),
    };
  }

  /**
   * Calculate confidence for geofence-based detection
   * Higher confidence when user is well inside the geofence
   */
  private calculateGeofenceConfidence(
    distanceToCenter: number,
    distanceToEdge?: number
  ): number {
    // Inside geofence = high base confidence
    let confidence = 95;

    // Closer to center = higher confidence
    if (distanceToCenter <= 25) {
      confidence = 100;
    } else if (distanceToCenter <= 50) {
      confidence = 98;
    } else if (distanceToCenter <= 100) {
      confidence = 96;
    }

    // Far from edge = higher confidence (less chance of GPS error)
    if (distanceToEdge !== undefined) {
      if (distanceToEdge > 20) {
        confidence = Math.min(100, confidence + 2);
      }
    }

    return confidence;
  }

  /**
   * Calculate confidence for distance-based detection (no geofence)
   */
  private calculateDistanceConfidence(distanceMeters: number): number {
    if (distanceMeters <= 10) {
      return 100;
    } else if (distanceMeters <= 25) {
      return 95;
    } else if (distanceMeters <= 50) {
      return 85;
    } else if (distanceMeters <= 100) {
      return 70;
    } else if (distanceMeters <= 200) {
      return 50;
    } else {
      return 30;
    }
  }

  /**
   * Find the best matching store from multiple candidates
   *
   * @param point - GPS position
   * @param stores - Candidate stores
   * @returns Best matching store or null
   */
  public findBestMatch(
    point: GeoPoint,
    stores: Store[]
  ): { store: Store; result: GeofenceMatchResult } | null {
    if (stores.length === 0) {
      return null;
    }

    const matches: Array<{ store: Store; result: GeofenceMatchResult }> = [];

    // Get match details for all stores
    for (const store of stores) {
      const result = this.getMatchDetails(point, store);
      matches.push({ store, result });
    }

    // Sort by confidence (highest first), then by distance to center
    matches.sort((a, b) => {
      if (a.result.confidence !== b.result.confidence) {
        return b.result.confidence - a.result.confidence;
      }
      return a.result.distanceToCenter - b.result.distanceToCenter;
    });

    return matches[0];
  }

  /**
   * Generate a default geofence for a store without one
   * Creates a circular geofence based on store type
   *
   * @param store - Store to generate geofence for
   * @returns Generated geofence
   */
  public generateDefaultGeofence(store: Store): Geofence {
    // Determine radius based on store chain (big box stores = larger geofence)
    let radius = 50; // Default 50 meters

    if (store.chain) {
      const chain = store.chain.toLowerCase();
      if (
        chain.includes('walmart') ||
        chain.includes('target') ||
        chain.includes('costco')
      ) {
        radius = 100; // Big box stores
      } else if (chain.includes('cvs') || chain.includes('walgreens')) {
        radius = 30; // Pharmacies
      }
    }

    return createCircularGeofence(store.location, radius);
  }

  /**
   * Validate all geofences for a set of stores
   *
   * @param stores - Stores to validate
   * @returns Array of validation errors
   */
  public validateGeofences(stores: Store[]): Array<{ storeId: string; error: string }> {
    const errors: Array<{ storeId: string; error: string }> = [];

    for (const store of stores) {
      if (store.geofence) {
        if (store.geofence.type === 'polygon') {
          if (!isValidPolygon(store.geofence.coordinates)) {
            errors.push({
              storeId: store.id,
              error: 'Invalid polygon geometry',
            });
          }
        } else if (store.geofence.type === 'circle') {
          if (store.geofence.radiusMeters <= 0) {
            errors.push({
              storeId: store.id,
              error: 'Invalid circle radius',
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Cache a geofence for faster lookups
   */
  private cacheGeofence(storeId: string, geofence: Geofence): void {
    if (this.config.enableCaching) {
      this.geofenceCache.set(storeId, geofence);
      this.lastCacheUpdate.set(storeId, Date.now());
    }
  }

  /**
   * Get cached geofence if available and not expired
   */
  private getCachedGeofence(storeId: string): Geofence | null {
    if (!this.config.enableCaching) {
      return null;
    }

    const cached = this.geofenceCache.get(storeId);
    const lastUpdate = this.lastCacheUpdate.get(storeId);

    if (cached && lastUpdate) {
      const age = Date.now() - lastUpdate;
      if (age < this.config.cacheExpiryMs) {
        return cached;
      } else {
        // Expired, remove from cache
        this.geofenceCache.delete(storeId);
        this.lastCacheUpdate.delete(storeId);
      }
    }

    return null;
  }

  /**
   * Clear all cached geofences
   */
  public clearCache(): void {
    this.geofenceCache.clear();
    this.lastCacheUpdate.clear();
  }

  /**
   * Preload geofences for a set of stores
   * Useful for optimization when you know which stores will be checked
   */
  public preloadGeofences(stores: Store[]): void {
    for (const store of stores) {
      if (store.geofence) {
        this.cacheGeofence(store.id, store.geofence);
      }
    }
  }

  /**
   * Get statistics about geofence coverage
   *
   * @param stores - Stores to analyze
   * @returns Statistics object
   */
  public getGeofenceStats(stores: Store[]): {
    total: number;
    withGeofence: number;
    polygons: number;
    circles: number;
    coverage: number;
  } {
    let withGeofence = 0;
    let polygons = 0;
    let circles = 0;

    for (const store of stores) {
      if (store.geofence) {
        withGeofence++;
        if (store.geofence.type === 'polygon') {
          polygons++;
        } else {
          circles++;
        }
      }
    }

    return {
      total: stores.length,
      withGeofence,
      polygons,
      circles,
      coverage: stores.length > 0 ? (withGeofence / stores.length) * 100 : 0,
    };
  }
}

export default GeofenceManager;
