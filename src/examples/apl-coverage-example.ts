/**
 * APL Coverage Service Example
 *
 * Demonstrates how to use the APL Coverage Service to:
 * - Analyze product database coverage against APL UPCs
 * - Identify missing UPCs
 * - Auto-sync to reach 95% target
 * - Generate coverage reports
 *
 * Usage:
 *   ts-node src/examples/apl-coverage-example.ts
 */

import { Pool } from 'pg';
import { ProductRepository } from '../database/ProductRepository';
import { createAPLCoverageService } from '../services/product';
import { getDatabaseConfig } from '../database/config';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  APL Coverage Service Example');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Initialize database connections
  const dbConfig = getDatabaseConfig();
  const pool = new Pool(dbConfig);
  const repository = new ProductRepository(dbConfig);

  try {
    // Create coverage service
    const coverageService = createAPLCoverageService(pool, repository, {
      targetCoverage: 95.0,
      priorityStates: ['MI', 'NC', 'FL', 'OR'],
      priorityCategories: ['formula', 'infant_formula'],
    });

    // ========================================
    // Example 1: Analyze Current Coverage
    // ========================================
    console.log('Example 1: Analyze Current Coverage');
    console.log('─────────────────────────────────────────────────────────');

    const analysis = await coverageService.analyzeCoverage();

    console.log(`Total APL UPCs: ${analysis.totalAPLUPCs.toLocaleString()}`);
    console.log(`Covered UPCs: ${analysis.coveredUPCs.toLocaleString()}`);
    console.log(`Missing UPCs: ${analysis.missingUPCs.toLocaleString()}`);
    console.log(`Coverage: ${analysis.coveragePercent.toFixed(2)}%`);
    console.log(`Meets Target: ${analysis.meetsTarget ? 'YES ✓' : 'NO ✗'}`);
    console.log('');

    // ========================================
    // Example 2: View State Breakdown
    // ========================================
    console.log('Example 2: Coverage by State');
    console.log('─────────────────────────────────────────────────────────');

    for (const state of analysis.stateBreakdown.slice(0, 5)) {
      const status = state.coveragePercent >= 95 ? '✓' : '✗';
      console.log(
        `${state.state.padEnd(4)} ${status}  ${state.coveragePercent.toFixed(1)}%  ` +
        `(${state.coveredUPCs.toLocaleString()}/${state.totalUPCs.toLocaleString()})`
      );
    }
    console.log('');

    // ========================================
    // Example 3: View Category Breakdown
    // ========================================
    console.log('Example 3: Coverage by Category (Top 5)');
    console.log('─────────────────────────────────────────────────────────');

    for (const cat of analysis.categoryBreakdown.slice(0, 5)) {
      const status = cat.coveragePercent >= 95 ? '✓' : '✗';
      const priority = cat.priority === 'high' ? '⚠' : ' ';
      console.log(
        `${priority} ${status}  ${cat.category.substring(0, 25).padEnd(25)}  ` +
        `${cat.coveragePercent.toFixed(1)}%`
      );
    }
    console.log('');

    // ========================================
    // Example 4: Get Sync Recommendation
    // ========================================
    console.log('Example 4: Sync Recommendation');
    console.log('─────────────────────────────────────────────────────────');

    const recommendation = await coverageService.getSyncRecommendation();

    console.log(`Should Sync: ${recommendation.shouldSync ? 'YES' : 'NO'}`);
    console.log(`Priority: ${recommendation.priority.toUpperCase()}`);
    console.log(`Estimated UPCs: ${recommendation.estimatedUPCs.toLocaleString()}`);
    console.log(`Estimated Duration: ${recommendation.estimatedDuration}`);
    console.log('');
    console.log(`Reason: ${recommendation.reason}`);
    console.log('');

    // ========================================
    // Example 5: View Missing UPCs
    // ========================================
    console.log('Example 5: Sample of Missing UPCs');
    console.log('─────────────────────────────────────────────────────────');

    const missingUPCs = await coverageService.getMissingUPCs(10);

    if (missingUPCs.length === 0) {
      console.log('✓ No missing UPCs found!');
    } else {
      console.log(`First ${missingUPCs.length} missing UPCs:`);
      for (const upc of missingUPCs) {
        console.log(`  ${upc}`);
      }
    }
    console.log('');

    // ========================================
    // Example 6: Generate Text Report
    // ========================================
    console.log('Example 6: Generate Coverage Report');
    console.log('─────────────────────────────────────────────────────────');

    const report = await coverageService.generateReport('text');
    console.log(report);
    console.log('');

    // ========================================
    // Example 7: Auto-Sync (Commented Out)
    // ========================================
    console.log('Example 7: Auto-Sync (Demonstration Only)');
    console.log('─────────────────────────────────────────────────────────');
    console.log('To run auto-sync, uncomment the code below:');
    console.log('');
    console.log('```typescript');
    console.log('if (!analysis.meetsTarget) {');
    console.log('  const result = await coverageService.autoSyncToTarget({');
    console.log('    batchSize: 100,');
    console.log('    concurrency: 5,');
    console.log('    syncImages: false,');
    console.log('    maxUPCs: 1000, // Limit for demo');
    console.log('  });');
    console.log('');
    console.log('  console.log(`Before: ${result.beforeAnalysis.coveragePercent.toFixed(2)}%`);');
    console.log('  console.log(`After: ${result.afterAnalysis.coveragePercent.toFixed(2)}%`);');
    console.log('}');
    console.log('```');
    console.log('');

    /*
    // Uncomment to actually run auto-sync
    if (!analysis.meetsTarget) {
      console.log('Starting auto-sync...');
      const result = await coverageService.autoSyncToTarget({
        batchSize: 100,
        concurrency: 5,
        syncImages: false,
        maxUPCs: 1000,
      });

      console.log('');
      console.log('Auto-Sync Results:');
      console.log(`Before: ${result.beforeAnalysis.coveragePercent.toFixed(2)}%`);
      console.log(`After: ${result.afterAnalysis.coveragePercent.toFixed(2)}%`);
      console.log(`Improvement: +${(result.afterAnalysis.coveragePercent - result.beforeAnalysis.coveragePercent).toFixed(2)}%`);
      console.log(`Products Added: ${result.syncResult.productsAdded}`);
      console.log(`Products Updated: ${result.syncResult.productsUpdated}`);
    }
    */

    // ========================================
    // Example 8: Export as JSON
    // ========================================
    console.log('Example 8: Export Report as JSON');
    console.log('─────────────────────────────────────────────────────────');

    const jsonReport = await coverageService.generateReport('json');
    const reportData = JSON.parse(jsonReport);

    console.log('JSON Report Structure:');
    console.log(`  analysis.coveragePercent: ${reportData.analysis.coveragePercent}%`);
    console.log(`  analysis.meetsTarget: ${reportData.analysis.meetsTarget}`);
    console.log(`  recommendation.shouldSync: ${reportData.recommendation.shouldSync}`);
    console.log(`  recommendation.priority: ${reportData.recommendation.priority}`);
    console.log('');
    console.log('Full JSON report saved to: coverage-report.json');

    // Save JSON report to file (optional)
    const fs = require('fs');
    fs.writeFileSync(
      'coverage-report.json',
      JSON.stringify(reportData, null, 2)
    );

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Examples Complete');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Review coverage analysis above');
    console.log('  2. Check coverage-report.json for detailed data');
    console.log('  3. Use CLI tools for production operations:');
    console.log('     - npm run check-coverage');
    console.log('     - npm run coverage-daemon');
    console.log('');

  } catch (error: any) {
    console.error('❌ Example failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Clean up
    await pool.end();
    await repository.close();
  }
}

// Run examples
if (require.main === module) {
  main();
}
