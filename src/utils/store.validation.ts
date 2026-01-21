/**
 * Store Data Validation Utilities
 * Validates store data for database integrity and business logic
 */

import { Store, OperatingHours, HolidayHours, Address, GeoPoint, StoreFeatures } from '../types/store.types';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate store data
 */
export function validateStore(store: Partial<Store>): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  if (!store.name || store.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Store name is required' });
  }

  if (!store.chain) {
    errors.push({ field: 'chain', message: 'Store chain is required' });
  }

  if (!store.address) {
    errors.push({ field: 'address', message: 'Store address is required' });
  } else {
    const addressErrors = validateAddress(store.address);
    errors.push(...addressErrors);
  }

  if (!store.location) {
    errors.push({ field: 'location', message: 'Store location (lat/lng) is required' });
  } else {
    const locationErrors = validateGeoPoint(store.location);
    errors.push(...locationErrors);
  }

  if (!store.timezone) {
    errors.push({ field: 'timezone', message: 'Store timezone is required' });
  } else if (!isValidTimezone(store.timezone)) {
    errors.push({ field: 'timezone', message: `Invalid timezone: ${store.timezone}` });
  }

  if (store.wicAuthorized === true && !store.wicVendorId) {
    errors.push({ field: 'wicVendorId', message: 'WIC vendor ID required for WIC-authorized stores' });
  }

  if (store.hours && store.hours.length > 0) {
    store.hours.forEach((hour, index) => {
      const hourErrors = validateOperatingHours(hour);
      errors.push(...hourErrors.map(e => ({ ...e, field: `hours[${index}].${e.field}` })));
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate address
 */
export function validateAddress(address: Address): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!address.street || address.street.trim().length === 0) {
    errors.push({ field: 'street', message: 'Street address is required' });
  }

  if (!address.city || address.city.trim().length === 0) {
    errors.push({ field: 'city', message: 'City is required' });
  }

  if (!address.state || address.state.length !== 2) {
    errors.push({ field: 'state', message: 'Valid 2-letter state code is required' });
  }

  if (!address.zip || !isValidZip(address.zip)) {
    errors.push({ field: 'zip', message: 'Valid ZIP code is required' });
  }

  return errors;
}

/**
 * Validate geographic point
 */
export function validateGeoPoint(point: GeoPoint): ValidationError[] {
  const errors: ValidationError[] = [];

  if (point.lat < -90 || point.lat > 90) {
    errors.push({ field: 'latitude', message: 'Latitude must be between -90 and 90' });
  }

  if (point.lng < -180 || point.lng > 180) {
    errors.push({ field: 'longitude', message: 'Longitude must be between -180 and 180' });
  }

  return errors;
}

/**
 * Validate operating hours
 */
export function validateOperatingHours(hours: OperatingHours): ValidationError[] {
  const errors: ValidationError[] = [];

  if (hours.dayOfWeek < 0 || hours.dayOfWeek > 6) {
    errors.push({ field: 'dayOfWeek', message: 'Day of week must be 0-6' });
  }

  if (!hours.closed) {
    if (!hours.openTime || !isValidTime(hours.openTime)) {
      errors.push({ field: 'openTime', message: 'Valid open time required (HH:MM format)' });
    }

    if (!hours.closeTime || !isValidTime(hours.closeTime)) {
      errors.push({ field: 'closeTime', message: 'Valid close time required (HH:MM format)' });
    }

    // Check that close time is after open time (unless crossing midnight)
    if (hours.openTime && hours.closeTime && hours.openTime >= hours.closeTime) {
      // This is valid for stores closing after midnight (e.g., 22:00 to 02:00)
      // No error
    }
  }

  return errors;
}

/**
 * Validate holiday hours
 */
export function validateHolidayHours(hours: HolidayHours): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!hours.date || !isValidDate(hours.date)) {
    errors.push({ field: 'date', message: 'Valid ISO date is required (YYYY-MM-DD)' });
  }

  if (!hours.closed) {
    if (!hours.openTime || !isValidTime(hours.openTime)) {
      errors.push({ field: 'openTime', message: 'Valid open time required (HH:MM format)' });
    }

    if (!hours.closeTime || !isValidTime(hours.closeTime)) {
      errors.push({ field: 'closeTime', message: 'Valid close time required (HH:MM format)' });
    }
  }

  return errors;
}

/**
 * Validate store features
 */
export function validateStoreFeatures(features: StoreFeatures): ValidationError[] {
  const errors: ValidationError[] = [];
  const validKeys = [
    'hasPharmacy',
    'hasDeliCounter',
    'hasBakery',
    'acceptsEbt',
    'acceptsWic',
    'hasWicKiosk',
  ];

  for (const key of Object.keys(features)) {
    if (!validKeys.includes(key)) {
      errors.push({ field: 'features', message: `Unknown feature: ${key}` });
    }
    if (typeof features[key as keyof StoreFeatures] !== 'boolean') {
      errors.push({ field: 'features', message: `Feature ${key} must be boolean` });
    }
  }

  return errors;
}

/**
 * Check if time string is valid HH:MM format
 */
function isValidTime(time: string): boolean {
  const pattern = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return pattern.test(time);
}

/**
 * Check if date string is valid ISO format (YYYY-MM-DD)
 */
function isValidDate(date: string): boolean {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(date)) return false;

  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Check if ZIP code is valid (5 or 9 digit format)
 */
function isValidZip(zip: string): boolean {
  const pattern = /^\d{5}(-\d{4})?$/;
  return pattern.test(zip);
}

/**
 * Check if timezone is valid
 */
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Sanitize store data for database storage
 */
export function sanitizeStore(store: Partial<Store>): Partial<Store> {
  return {
    ...store,
    name: store.name?.trim(),
    address: store.address ? sanitizeAddress(store.address) : undefined,
    phone: store.phone?.replace(/\D/g, ''),
  };
}

/**
 * Sanitize address
 */
function sanitizeAddress(address: Address): Address {
  return {
    ...address,
    street: address.street.trim(),
    street2: address.street2?.trim(),
    city: address.city.trim(),
    state: address.state.toUpperCase(),
    zip: address.zip.replace(/\D/g, '').slice(0, 10),
  };
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (point1.lat * Math.PI) / 180;
  const lat2 = (point2.lat * Math.PI) / 180;
  const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a point is inside a polygon (geofence)
 * Uses ray casting algorithm
 */
export function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect = yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Check if a point is inside a circle geofence
 */
export function isPointInCircle(
  point: GeoPoint,
  center: GeoPoint,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(point, center);
  return distance <= radiusMeters;
}
