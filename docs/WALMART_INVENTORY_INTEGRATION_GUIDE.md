# Walmart Inventory API Integration Guide

Quick start guide for integrating Walmart inventory functionality into the WIC Benefits Assistant app.

## Prerequisites

1. **Walmart API Credentials**
   - Register at https://developer.walmart.com/
   - Create an application
   - Obtain Client ID and Client Secret
   - Approval typically takes 1-2 business days

2. **Environment Setup**
   ```bash
   cd src/services/inventory
   cp .env.example .env
   # Edit .env and add your credentials
   ```

## Quick Integration

### 1. Basic Inventory Check

```typescript
import { getInventoryManager } from '@/services/inventory';

// In your component or service
async function checkProductStock(upc: string, storeId: string) {
  const inventoryManager = getInventoryManager();

  try {
    const inventory = await inventoryManager.getInventory(upc, storeId);

    return {
      isInStock: inventory.status === 'in_stock',
      status: inventory.status,
      lastUpdated: inventory.lastUpdated,
      confidence: inventory.confidence,
    };
  } catch (error) {
    console.error('Failed to check inventory:', error);
    return { isInStock: false, status: 'unknown' };
  }
}
```

### 2. Shopping Cart Integration

```typescript
import { getInventoryManager } from '@/services/inventory';

async function validateShoppingCart(cart: CartItem[], storeId: string) {
  const manager = getInventoryManager();

  // Get all UPCs from cart
  const upcs = cart.map(item => item.upc);

  // Batch check inventory
  const inventories = await manager.getInventoryBatch(upcs, storeId);

  // Match with cart items
  const validation = cart.map((item, index) => ({
    ...item,
    inventory: inventories[index],
    isAvailable: inventories[index].status === 'in_stock',
  }));

  // Find unavailable items
  const unavailable = validation.filter(v => !v.isAvailable);

  return {
    allAvailable: unavailable.length === 0,
    unavailableItems: unavailable,
    validation,
  };
}
```

### 3. Formula Finder (Critical)

```typescript
import { getInventoryManager } from '@/services/inventory';

async function findFormulaStores(formulaUPC: string, nearbyStoreIds: string[]) {
  const manager = getInventoryManager();

  // Use formula-priority method (shorter cache TTL)
  const results = await manager.searchInventoryAcrossStores(
    formulaUPC,
    nearbyStoreIds
  );

  // Filter to stores with stock
  const inStockStores = [];
  for (const [storeId, inventory] of results) {
    if (inventory.status === 'in_stock') {
      inStockStores.push({
        storeId,
        lastUpdated: inventory.lastUpdated,
        confidence: inventory.confidence,
      });
    }
  }

  return inStockStores;
}
```

### 4. Real-time Formula Alerts

```typescript
import { getInventoryManager } from '@/services/inventory';

class FormulaAlertService {
  private intervalId?: NodeJS.Timeout;

  startMonitoring(
    formulaUPC: string,
    storeIds: string[],
    onFound: (storeId: string) => void
  ) {
    const manager = getInventoryManager();

    // Check every 15 minutes (formula priority)
    this.intervalId = setInterval(async () => {
      const results = await manager.searchInventoryAcrossStores(
        formulaUPC,
        storeIds
      );

      for (const [storeId, inventory] of results) {
        if (inventory.status === 'in_stock') {
          onFound(storeId);
        }
      }
    }, 15 * 60 * 1000); // 15 minutes
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
```

## React Native Components

### Inventory Status Badge

```typescript
import React from 'react';
import { View, Text } from 'react-native';
import { StockStatus } from '@/services/inventory';

interface InventoryBadgeProps {
  status: StockStatus;
}

export function InventoryBadge({ status }: InventoryBadgeProps) {
  const config = {
    in_stock: { color: '#22C55E', icon: '✓', text: 'In Stock' },
    low_stock: { color: '#F59E0B', icon: '⚠', text: 'Low Stock' },
    out_of_stock: { color: '#EF4444', icon: '✕', text: 'Out of Stock' },
    unknown: { color: '#9CA3AF', icon: '?', text: 'Unknown' },
  };

  const { color, icon, text } = config[status];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ color, fontSize: 16, marginRight: 4 }}>{icon}</Text>
      <Text style={{ color, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}
```

