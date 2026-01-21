/**
 * Benefit Validation Service - Usage Examples
 *
 * Demonstrates how to use the BenefitValidationService to detect
 * balance discrepancies in the three-state benefit tracking system.
 */

import {
  BenefitValidationService,
  benefitValidationService,
  convertToBenefitBalance,
  convertMultipleBenefits,
  BenefitBalance,
} from '../lib/services/benefitValidation';

// Example 1: Validate a single benefit with no discrepancy
function exampleValidBenefit() {
  console.log('=== Example 1: Valid Benefit (No Discrepancy) ===\n');

  const benefit: BenefitBalance = {
    category: 'milk',
    categoryLabel: 'Milk',
    totalAmount: 4,
    availableAmount: 1,
    inCartAmount: 1,
    consumedAmount: 2,
    unit: 'gal',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
  };

  const warning = benefitValidationService.validateBenefit(benefit);

  if (warning) {
    console.log('Warning:', warning.message);
    console.log('Recommendation:', warning.recommendation);
  } else {
    console.log('✓ Balance is consistent - no warnings');
    console.log(`  Total: ${benefit.totalAmount} ${benefit.unit}`);
    console.log(`  Available: ${benefit.availableAmount} ${benefit.unit}`);
    console.log(`  In Cart: ${benefit.inCartAmount} ${benefit.unit}`);
    console.log(`  Consumed: ${benefit.consumedAmount} ${benefit.unit}`);
    console.log(`  Sum: ${benefit.availableAmount + benefit.inCartAmount + benefit.consumedAmount} ${benefit.unit}`);
  }
  console.log('\n');
}

// Example 2: Validate a benefit with high severity discrepancy (missed purchase)
function exampleMissedPurchase() {
  console.log('=== Example 2: High Severity - Missed Purchase ===\n');

  const benefit: BenefitBalance = {
    category: 'eggs',
    categoryLabel: 'Eggs',
    totalAmount: 3,
    availableAmount: 2.5, // Should be 1.5 if 1 dozen consumed
    inCartAmount: 0.5,
    consumedAmount: 1, // User forgot to log 1 dozen purchase
    unit: 'doz',
  };

  const warning = benefitValidationService.validateBenefit(benefit);

  if (warning) {
    console.log('Severity:', warning.severity.toUpperCase());
    console.log('Message:', warning.message);
    console.log('Expected Available:', warning.expectedAvailable, warning.unit);
    console.log('Actual Available:', warning.actualAvailable, warning.unit);
    console.log('Discrepancy:', warning.discrepancy.toFixed(2), warning.unit);
    console.log('Percentage:', warning.discrepancyPercentage.toFixed(1) + '%');
    console.log('Recommendation:', warning.recommendation);
  }
  console.log('\n');
}

// Example 3: Validate a benefit with medium severity discrepancy (double-logged)
function exampleDoubleLogged() {
  console.log('=== Example 3: Medium Severity - Double-Logged Purchase ===\n');

  const benefit: BenefitBalance = {
    category: 'cheese',
    categoryLabel: 'Cheese',
    totalAmount: 2,
    availableAmount: 0.5, // Should be 1.0 if only 1 lb consumed
    inCartAmount: 0,
    consumedAmount: 1.5, // User logged same purchase twice
    unit: 'lb',
  };

  const warning = benefitValidationService.validateBenefit(benefit);

  if (warning) {
    console.log('Severity:', warning.severity.toUpperCase());
    console.log('Message:', warning.message);
    console.log('Expected Available:', warning.expectedAvailable, warning.unit);
    console.log('Actual Available:', warning.actualAvailable, warning.unit);
    console.log('Discrepancy:', warning.discrepancy.toFixed(2), warning.unit);
    console.log('Percentage:', warning.discrepancyPercentage.toFixed(1) + '%');
    console.log('Recommendation:', warning.recommendation);
  }
  console.log('\n');
}

// Example 4: Validate multiple benefits at once
function exampleValidateAll() {
  console.log('=== Example 4: Validate All Benefits for a Participant ===\n');

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
      category: 'whole_grains',
      categoryLabel: 'Whole Grains',
      totalAmount: 36,
      availableAmount: 30, // Should be 20
      inCartAmount: 6,
      consumedAmount: 10, // Missing 10 oz logged
      unit: 'oz',
    },
    {
      category: 'fruits_vegetables',
      categoryLabel: 'Fruits & Vegetables (CVV)',
      totalAmount: 11,
      availableAmount: 4,
      inCartAmount: 2,
      consumedAmount: 5,
      unit: 'dollars',
    },
  ];

  const result = benefitValidationService.validateAllBenefits(benefits);

  console.log('Validation Summary:');
  console.log('  Valid:', result.isValid);
  console.log('  Has Warnings:', result.hasWarnings);
  console.log('  Total Warnings:', result.warnings.length);
  console.log('  Checked At:', result.checkedAt.toISOString());
  console.log('\n');

  if (result.hasWarnings) {
    console.log('Warnings:');
    result.warnings.forEach((warning, index) => {
      console.log(`\n  ${index + 1}. ${warning.categoryLabel}`);
      console.log(`     Severity: ${warning.severity.toUpperCase()}`);
      console.log(`     ${warning.message}`);
      console.log(`     ${warning.recommendation}`);
    });
  }
  console.log('\n');
}

