/**
 * Web Scraper Configuration for WIC Retailer Data
 *
 * Configuration for scraping WIC-authorized retailer lists from state websites
 */

import { ScraperConfig, StateCode } from '../types/retailer.types';

/**
 * Base user agent for all scrapers
 * Identifies as a public benefit tool collecting public data
 */
const BASE_USER_AGENT =
  'WICBenefitsAssistant/1.0 (Public Benefit Tool; +https://github.com/MrMosesMichael/wic-benefits-app)';

/**
 * Default scraper settings
 */
const DEFAULT_CONFIG = {
  maxRetries: 3,
  requestDelayMs: 1000, // 1 second between requests (respectful rate limiting)
  timeout: 30000, // 30 second timeout
  userAgent: BASE_USER_AGENT,
};

/**
 * Michigan WIC Retailer Scraper Configuration
 *
 * Michigan uses FIS as processor. Vendor data available via web locator.
 */
export const MICHIGAN_SCRAPER_CONFIG: ScraperConfig = {
  ...DEFAULT_CONFIG,
  state: 'MI',
  baseUrl: 'https://www.michigan.gov/mdhhs',
  searchEndpoint:
    '/assistance-programs/wic/find-a-wic-office', // May need to find actual vendor search endpoint
  headers: {
    Accept: 'application/json, text/html, */*',
    'Accept-Language': 'en-US,en;q=0.9',
  },
};

/**
 * North Carolina WIC Retailer Scraper Configuration
 *
 * NC uses Conduent (Bnft) as processor. Vendor search available on DHHS site.
 */
export const NORTH_CAROLINA_SCRAPER_CONFIG: ScraperConfig = {
  ...DEFAULT_CONFIG,
  state: 'NC',
  baseUrl: 'https://www.ncdhhs.gov',
  searchEndpoint: '/assistance/nutritional-services/wic',
  headers: {
    Accept: 'application/json, text/html, */*',
    'Accept-Language': 'en-US,en;q=0.9',
  },
};

/**
 * Florida WIC Retailer Scraper Configuration
 *
 * Florida uses FIS as processor (similar to Michigan)
 */
export const FLORIDA_SCRAPER_CONFIG: ScraperConfig = {
  ...DEFAULT_CONFIG,
  state: 'FL',
  baseUrl: 'https://www.floridahealth.gov',
  searchEndpoint: '/programs-and-services/wic/',
  headers: {
    Accept: 'application/json, text/html, */*',
    'Accept-Language': 'en-US,en;q=0.9',
  },
};

/**
 * Oregon WIC Retailer Scraper Configuration
 *
 * Oregon operates independent state system (not FIS or Conduent)
 */
export const OREGON_SCRAPER_CONFIG: ScraperConfig = {
  ...DEFAULT_CONFIG,
  state: 'OR',
  baseUrl: 'https://www.oregon.gov/oha',
  searchEndpoint: '/PH/HEALTHYPEOPLEFAMILIES/WIC/Pages/index.aspx',
  headers: {
    Accept: 'application/json, text/html, */*',
    'Accept-Language': 'en-US,en;q=0.9',
  },
};

/**
 * Get scraper configuration for a specific state
 */
export function getScraperConfig(state: StateCode): ScraperConfig {
  switch (state) {
    case 'MI':
      return MICHIGAN_SCRAPER_CONFIG;
    case 'NC':
      return NORTH_CAROLINA_SCRAPER_CONFIG;
    case 'FL':
      return FLORIDA_SCRAPER_CONFIG;
    case 'OR':
      return OREGON_SCRAPER_CONFIG;
    default:
      throw new Error(`Scraper configuration not found for state: ${state}`);
  }
}

/**
 * Get all configured states
 */
export function getConfiguredStates(): StateCode[] {
  return ['MI', 'NC', 'FL', 'OR'];
}

/**
 * Validate scraper configuration
 */
export function validateScraperConfig(config: ScraperConfig): boolean {
  if (!config.state || !config.baseUrl) {
    return false;
  }

  if (config.maxRetries < 0 || config.requestDelayMs < 0 || config.timeout < 0) {
    return false;
  }

  return true;
}
