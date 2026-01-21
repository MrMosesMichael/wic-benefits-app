# Product Database Integration Guide

## Overview

Task A2.1 implements UPC-to-product database sourcing using Open Food Facts and UPC Database API. This provides comprehensive product information for scanned items in the WIC Benefits App.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   ProductService                        │
│  (Orchestration layer with caching & retry logic)      │
└────────────┬───────────────────────────┬────────────────┘
             │                           │
             ▼                           ▼
┌──────────────────────┐    ┌──────────────────────┐
│ OpenFoodFactsClient  │    │ UPCDatabaseClient    │
│  (Priority source)   │    │  (Fallback source)   │
└──────────┬───────────┘    └──────────┬───────────┘
           │                           │
           ▼                           ▼
┌──────────────────────┐    ┌──────────────────────┐
│   Open Food Facts    │    │   UPC Database API   │
│ (Free, no API key)   │    │ (Requires API key)   │
└──────────────────────┘    └──────────────────────┘
```

## Data Flow

### Product Lookup Flow

1. **Cache Check**: Check in-memory cache for recent lookups
2. **Open Food Facts**: Try primary source (crowdsourced, good nutrition data)
3. **UPC Database**: Fallback to secondary source (commercial, good coverage)
4. **Cache Store**: Store result for future lookups
5. **Return**: Unified Product object with confidence score

### Multi-Source Deduplication

When multiple sources return the same product (e.g., during search):
- Open Food Facts is preferred (better nutrition/ingredient data)
- UPC Database used when OFF doesn't have the product
- Products deduplicated by UPC
- Most complete record wins

## Coverage Targets

From specification (specs/wic-benefits-app/specs/data-layer/spec.md):

- **95%+** of WIC-eligible UPCs
- **90%+** of commonly scanned non-WIC products
- **100%** of formula products (critical for survival feature)

### Current Coverage

- Open Food Facts: ~2.8M products globally, strong US food coverage
- UPC Database: Wide US retail coverage, limited nutrition data
- Combined: Comprehensive coverage for WIC use cases

## API Integrations

### Open Food Facts

**Base URL**: `https://world.openfoodfacts.org/api/v2`

**Endpoints Used**:
- `GET /product/{upc}.json` - Get product by UPC
- `GET /search` - Search products by query

**Features**:
- Free, no API key required
- Crowdsourced data (moderate confidence)
- Rich nutrition data, ingredients, allergens
- Product images
- Multi-language support

**Example Response**:
```json
{
  "status": 1,
  "product": {
    "code": "016000275287",
    "product_name": "Cheerios",
    "brands": "General Mills",
    "quantity": "18 oz",
    "nutriments": { ... },
    "ingredients_text": "...",
    "image_url": "https://..."
  }
}
```

### UPC Database

**Base URL**: `https://api.upcdatabase.org`

**Authentication**: Bearer token (API key)

**Endpoints Used**:
- `GET /product/{upc}` - Get product by UPC
- `GET /search/{query}` - Search products

**Features**:
- Requires API key (free tier: 100 requests/day)
- Commercial-grade reliability
- Good product metadata (title, brand, images)
- Limited nutrition/ingredient data

**Free Tier**: 100 requests/day
**Paid Tiers**: Higher limits available

**Example Response**:
```json
{
  "code": "OK",
  "items": [{
    "ean": "016000275287",
    "title": "Cheerios Cereal",
    "brand": "General Mills",
    "size": "18 oz",
    "images": ["https://..."]
  }]
}
```

## Implementation Files

### Core Services
- `src/services/product/OpenFoodFactsClient.ts` - Open Food Facts integration
- `src/services/product/UPCDatabaseClient.ts` - UPC Database integration
- `src/services/product/ProductService.ts` - Main orchestration service
- `src/services/product/config.ts` - Configuration management
- `src/services/product/index.ts` - Service exports

### Types
- `src/types/product.types.ts` - Product data types and interfaces

### Examples & Tools
- `src/examples/product-lookup-example.ts` - Usage examples
- `src/services/product/cli/lookup-product.ts` - CLI tool for testing

### Documentation
- `src/services/product/README.md` - Detailed API documentation

## Usage Examples

### Basic Lookup

```typescript
import { productService } from './services/product';

const result = await productService.lookupProduct('016000275287');

if (result.found && result.product) {
  console.log(result.product.name);     // "Cheerios"
  console.log(result.product.brand);    // "General Mills"
  console.log(result.product.sizeOz);   // 18
}
```

### Batch Lookup

```typescript
const upcs = ['016000275287', '021130126026', '041220576197'];
const results = await productService.lookupProducts(upcs);

results.forEach(r => {
  if (r.found) {
    console.log(`${r.product.name} - ${r.dataSource}`);
  }
});
```

