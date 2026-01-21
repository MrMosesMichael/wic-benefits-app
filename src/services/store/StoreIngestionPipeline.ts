/**
 * Store Data Ingestion Pipeline (A3.3)
 *
 * Coordinates the flow of store data from raw sources → normalization → database storage
 * Integrates A3.1 (retailer scrapers) with A3.2 (database schema)
 */

import { RetailerDataService } from '../retailer/RetailerDataService';
import { StoreRepository } from '../../database/StoreRepository';
import {
  NormalizedRetailerData,
  StateCode,
  ScrapingResult
} from '../retailer/types/retailer.types';
import { Store } from '../../types/store.types';

export interface IngestionResult {
  totalScraped: number;
  totalNormalized: number;
  totalInserted: number;
  totalUpdated: number;
  totalErrors: number;
  stateResults: StateIngestionResult[];
  durationMs: number;
  completedAt: string;
}

export interface StateIngestionResult {
  state: StateCode;
  success: boolean;
  scraped: number;
  normalized: number;
  inserted: number;
  updated: number;
  errors: string[];
}

export interface IngestionOptions {
  states?: StateCode[];
  skipGeovalidation?: boolean;
  batchSize?: number;
  dryRun?: boolean;
}

export class StoreIngestionPipeline {
  private retailerService: RetailerDataService;
  private storeRepository: StoreRepository;

  constructor(storeRepository?: StoreRepository) {
    this.retailerService = new RetailerDataService();
    this.storeRepository = storeRepository || new StoreRepository();
  }

  /**
   * Run full ingestion pipeline: scrape → normalize → store
   */
  async ingest(options: IngestionOptions = {}): Promise<IngestionResult> {
    const startTime = Date.now();
    const states = options.states || ['MI', 'NC', 'FL', 'OR'];
    const stateResults: StateIngestionResult[] = [];

    console.log(`[StoreIngestionPipeline] Starting ingestion for states: ${states.join(', ')}`);

    // Step 1: Scrape data from all states
    console.log('[StoreIngestionPipeline] Step 1: Scraping state retailer data...');
    const scrapingResults = await this.scrapeStates(states);

    // Step 2: Normalize and ingest for each state
    for (const scrapeResult of scrapingResults) {
      const stateResult = await this.ingestState(scrapeResult, options);
      stateResults.push(stateResult);
    }

    const durationMs = Date.now() - startTime;

    // Aggregate results
    const result: IngestionResult = {
      totalScraped: stateResults.reduce((sum, r) => sum + r.scraped, 0),
      totalNormalized: stateResults.reduce((sum, r) => sum + r.normalized, 0),
      totalInserted: stateResults.reduce((sum, r) => sum + r.inserted, 0),
      totalUpdated: stateResults.reduce((sum, r) => sum + r.updated, 0),
      totalErrors: stateResults.reduce((sum, r) => sum + r.errors.length, 0),
      stateResults,
      durationMs,
      completedAt: new Date().toISOString(),
    };

    this.logSummary(result);
    return result;
  }

