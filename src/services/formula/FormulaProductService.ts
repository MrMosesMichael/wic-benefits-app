/**
 * Formula Product Service
 * A4.1 - Manages formula product catalog
 */

import { FormulaProduct } from '../../types/formula';

/**
 * Service for managing formula products and their alternatives
 */
export class FormulaProductService {
  private products: Map<string, FormulaProduct>;

  constructor() {
    this.products = new Map();
  }

  /**
   * Add or update a formula product
   */
  async upsertProduct(product: FormulaProduct): Promise<FormulaProduct> {
    // Ensure alternativeUPCs is a Set for consistency
    const normalized: FormulaProduct = {
      ...product,
      alternativeUPCs: product.alternativeUPCs instanceof Set
        ? product.alternativeUPCs
        : new Set(product.alternativeUPCs),
    };
    this.products.set(normalized.upc, normalized);
    // TODO: Persist to database
    return normalized;
  }

  /**
   * Get formula product by UPC
   */
  async getProduct(upc: string): Promise<FormulaProduct | null> {
    const product = this.products.get(upc);
    if (product) {
      return product;
    }

    // TODO: Query from database
    return null;
  }

  /**
   * Get all WIC-approved formulas
   */
  async getWICApprovedFormulas(): Promise<FormulaProduct[]> {
    const approved = Array.from(this.products.values()).filter(
      (p) => p.wicApproved
    );
    // TODO: Query from database
    return approved;
  }

  /**
   * Get alternative formulas for a given UPC
   */
  async getAlternatives(upc: string): Promise<FormulaProduct[]> {
    const product = await this.getProduct(upc);
    if (!product || product.alternativeUPCs.length === 0) {
      return [];
    }

    const alternatives: FormulaProduct[] = [];
    for (const altUpc of product.alternativeUPCs) {
      const alt = await this.getProduct(altUpc);
      if (alt) {
        alternatives.push(alt);
      }
    }

    return alternatives;
  }

  /**
   * Search formulas by brand or name
   */
  async searchFormulas(query: string): Promise<FormulaProduct[]> {
    const normalizedQuery = query.toLowerCase();
    return Array.from(this.products.values()).filter(
      (p) =>
        p.brand.toLowerCase().includes(normalizedQuery) ||
        p.name.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Get formulas by brand
   */
  async getFormulasByBrand(brand: string): Promise<FormulaProduct[]> {
    return Array.from(this.products.values()).filter(
      (p) => p.brand.toLowerCase() === brand.toLowerCase()
    );
  }

  /**
   * Add alternative UPC to a product
   */
  async addAlternative(upc: string, alternativeUpc: string): Promise<boolean> {
    const product = await this.getProduct(upc);
    if (!product) {
      return false;
    }

    // Create a new product with updated alternatives to prevent mutation issues
    if (!product.alternativeUPCs.has(alternativeUpc)) {
      const updatedProduct: FormulaProduct = {
        ...product,
        alternativeUPCs: new Set(product.alternativeUPCs),
      };
      updatedProduct.alternativeUPCs.add(alternativeUpc);
      await this.upsertProduct(updatedProduct);
    }

    return true;
  }

  /**
   * Remove alternative UPC from a product
   */
  async removeAlternative(
    upc: string,
    alternativeUpc: string
  ): Promise<boolean> {
    const product = await this.getProduct(upc);
    if (!product) {
      return false;
    }

    // Create a new product with updated alternatives to prevent mutation issues
    if (product.alternativeUPCs.has(alternativeUpc)) {
      const updatedProduct: FormulaProduct = {
        ...product,
        alternativeUPCs: new Set(product.alternativeUPCs),
      };
      updatedProduct.alternativeUPCs.delete(alternativeUpc);
      await this.upsertProduct(updatedProduct);
      return true;
    }

    return false;
  }

  /**
   * Get all products (for admin/testing)
   * NOTE: This method is used internally but not exported via API layer.
   * Consider exposing via admin API endpoint if needed.
   */
  async getAllProducts(): Promise<FormulaProduct[]> {
    return Array.from(this.products.values());
  }
}

// Singleton instance
let instance: FormulaProductService | null = null;

export function getFormulaProductService(): FormulaProductService {
  if (!instance) {
    instance = new FormulaProductService();
  }
  return instance;
}
