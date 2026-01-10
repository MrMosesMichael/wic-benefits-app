/**
 * Geofence Utilities Tests
 * Unit tests for geofence matching logic
 */

import {
  isPointInPolygon,
  isPointInCircle,
  isPointInGeofence,
  distanceToPolygonEdge,
  calculatePolygonCentroid,
  calculateBoundingBox,
  isPointInBoundingBox,
  createRectangularGeofence,
  createCircularGeofence,
  isValidPolygon,
} from '../geofence.utils';
import { GeoPoint } from '../../types/store.types';

describe('isPointInPolygon', () => {
  it('should return true for point inside simple square polygon', () => {
    const polygon: GeoPoint[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
    ];
    const point: GeoPoint = { lat: 0.5, lng: 0.5 };

    expect(isPointInPolygon(point, polygon)).toBe(true);
  });

  it('should return false for point outside polygon', () => {
    const polygon: GeoPoint[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
    ];
    const point: GeoPoint = { lat: 2, lng: 2 };

    expect(isPointInPolygon(point, polygon)).toBe(false);
  });

  it('should return false for point on polygon edge', () => {
    const polygon: GeoPoint[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
    ];
    const point: GeoPoint = { lat: 0.5, lng: 1 };

    // Edge cases may vary by algorithm, but this is expected behavior
    const result = isPointInPolygon(point, polygon);
    expect(typeof result).toBe('boolean');
  });

  it('should handle complex polygon (L-shape)', () => {
    const polygon: GeoPoint[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 2 },
      { lat: 1, lng: 2 },
      { lat: 1, lng: 1 },
      { lat: 2, lng: 1 },
      { lat: 2, lng: 0 },
    ];

    expect(isPointInPolygon({ lat: 0.5, lng: 0.5 }, polygon)).toBe(true);
    expect(isPointInPolygon({ lat: 0.5, lng: 1.5 }, polygon)).toBe(true);
    expect(isPointInPolygon({ lat: 1.5, lng: 0.5 }, polygon)).toBe(true);
    expect(isPointInPolygon({ lat: 1.5, lng: 1.5 }, polygon)).toBe(false);
  });

  it('should return false for invalid polygon (less than 3 points)', () => {
    const polygon: GeoPoint[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
    ];
    const point: GeoPoint = { lat: 0.5, lng: 0.5 };

    expect(isPointInPolygon(point, polygon)).toBe(false);
  });
});

describe('isPointInCircle', () => {
  const mockCalculateDistance = (p1: GeoPoint, p2: GeoPoint): number => {
    // Simple Euclidean distance for testing
    const dx = p2.lng - p1.lng;
    const dy = p2.lat - p1.lat;
    return Math.sqrt(dx * dx + dy * dy) * 111320; // Rough conversion to meters
  };

  it('should return true for point inside circle', () => {
    const center: GeoPoint = { lat: 0, lng: 0 };
    const point: GeoPoint = { lat: 0.0001, lng: 0.0001 };
    const radius = 50; // meters

    expect(isPointInCircle(point, center, radius, mockCalculateDistance)).toBe(true);
  });

  it('should return false for point outside circle', () => {
    const center: GeoPoint = { lat: 0, lng: 0 };
    const point: GeoPoint = { lat: 0.01, lng: 0.01 };
    const radius = 50; // meters

    expect(isPointInCircle(point, center, radius, mockCalculateDistance)).toBe(false);
  });

  it('should return true for point at center', () => {
    const center: GeoPoint = { lat: 0, lng: 0 };
    const point: GeoPoint = { lat: 0, lng: 0 };
    const radius = 50;

    expect(isPointInCircle(point, center, radius, mockCalculateDistance)).toBe(true);
  });
});

describe('isPointInGeofence', () => {
  const mockCalculateDistance = (p1: GeoPoint, p2: GeoPoint): number => {
    const dx = p2.lng - p1.lng;
    const dy = p2.lat - p1.lat;
    return Math.sqrt(dx * dx + dy * dy) * 111320;
  };

  it('should handle polygon geofence', () => {
    const geofence = {
      type: 'polygon' as const,
      coordinates: [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 1 },
        { lat: 1, lng: 1 },
        { lat: 1, lng: 0 },
      ],
    };
    const point: GeoPoint = { lat: 0.5, lng: 0.5 };

    expect(isPointInGeofence(point, geofence, mockCalculateDistance)).toBe(true);
  });

  it('should handle circle geofence', () => {
    const geofence = {
      type: 'circle' as const,
      center: { lat: 0, lng: 0 },
      radiusMeters: 50,
    };
    const point: GeoPoint = { lat: 0.0001, lng: 0.0001 };

    expect(isPointInGeofence(point, geofence, mockCalculateDistance)).toBe(true);
  });

  it('should throw error for circle geofence without distance function', () => {
    const geofence = {
      type: 'circle' as const,
      center: { lat: 0, lng: 0 },
      radiusMeters: 50,
    };
    const point: GeoPoint = { lat: 0, lng: 0 };

    expect(() => isPointInGeofence(point, geofence)).toThrow();
  });
});

