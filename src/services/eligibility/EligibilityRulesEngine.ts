/**
 * State Eligibility Rules Engine
 *
 * Core engine for evaluating WIC product eligibility across states.
 * Applies state-specific rules, restrictions, and participant targeting.
 *
 * @module services/eligibility/EligibilityRulesEngine
 */

import {
  APLEntry,
  APLLookupResult,
  ParticipantType,
  StateCode,
  SizeRestriction,
  BrandRestriction,
  AdditionalRestrictions,
} from '../../types/apl.types';

/**
 * Product being evaluated for eligibility
 */
export interface ProductEligibilityInput {
  /** UPC of the product */
  upc: string;
  /** State to check eligibility in */
  state: StateCode;
  /** Product size (actual) */
  actualSize?: number;
  /** Product size unit */
  sizeUnit?: string;
  /** Product brand */
  brand?: string;
  /** Product category */
  category?: string;
  /** Nutritional information (for restriction checks) */
  nutrition?: {
    sugarGrams?: number;
    sodiumMg?: number;
    wholeFat?: boolean;
  };
  /** Product attributes */
  attributes?: {
    isOrganic?: boolean;
    isWholeGrain?: boolean;
    hasArtificialDyes?: boolean;
    fortification?: string[];
  };
}

/**
 * Participant context for eligibility check
 */
export interface ParticipantContext {
  /** Participant type */
  type: ParticipantType;
  /** Participant age (for infant/child age-based restrictions) */
  ageMonths?: number;
  /** Is this participant breastfeeding (affects formula eligibility) */
  isBreastfeeding?: boolean;
}

/**
 * Household context for eligibility check
 */
export interface HouseholdContext {
  /** State of residence */
  state: StateCode;
  /** Participants in household */
  participants: ParticipantContext[];
  /** Active benefit period start date */
  benefitPeriodStart?: Date;
  /** Active benefit period end date */
  benefitPeriodEnd?: Date;
}

/**
 * Detailed eligibility evaluation result
 */
export interface EligibilityEvaluation {
  /** Overall eligibility decision */
  eligible: boolean;
  /** UPC evaluated */
  upc: string;
  /** State evaluated */
  state: StateCode;
  /** Matching APL entry (if found) */
  aplEntry?: APLEntry;
  /** Reason for ineligibility */
  ineligibilityReason?: string;
  /** Specific rule violations */
  ruleViolations: RuleViolation[];
  /** Participants who CAN use this product */
  eligibleParticipants: ParticipantType[];
  /** Participants who CANNOT use this product */
  ineligibleParticipants: ParticipantType[];
  /** Confidence score (0-100) */
  confidence: number;
  /** Warning messages (product is eligible but has caveats) */
  warnings: string[];
  /** Suggested alternatives (if not eligible) */
  alternatives?: string[];
  /** Data freshness timestamp */
  evaluatedAt: Date;
}

/**
 * Specific rule violation
 */
export interface RuleViolation {
  /** Rule that was violated */
  rule: RuleType;
  /** Severity of violation */
  severity: 'error' | 'warning';
  /** Human-readable message */
  message: string;
  /** Expected value (what was required) */
  expected?: any;
  /** Actual value (what was found) */
  actual?: any;
}

/**
 * Types of eligibility rules
 */
export enum RuleType {
  // Product presence rules
  NOT_IN_APL = 'not_in_apl',
  EXPIRED_APPROVAL = 'expired_approval',
  NOT_YET_EFFECTIVE = 'not_yet_effective',

  // Size rules
  SIZE_TOO_SMALL = 'size_too_small',
  SIZE_TOO_LARGE = 'size_too_large',
  SIZE_NOT_EXACT = 'size_not_exact',
  SIZE_NOT_ALLOWED = 'size_not_allowed',

  // Brand rules
  BRAND_NOT_ALLOWED = 'brand_not_allowed',
  BRAND_EXCLUDED = 'brand_excluded',
  NOT_CONTRACT_BRAND = 'not_contract_brand',
  CONTRACT_EXPIRED = 'contract_expired',

  // Participant rules
  PARTICIPANT_TYPE_RESTRICTED = 'participant_type_restricted',
  PARTICIPANT_AGE_RESTRICTED = 'participant_age_restricted',

