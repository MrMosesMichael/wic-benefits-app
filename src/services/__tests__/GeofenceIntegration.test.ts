/**
 * Geofence Integration Tests
 * End-to-end tests for geofence-based store detection
 */

import StoreDetectionService from '../StoreDetectionService';
import GeofenceManager from '../GeofenceManager';
import LocationService from '../LocationService';
import { Store, GeoPoint } from '../../types/store.types';
import { createCircularGeofence } from '../../utils/geofence.utils';

describe('Geofence Integration Tests', () => {
  let storeDetectionService: StoreDetectionService;
  let geofenceManager: GeofenceManager;

  beforeEach(() => {
    storeDetectionService = StoreDetectionService.getInstance();
    geofenceManager = GeofenceManager.getInstance();
  });

  describe('Circular Geofence Detection', () => {
    it('should detect store when user is inside circular geofence', async () => {
      // Create a mock store with circular geofence
      const mockStore: Store = createMockStore({
        id: 'store-1',
        name: 'Walmart',
        location: { lat: 40.7128, lng: -74.006 },
        geofence: createCircularGeofence({ lat: 40.7128, lng: -74.006 }, 75),
      });

      // User location inside the geofence (within 50m)
      const userLocation: GeoPoint = { lat: 40.7130, lng: -74.0062 };

      // Check if user is inside geofence
      const isInside = geofenceManager.isPointInStoreGeofence(userLocation, mockStore);
      expect(isInside).toBe(true);

      // Get match details
      const matchDetails = geofenceManager.getMatchDetails(userLocation, mockStore);
      expect(matchDetails.inside).toBe(true);
      expect(matchDetails.confidence).toBeGreaterThanOrEqual(95);
    });

    it('should not detect store when user is outside circular geofence', () => {
      const mockStore: Store = createMockStore({
        id: 'store-1',
        name: 'Walmart',
        location: { lat: 40.7128, lng: -74.006 },
        geofence: createCircularGeofence({ lat: 40.7128, lng: -74.006 }, 75),
      });

      // User location outside the geofence (200m away)
      const userLocation: GeoPoint = { lat: 40.7145, lng: -74.006 };

      const isInside = geofenceManager.isPointInStoreGeofence(userLocation, mockStore);
      expect(isInside).toBe(false);
    });
  });

  describe('Polygon Geofence Detection', () => {
    it('should detect store when user is inside polygon geofence', () => {
      const mockStore: Store = createMockStore({
        id: 'store-2',
        name: 'Kroger',
        location: { lat: 40.7128, lng: -74.006 },
        geofence: {
          type: 'polygon',
          coordinates: [
            { lat: 40.7126, lng: -74.0062 },
            { lat: 40.7126, lng: -74.0058 },
            { lat: 40.7130, lng: -74.0058 },
            { lat: 40.7130, lng: -74.0062 },
          ],
        },
      });

      // User location inside the polygon
      const userLocation: GeoPoint = { lat: 40.7128, lng: -74.006 };

      const isInside = geofenceManager.isPointInStoreGeofence(userLocation, mockStore);
      expect(isInside).toBe(true);

      const matchDetails = geofenceManager.getMatchDetails(userLocation, mockStore);
      expect(matchDetails.inside).toBe(true);
    });

    it('should not detect store when user is outside polygon geofence', () => {
      const mockStore: Store = createMockStore({
        id: 'store-2',
        name: 'Kroger',
        location: { lat: 40.7128, lng: -74.006 },
        geofence: {
          type: 'polygon',
          coordinates: [
            { lat: 40.7126, lng: -74.0062 },
            { lat: 40.7126, lng: -74.0058 },
            { lat: 40.7130, lng: -74.0058 },
            { lat: 40.7130, lng: -74.0062 },
          ],
        },
      });

      // User location outside the polygon
      const userLocation: GeoPoint = { lat: 40.7135, lng: -74.006 };

      const isInside = geofenceManager.isPointInStoreGeofence(userLocation, mockStore);
      expect(isInside).toBe(false);
    });
  });

  describe('Multiple Store Scenarios', () => {
    it('should select closest store when user is inside multiple geofences', () => {
      const store1: Store = createMockStore({
        id: 'store-1',
        name: 'Walmart',
        location: { lat: 40.7128, lng: -74.006 },
        geofence: createCircularGeofence({ lat: 40.7128, lng: -74.006 }, 100),
      });

      const store2: Store = createMockStore({
        id: 'store-2',
        name: 'Target',
        location: { lat: 40.7132, lng: -74.006 },
        geofence: createCircularGeofence({ lat: 40.7132, lng: -74.006 }, 100),
      });

      const stores = [store1, store2];

      // User location closer to store2
      const userLocation: GeoPoint = { lat: 40.7131, lng: -74.006 };

      const bestMatch = geofenceManager.findBestMatch(userLocation, stores);

      expect(bestMatch).not.toBeNull();
      expect(bestMatch?.store.id).toBe('store-2');
      expect(bestMatch?.result.confidence).toBeGreaterThanOrEqual(95);
    });

    it('should find all containing stores', () => {
      const store1: Store = createMockStore({
        id: 'store-1',
        name: 'Walmart',
        location: { lat: 40.7128, lng: -74.006 },
        geofence: createCircularGeofence({ lat: 40.7128, lng: -74.006 }, 100),
      });

      const store2: Store = createMockStore({
        id: 'store-2',
        name: 'Target',
        location: { lat: 40.7132, lng: -74.006 },
        geofence: createCircularGeofence({ lat: 40.7132, lng: -74.006 }, 100),
      });

      const store3: Store = createMockStore({
        id: 'store-3',
        name: 'CVS',
        location: { lat: 40.7150, lng: -74.006 },
        geofence: createCircularGeofence({ lat: 40.7150, lng: -74.006 }, 30),
      });

      const stores = [store1, store2, store3];

      // User location inside store1 and store2, but not store3
      const userLocation: GeoPoint = { lat: 40.7130, lng: -74.006 };

      const containingStores = geofenceManager.findContainingStores(userLocation, stores);

      expect(containingStores).toHaveLength(2);
      expect(containingStores.map((s) => s.id)).toContain('store-1');
      expect(containingStores.map((s) => s.id)).toContain('store-2');
      expect(containingStores.map((s) => s.id)).not.toContain('store-3');
    });
  });

  describe('Fallback to Distance-Based Detection', () => {
    it('should fall back to distance when no geofence available', () => {
      const store: Store = createMockStore({
        id: 'store-1',
        name: 'Small Market',
        location: { lat: 40.7128, lng: -74.006 },
        // No geofence
      });

      const userLocation: GeoPoint = { lat: 40.7129, lng: -74.006 };

      const matchDetails = geofenceManager.getMatchDetails(userLocation, store);

      expect(matchDetails.inside).toBe(false);
      expect(matchDetails.distanceToCenter).toBeLessThan(50);
      expect(matchDetails.confidence).toBeGreaterThan(0);
    });
  });

  describe('Confidence Scoring', () => {
    it('should give high confidence for geofence + close to center', () => {
      const store: Store = createMockStore({
        id: 'store-1',
        name: 'Walmart',
        location: { lat: 40.7128, lng: -74.006 },
        geofence: createCircularGeofence({ lat: 40.7128, lng: -74.006 }, 75),
      });

      // User very close to center and inside geofence
      const userLocation: GeoPoint = { lat: 40.7128, lng: -74.0061 };

      const matchDetails = geofenceManager.getMatchDetails(userLocation, store);

      expect(matchDetails.inside).toBe(true);
      expect(matchDetails.distanceToCenter).toBeLessThan(25);
      expect(matchDetails.confidence).toBe(100);
    });

    it('should give medium-high confidence for geofence but far from center', () => {
      const store: Store = createMockStore({
        id: 'store-1',
        name: 'Walmart',
        location: { lat: 40.7128, lng: -74.006 },
        geofence: createCircularGeofence({ lat: 40.7128, lng: -74.006 }, 100),
      });

      // User inside geofence but far from center
      const userLocation: GeoPoint = { lat: 40.7135, lng: -74.006 };

      const matchDetails = geofenceManager.getMatchDetails(userLocation, store);

      expect(matchDetails.inside).toBe(true);
      expect(matchDetails.distanceToCenter).toBeGreaterThan(50);
      expect(matchDetails.confidence).toBeGreaterThanOrEqual(95);
    });
  });

  describe('Geofence Validation', () => {
    it('should validate geofences and report errors', () => {
      const stores: Store[] = [
        createMockStore({
          id: 'store-1',
          name: 'Valid Store',
          geofence: createCircularGeofence({ lat: 40.7128, lng: -74.006 }, 75),
        }),
        createMockStore({
          id: 'store-2',
          name: 'Invalid Store',
          geofence: {
            type: 'circle',
            center: { lat: 40.7128, lng: -74.006 },
            radiusMeters: -10, // Invalid negative radius
          },
        }),
        createMockStore({
          id: 'store-3',
          name: 'Invalid Polygon',
          geofence: {
            type: 'polygon',
            coordinates: [
              { lat: 40.7128, lng: -74.006 },
              { lat: 40.7129, lng: -74.006 },
              // Only 2 points, invalid polygon
            ],
          },
        }),
      ];

      const errors = geofenceManager.validateGeofences(stores);

      expect(errors).toHaveLength(2);
      expect(errors.map((e) => e.storeId)).toContain('store-2');
      expect(errors.map((e) => e.storeId)).toContain('store-3');
    });
  });

  describe('Geofence Statistics', () => {
    it('should calculate geofence coverage statistics', () => {
      const stores: Store[] = [
        createMockStore({
          id: 'store-1',
          geofence: createCircularGeofence({ lat: 40.7128, lng: -74.006 }, 75),
        }),
        createMockStore({
          id: 'store-2',
          geofence: {
            type: 'polygon',
            coordinates: [
              { lat: 40.7126, lng: -74.0062 },
              { lat: 40.7126, lng: -74.0058 },
              { lat: 40.7130, lng: -74.0058 },
              { lat: 40.7130, lng: -74.0062 },
            ],
          },
        }),
        createMockStore({ id: 'store-3' }), // No geofence
        createMockStore({ id: 'store-4' }), // No geofence
      ];

      const stats = geofenceManager.getGeofenceStats(stores);

      expect(stats.total).toBe(4);
      expect(stats.withGeofence).toBe(2);
      expect(stats.polygons).toBe(1);
      expect(stats.circles).toBe(1);
      expect(stats.coverage).toBe(50);
    });
  });

  describe('Default Geofence Generation', () => {
    it('should generate appropriate default geofence for big box store', () => {
      const store: Store = createMockStore({
        id: 'store-1',
        name: 'Walmart',
        chain: 'Walmart',
        location: { lat: 40.7128, lng: -74.006 },
      });

      const geofence = geofenceManager.generateDefaultGeofence(store);

      expect(geofence.type).toBe('circle');
      expect(geofence).toHaveProperty('radiusMeters');
      if (geofence.type === 'circle') {
        expect(geofence.radiusMeters).toBe(100); // Big box store
      }
    });

    it('should generate appropriate default geofence for pharmacy', () => {
      const store: Store = createMockStore({
        id: 'store-1',
        name: 'CVS',
        chain: 'CVS',
        location: { lat: 40.7128, lng: -74.006 },
      });

      const geofence = geofenceManager.generateDefaultGeofence(store);

      expect(geofence.type).toBe('circle');
      if (geofence.type === 'circle') {
        expect(geofence.radiusMeters).toBe(30); // Pharmacy
      }
    });
  });
});

/**
 * Helper function to create mock stores
 */
function createMockStore(overrides: Partial<Store> = {}): Store {
  return {
    id: 'mock-store-id',
    name: 'Mock Store',
    address: {
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
      country: 'US',
    },
    location: { lat: 40.7128, lng: -74.006 },
    wicAuthorized: true,
    hours: [],
    timezone: 'America/New_York',
    features: {
      acceptsWic: true,
    },
    inventoryApiAvailable: false,
    lastVerified: new Date(),
    dataSource: 'api',
    active: true,
    ...overrides,
  };
}
