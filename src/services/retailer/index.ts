/**
 * WIC Retailer Data Service - Public API
 *
 * Export main service and types for WIC retailer data sourcing
 */

// Main service
export { RetailerDataService, createRetailerDataService } from './RetailerDataService';

// Types
export * from './types/retailer.types';

// Individual scrapers (for advanced use)
export { MichiganRetailerScraper, createMichiganScraper } from './scrapers/MichiganRetailerScraper';
export {
  NorthCarolinaRetailerScraper,
  createNorthCarolinaScraper,
} from './scrapers/NorthCarolinaRetailerScraper';
export { FloridaRetailerScraper, createFloridaScraper } from './scrapers/FloridaRetailerScraper';
export { OregonRetailerScraper, createOregonScraper } from './scrapers/OregonRetailerScraper';

// Utilities
export * from './utils/normalization.utils';

// Configuration
export * from './config/scraper.config';
