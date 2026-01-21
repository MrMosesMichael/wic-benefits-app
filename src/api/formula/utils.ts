/**
 * Formula API Utilities
 * A4.1 - Helper functions for serialization and normalization
 */

import { FormulaProduct } from '../../types/formula';

/**
 * Convert FormulaProduct with Set alternativeUPCs to JSON-serializable format
 * Sets cannot be directly serialized to JSON, so convert to array
 */
export function serializeFormulaProduct(product: FormulaProduct): {
  upc: string;
  brand: string;
  name: string;
  size: string;
  wicApproved: boolean;
  alternativeUPCs: string[];
} {
  return {
    upc: product.upc,
    brand: product.brand,
    name: product.name,
    size: product.size,
    wicApproved: product.wicApproved,
    alternativeUPCs: Array.from(product.alternativeUPCs),
  };
}

/**
 * Convert array of FormulaProducts to JSON-serializable format
 */
export function serializeFormulaProducts(products: FormulaProduct[]): Array<{
  upc: string;
  brand: string;
  name: string;
  size: string;
  wicApproved: boolean;
  alternativeUPCs: string[];
}> {
  return products.map(serializeFormulaProduct);
}

/**
 * Deserialize JSON product data to FormulaProduct with Set alternativeUPCs
 */
export function deserializeFormulaProduct(data: {
  upc: string;
  brand: string;
  name: string;
  size: string;
  wicApproved: boolean;
  alternativeUPCs: string[] | string;
}): FormulaProduct {
  const alternatives =
    typeof data.alternativeUPCs === 'string'
      ? [data.alternativeUPCs]
      : data.alternativeUPCs;

  return {
    upc: data.upc,
    brand: data.brand,
    name: data.name,
    size: data.size,
    wicApproved: data.wicApproved,
    alternativeUPCs: new Set(alternatives),
  };
}