### Search

```typescript
const products = await productService.searchProducts({
  search: 'cheerios',
  limit: 10,
});

products.forEach(p => console.log(p.name));
```

## Configuration

### Environment Variables

```bash
# Optional: Enable UPC Database fallback
export UPC_DATABASE_API_KEY="your-api-key-here"
```

Get API key from: https://upcdatabase.org/api

### Custom Service Configuration

```typescript
import { ProductService } from './services/product';

const service = new ProductService({
  upcDatabaseApiKey: process.env.UPC_DATABASE_API_KEY,
  enableCache: true,
  cacheTtl: 30 * 24 * 60 * 60 * 1000, // 30 days
  timeout: 5000,
  enableRetry: true,
  maxRetries: 2,
});
```

## Performance Characteristics

### Response Times
- Cache hit: <50ms
- Open Food Facts: 200-500ms
- UPC Database: 100-300ms

### Caching Strategy
- **Default TTL**: 30 days (products rarely change)
- **In-memory**: Fast, but resets on app restart
- **Future**: Persistent cache (SQLite) for offline support

### Retry Logic
- Automatic retry with exponential backoff
- Max 2 retries by default
- Skips retry for 404 (not found) and timeouts

## Integration Points

### APL Eligibility Service

Product Service provides data for APL eligibility checking:

```typescript
// 1. Look up product
const productResult = await productService.lookupProduct(upc);

// 2. Extract relevant fields for APL check
const { category, sizeOz, brand } = productResult.product;

// 3. Check WIC eligibility
const aplResult = await aplService.checkEligibility({
  upc,
  state: 'MI',
  category,
  sizeOz,
  brand,
});
```

### Scanner Service

Product info enhances scan results:

```typescript
// After barcode scan
const upc = scannedCode;

// Parallel lookups
const [productResult, aplResult] = await Promise.all([
  productService.lookupProduct(upc),
  aplService.checkEligibility({ upc, state }),
]);

// Combined result
return {
  upc,
  productName: productResult.product?.name,
  brand: productResult.product?.brand,
  image: productResult.product?.imageUrl,
  eligible: aplResult.eligible,
  category: aplResult.entry?.benefitCategory,
};
```

## Testing

### Manual Testing

```bash
# Test Open Food Facts lookup
ts-node src/services/product/cli/lookup-product.ts 016000275287

# Test search
ts-node src/services/product/cli/lookup-product.ts --search "cheerios"

# Run examples
ts-node src/examples/product-lookup-example.ts
```

### Known Test UPCs

- General Mills Cheerios: `016000275287`
- Coca-Cola: `004900000411`
- Similac Formula: `041220` prefix
- Kroger products: `021130` prefix

## Troubleshooting

### "Product not found"

Possible reasons:
1. UPC not in either database (contribute to Open Food Facts)
2. Invalid UPC format (check digit may be wrong)
3. Regional/store-specific product (limited coverage)

**Action**:
- Verify UPC is correct
- Try normalizing (add/remove leading zeros)
- Contribute to Open Food Facts: https://world.openfoodfacts.org

### "UPC Database API error: 401"

**Cause**: API key not set or invalid

**Action**:
```bash
export UPC_DATABASE_API_KEY="your-key"
```

### "Request timeout"

**Cause**: Slow network or API under load

**Action**:
- Increase timeout in config
- Check network connectivity
- Retry will happen automatically

## Future Enhancements

### Phase 1 (Near-term)
- [ ] Persistent cache (SQLite for offline)
- [ ] Batch import from retailer feeds
- [ ] Image optimization and CDN
- [ ] Nutrition analysis for WIC rules

### Phase 2 (Future)
- [ ] Crowdsourced product submissions
- [ ] OCR for product labels
- [ ] Multi-language product names
- [ ] Product recommendation engine

## Monitoring & Metrics

### Key Metrics to Track

1. **Coverage Rate**: % of scanned UPCs found in database
2. **Cache Hit Rate**: % of lookups served from cache
3. **Response Time**: P50, P95, P99 latency
4. **Data Source Mix**: % from OFF vs UPC Database
5. **Error Rate**: Failed lookups / total lookups

### Target SLAs

- Coverage: >95% for WIC products
- Cache hit rate: >70% (repeat scans)
- P95 response time: <500ms
- Error rate: <5%

## Resources

- Open Food Facts Docs: https://world.openfoodfacts.org/data
- UPC Database Docs: https://upcdatabase.org/api
- Product Service README: `src/services/product/README.md`
- Data Layer Spec: `specs/wic-benefits-app/specs/data-layer/spec.md`
