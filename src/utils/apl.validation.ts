/**
 * APL Data Validation Utilities
 *
 * Validates APL entries before insertion into the database.
 * Ensures data quality and consistency across state sources.
 */

import {
  APLEntry,
  SizeRestriction,
  BrandRestriction,
  AdditionalRestrictions,
  ParticipantType,
  StateCode,
  APLDataSource,
} from '../types/apl.types';
import { normalizeUPC } from './upc.utils';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a complete APL entry
 *
 * @param entry - APL entry to validate
 * @returns Validation result with errors and warnings
 */
export function validateAPLEntry(entry: Partial<APLEntry>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!entry.state) {
    errors.push('State code is required');
  } else if (!isValidStateCode(entry.state)) {
    errors.push(`Invalid state code: ${entry.state}`);
  }

  if (!entry.upc) {
    errors.push('UPC is required');
  } else {
    const upcValidation = validateUPC(entry.upc);
    if (!upcValidation.valid) {
      errors.push(...upcValidation.errors);
    }
  }

  if (entry.eligible === undefined || entry.eligible === null) {
    errors.push('Eligibility status is required');
  }

  if (!entry.benefitCategory) {
    errors.push('Benefit category is required');
  } else if (entry.benefitCategory.length > 100) {
    errors.push('Benefit category exceeds maximum length (100 characters)');
  }

  if (!entry.effectiveDate) {
    errors.push('Effective date is required');
  } else if (isNaN(new Date(entry.effectiveDate).getTime())) {
    errors.push('Effective date is invalid');
  }

  if (!entry.dataSource) {
    errors.push('Data source is required');
  } else if (!isValidDataSource(entry.dataSource)) {
    errors.push(`Invalid data source: ${entry.dataSource}`);
  }

  // Date logic
  if (entry.effectiveDate && entry.expirationDate) {
    const effective = new Date(entry.effectiveDate);
    const expiration = new Date(entry.expirationDate);

    if (expiration <= effective) {
      errors.push('Expiration date must be after effective date');
    }
  }

  // Optional fields validation
  if (entry.benefitSubcategory && entry.benefitSubcategory.length > 100) {
    errors.push('Benefit subcategory exceeds maximum length (100 characters)');
  }

  if (entry.participantTypes) {
    const participantValidation = validateParticipantTypes(entry.participantTypes);
    errors.push(...participantValidation.errors);
    warnings.push(...participantValidation.warnings);
  }

  if (entry.sizeRestriction) {
    const sizeValidation = validateSizeRestriction(entry.sizeRestriction);
    errors.push(...sizeValidation.errors);
    warnings.push(...sizeValidation.warnings);
  }

  if (entry.brandRestriction) {
    const brandValidation = validateBrandRestriction(entry.brandRestriction);
    errors.push(...brandValidation.errors);
    warnings.push(...brandValidation.warnings);
  }

  if (entry.additionalRestrictions) {
    const additionalValidation = validateAdditionalRestrictions(entry.additionalRestrictions);
    warnings.push(...additionalValidation.warnings);
  }

  // Warnings
  if (!entry.verified) {
    warnings.push('Entry has not been manually verified');
  }

  if (entry.notes && entry.notes.length > 1000) {
    warnings.push('Notes field is very long (>1000 characters)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate UPC format
 */
export function validateUPC(upc: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!upc || upc.trim() === '') {
    errors.push('UPC cannot be empty');
    return { valid: false, errors, warnings };
  }

  const normalized = normalizeUPC(upc);

  if (!normalized.isValid) {
    errors.push('UPC format is invalid (must be 8-14 digits)');
  }

  if (upc.length < 8) {
    errors.push('UPC is too short (minimum 8 digits)');
  }

  if (upc.length > 14) {
    errors.push('UPC is too long (maximum 14 digits)');
  }

  // Check for non-numeric characters
  if (!/^[0-9]+$/.test(upc.replace(/[^0-9]/g, ''))) {
    warnings.push('UPC contains non-numeric characters (will be stripped)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate state code
 */
export function isValidStateCode(state: string): boolean {
  // Priority states
  const priorityStates = ['MI', 'NC', 'FL', 'OR'];

  // All US states and territories (2-letter codes)
  const allStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
  ];

  return allStates.includes(state.toUpperCase());
}

/**
 * Validate data source
 */
export function isValidDataSource(source: string): boolean {
  const validSources: APLDataSource[] = ['fis', 'conduent', 'state', 'manual', 'usda'];
  return validSources.includes(source as APLDataSource);
}

/**
 * Validate participant types
 */
export function validateParticipantTypes(types: ParticipantType[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const validTypes: ParticipantType[] = ['pregnant', 'postpartum', 'breastfeeding', 'infant', 'child'];

  if (types.length === 0) {
    warnings.push('No participant types specified (product available to all)');
  }

  for (const type of types) {
    if (!validTypes.includes(type)) {
      errors.push(`Invalid participant type: ${type}`);
    }
  }

  // Check for duplicates
  const uniqueTypes = new Set(types);
  if (uniqueTypes.size !== types.length) {
    warnings.push('Duplicate participant types detected');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate size restriction
 */
export function validateSizeRestriction(restriction: SizeRestriction): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!restriction.unit) {
    errors.push('Size unit is required');
  }

  // Check for conflicting restrictions
  if (restriction.exactSize !== undefined) {
    if (restriction.minSize !== undefined || restriction.maxSize !== undefined) {
      warnings.push('Exact size specified, min/max will be ignored');
    }

    if (restriction.exactSize <= 0) {
      errors.push('Exact size must be positive');
    }
  } else {
    // Validate min/max range
    if (restriction.minSize !== undefined && restriction.minSize < 0) {
      errors.push('Minimum size cannot be negative');
    }

    if (restriction.maxSize !== undefined && restriction.maxSize < 0) {
      errors.push('Maximum size cannot be negative');
    }

    if (restriction.minSize !== undefined && restriction.maxSize !== undefined) {
      if (restriction.minSize > restriction.maxSize) {
        errors.push('Minimum size cannot exceed maximum size');
      }

      if (restriction.minSize === restriction.maxSize) {
        warnings.push('Min and max sizes are equal, consider using exactSize instead');
      }
    }
  }

  // Validate allowed sizes
  if (restriction.allowedSizes && restriction.allowedSizes.length > 0) {
    for (const size of restriction.allowedSizes) {
      if (size <= 0) {
        errors.push(`Invalid allowed size: ${size} (must be positive)`);
      }
    }

    // Check if allowed sizes fall within min/max range
    if (restriction.minSize !== undefined || restriction.maxSize !== undefined) {
      warnings.push('Both range (min/max) and allowed sizes specified');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate brand restriction
 */
export function validateBrandRestriction(restriction: BrandRestriction): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for conflicting restrictions
  if (restriction.contractBrand) {
    if (restriction.allowedBrands && restriction.allowedBrands.length > 0) {
      warnings.push('Contract brand specified, allowed brands will be ignored');
    }

    if (restriction.excludedBrands && restriction.excludedBrands.length > 0) {
      warnings.push('Contract brand specified, excluded brands will be ignored');
    }
  }

  if (restriction.allowedBrands && restriction.excludedBrands) {
    if (restriction.allowedBrands.length > 0 && restriction.excludedBrands.length > 0) {
      errors.push('Cannot specify both allowed and excluded brands');
    }
  }

  // Validate contract dates
  if (restriction.contractStartDate && restriction.contractEndDate) {
    const start = new Date(restriction.contractStartDate);
    const end = new Date(restriction.contractEndDate);

    if (end <= start) {
      errors.push('Contract end date must be after start date');
    }
  }

  if (restriction.contractBrand && !restriction.contractStartDate) {
    warnings.push('Contract brand specified without start date');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate additional restrictions
 */
export function validateAdditionalRestrictions(restrictions: AdditionalRestrictions): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (restrictions.maxSugarGrams !== undefined && restrictions.maxSugarGrams < 0) {
    errors.push('Maximum sugar grams cannot be negative');
  }

  if (restrictions.maxSodiumMg !== undefined && restrictions.maxSodiumMg < 0) {
    errors.push('Maximum sodium mg cannot be negative');
  }

  if (restrictions.fortificationRequired && restrictions.fortificationRequired.length === 0) {
    warnings.push('Fortification required is empty array');
  }

  if (restrictions.restrictionNotes && restrictions.restrictionNotes.length > 500) {
    warnings.push('Restriction notes are very long (>500 characters)');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Sanitize APL entry for storage
 *
 * Normalizes and cleans data before database insertion.
 *
 * @param entry - Raw APL entry
 * @returns Sanitized entry
 */
export function sanitizeAPLEntry(entry: Partial<APLEntry>): Partial<APLEntry> {
  const sanitized = { ...entry };

  // Normalize UPC
  if (sanitized.upc) {
    const normalized = normalizeUPC(sanitized.upc);
    sanitized.upc = normalized.upc12; // Store as 12-digit UPC-A
  }

  // Normalize state code
  if (sanitized.state) {
    sanitized.state = sanitized.state.toUpperCase();
  }

  // Trim strings
  if (sanitized.benefitCategory) {
    sanitized.benefitCategory = sanitized.benefitCategory.trim();
  }

  if (sanitized.benefitSubcategory) {
    sanitized.benefitSubcategory = sanitized.benefitSubcategory.trim();
  }

  if (sanitized.notes) {
    sanitized.notes = sanitized.notes.trim();
  }

  // Remove duplicates from participant types
  if (sanitized.participantTypes) {
    sanitized.participantTypes = [...new Set(sanitized.participantTypes)];
  }

  // Clean brand restriction
  if (sanitized.brandRestriction) {
    if (sanitized.brandRestriction.allowedBrands) {
      sanitized.brandRestriction.allowedBrands = [
        ...new Set(sanitized.brandRestriction.allowedBrands.map((b) => b.trim())),
      ];
    }

    if (sanitized.brandRestriction.excludedBrands) {
      sanitized.brandRestriction.excludedBrands = [
        ...new Set(sanitized.brandRestriction.excludedBrands.map((b) => b.trim())),
      ];
    }

    if (sanitized.brandRestriction.contractBrand) {
      sanitized.brandRestriction.contractBrand = sanitized.brandRestriction.contractBrand.trim();
    }
  }

  return sanitized;
}
