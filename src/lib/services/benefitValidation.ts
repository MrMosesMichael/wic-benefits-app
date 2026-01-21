/**
 * Benefit Validation Service
 *
 * Implements R5.1 - Balance discrepancy warnings
 * Compares manual balance vs calculated usage and warns if discrepancy exceeds threshold
 */

export interface BenefitBalance {
  category: string;
  categoryLabel: string;
  totalAmount: number;
  availableAmount: number;
  inCartAmount: number;
  consumedAmount: number;
  unit: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface DiscrepancyWarning {
  category: string;
  categoryLabel: string;
  expectedAvailable: number;
  actualAvailable: number;
  discrepancy: number;
  discrepancyPercentage: number;
  unit: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation: string;
}

export interface ValidationResult {
  isValid: boolean;
  hasWarnings: boolean;
  warnings: DiscrepancyWarning[];
  checkedAt: Date;
}

export interface ValidationThresholds {
  /** Low severity threshold - percentage of total allocation (default: 5%) */
  lowThresholdPercent: number;
  /** Medium severity threshold - percentage of total allocation (default: 10%) */
  mediumThresholdPercent: number;
  /** High severity threshold - percentage of total allocation (default: 20%) */
  highThresholdPercent: number;
  /** Minimum absolute discrepancy to trigger warning (default: 0.1 units) */
  minimumAbsoluteDiscrepancy: number;
}

export const DEFAULT_THRESHOLDS: ValidationThresholds = {
  lowThresholdPercent: 5,
  mediumThresholdPercent: 10,
  highThresholdPercent: 20,
  minimumAbsoluteDiscrepancy: 0.1,
};

export class BenefitValidationService {
  private thresholds: ValidationThresholds;

  constructor(thresholds: Partial<ValidationThresholds> = {}) {
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...thresholds,
    };
  }

  /**
   * Validate a single benefit category for discrepancies
   *
   * @param benefit - Benefit balance data including total, available, in cart, and consumed amounts
   * @returns Discrepancy warning if threshold exceeded, null otherwise
   */
  validateBenefit(benefit: BenefitBalance): DiscrepancyWarning | null {
    // Calculate expected available based on three-state tracking
    // Formula: available = total - consumed - inCart
    const expectedAvailable = benefit.totalAmount - benefit.consumedAmount - benefit.inCartAmount;
    const actualAvailable = benefit.availableAmount;

    // Calculate discrepancy (positive means we have more than expected, negative means less)
    const discrepancy = actualAvailable - expectedAvailable;
    const absoluteDiscrepancy = Math.abs(discrepancy);

    // Skip if discrepancy is negligible (floating point precision issues)
    if (absoluteDiscrepancy < this.thresholds.minimumAbsoluteDiscrepancy) {
      return null;
    }

    // Calculate discrepancy as percentage of total allocation
    const discrepancyPercentage = benefit.totalAmount > 0
      ? (absoluteDiscrepancy / benefit.totalAmount) * 100
      : 0;

    // Determine severity based on percentage thresholds
    let severity: 'low' | 'medium' | 'high';
    if (discrepancyPercentage >= this.thresholds.highThresholdPercent) {
      severity = 'high';
    } else if (discrepancyPercentage >= this.thresholds.mediumThresholdPercent) {
      severity = 'medium';
    } else if (discrepancyPercentage >= this.thresholds.lowThresholdPercent) {
      severity = 'low';
    } else {
      // Below threshold, no warning needed
      return null;
    }

    // Generate warning message based on discrepancy direction
    const message = this.generateWarningMessage(benefit, discrepancy, absoluteDiscrepancy, severity);
    const recommendation = this.generateRecommendation(benefit, discrepancy, severity);

    return {
      category: benefit.category,
      categoryLabel: benefit.categoryLabel,
      expectedAvailable,
      actualAvailable,
      discrepancy,
      discrepancyPercentage,
      unit: benefit.unit,
      severity,
      message,
      recommendation,
    };
  }

  /**
   * Validate all benefits for a participant
   *
   * @param benefits - Array of benefit balances to validate
   * @returns Validation result with all warnings found
   */
  validateAllBenefits(benefits: BenefitBalance[]): ValidationResult {
    const warnings: DiscrepancyWarning[] = [];

    for (const benefit of benefits) {
      const warning = this.validateBenefit(benefit);
      if (warning) {
        warnings.push(warning);
      }
    }

    return {
      isValid: warnings.length === 0,
      hasWarnings: warnings.length > 0,
      warnings,
      checkedAt: new Date(),
    };
  }

