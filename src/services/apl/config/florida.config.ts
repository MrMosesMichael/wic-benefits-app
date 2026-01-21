/**
 * Florida APL Configuration
 *
 * Configuration for Florida WIC APL data ingestion.
 * Florida uses FIS as eWIC processor (same as Michigan).
 *
 * IMPORTANT NOTES:
 * - Florida banned artificial food dyes effective Oct 2025
 * - New infant formula contract effective Feb 1, 2026
 * - Phased policy rollout: Oct 2025 - Mar 2026
 *
 * @module services/apl/config/florida
 */

import { FloridaAPLConfig } from '../florida-ingestion.service';

/**
 * Official Florida APL data source URLs
 */
export const FLORIDA_APL_URLS = {
  /**
   * Florida WIC Foods page (contains links to APL files)
   * https://www.floridahealth.gov/programs-and-services/wic/wic-foods.html
   */
  mainPage: 'https://www.floridahealth.gov/programs-and-services/wic/wic-foods.html',

  /**
   * Florida WIC Foods List (PDF) - English
   * This is the most current published APL as of Oct 2025
   */
  foodListPdf: 'https://www.floridahealth.gov/PROGRAMS-AND-SERVICES/wic/_documents/fl-wic-foods-eng.pdf',

  /**
   * Florida WIC Foods Changes (PDF) - What changed in Oct 2025
   */
  changesDoc: 'https://www.floridahealth.gov/programs-and-services/wic/_documents/fl-wic-foods-changes.pdf',

  /**
   * Vendor Information Page
   * May contain Excel/CSV exports for vendors (requires vendor authorization)
   */
  vendorPage: 'https://www.floridahealth.gov/programs-and-services/wic/vendors/index.html',

  /**
   * Placeholder for Excel/CSV export if available
   * Check vendor portal for structured data files
   */
  excelExport: null as string | null,
};

/**
 * Florida-specific policy dates
 */
export const FLORIDA_POLICY_DATES = {
  /**
   * Artificial dye ban effective date
   */
  artificialDyeBanDate: new Date('2025-10-01'),

  /**
   * New food package assignments begin (phased rollout)
   */
  phasedRolloutStart: new Date('2025-10-01'),

  /**
   * Phased rollout completion
   */
  phasedRolloutEnd: new Date('2026-03-31'),

  /**
   * Old infant formula contract end date
   */
  oldFormulaContractEnd: new Date('2026-01-31'),

  /**
   * New infant formula contract effective date
   */
  newFormulaContractStart: new Date('2026-02-01'),
};

/**
 * Default configuration for Florida APL ingestion
 */
export const defaultFloridaConfig: Partial<FloridaAPLConfig> = {
  /**
   * Primary download URL
   * NOTE: This is PDF by default. Replace with Excel URL if available from vendor portal.
   */
  downloadUrl: FLORIDA_APL_URLS.foodListPdf,

  /**
   * Formula contract effective date
   */
  formulaContractEffectiveDate: FLORIDA_POLICY_DATES.newFormulaContractStart,

  /**
   * Use local file for testing/development
   */
  useLocalFile: false,
};

/**
 * Configuration for testing with local file
 */
export function getFloridaTestConfig(localFilePath: string): FloridaAPLConfig {
  return {
    downloadUrl: FLORIDA_APL_URLS.foodListPdf,
    localFilePath,
    useLocalFile: true,
    formulaContractEffectiveDate: FLORIDA_POLICY_DATES.newFormulaContractStart,
  };
}

/**
 * Configuration for production with database
 */
export function getFloridaProductionConfig(dbPool: any): FloridaAPLConfig {
  return {
    downloadUrl: FLORIDA_APL_URLS.excelExport || FLORIDA_APL_URLS.foodListPdf,
    useLocalFile: false,
    dbPool,
    formulaContractEffectiveDate: FLORIDA_POLICY_DATES.newFormulaContractStart,
  };
}

/**
 * Florida-specific product categories
 *
 * These categories align with Florida's WIC food packages
 * and reflect the Oct 2025 policy changes.
 */
