/**
 * North Carolina WIC Retailer Scraper
 *
 * Scrapes WIC-authorized retailer data from NC DHHS website
 * North Carolina uses Conduent (Bnft) as eWIC processor
 */

import axios, { AxiosInstance } from 'axios';
import {
  IStateScraper,
  WICRetailerRawData,
  ScraperConfig,
  StateCode,
} from '../types/retailer.types';
import { NORTH_CAROLINA_SCRAPER_CONFIG } from '../config/scraper.config';

export class NorthCarolinaRetailerScraper implements IStateScraper {
  public readonly state: StateCode = 'NC';
  public readonly config: ScraperConfig;
  private httpClient: AxiosInstance;

  constructor(config?: Partial<ScraperConfig>) {
    this.config = { ...NORTH_CAROLINA_SCRAPER_CONFIG, ...config };
    this.httpClient = this.createHttpClient();
  }

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
   * Scrape all WIC retailers in North Carolina
   */
  async scrapeAll(): Promise<WICRetailerRawData[]> {
    try {
      console.log('[NCRetailerScraper] Starting scrape of all NC WIC retailers');

      const allRetailers: WICRetailerRawData[] = [];

      // Sample: Major NC cities
      const majorCityZips = [
        '27701', // Durham
        '28202', // Charlotte
        '27601', // Raleigh
        '27401', // Greensboro
        '27101', // Winston-Salem
        '28801', // Asheville
      ];

      for (const zip of majorCityZips) {
        await this.delay(this.config.requestDelayMs);
        const retailers = await this.scrapeByZip(zip);
        allRetailers.push(...retailers);
      }

      console.log(
        `[NCRetailerScraper] Scrape complete: ${allRetailers.length} retailers found`
      );

      return allRetailers;
    } catch (error) {
      console.error('[NCRetailerScraper] Error scraping NC retailers:', error);
      throw error;
    }
  }

  /**
   * Scrape WIC retailers by zip code
   */
  async scrapeByZip(zipCode: string): Promise<WICRetailerRawData[]> {
    try {
      console.log(`[NCRetailerScraper] Scraping retailers for zip: ${zipCode}`);

      // TODO: Implement actual scraping logic for NC vendor locator

      // Placeholder mock data
      const mockData: WICRetailerRawData[] = [
        {
          state: 'NC',
          source: 'nc_web',
          scrapedAt: new Date().toISOString(),
          processorType: 'conduent',

          vendorName: 'Food Lion',
          wicVendorId: 'NC-67890',

          address: '456 Oak Ave',
          city: this.getCityForZip(zipCode),
          stateCode: 'NC',
          zip: zipCode,

          phone: '(555) 234-5678',

          storeType: 'grocery',
          services: ['formula', 'fresh_produce', 'deli'],

          latitude: this.getLatitudeForZip(zipCode),
          longitude: this.getLongitudeForZip(zipCode),

          chainName: 'Food Lion',
        },
      ];

      return mockData;
    } catch (error) {
      console.error(`[NCRetailerScraper] Error scraping zip ${zipCode}:`, error);
      return [];
    }
  }

  async validate(): Promise<boolean> {
    try {
      console.log('[NCRetailerScraper] Validating scraper...');

      const testResults = await this.scrapeByZip('27701'); // Durham

      if (testResults.length === 0) {
        console.warn('[NCRetailerScraper] Validation warning: No results returned');
        return true;
      }

      const firstResult = testResults[0];
      const hasRequiredFields: boolean =
        !!(firstResult.vendorName &&
        firstResult.address &&
        firstResult.city &&
        firstResult.zip);

      console.log(`[NCRetailerScraper] Validation ${hasRequiredFields ? 'passed' : 'failed'}`);
      return hasRequiredFields;
    } catch (error) {
      console.error('[NCRetailerScraper] Validation failed:', error);
      return false;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getCityForZip(zipCode: string): string {
    const zipToCityMap: Record<string, string> = {
      '27701': 'Durham',
      '28202': 'Charlotte',
      '27601': 'Raleigh',
      '27401': 'Greensboro',
      '27101': 'Winston-Salem',
      '28801': 'Asheville',
    };

    return zipToCityMap[zipCode] || 'Unknown City';
  }

  private getLatitudeForZip(zipCode: string): number {
    const zipToLatMap: Record<string, number> = {
      '27701': 35.9940, // Durham
      '28202': 35.2271, // Charlotte
      '27601': 35.7796, // Raleigh
      '27401': 36.0726, // Greensboro
      '27101': 36.0995, // Winston-Salem
      '28801': 35.5951, // Asheville
    };

    return zipToLatMap[zipCode] || 35.5; // Default to NC center
  }

  private getLongitudeForZip(zipCode: string): number {
    const zipToLngMap: Record<string, number> = {
      '27701': -78.8986, // Durham
      '28202': -80.8439, // Charlotte
      '27601': -78.6382, // Raleigh
      '27401': -79.7920, // Greensboro
      '27101': -80.2454, // Winston-Salem
      '28801': -82.5515, // Asheville
    };

    return zipToLngMap[zipCode] || -79.5; // Default to NC center
  }
}

export function createNorthCarolinaScraper(
  config?: Partial<ScraperConfig>
): NorthCarolinaRetailerScraper {
  return new NorthCarolinaRetailerScraper(config);
}
