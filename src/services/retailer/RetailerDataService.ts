/**
 * WIC Retailer Data Service
 *
 * Main service for sourcing, normalizing, and managing WIC retailer data
 * Orchestrates state-specific scrapers and data processing
 */

import {
  IRetailerDataService,
  StateCode,
  WICRetailerRawData,
  NormalizedRetailerData,
  ScrapingResult,
  ScrapingError,
  GeocodingResult,
  EnrichmentResult,
  DataQualityMetrics,
} from './types/retailer.types';
import { createMichiganScraper } from './scrapers/MichiganRetailerScraper';
import { createNorthCarolinaScraper } from './scrapers/NorthCarolinaRetailerScraper';
import { createFloridaScraper } from './scrapers/FloridaRetailerScraper';
import { createOregonScraper } from './scrapers/OregonRetailerScraper';
import {
  normalizeRetailerData,
  deduplicateRetailers,
  validateNormalizedData,
} from './utils/normalization.utils';

export class RetailerDataService implements IRetailerDataService {
  /**
   * Scrape retailer data for a specific state
   */
  async scrapeState(state: StateCode): Promise<ScrapingResult> {
    const startTime = Date.now();
    const errors: ScrapingError[] = [];

    try {
      console.log(`[RetailerDataService] Starting scrape for state: ${state}`);

      const scraper = this.getScraperForState(state);
      const data = await scraper.scrapeAll();

      const durationMs = Date.now() - startTime;

      return {
        state,
        success: true,
        recordsScraped: data.length,
        data,
        errors,
        scrapedAt: new Date().toISOString(),
        durationMs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({
        type: 'other',
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });

      const durationMs = Date.now() - startTime;

      return {
        state,
        success: false,
        recordsScraped: 0,
        data: [],
        errors,
        scrapedAt: new Date().toISOString(),
        durationMs,
      };
    }
  }

  /**
   * Scrape all configured states
   */
  async scrapeAllStates(): Promise<ScrapingResult[]> {
    const states: StateCode[] = ['MI', 'NC', 'FL', 'OR'];
    const results: ScrapingResult[] = [];

    for (const state of states) {
      const result = await this.scrapeState(state);
      results.push(result);

      // Log summary
      console.log(
        `[RetailerDataService] ${state}: ${result.success ? 'SUCCESS' : 'FAILED'} - ` +
          `${result.recordsScraped} records in ${result.durationMs}ms`
      );
    }

    return results;
  }

  /**
   * Normalize raw retailer data to standard format
   */
  async normalizeData(rawData: WICRetailerRawData[]): Promise<NormalizedRetailerData[]> {
    console.log(`[RetailerDataService] Normalizing ${rawData.length} raw records`);

    const normalized: NormalizedRetailerData[] = [];

    for (const raw of rawData) {
      const normalizedRecord = normalizeRetailerData(raw);
      if (normalizedRecord && validateNormalizedData(normalizedRecord)) {
        normalized.push(normalizedRecord);
      } else {
        console.warn('[RetailerDataService] Failed to normalize or validate:', raw);
      }
    }

    // Deduplicate
    const deduplicated = deduplicateRetailers(normalized);

    console.log(
      `[RetailerDataService] Normalized ${normalized.length} records, ` +
        `deduplicated to ${deduplicated.length}`
    );

    return deduplicated;
  }

  /**
   * Geocode addresses missing coordinates
   *
   * Note: This is a placeholder. Real implementation would use Google Geocoding API
   */
  async geocodeAddresses(data: WICRetailerRawData[]): Promise<GeocodingResult[]> {
    console.log(`[RetailerDataService] Geocoding ${data.length} addresses`);

    const results: GeocodingResult[] = [];

    for (const retailer of data) {
      // Skip if already has coordinates
      if (retailer.latitude && retailer.longitude) {
        results.push({
          success: true,
          latitude: retailer.latitude,
          longitude: retailer.longitude,
          source: 'cache',
        });
        continue;
      }

      // TODO: Implement actual geocoding via Google Geocoding API
      // For now, return placeholder result
      results.push({
        success: false,
        error: 'Geocoding not yet implemented',
        source: 'google',
      });
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(
      `[RetailerDataService] Geocoding complete: ${successCount}/${data.length} successful`
    );

    return results;
  }

  /**
   * Enrich data with Google Places API
   *
   * Note: This is a placeholder. Real implementation would use Google Places API
   */
  async enrichData(data: NormalizedRetailerData[]): Promise<EnrichmentResult[]> {
    console.log(`[RetailerDataService] Enriching ${data.length} records with Places API`);

    const results: EnrichmentResult[] = [];

    for (const retailer of data) {
      // TODO: Implement actual enrichment via Google Places API
      // Search for place by name + address
      // Retrieve additional details (hours, phone, website, ratings)

      results.push({
        success: false,
        error: 'Enrichment not yet implemented',
      });
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(
      `[RetailerDataService] Enrichment complete: ${successCount}/${data.length} successful`
    );

    return results;
  }

  /**
   * Calculate data quality metrics
   */
  calculateQualityMetrics(data: WICRetailerRawData[]): DataQualityMetrics {
    const totalRecords = data.length;

    const recordsWithCoordinates = data.filter((r) => r.latitude && r.longitude).length;
    const recordsWithPhone = data.filter((r) => r.phone).length;
    const recordsWithHours = data.filter((r) => r.hours).length;
    const recordsWithVendorId = data.filter((r) => r.wicVendorId).length;

    // Simple completeness score (average of field completion rates)
    const completenessScore = Math.round(
      ((recordsWithCoordinates / totalRecords +
        recordsWithPhone / totalRecords +
        recordsWithHours / totalRecords +
        recordsWithVendorId / totalRecords) /
        4) *
        100
    );

    return {
      totalRecords,
      recordsWithCoordinates,
      recordsWithPhone,
      recordsWithHours,
      recordsWithVendorId,
      duplicatesFound: 0, // Would be calculated during deduplication
      validationErrors: 0, // Would be tracked during normalization
      completenessScore,
    };
  }

  /**
   * Get appropriate scraper for state
   */
  private getScraperForState(state: StateCode) {
    switch (state) {
      case 'MI':
        return createMichiganScraper();
      case 'NC':
        return createNorthCarolinaScraper();
      case 'FL':
        return createFloridaScraper();
      case 'OR':
        return createOregonScraper();
      default:
        throw new Error(`No scraper available for state: ${state}`);
    }
  }

  /**
   * Validate all scrapers are working
   */
  async validateAllScrapers(): Promise<Record<StateCode, boolean>> {
    const states: StateCode[] = ['MI', 'NC', 'FL', 'OR'];
    const results: Record<StateCode, boolean> = {} as any;

    for (const state of states) {
      const scraper = this.getScraperForState(state);
      const isValid = await scraper.validate();
      results[state] = isValid;

      console.log(`[RetailerDataService] ${state} scraper: ${isValid ? 'VALID' : 'INVALID'}`);
    }

    return results;
  }
}

/**
 * Factory function to create RetailerDataService
 */
export function createRetailerDataService(): RetailerDataService {
  return new RetailerDataService();
}
