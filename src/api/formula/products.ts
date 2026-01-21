/**
 * Formula Products API
 * A4.1 - API endpoints for formula product management
 */

import { FormulaProduct } from '../../types/formula';
import { getFormulaProductService } from '../../services/formula';
import { serializeFormulaProduct, deserializeFormulaProduct, serializeFormulaProducts } from './utils';

/**
 * Get formula product by UPC
 */
export async function getFormulaProduct(
  upc: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!upc) {
      return { success: false, error: 'UPC is required' };
    }

    const service = getFormulaProductService();
    const product = await service.getProduct(upc);
    const data = product ? serializeFormulaProduct(product) : null;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all WIC-approved formulas
 */
export async function getWICApprovedFormulas(): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const service = getFormulaProductService();
    const products = await service.getWICApprovedFormulas();
    return { success: true, data: serializeFormulaProducts(products) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get alternative formulas for a given UPC
 */
export async function getAlternativeFormulas(
  upc: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    if (!upc) {
      return { success: false, error: 'UPC is required' };
    }

    const service = getFormulaProductService();
    const alternatives = await service.getAlternatives(upc);
    return { success: true, data: serializeFormulaProducts(alternatives) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search formulas by brand or name
 */
export async function searchFormulas(
  query: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    if (!query || query.trim().length === 0) {
      return { success: false, error: 'Search query is required' };
    }

    const service = getFormulaProductService();
    const results = await service.searchFormulas(query);
    return { success: true, data: serializeFormulaProducts(results) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get formulas by brand
 */
export async function getFormulasByBrand(
  brand: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    if (!brand) {
      return { success: false, error: 'Brand is required' };
    }

    const service = getFormulaProductService();
    const products = await service.getFormulasByBrand(brand);
    return { success: true, data: serializeFormulaProducts(products) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Add or update a formula product
 */
export async function upsertFormulaProduct(
  product: FormulaProduct
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!product.upc || !product.brand || !product.name) {
      return { success: false, error: 'UPC, brand, and name are required' };
    }

    // Normalize alternativeUPCs to Set if it's an array (from API deserialization)
    const normalizedProduct: FormulaProduct = {
      ...product,
      alternativeUPCs:
        product.alternativeUPCs instanceof Set
          ? product.alternativeUPCs
          : new Set(
              Array.isArray(product.alternativeUPCs)
                ? product.alternativeUPCs
                : []
            ),
    };

    const service = getFormulaProductService();
    const result = await service.upsertProduct(normalizedProduct);
    return { success: true, data: serializeFormulaProduct(result) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Add alternative UPC to a product
 */
export async function addAlternativeFormula(
  upc: string,
  alternativeUpc: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!upc || !alternativeUpc) {
      return { success: false, error: 'Both UPCs are required' };
    }

    const service = getFormulaProductService();
    const added = await service.addAlternative(upc, alternativeUpc);

    if (!added) {
      return { success: false, error: 'Product not found' };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Remove alternative UPC from a product
 */
export async function removeAlternativeFormula(
  upc: string,
  alternativeUpc: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!upc || !alternativeUpc) {
      return { success: false, error: 'Both UPCs are required' };
    }

    const service = getFormulaProductService();
    const removed = await service.removeAlternative(upc, alternativeUpc);

    if (!removed) {
      return { success: false, error: 'Product or alternative not found' };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
