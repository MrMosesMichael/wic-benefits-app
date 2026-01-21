/**
 * Florida WIC Retailer Scraper
 *
 * Scrapes WIC-authorized retailer data from Florida Health website
 * Florida uses FIS as eWIC processor (similar to Michigan)
 */

import axios, { AxiosInstance } from 'axios';
import {
  IStateScraper,
  WICRetailerRawData,
  ScraperConfig,
  StateCode,
} from '../types/retailer.types';
import { FLORIDA_SCRAPER_CONFIG } from '../config/scraper.config';

export class FloridaRetailerScraper implements IStateScraper {
  public readonly state: StateCode = 'FL';
  public readonly config: ScraperConfig;
  private httpClient: AxiosInstance;

  constructor(config?: Partial<ScraperConfig>) {
    this.config = { ...FLORIDA_SCRAPER_CONFIG, ...config };
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
   * Scrape all WIC retailers in Florida
   */
  async scrapeAll(): Promise<WICRetailerRawData[]> {
    try {
      console.log('[FloridaScraper] Starting scrape of all Florida WIC retailers');

      const allRetailers: WICRetailerRawData[] = [];

      // Sample: Major Florida cities
      const majorCityZips = [
        '33101', // Miami
        '32801', // Orlando
        '33602', // Tampa
        '32202', // Jacksonville
        '33301', // Fort Lauderdale
        '33401', // West Palm Beach
      ];

      for (const zip of majorCityZips) {
        await this.delay(this.config.requestDelayMs);
        const retailers = await this.scrapeByZip(zip);
        allRetailers.push(...retailers);
      }

      console.log(
        `[FloridaScraper] Scrape complete: ${allRetailers.length} retailers found`
      );

      return allRetailers;
    } catch (error) {
      console.error('[FloridaScraper] Error scraping Florida retailers:', error);
      throw error;
    }
  }

  /**
   * Scrape WIC retailers by zip code
   */
  async scrapeByZip(zipCode: string): Promise<WICRetailerRawData[]> {
    try {
      console.log(`[FloridaScraper] Scraping retailers for zip: ${zipCode}`);

      // TODO: Implement actual scraping logic for Florida vendor locator
      // Note: Florida may have WICShopper app data that could be extracted

      // Placeholder mock data
      const mockData: WICRetailerRawData[] = [
        {
          state: 'FL',
          source: 'florida_web',
          scrapedAt: new Date().toISOString(),
          processorType: 'fis',

          vendorName: 'Publix Super Market',
          wicVendorId: 'FL-11223',

          address: '789 Palm Blvd',
          city: this.getCityForZip(zipCode),
          stateCode: 'FL',
          zip: zipCode,

          phone: '(555) 345-6789',

          storeType: 'grocery',
          services: ['formula', 'fresh_produce', 'deli', 'bakery', 'pharmacy'],

          latitude: this.getLatitudeForZip(zipCode),
          longitude: this.getLongitudeForZip(zipCode),

          chainName: 'Publix',
        },
      ];

      return mockData;
    } catch (error) {
      console.error(`[FloridaScraper] Error scraping zip ${zipCode}:`, error);
      return [];
    }
  }

  async validate(): Promise<boolean> {
    try {
      console.log('[FloridaScraper] Validating scraper...');

      const testResults = await this.scrapeByZip('33101'); // Miami

      if (testResults.length === 0) {
        console.warn('[FloridaScraper] Validation warning: No results returned');
        return true;
      }

      const firstResult = testResults[0];
      const hasRequiredFields: boolean =
        !!(firstResult.vendorName &&
        firstResult.address &&
        firstResult.city &&
        firstResult.zip);

      console.log(`[FloridaScraper] Validation ${hasRequiredFields ? 'passed' : 'failed'}`);
      return hasRequiredFields;
    } catch (error) {
      console.error('[FloridaScraper] Validation failed:', error);
      return false;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getCityForZip(zipCode: string): string {
    const zipToCityMap: Record<string, string> = {
      '33101': 'Miami',
      '32801': 'Orlando',
      '33602': 'Tampa',
      '32202': 'Jacksonville',
      '33301': 'Fort Lauderdale',
      '33401': 'West Palm Beach',
    };

    return zipToCityMap[zipCode] || 'Unknown City';
  }

  private getLatitudeForZip(zipCode: string): number {
    const zipToLatMap: Record<string, number> = {
      '33101': 25.7617, // Miami
      '32801': 28.5421, // Orlando
      '33602': 27.9506, // Tampa
      '32202': 30.3322, // Jacksonville
      '33301': 26.1223, // Fort Lauderdale
      '33401': 26.7153, // West Palm Beach
    };

    return zipToLatMap[zipCode] || 27.5; // Default to FL center
  }

  private getLongitudeForZip(zipCode: string): number {
    const zipToLngMap: Record<string, number> = {
      '33101': -80.1918, // Miami
      '32801': -81.3723, // Orlando
      '33602': -82.4572, // Tampa
      '32202': -81.6557, // Jacksonville
      '33301': -80.1496, // Fort Lauderdale
      '33401': -80.0534, // West Palm Beach
    };

    return zipToLngMap[zipCode] || -81.5; // Default to FL center
  }
}

export function createFloridaScraper(
  config?: Partial<ScraperConfig>
): FloridaRetailerScraper {
  return new FloridaRetailerScraper(config);
}
