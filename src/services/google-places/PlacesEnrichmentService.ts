/**
 * Places Enrichment Service
 *
 * Service for enriching store data with Google Places API
 * (hours, phone, website, ratings, photos)
 */

import { GooglePlacesClient } from './GooglePlacesClient';
import { GooglePeriod, GoogleOpeningHours } from './types';
import { EnrichmentResult, NormalizedRetailerData, OperatingHours } from '../retailer/types/retailer.types';

export interface PlacesEnrichmentOptions {
  maxConcurrent?: number;
  onProgress?: (current: number, total: number) => void;
  skipIfHasHours?: boolean;
  skipIfHasPhone?: boolean;
}

export class PlacesEnrichmentService {
  private client: GooglePlacesClient;

  constructor(client?: GooglePlacesClient) {
    this.client = client || new GooglePlacesClient();
  }

  /**
   * Enrich a single retailer with Google Places data
   */
  async enrichRetailer(retailer: NormalizedRetailerData): Promise<EnrichmentResult> {
    if (!this.client.isConfigured()) {
      return {
        success: false,
        error: 'Google Places API key not configured',
      };
    }

    try {
      // Step 1: Find the place by name and address
      const searchQuery = `${retailer.name}, ${retailer.address.street}, ${retailer.address.city}, ${retailer.address.state}`;
      const searchResponse = await this.client.findPlace(searchQuery);

      if (searchResponse.status !== 'OK' || searchResponse.candidates.length === 0) {
        return {
          success: false,
          error: `Place not found: ${searchResponse.status}`,
        };
      }

      // Take the first candidate (most relevant)
      const candidate = searchResponse.candidates[0];
      const placeId = candidate.place_id;

      // Step 2: Get detailed information about the place
      const detailsResponse = await this.client.getPlaceDetails(placeId);

      if (detailsResponse.status !== 'OK') {
        return {
          success: false,
          error: `Failed to get place details: ${detailsResponse.status}`,
        };
      }

      const details = detailsResponse.result;

      // Step 3: Extract and structure the enrichment data
      return {
        success: true,
        placeId: details.place_id,
        phone: details.formatted_phone_number || details.international_phone_number,
        website: details.website,
        hours: details.opening_hours ? this.parseOpeningHours(details.opening_hours) : undefined,
        rating: details.rating,
        userRatingsTotal: details.user_ratings_total,
        photos: details.photos?.map(p => p.photo_reference),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Enrichment error: ${errorMessage}`,
      };
    }
  }

  /**
   * Batch enrich multiple retailers
   */
  async enrichRetailers(
    retailers: NormalizedRetailerData[],
    options: PlacesEnrichmentOptions = {}
  ): Promise<EnrichmentResult[]> {
    const {
      maxConcurrent = 5,
      onProgress,
      skipIfHasHours = false,
      skipIfHasPhone = false,
    } = options;

    // Filter retailers that need enrichment
    const toEnrich = retailers.filter(r => {
      if (skipIfHasHours && r.hours && r.hours.length > 0) return false;
      if (skipIfHasPhone && r.phone) return false;
      return true;
    });

    console.log(
      `[PlacesEnrichmentService] Enriching ${toEnrich.length} of ${retailers.length} retailers`
    );

    const results: EnrichmentResult[] = [];

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < toEnrich.length; i += maxConcurrent) {
      const batch = toEnrich.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(batch.map(r => this.enrichRetailer(r)));
      results.push(...batchResults);

      if (onProgress) {
        onProgress(i + batch.length, toEnrich.length);
      }

      console.log(
        `[PlacesEnrichmentService] Batch ${Math.floor(i / maxConcurrent) + 1}: ` +
          `${i + batch.length}/${toEnrich.length} completed`
      );
    }

    // Add skipped results
    const skippedCount = retailers.length - toEnrich.length;
    for (let i = 0; i < skippedCount; i++) {
      results.push({
        success: false,
        error: 'Skipped (already has data)',
      });
    }

    const successCount = results.filter(r => r.success).length;
    console.log(
      `[PlacesEnrichmentService] Enrichment complete: ${successCount}/${toEnrich.length} successful`
    );

    return results;
  }

  /**
   * Apply enrichment results to retailers
   */
  applyEnrichment(
    retailers: NormalizedRetailerData[],
    enrichmentResults: EnrichmentResult[]
  ): NormalizedRetailerData[] {
    if (retailers.length !== enrichmentResults.length) {
      console.warn(
        `[PlacesEnrichmentService] Mismatched array lengths: ${retailers.length} retailers, ${enrichmentResults.length} results`
      );
    }

    return retailers.map((retailer, index) => {
      const enrichment = enrichmentResults[index];

      if (!enrichment || !enrichment.success) {
        return retailer;
      }

      // Merge enrichment data, preferring existing data if present
      return {
        ...retailer,
        phone: retailer.phone || enrichment.phone,
        website: retailer.website || enrichment.website,
        hours: retailer.hours && retailer.hours.length > 0 ? retailer.hours : enrichment.hours,
        // Add enrichment metadata to features
        features: {
          ...retailer.features,
          // Could add ratings or other metadata here
        },
      };
    });
  }

  /**
   * Parse Google opening hours to our OperatingHours format
   */
  private parseOpeningHours(googleHours: GoogleOpeningHours): OperatingHours[] {
    if (!googleHours.periods || googleHours.periods.length === 0) {
      return [];
    }

    const hours: OperatingHours[] = [];

    for (const period of googleHours.periods) {
      // Handle 24/7 open stores (no close time)
      if (!period.close) {
        // Store is open 24 hours for this day
        hours.push({
          dayOfWeek: period.open.day,
          openTime: '00:00',
          closeTime: '23:59',
          closed: false,
        });
        continue;
      }

      // Convert Google time format "0900" to "09:00"
      const openTime = this.formatTime(period.open.time);
      const closeTime = this.formatTime(period.close.time);

      // Handle cases where close is on a different day (e.g., open till after midnight)
      if (period.open.day === period.close.day) {
        hours.push({
          dayOfWeek: period.open.day,
          openTime,
          closeTime,
          closed: false,
        });
      } else {
        // Split into two entries: open day until midnight, next day from midnight to close
        hours.push({
          dayOfWeek: period.open.day,
          openTime,
          closeTime: '23:59',
          closed: false,
        });
        hours.push({
          dayOfWeek: period.close.day,
          openTime: '00:00',
          closeTime,
          closed: false,
        });
      }
    }

    // Fill in closed days (0-6, if any are missing)
    const coveredDays = new Set(hours.map(h => h.dayOfWeek));
    for (let day = 0; day <= 6; day++) {
      if (!coveredDays.has(day)) {
        hours.push({
          dayOfWeek: day,
          openTime: '00:00',
          closeTime: '00:00',
          closed: true,
        });
      }
    }

    // Sort by day of week
    return hours.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  /**
   * Format Google time "0900" to "09:00"
   */
  private formatTime(googleTime: string): string {
    if (googleTime.length !== 4) {
      console.warn(`[PlacesEnrichmentService] Invalid time format: ${googleTime}`);
      return '00:00';
    }

    const hours = googleTime.substring(0, 2);
    const minutes = googleTime.substring(2, 4);
    return `${hours}:${minutes}`;
  }
}
