/**
 * Benefit Validation Service - Unit Tests
 *
 * Tests for balance discrepancy detection and warning generation
 */

import {
  BenefitValidationService,
  benefitValidationService,
  convertToBenefitBalance,
  convertMultipleBenefits,
  DEFAULT_THRESHOLDS,
  BenefitBalance,
} from '../benefitValidation';

describe('BenefitValidationService', () => {
  describe('validateBenefit', () => {
    it('should return null for consistent balance', () => {
      const benefit: BenefitBalance = {
        category: 'milk',
        categoryLabel: 'Milk',
        totalAmount: 4,
        availableAmount: 1,
        inCartAmount: 1,
        consumedAmount: 2,
        unit: 'gal',
      };

      const warning = benefitValidationService.validateBenefit(benefit);

      expect(warning).toBeNull();
    });

    it('should detect high severity discrepancy - missed purchase', () => {
      const benefit: BenefitBalance = {
        category: 'eggs',
        categoryLabel: 'Eggs',
        totalAmount: 3,
        availableAmount: 2, // Should be 1 (3 - 0.5 - 1.5 = 1)
        inCartAmount: 0.5,
        consumedAmount: 1.5,
        unit: 'doz',
      };

      const warning = benefitValidationService.validateBenefit(benefit);

      expect(warning).not.toBeNull();
      expect(warning?.severity).toBe('high');
      expect(warning?.discrepancy).toBeCloseTo(1, 2);
      expect(warning?.expectedAvailable).toBeCloseTo(1, 2);
      expect(warning?.actualAvailable).toBeCloseTo(2, 2);
      expect(warning?.discrepancyPercentage).toBeCloseTo(33.33, 1);
    });

    it('should detect medium severity discrepancy - double-logged', () => {
      const benefit: BenefitBalance = {
        category: 'cheese',
        categoryLabel: 'Cheese',
        totalAmount: 2,
        availableAmount: 0.75, // Should be 1 (2 - 0 - 1 = 1)
        inCartAmount: 0,
        consumedAmount: 1.25, // 0.25 lb extra (12.5%)
        unit: 'lb',
      };

      const warning = benefitValidationService.validateBenefit(benefit);

      expect(warning).not.toBeNull();
      expect(warning?.severity).toBe('medium');
      expect(warning?.discrepancy).toBeCloseTo(-0.25, 2);
      expect(warning?.discrepancyPercentage).toBeCloseTo(12.5, 1);
    });

    it('should detect low severity discrepancy', () => {
      const benefit: BenefitBalance = {
        category: 'juice',
        categoryLabel: 'Juice',
        totalAmount: 3,
        availableAmount: 1.2, // Should be 1 (5% discrepancy)
        inCartAmount: 0.5,
        consumedAmount: 1.5,
        unit: 'gal',
      };

      const warning = benefitValidationService.validateBenefit(benefit);

      expect(warning).not.toBeNull();
      expect(warning?.severity).toBe('low');
      expect(warning?.discrepancy).toBeCloseTo(0.2, 2);
      expect(warning?.discrepancyPercentage).toBeCloseTo(6.67, 1);
    });

    it('should ignore negligible discrepancies below threshold', () => {
      const benefit: BenefitBalance = {
        category: 'milk',
        categoryLabel: 'Milk',
        totalAmount: 4,
        availableAmount: 1.05, // 0.05 gal discrepancy (below 0.1 threshold)
        inCartAmount: 1,
        consumedAmount: 2,
        unit: 'gal',
      };

      const warning = benefitValidationService.validateBenefit(benefit);

      expect(warning).toBeNull();
    });

    it('should generate appropriate message for positive discrepancy', () => {
      const benefit: BenefitBalance = {
        category: 'milk',
        categoryLabel: 'Milk',
        totalAmount: 4,
        availableAmount: 2.5, // 1.5 more than expected
        inCartAmount: 0.5,
        consumedAmount: 1,
        unit: 'gal',
      };

      const warning = benefitValidationService.validateBenefit(benefit);

      expect(warning).not.toBeNull();
      expect(warning?.message).toContain('more than expected');
      expect(warning?.recommendation).toContain('forgot to log');
    });

    it('should generate appropriate message for negative discrepancy', () => {
      const benefit: BenefitBalance = {
        category: 'cheese',
        categoryLabel: 'Cheese',
        totalAmount: 2,
        availableAmount: 0.2, // 0.3 less than expected
        inCartAmount: 0.5,
        consumedAmount: 1.5,
        unit: 'lb',
      };

      const warning = benefitValidationService.validateBenefit(benefit);

      expect(warning).not.toBeNull();
      expect(warning?.message).toContain('less than expected');
      expect(warning?.recommendation).toContain('logged');
    });
  });

  describe('validateAllBenefits', () => {
    it('should validate multiple benefits', () => {
      const benefits: BenefitBalance[] = [
        {
          category: 'milk',
          categoryLabel: 'Milk',
          totalAmount: 4,
          availableAmount: 1,
          inCartAmount: 1,
          consumedAmount: 2,
          unit: 'gal',
        },
        {
          category: 'eggs',
          categoryLabel: 'Eggs',
          totalAmount: 3,
          availableAmount: 2, // Discrepancy
          inCartAmount: 0,
          consumedAmount: 1,
          unit: 'doz',
        },
        {
          category: 'cheese',
          categoryLabel: 'Cheese',
          totalAmount: 2,
          availableAmount: 1,
          inCartAmount: 0.5,
          consumedAmount: 0.5,
          unit: 'lb',
        },
      ];

      const result = benefitValidationService.validateAllBenefits(benefits);

      expect(result.isValid).toBe(false);
      expect(result.hasWarnings).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].category).toBe('eggs');
      expect(result.checkedAt).toBeInstanceOf(Date);
    });

    it('should return valid result when all benefits are consistent', () => {
      const benefits: BenefitBalance[] = [
        {
          category: 'milk',
          categoryLabel: 'Milk',
          totalAmount: 4,
          availableAmount: 1,
          inCartAmount: 1,
          consumedAmount: 2,
          unit: 'gal',
        },
        {
          category: 'eggs',
          categoryLabel: 'Eggs',
          totalAmount: 3,
          availableAmount: 1,
          inCartAmount: 1,
          consumedAmount: 1,
          unit: 'doz',
        },
      ];

      const result = benefitValidationService.validateAllBenefits(benefits);

      expect(result.isValid).toBe(true);
      expect(result.hasWarnings).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('isBalanceConsistent', () => {
    it('should return true for consistent balance', () => {
      const benefit: BenefitBalance = {
        category: 'milk',
        categoryLabel: 'Milk',
        totalAmount: 4,
        availableAmount: 1,
        inCartAmount: 1,
        consumedAmount: 2,
        unit: 'gal',
      };

      expect(benefitValidationService.isBalanceConsistent(benefit)).toBe(true);
    });

    it('should return false for inconsistent balance', () => {
      const benefit: BenefitBalance = {
        category: 'milk',
        categoryLabel: 'Milk',
        totalAmount: 4,
        availableAmount: 1.5,
        inCartAmount: 1,
        consumedAmount: 2,
        unit: 'gal',
      };

      expect(benefitValidationService.isBalanceConsistent(benefit)).toBe(false);
    });

    it('should handle floating point precision', () => {
      const benefit: BenefitBalance = {
        category: 'milk',
        categoryLabel: 'Milk',
        totalAmount: 4.0,
        availableAmount: 1.0000001, // Tiny floating point error
        inCartAmount: 1.0,
        consumedAmount: 2.0,
        unit: 'gal',
      };

      expect(benefitValidationService.isBalanceConsistent(benefit)).toBe(true);
    });
  });

  describe('custom thresholds', () => {
    it('should use custom thresholds', () => {
      const strictValidator = new BenefitValidationService({
        lowThresholdPercent: 2,
        mediumThresholdPercent: 5,
        highThresholdPercent: 10,
      });

      const benefit: BenefitBalance = {
        category: 'milk',
        categoryLabel: 'Milk',
        totalAmount: 4,
        availableAmount: 1.3, // 0.3 gal discrepancy (7.5%)
        inCartAmount: 1,
        consumedAmount: 2,
        unit: 'gal',
      };

      // Default thresholds: no warning (below 10%)
      const defaultWarning = benefitValidationService.validateBenefit(benefit);
      expect(defaultWarning).toBeNull();

      // Strict thresholds: medium warning (above 5%)
      const strictWarning = strictValidator.validateBenefit(benefit);
      expect(strictWarning).not.toBeNull();
      expect(strictWarning?.severity).toBe('medium');
    });

    it('should update thresholds dynamically', () => {
      const validator = new BenefitValidationService();

      const benefit: BenefitBalance = {
        category: 'milk',
        categoryLabel: 'Milk',
        totalAmount: 4,
        availableAmount: 1.2, // 5% discrepancy
        inCartAmount: 1,
        consumedAmount: 2,
        unit: 'gal',
      };

      // Original thresholds: no warning
      let warning = validator.validateBenefit(benefit);
      expect(warning).toBeNull();

      // Update to stricter thresholds
      validator.updateThresholds({ lowThresholdPercent: 4 });

      // Now should trigger warning
      warning = validator.validateBenefit(benefit);
      expect(warning).not.toBeNull();
      expect(warning?.severity).toBe('low');
    });

    it('should get current thresholds', () => {
      const thresholds = benefitValidationService.getThresholds();

      expect(thresholds.lowThresholdPercent).toBe(DEFAULT_THRESHOLDS.lowThresholdPercent);
      expect(thresholds.mediumThresholdPercent).toBe(DEFAULT_THRESHOLDS.mediumThresholdPercent);
      expect(thresholds.highThresholdPercent).toBe(DEFAULT_THRESHOLDS.highThresholdPercent);
      expect(thresholds.minimumAbsoluteDiscrepancy).toBe(DEFAULT_THRESHOLDS.minimumAbsoluteDiscrepancy);
    });
  });

  describe('helper functions', () => {
    it('should convert API format to BenefitBalance', () => {
      const apiData = {
        category: 'milk',
        categoryLabel: 'Milk',
        total: '4',
        available: '1',
        inCart: '1',
        consumed: '2',
        unit: 'gal',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
      };

      const benefit = convertToBenefitBalance(apiData);

      expect(benefit.category).toBe('milk');
      expect(benefit.totalAmount).toBe(4);
      expect(benefit.availableAmount).toBe(1);
      expect(benefit.inCartAmount).toBe(1);
      expect(benefit.consumedAmount).toBe(2);
      expect(benefit.unit).toBe('gal');
      expect(benefit.periodStart).toBe('2026-01-01');
    });

    it('should convert multiple API benefits', () => {
      const apiBenefits = [
        {
          category: 'milk',
          categoryLabel: 'Milk',
          total: '4',
          available: '1',
          inCart: '1',
          consumed: '2',
          unit: 'gal',
        },
        {
          category: 'eggs',
          categoryLabel: 'Eggs',
          total: '3',
          available: '1',
          inCart: '1',
          consumed: '1',
          unit: 'doz',
        },
      ];

      const benefits = convertMultipleBenefits(apiBenefits);

      expect(benefits).toHaveLength(2);
      expect(benefits[0].totalAmount).toBe(4);
      expect(benefits[1].totalAmount).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle zero total amount', () => {
      const benefit: BenefitBalance = {
        category: 'milk',
        categoryLabel: 'Milk',
        totalAmount: 0,
        availableAmount: 0,
        inCartAmount: 0,
        consumedAmount: 0,
        unit: 'gal',
      };

      const warning = benefitValidationService.validateBenefit(benefit);
      expect(warning).toBeNull();
    });

    it('should handle all consumed scenario', () => {
      const benefit: BenefitBalance = {
        category: 'milk',
        categoryLabel: 'Milk',
        totalAmount: 4,
        availableAmount: 0,
        inCartAmount: 0,
        consumedAmount: 4,
        unit: 'gal',
      };

      const warning = benefitValidationService.validateBenefit(benefit);
      expect(warning).toBeNull();
    });

    it('should handle all in cart scenario', () => {
      const benefit: BenefitBalance = {
        category: 'milk',
        categoryLabel: 'Milk',
        totalAmount: 4,
        availableAmount: 0,
        inCartAmount: 4,
        consumedAmount: 0,
        unit: 'gal',
      };

      const warning = benefitValidationService.validateBenefit(benefit);
      expect(warning).toBeNull();
    });

    it('should handle decimal amounts', () => {
      const benefit: BenefitBalance = {
        category: 'fruits_vegetables',
        categoryLabel: 'Fruits & Vegetables',
        totalAmount: 11.5,
        availableAmount: 4.25,
        inCartAmount: 2.5,
        consumedAmount: 4.75,
        unit: 'dollars',
      };

      const warning = benefitValidationService.validateBenefit(benefit);
      expect(warning).toBeNull();
    });

    it('should handle threshold boundary at exactly 5% (low)', () => {
      const benefit: BenefitBalance = {
        category: 'milk',
        categoryLabel: 'Milk',
        totalAmount: 20,
        availableAmount: 11, // 1 unit more than expected (5% = 1 unit)
        inCartAmount: 4,
        consumedAmount: 4,
        unit: 'gal',
      };

      const warning = benefitValidationService.validateBenefit(benefit);
      expect(warning).not.toBeNull();
      expect(warning?.severity).toBe('low');
    });

    it('should handle threshold boundary at exactly 10% (medium)', () => {
      const benefit: BenefitBalance = {
        category: 'milk',
        categoryLabel: 'Milk',
        totalAmount: 20,
        availableAmount: 12, // 2 units more than expected (10% = 2 units)
        inCartAmount: 4,
        consumedAmount: 4,
        unit: 'gal',
      };

      const warning = benefitValidationService.validateBenefit(benefit);
      expect(warning).not.toBeNull();
      expect(warning?.severity).toBe('medium');
    });

    it('should handle threshold boundary at exactly 20% (high)', () => {
      const benefit: BenefitBalance = {
        category: 'milk',
        categoryLabel: 'Milk',
        totalAmount: 20,
        availableAmount: 14, // 4 units more than expected (20% = 4 units)
        inCartAmount: 4,
        consumedAmount: 4,
        unit: 'gal',
      };

      const warning = benefitValidationService.validateBenefit(benefit);
      expect(warning).not.toBeNull();
      expect(warning?.severity).toBe('high');
    });

    it('should handle empty benefits array', () => {
      const result = benefitValidationService.validateAllBenefits([]);

      expect(result.isValid).toBe(true);
      expect(result.hasWarnings).toBe(false);
      expect(result.warnings).toHaveLength(0);
      expect(result.checkedAt).toBeInstanceOf(Date);
    });

    it('should handle negative amounts gracefully', () => {
      const benefit: BenefitBalance = {
        category: 'milk',
        categoryLabel: 'Milk',
        totalAmount: 4,
        availableAmount: -1, // Negative (unlikely but possible data corruption)
        inCartAmount: 1,
        consumedAmount: 4,
        unit: 'gal',
      };

      const warning = benefitValidationService.validateBenefit(benefit);
      // Should detect as high severity discrepancy
      expect(warning).not.toBeNull();
      expect(warning?.severity).toBe('high');
    });
  });
});
