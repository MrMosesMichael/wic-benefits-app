/**
 * Oregon WIC Retailer Scraper
 *
 * Scrapes WIC-authorized retailer data from Oregon Health Authority website
 * Oregon uses state-managed eWIC system (not FIS or Conduent)
 */

import axios, { AxiosInstance } from 'axios';
import {
  IStateScraper,
  WICRetailerRawData,
  ScraperConfig,
  StateCode,
} from '../types/retailer.types';
import { OREGON_SCRAPER_CONFIG } from '../config/scraper.config';

export class OregonRetailerScraper implements IStateScraper {
  public readonly state: StateCode = 'OR';
  public readonly config: ScraperConfig;
  private httpClient: AxiosInstance;

  constructor(config?: Partial<ScraperConfig>) {
    this.config = { ...OREGON_SCRAPER_CONFIG, ...config };
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
   * Scrape all WIC retailers in Oregon
   */
  async scrapeAll(): Promise<WICRetailerRawData[]> {
    try {
      console.log('[OregonScraper] Starting scrape of all Oregon WIC retailers');

      const allRetailers: WICRetailerRawData[] = [];

      // Sample: Major Oregon cities
      const majorCityZips = [
        '97201', // Portland
        '97301', // Salem
        '97401', // Eugene
        '97701', // Bend
        '97330', // Corvallis
      ];

      for (const zip of majorCityZips) {
        await this.delay(this.config.requestDelayMs);
        const retailers = await this.scrapeByZip(zip);
        allRetailers.push(...retailers);
      }

      console.log(
        `[OregonScraper] Scrape complete: ${allRetailers.length} retailers found`
      );

      return allRetailers;
    } catch (error) {
      console.error('[OregonScraper] Error scraping Oregon retailers:', error);
      throw error;
    }
  }

  /**
   * Scrape WIC retailers by zip code
   */
  async scrapeByZip(zipCode: string): Promise<WICRetailerRawData[]> {
    try {
      console.log(`[OregonScraper] Scraping retailers for zip: ${zipCode}`);

      // TODO: Implement actual scraping logic for Oregon vendor locator
      // Note: Oregon may provide downloadable Excel/CSV files

      // Placeholder mock data
      const mockData: WICRetailerRawData[] = [
        {
          state: 'OR',
          source: 'oregon_web',
          scrapedAt: new Date().toISOString(),
          processorType: 'state',

          vendorName: 'Fred Meyer',
          wicVendorId: 'OR-44556',

          address: '321 Pine St',
          city: this.getCityForZip(zipCode),
          stateCode: 'OR',
          zip: zipCode,

          phone: '(555) 456-7890',

          storeType: 'grocery',
          services: ['formula', 'fresh_produce', 'deli', 'pharmacy'],

          latitude: this.getLatitudeForZip(zipCode),
          longitude: this.getLongitudeForZip(zipCode),

          chainName: 'Fred Meyer',
        },
      ];

      return mockData;
    } catch (error) {
      console.error(`[OregonScraper] Error scraping zip ${zipCode}:`, error);
      return [];
    }
  }

  async validate(): Promise<boolean> {
    try {
      console.log('[OregonScraper] Validating scraper...');

      const testResults = await this.scrapeByZip('97201'); // Portland

      if (testResults.length === 0) {
        console.warn('[OregonScraper] Validation warning: No results returned');
        return true;
      }

      const firstResult = testResults[0];
      const hasRequiredFields: boolean =
        !!(firstResult.vendorName &&
        firstResult.address &&
        firstResult.city &&
        firstResult.zip);

      console.log(`[OregonScraper] Validation ${hasRequiredFields ? 'passed' : 'failed'}`);
      return hasRequiredFields;
    } catch (error) {
      console.error('[OregonScraper] Validation failed:', error);
      return false;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getCityForZip(zipCode: string): string {
    const zipToCityMap: Record<string, string> = {
      '97201': 'Portland',
      '97301': 'Salem',
      '97401': 'Eugene',
      '97701': 'Bend',
      '97330': 'Corvallis',
    };

    return zipToCityMap[zipCode] || 'Unknown City';
  }

  private getLatitudeForZip(zipCode: string): number {
    const zipToLatMap: Record<string, number> = {
      '97201': 45.5152, // Portland
      '97301': 44.9429, // Salem
      '97401': 44.0521, // Eugene
      '97701': 44.0592, // Bend
      '97330': 44.5646, // Corvallis
    };

    return zipToLatMap[zipCode] || 44.5; // Default to OR center
  }

  private getLongitudeForZip(zipCode: string): number {
    const zipToLngMap: Record<string, number> = {
      '97201': -122.6784, // Portland
      '97301': -123.0351, // Salem
      '97401': -123.0868, // Eugene
      '97701': -121.3153, // Bend
      '97330': -123.2620, // Corvallis
    };

    return zipToLngMap[zipCode] || -122.0; // Default to OR center
  }
}

export function createOregonScraper(
  config?: Partial<ScraperConfig>
): OregonRetailerScraper {
  return new OregonRetailerScraper(config);
}
