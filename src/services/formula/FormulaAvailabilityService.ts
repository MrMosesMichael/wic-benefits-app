/**
 * Formula Availability Service
 * A4.1 - Tracks formula availability across stores
 */

import {
  FormulaProduct,
  FormulaAvailability,
  FormulaSighting,
  FormulaTrackingOptions,
  FormulaAvailabilityQuery,
  FormulaAvailabilityUpdate,
} from '../../types/formula';

/**
 * Service for tracking formula availability across WIC stores
 */
export class FormulaAvailabilityService {
  private availabilityCache: Map<string, FormulaAvailability>;
  private sightingsCache: Map<string, FormulaSighting[]>;

  constructor() {
    this.availabilityCache = new Map();
    this.sightingsCache = new Map();
  }

  /**
   * Get availability key for cache lookup
   */
  private getAvailabilityKey(storeId: string, upc: string): string {
    return `${storeId}:${upc}`;
  }

  /**
   * Update formula availability for a store
   */
  async updateAvailability(
    update: FormulaAvailabilityUpdate
  ): Promise<FormulaAvailability> {
    const availability: FormulaAvailability = {
      storeId: update.storeId,
      upc: update.upc,
      inStock: update.inStock,
      quantity: update.quantity,
      lastChecked: new Date(),
      source: update.source,
    };

    const key = this.getAvailabilityKey(update.storeId, update.upc);
    this.availabilityCache.set(key, availability);

    // TODO: Persist to database
    return availability;
  }

  /**
   * Get formula availability for specific store and UPC
   */
  async getAvailability(
    storeId: string,
    upc: string
  ): Promise<FormulaAvailability | null> {
    const key = this.getAvailabilityKey(storeId, upc);
    const cached = this.availabilityCache.get(key);

    if (cached) {
      return cached;
    }

    // TODO: Query from database
    return null;
  }

  /**
   * Query formula availability with filters
   */
  async queryAvailability(
    query: FormulaAvailabilityQuery
  ): Promise<FormulaAvailability[]> {
    let results: FormulaAvailability[] = Array.from(
      this.availabilityCache.values()
    );

    // Filter by store IDs
    if (query.storeIds && query.storeIds.length > 0) {
      results = results.filter((a) => query.storeIds!.includes(a.storeId));
    }

    // Filter by UPCs
    if (query.upcs && query.upcs.length > 0) {
      results = results.filter((a) => query.upcs!.includes(a.upc));
    }

    // Filter in-stock only
    if (query.inStockOnly) {
      results = results.filter((a) => a.inStock);
    }

    // Filter by max age
    if (query.maxAge) {
      const maxAgeMs = query.maxAge * 60 * 60 * 1000; // Convert hours to ms
      const cutoffTime = new Date(Date.now() - maxAgeMs);
      results = results.filter((a) => a.lastChecked >= cutoffTime);
    }

    return results;
  }

  /**
   * Record a crowdsourced formula sighting
   */
  async recordSighting(
    userId: string,
    storeId: string,
    upc: string,
    quantity: number
  ): Promise<FormulaSighting> {
    const sighting: FormulaSighting = {
      id: `sighting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      storeId,
      upc,
      quantity,
      timestamp: new Date(),
      verified: false,
    };

    // Add to sightings cache with defensive copy to prevent race conditions
    const key = this.getAvailabilityKey(storeId, upc);
    const existingSightings = this.sightingsCache.get(key) || [];
    const sightings = [...existingSightings, sighting];
    this.sightingsCache.set(key, sightings);

    // Update availability based on sighting
    await this.updateAvailability({
      storeId,
      upc,
      inStock: quantity > 0,
      quantity,
      source: 'crowdsourced',
    });

    // TODO: Persist to database
    return sighting;
  }

  /**
   * Get recent sightings for a store and UPC
   */
  async getSightings(
    storeId: string,
    upc: string,
    maxAge?: number
  ): Promise<FormulaSighting[]> {
    const key = this.getAvailabilityKey(storeId, upc);
    let sightings = this.sightingsCache.get(key) || [];

    if (maxAge) {
      const maxAgeMs = maxAge * 60 * 60 * 1000; // Convert hours to ms
      const cutoffTime = new Date(Date.now() - maxAgeMs);
      sightings = sightings.filter((s) => s.timestamp >= cutoffTime);
    }

    return sightings;
  }

  /**
   * Verify a sighting (manual moderation)
   */
  async verifySighting(sightingId: string): Promise<boolean> {
    // Find and verify the sighting
    for (const [key, sightings] of this.sightingsCache.entries()) {
      const sighting = sightings.find((s) => s.id === sightingId);
      if (sighting) {
        sighting.verified = true;
        // TODO: Update in database
        return true;
      }
    }
    return false;
  }

  /**
   * Check if formula is available at any store
   */
  async isAvailableAnywhere(upc: string): Promise<boolean> {
    const availability = await this.queryAvailability({
      upcs: [upc],
      inStockOnly: true,
    });
    return availability.length > 0;
  }

  /**
   * Get stores where formula is in stock
   */
  async getStoresWithStock(upc: string): Promise<string[]> {
    const availability = await this.queryAvailability({
      upcs: [upc],
      inStockOnly: true,
    });
    return availability.map((a) => a.storeId);
  }

  /**
   * Clear stale availability data
   */
  async clearStaleData(maxAgeHours: number = 24): Promise<number> {
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - maxAgeMs);
    let removedCount = 0;

    for (const [key, availability] of this.availabilityCache.entries()) {
      if (availability.lastChecked < cutoffTime) {
        this.availabilityCache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }
}

// Singleton instance
let instance: FormulaAvailabilityService | null = null;

export function getFormulaAvailabilityService(): FormulaAvailabilityService {
  if (!instance) {
    instance = new FormulaAvailabilityService();
  }
  return instance;
}
