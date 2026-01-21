/**
 * Formula Availability API
 * A4.1 - API endpoints for formula availability tracking
 */

import {
  FormulaAvailability,
  FormulaAvailabilityQuery,
  FormulaAvailabilityUpdate,
} from '../../types/formula';
import { getFormulaAvailabilityService } from '../../services/formula';

/**
 * Update formula availability at a store
 */
export async function updateFormulaAvailability(
  update: FormulaAvailabilityUpdate
): Promise<{ success: boolean; data?: FormulaAvailability; error?: string }> {
  try {
    const service = getFormulaAvailabilityService();
    const availability = await service.updateAvailability(update);
    return { success: true, data: availability };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get formula availability for specific store and UPC
 */
export async function getFormulaAvailability(
  storeId: string,
  upc: string
): Promise<{ success: boolean; data?: FormulaAvailability | null; error?: string }> {
  try {
    const service = getFormulaAvailabilityService();
    const availability = await service.getAvailability(storeId, upc);
    return { success: true, data: availability };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Query formula availability with filters
 */
export async function queryFormulaAvailability(
  query: FormulaAvailabilityQuery
): Promise<{ success: boolean; data?: FormulaAvailability[]; error?: string }> {
  try {
    const service = getFormulaAvailabilityService();
    const results = await service.queryAvailability(query);
    return { success: true, data: results };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if formula is available anywhere
 */
export async function checkFormulaAvailability(
  upc: string
): Promise<{ success: boolean; available?: boolean; storeIds?: string[]; error?: string }> {
  try {
    const service = getFormulaAvailabilityService();
    const available = await service.isAvailableAnywhere(upc);
    const storeIds = available ? await service.getStoresWithStock(upc) : [];
    return { success: true, available, storeIds };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clear stale availability data
 */
export async function clearStaleAvailabilityData(
  maxAgeHours: number = 24
): Promise<{ success: boolean; removedCount?: number; error?: string }> {
  try {
    const service = getFormulaAvailabilityService();
    const removedCount = await service.clearStaleData(maxAgeHours);
    return { success: true, removedCount };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
