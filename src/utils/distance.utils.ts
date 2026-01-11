/**
 * Distance Calculation Utilities
 * Calculates distances between geographic coordinates
 */

import { GeoPoint } from '../types/store.types';

/**
 * Calculate distance between two geographic points using Haversine formula
 * @param point1 First geographic point
 * @param point2 Second geographic point
 * @returns Distance in meters
 */
export function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance for display
 * @param meters Distance in meters
 * @returns Formatted string (e.g., "0.5 mi" or "150 ft")
 */
export function formatDistance(meters: number): string {
  const feet = meters * 3.28084;
  const miles = meters / 1609.34;

  if (miles >= 0.1) {
    return `${miles.toFixed(1)} mi`;
  } else {
    return `${Math.round(feet)} ft`;
  }
}

/**
 * Format distance in kilometers
 * @param meters Distance in meters
 * @returns Formatted string (e.g., "1.5 km" or "250 m")
 */
export function formatDistanceMetric(meters: number): string {
  const km = meters / 1000;

  if (km >= 0.1) {
    return `${km.toFixed(1)} km`;
  } else {
    return `${Math.round(meters)} m`;
  }
}

/**
 * Sort stores by distance from a point
 * @param stores Array of stores with location property
 * @param userLocation User's current location
 * @returns Stores sorted by distance with distance property added
 */
export function sortStoresByDistance<T extends { location: GeoPoint }>(
  stores: T[],
  userLocation: GeoPoint
): Array<T & { distance: number }> {
  return stores
    .map((store) => ({
      ...store,
      distance: calculateDistance(userLocation, store.location),
    }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Filter stores within a radius
 * @param stores Array of stores with location property
 * @param userLocation User's current location
 * @param radiusMeters Maximum distance in meters
 * @returns Filtered stores within radius with distance property
 */
export function filterStoresWithinRadius<T extends { location: GeoPoint }>(
  stores: T[],
  userLocation: GeoPoint,
  radiusMeters: number
): Array<T & { distance: number }> {
  return stores
    .map((store) => ({
      ...store,
      distance: calculateDistance(userLocation, store.location),
    }))
    .filter((store) => store.distance <= radiusMeters);
}

/**
 * Get the closest store from a list
 * @param stores Array of stores with location property
 * @param userLocation User's current location
 * @returns Closest store with distance property, or null if no stores
 */
export function getClosestStore<T extends { location: GeoPoint }>(
  stores: T[],
  userLocation: GeoPoint
): (T & { distance: number }) | null {
  if (stores.length === 0) return null;

  const sorted = sortStoresByDistance(stores, userLocation);
  return sorted[0];
}