  // Nutritional rules
  SUGAR_EXCEEDS_LIMIT = 'sugar_exceeds_limit',
  SODIUM_EXCEEDS_LIMIT = 'sodium_exceeds_limit',
  NOT_WHOLE_GRAIN = 'not_whole_grain',
  NOT_LOW_FAT = 'not_low_fat',
  NOT_ORGANIC = 'not_organic',
  HAS_ARTIFICIAL_DYES = 'has_artificial_dyes',
  MISSING_FORTIFICATION = 'missing_fortification',

  // State-specific rules
  STATE_SPECIFIC_RESTRICTION = 'state_specific_restriction',
}

/**
 * Eligibility Rules Engine
 *
 * Core engine that evaluates product eligibility based on APL entries
 * and state-specific rules.
 */
export class EligibilityRulesEngine {
  /**
   * Evaluate product eligibility
   *
   * @param product - Product to evaluate
   * @param aplEntry - APL entry (if found in database)
   * @param household - Household context (optional, for participant targeting)
   * @returns Detailed eligibility evaluation
   */
  evaluate(
    product: ProductEligibilityInput,
    aplEntry: APLEntry | null,
    household?: HouseholdContext
  ): EligibilityEvaluation {
    const evaluation: EligibilityEvaluation = {
      eligible: false,
      upc: product.upc,
      state: product.state,
      aplEntry: aplEntry || undefined,
      ruleViolations: [],
      eligibleParticipants: [],
      ineligibleParticipants: [],
      confidence: 100,
      warnings: [],
      evaluatedAt: new Date(),
    };

    // Rule 1: Product must be in APL
    if (!aplEntry) {
      evaluation.ruleViolations.push({
        rule: RuleType.NOT_IN_APL,
        severity: 'error',
        message: `Product not found in ${product.state} WIC Approved Product List`,
      });
      evaluation.ineligibilityReason = 'Product is not WIC-approved in your state';
      evaluation.confidence = 90; // Could be data freshness issue
      return evaluation;
    }

    // Rule 2: Product must not be explicitly marked ineligible
    if (!aplEntry.eligible) {
      evaluation.ruleViolations.push({
        rule: RuleType.NOT_IN_APL,
        severity: 'error',
        message: 'Product is explicitly marked as not WIC-eligible',
      });
      evaluation.ineligibilityReason = 'Product is not WIC-approved';
      return evaluation;
    }

    // Rule 3: Check effective date
    const now = new Date();
    if (aplEntry.effectiveDate && new Date(aplEntry.effectiveDate) > now) {
      evaluation.ruleViolations.push({
        rule: RuleType.NOT_YET_EFFECTIVE,
        severity: 'error',
        message: `Product approval not effective until ${aplEntry.effectiveDate}`,
        expected: aplEntry.effectiveDate,
        actual: now,
      });
      evaluation.ineligibilityReason = 'Product approval not yet effective';
      return evaluation;
    }

    // Rule 4: Check expiration date
    if (aplEntry.expirationDate && new Date(aplEntry.expirationDate) < now) {
      evaluation.ruleViolations.push({
        rule: RuleType.EXPIRED_APPROVAL,
        severity: 'error',
        message: `Product approval expired on ${aplEntry.expirationDate}`,
        expected: 'Active approval',
        actual: `Expired ${aplEntry.expirationDate}`,
      });
      evaluation.ineligibilityReason = 'Product approval has expired';
      return evaluation;
    }

    // Rule 5: Check size restrictions
    if (aplEntry.sizeRestriction && product.actualSize !== undefined) {
      const sizeViolation = this.checkSizeRestriction(
        product.actualSize,
        product.sizeUnit || '',
        aplEntry.sizeRestriction
      );
      if (sizeViolation) {
        evaluation.ruleViolations.push(sizeViolation);
        evaluation.ineligibilityReason = sizeViolation.message;
        return evaluation;
      }
    }

    // Rule 6: Check brand restrictions
    if (aplEntry.brandRestriction && product.brand) {
      const brandViolation = this.checkBrandRestriction(
        product.brand,
        aplEntry.brandRestriction
      );
      if (brandViolation) {
        evaluation.ruleViolations.push(brandViolation);
        evaluation.ineligibilityReason = brandViolation.message;
        return evaluation;
      }
    }

    // Rule 7: Check participant type restrictions
    if (aplEntry.participantTypes && aplEntry.participantTypes.length > 0) {
      const participantEval = this.checkParticipantRestrictions(
        aplEntry.participantTypes,
        household
      );
      evaluation.eligibleParticipants = participantEval.eligible;
      evaluation.ineligibleParticipants = participantEval.ineligible;

      if (participantEval.eligible.length === 0) {
        evaluation.ruleViolations.push({
          rule: RuleType.PARTICIPANT_TYPE_RESTRICTED,
          severity: 'error',
          message: `Product restricted to: ${aplEntry.participantTypes.join(', ')}`,
          expected: aplEntry.participantTypes,
          actual: household?.participants.map(p => p.type) || [],
        });
        evaluation.ineligibilityReason = 'No eligible participants in household';
        return evaluation;
      }

      // Partial eligibility - show as warning
      if (participantEval.ineligible.length > 0 && household) {
        evaluation.warnings.push(
          `Only ${participantEval.eligible.join(', ')} can purchase this product`
        );
      }
    } else {
      // No participant restrictions - eligible for all
      evaluation.eligibleParticipants = ['pregnant', 'postpartum', 'breastfeeding', 'infant', 'child'];
    }

    // Rule 8: Check nutritional restrictions
    if (aplEntry.additionalRestrictions && product.nutrition) {
      const nutritionViolations = this.checkNutritionalRestrictions(
        product.nutrition,
        product.attributes,
        aplEntry.additionalRestrictions
      );
      if (nutritionViolations.length > 0) {
        evaluation.ruleViolations.push(...nutritionViolations);
        evaluation.ineligibilityReason = nutritionViolations[0].message;
        return evaluation;
      }
    }

    // All rules passed - product is eligible
    evaluation.eligible = true;
    evaluation.confidence = 100;

    // Add informational warnings
    if (aplEntry.notes) {
      evaluation.warnings.push(aplEntry.notes);
    }

    return evaluation;
  }

