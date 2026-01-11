/**
 * Formula Tracking Examples
 *
 * Demonstrates specialized functionality for infant formula tracking,
 * which is critical for WIC participants during shortage situations.
 */

import { getInventoryManager } from '../InventoryManager';
import { Inventory } from '../../../types/inventory.types';

/**
 * Formula UPCs for common WIC-approved brands
 */
const FORMULA_UPCS = {
  similac_pro_advance: '055000012345',
  similac_pro_sensitive: '055000012444',
  enfamil_infant: '030000011000',
  enfamil_gentlease: '030000011017',
  gerber_good_start: '015000034030',
};

/**
 * Example 1: Real-time formula availability dashboard
 */
async function checkFormulaAvailabilityDashboard(userStoreIds: string[]) {
  const manager = getInventoryManager();

  console.log('🍼 WIC Formula Availability Dashboard\n');
  console.log('=' .repeat(60));

  for (const [brandName, upc] of Object.entries(FORMULA_UPCS)) {
    console.log(`\n${brandName.replace(/_/g, ' ').toUpperCase()}`);
    console.log('-'.repeat(60));

    try {
      const results = await manager.searchInventoryAcrossStores(upc, userStoreIds);

      let inStockCount = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;

      for (const [storeId, inventory] of results) {
        const statusIcon =
          inventory.status === 'in_stock' ? '✅' :
          inventory.status === 'low_stock' ? '⚠️' :
          inventory.status === 'out_of_stock' ? '❌' : '❓';

        console.log(`  ${statusIcon} Store ${storeId}: ${inventory.status}`);

        if (inventory.status === 'in_stock') inStockCount++;
        else if (inventory.status === 'low_stock') lowStockCount++;
        else if (inventory.status === 'out_of_stock') outOfStockCount++;
      }

      console.log(`\n  Summary: ${inStockCount} in stock, ${lowStockCount} low, ${outOfStockCount} out`);

      // Alert if shortage detected
      const availabilityRate = inStockCount / userStoreIds.length;
      if (availabilityRate < 0.3) {
        console.log('  🚨 SHORTAGE ALERT: Limited availability across stores!');
      }

    } catch (error) {
      console.error(`  ❌ Error checking ${brandName}:`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Example 2: Cross-store formula search with distance ranking
 */
interface StoreWithDistance {
  id: string;
  name: string;
  distance: number;
  lat: number;
  lng: number;
}

async function findNearestFormulaInStock(
  formulaUPC: string,
  stores: StoreWithDistance[]
): Promise<StoreWithDistance | null> {
  const manager = getInventoryManager();

  console.log('🔍 Searching for formula across nearby stores...\n');

  // Sort stores by distance first
  const sortedStores = [...stores].sort((a, b) => a.distance - b.distance);
  const storeIds = sortedStores.map(s => s.id);

  // Check inventory across all stores
  const results = await manager.searchInventoryAcrossStores(formulaUPC, storeIds);

  // Find closest store with stock
  for (const store of sortedStores) {
    const inventory = results.get(store.id);

    if (inventory && inventory.status === 'in_stock') {
      console.log('✅ Formula found!');
      console.log(`   Store: ${store.name}`);
      console.log(`   Distance: ${store.distance.toFixed(1)} miles`);
      console.log(`   Confidence: ${inventory.confidence}%`);
      console.log(`   Last updated: ${inventory.lastUpdated.toLocaleString()}`);

      return store;
    }
  }

  console.log('❌ Formula not currently in stock at any nearby location');
  console.log('💡 Recommended actions:');
  console.log('   • Check again in 1-2 hours');
  console.log('   • Enable real-time alerts');
  console.log('   • Consider alternative brands');

  return null;
}

/**
 * Example 3: Formula shortage detection algorithm
 */
async function detectFormulaShortage(
  formulaUPCs: string[],
  regionStores: string[]
): Promise<{
  isShortage: boolean;
  severity: 'none' | 'moderate' | 'severe' | 'critical';
  availableStores: number;
  totalStores: number;
  recommendations: string[];
}> {
  const manager = getInventoryManager();

  console.log('🔍 Analyzing regional formula shortage...\n');

  let totalChecks = 0;
  let inStockChecks = 0;

  // Check all formula types across all stores
  for (const upc of formulaUPCs) {
    const results = await manager.searchInventoryAcrossStores(upc, regionStores);

    for (const [storeId, inventory] of results) {
      totalChecks++;
      if (inventory.status === 'in_stock') {
        inStockChecks++;
      }
    }
  }

  const availabilityRate = inStockChecks / totalChecks;
  const availableStores = Math.round(availabilityRate * regionStores.length);

  console.log(`Availability Rate: ${(availabilityRate * 100).toFixed(1)}%`);
  console.log(`Available at ~${availableStores} out of ${regionStores.length} stores\n`);

  // Determine shortage severity
  let severity: 'none' | 'moderate' | 'severe' | 'critical' = 'none';
  let isShortage = false;
  const recommendations: string[] = [];

  if (availabilityRate >= 0.7) {
    severity = 'none';
    console.log('✅ No shortage detected');
  } else if (availabilityRate >= 0.5) {
    severity = 'moderate';
    isShortage = true;
    console.log('⚠️  Moderate shortage detected');
    recommendations.push('Monitor daily for stock updates');
    recommendations.push('Purchase when available');
  } else if (availabilityRate >= 0.3) {
    severity = 'severe';
    isShortage = true;
    console.log('🚨 Severe shortage detected');
    recommendations.push('Enable immediate push alerts');
    recommendations.push('Check multiple stores daily');
    recommendations.push('Consider approved alternatives');
    recommendations.push('Contact WIC office for assistance');
  } else {
    severity = 'critical';
    isShortage = true;
    console.log('🔴 CRITICAL shortage detected');
    recommendations.push('URGENT: Contact WIC office immediately');
    recommendations.push('Ask about emergency formula options');
    recommendations.push('Check hospital/clinic resources');
    recommendations.push('Enable alerts for ALL approved brands');
  }

  return {
    isShortage,
    severity,
    availableStores,
    totalStores: regionStores.length,
    recommendations,
  };
}

/**
 * Example 4: Intelligent formula alert system
 */
class FormulaAlertService {
  private manager = getInventoryManager();
  private alertIntervalMs = 15 * 60 * 1000; // 15 minutes
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private formulaUPCs: string[],
    private monitoredStores: string[],
    private onFormulaAvailable: (upc: string, storeId: string, inventory: Inventory) => void
  ) {}

  /**
   * Start monitoring for formula availability
   */
  start() {
    console.log('🔔 Formula alert system started');
    console.log(`   Monitoring ${this.formulaUPCs.length} formula(s)`);
    console.log(`   Across ${this.monitoredStores.length} store(s)`);
    console.log(`   Check interval: ${this.alertIntervalMs / 1000 / 60} minutes\n`);

    // Initial check
    this.checkAvailability();

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.checkAvailability();
    }, this.alertIntervalMs);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🔕 Formula alert system stopped');
    }
  }

  /**
   * Check availability and trigger alerts
   */
  private async checkAvailability() {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] Checking formula availability...`);

    for (const upc of this.formulaUPCs) {
      try {
        const results = await this.manager.searchInventoryAcrossStores(
          upc,
          this.monitoredStores
        );

        for (const [storeId, inventory] of results) {
          if (inventory.status === 'in_stock') {
            // Trigger alert callback
            this.onFormulaAvailable(upc, storeId, inventory);
          }
        }
      } catch (error) {
        console.error(`Error checking formula ${upc}:`, error);
      }
    }
  }

  /**
   * Update monitoring parameters
   */
  updateMonitoring(upcs?: string[], stores?: string[], intervalMs?: number) {
    if (upcs) this.formulaUPCs = upcs;
    if (stores) this.monitoredStores = stores;
    if (intervalMs) {
      this.alertIntervalMs = intervalMs;

      // Restart with new interval
      if (this.intervalId) {
        this.stop();
        this.start();
      }
    }
  }
}

/**
 * Example 5: Formula alternative recommendation engine
 */
async function recommendFormulaAlternatives(
  preferredUPC: string,
  userStores: string[]
): Promise<{
  upc: string;
  name: string;
  availableStores: string[];
  reason: string;
}[]> {
  const manager = getInventoryManager();

  // Define alternative formulas by category
  const alternatives: { [key: string]: { upcs: string[]; names: string[] } } = {
    '055000012345': { // Similac Pro-Advance
      upcs: ['055000012444', '030000011000', '015000034030'],
      names: ['Similac Pro-Sensitive', 'Enfamil Infant', 'Gerber Good Start'],
    },
    '030000011000': { // Enfamil Infant
      upcs: ['055000012345', '030000011017', '015000034030'],
      names: ['Similac Pro-Advance', 'Enfamil Gentlease', 'Gerber Good Start'],
    },
  };

  const alternativeData = alternatives[preferredUPC];
  if (!alternativeData) {
    return [];
  }

  console.log('🔄 Finding alternative formulas...\n');

  const recommendations: {
    upc: string;
    name: string;
    availableStores: string[];
    reason: string;
  }[] = [];

  for (let i = 0; i < alternativeData.upcs.length; i++) {
    const altUPC = alternativeData.upcs[i];
    const altName = alternativeData.names[i];

    const results = await manager.searchInventoryAcrossStores(altUPC, userStores);
    const availableStores: string[] = [];

    for (const [storeId, inventory] of results) {
      if (inventory.status === 'in_stock') {
        availableStores.push(storeId);
      }
    }

    if (availableStores.length > 0) {
      recommendations.push({
        upc: altUPC,
        name: altName,
        availableStores,
        reason: 'WIC-approved alternative with similar nutrition profile',
      });

      console.log(`✅ ${altName}`);
      console.log(`   Available at ${availableStores.length} store(s)`);
      console.log(`   UPC: ${altUPC}\n`);
    }
  }

  if (recommendations.length === 0) {
    console.log('⚠️  No alternatives currently in stock');
    console.log('💡 Contact your WIC office for guidance\n');
  }

  return recommendations;
}

/**
 * Example 6: Formula inventory history tracking
 */
class FormulaInventoryTracker {
  private history: Map<string, { timestamp: Date; inventory: Inventory }[]> = new Map();

  /**
   * Record an inventory check
   */
  record(upc: string, storeId: string, inventory: Inventory) {
    const key = `${upc}:${storeId}`;
    const records = this.history.get(key) || [];

    records.push({
      timestamp: new Date(),
      inventory,
    });

    // Keep only last 100 records per product/store
    if (records.length > 100) {
      records.shift();
    }

    this.history.set(key, records);
  }

  /**
   * Detect stock-out-to-in-stock transition
   */
  detectRestock(upc: string, storeId: string): boolean {
    const key = `${upc}:${storeId}`;
    const records = this.history.get(key);

    if (!records || records.length < 2) {
      return false;
    }

    const previous = records[records.length - 2];
    const current = records[records.length - 1];

    return (
      previous.inventory.status === 'out_of_stock' &&
      current.inventory.status === 'in_stock'
    );
  }

  /**
   * Calculate average time out of stock
   */
  getAverageOutOfStockDuration(upc: string, storeId: string): number | null {
    const key = `${upc}:${storeId}`;
    const records = this.history.get(key);

    if (!records || records.length < 10) {
      return null; // Need more data
    }

    let totalOutDuration = 0;
    let outPeriods = 0;
    let outStart: Date | null = null;

    for (const record of records) {
      if (record.inventory.status === 'out_of_stock' && !outStart) {
        outStart = record.timestamp;
      } else if (record.inventory.status === 'in_stock' && outStart) {
        const duration = record.timestamp.getTime() - outStart.getTime();
        totalOutDuration += duration;
        outPeriods++;
        outStart = null;
      }
    }

    if (outPeriods === 0) {
      return null;
    }

    // Return average in hours
    return (totalOutDuration / outPeriods) / (1000 * 60 * 60);
  }

  /**
   * Get stock trend (improving/worsening/stable)
   */
  getStockTrend(upc: string, storeId: string): 'improving' | 'worsening' | 'stable' | 'unknown' {
    const key = `${upc}:${storeId}`;
    const records = this.history.get(key);

    if (!records || records.length < 5) {
      return 'unknown';
    }

    const recent = records.slice(-5);
    const inStockCount = recent.filter(r => r.inventory.status === 'in_stock').length;

    if (inStockCount >= 4) return 'improving';
    if (inStockCount <= 1) return 'worsening';
    return 'stable';
  }
}

// Export examples
export {
  checkFormulaAvailabilityDashboard,
  findNearestFormulaInStock,
  detectFormulaShortage,
  FormulaAlertService,
  recommendFormulaAlternatives,
  FormulaInventoryTracker,
  FORMULA_UPCS,
};

// Example usage
if (require.main === module) {
  console.log('=== Formula Tracking Examples ===\n');

  (async () => {
    const testStores = ['walmart-1234', 'walmart-5678', 'walmart-9012'];

    // Example: Check availability dashboard
    // await checkFormulaAvailabilityDashboard(testStores);

    // Example: Detect shortage
    // const shortage = await detectFormulaShortage(
    //   Object.values(FORMULA_UPCS),
    //   testStores
    // );
    // console.log('\nRecommendations:');
    // shortage.recommendations.forEach(rec => console.log(`  • ${rec}`));

    // Example: Setup alerts
    // const alertService = new FormulaAlertService(
    //   [FORMULA_UPCS.similac_pro_advance],
    //   testStores,
    //   (upc, storeId, inventory) => {
    //     console.log(`🚨 ALERT: Formula ${upc} in stock at ${storeId}!`);
    //   }
    // );
    // alertService.start();
  })();
}