### Product Card with Inventory

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { getInventoryManager, Inventory } from '@/services/inventory';
import { InventoryBadge } from './InventoryBadge';

interface ProductCardProps {
  upc: string;
  name: string;
  storeId: string;
}

export function ProductCard({ upc, name, storeId }: ProductCardProps) {
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventory();
  }, [upc, storeId]);

  async function loadInventory() {
    try {
      const manager = getInventoryManager();
      const inv = await manager.getInventory(upc, storeId);
      setInventory(inv);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ padding: 16, backgroundColor: 'white', borderRadius: 8 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{name}</Text>

      {loading ? (
        <ActivityIndicator />
      ) : inventory ? (
        <>
          <InventoryBadge status={inventory.status} />
          <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Updated {inventory.lastUpdated.toLocaleTimeString()}
          </Text>
        </>
      ) : (
        <Text style={{ color: '#999' }}>Inventory unavailable</Text>
      )}
    </View>
  );
}
```

### Shopping List Validator Hook

```typescript
import { useState, useEffect } from 'react';
import { getInventoryManager, Inventory } from '@/services/inventory';

interface ShoppingListItem {
  upc: string;
  name: string;
  quantity: number;
}

export function useShoppingListInventory(
  items: ShoppingListItem[],
  storeId: string
) {
  const [inventories, setInventories] = useState<Map<string, Inventory>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (items.length === 0 || !storeId) return;

    checkInventory();
  }, [items, storeId]);

  async function checkInventory() {
    setLoading(true);
    setError(null);

    try {
      const manager = getInventoryManager();
      const upcs = items.map(item => item.upc);
      const results = await manager.getInventoryBatch(upcs, storeId);

      const inventoryMap = new Map();
      results.forEach((inv, index) => {
        inventoryMap.set(upcs[index], inv);
      });

      setInventories(inventoryMap);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  const allInStock = items.every(item => {
    const inv = inventories.get(item.upc);
    return inv?.status === 'in_stock';
  });

  const unavailableItems = items.filter(item => {
    const inv = inventories.get(item.upc);
    return inv?.status === 'out_of_stock';
  });

  return {
    inventories,
    loading,
    error,
    allInStock,
    unavailableItems,
    refresh: checkInventory,
  };
}
```

## Store Detection Integration

Combine with store detection from Task H series:

```typescript
import { getInventoryManager } from '@/services/inventory';
import { StoreDetectionService } from '@/services/StoreDetectionService';

async function checkInventoryAtCurrentStore(upc: string) {
  // Get current store from detection service
  const detectionService = new StoreDetectionService();
  const detectionResult = await detectionService.detectCurrentStore();

  if (!detectionResult.store) {
    throw new Error('No store detected');
  }

  // Check inventory at detected store
  const manager = getInventoryManager();
  const inventory = await manager.getInventory(
    upc,
    detectionResult.store.id
  );

  return {
    store: detectionResult.store,
    inventory,
    confidence: Math.min(
      detectionResult.confidence,
      inventory.confidence
    ),
  };
}
```

## Performance Best Practices

### 1. Cache Wisely

```typescript
// For frequently accessed products, rely on cache
const manager = getInventoryManager();

// First call: hits API
await manager.getInventory(upc, storeId);

// Subsequent calls within 30 min: use cache (instant)
await manager.getInventory(upc, storeId);
```

### 2. Batch When Possible

```typescript
// ❌ Bad: Multiple individual requests
for (const item of cart) {
  await manager.getInventory(item.upc, storeId);
}

// ✅ Good: Single batch request
const upcs = cart.map(item => item.upc);
await manager.getInventoryBatch(upcs, storeId);
```

### 3. Handle Errors Gracefully

```typescript
import { ProductNotFoundError, RateLimitError } from '@/services/inventory';

try {
  const inventory = await manager.getInventory(upc, storeId);
  // Use inventory
} catch (error) {
  if (error instanceof ProductNotFoundError) {
    // Product not in catalog - show fallback UI
    return null;
  } else if (error instanceof RateLimitError) {
    // Rate limited - show cached data or retry message
    return getCachedInventory(upc, storeId);
  } else {
    // Other error - log and show unknown status
    console.error(error);
    return { status: 'unknown' };
  }
}
```

### 4. Monitor Performance

```typescript
// Add monitoring wrapper
async function monitoredInventoryCheck(upc: string, storeId: string) {
  const start = Date.now();
  const manager = getInventoryManager();

  try {
    const inventory = await manager.getInventory(upc, storeId);
    const duration = Date.now() - start;

    // Log metrics
    console.log(`Inventory check: ${duration}ms (${inventory.source})`);

    if (duration > 1000) {
      console.warn('Slow inventory check detected');
    }

    return inventory;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`Inventory check failed after ${duration}ms:`, error);
    throw error;
  }
}
```

## Testing

### Unit Test Example

```typescript
import { WalmartInventoryService } from '@/services/inventory';