  /**
   * Check size restrictions
   */
  private checkSizeRestriction(
    actualSize: number,
    sizeUnit: string,
    restriction: SizeRestriction
  ): RuleViolation | null {
    // Normalize units if needed (basic conversion)
    const normalizedSize = this.normalizeSize(actualSize, sizeUnit, restriction.unit);

    // Check exact size requirement
    if (restriction.exactSize !== undefined) {
      if (normalizedSize !== restriction.exactSize) {
        return {
          rule: RuleType.SIZE_NOT_EXACT,
          severity: 'error',
          message: `Product must be exactly ${restriction.exactSize} ${restriction.unit}`,
          expected: restriction.exactSize,
          actual: normalizedSize,
        };
      }
    }

    // Check allowed sizes list
    if (restriction.allowedSizes && restriction.allowedSizes.length > 0) {
      if (!restriction.allowedSizes.includes(normalizedSize)) {
        return {
          rule: RuleType.SIZE_NOT_ALLOWED,
          severity: 'error',
          message: `Product size must be one of: ${restriction.allowedSizes.join(', ')} ${restriction.unit}`,
          expected: restriction.allowedSizes,
          actual: normalizedSize,
        };
      }
    }

    // Check minimum size
    if (restriction.minSize !== undefined && normalizedSize < restriction.minSize) {
      return {
        rule: RuleType.SIZE_TOO_SMALL,
        severity: 'error',
        message: `Product must be at least ${restriction.minSize} ${restriction.unit}`,
        expected: `>= ${restriction.minSize}`,
        actual: normalizedSize,
      };
    }

    // Check maximum size
    if (restriction.maxSize !== undefined && normalizedSize > restriction.maxSize) {
      return {
        rule: RuleType.SIZE_TOO_LARGE,
        severity: 'error',
        message: `Product must be no more than ${restriction.maxSize} ${restriction.unit}`,
        expected: `<= ${restriction.maxSize}`,
        actual: normalizedSize,
      };
    }

    return null;
  }

