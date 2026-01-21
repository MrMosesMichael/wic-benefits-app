/**
 * Eligibility Rules Engine Examples
 *
 * Demonstrates how to use the state eligibility rules engine
 * to check product eligibility across different states.
 *
 * @module examples/eligibility-rules-example
 */

import { Pool } from 'pg';
import {
  EligibilityService,
  EligibilityRulesEngine,
  StateRulesConfig,
  ProductEligibilityInput,
  HouseholdContext,
  ParticipantContext,
} from '../services/eligibility';
import { APLEntry, ParticipantType } from '../types/apl.types';

/**
 * Example 1: Basic eligibility check
 */
async function example1_basicCheck() {
  console.log('Example 1: Basic Eligibility Check\n');

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const service = new EligibilityService(dbPool);

  try {
    // Check if Cheerios is WIC-eligible in Michigan
    const result = await service.checkEligibility({
      upc: '016000275287', // Cheerios UPC
      state: 'MI',
      product: {
        brand: 'Cheerios',
        category: 'cereal',
        size: 12,
        sizeUnit: 'oz',
      },
    });

    console.log('Product:', result.upc);
    console.log('State:', result.state);
    console.log('Eligible:', result.eligible ? '✓ Yes' : '✗ No');
    if (result.ineligibilityReason) {
      console.log('Reason:', result.ineligibilityReason);
    }
    console.log('Confidence:', `${result.confidence}%`);
    console.log('Data Age:', result.dataAgeMs ? `${Math.round(result.dataAgeMs / 1000)}s` : 'Unknown');
  } finally {
    await dbPool.end();
  }
}

/**
 * Example 2: Check with household context (participant targeting)
 */
async function example2_householdContext() {
  console.log('Example 2: Eligibility with Household Context\n');

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const service = new EligibilityService(dbPool);

  // Define household with multiple participants
  const household: HouseholdContext = {
    state: 'NC',
    participants: [
      { type: 'pregnant' },
      { type: 'child', ageMonths: 30 }, // 2.5 years old
      { type: 'infant', ageMonths: 4 },
    ],
    benefitPeriodStart: new Date('2026-01-01'),
    benefitPeriodEnd: new Date('2026-01-31'),
  };

  try {
    // Check infant formula (usually restricted to infants)
    const result = await service.checkEligibility({
      upc: '070074657103', // Example formula UPC
      state: 'NC',
      product: {
        brand: 'Enfamil',
        category: 'infant_formula',
      },
      household,
    });

    console.log('Product: Infant Formula');
    console.log('Eligible:', result.eligible ? '✓ Yes' : '✗ No');
    console.log('Eligible Participants:', result.eligibleParticipants.join(', '));
    console.log('Ineligible Participants:', result.ineligibleParticipants.join(', '));

    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }
  } finally {
    await dbPool.end();
  }
}

/**
 * Example 3: Batch eligibility check
 */
async function example3_batchCheck() {
  console.log('Example 3: Batch Eligibility Check\n');

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const service = new EligibilityService(dbPool);

  const upcs = [
    '016000275287', // Cheerios
    '011110416605', // 1% Milk
    '070074657103', // Infant Formula
    '041303001004', // Eggs
    '011110416612', // Whole Milk
  ];

  try {
    const results = await service.checkEligibilityBatch({
      upcs,
      state: 'FL',
    });

    console.log(`Checked ${results.length} products in Florida:\n`);

    results.forEach((result, i) => {
      console.log(`${i + 1}. UPC: ${result.upc}`);
      console.log(`   Eligible: ${result.eligible ? '✓' : '✗'}`);
      if (!result.eligible) {
        console.log(`   Reason: ${result.ineligibilityReason}`);
      }
      console.log('');
    });
  } finally {
    await dbPool.end();
  }
}

/**
 * Example 4: Rule violations analysis
 */
