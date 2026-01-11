# Inventory Service - Walmart API Integration

This module provides real-time inventory tracking for WIC-eligible products at participating retailers, starting with Walmart.

## Features

- **Walmart API Integration**: OAuth 2.0 authentication and product lookup
- **Rate Limiting**: Token bucket algorithm to respect API limits
- **Caching**: In-memory caching to reduce API calls by 80%+
- **Retry Logic**: Exponential backoff for failed requests
- **Error Handling**: Comprehensive error types and graceful degradation
- **Type Safety**: Full TypeScript support

## Quick Start

### 1. Environment Setup

Create a `.env` file with your Walmart API credentials:

```env
WALMART_CLIENT_ID=your_client_id_here
WALMART_CLIENT_SECRET=your_client_secret_here
WALMART_API_KEY=your_api_key_here  # Optional
```

**Getting Walmart API Credentials:**
1. Register at https://developer.walmart.com/
2. Create an application
3. Copy your Client ID and Client Secret
4. Approval typically takes 1-2 business days

### 2. Basic Usage

```typescript
import { getInventoryManager } from '@/services/inventory';

// Get the inventory manager (singleton)
const inventoryManager = getInventoryManager();

// Get inventory for a product at a specific store
const inventory = await inventoryManager.getInventory(
  '055000012345',  // UPC code
  'walmart-1234'   // Store ID
);

console.log(`Stock status: ${inventory.status}`);
console.log(`Last updated: ${inventory.lastUpdated}`);
console.log(`Confidence: ${inventory.confidence}%`);
```

### 3. Batch Requests

```typescript
// Get inventory for multiple products at once
const upcs = [
  '055000012345',  // Formula
  '078742101286',  // Milk
  '016000119468',  // Cereal
];

const inventories = await inventoryManager.getInventoryBatch(
  upcs,
  'walmart-1234'
);

inventories.forEach(inv => {
  console.log(`${inv.upc}: ${inv.status}`);
});
```

### 4. Formula Priority Tracking

```typescript
// Formula products get priority treatment
const formulaInventory = await inventoryManager.getFormulaInventory(
  '055000012345',
  'walmart-1234'
);

if (formulaInventory.status === 'in_stock') {
  console.log('Formula available! Alert user.');
}
```

### 5. Cross-Store Search

```typescript
// Search for a product across multiple stores
const storeIds = ['walmart-1234', 'walmart-5678', 'walmart-9012'];

const results = await inventoryManager.searchInventoryAcrossStores(
  '055000012345',
  storeIds
);

// Find stores with stock
const inStockStores = Array.from(results.entries())
  .filter(([_, inv]) => inv.status === 'in_stock')
  .map(([storeId, _]) => storeId);

console.log(`In stock at ${inStockStores.length} stores`);
```

## Advanced Usage

### Custom Configuration

```typescript
import { InventoryManager, InventoryConfigManager } from '@/services/inventory';

// Create custom configuration
const configManager = InventoryConfigManager.getInstance({
  cache: {
    enabled: true,
    defaultTTLMinutes: 30,
    formulaTTLMinutes: 15,  // Shorter TTL for formula
  },
  rateLimits: {
    walmart: {
      requestsPerDay: 5000,
      burstSize: 10,
    },
  },
  retryConfig: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
  },
});

// Create manager with custom config
const manager = new InventoryManager({ configManager });
```

### Direct Service Usage

```typescript
import { WalmartInventoryService } from '@/services/inventory';

// Use Walmart service directly
const walmartService = new WalmartInventoryService({
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  cacheEnabled: true,
  cacheTTLMinutes: 30,
});

const inventory = await walmartService.getInventory(
  '055000012345',
  'walmart-1234'
);
```

### Error Handling

```typescript
import {
  getInventoryManager,
  ProductNotFoundError,
  RateLimitError,
  AuthenticationError,
  InventoryAPIError,
} from '@/services/inventory';

const manager = getInventoryManager();

try {
  const inventory = await manager.getInventory(upc, storeId);
  // Handle inventory
} catch (error) {
  if (error instanceof ProductNotFoundError) {
    console.log('Product not found in Walmart catalog');
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter} seconds`);
  } else if (error instanceof AuthenticationError) {
    console.error('Failed to authenticate with Walmart API');
  } else if (error instanceof InventoryAPIError) {
    console.error(`API error: ${error.code}`);
  }
}
```

### Rate Limiter Stats

```typescript
const manager = getInventoryManager();

// Check rate limiter status
const stats = manager.getRateLimiterStats('walmart');
console.log(`Tokens available: ${stats.tokens}/${stats.maxTokens}`);
console.log(`Capacity: ${stats.percentAvailable.toFixed(1)}%`);
```

### Cache Management

```typescript
const manager = getInventoryManager();

// Clear all caches
manager.clearCaches();

// Check if a service is enabled
if (manager.isRetailerEnabled('walmart')) {
  console.log('Walmart service is enabled');
}

// Get health status
const health = await manager.getHealthStatus();
health.forEach((isHealthy, retailer) => {
  console.log(`${retailer}: ${isHealthy ? 'healthy' : 'unhealthy'}`);
});
```

## API Reference

### Inventory Types

```typescript
type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';

