/**
 * Formula Sightings API
 * A4.1 - API endpoints for crowdsourced formula sightings
 */

import { FormulaSighting } from '../../types/formula';
import { getFormulaAvailabilityService } from '../../services/formula';

/**
 * Record a formula sighting by a user
 */
export async function recordFormulaSighting(
  userId: string,
  storeId: string,
  upc: string,
  quantity: number
): Promise<{ success: boolean; data?: FormulaSighting; error?: string }> {
  try {
    if (!userId || !storeId || !upc) {
      return { success: false, error: 'Missing required fields' };
    }

    if (quantity < 0) {
      return { success: false, error: 'Quantity must be non-negative' };
    }

    const service = getFormulaAvailabilityService();
    const sighting = await service.recordSighting(
      userId,
      storeId,
      upc,
      quantity
    );
    return { success: true, data: sighting };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get recent sightings for a store and UPC
 */
export async function getFormulaSightings(
  storeId: string,
  upc: string,
  maxAgeHours?: number
): Promise<{ success: boolean; data?: FormulaSighting[]; error?: string }> {
  try {
    const service = getFormulaAvailabilityService();
    const sightings = await service.getSightings(storeId, upc, maxAgeHours);
    return { success: true, data: sightings };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify a formula sighting (admin/moderation)
 */
export async function verifyFormulaSighting(
  sightingId: string
): Promise<{ success: boolean; verified?: boolean; error?: string }> {
  try {
    if (!sightingId) {
      return { success: false, error: 'Sighting ID is required' };
    }

    const service = getFormulaAvailabilityService();
    const verified = await service.verifySighting(sightingId);
    return { success: true, verified };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
