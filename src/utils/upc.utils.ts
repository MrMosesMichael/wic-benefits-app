/**
 * UPC Normalization Utilities
 *
 * Handles UPC format variations (UPC-A, UPC-E, EAN-13)
 * and provides consistent normalization for database lookups.
 */

import { UPCVariants } from '../types/apl.types';

/**
 * Normalize a UPC to standard formats
 *
 * Handles:
 * - UPC-A (12 digits)
 * - UPC-E (8 digits, expands to UPC-A)
 * - EAN-13 (13 digits)
 * - Leading zeros
 * - Non-numeric characters
 *
 * @param upc - Raw UPC string
 * @returns Normalized UPC variants
 */
export function normalizeUPC(upc: string): UPCVariants {
  // Remove non-numeric characters
  const cleaned = upc.replace(/[^0-9]/g, '');

  // Validate length
  if (cleaned.length < 8 || cleaned.length > 14) {
    return {
      original: upc,
      upc12: '',
      ean13: '',
      trimmed: '',
      checkDigit: '',
      isValid: false,
    };
  }

  // Handle UPC-E (8 digits) - expand to UPC-A
  let normalized = cleaned;
  if (cleaned.length === 8) {
    normalized = expandUPCE(cleaned);
  }

  // Pad to 12 digits (UPC-A standard)
  const upc12 = normalized.padStart(12, '0');

  // Convert to EAN-13 (add leading 0)
  const ean13 = '0' + upc12;

  // Trimmed version (no leading zeros)
  const trimmed = cleaned.replace(/^0+/, '') || '0';

  // Extract check digit
  const checkDigit = cleaned.slice(-1);

  // Basic validation (check digit validation could be added)
  const isValid = cleaned.length >= 8 && cleaned.length <= 14;

  return {
    original: upc,
    upc12,
    ean13,
    trimmed,
    checkDigit,
    isValid,
  };
}

/**
 * Expand UPC-E (8-digit) to UPC-A (12-digit)
 *
 * UPC-E is a zero-suppressed version of UPC-A.
 * This function expands it back to the full format.
 *
 * @param upce - 8-digit UPC-E code
 * @returns 12-digit UPC-A code
 */
export function expandUPCE(upce: string): string {
  if (upce.length !== 8) {
    return upce.padStart(12, '0');
  }

  const numberSystem = upce[0];
  const checkDigit = upce[7];
  const middle = upce.substring(1, 7);
  const lastDigit = middle[5];

  let manufacturer = '';
  let product = '';

  // Expansion rules based on last digit
  switch (lastDigit) {
    case '0':
    case '1':
    case '2':
      manufacturer = middle.substring(0, 2) + lastDigit + '00';
      product = '00' + middle.substring(2, 5);
      break;
    case '3':
      manufacturer = middle.substring(0, 3) + '00';
      product = '000' + middle.substring(3, 5);
      break;
    case '4':
      manufacturer = middle.substring(0, 4) + '0';
      product = '0000' + middle[4];
      break;
    default: // 5-9
      manufacturer = middle.substring(0, 5);
      product = '0000' + lastDigit;
      break;
  }

  return numberSystem + manufacturer + product + checkDigit;
}

/**
 * Calculate UPC check digit using standard algorithm
 *
 * @param upcWithoutCheck - 11-digit UPC without check digit
 * @returns Check digit (0-9)
 */
export function calculateCheckDigit(upcWithoutCheck: string): string {
  const digits = upcWithoutCheck.split('').map(Number);

  // Add odd-position digits (1st, 3rd, 5th, etc.) × 3
  const oddSum = digits
    .filter((_, index) => index % 2 === 0)
    .reduce((sum, digit) => sum + digit * 3, 0);

  // Add even-position digits (2nd, 4th, 6th, etc.) × 1
  const evenSum = digits
    .filter((_, index) => index % 2 === 1)
    .reduce((sum, digit) => sum + digit, 0);

  // Total sum
  const total = oddSum + evenSum;

  // Check digit = (10 - (total mod 10)) mod 10
  const checkDigit = (10 - (total % 10)) % 10;

  return checkDigit.toString();
}

/**
 * Validate UPC check digit
 *
 * @param upc - Full UPC with check digit
 * @returns True if check digit is valid
 */
export function validateCheckDigit(upc: string): boolean {
  const cleaned = upc.replace(/[^0-9]/g, '');

  if (cleaned.length !== 12 && cleaned.length !== 13) {
    return false;
  }

  const withoutCheck = cleaned.slice(0, -1);
  const providedCheck = cleaned.slice(-1);
  const calculatedCheck = calculateCheckDigit(withoutCheck);

  return providedCheck === calculatedCheck;
}

/**
 * Generate all possible UPC variants for database lookup
 *
 * Returns an array of UPC strings to try when searching the database.
 * Useful for finding products even when UPC format varies.
 *
 * @param upc - Raw UPC input
 * @returns Array of UPC variants to search
 */
export function generateUPCVariants(upc: string): string[] {
  const normalized = normalizeUPC(upc);

  if (!normalized.isValid) {
    return [upc]; // Return original if invalid
  }

  const variants = new Set<string>([
    normalized.upc12,
    normalized.ean13,
    normalized.trimmed,
    normalized.original,
  ]);

  // Remove empty strings
  return Array.from(variants).filter((v) => v.length > 0);
}

/**
 * Format UPC for display
 *
 * Formats a UPC in human-readable form with hyphens.
 * Example: 011110416605 → 0-11110-41660-5
 *
 * @param upc - Raw UPC
 * @returns Formatted UPC string
 */
export function formatUPCForDisplay(upc: string): string {
  const normalized = normalizeUPC(upc);

  if (!normalized.isValid) {
    return upc;
  }

  const { upc12 } = normalized;

  // Format as: N-MMMMM-PPPPP-C
  // N = number system (1 digit)
  // M = manufacturer (5 digits)
  // P = product (5 digits)
  // C = check digit (1 digit)
  return `${upc12[0]}-${upc12.substring(1, 6)}-${upc12.substring(6, 11)}-${upc12[11]}`;
}

/**
 * Check if two UPCs are equivalent
 *
 * Compares UPCs after normalization to handle format variations.
 *
 * @param upc1 - First UPC
 * @param upc2 - Second UPC
 * @returns True if UPCs are equivalent
 */
export function areUPCsEquivalent(upc1: string, upc2: string): boolean {
  const normalized1 = normalizeUPC(upc1);
  const normalized2 = normalizeUPC(upc2);

  if (!normalized1.isValid || !normalized2.isValid) {
    return false;
  }

  // Compare UPC-12 format (most common)
  return normalized1.upc12 === normalized2.upc12;
}
