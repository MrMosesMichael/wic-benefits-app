/**
 * Formula Shortage Detection Examples
 * Demonstrates A4.2 shortage detection algorithm usage
 */

import {
  getFormulaAvailabilityService,
  getFormulaShortageDetectionService,
  ShortageSeverity,
} from '../index';

/**
 * Example 1: Basic shortage detection
 */
export async function basicShortageDetection() {
  const shortageService = getFormulaShortageDetectionService();

  // Detect shortages for a specific formula
  const detection = await shortageService.detectShortage('012345678901');

  console.log('Shortage Detection Result:');
  console.log(`- UPC: ${detection.upc}`);
  console.log(`- Severity: ${detection.severity}`);
  console.log(`- Availability: ${detection.availableStoreCount}/${detection.totalStoreCount} stores`);
  console.log(`- Rate: ${(detection.availabilityRate * 100).toFixed(1)}%`);
  console.log(`- Trend: ${detection.trend}`);
}

/**
 * Example 2: Monitor critical shortages
 */
export async function monitorCriticalShortages() {
  const shortageService = getFormulaShortageDetectionService();

  // Get all critical and high severity shortages
  const criticalShortages = await shortageService.getCriticalShortages(
    ShortageSeverity.HIGH
  );

  console.log(`Found ${criticalShortages.length} critical shortages:`);
  for (const shortage of criticalShortages) {
    console.log(`\n${shortage.upc} - ${shortage.severity.toUpperCase()}`);
    console.log(`  Available: ${shortage.availableStoreCount}/${shortage.totalStoreCount} stores`);
    console.log(`  Trend: ${shortage.trend}`);
  }
}

/**
 * Example 3: Detect shortages with trend analysis
 */
export async function detectWithTrendAnalysis() {
  const availabilityService = getFormulaAvailabilityService();
  const shortageService = getFormulaShortageDetectionService();

  // First, populate with some sample data over time
  const upc = '012345678901';
  const stores = ['store1', 'store2', 'store3', 'store4', 'store5'];

  // Simulate declining availability over 72 hours
  for (let hour = 72; hour >= 0; hour -= 6) {
    const availabilityRate = 0.8 - (72 - hour) / 72 * 0.6; // Declining from 80% to 20%

    for (const storeId of stores) {
      await availabilityService.updateAvailability({
        storeId,
        upc,
        inStock: Math.random() < availabilityRate,
        quantity: Math.random() < availabilityRate ? Math.floor(Math.random() * 10) : 0,
        source: 'api',
      });
    }
  }

  // Now detect with trend analysis
  const detection = await shortageService.detectShortage(upc, {
    trendWindowHours: 72,
  });

  console.log('Shortage with Trend Analysis:');
  console.log(`- Severity: ${detection.severity}`);
  console.log(`- Trend: ${detection.trend} (should show "worsening")`);
  console.log(`- Current availability: ${(detection.availabilityRate * 100).toFixed(1)}%`);
}

/**
 * Example 4: Check if specific formula is experiencing shortage
 */
export async function checkSpecificFormula() {
  const shortageService = getFormulaShortageDetectionService();

  const upc = '012345678901';
  const isShortage = await shortageService.isShortage(
    upc,
    ShortageSeverity.MODERATE
  );

  if (isShortage) {
    console.log(`⚠️  Formula ${upc} is experiencing a moderate or higher shortage`);

    // Get details
    const detection = await shortageService.detectShortage(upc);
    console.log(`Severity: ${detection.severity}`);
    console.log(`Only ${detection.availableStoreCount} out of ${detection.totalStoreCount} stores have stock`);
  } else {
    console.log(`✓ Formula ${upc} is widely available`);
  }
}

/**
 * Example 5: Detect all shortages across formulas
 */
export async function detectAllShortages() {
  const availabilityService = getFormulaAvailabilityService();
  const shortageService = getFormulaShortageDetectionService();

  // Populate sample data for multiple formulas
  const formulas = [
    { upc: '111111111111', rate: 0.85 }, // Widely available
    { upc: '222222222222', rate: 0.60 }, // Low shortage
    { upc: '333333333333', rate: 0.35 }, // Moderate shortage
    { upc: '444444444444', rate: 0.15 }, // High shortage
    { upc: '555555555555', rate: 0.05 }, // Critical shortage
  ];

  const stores = ['store1', 'store2', 'store3', 'store4', 'store5',
                  'store6', 'store7', 'store8', 'store9', 'store10'];

  for (const formula of formulas) {
    for (const storeId of stores) {
      await availabilityService.updateAvailability({
        storeId,
        upc: formula.upc,
        inStock: Math.random() < formula.rate,
        quantity: Math.random() < formula.rate ? Math.floor(Math.random() * 10) : 0,
        source: 'api',
      });
    }
  }

  // Detect all shortages
  const allShortages = await shortageService.detectShortages();

  console.log('\nShortage Detection Summary:');
  console.log('='.repeat(60));
  for (const shortage of allShortages) {
    const severityEmoji = {
      [ShortageSeverity.NONE]: '✅',
      [ShortageSeverity.LOW]: '⚠️ ',
      [ShortageSeverity.MODERATE]: '🟠',
      [ShortageSeverity.HIGH]: '🔴',
      [ShortageSeverity.CRITICAL]: '🚨',
    };

    console.log(`${severityEmoji[shortage.severity]} ${shortage.upc}`);
    console.log(`   Severity: ${shortage.severity.toUpperCase()}`);
    console.log(`   Available: ${shortage.availableStoreCount}/${shortage.totalStoreCount} stores (${(shortage.availabilityRate * 100).toFixed(1)}%)`);
    console.log(`   Trend: ${shortage.trend}`);
    console.log('');
  }
}

/**
 * Example 6: Regional shortage analysis
 */
export async function regionalShortageAnalysis() {
  const shortageService = getFormulaShortageDetectionService();

  // Detect with regional analysis enabled
  const detection = await shortageService.detectShortage('012345678901', {
    includeRegionalAnalysis: true,
  });

  console.log('Regional Shortage Analysis:');
  console.log(`- Overall Severity: ${detection.severity}`);

  if (detection.affectedRegions && detection.affectedRegions.length > 0) {
    console.log(`- Affected Regions: ${detection.affectedRegions.join(', ')}`);
  } else {
    console.log('- Regional data not available yet');
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('\n=== Formula Shortage Detection Examples ===\n');

  try {
    console.log('\n1. Basic Shortage Detection');
    console.log('-'.repeat(60));
    await basicShortageDetection();

    console.log('\n2. Monitor Critical Shortages');
    console.log('-'.repeat(60));
    await monitorCriticalShortages();

    console.log('\n3. Detect with Trend Analysis');
    console.log('-'.repeat(60));
    await detectWithTrendAnalysis();

    console.log('\n4. Check Specific Formula');
    console.log('-'.repeat(60));
    await checkSpecificFormula();

    console.log('\n5. Detect All Shortages');
    console.log('-'.repeat(60));
    await detectAllShortages();

    console.log('\n6. Regional Shortage Analysis');
    console.log('-'.repeat(60));
    await regionalShortageAnalysis();

  } catch (error) {
    console.error('Error running examples:', error);
  }
}
