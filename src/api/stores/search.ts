/**
 * Store Search API
 * Endpoint to search WIC-authorized stores by location
 */

import { Request, Response } from 'express';
import { StoreRepository } from '../../database/StoreRepository';
import { Pool } from 'pg';
import {
  StoreSearchParams,
  StoreSearchResult,
  StoreSearchResponse,
} from './types';

/**
 * Convert miles to meters
 */
function milesToMeters(miles: number): number {
  return miles * 1609.34;
}

/**
 * Convert meters to miles
 */
function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

/**
 * Filter stores by features
 */
function filterByFeatures(stores: StoreSearchResult[], features: string[]): StoreSearchResult[] {
  if (!features || features.length === 0) return stores;

  return stores.filter(store => {
    return features.every(feature => {
      const featureValue = (store.features as any)[feature];
      return featureValue === true;
    });
  });
}

/**
 * Search stores by location
 *
 * Query parameters:
 * - lat: Latitude (required)
 * - lng: Longitude (required)
 * - radiusMiles: Search radius in miles (default: 10)
 * - wicAuthorizedOnly: Only return WIC-authorized stores (default: true)
 * - limit: Number of results per page (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 * - state: Filter by state code (optional)
 * - features: Comma-separated list of required features (optional)
 */
export async function searchStores(
  req: Request,
  res: Response,
  pool: Pool
): Promise<void> {
  try {
    // Parse and validate query parameters
    const params: StoreSearchParams = {
      lat: parseFloat(req.query.lat as string),
      lng: parseFloat(req.query.lng as string),
      radiusMiles: req.query.radiusMiles ? parseFloat(req.query.radiusMiles as string) : 10,
      wicAuthorizedOnly: req.query.wicAuthorizedOnly !== 'false', // default true
      limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
      offset: parseInt(req.query.offset as string) || 0,
      state: req.query.state as string,
      features: req.query.features ? (req.query.features as string).split(',') : undefined,
    };

    // Validate required parameters
    if (isNaN(params.lat) || isNaN(params.lng)) {
      res.status(400).json({
        error: 'Invalid parameters',
        message: 'lat and lng are required and must be valid numbers',
      });
      return;
    }

    if (params.lat < -90 || params.lat > 90) {
      res.status(400).json({
        error: 'Invalid latitude',
        message: 'Latitude must be between -90 and 90',
      });
      return;
    }

    if (params.lng < -180 || params.lng > 180) {
      res.status(400).json({
        error: 'Invalid longitude',
        message: 'Longitude must be between -180 and 180',
      });
      return;
    }

    // Convert radius to meters
    const radiusMeters = milesToMeters(params.radiusMiles!);

    // Query database
    const repository = new StoreRepository(pool);
    let stores = await repository.getStoresNearby(
      params.lat,
      params.lng,
      radiusMeters,
      params.wicAuthorizedOnly!
    );

    // Add distance in miles
    const storesWithDistance: StoreSearchResult[] = stores.map(store => ({
      ...store,
      distanceMiles: parseFloat(metersToMiles(store.distanceMeters).toFixed(2)),
    }));

    // Apply state filter if provided
    let filteredStores = storesWithDistance;
    if (params.state) {
      filteredStores = filteredStores.filter(
        store => store.address.state.toLowerCase() === params.state!.toLowerCase()
      );
    }

    // Apply feature filters
    if (params.features && params.features.length > 0) {
      filteredStores = filterByFeatures(filteredStores, params.features);
    }

    // Calculate pagination
    const total = filteredStores.length;
    const paginatedStores = filteredStores.slice(
      params.offset!,
      params.offset! + params.limit!
    );
    const hasMore = params.offset! + params.limit! < total;

    // Build response
    const response: StoreSearchResponse = {
      stores: paginatedStores,
      total,
      page: Math.floor(params.offset! / params.limit!) + 1,
      pageSize: params.limit!,
      hasMore,
    };

    res.json(response);
  } catch (error) {
    console.error('Store search error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to search stores',
    });
  }
}

/**
 * Express route handler factory
 * Usage: app.get('/api/stores/search', createSearchHandler(pool))
 */
export function createSearchHandler(pool: Pool) {
  return (req: Request, res: Response) => searchStores(req, res, pool);
}