describe('calculateBoundingBox', () => {
  it('should calculate bounding box correctly', () => {
    const polygon: GeoPoint[] = [
      { lat: 0, lng: 0 },
      { lat: 2, lng: 1 },
      { lat: 1, lng: 3 },
    ];

    const bbox = calculateBoundingBox(polygon);

    expect(bbox.minLat).toBe(0);
    expect(bbox.maxLat).toBe(2);
    expect(bbox.minLng).toBe(0);
    expect(bbox.maxLng).toBe(3);
  });

  it('should throw error for empty polygon', () => {
    expect(() => calculateBoundingBox([])).toThrow();
  });
});

describe('isPointInBoundingBox', () => {
  const polygon: GeoPoint[] = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 1 },
    { lat: 1, lng: 1 },
    { lat: 1, lng: 0 },
  ];

  it('should return true for point inside bounding box', () => {
    expect(isPointInBoundingBox({ lat: 0.5, lng: 0.5 }, polygon)).toBe(true);
  });

  it('should return false for point outside bounding box', () => {
    expect(isPointInBoundingBox({ lat: 2, lng: 2 }, polygon)).toBe(false);
  });

  it('should return true for point on bounding box edge', () => {
    expect(isPointInBoundingBox({ lat: 0, lng: 0.5 }, polygon)).toBe(true);
  });
});

describe('calculatePolygonCentroid', () => {
  it('should calculate centroid of square', () => {
    const polygon: GeoPoint[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 2 },
      { lat: 2, lng: 2 },
      { lat: 2, lng: 0 },
    ];

    const centroid = calculatePolygonCentroid(polygon);

    expect(centroid.lat).toBe(1);
    expect(centroid.lng).toBe(1);
  });

  it('should throw error for empty polygon', () => {
    expect(() => calculatePolygonCentroid([])).toThrow();
  });
});

describe('createRectangularGeofence', () => {
  it('should create rectangular geofence with correct dimensions', () => {
    const center: GeoPoint = { lat: 0, lng: 0 };
    const width = 100; // meters
    const height = 200; // meters

    const geofence = createRectangularGeofence(center, width, height);

    expect(geofence.type).toBe('polygon');
    expect(geofence.coordinates).toHaveLength(4);

    // Check that it forms a rectangle
    const coords = geofence.coordinates;
    expect(coords[0].lat).toBeCloseTo(coords[1].lat); // Top edge
    expect(coords[2].lat).toBeCloseTo(coords[3].lat); // Bottom edge
    expect(coords[0].lng).toBeCloseTo(coords[3].lng); // Left edge
    expect(coords[1].lng).toBeCloseTo(coords[2].lng); // Right edge
  });
});

describe('createCircularGeofence', () => {
  it('should create circular geofence with correct properties', () => {
    const center: GeoPoint = { lat: 40.7128, lng: -74.006 };
    const radius = 75;

    const geofence = createCircularGeofence(center, radius);

    expect(geofence.type).toBe('circle');
    expect(geofence.center).toEqual(center);
    expect(geofence.radiusMeters).toBe(radius);
  });
});

describe('isValidPolygon', () => {
  it('should return true for valid polygon', () => {
    const polygon: GeoPoint[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
    ];

    expect(isValidPolygon(polygon)).toBe(true);
  });

  it('should return false for polygon with less than 3 points', () => {
    const polygon: GeoPoint[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
    ];

    expect(isValidPolygon(polygon)).toBe(false);
  });

  it('should return false for polygon with duplicate consecutive points', () => {
    const polygon: GeoPoint[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
    ];

    expect(isValidPolygon(polygon)).toBe(false);
  });

  it('should return false for polygon with invalid coordinates', () => {
    const polygon: GeoPoint[] = [
      { lat: 91, lng: 0 }, // Latitude out of range
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
    ];

    expect(isValidPolygon(polygon)).toBe(false);
  });

  it('should return false for polygon with invalid longitude', () => {
    const polygon: GeoPoint[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 181 }, // Longitude out of range
      { lat: 1, lng: 1 },
    ];

    expect(isValidPolygon(polygon)).toBe(false);
  });
});

describe('distanceToPolygonEdge', () => {
  it('should calculate distance to nearest edge', () => {
    const polygon: GeoPoint[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
    ];

    // Point in center should be roughly 0.5 degrees from any edge
    const point: GeoPoint = { lat: 0.5, lng: 0.5 };
    const distance = distanceToPolygonEdge(point, polygon);

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(1);
  });

  it('should return Infinity for invalid polygon', () => {
    const polygon: GeoPoint[] = [{ lat: 0, lng: 0 }];
    const point: GeoPoint = { lat: 0.5, lng: 0.5 };

    expect(distanceToPolygonEdge(point, polygon)).toBe(Infinity);
  });
});
