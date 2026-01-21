/**
 * Data Normalization Utilities for WIC Retailer Data
 *
 * Utilities for normalizing, validating, and deduplicating retailer data
 */

import { v4 as uuidv4 } from 'uuid';
import {
  WICRetailerRawData,
  NormalizedRetailerData,
  StoreType,
  OperatingHours,
} from '../types/retailer.types';

/**
 * Normalize raw retailer data to standard format
 */
export function normalizeRetailerData(
  rawData: WICRetailerRawData
): NormalizedRetailerData | null {
  try {
    // Validate required fields
    if (!rawData.vendorName || !rawData.address || !rawData.city || !rawData.zip) {
      console.warn('Missing required fields for retailer:', rawData);
      return null;
    }

    // Require coordinates for valid normalized data
    if (!rawData.latitude || !rawData.longitude) {
      console.warn('Missing coordinates for retailer:', rawData.vendorName);
      return null;
    }

    const normalized: NormalizedRetailerData = {
      id: uuidv4(),
      name: normalizeStoreName(rawData.vendorName),
      chain: detectChain(rawData.vendorName, rawData.chainName),
      chainId: rawData.chainName
        ? generateChainId(rawData.chainName)
        : undefined,

      address: {
        street: normalizeAddress(rawData.address),
        street2: rawData.address2 ? normalizeAddress(rawData.address2) : undefined,
        city: normalizeCity(rawData.city),
        state: rawData.stateCode.toUpperCase(),
        zip: normalizeZipCode(rawData.zip),
        country: 'US',
      },

      location: {
        lat: rawData.latitude,
        lng: rawData.longitude,
      },

      wicAuthorized: true, // All sourced retailers are WIC-authorized
      wicVendorId: rawData.wicVendorId,
      wicState: rawData.state,

      phone: rawData.phone ? normalizePhoneNumber(rawData.phone) : undefined,
      website: rawData.website,

      hours: rawData.hours ? parseHoursString(rawData.hours) : undefined,
      timezone: getTimezoneForState(rawData.state),

      features: {
        hasPharmacy: detectPharmacy(rawData.vendorName, rawData.storeType, rawData.services),
        hasDeliCounter: detectDeli(rawData.services),
        hasBakery: detectBakery(rawData.services),
        acceptsEbt: true, // Most WIC vendors accept EBT
        acceptsWic: true,
        hasWicKiosk: false, // Unknown unless specified
      },

      storeType: rawData.storeType,

      dataSource: rawData.source,
      processorType: rawData.processorType,
      lastVerified: rawData.lastVerified || rawData.scrapedAt,
      active: true,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return normalized;
  } catch (error) {
    console.error('Error normalizing retailer data:', error, rawData);
    return null;
  }
}

/**
 * Normalize store name (title case, remove extra spaces)
 */
export function normalizeStoreName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => {
      // Keep acronyms uppercase
      if (word.match(/^[A-Z]+$/)) return word;
      // Title case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Detect chain name from store name
 */
export function detectChain(storeName: string, chainName?: string): string | undefined {
  if (chainName) return chainName;

  const chains = [
    'Walmart',
    'Kroger',
    'Target',
    'Walgreens',
    'CVS',
    'Rite Aid',
    'Safeway',
    'Albertsons',
    'Publix',
    'Meijer',
    'Harris Teeter',
    'Food Lion',
    'Giant',
    'Stop & Shop',
    'Whole Foods',
    'Trader Joe\'s',
    'Aldi',
    'Costco',
    'Sam\'s Club',
  ];

  const upperName = storeName.toUpperCase();
  for (const chain of chains) {
    if (upperName.includes(chain.toUpperCase())) {
      return chain;
    }
  }

  return undefined;
}

/**
 * Generate chain ID (lowercase, hyphenated)
 */
export function generateChainId(chainName: string): string {
  return chainName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * Normalize street address
 */
export function normalizeAddress(address: string): string {
  return address
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bSt\b\.?/gi, 'Street')
    .replace(/\bAve\b\.?/gi, 'Avenue')
    .replace(/\bRd\b\.?/gi, 'Road')
    .replace(/\bBlvd\b\.?/gi, 'Boulevard')
    .replace(/\bDr\b\.?/gi, 'Drive')
    .replace(/\bLn\b\.?/gi, 'Lane')
    .replace(/\bCt\b\.?/gi, 'Court')
    .replace(/\bPl\b\.?/gi, 'Place')
    .replace(/\bPkwy\b\.?/gi, 'Parkway');
}

/**
 * Normalize city name (title case)
 */
export function normalizeCity(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalize zip code (5 or 9 digit format)
 */
export function normalizeZipCode(zip: string): string {
  const cleaned = zip.replace(/[^0-9]/g, '');

  if (cleaned.length === 5) {
    return cleaned;
  } else if (cleaned.length === 9) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }

  return cleaned;
}

/**
 * Normalize phone number to E.164 format (+1XXXXXXXXXX)
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');

  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  return phone; // Return original if can't normalize
}

/**
 * Parse hours string to structured OperatingHours array
 * Example: "Mon-Fri 9AM-8PM, Sat 9AM-6PM, Sun 10AM-5PM"
 */
export function parseHoursString(hoursStr: string): OperatingHours[] | undefined {
  try {
    // This is a simplified parser - real implementation would be more robust
    const hours: OperatingHours[] = [];

    // Default to 9 AM - 5 PM if parsing fails
    if (!hoursStr || hoursStr.trim() === '') {
      return undefined;
    }

    // TODO: Implement robust hours parsing
    // For now, return undefined to indicate hours need manual entry
    return undefined;
  } catch (error) {
    console.warn('Failed to parse hours string:', hoursStr, error);
    return undefined;
  }
}

/**
 * Get timezone for a state
 */
export function getTimezoneForState(state: string): string {
  const timezoneMap: Record<string, string> = {
    MI: 'America/Detroit',
    NC: 'America/New_York',
    FL: 'America/New_York', // Simplified - FL spans two timezones
    OR: 'America/Los_Angeles', // Simplified - OR spans two timezones
  };

  return timezoneMap[state] || 'America/New_York';
}

/**
 * Detect if store has pharmacy
 */
export function detectPharmacy(
  storeName: string,
  storeType?: StoreType,
  services?: string[]
): boolean {
  if (storeType === 'pharmacy') return true;
  if (services?.includes('pharmacy')) return true;

  const pharmacyKeywords = [
    'pharmacy',
    'walgreens',
    'cvs',
    'rite aid',
    'drug',
    'rx',
  ];
  const lowerName = storeName.toLowerCase();

  return pharmacyKeywords.some((keyword) => lowerName.includes(keyword));
}

/**
 * Detect if store has deli counter
 */
export function detectDeli(services?: string[]): boolean {
  return services?.includes('deli') || services?.includes('deli_counter') || false;
}

/**
 * Detect if store has bakery
 */
export function detectBakery(services?: string[]): boolean {
  return services?.includes('bakery') || false;
}

/**
 * Remove duplicate retailers based on address and name similarity
 */
export function deduplicateRetailers(
  retailers: NormalizedRetailerData[]
): NormalizedRetailerData[] {
  const seen = new Map<string, NormalizedRetailerData>();

  for (const retailer of retailers) {
    const key = generateDedupeKey(retailer);

    if (!seen.has(key)) {
      seen.set(key, retailer);
    } else {
      // If duplicate, keep the one with more complete data
      const existing = seen.get(key)!;
      if (isMoreComplete(retailer, existing)) {
        seen.set(key, retailer);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Generate deduplication key
 */
function generateDedupeKey(retailer: NormalizedRetailerData): string {
  const name = retailer.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const zip = retailer.address.zip.replace(/[^0-9]/g, '').slice(0, 5);
  const street = retailer.address.street.toLowerCase().replace(/[^a-z0-9]/g, '');

  return `${name}-${zip}-${street}`;
}

/**
 * Check if retailer A is more complete than retailer B
 */
function isMoreComplete(a: NormalizedRetailerData, b: NormalizedRetailerData): boolean {
  let scoreA = 0;
  let scoreB = 0;

  if (a.phone) scoreA++;
  if (b.phone) scoreB++;

  if (a.hours) scoreA++;
  if (b.hours) scoreB++;

  if (a.website) scoreA++;
  if (b.website) scoreB++;

  if (a.wicVendorId) scoreA++;
  if (b.wicVendorId) scoreB++;

  return scoreA > scoreB;
}

/**
 * Validate normalized retailer data
 */
export function validateNormalizedData(retailer: NormalizedRetailerData): boolean {
  // Required fields
  if (!retailer.name || !retailer.address.street || !retailer.address.city) {
    return false;
  }

  if (!retailer.address.zip || !retailer.address.state) {
    return false;
  }

  // Valid coordinates
  if (
    !retailer.location.lat ||
    !retailer.location.lng ||
    Math.abs(retailer.location.lat) > 90 ||
    Math.abs(retailer.location.lng) > 180
  ) {
    return false;
  }

  return true;
}