describe('WalmartInventoryService', () => {
  it('should return in_stock for available products', async () => {
    const service = new WalmartInventoryService({
      clientId: 'test_id',
      clientSecret: 'test_secret',
      cacheEnabled: false,
    });

    // Mock the API client
    // ... setup mocks ...

    const inventory = await service.getInventory('12345', 'walmart-1');

    expect(inventory.status).toBe('in_stock');
    expect(inventory.confidence).toBeGreaterThan(0);
  });
});
```

### Integration Test Example

```typescript
// Requires real Walmart API credentials in test .env
import { getInventoryManager } from '@/services/inventory';

describe('Walmart Integration', () => {
  it('should fetch real inventory data', async () => {
    const manager = getInventoryManager();

    // Use a known product (Similac formula)
    const inventory = await manager.getInventory(
      '055000012345',
      'walmart-1234'
    );

    expect(inventory).toBeDefined();
    expect(inventory.status).toMatch(/in_stock|out_of_stock|unknown/);
    expect(inventory.lastUpdated).toBeInstanceOf(Date);
  }, 10000); // 10s timeout
});
```

## Troubleshooting

### Problem: Authentication fails

```typescript
// Check credentials are set
const config = getInventoryConfig();
const walmartConfig = config.getWalmartConfig();

if (!walmartConfig) {
  console.error('Walmart API not configured');
  // Guide user to set up credentials
}
```

### Problem: Rate limits exceeded

```typescript
// Check rate limiter status
const manager = getInventoryManager();
const stats = manager.getRateLimiterStats('walmart');

if (stats && stats.percentAvailable < 20) {
  console.warn('Running low on API quota');
  // Enable more aggressive caching or reduce requests
}
```

### Problem: Stale cache data

```typescript
// Force cache refresh
const manager = getInventoryManager();
manager.clearCaches(); // Clear all caches

// Or get service and clear its cache
const service = manager.getService('walmart');
if (service && 'clearCache' in service) {
  (service as any).clearCache();
}
```

## Production Checklist

- [ ] Walmart API credentials obtained and verified
- [ ] Environment variables configured in production
- [ ] Error monitoring set up (Sentry, etc.)
- [ ] Performance monitoring configured
- [ ] Cache TTLs tuned for your use case
- [ ] Rate limits monitored and alerted
- [ ] Fallback UI for API failures
- [ ] User-facing error messages reviewed
- [ ] Formula priority handling tested
- [ ] Cross-store search tested with multiple stores

## Support

- **Documentation**: `/src/services/inventory/README.md`
- **Examples**: `/src/services/inventory/examples/basic-usage.ts`
- **Research**: `/docs/research/retailer-api-research.md`
- **Implementation**: `/docs/TASK_I1.2_IMPLEMENTATION_SUMMARY.md`

## Next Steps

After integrating Walmart:
1. Implement UI components (Task I2.x)
2. Add Kroger integration (Task I1.3)
3. Build web scraping fallback (Task I1.4)
4. Implement formula alerts (Task A4.x)
5. Add crowdsourced data (Task K.x)

---

**Last Updated:** 2026-01-10
**Version:** 1.0
