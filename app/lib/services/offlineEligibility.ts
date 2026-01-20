/**
 * Offline Eligibility Checker
 * Uses bundled Michigan APL data for eligibility checks without network
 */

import michiganApl from '@/assets/data/michigan-apl.json';

export interface OfflineProduct {
  upc: string;
  brand: string;
  description: string;
  category: string;
  subcategory: string;
  size: string;
  unit: string;
}

export interface OfflineEligibilityResult {
  eligible: boolean;
  product: {
    upc: string;
    name: string;
    brand?: string;
    size?: string;
  };
  category?: string;
  subcategory?: string;
  reason?: string;
}

// Build a lookup map for fast UPC searches
const productMap = new Map<string, OfflineProduct>();
(michiganApl as OfflineProduct[]).forEach(product => {
  // Store with normalized UPC (no leading zeros)
  productMap.set(product.upc, product);
});

/**
 * Normalize a scanned UPC for lookup
 * Removes leading zeros and non-digit characters
 */
function normalizeUpc(upc: string): string {
  return upc.replace(/\D/g, '').replace(/^0+/, '') || '0';
}

/**
 * Check if a product is WIC-eligible using offline data
 */
export function checkEligibilityOffline(upc: string): OfflineEligibilityResult {
  const normalizedUpc = normalizeUpc(upc);
  const product = productMap.get(normalizedUpc);

  if (product) {
    return {
      eligible: true,
      product: {
        upc: product.upc,
        name: product.description || `${product.brand} Product`,
        brand: product.brand,
        size: product.size,
      },
      category: product.category,
      subcategory: product.subcategory,
    };
  }

  // Product not found in APL
  return {
    eligible: false,
    product: {
      upc: normalizedUpc,
      name: 'Unknown Product',
    },
    reason: 'Product not found in Michigan WIC Approved Product List',
  };
}

/**
 * Search for products by brand or description
 */
export function searchProductsOffline(query: string, limit: number = 20): OfflineProduct[] {
  const lowerQuery = query.toLowerCase();
  const results: OfflineProduct[] = [];

  for (const product of michiganApl as OfflineProduct[]) {
    if (
      product.brand.toLowerCase().includes(lowerQuery) ||
      product.description.toLowerCase().includes(lowerQuery)
    ) {
      results.push(product);
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Get product count by category
 */
export function getCategoryStats(): Record<string, number> {
  const stats: Record<string, number> = {};
  (michiganApl as OfflineProduct[]).forEach(product => {
    stats[product.category] = (stats[product.category] || 0) + 1;
  });
  return stats;
}

/**
 * Get total product count
 */
export function getTotalProductCount(): number {
  return (michiganApl as OfflineProduct[]).length;
}