export const FLORIDA_BENEFIT_CATEGORIES = {
  // Infant Foods
  INFANT_FORMULA: 'Infant Formula',
  INFANT_CEREAL: 'Infant Cereal',
  INFANT_FRUITS_VEGETABLES: 'Infant Fruits & Vegetables',
  INFANT_MEAT: 'Infant Meat',

  // Dairy
  MILK: 'Milk',
  CHEESE: 'Cheese',
  YOGURT: 'Yogurt',
  TOFU: 'Tofu',

  // Grains
  BREAKFAST_CEREAL: 'Breakfast Cereal',
  WHOLE_WHEAT_BREAD: 'Whole Wheat Bread',
  WHOLE_GRAIN_BREAD: 'Whole Grain Bread',
  BROWN_RICE: 'Brown Rice',
  SOFT_CORN_TORTILLAS: 'Soft Corn Tortillas',
  WHOLE_WHEAT_TORTILLAS: 'Whole Wheat Tortillas',

  // Proteins
  EGGS: 'Eggs',
  PEANUT_BUTTER: 'Peanut Butter',
  DRIED_BEANS: 'Dried Beans/Peas',
  CANNED_FISH: 'Canned Fish',

  // Fruits & Vegetables
  FRESH_FRUITS: 'Fresh Fruits',
  FRESH_VEGETABLES: 'Fresh Vegetables',
  CANNED_FRUITS: 'Canned Fruits',
  CANNED_VEGETABLES: 'Canned Vegetables',
  FROZEN_FRUITS: 'Frozen Fruits',
  FROZEN_VEGETABLES: 'Frozen Vegetables',

  // Juice
  JUICE: '100% Juice',

  // Special Items
  MEDICAL_FOODS: 'Medical Foods',
};

/**
 * Florida formula contract brands
 *
 * IMPORTANT: These change based on contract periods.
 * Update when new contracts are awarded.
 */
export const FLORIDA_FORMULA_CONTRACTS = {
  /**
   * Old contract (through Jan 31, 2026)
   * Update based on actual contract
   */
  oldContract: {
    startDate: new Date('2023-02-01'),
    endDate: FLORIDA_POLICY_DATES.oldFormulaContractEnd,
    primaryBrand: 'Unknown', // Update with actual brand
    alternativeBrands: [] as string[],
  },

  /**
   * New contract (effective Feb 1, 2026)
   * Update when contract details are published
   */
  newContract: {
    startDate: FLORIDA_POLICY_DATES.newFormulaContractStart,
    endDate: null, // Unknown until next contract
    primaryBrand: 'Unknown', // Update with actual brand
    alternativeBrands: [] as string[],
  },
};

/**
 * Minimum inventory requirements for Florida WIC vendors
 *
 * Florida requires WIC-authorized stores to maintain minimum inventory
 * of WIC-approved products.
 */
export const FLORIDA_VENDOR_MIN_INVENTORY = {
  MILK: 'Multiple sizes and fat levels',
  EGGS: 'One dozen size',
  CHEESE: 'Multiple varieties',
  JUICE: 'Multiple 100% juice types',
  CEREAL: 'Multiple whole grain cereals',
  BREAD: 'Whole wheat or whole grain',
  PEANUT_BUTTER: 'Standard sizes',
  BEANS: 'Dried or canned',
  INFANT_FORMULA: 'Contract brand (all forms)',
  INFANT_CEREAL: 'Multiple varieties',
  INFANT_FOOD: 'Fruits, vegetables, meats',
};

/**
 * Sync schedule recommendations for Florida
 *
 * During phased rollout (Oct 2025 - Mar 2026): Daily sync
 * After rollout stabilizes: Weekly sync
 */
export function getFloridaSyncSchedule(): 'daily' | 'weekly' {
  const now = new Date();
  const isInPhasedRollout =
    now >= FLORIDA_POLICY_DATES.phasedRolloutStart &&
    now <= FLORIDA_POLICY_DATES.phasedRolloutEnd;

  return isInPhasedRollout ? 'daily' : 'weekly';
}

/**
 * Helper to check if artificial dye ban is in effect
 */
export function isArtificialDyeBanActive(): boolean {
  return new Date() >= FLORIDA_POLICY_DATES.artificialDyeBanDate;
}

/**
 * Helper to get current formula contract brand
 */
export function getCurrentFormulaContract(): typeof FLORIDA_FORMULA_CONTRACTS.newContract {
  const now = new Date();

  if (now < FLORIDA_POLICY_DATES.newFormulaContractStart) {
    return FLORIDA_FORMULA_CONTRACTS.oldContract;
  }

  return FLORIDA_FORMULA_CONTRACTS.newContract;
}
