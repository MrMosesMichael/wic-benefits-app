/**
 * Basic Usage Examples for Walmart Inventory API
 *
 * This file demonstrates common usage patterns for the inventory service
 */

import { getInventoryManager } from '../InventoryManager';
import { ProductNotFoundError, RateLimitError } from '../../../types/inventory.types';

/**
 * Example 1: Simple inventory check
 */
async function checkProductInventory() {
  const manager = getInventoryManager();

  try {
    const inventory = await manager.getInventory(
      '055000012345',  // Similac Pro-Advance UPC
      'walmart-1234'   // Walmart store ID
    );

    console.log('Product Status:', inventory.status);
    console.log('Last Updated:', inventory.lastUpdated);
    console.log('Confidence:', inventory.confidence);

    // Display to user based on status
    switch (inventory.status) {
      case 'in_stock':
        console.log('✅ In stock at this location');
        break;
      case 'low_stock':
        console.log('⚠️  Low stock - may want to call ahead');
        break;
      case 'out_of_stock':
        console.log('❌ Out of stock - check nearby stores');
        break;
      case 'unknown':
        console.log('❓ Availability unknown');
        break;
    }
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      console.log('This product is not available at Walmart');
    } else {
      console.error('Error checking inventory:', error);
    }
  }
}

/**
 * Example 2: Check multiple products (shopping list)
 */
async function checkShoppingList() {
  const manager = getInventoryManager();
  const storeId = 'walmart-1234';

  const shoppingList = [
    { upc: '055000012345', name: 'Similac Pro-Advance' },
    { upc: '078742101286', name: 'Whole Milk' },
    { upc: '016000119468', name: 'Cheerios' },
    { upc: '075450104547', name: 'Eggs' },
  ];

  console.log('Checking inventory for shopping list...\n');

  const upcs = shoppingList.map(item => item.upc);
  const inventories = await manager.getInventoryBatch(upcs, storeId);

  // Match results with product names
  const results = shoppingList.map((item, index) => ({
    ...item,
    inventory: inventories[index],
  }));

  // Display results
  results.forEach(({ name, inventory }) => {
    const statusIcon = inventory.status === 'in_stock' ? '✅' :
                       inventory.status === 'low_stock' ? '⚠️' :
                       inventory.status === 'out_of_stock' ? '❌' : '❓';

    console.log(`${statusIcon} ${name}: ${inventory.status}`);
  });

  // Check if everything is in stock
  const allInStock = results.every(r => r.inventory.status === 'in_stock');

  if (allInStock) {
    console.log('\n✅ Everything on your list is in stock!');
  } else {
    const outOfStock = results.filter(r => r.inventory.status === 'out_of_stock');
    console.log(`\n⚠️  ${outOfStock.length} items may be unavailable`);
  }
}

/**
 * Example 3: Find formula across multiple stores (critical use case)
 */
async function findFormulaInStock() {
  const manager = getInventoryManager();
  const formulaUPC = '055000012345'; // Similac Pro-Advance

  // Nearby stores
  const nearbyStores = [
    { id: 'walmart-1234', name: 'Walmart Supercenter - Main St', distance: 2.1 },
    { id: 'walmart-5678', name: 'Walmart - Oak Ave', distance: 4.5 },
    { id: 'walmart-9012', name: 'Walmart - Highway 50', distance: 7.2 },
  ];

  console.log('🔍 Searching for formula across stores...\n');

  const storeIds = nearbyStores.map(s => s.id);
  const results = await manager.searchInventoryAcrossStores(formulaUPC, storeIds);

  // Find stores with stock
  const inStockStores = nearbyStores
    .filter(store => {
      const inventory = results.get(store.id);
      return inventory && inventory.status === 'in_stock';
    })
    .sort((a, b) => a.distance - b.distance); // Sort by distance

  if (inStockStores.length > 0) {
    console.log('✅ Formula found at:');
    inStockStores.forEach(store => {
      const inventory = results.get(store.id)!;
      console.log(`   ${store.name}`);
      console.log(`   Distance: ${store.distance} miles`);
      console.log(`   Updated: ${inventory.lastUpdated.toLocaleTimeString()}`);
      console.log();
    });
  } else {
    console.log('❌ Formula not currently in stock at nearby locations');
    console.log('💡 Try checking again later or enable alerts');
  }
}

/**
 * Example 4: Real-time formula alert system
 */