async function example4_ruleViolations() {
  console.log('Example 4: Rule Violations Analysis\n');

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const service = new EligibilityService(dbPool);

  try {
    // Check a product that violates size restrictions
    const result = await service.checkEligibility({
      upc: '016000275287',
      state: 'MI',
      product: {
        brand: 'Cheerios',
        category: 'cereal',
        size: 24, // Too large (assuming max is 18oz)
        sizeUnit: 'oz',
      },
    });

    console.log('Product:', result.upc);
    console.log('Eligible:', result.eligible ? '✓' : '✗');

    if (result.ruleViolations.length > 0) {
      console.log('\nRule Violations:');
      result.ruleViolations.forEach((violation, i) => {
        console.log(`\n${i + 1}. ${violation.rule}`);
        console.log(`   Severity: ${violation.severity}`);
        console.log(`   Message: ${violation.message}`);
        if (violation.expected) {
          console.log(`   Expected: ${JSON.stringify(violation.expected)}`);
        }
        if (violation.actual) {
          console.log(`   Actual: ${JSON.stringify(violation.actual)}`);
        }
      });
    }
  } finally {
    await dbPool.end();
  }
}

/**
 * Example 5: State policy comparison
 */
async function example5_statePolicyComparison() {
  console.log('Example 5: State Policy Comparison\n');

  const states = ['MI', 'NC', 'FL', 'OR'] as const;

  states.forEach(state => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(StateRulesConfig.getPolicySummary(state));
    console.log('='.repeat(60));
  });
}

/**
 * Example 6: Formula contract brand checking
 */
async function example6_formulaContractBrand() {
  console.log('Example 6: Formula Contract Brand Checking\n');

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const service = new EligibilityService(dbPool);

  try {
    // Check Similac in Michigan (contract brand)
    console.log('1. Similac in Michigan (contract brand):');
    const similacMI = await service.checkEligibility({
      upc: '070074657103',
      state: 'MI',
      product: {
        brand: 'Similac',
        category: 'infant_formula',
      },
    });
    console.log(`   Eligible: ${similacMI.eligible ? '✓' : '✗'}`);
    console.log(`   Reason: ${similacMI.ineligibilityReason || 'N/A'}`);

    // Check Enfamil in Michigan (not contract brand)
    console.log('\n2. Enfamil in Michigan (not contract brand):');
    const enfamilMI = await service.checkEligibility({
      upc: '300875110027',
      state: 'MI',
      product: {
        brand: 'Enfamil',
        category: 'infant_formula',
      },
    });
    console.log(`   Eligible: ${enfamilMI.eligible ? '✓' : '✗'}`);
    console.log(`   Reason: ${enfamilMI.ineligibilityReason || 'N/A'}`);

    // Check Enfamil in North Carolina (contract brand)
    console.log('\n3. Enfamil in North Carolina (contract brand):');
    const enfamilNC = await service.checkEligibility({
      upc: '300875110027',
      state: 'NC',
      product: {
        brand: 'Enfamil',
        category: 'infant_formula',
      },
    });
    console.log(`   Eligible: ${enfamilNC.eligible ? '✓' : '✗'}`);
    console.log(`   Reason: ${enfamilNC.ineligibilityReason || 'N/A'}`);
  } finally {
    await dbPool.end();
  }
}

/**
 * Example 7: Direct rules engine usage (no database)
 */
