/**
 * Distance Utilities Tests
 * Unit tests for distance calculation and formatting functions
 */

import {
  calculateDistance,
  formatDistance,
  formatDistanceMetric,
  sortStoresByDistance,
  filterStoresWithinRadius,
  getClosestStore,
} from '../distance.utils';
import { GeoPoint } from '../../types/store.types';

describe('distance.utils', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points using Haversine formula', () => {
      const point1: GeoPoint = { lat: 40.7128, lng: -74.006 }; // NYC
      const point2: GeoPoint = { lat: 34.0522, lng: -118.2437 }; // LA

      const distance = calculateDistance(point1, point2);

      // Distance should be approximately 3,936 km (2,446 miles)
      // or about 3,936,000 meters
      expect(distance).toBeGreaterThan(3900000);
      expect(distance).toBeLessThan(4000000);
    });

    it('should return 0 for same point', () => {
      const point: GeoPoint = { lat: 40.7128, lng: -74.006 };

      expect(calculateDistance(point, point)).toBe(0);
    });

    it('should handle points across prime meridian', () => {
      const point1: GeoPoint = { lat: 51.5074, lng: -0.1278 }; // London
      const point2: GeoPoint = { lat: 51.5074, lng: 0.1278 }; // East of London

      const distance = calculateDistance(point1, point2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(50000); // Less than 50km
    });

    it('should handle points across equator', () => {
      const point1: GeoPoint = { lat: 1, lng: 0 };
      const point2: GeoPoint = { lat: -1, lng: 0 };

      const distance = calculateDistance(point1, point2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeGreaterThan(200000); // > 200km
    });

    it('should be symmetric (distance A to B = distance B to A)', () => {
      const point1: GeoPoint = { lat: 42.2808, lng: -83.743 }; // Ann Arbor
      const point2: GeoPoint = { lat: 42.3314, lng: -83.0458 }; // Detroit

      const distance1 = calculateDistance(point1, point2);
      const distance2 = calculateDistance(point2, point1);

      expect(distance1).toBe(distance2);
    });
  });

  describe('formatDistance', () => {
    it('should format short distances in feet', () => {
      expect(formatDistance(30)).toBe('98 ft');
      expect(formatDistance(100)).toBe('328 ft');
      expect(formatDistance(150)).toBe('492 ft');
    });

    it('should format long distances in miles', () => {
      expect(formatDistance(1609.34)).toBe('1.0 mi'); // Exactly 1 mile
      expect(formatDistance(8046.7)).toBe('5.0 mi'); // 5 miles
      expect(formatDistance(16093.4)).toBe('10.0 mi'); // 10 miles
    });

    it('should use miles for distances >= 0.1 miles (160.934 meters)', () => {
      const threshold = 160.934; // 0.1 miles in meters
      expect(formatDistance(threshold)).toContain('mi');
      expect(formatDistance(threshold - 1)).toContain('ft');
    });

    it('should handle zero distance', () => {
      expect(formatDistance(0)).toBe('0 ft');
    });

    it('should round feet to nearest integer', () => {
      expect(formatDistance(10.4)).toBe('34 ft'); // 34.12 -> 34
      expect(formatDistance(10.6)).toBe('35 ft'); // 34.78 -> 35
    });

    it('should format miles with one decimal place', () => {
      expect(formatDistance(2414.01)).toBe('1.5 mi'); // 1.5 miles
      expect(formatDistance(3218.68)).toBe('2.0 mi'); // 2.0 miles
    });
  });

  describe('formatDistanceMetric', () => {
    it('should format short distances in meters', () => {
      expect(formatDistanceMetric(50)).toBe('50 m');
      expect(formatDistanceMetric(99)).toBe('99 m');
      expect(formatDistanceMetric(75)).toBe('75 m');
    });

    it('should format long distances in kilometers', () => {
      expect(formatDistanceMetric(1000)).toBe('1.0 km');
      expect(formatDistanceMetric(5000)).toBe('5.0 km');
      expect(formatDistanceMetric(15000)).toBe('15.0 km');
    });

    it('should use kilometers for distances >= 0.1 km (100 meters)', () => {
      expect(formatDistanceMetric(100)).toContain('km');
      expect(formatDistanceMetric(99)).toContain('m');
    });

    it('should handle zero distance', () => {
      expect(formatDistanceMetric(0)).toBe('0 m');
    });

    it('should round meters to nearest integer', () => {
      expect(formatDistanceMetric(50.4)).toBe('50 m');
      expect(formatDistanceMetric(50.6)).toBe('51 m');
    });
  });

  describe('sortStoresByDistance', () => {
    const stores = [
      {
        id: '1',
        name: 'Far Store',
        location: { lat: 40.8, lng: -74.0 },
        wicAuthorized: true,
      },
      {
        id: '2',
        name: 'Near Store',
        location: { lat: 40.71, lng: -74.01 },
        wicAuthorized: true,
      },
      {
        id: '3',
        name: 'Middle Store',
        location: { lat: 40.75, lng: -74.02 },
        wicAuthorized: true,
      },
    ];
    const userLocation: GeoPoint = { lat: 40.7128, lng: -74.006 };

    it('should sort stores by distance ascending', () => {
      const sorted = sortStoresByDistance(stores, userLocation);

      expect(sorted[0].id).toBe('2'); // Nearest
      expect(sorted[1].id).toBe('3'); // Middle
      expect(sorted[2].id).toBe('1'); // Farthest
    });

    it('should add distance property to each store', () => {
      const sorted = sortStoresByDistance(stores, userLocation);

      sorted.forEach((store) => {
        expect(store.distance).toBeDefined();
        expect(typeof store.distance).toBe('number');
        expect(store.distance).toBeGreaterThanOrEqual(0);
      });
    });

    it('should preserve original store properties', () => {
      const sorted = sortStoresByDistance(stores, userLocation);

      sorted.forEach((store) => {
        expect(store.name).toBeDefined();
        expect(store.location).toBeDefined();
        expect(store.wicAuthorized).toBe(true);
      });
    });

    it('should handle empty array', () => {
      const sorted = sortStoresByDistance([], userLocation);
      expect(sorted).toEqual([]);
    });

    it('should handle single store', () => {
      const sorted = sortStoresByDistance([stores[0]], userLocation);
      expect(sorted.length).toBe(1);
      expect(sorted[0].id).toBe('1');
      expect(sorted[0].distance).toBeGreaterThan(0);
    });

    it('should maintain ascending order for equal distances', () => {
      const sameLocationStores = [
        { id: '1', location: { lat: 40.7128, lng: -74.006 } },
        { id: '2', location: { lat: 40.7128, lng: -74.006 } },
      ];

      const sorted = sortStoresByDistance(sameLocationStores, userLocation);

      expect(sorted[0].distance).toBe(0);
      expect(sorted[1].distance).toBe(0);
    });
  });

  describe('filterStoresWithinRadius', () => {
    const stores = [
      {
        id: '1',
        name: 'Far Store',
        location: { lat: 40.8, lng: -74.0 },
      },
      {
        id: '2',
        name: 'Near Store',
        location: { lat: 40.7129, lng: -74.0061 },
      },
      {
        id: '3',
        name: 'Very Near Store',
        location: { lat: 40.713, lng: -74.006 },
      },
    ];
    const userLocation: GeoPoint = { lat: 40.7128, lng: -74.006 };

    it('should filter stores within radius', () => {
      const filtered = filterStoresWithinRadius(stores, userLocation, 200);

      // Should include stores 2 and 3, which are very close
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.length).toBeLessThan(stores.length);
      expect(filtered.every((s) => s.distance <= 200)).toBe(true);
    });

    it('should include stores exactly at radius boundary', () => {
      const store = stores[1];
      const distance = calculateDistance(userLocation, store.location);

      const filtered = filterStoresWithinRadius(stores, userLocation, distance);

      expect(filtered.some((s) => s.id === store.id)).toBe(true);
    });

    it('should add distance property to filtered stores', () => {
      const filtered = filterStoresWithinRadius(stores, userLocation, 1000);

      filtered.forEach((store) => {
        expect(store.distance).toBeDefined();
        expect(typeof store.distance).toBe('number');
        expect(store.distance).toBeLessThanOrEqual(1000);
      });
    });

    it('should return empty array when no stores within radius', () => {
      const filtered = filterStoresWithinRadius(stores, userLocation, 1);

      expect(filtered).toEqual([]);
    });

    it('should handle large radius including all stores', () => {
      const filtered = filterStoresWithinRadius(
        stores,
        userLocation,
        100000 // 100km
      );

      expect(filtered.length).toBe(stores.length);
    });

    it('should handle empty store array', () => {
      const filtered = filterStoresWithinRadius([], userLocation, 1000);

      expect(filtered).toEqual([]);
    });
  });

  describe('getClosestStore', () => {
    const stores = [
      {
        id: '1',
        name: 'Far Store',
        location: { lat: 40.8, lng: -74.0 },
      },
      {
        id: '2',
        name: 'Near Store',
        location: { lat: 40.7129, lng: -74.0061 },
      },
      {
        id: '3',
        name: 'Middle Store',
        location: { lat: 40.75, lng: -74.02 },
      },
    ];
    const userLocation: GeoPoint = { lat: 40.7128, lng: -74.006 };

    it('should return closest store', () => {
      const closest = getClosestStore(stores, userLocation);

      expect(closest).toBeDefined();
      expect(closest!.id).toBe('2');
      expect(closest!.distance).toBeDefined();
    });

    it('should return store with distance property', () => {
      const closest = getClosestStore(stores, userLocation);

      expect(closest!.distance).toBeDefined();
      expect(typeof closest!.distance).toBe('number');
      expect(closest!.distance).toBeGreaterThanOrEqual(0);
    });

    it('should return null for empty array', () => {
      expect(getClosestStore([], userLocation)).toBeNull();
    });

    it('should return only store if array has one element', () => {
      const closest = getClosestStore([stores[0]], userLocation);

      expect(closest).toBeDefined();
      expect(closest!.id).toBe('1');
    });

    it('should return store at user location with distance 0', () => {
      const storesAtLocation = [
        {
          id: '1',
          name: 'Here',
          location: userLocation,
        },
        {
          id: '2',
          name: 'Far',
          location: { lat: 40.8, lng: -74.0 },
        },
      ];

      const closest = getClosestStore(storesAtLocation, userLocation);

      expect(closest!.id).toBe('1');
      expect(closest!.distance).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme latitudes (near poles)', () => {
      const northPole: GeoPoint = { lat: 89, lng: 0 };
      const nearNorthPole: GeoPoint = { lat: 88, lng: 0 };

      const distance = calculateDistance(northPole, nearNorthPole);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(200000); // < 200km
    });

    it('should handle extreme longitudes (near date line)', () => {
      const point1: GeoPoint = { lat: 0, lng: 179 };
      const point2: GeoPoint = { lat: 0, lng: -179 };

      const distance = calculateDistance(point1, point2);

      expect(distance).toBeGreaterThan(0);
    });

    it('should handle very small distances (< 1 meter)', () => {
      const point1: GeoPoint = { lat: 40.7128, lng: -74.006 };
      const point2: GeoPoint = { lat: 40.71280001, lng: -74.00600001 };

      const distance = calculateDistance(point1, point2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1);
    });

    it('should handle very large distances (antipodal points)', () => {
      const point1: GeoPoint = { lat: 0, lng: 0 };
      const point2: GeoPoint = { lat: 0, lng: 180 };

      const distance = calculateDistance(point1, point2);

      // Should be approximately half Earth's circumference
      expect(distance).toBeGreaterThan(19000000); // > 19,000 km
      expect(distance).toBeLessThan(21000000); // < 21,000 km
    });
  });
});