interface Inventory {
  storeId: string;
  upc: string;
  status: StockStatus;
  quantity?: number;
  quantityRange?: 'few' | 'some' | 'plenty';
  aisle?: string;
  lastUpdated: Date;
  source: 'api' | 'scrape' | 'crowdsourced' | 'manual';
  confidence: number; // 0-100
  reportCount?: number;
}
```

### InventoryManager Methods

- `getInventory(upc, storeId)` - Get inventory for single product
- `getInventoryBatch(upcs, storeId)` - Get inventory for multiple products
- `getFormulaInventory(upc, storeId)` - Priority request for formula
- `searchInventoryAcrossStores(upc, storeIds)` - Search across stores
- `getEnabledRetailers()` - Get list of enabled retailers
- `isRetailerEnabled(retailer)` - Check if retailer is enabled
- `getRateLimiterStats(retailer)` - Get rate limit statistics
- `clearCaches()` - Clear all service caches
- `getHealthStatus()` - Get health status of all services

## Architecture

### Components

```
inventory/
├── InventoryManager.ts          # Main orchestrator
├── InventoryConfig.ts            # Configuration management
├── walmart/
│   ├── WalmartApiClient.ts      # Low-level API client
│   └── WalmartInventoryService.ts # High-level service
└── utils/
    ├── RateLimiter.ts           # Token bucket rate limiting
    └── RetryHandler.ts          # Exponential backoff retry
```

### Data Flow

```
User Request
    ↓
InventoryManager
    ↓
Rate Limiter (check tokens)
    ↓
WalmartInventoryService
    ↓
Check Cache (if enabled)
    ↓
WalmartApiClient
    ↓
OAuth Authentication
    ↓
Walmart API Request
    ↓
Retry Handler (on failure)
    ↓
Response Normalization
    ↓
Cache Result
    ↓
Return Inventory
```

## Performance

### Caching Strategy

- **Default products**: 30 minute cache TTL
- **Formula products**: 15 minute cache TTL (critical)
- **Cache reduction**: 80%+ fewer API calls with caching enabled

### Rate Limiting

- **Walmart free tier**: 5000 requests/day
- **Burst size**: 10 concurrent requests
- **Automatic backoff**: Token bucket algorithm prevents exceeding limits

### Retry Logic

- **Max attempts**: 3
- **Initial delay**: 1 second
- **Max delay**: 30 seconds
- **Backoff**: Exponential with jitter

## Cost Optimization

### Walmart API Costs

| Tier | Requests/Day | Cost | Best For |
|------|--------------|------|----------|
| Free | 5,000 | $0 | Development, small deployments |
| Paid | Custom | $500-2000/mo | Production at scale |

### Optimization Strategies

1. **Enable caching**: Reduces API calls by 80%+
2. **Batch requests**: Combine multiple UPCs when possible
3. **Smart TTLs**: Longer cache for shelf-stable, shorter for formula
4. **Regional focus**: Only query stores in active user areas
5. **Off-peak sync**: Schedule bulk updates during low-traffic hours

## Monitoring

### Key Metrics

- **API Success Rate**: Should be > 99%
- **Cache Hit Rate**: Target 80%+ with caching enabled
- **P95 Latency**: Should be < 500ms
- **Rate Limit Usage**: Stay below 80% of daily limit

### Logging

```typescript
// Enable debug logging
process.env.DEBUG = 'inventory:*';

// Logs include:
// - Authentication attempts
// - Cache hits/misses
// - Rate limit warnings
// - Retry attempts
// - API errors
```

## Testing

### Unit Tests

```bash
npm test -- src/services/inventory
```

### Integration Tests

```bash
# Requires valid Walmart API credentials in .env
npm test -- src/services/inventory --integration
```

### Manual Testing

```typescript
import { getInventoryManager } from '@/services/inventory';

// Test with a known WIC product UPC
const testUPC = '055000012345'; // Similac formula
const testStore = 'walmart-1234';

const manager = getInventoryManager();
const result = await manager.getInventory(testUPC, testStore);

console.log(JSON.stringify(result, null, 2));
```

## Troubleshooting

### Authentication Errors

**Problem**: `AuthenticationError: Authentication failed`

**Solution**:
- Verify `WALMART_CLIENT_ID` and `WALMART_CLIENT_SECRET` are correct
- Check that your Walmart API application is approved
- Ensure credentials are not expired

### Rate Limit Errors

**Problem**: `RateLimitError: Rate limit exceeded`

**Solution**:
- Enable caching to reduce API calls
- Use batch requests instead of individual requests
- Consider upgrading to paid tier if consistently hitting limits

### Product Not Found

**Problem**: `ProductNotFoundError: Product not found`

**Solution**:
- Verify UPC is correct (check digit included)
- Product may not be in Walmart's catalog
- Try searching by name using `searchProducts()`

### Stale Data

**Problem**: Inventory data seems outdated

**Solution**:
- Clear cache: `manager.clearCaches()`
- Reduce cache TTL in configuration
- For formula, use `getFormulaInventory()` which has shorter TTL

## Next Steps

### Planned Enhancements (Future Tasks)

- **Task I1.3**: Kroger API integration
- **Task I1.4**: Web scraping fallback for non-API retailers
- **Task I1.5**: Enhanced data normalization layer
- **Task I2.x**: UI components for displaying inventory
- **Task K.x**: Crowdsourced inventory reporting

### Contributing

When adding new retailer integrations:

1. Implement the `InventoryService` interface
2. Add configuration to `InventoryConfig.ts`
3. Register in `InventoryManager.ts`
4. Add rate limiter via `RateLimiterFactory`
5. Update documentation

## License

Part of the WIC Benefits Assistant project.

## Support

For issues or questions:
- Check the main project documentation
- Review research documents in `/docs/research/`
- See implementation guide: `IMPLEMENTATION_GUIDE.md`
