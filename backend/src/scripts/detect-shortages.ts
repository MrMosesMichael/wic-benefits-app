/**
 * Formula Shortage Detection Script
 *
 * Analyzes formula_availability data to detect regional shortages.
 * Should be run hourly via cron job or similar scheduler.
 *
 * Algorithm:
 * 1. For each formula UPC in the database
 * 2. Calculate % of stores reporting out_of_stock
 * 3. If >= 50% out of stock → shortage exists
 * 4. Calculate severity: moderate (50-70%), severe (70-90%), critical (90%+)
 * 5. Track trend by comparing to previous detection
 * 6. Update formula_shortages table
 */

import pool from '../config/database';

interface ShortageAnalysis {
  upc: string;
  productName: string;
  region: string;
  totalStores: number;
  outOfStockStores: number;
  lowStockStores: number;
  inStockStores: number;
  outOfStockPercentage: number;
  severity: 'moderate' | 'severe' | 'critical';
  isShortage: boolean;
}

/**
 * Analyze formula availability data for shortages
 */
async function analyzeFormulaAvailability(region: string = 'Michigan'): Promise<ShortageAnalysis[]> {
  // Get all unique UPCs with recent reports (last 48 hours)
  const upcsResult = await pool.query(`
    SELECT DISTINCT upc,
           'Formula ' || upc as product_name
    FROM formula_availability
    WHERE last_updated >= NOW() - INTERVAL '48 hours'
  `);

  const analyses: ShortageAnalysis[] = [];

  for (const row of upcsResult.rows) {
    const { upc, product_name } = row;

    // Count stores by status for this UPC
    const statusResult = await pool.query(`
      SELECT
        status,
        COUNT(DISTINCT store_name) as store_count
      FROM formula_availability
      WHERE upc = $1
        AND last_updated >= NOW() - INTERVAL '48 hours'
      GROUP BY status
    `, [upc]);

    // Calculate totals
    let totalStores = 0;
    let outOfStockStores = 0;
    let lowStockStores = 0;
    let inStockStores = 0;

    for (const statusRow of statusResult.rows) {
      const count = parseInt(statusRow.store_count);
      totalStores += count;

      switch (statusRow.status) {
        case 'out_of_stock':
          outOfStockStores += count;
          break;
        case 'low_stock':
          lowStockStores += count;
          break;
        case 'in_stock':
          inStockStores += count;
          break;
      }
    }

    // Skip if insufficient data (less than 3 stores reporting)
    if (totalStores < 3) {
      continue;
    }

    // Calculate percentage out of stock
    const outOfStockPercentage = (outOfStockStores / totalStores) * 100;

    // Determine if shortage exists (>= 50% out of stock)
    const isShortage = outOfStockPercentage >= 50;

    // Calculate severity
    let severity: 'moderate' | 'severe' | 'critical';
    if (outOfStockPercentage >= 90) {
      severity = 'critical';
    } else if (outOfStockPercentage >= 70) {
      severity = 'severe';
    } else {
      severity = 'moderate';
    }

    analyses.push({
      upc,
      productName: product_name || `UPC ${upc}`,
      region,
      totalStores,
      outOfStockStores,
      lowStockStores,
      inStockStores,
      outOfStockPercentage,
      severity,
      isShortage,
    });
  }

  return analyses;
}

/**
 * Calculate trend by comparing current to previous shortage
 */
async function calculateTrend(
  upc: string,
  region: string,
  currentPercentage: number
): Promise<'worsening' | 'stable' | 'improving'> {
  // Get most recent previous shortage record
  const previousResult = await pool.query(`
    SELECT out_of_stock_percentage
    FROM formula_shortages
    WHERE upc = $1
      AND region = $2
      AND status = 'active'
    ORDER BY detected_at DESC
    LIMIT 1
  `, [upc, region]);

  if (previousResult.rows.length === 0) {
    return 'stable'; // First detection, no trend
  }

  const previousPercentage = parseFloat(previousResult.rows[0].out_of_stock_percentage);
  const difference = currentPercentage - previousPercentage;

  // Threshold: 10% change to qualify as trend
  if (difference >= 10) {
    return 'worsening';
  } else if (difference <= -10) {
    return 'improving';
  } else {
    return 'stable';
  }
}

/**
 * Update formula_shortages table with current analysis
 */
async function updateShortages(analyses: ShortageAnalysis[]): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Mark all current shortages as resolved before inserting new ones
    await client.query(`
      UPDATE formula_shortages
      SET status = 'resolved',
          resolved_at = CURRENT_TIMESTAMP
      WHERE status = 'active'
    `);

    // Insert new shortage records
    for (const analysis of analyses) {
      if (!analysis.isShortage) {
        continue; // Only record actual shortages
      }

      const trend = await calculateTrend(
        analysis.upc,
        analysis.region,
        analysis.outOfStockPercentage
      );

      await client.query(`
        INSERT INTO formula_shortages (
          upc,
          product_name,
          region,
          severity,
          out_of_stock_percentage,
          total_stores_checked,
          trend,
          status,
          detected_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', CURRENT_TIMESTAMP)
      `, [
        analysis.upc,
        analysis.productName,
        analysis.region,
        analysis.severity,
        analysis.outOfStockPercentage,
        analysis.totalStores,
        trend,
      ]);

      console.log(`[SHORTAGE DETECTED] ${analysis.productName} (${analysis.upc})`);
      console.log(`  Region: ${analysis.region}`);
      console.log(`  Severity: ${analysis.severity.toUpperCase()}`);
      console.log(`  Out of Stock: ${analysis.outOfStockStores}/${analysis.totalStores} stores (${analysis.outOfStockPercentage.toFixed(1)}%)`);
      console.log(`  Trend: ${trend}`);
      console.log('');
    }

    await client.query('COMMIT');
    console.log(`✅ Shortage detection complete. ${analyses.filter(a => a.isShortage).length} shortages detected.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating shortages:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main function
 */
async function detectShortages(): Promise<void> {
  console.log('🔍 Starting formula shortage detection...');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Analyze Michigan region (can be extended to other regions later)
    const analyses = await analyzeFormulaAvailability('Michigan');

    console.log(`📊 Analysis Results:`);
    console.log(`Total formulas analyzed: ${analyses.length}`);
    console.log(`Shortages detected: ${analyses.filter(a => a.isShortage).length}`);
    console.log('');

    // Update database
    await updateShortages(analyses);

    // Print summary
    const shortages = analyses.filter(a => a.isShortage);
    if (shortages.length > 0) {
      console.log('⚠️  ACTIVE SHORTAGES:');
      shortages.forEach(s => {
        console.log(`  - ${s.productName}: ${s.severity} (${s.outOfStockPercentage.toFixed(1)}% out of stock)`);
      });
    } else {
      console.log('✅ No shortages detected.');
    }

  } catch (error) {
    console.error('❌ Shortage detection failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  detectShortages();
}

export { detectShortages, analyzeFormulaAvailability, calculateTrend };
