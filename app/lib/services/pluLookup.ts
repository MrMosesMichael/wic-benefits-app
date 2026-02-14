/**
 * PLU Code Lookup Service
 * Offline produce identification using bundled IFPS PLU codes
 */

import pluCodes from '@/assets/data/plu-codes.json';

export interface PluEntry {
  plu: string;
  name: string;
  category: 'fruit' | 'vegetable';
}

export interface PluLookupResult {
  valid: boolean;
  plu: string;
  name: string;
  isOrganic: boolean;
  category: 'fruit' | 'vegetable';
}

// Build lookup map for O(1) access
const pluMap = new Map<string, PluEntry>();
(pluCodes as PluEntry[]).forEach(entry => {
  pluMap.set(entry.plu, entry);
});

/**
 * Validate PLU code format (4-5 digits)
 */
export function isValidPluFormat(code: string): boolean {
  return /^\d{4,5}$/.test(code.trim());
}

/**
 * Look up a PLU code and return produce info
 * - 5-digit codes starting with 9 are organic versions of the 4-digit base
 * - Unknown but valid-format codes still return eligible (all fresh produce is WIC-eligible)
 */
export function lookupPlu(code: string): PluLookupResult | null {
  const trimmed = code.trim();

  if (!isValidPluFormat(trimmed)) {
    return null;
  }

  let isOrganic = false;
  let lookupCode = trimmed;

  // 5-digit codes starting with 9 → organic version of the 4-digit base
  if (trimmed.length === 5 && trimmed.startsWith('9')) {
    isOrganic = true;
    lookupCode = trimmed.substring(1);
  }

  const entry = pluMap.get(lookupCode);

  if (entry) {
    const name = isOrganic ? `Organic ${entry.name}` : entry.name;
    return {
      valid: true,
      plu: trimmed,
      name,
      isOrganic,
      category: entry.category,
    };
  }

  // Unknown PLU but valid format — still WIC-eligible (all fresh produce is)
  return {
    valid: true,
    plu: trimmed,
    name: 'Fresh Produce',
    isOrganic,
    category: 'fruit', // default
  };
}

/**
 * Convert PLU lookup result to the same shape used by the result screen
 * so it works with the existing UI without changes
 */
export function pluToResultParams(result: PluLookupResult): Record<string, string> {
  return {
    upc: result.plu,
    name: result.name,
    brand: result.isOrganic ? 'Organic' : '',
    size: '',
    eligible: 'true', // All fresh produce is WIC-eligible
    category: 'FRUITS_VEGETABLES',
    reason: '',
    isPlu: 'true',
  };
}
