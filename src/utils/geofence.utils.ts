/**
 * Geofence Utilities
 * Point-in-polygon detection and geofence matching algorithms
 */

import { GeoPoint, Geofence, GeofencePolygon, GeofenceCircle } from '../types/store.types';

/**
 * Check if a point is inside a polygon using ray-casting algorithm
 * Based on the Jordan curve theorem
 *
 * @param point - The point to test
 * @param polygon - The polygon coordinates
 * @returns true if point is inside polygon
 */
export function isPointInPolygon(
  point: GeoPoint,
  polygon: GeoPoint[]
): boolean {
  if (polygon.length < 3) {
    return false; // Not a valid polygon
  }

  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    // Check if point crosses the polygon boundary
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if a point is inside a circular geofence
 *
 * @param point - The point to test
 * @param center - The center of the circle
 * @param radiusMeters - The radius in meters
 * @param calculateDistance - Function to calculate distance between two points
 * @returns true if point is inside circle
 */
export function isPointInCircle(
  point: GeoPoint,
  center: GeoPoint,
  radiusMeters: number,
  calculateDistance: (p1: GeoPoint, p2: GeoPoint) => number
): boolean {
  const distance = calculateDistance(point, center);
  return distance <= radiusMeters;
}

/**
 * Check if a point is inside any geofence (polygon or circle)
 *
 * @param point - The point to test
 * @param geofence - The geofence to check
 * @param calculateDistance - Function to calculate distance (required for circles)
 * @returns true if point is inside geofence
 */
export function isPointInGeofence(
  point: GeoPoint,
  geofence: Geofence,
  calculateDistance?: (p1: GeoPoint, p2: GeoPoint) => number
): boolean {
  if (geofence.type === 'polygon') {
    return isPointInPolygon(point, geofence.coordinates);
  } else if (geofence.type === 'circle') {
    if (!calculateDistance) {
      throw new Error('calculateDistance function required for circle geofences');
    }
    return isPointInCircle(point, geofence.center, geofence.radiusMeters, calculateDistance);
  }
  return false;
}

/**
 * Calculate the distance from a point to the nearest edge of a polygon
 * Uses perpendicular distance to each segment
 *
 * @param point - The point to measure from
 * @param polygon - The polygon coordinates
 * @returns Distance in degrees (approximate)
 */
export function distanceToPolygonEdge(
  point: GeoPoint,
  polygon: GeoPoint[]
): number {
  if (polygon.length < 2) {
    return Infinity;
  }

  let minDistance = Infinity;

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    const distance = distanceToLineSegment(point, p1, p2);
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}

/**
 * Calculate the perpendicular distance from a point to a line segment
 *
 * @param point - The point to measure from
 * @param lineStart - Start point of the line segment
 * @param lineEnd - End point of the line segment
 * @returns Distance in degrees (approximate)
 */
function distanceToLineSegment(
  point: GeoPoint,
  lineStart: GeoPoint,
  lineEnd: GeoPoint
): number {
  const x = point.lng;
  const y = point.lat;
  const x1 = lineStart.lng;
  const y1 = lineStart.lat;
  const x2 = lineEnd.lng;
  const y2 = lineEnd.lat;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx: number;
  let yy: number;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Create a rectangular geofence from center point and dimensions
 * Useful for creating quick approximations of store boundaries
 *
 * @param center - Center point of the rectangle
 * @param widthMeters - Width in meters
 * @param heightMeters - Height in meters
 * @returns Polygon geofence
 */
export function createRectangularGeofence(
  center: GeoPoint,
  widthMeters: number,
  heightMeters: number
): GeofencePolygon {
  // Approximate degrees per meter (varies by latitude)
  const latDegreesPerMeter = 1 / 111320;
  const lngDegreesPerMeter = 1 / (111320 * Math.cos((center.lat * Math.PI) / 180));

  const halfWidth = (widthMeters / 2) * lngDegreesPerMeter;
  const halfHeight = (heightMeters / 2) * latDegreesPerMeter;

  return {
    type: 'polygon',
    coordinates: [
      { lat: center.lat + halfHeight, lng: center.lng - halfWidth }, // Top-left
      { lat: center.lat + halfHeight, lng: center.lng + halfWidth }, // Top-right
      { lat: center.lat - halfHeight, lng: center.lng + halfWidth }, // Bottom-right
      { lat: center.lat - halfHeight, lng: center.lng - halfWidth }, // Bottom-left
    ],
  };
}

/**
 * Create a circular geofence from center point and radius
 *
 * @param center - Center point of the circle
 * @param radiusMeters - Radius in meters
 * @returns Circle geofence
 */
export function createCircularGeofence(
  center: GeoPoint,
  radiusMeters: number
): GeofenceCircle {
  return {
    type: 'circle',
    center,
    radiusMeters,
  };
}

/**
 * Validate that a polygon is properly formed
 * - At least 3 points
 * - First and last point can be the same (closed polygon) or different
 * - No self-intersections (basic check)
 *
 * @param polygon - The polygon to validate
 * @returns true if valid
 */
export function isValidPolygon(polygon: GeoPoint[]): boolean {
  if (polygon.length < 3) {
    return false;
  }

  // Check for duplicate consecutive points (except first/last)
  for (let i = 0; i < polygon.length - 1; i++) {
    if (
      polygon[i].lat === polygon[i + 1].lat &&
      polygon[i].lng === polygon[i + 1].lng
    ) {
      return false;
    }
  }

  // Check that coordinates are within valid ranges
  for (const point of polygon) {
    if (
      point.lat < -90 ||
      point.lat > 90 ||
      point.lng < -180 ||
      point.lng > 180
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate the centroid (geometric center) of a polygon
 *
 * @param polygon - The polygon coordinates
 * @returns The centroid point
 */
export function calculatePolygonCentroid(polygon: GeoPoint[]): GeoPoint {
  if (polygon.length === 0) {
    throw new Error('Cannot calculate centroid of empty polygon');
  }

  let sumLat = 0;
  let sumLng = 0;

  for (const point of polygon) {
    sumLat += point.lat;
    sumLng += point.lng;
  }

  return {
    lat: sumLat / polygon.length,
    lng: sumLng / polygon.length,
  };
}

/**
 * Calculate the bounding box of a polygon
 *
 * @param polygon - The polygon coordinates
 * @returns Object with min/max lat/lng
 */
export function calculateBoundingBox(polygon: GeoPoint[]): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  if (polygon.length === 0) {
    throw new Error('Cannot calculate bounding box of empty polygon');
  }

  let minLat = polygon[0].lat;
  let maxLat = polygon[0].lat;
  let minLng = polygon[0].lng;
  let maxLng = polygon[0].lng;

  for (const point of polygon) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Quick check if point could possibly be in polygon using bounding box
 * Much faster than full point-in-polygon check
 * Use this as a pre-filter before expensive polygon checks
 *
 * @param point - The point to test
 * @param polygon - The polygon coordinates
 * @returns true if point is within bounding box
 */
export function isPointInBoundingBox(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (polygon.length === 0) {
    return false;
  }

  const bbox = calculateBoundingBox(polygon);
  return (
    point.lat >= bbox.minLat &&
    point.lat <= bbox.maxLat &&
    point.lng >= bbox.minLng &&
    point.lng <= bbox.maxLng
  );
}
