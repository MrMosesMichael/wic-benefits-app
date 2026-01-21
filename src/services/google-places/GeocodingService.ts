/**
 * Geocoding Service
 *
 * Service for geocoding addresses to coordinates using Google Geocoding API
 */

import { GooglePlacesClient } from './GooglePlacesClient';
import { GeocodingResult } from '../retailer/types/retailer.types';
import { WICRetailerRawData } from '../retailer/types/retailer.types';

export class GeocodingService {
  private client: GooglePlacesClient;

  constructor(client?: GooglePlacesClient) {
    this.client = client || new GooglePlacesClient();
  }

  /**
   * Geocode a single address string
   */
  async geocodeAddress(address: string): Promise<GeocodingResult> {
    if (!this.client.isConfigured()) {
      return {
        success: false,
        error: 'Google Places API key not configured',
        source: 'google',
      };
    }

    try {
      const response = await this.client.geocode(address);

      if (response.status === 'OK' && response.results.length > 0) {
        const result = response.results[0];
        return {
          success: true,
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
          source: 'google',
        };
      } else if (response.status === 'ZERO_RESULTS') {
        return {
          success: false,
          error: 'Address not found',
          source: 'google',
        };
      } else if (response.status === 'OVER_QUERY_LIMIT') {
        return {
          success: false,
          error: 'API quota exceeded',
          source: 'google',
        };
      } else {
        return {
          success: false,
          error: `Geocoding failed: ${response.status}`,
          source: 'google',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Geocoding error: ${errorMessage}`,
        source: 'google',
      };
    }
  }

  /**
   * Geocode a retailer record (construct address from fields)
   */
  async geocodeRetailer(retailer: WICRetailerRawData): Promise<GeocodingResult> {
    // If already has coordinates, return cached result
    if (retailer.latitude && retailer.longitude) {
      return {
        success: true,
        latitude: retailer.latitude,
        longitude: retailer.longitude,
        source: 'cache',
      };
    }

    // Construct full address string
    const addressParts = [
      retailer.address,
      retailer.address2,
      retailer.city,
      retailer.stateCode,
      retailer.zip,
    ].filter(Boolean);

    const fullAddress = addressParts.join(', ');

    return this.geocodeAddress(fullAddress);
  }

  /**
   * Batch geocode multiple retailers
   */
  async geocodeRetailers(
    retailers: WICRetailerRawData[],
    options: {
      skipExisting?: boolean;
      maxConcurrent?: number;
      onProgress?: (current: number, total: number) => void;
    } = {}
  ): Promise<GeocodingResult[]> {
    const { skipExisting = true, maxConcurrent = 5, onProgress } = options;

    const results: GeocodingResult[] = [];
    const toGeocode = skipExisting
      ? retailers.filter(r => !r.latitude || !r.longitude)
      : retailers;

    console.log(
      `[GeocodingService] Geocoding ${toGeocode.length} of ${retailers.length} retailers`
    );

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < toGeocode.length; i += maxConcurrent) {
      const batch = toGeocode.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(batch.map(r => this.geocodeRetailer(r)));
      results.push(...batchResults);

      if (onProgress) {
        onProgress(i + batch.length, toGeocode.length);
      }

      console.log(
        `[GeocodingService] Batch ${Math.floor(i / maxConcurrent) + 1}: ` +
          `${i + batch.length}/${toGeocode.length} completed`
      );
    }

    // Add cached results for retailers that were skipped
    if (skipExisting) {
      for (const retailer of retailers) {
        if (retailer.latitude && retailer.longitude) {
          results.push({
            success: true,
            latitude: retailer.latitude,
            longitude: retailer.longitude,
            source: 'cache',
          });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(
      `[GeocodingService] Geocoding complete: ${successCount}/${retailers.length} successful`
    );

    return results;
  }

  /**
   * Validate coordinates are within reasonable bounds
   */
  validateCoordinates(lat: number, lng: number): boolean {
    // USA bounds (approximate)
    const USA_BOUNDS = {
      minLat: 24.396308, // Southern tip of Florida
      maxLat: 49.384358, // Northern border
      minLng: -125.0, // West coast
      maxLng: -66.93457, // East coast
    };

    return (
      lat >= USA_BOUNDS.minLat &&
      lat <= USA_BOUNDS.maxLat &&
      lng >= USA_BOUNDS.minLng &&
      lng <= USA_BOUNDS.maxLng
    );
  }
}