  /**
   * Normalize size to common unit (basic conversion)
   */
  private normalizeSize(size: number, fromUnit: string, toUnit: string): number {
    // If units match, no conversion needed
    if (fromUnit.toLowerCase() === toUnit.toLowerCase()) {
      return size;
    }

    // Basic conversions (expand as needed)
    const conversions: Record<string, Record<string, number>> = {
      oz: { lb: 1 / 16, g: 28.3495, kg: 0.0283495 },
      lb: { oz: 16, g: 453.592, kg: 0.453592 },
      gal: { qt: 4, pt: 8, oz: 128, ml: 3785.41, l: 3.78541 },
      qt: { gal: 0.25, pt: 2, oz: 32, ml: 946.353, l: 0.946353 },
      pt: { gal: 0.125, qt: 0.5, oz: 16, ml: 473.176, l: 0.473176 },
      ml: { l: 0.001, oz: 0.033814, gal: 0.000264172 },
      l: { ml: 1000, oz: 33.814, gal: 0.264172 },
    };

    const fromLower = fromUnit.toLowerCase();
    const toLower = toUnit.toLowerCase();

    if (conversions[fromLower] && conversions[fromLower][toLower]) {
      return size * conversions[fromLower][toLower];
    }

    // If conversion not available, assume same (should log warning in production)
    return size;
  }

  /**
   * Check brand restrictions
   */
  private checkBrandRestriction(
    brand: string,
    restriction: BrandRestriction
  ): RuleViolation | null {
    const brandLower = brand.toLowerCase().trim();
    const now = new Date();

    // Check contract brand (exclusive)
    if (restriction.contractBrand) {
      const contractBrandLower = restriction.contractBrand.toLowerCase().trim();

      // Check if contract is still valid
      if (restriction.contractEndDate && new Date(restriction.contractEndDate) < now) {
        return {
          rule: RuleType.CONTRACT_EXPIRED,
          severity: 'error',
          message: `Contract brand expired on ${restriction.contractEndDate}`,
          expected: restriction.contractBrand,
          actual: 'Expired contract',
        };
      }

      if (restriction.contractStartDate && new Date(restriction.contractStartDate) > now) {
        return {
          rule: RuleType.CONTRACT_EXPIRED,
          severity: 'error',
          message: `Contract brand not yet active (starts ${restriction.contractStartDate})`,
          expected: restriction.contractBrand,
          actual: 'Contract not active',
        };
      }

      // Brand must match contract brand
      if (brandLower !== contractBrandLower) {
        return {
          rule: RuleType.NOT_CONTRACT_BRAND,
          severity: 'error',
          message: `Only ${restriction.contractBrand} brand allowed (contract brand)`,
          expected: restriction.contractBrand,
          actual: brand,
        };
      }
    }

    // Check allowed brands list
    if (restriction.allowedBrands && restriction.allowedBrands.length > 0) {
      const allowedLower = restriction.allowedBrands.map(b => b.toLowerCase().trim());
      if (!allowedLower.includes(brandLower)) {
        return {
          rule: RuleType.BRAND_NOT_ALLOWED,
          severity: 'error',
          message: `Only these brands allowed: ${restriction.allowedBrands.join(', ')}`,
          expected: restriction.allowedBrands,
          actual: brand,
        };
      }
    }

    // Check excluded brands list
    if (restriction.excludedBrands && restriction.excludedBrands.length > 0) {
      const excludedLower = restriction.excludedBrands.map(b => b.toLowerCase().trim());
      if (excludedLower.includes(brandLower)) {
        return {
          rule: RuleType.BRAND_EXCLUDED,
          severity: 'error',
          message: `This brand is not WIC-approved: ${brand}`,
          expected: 'Approved brand',
          actual: brand,
        };
      }
    }

    return null;
  }

  /**
   * Check participant restrictions
   */
  private checkParticipantRestrictions(
    allowedParticipantTypes: ParticipantType[],
    household?: HouseholdContext
  ): { eligible: ParticipantType[]; ineligible: ParticipantType[] } {
    if (!household) {
      // No household context - assume all allowed types are eligible
      return {
        eligible: allowedParticipantTypes,
        ineligible: [],
      };
    }

    const householdTypes = household.participants.map(p => p.type);
    const eligible = allowedParticipantTypes.filter(t => householdTypes.includes(t));
    const ineligible = householdTypes.filter(t => !allowedParticipantTypes.includes(t));

    return { eligible, ineligible };
  }

  /**
   * Check nutritional and attribute restrictions
   */
  private checkNutritionalRestrictions(
    nutrition: { sugarGrams?: number; sodiumMg?: number; wholeFat?: boolean },
    attributes: { isOrganic?: boolean; isWholeGrain?: boolean; hasArtificialDyes?: boolean; fortification?: string[] } | undefined,
    restrictions: AdditionalRestrictions
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];

