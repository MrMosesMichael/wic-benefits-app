/**
 * Michigan APL Configuration
 *
 * Configuration constants and environment variables for Michigan APL ingestion.
 *
 * @module services/apl/config/michigan
 */

/**
 * Michigan APL data source URLs
 */
export const MICHIGAN_APL_URLS = {
  /**
   * Official Michigan DHHS WIC approved foods page
   * Contains link to download current APL Excel file
   */
  OFFICIAL_PAGE: 'https://www.michigan.gov/mdhhs/assistance-programs/wic/wicvendors/wic-foods',

  /**
   * Direct download URL for APL Excel file
   * Note: This URL may change - always check official page first
   */
  DOWNLOAD_URL: process.env.MICHIGAN_APL_DOWNLOAD_URL || '',

  /**
   * Vendor portal URL (requires authorization)
   */
  VENDOR_PORTAL: 'https://vendor.michigan.gov/wic',
};

/**
 * Sync schedule configuration
 */
export const MICHIGAN_SYNC_CONFIG = {
  /**
   * Cron schedule for automated sync
   * Default: Daily at 2 AM EST (Michigan timezone)
   */
  CRON_SCHEDULE: process.env.MICHIGAN_SYNC_CRON || '0 2 * * *',

  /**
   * Timezone for cron scheduling
   */
  TIMEZONE: 'America/Detroit',

  /**
   * Retry configuration
   */
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5000, // 5 seconds

  /**
   * Timeout for download (milliseconds)
   */
  DOWNLOAD_TIMEOUT_MS: 60000, // 60 seconds

  /**
   * Alert thresholds
   */
  ALERT_AFTER_CONSECUTIVE_FAILURES: 3,
  ALERT_IF_NO_UPDATE_DAYS: 7,
};

/**
 * Data validation configuration
 */
export const MICHIGAN_VALIDATION_CONFIG = {
  /**
   * Require UPC check digit validation
   */
  VALIDATE_UPC_CHECK_DIGIT: true,

  /**
   * Require category validation
   */
  VALIDATE_CATEGORIES: true,

  /**
   * Known Michigan WIC benefit categories
   */
  KNOWN_CATEGORIES: [
    'Cereal',
    'Milk',
    'Cheese',
    'Eggs',
    'Infant Formula',
    'Baby Food',
    'Whole Grains',
    'Fruits and Vegetables',
    'Legumes',
    'Peanut Butter',
    'Canned Fish',
    'Juice',
  ],

  /**
   * Minimum expected entries per sync
   * Alert if fewer entries than this
   */
  MIN_EXPECTED_ENTRIES: 100,

  /**
   * Maximum expected entries per sync
   * Alert if more entries than this (possible parsing error)
   */
  MAX_EXPECTED_ENTRIES: 10000,
};

/**
 * Data source metadata
 */
export const MICHIGAN_METADATA = {
  STATE: 'MI',
  STATE_NAME: 'Michigan',
  PROCESSOR: 'FIS',
  PROCESSOR_FULL_NAME: 'FIS / Custom Data Processing (CDP)',
  DATA_FORMAT: 'Excel (.xlsx)',
  UPDATE_FREQUENCY_PUBLIC: 'Monthly',
  UPDATE_FREQUENCY_VENDOR: 'Daily',
  EFFECTIVE_DATE_DEFAULT: '2024-01-01', // Default if not specified in source
};

/**
 * Feature flags
 */
export const MICHIGAN_FEATURE_FLAGS = {
  /**
   * Enable automatic expiration of old entries
   */
  AUTO_EXPIRE_OLD_ENTRIES: true,

  /**
   * Enable change detection and logging
   */
  ENABLE_CHANGE_DETECTION: true,

  /**
   * Enable UPC variant matching
   */
  ENABLE_UPC_VARIANTS: true,

  /**
   * Enable file hash comparison
   */
  ENABLE_FILE_HASH_CHECK: true,

  /**
   * Send notifications on sync events
   */
  ENABLE_NOTIFICATIONS: false, // TODO: Enable when notification system ready
};

/**
 * Get Michigan APL configuration from environment
 */
export function getMichiganAPLConfig() {
  return {
    downloadUrl: process.env.MICHIGAN_APL_DOWNLOAD_URL || MICHIGAN_APL_URLS.DOWNLOAD_URL,
    cronSchedule: process.env.MICHIGAN_SYNC_CRON || MICHIGAN_SYNC_CONFIG.CRON_SCHEDULE,
    timezone: MICHIGAN_SYNC_CONFIG.TIMEZONE,
    validateCheckDigit: MICHIGAN_VALIDATION_CONFIG.VALIDATE_UPC_CHECK_DIGIT,
    enableChangeDetection: MICHIGAN_FEATURE_FLAGS.ENABLE_CHANGE_DETECTION,
    enableNotifications: MICHIGAN_FEATURE_FLAGS.ENABLE_NOTIFICATIONS,
  };
}

/**
 * Validate Michigan configuration
 */
export function validateMichiganConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.MICHIGAN_APL_DOWNLOAD_URL && !MICHIGAN_APL_URLS.DOWNLOAD_URL) {
    errors.push('MICHIGAN_APL_DOWNLOAD_URL not set in environment');
  }

  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL not set in environment');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
