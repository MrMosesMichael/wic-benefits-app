/**
 * Michigan WIC Retailer Scraper
 *
 * Scrapes WIC-authorized retailer data from Michigan DHHS website
 * Michigan uses FIS (Custom Data Processing) as eWIC processor
 */

import axios, { AxiosInstance } from 'axios';
import {
  IStateScraper,
  WICRetailerRawData,
  ScraperConfig,
  StateCode,
} from '../types/retailer.types';
import { MICHIGAN_SCRAPER_CONFIG } from '../config/scraper.config';

export class MichiganRetailerScraper implements IStateScraper {
  public readonly state: StateCode = 'MI';
  public readonly config: ScraperConfig;
  private httpClient: AxiosInstance;

  constructor(config?: Partial<ScraperConfig>) {
    this.config = { ...MICHIGAN_SCRAPER_CONFIG, ...config };
    this.httpClient = this.createHttpClient();
  }

  /**
   * Create configured HTTP client with rate limiting and retry logic
   */
  private createHttpClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'User-Agent': this.config.userAgent,
        ...this.config.headers,
      },
    });
  }

  /**
   * Scrape all WIC retailers in Michigan
   *
   * Note: This is a placeholder implementation. Real implementation would:
   * 1. Identify the actual vendor search endpoint/API
   * 2. Iterate through all Michigan zip codes or use region-based search
   * 3. Parse HTML or JSON response to extract vendor data
   * 4. Handle pagination if needed
   *
   * For now, returns sample data structure to demonstrate expected format
   */
  async scrapeAll(): Promise<WICRetailerRawData[]> {
    try {
      console.log('[MichiganScraper] Starting scrape of all Michigan WIC retailers');

      // TODO: Implement actual scraping logic
      // For production:
      // 1. Load list of Michigan zip codes
      // 2. Call scrapeByZip for each zip
      // 3. Deduplicate results
      // 4. Return all unique retailers

      const allRetailers: WICRetailerRawData[] = [];

      // Sample: Scrape by major cities
      const majorCityZips = [
        '48201', // Detroit
        '49503', // Grand Rapids
        '48503', // Flint
        '48823', // Lansing
        '48103', // Ann Arbor
      ];

      for (const zip of majorCityZips) {
        await this.delay(this.config.requestDelayMs);
        const retailers = await this.scrapeByZip(zip);
        allRetailers.push(...retailers);
      }

      console.log(
        `[MichiganScraper] Scrape complete: ${allRetailers.length} retailers found`
      );

      return allRetailers;
    } catch (error) {
      console.error('[MichiganScraper] Error scraping Michigan retailers:', error);
      throw error;
    }
  }

  /**
   * Scrape WIC retailers by zip code
   *
   * Note: This is a placeholder implementation
   * Real implementation would make HTTP request to Michigan's vendor locator
   */
  async scrapeByZip(zipCode: string): Promise<WICRetailerRawData[]> {
    try {
      console.log(`[MichiganScraper] Scraping retailers for zip: ${zipCode}`);

      // TODO: Implement actual scraping logic
      // 1. Make request to vendor locator with zip code
      // 2. Parse response (HTML or JSON)
      // 3. Extract vendor data
      // 4. Return structured data

      // Placeholder: Return mock data to demonstrate structure
      const mockData: WICRetailerRawData[] = [
        {
          state: 'MI',
          source: 'michigan_web',
          scrapedAt: new Date().toISOString(),
          processorType: 'fis',

          vendorName: 'Walmart Supercenter',
          wicVendorId: 'MI-12345',

          address: '123 Main St',
          city: this.getCityForZip(zipCode),
          stateCode: 'MI',
          zip: zipCode,

          phone: '(555) 123-4567',

          storeType: 'grocery',
          services: ['formula', 'fresh_produce', 'deli', 'pharmacy'],

          // Approximate coordinates for major cities in Michigan
          latitude: this.getLatitudeForZip(zipCode),
          longitude: this.getLongitudeForZip(zipCode),

          chainName: 'Walmart',
        },
      ];

      return mockData;
    } catch (error) {
      console.error(`[MichiganScraper] Error scraping zip ${zipCode}:`, error);
      return [];
    }
  }

  /**
   * Validate that scraper is working
   * Tests with a known zip code
   */
  async validate(): Promise<boolean> {
    try {
      console.log('[MichiganScraper] Validating scraper...');

      // Test with Detroit zip code
      const testResults = await this.scrapeByZip('48201');

      // Validation passes if we got any results and they have required fields
      if (testResults.length === 0) {
        console.warn('[MichiganScraper] Validation warning: No results returned');
        return true; // Still valid, just no data for this zip
      }

      const firstResult = testResults[0];
      const hasRequiredFields: boolean =
        !!(firstResult.vendorName &&
        firstResult.address &&
        firstResult.city &&
        firstResult.zip);

      console.log(`[MichiganScraper] Validation ${hasRequiredFields ? 'passed' : 'failed'}`);
      return hasRequiredFields;
    } catch (error) {
      console.error('[MichiganScraper] Validation failed:', error);
      return false;
    }
  }

  /**
   * Helper: Delay between requests (rate limiting)
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Helper: Get city name for zip code (placeholder)
   * Real implementation would use zip code database
   */
  private getCityForZip(zipCode: string): string {
    const zipToCityMap: Record<string, string> = {
      '48201': 'Detroit',
      '49503': 'Grand Rapids',
      '48503': 'Flint',
      '48823': 'Lansing',
      '48103': 'Ann Arbor',
    };

    return zipToCityMap[zipCode] || 'Unknown City';
  }

  /**
   * Helper: Get approximate latitude for zip code
   */
  private getLatitudeForZip(zipCode: string): number {
    const zipToLatMap: Record<string, number> = {
      '48201': 42.3314, // Detroit
      '49503': 42.9634, // Grand Rapids
      '48503': 43.1031, // Flint
      '48823': 42.7335, // Lansing
      '48103': 42.2808, // Ann Arbor
    };

    return zipToLatMap[zipCode] || 42.5; // Default to Michigan center
  }

  /**
   * Helper: Get approximate longitude for zip code
   */
  private getLongitudeForZip(zipCode: string): number {
    const zipToLngMap: Record<string, number> = {
      '48201': -83.0458, // Detroit
      '49503': -85.6789, // Grand Rapids
      '48503': -83.6855, // Flint
      '48823': -84.5555, // Lansing
      '48103': -83.7430, // Ann Arbor
    };

    return zipToLngMap[zipCode] || -84.5; // Default to Michigan center
  }
}

/**
 * Factory function to create Michigan scraper
 */
export function createMichiganScraper(
  config?: Partial<ScraperConfig>
): MichiganRetailerScraper {
  return new MichiganRetailerScraper(config);
}
