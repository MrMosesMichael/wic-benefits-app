/**
 * North Carolina APL Configuration
 *
 * Configuration constants and environment variables for North Carolina APL ingestion.
 *
 * @module services/apl/config/north-carolina
 */

/**
 * North Carolina APL data source URLs
 */
export const NORTH_CAROLINA_APL_URLS = {
  /**
   * Official North Carolina DHHS WIC approved foods page
   * Contains link to download current APL file
   */
  OFFICIAL_PAGE: 'https://www.ncdhhs.gov/divisions/public-health/wic',

  /**
   * Direct download URL for APL file
   * Note: This URL may change - always check official page first
   */
  DOWNLOAD_URL: process.env.NORTH_CAROLINA_APL_DOWNLOAD_URL || '',

  /**
   * Vendor portal URL (requires authorization)
   */
  VENDOR_PORTAL: 'https://ncwicvendor.com',
};

/**
 * Sync schedule configuration
 */
export const NORTH_CAROLINA_SYNC_CONFIG = {
  /**
   * Cron schedule for automated sync
   * Default: Daily at 3 AM EST (North Carolina timezone)
   */
  CRON_SCHEDULE: process.env.NORTH_CAROLINA_SYNC_CRON || '0 3 * * *',

  /**
   * Timezone for cron scheduling
   */
  TIMEZONE: 'America/New_York',

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
export const NORTH_CAROLINA_VALIDATION_CONFIG = {
  /**
   * Require UPC check digit validation
   */
  VALIDATE_UPC_CHECK_DIGIT: true,

  /**
   * Require category validation
   */
  VALIDATE_CATEGORIES: true,

  /**
   * Known North Carolina WIC benefit categories
   * Conduent uses slightly different category naming
   */
  KNOWN_CATEGORIES: [
    'Cereal',
    'Milk',
    'Cheese',
    'Eggs',
    'Infant Formula',
    'Baby Food - Fruits',
    'Baby Food - Vegetables',
    'Baby Food - Meats',
    'Whole Grains',
    'Fruits and Vegetables',
    'Legumes',
    'Peanut Butter',
    'Canned Fish',
    'Juice',
    'Soy Beverage',
    'Tofu',
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
  MAX_EXPECTED_ENTRIES: 15000,
};

/**
 * Data source metadata
 */
export const NORTH_CAROLINA_METADATA = {
  STATE: 'NC',
  STATE_NAME: 'North Carolina',
  PROCESSOR: 'Conduent',
  PROCESSOR_FULL_NAME: 'Conduent State & Local Solutions',
  DATA_FORMAT: 'Excel (.xlsx) / CSV',
  UPDATE_FREQUENCY_PUBLIC: 'Monthly',
  UPDATE_FREQUENCY_VENDOR: 'Weekly',
  EFFECTIVE_DATE_DEFAULT: '2024-01-01', // Default if not specified in source
};

/**
 * Conduent-specific field mapping
 * Maps Conduent field names to internal schema
 */
export const CONDUENT_FIELD_MAPPING = {
  UPC: ['UPC/PLU', 'UPC', 'upc', 'UPC Code'],
  DESCRIPTION: ['Item Description', 'Product Name', 'Description', 'description'],
  CATEGORY: ['Food Category', 'Category', 'category'],
  SUBCATEGORY: ['Sub Category', 'Subcategory', 'subcategory'],
  SIZE: ['Container Size', 'Package Size', 'Size', 'size'],
  PARTICIPANTS: ['Eligible Participants', 'Participant Category'],
  BRAND: ['Brand', 'Brand Name'],
  BEGIN_DATE: ['Begin Date', 'Effective Date', 'Start Date'],
  END_DATE: ['End Date', 'Expiration Date', 'Expiry Date'],
  NOTES: ['Notes', 'Remarks', 'Comments'],
};

/**
 * Feature flags
 */
export const NORTH_CAROLINA_FEATURE_FLAGS = {
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
   * Support CSV format as fallback
   */
  ENABLE_CSV_FALLBACK: true,

  /**
   * Send notifications on sync events
   */
  ENABLE_NOTIFICATIONS: false, // TODO: Enable when notification system ready
};

/**
 * Get North Carolina APL configuration from environment
 */
export function getNorthCarolinaAPLConfig() {
  return {
    downloadUrl: process.env.NORTH_CAROLINA_APL_DOWNLOAD_URL || NORTH_CAROLINA_APL_URLS.DOWNLOAD_URL,
    cronSchedule: process.env.NORTH_CAROLINA_SYNC_CRON || NORTH_CAROLINA_SYNC_CONFIG.CRON_SCHEDULE,
    timezone: NORTH_CAROLINA_SYNC_CONFIG.TIMEZONE,
    validateCheckDigit: NORTH_CAROLINA_VALIDATION_CONFIG.VALIDATE_UPC_CHECK_DIGIT,
    enableChangeDetection: NORTH_CAROLINA_FEATURE_FLAGS.ENABLE_CHANGE_DETECTION,
    enableNotifications: NORTH_CAROLINA_FEATURE_FLAGS.ENABLE_NOTIFICATIONS,
    enableCsvFallback: NORTH_CAROLINA_FEATURE_FLAGS.ENABLE_CSV_FALLBACK,
  };
}

/**
 * Validate North Carolina configuration
 */
export function validateNorthCarolinaConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.NORTH_CAROLINA_APL_DOWNLOAD_URL && !NORTH_CAROLINA_APL_URLS.DOWNLOAD_URL) {
    errors.push('NORTH_CAROLINA_APL_DOWNLOAD_URL not set in environment');
  }

  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL not set in environment');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