  /**
   * Scrape data from specified states
   */
  private async scrapeStates(states: StateCode[]): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];

    for (const state of states) {
      console.log(`[StoreIngestionPipeline] Scraping ${state}...`);
      const result = await this.retailerService.scrapeState(state);
      results.push(result);

      if (!result.success) {
        console.error(`[StoreIngestionPipeline] Failed to scrape ${state}:`, result.errors);
      }
    }

    return results;
  }

  /**
   * Ingest scraped data for a single state
   */
  private async ingestState(
    scrapeResult: ScrapingResult,
    options: IngestionOptions
  ): Promise<StateIngestionResult> {
    const { state, data: rawData, success: scrapeSuccess } = scrapeResult;
    const errors: string[] = [];

    let normalized = 0;
    let inserted = 0;
    let updated = 0;

    if (!scrapeSuccess || rawData.length === 0) {
      errors.push(`Scraping failed or returned no data for ${state}`);
      return { state, success: false, scraped: 0, normalized, inserted, updated, errors };
    }

    try {
      // Step 2a: Normalize raw data
      console.log(`[StoreIngestionPipeline] Normalizing ${rawData.length} records for ${state}...`);
      const normalizedData = await this.retailerService.normalizeData(rawData);
      normalized = normalizedData.length;

      if (options.dryRun) {
        console.log(`[StoreIngestionPipeline] DRY RUN: Would insert ${normalized} stores for ${state}`);
        return {
          state,
          success: true,
          scraped: rawData.length,
          normalized,
          inserted: 0,
          updated: 0,
          errors: [],
        };
      }

      // Step 2b: Convert to Store entities and save
      const stores = this.convertToStores(normalizedData);

      // Step 2c: Batch insert/update stores
      const batchSize = options.batchSize || 50;
      for (let i = 0; i < stores.length; i += batchSize) {
        const batch = stores.slice(i, i + batchSize);

        for (const store of batch) {
          try {
            const result = await this.upsertStore(store);
            if (result.inserted) {
              inserted++;
            } else if (result.updated) {
              updated++;
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            errors.push(`Failed to upsert store ${store.name}: ${errorMsg}`);
            console.error(`[StoreIngestionPipeline] Error upserting store:`, errorMsg);
          }
        }

        console.log(
          `[StoreIngestionPipeline] ${state}: Processed batch ${Math.floor(i / batchSize) + 1} ` +
          `(${i + batch.length}/${stores.length})`
        );
      }

      return {
        state,
        success: true,
        scraped: rawData.length,
        normalized,
        inserted,
        updated,
        errors,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Pipeline error for ${state}: ${errorMsg}`);
      console.error(`[StoreIngestionPipeline] Error processing ${state}:`, errorMsg);

      return {
        state,
        success: false,
        scraped: rawData.length,
        normalized,
        inserted,
        updated,
        errors,
      };
    }
  }

  /**
   * Convert normalized retailer data to Store entities
   */
  private convertToStores(normalizedData: NormalizedRetailerData[]): Store[] {
    return normalizedData.map(retailer => this.convertToStore(retailer));
  }

  /**
   * Convert a single normalized retailer to Store entity
   */
  private convertToStore(retailer: NormalizedRetailerData): Store {
    // Map chain name to store_chain enum
    const chain = this.mapChainName(retailer.chainName);

    // Parse operating hours if available
    const hours = retailer.operatingHours
      ? this.parseOperatingHours(retailer.operatingHours)
      : [];

    return {
      id: '', // Will be generated by database
      name: retailer.name,
      chain,
      chainId: retailer.chainId,
      address: {
        street: retailer.address,
        street2: retailer.address2,
        city: retailer.city,
        state: retailer.state,
        zip: retailer.zip,
        country: 'USA',
      },
      location: {
        lat: retailer.latitude,
        lng: retailer.longitude,
      },
      wicAuthorized: retailer.wicAuthorized,
      wicVendorId: retailer.wicVendorId,
      phone: retailer.phone,
      hours,
      holidayHours: [],
      timezone: this.getTimezoneForState(retailer.state),
      features: this.mapStoreFeatures(retailer),
      inventoryApiAvailable: false, // Will be set by inventory integration tasks
      inventoryApiType: undefined,
      wifiNetworks: [],
      beacons: [],
      lastVerified: new Date(),
      dataSource: this.mapDataSource(retailer.source),
      active: true,
    };
  }

  /**
   * Upsert store to database (insert or update if exists)
   */
  private async upsertStore(store: Store): Promise<{ inserted: boolean; updated: boolean }> {
    // Check if store already exists (by name + address + zip)
    const existingStores = await this.storeRepository.getStoresByState(store.address.state);
    const existing = existingStores.find(
      s =>
        s.name === store.name &&
        s.address.street === store.address.street &&
        s.address.zip === store.address.zip
    );

    if (existing) {
      // Update existing store
      await this.storeRepository.updateStore(existing.id, {
        phone: store.phone || existing.phone,
        wicVendorId: store.wicVendorId || existing.wicVendorId,
        location: store.location,
        lastVerified: new Date(),
      });
      return { inserted: false, updated: true };
    } else {
      // Insert new store
      await this.storeRepository.createStore(store);
      return { inserted: true, updated: false };
    }
  }

  /**
   * Map retailer chain name to store_chain enum
   */
  private mapChainName(chainName?: string): string {
    if (!chainName) return 'independent';

    const normalized = chainName.toLowerCase();

    if (normalized.includes('walmart')) return 'walmart';
    if (normalized.includes('target')) return 'target';
    if (normalized.includes('kroger')) return 'kroger';
    if (normalized.includes('safeway')) return 'safeway';
    if (normalized.includes('whole foods')) return 'whole_foods';
    if (normalized.includes('cvs')) return 'cvs';
    if (normalized.includes('walgreens')) return 'walgreens';
    if (normalized.includes('publix')) return 'publix';
    if (normalized.includes('giant eagle')) return 'giant_eagle';
    if (normalized.includes('meijer')) return 'regional'; // Meijer is regional to MI

    // Check if it's a known regional chain
    const regionalChains = ['meijer', 'heb', 'wegmans', 'hy-vee', 'food lion', 'harris teeter'];
    if (regionalChains.some(chain => normalized.includes(chain))) {
      return 'regional';
    }

    return 'independent';
  }

  /**
   * Map store features from normalized data
   */
  private mapStoreFeatures(retailer: NormalizedRetailerData) {
    const storeType = retailer.storeType?.toLowerCase() || '';

    return {
      hasPharmacy: storeType.includes('pharmacy') || retailer.services?.includes('pharmacy'),
      hasDeliCounter: storeType.includes('grocery') || storeType.includes('supercenter'),
      hasBakery: storeType.includes('grocery') || storeType.includes('supercenter'),
      acceptsEbt: true, // Most WIC stores also accept EBT
      acceptsWic: retailer.wicAuthorized,
      hasWicKiosk: false, // Unknown from scraper data
    };
  }

  /**
   * Map data source from scraper to database enum
   */
  private mapDataSource(source: string): 'api' | 'scrape' | 'crowdsourced' | 'manual' {
    if (source.includes('web') || source.includes('scrape')) {
      return 'scrape';
    }
    if (source.includes('api')) {
      return 'api';
    }
    if (source.includes('request')) {
      return 'manual';
    }
    return 'scrape';
  }

  /**
   * Get timezone for state
   */
  private getTimezoneForState(state: string): string {
    const timezones: Record<string, string> = {
      MI: 'America/Detroit',
      NC: 'America/New_York',
      FL: 'America/New_York', // Most of FL is Eastern
      OR: 'America/Los_Angeles',
    };
    return timezones[state] || 'America/New_York';
  }

  /**
   * Parse operating hours string to structured format
   */
  private parseOperatingHours(hoursString?: string) {
    // Placeholder - operating hours parsing is complex
    // Will be enhanced in A3.4 with Google Places enrichment
    return [];
  }

  /**
   * Log summary of ingestion results
   */
  private logSummary(result: IngestionResult): void {
    console.log('\n========================================');
    console.log('Store Ingestion Pipeline - Summary');
    console.log('========================================');
    console.log(`Total Scraped:    ${result.totalScraped}`);
    console.log(`Total Normalized: ${result.totalNormalized}`);
    console.log(`Total Inserted:   ${result.totalInserted}`);
    console.log(`Total Updated:    ${result.totalUpdated}`);
    console.log(`Total Errors:     ${result.totalErrors}`);
    console.log(`Duration:         ${(result.durationMs / 1000).toFixed(2)}s`);
    console.log(`Completed At:     ${result.completedAt}`);
    console.log('========================================');

    console.log('\nState-by-State Results:');
    for (const stateResult of result.stateResults) {
      console.log(`\n${stateResult.state}:`);
      console.log(`  Success:    ${stateResult.success}`);
      console.log(`  Scraped:    ${stateResult.scraped}`);
      console.log(`  Normalized: ${stateResult.normalized}`);
      console.log(`  Inserted:   ${stateResult.inserted}`);
      console.log(`  Updated:    ${stateResult.updated}`);
      if (stateResult.errors.length > 0) {
        console.log(`  Errors:     ${stateResult.errors.length}`);
        stateResult.errors.forEach(err => console.log(`    - ${err}`));
      }
    }
    console.log('\n========================================\n');
  }
}