// Example 5: Convert API data and validate
function exampleConvertFromApi() {
  console.log('=== Example 5: Convert from API Format and Validate ===\n');

  // Simulated API response
  const apiResponse = {
    success: true,
    data: {
      benefit: {
        id: 1,
        participantId: 1,
        category: 'juice',
        categoryLabel: 'Juice',
        total: '3',
        available: '1.5',
        inCart: '0.5',
        consumed: '1',
        unit: 'gal',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
      },
    },
  };

  const benefit = convertToBenefitBalance(apiResponse.data.benefit);
  const warning = benefitValidationService.validateBenefit(benefit);

  if (warning) {
    console.log('Warning detected:', warning.message);
  } else {
    console.log('✓ No warnings - balance is consistent');
  }
  console.log('\n');
}

// Example 6: Check balance consistency
function exampleCheckConsistency() {
  console.log('=== Example 6: Check Balance Consistency ===\n');

  const consistentBenefit: BenefitBalance = {
    category: 'peanut_butter',
    categoryLabel: 'Peanut Butter',
    totalAmount: 18,
    availableAmount: 10,
    inCartAmount: 4,
    consumedAmount: 4,
    unit: 'oz',
  };

  const inconsistentBenefit: BenefitBalance = {
    category: 'cereal',
    categoryLabel: 'Cereal',
    totalAmount: 36,
    availableAmount: 15,
    inCartAmount: 10,
    consumedAmount: 10, // Sum is 35, not 36
    unit: 'oz',
  };

  console.log('Consistent benefit:', benefitValidationService.isBalanceConsistent(consistentBenefit));
  console.log('Inconsistent benefit:', benefitValidationService.isBalanceConsistent(inconsistentBenefit));
  console.log('\n');
}

// Example 7: Custom thresholds
function exampleCustomThresholds() {
  console.log('=== Example 7: Custom Validation Thresholds ===\n');

  // Create a service with stricter thresholds
  const strictValidator = new BenefitValidationService({
    lowThresholdPercent: 2,
    mediumThresholdPercent: 5,
    highThresholdPercent: 10,
    minimumAbsoluteDiscrepancy: 0.05,
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

  const defaultWarning = benefitValidationService.validateBenefit(benefit);
  const strictWarning = strictValidator.validateBenefit(benefit);

  console.log('Default thresholds:', defaultWarning ? defaultWarning.severity : 'no warning');
  console.log('Strict thresholds:', strictWarning ? strictWarning.severity : 'no warning');
  console.log('\n');
}

// Example 8: Real-world scenario - Post-checkout validation
async function examplePostCheckoutValidation() {
  console.log('=== Example 8: Post-Checkout Validation ===\n');

  // Simulate fetching benefits after checkout
  const participantBenefits = [
    {
      category: 'milk',
      categoryLabel: 'Milk',
      total: '4',
      available: '1',
      inCart: '0', // Cart was cleared after checkout
      consumed: '3',
      unit: 'gal',
    },
    {
      category: 'eggs',
      categoryLabel: 'Eggs',
      total: '3',
      available: '1.5',
      inCart: '0',
      consumed: '1.5',
      unit: 'doz',
    },
  ];

  const benefits = convertMultipleBenefits(participantBenefits);
  const result = benefitValidationService.validateAllBenefits(benefits);

  console.log('Post-checkout validation complete');
  console.log('Status:', result.isValid ? '✓ All balances valid' : '⚠️ Warnings detected');

  if (result.hasWarnings) {
    console.log('\nWarnings found:');
    result.warnings.forEach((w) => {
      console.log(`  - ${w.categoryLabel}: ${w.message}`);
    });
  }
  console.log('\n');
}

// Run all examples
async function runAllExamples() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Benefit Validation Service - Usage Examples              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  exampleValidBenefit();
  exampleMissedPurchase();
  exampleDoubleLogged();
  exampleValidateAll();
  exampleConvertFromApi();
  exampleCheckConsistency();
  exampleCustomThresholds();
  await examplePostCheckoutValidation();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  All examples completed                                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

// Execute if run directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  exampleValidBenefit,
  exampleMissedPurchase,
  exampleDoubleLogged,
  exampleValidateAll,
  exampleConvertFromApi,
  exampleCheckConsistency,
  exampleCustomThresholds,
  examplePostCheckoutValidation,
  runAllExamples,
};
