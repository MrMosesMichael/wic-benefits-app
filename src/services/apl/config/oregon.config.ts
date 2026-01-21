/**
 * Oregon APL Configuration
 *
 * Configuration for Oregon WIC APL data source and ingestion.
 * Oregon uses a state-specific eWIC system.
 *
 * @module services/apl/config/oregon
 */

import { OregonAPLConfig } from '../oregon-ingestion.service';

/**
 * Oregon APL download URL
 *
 * IMPORTANT: This URL should be updated with the actual Oregon WIC APL data source
 * once identified. Oregon may provide:
 * - Public Excel/CSV download from state website
 * - Vendor portal access with updated lists
 * - API endpoint (less common for state systems)
 *
 * Data Source: https://www.oregon.gov/oha/ph/healthypeoplefamilies/wic/pages/index.aspx
 * Update Frequency: Monthly (public), as-needed for policy changes
 */
export const OREGON_APL_DOWNLOAD_URL =
  process.env.OREGON_APL_URL ||
  'https://www.oregon.gov/oha/ph/healthypeoplefamilies/wic/Documents/OregonWICAplList.xlsx';

/**
 * Oregon APL local file path (for testing/fallback)
 */
export const OREGON_APL_LOCAL_PATH =
  process.env.OREGON_APL_LOCAL_PATH ||
  './data/apl/oregon/oregon_apl.xlsx';

/**
 * Oregon APL sync schedule
 *
 * How often to check for updates:
 * - Daily check recommended
 * - Full refresh weekly
 * - Emergency updates on-demand
 */
export const OREGON_APL_SYNC_SCHEDULE = {
  /** Check for updates every N hours */
  checkIntervalHours: 24,

  /** Full refresh every N days */
  fullRefreshDays: 7,

  /** Retry failed syncs after N minutes */
  retryIntervalMinutes: 30,

  /** Maximum consecutive failures before alerting */
  maxConsecutiveFailures: 3,
};

/**
 * Oregon-specific policy configuration
 */
export const OREGON_POLICIES = {
  /** Oregon emphasizes organic products */
  organicPreference: true,

  /** Oregon supports local/regional producers */
  localPreference: true,

  /** Enhanced fruit/vegetable benefits */
  enhancedProduceBenefits: true,

  /** State-specific formula contract brands */
  formulaContracts: {
    // Contract brand info would go here once known
    // Updated periodically based on state contracts
  },
};

/**
 * Default Oregon APL configuration
 *
 * Use this for standard ingestion operations
 */
export const defaultOregonAPLConfig: Partial<OregonAPLConfig> = {
  downloadUrl: OREGON_APL_DOWNLOAD_URL,
  localFilePath: OREGON_APL_LOCAL_PATH,
  useLocalFile: process.env.NODE_ENV === 'development',
};

/**
 * Create Oregon APL configuration
 *
 * @param dbPool Database connection pool
 * @param overrides Configuration overrides
 * @returns Complete Oregon APL configuration
 */
export function createOregonAPLConfig(
  dbPool: any,
  overrides?: Partial<OregonAPLConfig>
): OregonAPLConfig {
  return {
    ...defaultOregonAPLConfig,
    dbPool,
    ...overrides,
  } as OregonAPLConfig;
}

/**
 * Validate Oregon APL configuration
 *
 * @param config Configuration to validate
 * @returns true if valid, throws error otherwise
 */
export function validateOregonAPLConfig(config: OregonAPLConfig): boolean {
  if (!config.downloadUrl && !config.localFilePath) {
    throw new Error('Oregon APL config must have downloadUrl or localFilePath');
  }

  if (config.useLocalFile && !config.localFilePath) {
    throw new Error('useLocalFile is true but localFilePath not specified');
  }

  if (!config.dbPool) {
    console.warn('Warning: Database pool not configured - data will not be persisted');
  }

  return true;
}