function example7_directRulesEngine() {
  console.log('Example 7: Direct Rules Engine Usage\n');

  const engine = new EligibilityRulesEngine();

  // Create mock APL entry
  const aplEntry: APLEntry = {
    id: 'test-1',
    state: 'MI',
    upc: '016000275287',
    eligible: true,
    benefitCategory: 'Cereal',
    participantTypes: ['pregnant', 'postpartum', 'breastfeeding', 'child'],
    sizeRestriction: {
      minSize: 8,
      maxSize: 18,
      unit: 'oz',
    },
    effectiveDate: new Date('2024-01-01'),
    expirationDate: null,
    dataSource: 'fis',
    lastUpdated: new Date(),
    verified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Create product input
  const product: ProductEligibilityInput = {
    upc: '016000275287',
    state: 'MI',
    actualSize: 12,
    sizeUnit: 'oz',
    brand: 'Cheerios',
    category: 'cereal',
  };

  // Evaluate
  const result = engine.evaluate(product, aplEntry);

  console.log('Product:', product.upc);
  console.log('Eligible:', result.eligible ? '✓' : '✗');
  console.log('Confidence:', `${result.confidence}%`);
  console.log('Summary:', engine.getSummary(result));
}

/**
 * Example 8: Size restriction edge cases
 */
function example8_sizeRestrictions() {
  console.log('Example 8: Size Restriction Edge Cases\n');

  const engine = new EligibilityRulesEngine();

  const testCases = [
    {
      name: 'Exact size match',
      size: 12,
      restriction: { exactSize: 12, unit: 'oz' as const },
      expectedEligible: true,
    },
    {
      name: 'Exact size mismatch',
      size: 12.4,
      restriction: { exactSize: 12.5, unit: 'oz' as const },
      expectedEligible: false,
    },
    {
      name: 'Within range',
      size: 12,
      restriction: { minSize: 8, maxSize: 18, unit: 'oz' as const },
      expectedEligible: true,
    },
    {
      name: 'Below minimum',
      size: 6,
      restriction: { minSize: 8, maxSize: 18, unit: 'oz' as const },
      expectedEligible: false,
    },
    {
      name: 'Above maximum',
      size: 20,
      restriction: { minSize: 8, maxSize: 18, unit: 'oz' as const },
      expectedEligible: false,
    },
    {
      name: 'Allowed sizes list (match)',
      size: 12,
      restriction: { allowedSizes: [8, 12, 16], unit: 'oz' as const },
      expectedEligible: true,
    },
    {
      name: 'Allowed sizes list (no match)',
      size: 10,
      restriction: { allowedSizes: [8, 12, 16], unit: 'oz' as const },
      expectedEligible: false,
    },
  ];

  testCases.forEach((testCase, i) => {
    const aplEntry: APLEntry = {
      id: `test-${i}`,
      state: 'MI',
      upc: '000000000000',
      eligible: true,
      benefitCategory: 'Test',
      sizeRestriction: testCase.restriction,
      effectiveDate: new Date('2024-01-01'),
      dataSource: 'manual',
      lastUpdated: new Date(),
      verified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const product: ProductEligibilityInput = {
      upc: '000000000000',
      state: 'MI',
      actualSize: testCase.size,
      sizeUnit: 'oz',
    };

    const result = engine.evaluate(product, aplEntry);

    console.log(`${i + 1}. ${testCase.name}`);
    console.log(`   Size: ${testCase.size}oz`);
    console.log(`   Expected: ${testCase.expectedEligible ? '✓' : '✗'}`);
    console.log(`   Actual: ${result.eligible ? '✓' : '✗'}`);
    console.log(`   Match: ${result.eligible === testCase.expectedEligible ? '✓ PASS' : '✗ FAIL'}`);
    if (!result.eligible) {
      console.log(`   Reason: ${result.ineligibilityReason}`);
    }
    console.log('');
  });
}

/**
 * Run all examples
 */
async function runAllExamples() {
  const examples = [
    { name: 'Basic Check', fn: example1_basicCheck, async: true },
    { name: 'Household Context', fn: example2_householdContext, async: true },
    { name: 'Batch Check', fn: example3_batchCheck, async: true },
    { name: 'Rule Violations', fn: example4_ruleViolations, async: true },
    { name: 'State Policy Comparison', fn: example5_statePolicyComparison, async: false },
    { name: 'Formula Contract Brand', fn: example6_formulaContractBrand, async: true },
    { name: 'Direct Rules Engine', fn: example7_directRulesEngine, async: false },
    { name: 'Size Restrictions', fn: example8_sizeRestrictions, async: false },
  ];

  console.log('Eligibility Rules Engine Examples\n');
  console.log('Available examples:');
  examples.forEach((ex, i) => {
    console.log(`  ${i + 1}. ${ex.name}`);
  });
  console.log('');

  // Run example based on command line argument
  const exampleNum = parseInt(process.argv[2]) || 5; // Default to state policy comparison

  if (exampleNum >= 1 && exampleNum <= examples.length) {
    const example = examples[exampleNum - 1];
    console.log(`Running: ${example.name}\n`);
    console.log('='.repeat(60));

    if (example.async) {
      await example.fn();
    } else {
      example.fn();
    }

    console.log('='.repeat(60));
  } else {
    console.log('Invalid example number. Please specify 1-8.');
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export {
  example1_basicCheck,
  example2_householdContext,
  example3_batchCheck,
  example4_ruleViolations,
  example5_statePolicyComparison,
  example6_formulaContractBrand,
  example7_directRulesEngine,
  example8_sizeRestrictions,
};