    // Check sugar limit
    if (restrictions.maxSugarGrams !== undefined && nutrition.sugarGrams !== undefined) {
      if (nutrition.sugarGrams > restrictions.maxSugarGrams) {
        violations.push({
          rule: RuleType.SUGAR_EXCEEDS_LIMIT,
          severity: 'error',
          message: `Sugar content exceeds limit (${restrictions.maxSugarGrams}g per serving)`,
          expected: `<= ${restrictions.maxSugarGrams}g`,
          actual: `${nutrition.sugarGrams}g`,
        });
      }
    }

    // Check sodium limit
    if (restrictions.maxSodiumMg !== undefined && nutrition.sodiumMg !== undefined) {
      if (nutrition.sodiumMg > restrictions.maxSodiumMg) {
        violations.push({
          rule: RuleType.SODIUM_EXCEEDS_LIMIT,
          severity: 'error',
          message: `Sodium content exceeds limit (${restrictions.maxSodiumMg}mg per serving)`,
          expected: `<= ${restrictions.maxSodiumMg}mg`,
          actual: `${nutrition.sodiumMg}mg`,
        });
      }
    }

    if (!attributes) return violations;

    // Check whole grain requirement
    if (restrictions.wholeGrainRequired && !attributes.isWholeGrain) {
      violations.push({
        rule: RuleType.NOT_WHOLE_GRAIN,
        severity: 'error',
        message: 'Product must be whole grain',
        expected: 'Whole grain',
        actual: 'Not whole grain',
      });
    }

    // Check organic requirement
    if (restrictions.organicRequired && !attributes.isOrganic) {
      violations.push({
        rule: RuleType.NOT_ORGANIC,
        severity: 'error',
        message: 'Product must be certified organic',
        expected: 'Organic',
        actual: 'Not organic',
      });
    }

    // Check artificial dyes prohibition
    if (restrictions.noArtificialDyes && attributes.hasArtificialDyes) {
      violations.push({
        rule: RuleType.HAS_ARTIFICIAL_DYES,
        severity: 'error',
        message: 'Product contains prohibited artificial dyes',
        expected: 'No artificial dyes',
        actual: 'Contains artificial dyes',
      });
    }

    // Check low-fat requirement
    if (restrictions.lowFatRequired && nutrition.wholeFat) {
      violations.push({
        rule: RuleType.NOT_LOW_FAT,
        severity: 'error',
        message: 'Product must be low-fat or reduced-fat',
        expected: 'Low-fat',
        actual: 'Whole fat',
      });
    }

    // Check fortification requirements
    if (restrictions.fortificationRequired && restrictions.fortificationRequired.length > 0) {
      const productFortification = attributes.fortification || [];
      const missing = restrictions.fortificationRequired.filter(
        req => !productFortification.includes(req)
      );

      if (missing.length > 0) {
        violations.push({
          rule: RuleType.MISSING_FORTIFICATION,
          severity: 'error',
          message: `Product must be fortified with: ${missing.join(', ')}`,
          expected: restrictions.fortificationRequired,
          actual: productFortification,
        });
      }
    }

    return violations;
  }

  /**
   * Batch evaluate multiple products
   */
  evaluateBatch(
    products: ProductEligibilityInput[],
    aplEntries: Map<string, APLEntry | null>,
    household?: HouseholdContext
  ): EligibilityEvaluation[] {
    return products.map(product => {
      const aplEntry = aplEntries.get(product.upc) || null;
      return this.evaluate(product, aplEntry, household);
    });
  }

  /**
   * Get human-readable eligibility summary
   */
  getSummary(evaluation: EligibilityEvaluation): string {
    if (evaluation.eligible) {
      let summary = '✓ WIC Eligible';
      if (evaluation.eligibleParticipants.length > 0 && evaluation.eligibleParticipants.length < 5) {
        summary += ` for ${evaluation.eligibleParticipants.join(', ')}`;
      }
      if (evaluation.warnings.length > 0) {
        summary += `\n⚠ ${evaluation.warnings.join('\n⚠ ')}`;
      }
      return summary;
    } else {
      return `✗ Not WIC Eligible\n${evaluation.ineligibilityReason || 'Unknown reason'}`;
    }
  }
}