async function setupFormulaAlerts() {
  const manager = getInventoryManager();
  const formulaUPC = '055000012345';
  const monitoredStores = ['walmart-1234', 'walmart-5678'];

  console.log('🔔 Monitoring formula availability...\n');

  // Check every 15 minutes (formula has priority)
  setInterval(async () => {
    const results = await manager.searchInventoryAcrossStores(
      formulaUPC,
      monitoredStores
    );

    for (const [storeId, inventory] of results) {
      if (inventory.status === 'in_stock') {
        // Send push notification to user
        console.log(`🚨 ALERT: Formula in stock at ${storeId}!`);
        // await sendPushNotification(userId, { formulaUPC, storeId });
      }
    }
  }, 15 * 60 * 1000); // 15 minutes
}

/**
 * Example 5: Error handling and graceful degradation
 */
async function robustInventoryCheck(upc: string, storeId: string) {
  const manager = getInventoryManager();

  try {
    const inventory = await manager.getInventory(upc, storeId);

    // Check data freshness
    const ageMinutes = (Date.now() - inventory.lastUpdated.getTime()) / 1000 / 60;

    if (ageMinutes > 60) {
      console.log('⚠️  Inventory data may be stale (over 1 hour old)');
    }

    // Check confidence level
    if (inventory.confidence < 50) {
      console.log('⚠️  Low confidence in inventory data');
    }

    return inventory;
  } catch (error) {
    if (error instanceof RateLimitError) {
      console.log(`⏳ Rate limited. Retrying in ${error.retryAfter} seconds...`);

      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, error.retryAfter! * 1000));
      return robustInventoryCheck(upc, storeId);
    } else if (error instanceof ProductNotFoundError) {
      console.log('ℹ️  Product not found in catalog');

      // Return unknown status instead of throwing
      return {
        storeId,
        upc,
        status: 'unknown' as const,
        lastUpdated: new Date(),
        source: 'api' as const,
        confidence: 0,
      };
    } else {
      console.error('❌ Unexpected error:', error);
      throw error;
    }
  }
}

/**
 * Example 6: Performance monitoring
 */
async function monitorPerformance() {
  const manager = getInventoryManager();

  // Check rate limiter status
  const walmartStats = manager.getRateLimiterStats('walmart');
  if (walmartStats) {
    console.log('Rate Limiter Status:');
    console.log(`  Tokens available: ${walmartStats.tokens}/${walmartStats.maxTokens}`);
    console.log(`  Capacity: ${walmartStats.percentAvailable.toFixed(1)}%`);

    if (walmartStats.percentAvailable < 20) {
      console.log('  ⚠️  Low capacity - consider reducing request rate');
    }
  }

  // Check service health
  const health = await manager.getHealthStatus();
  console.log('\nService Health:');
  health.forEach((isHealthy, retailer) => {
    console.log(`  ${retailer}: ${isHealthy ? '✅ healthy' : '❌ unhealthy'}`);
  });

  // Measure request latency
  const start = Date.now();
  await manager.getInventory('055000012345', 'walmart-1234');
  const latency = Date.now() - start;

  console.log(`\nRequest Latency: ${latency}ms`);

  if (latency > 500) {
    console.log('⚠️  High latency detected');
  }
}

/**
 * Example 7: Cache management
 */
async function manageCaches() {
  const manager = getInventoryManager();
  const service = manager.getService('walmart');

  if (service && 'getCacheStats' in service) {
    // Get cache stats
    const stats = (service as any).getCacheStats();
    console.log('Cache Statistics:');
    console.log(`  Entries: ${stats.size}`);
    console.log(`  TTL: ${stats.ttlMinutes} minutes`);
    console.log(`  Enabled: ${stats.enabled}`);

    // Clear expired entries
    if ('clearExpiredCache' in service) {
      (service as any).clearExpiredCache();
      console.log('✅ Cleared expired cache entries');
    }
  }

  // Clear all caches if needed
  // manager.clearCaches();
}

// Export examples
export {
  checkProductInventory,
  checkShoppingList,
  findFormulaInStock,
  setupFormulaAlerts,
  robustInventoryCheck,
  monitorPerformance,
  manageCaches,
};

// Run examples if executed directly
if (require.main === module) {
  console.log('=== Walmart Inventory API Examples ===\n');

  (async () => {
    // Uncomment to run specific examples

    // await checkProductInventory();
    // await checkShoppingList();
    // await findFormulaInStock();
    // await robustInventoryCheck('055000012345', 'walmart-1234');
    // await monitorPerformance();
    // await manageCaches();
  })();
}