  /**
   * Check if a benefit balance is consistent
   * Returns true if the three-state balance equation holds:
   * total = available + inCart + consumed
   *
   * @param benefit - Benefit balance to check
   * @returns True if balance is consistent
   */
  isBalanceConsistent(benefit: BenefitBalance): boolean {
    const sum = benefit.availableAmount + benefit.inCartAmount + benefit.consumedAmount;
    const difference = Math.abs(benefit.totalAmount - sum);
    return difference < this.thresholds.minimumAbsoluteDiscrepancy;
  }

  /**
   * Generate a human-readable warning message
   *
   * @private
   */
  private generateWarningMessage(
    benefit: BenefitBalance,
    discrepancy: number,
    absoluteDiscrepancy: number,
    severity: 'low' | 'medium' | 'high'
  ): string {
    const formattedDiscrepancy = absoluteDiscrepancy.toFixed(2);
    const direction = discrepancy > 0 ? 'more' : 'less';

    let prefix: string;
    if (severity === 'high') {
      prefix = '⚠️ URGENT';
    } else if (severity === 'medium') {
      prefix = '⚠️ Warning';
    } else {
      prefix = 'ℹ️ Notice';
    }

    return `${prefix}: ${benefit.categoryLabel} balance shows ${formattedDiscrepancy} ${benefit.unit} ${direction} than expected based on recorded usage.`;
  }

  /**
   * Generate a recommendation based on the discrepancy
   *
   * @private
   */
  private generateRecommendation(
    benefit: BenefitBalance,
    discrepancy: number,
    severity: 'low' | 'medium' | 'high'
  ): string {
    if (discrepancy > 0) {
      // More available than expected - possible missed purchase logging
      if (severity === 'high') {
        return `Please review your ${benefit.categoryLabel} purchases. You may have forgotten to log recent purchases, or your benefit balance may have been manually adjusted.`;
      } else if (severity === 'medium') {
        return `Double-check your recent ${benefit.categoryLabel} purchases to ensure all are logged correctly.`;
      } else {
        return `Minor discrepancy detected. This may be due to rounding or a small unlogged purchase.`;
      }
    } else {
      // Less available than expected - possible double-logged purchase or incorrect manual entry
      if (severity === 'high') {
        return `Please review your ${benefit.categoryLabel} transaction history. You may have logged a purchase twice, or your benefit balance may need correction.`;
      } else if (severity === 'medium') {
        return `Check if any ${benefit.categoryLabel} purchases were logged more than once.`;
      } else {
        return `Minor discrepancy detected. This may be due to rounding or manual balance adjustments.`;
      }
    }
  }

  /**
   * Update validation thresholds
   *
   * @param thresholds - New threshold values to apply
   */
  updateThresholds(thresholds: Partial<ValidationThresholds>): void {
    this.thresholds = {
      ...this.thresholds,
      ...thresholds,
    };
  }

  /**
   * Get current validation thresholds
   *
   * @returns Current threshold configuration
   */
  getThresholds(): ValidationThresholds {
    return { ...this.thresholds };
  }
}

/**
 * Helper function to convert BenefitAmount from API to BenefitBalance
 * Used to adapt the API response format to the validation service format
 */
export function convertToBenefitBalance(apiData: {
  category: string;
  categoryLabel: string;
  total: string;
  available: string;
  inCart: string;
  consumed: string;
  unit: string;
  periodStart?: string;
  periodEnd?: string;
}): BenefitBalance {
  return {
    category: apiData.category,
    categoryLabel: apiData.categoryLabel,
    totalAmount: parseFloat(apiData.total),
    availableAmount: parseFloat(apiData.available),
    inCartAmount: parseFloat(apiData.inCart),
    consumedAmount: parseFloat(apiData.consumed),
    unit: apiData.unit,
    periodStart: apiData.periodStart,
    periodEnd: apiData.periodEnd,
  };
}

/**
 * Helper function to batch convert multiple benefits
 */
export function convertMultipleBenefits(apiBenefits: Array<{
  category: string;
  categoryLabel: string;
  total: string;
  available: string;
  inCart: string;
  consumed: string;
  unit: string;
  periodStart?: string;
  periodEnd?: string;
}>): BenefitBalance[] {
  return apiBenefits.map(convertToBenefitBalance);
}

// Export singleton instance with default thresholds
export const benefitValidationService = new BenefitValidationService();

export default BenefitValidationService;
