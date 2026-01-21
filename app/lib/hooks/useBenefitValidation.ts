/**
 * React Hook for Benefit Validation
 *
 * Provides easy integration of benefit validation into React components
 */

import { useState, useEffect, useMemo } from 'react';
import {
  BenefitValidationService,
  benefitValidationService,
  ValidationResult,
  BenefitBalance,
  DiscrepancyWarning,
  ValidationThresholds,
  convertToBenefitBalance,
  convertMultipleBenefits,
} from '../services/benefitValidation';
import { BenefitAmount } from '../types';

export interface UseBenefitValidationOptions {
  /** Custom validation thresholds */
  thresholds?: Partial<ValidationThresholds>;
  /** Auto-validate when benefits change */
  autoValidate?: boolean;
  /** Filter warnings by minimum severity */
  minSeverity?: 'low' | 'medium' | 'high';
}

export interface UseBenefitValidationReturn {
  /** Current validation result */
  validationResult: ValidationResult | null;
  /** Filtered warnings based on minSeverity */
  warnings: DiscrepancyWarning[];
  /** Whether validation is in progress */
  isValidating: boolean;
  /** Whether there are any warnings */
  hasWarnings: boolean;
  /** Whether there are high severity warnings */
  hasHighSeverityWarnings: boolean;
  /** Whether there are medium or high severity warnings */
  hasMediumOrHighWarnings: boolean;
  /** Manually trigger validation */
  validate: (benefits: BenefitBalance[] | BenefitAmount[]) => ValidationResult;
  /** Clear validation results */
  clear: () => void;
  /** Update validation thresholds */
  updateThresholds: (thresholds: Partial<ValidationThresholds>) => void;
}

/**
 * Hook to validate benefit balances and detect discrepancies
 *
 * @param benefits - Benefits to validate (optional, can validate manually)
 * @param options - Validation options
 * @returns Validation utilities and results
 *
 * @example
 * ```tsx
 * const { warnings, hasWarnings, validate } = useBenefitValidation(participant.benefits, {
 *   autoValidate: true,
 *   minSeverity: 'medium'
 * });
 *
 * if (hasWarnings) {
 *   warnings.forEach(warning => {
 *     console.log(warning.message);
 *   });
 * }
 * ```
 */
export function useBenefitValidation(
  benefits?: BenefitBalance[] | BenefitAmount[],
  options: UseBenefitValidationOptions = {}
): UseBenefitValidationReturn {
  const {
    thresholds,
    autoValidate = true,
    minSeverity = 'low',
  } = options;

  // Create or reuse validation service instance
  const validator = useMemo(() => {
    if (thresholds) {
      return new BenefitValidationService(thresholds);
    }
    return benefitValidationService;
  }, [thresholds]);

  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Severity levels for filtering
  const severityLevels = { low: 1, medium: 2, high: 3 };
  const minSeverityLevel = severityLevels[minSeverity];

  // Filter warnings by minimum severity
  const warnings = useMemo(() => {
    if (!validationResult || !validationResult.warnings) {
      return [];
    }
    return validationResult.warnings.filter(
      (w) => severityLevels[w.severity] >= minSeverityLevel
    );
  }, [validationResult, minSeverityLevel]);

  // Check for warnings at different severity levels
  const hasWarnings = warnings.length > 0;
  const hasHighSeverityWarnings = warnings.some((w) => w.severity === 'high');
  const hasMediumOrHighWarnings = warnings.some((w) => w.severity === 'medium' || w.severity === 'high');

  // Validate function
  const validate = (benefitsToValidate: BenefitBalance[] | BenefitAmount[]): ValidationResult => {
    setIsValidating(true);

    try {
      // Convert if needed
      let balances: BenefitBalance[];
      if (benefitsToValidate.length > 0 && 'totalAmount' in benefitsToValidate[0]) {
        // Already BenefitBalance[]
        balances = benefitsToValidate as BenefitBalance[];
      } else if (benefitsToValidate.length > 0) {
        // Convert from BenefitAmount[]
        balances = convertMultipleBenefits(benefitsToValidate as BenefitAmount[]);
      } else {
        // Empty array
        balances = [];
      }

      const result = validator.validateAllBenefits(balances);
      setValidationResult(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  };

  // Clear validation results
  const clear = () => {
    setValidationResult(null);
  };

  // Update thresholds
  const updateThresholds = (newThresholds: Partial<ValidationThresholds>) => {
    validator.updateThresholds(newThresholds);
    // Re-validate if we have benefits
    if (benefits && autoValidate) {
      validate(benefits);
    }
  };

  // Auto-validate when benefits change
  useEffect(() => {
    if (autoValidate && benefits && benefits.length > 0) {
      validate(benefits);
    }
  }, [benefits, autoValidate, validate]);

  return {
    validationResult,
    warnings,
    isValidating,
    hasWarnings,
    hasHighSeverityWarnings,
    hasMediumOrHighWarnings,
    validate,
    clear,
    updateThresholds,
  };
}

/**
 * Hook to validate a single benefit category
 *
 * @param benefit - Single benefit to validate
 * @param options - Validation options
 * @returns Warning and validation utilities
 *
 * @example
 * ```tsx
 * const { warning, hasWarning, validate } = useSingleBenefitValidation(milkBenefit);
 *
 * if (hasWarning && warning) {
 *   return <Alert severity={warning.severity}>{warning.message}</Alert>;
 * }
 * ```
 */
export function useSingleBenefitValidation(
  benefit?: BenefitBalance | BenefitAmount,
  options: UseBenefitValidationOptions = {}
) {
  const { thresholds, autoValidate = true } = options;

  const validator = useMemo(() => {
    if (thresholds) {
      return new BenefitValidationService(thresholds);
    }
    return benefitValidationService;
  }, [thresholds]);

  const [warning, setWarning] = useState<DiscrepancyWarning | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validate = (benefitToValidate: BenefitBalance | BenefitAmount): DiscrepancyWarning | null => {
    setIsValidating(true);

    try {
      // Convert if needed
      let balance: BenefitBalance;
      if (benefitToValidate && 'totalAmount' in benefitToValidate) {
        balance = benefitToValidate as BenefitBalance;
      } else if (benefitToValidate) {
        balance = convertToBenefitBalance(benefitToValidate as BenefitAmount);
      } else {
        // Null/undefined benefit - no validation
        setWarning(null);
        return null;
      }

      const result = validator.validateBenefit(balance);
      setWarning(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  };

  const clear = () => {
    setWarning(null);
  };

  const updateThresholds = (newThresholds: Partial<ValidationThresholds>) => {
    validator.updateThresholds(newThresholds);
    if (benefit && autoValidate) {
      validate(benefit);
    }
  };

  useEffect(() => {
    if (autoValidate && benefit) {
      validate(benefit);
    }
  }, [benefit, autoValidate, validate]);

  return {
    warning,
    hasWarning: warning !== null,
    isValidating,
    validate,
    clear,
    updateThresholds,
  };
}

export default useBenefitValidation;
