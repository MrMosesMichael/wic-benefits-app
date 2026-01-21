# Product Database Integration

UPC-to-product database sourcing for WIC Benefits App. Integrates with Open Food Facts and UPC Database API to provide comprehensive product information for scanned items.

## Overview

The Product Service provides:
- **UPC Lookup**: Get product details by barcode
- **Product Search**: Find products by name, brand, category
- **Multi-Source**: Aggregates data from Open Food Facts and UPC Database
- **Caching**: In-memory cache with configurable TTL
- **Offline Support**: Cache enables offline product lookups
- **Retry Logic**: Automatic retry with exponential backoff

## Data Sources

### 1. Open Food Facts (Priority)
- **URL**: https://world.openfoodfacts.org
- **API**: Free, no key required
- **Coverage**: Good for US products, especially food items
- **Strengths**: Nutrition info, ingredients, allergens, images
- **Data Quality**: Crowdsourced, moderate confidence

### 2. UPC Database (Fallback)
- **URL**: https://upcdatabase.org
- **API**: Requires API key (free tier: 100 requests/day)
- **Coverage**: Wide retail product coverage
- **Strengths**: Fast, reliable, good metadata
- **Limitations**: Limited nutrition/ingredient data

## Installation

```bash
# Install dependencies
npm install

# Optional: Set UPC Database API key
export UPC_DATABASE_API_KEY="your-api-key-here"
```

## Quick Start

### Basic UPC Lookup

```typescript
import { productService } from './services/product';

// Look up product by UPC
const result = await productService.lookupProduct('016000275287');

if (result.found && result.product) {
  console.log(`Product: ${result.product.name}`);
  console.log(`Brand: ${result.product.brand}`);
  console.log(`Size: ${result.product.size} ${result.product.sizeUnit}`);
}
```

### Product Search

```typescript
import { productService } from './services/product';

// Search for products
const products = await productService.searchProducts({
  search: 'cheerios',
  limit: 10,
});

products.forEach(p => {
  console.log(`${p.name} - ${p.brand}`);
});
```

### Batch Lookup

```typescript
import { productService } from './services/product';

// Look up multiple products at once
const upcs = ['016000275287', '021130126026', '041220576197'];
const results = await productService.lookupProducts(upcs);

results.forEach(r => {
  console.log(`${r.upc}: ${r.found ? 'Found' : 'Not found'}`);
});
```

## API Reference

### `ProductService`

Main service class for product database operations.

#### Methods

##### `lookupProduct(upc: string): Promise<ProductLookupResult>`

Look up a single product by UPC.

**Parameters:**
- `upc` - Universal Product Code (12-14 digits)

**Returns:**
- `ProductLookupResult` object containing:
  - `found: boolean` - Whether product was found
  - `product?: Product` - Product data if found
  - `dataSource?: string` - Which API returned the data
  - `cached: boolean` - Whether result came from cache
  - `responseTime: number` - Lookup time in milliseconds
  - `confidence: number` - Confidence score (0-100)

##### `lookupProducts(upcs: string[]): Promise<ProductLookupResult[]>`

Look up multiple products concurrently.

**Parameters:**
- `upcs` - Array of UPCs to look up

**Returns:**
- Array of `ProductLookupResult` objects

##### `searchProducts(params: ProductQueryParams): Promise<Product[]>`

Search for products by query string and filters.

**Parameters:**
- `params.search` - Search query (required)
- `params.brand` - Filter by brand (optional)
- `params.category` - Filter by category (optional)
- `params.verifiedOnly` - Only verified products (optional)
- `params.page` - Page number (default: 1)
- `params.limit` - Results per page (default: 20)

**Returns:**
- Array of `Product` objects

##### `getCoverageStats()`

Get cache statistics.

**Returns:**
- Object with cache size and UPC Database availability

##### `clearCache()`

Clear the in-memory product cache.

## Configuration

### Environment Variables

```bash
# Optional: UPC Database API key
export UPC_DATABASE_API_KEY="your-key"
```

### Custom Configuration

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

## Data Models

### Product

```typescript
interface Product {
  upc: string;                    // Universal Product Code
  name: string;                   // Product name
  brand: string;                  // Brand name
  manufacturer?: string;          // Manufacturer
  category: string[];             // Category hierarchy
  size: string;                   // Size value
  sizeUnit: string;               // Size unit (oz, lb, gal, etc.)
  sizeOz?: number;                // Size in ounces (normalized)
  imageUrl?: string;              // Product image URL
  thumbnailUrl?: string;          // Thumbnail image URL
  ingredients?: string;           // Ingredients list
  nutrition?: NutritionInfo;      // Nutrition facts
  allergens?: string[];           // Allergen warnings
  isOrganic?: boolean;            // USDA Organic certified
  isGeneric?: boolean;            // Store brand
  dataSource: ProductDataSource;  // Data source
  lastUpdated: Date;              // Last updated timestamp
  verified: boolean;              // Manually verified
  metadata?: Record<string, any>; // Additional data
  createdAt: Date;                // Created timestamp
  updatedAt: Date;                // Updated timestamp
}
```

### NutritionInfo

```typescript
interface NutritionInfo {
  servingSize: string;
  calories?: number;
  totalFat?: number;
  saturatedFat?: number;
  sodium?: number;
  totalCarbs?: number;
  sugars?: number;
  protein?: number;
  // ... additional nutrients
}
```

## CLI Tools

### Product Lookup CLI

```bash
# Look up product by UPC
ts-node src/services/product/cli/lookup-product.ts 016000275287

# Search for products
ts-node src/services/product/cli/lookup-product.ts --search "cheerios"
```

## Examples

See `src/examples/product-lookup-example.ts` for comprehensive usage examples:

```bash
# Run all examples
ts-node src/examples/product-lookup-example.ts
```

Examples include:
1. Basic UPC lookup
2. Batch product lookup
3. Product search
4. Filtered search
5. Custom configuration
6. Error handling
7. APL integration
8. Cache statistics

## Testing

### Manual Testing

Use the CLI tool to test product lookups:

```bash
# Test Open Food Facts integration
ts-node src/services/product/cli/lookup-product.ts 016000275287

# Test search functionality
ts-node src/services/product/cli/lookup-product.ts --search "whole milk"
```

### Known Test UPCs

- **General Mills Cheerios**: `016000275287`
- **Kroger products**: Start with `021130`
- **Great Value (Walmart)**: Start with various prefixes
- **Similac Formula**: `041220` prefix

## Performance

### Response Times
- **Cache hit**: <50ms (in-memory)
- **Open Food Facts**: 200-500ms (API call)
- **UPC Database**: 100-300ms (API call)

### Rate Limits
- **Open Food Facts**: No official limit, be respectful
- **UPC Database Free Tier**: 100 requests/day
- **UPC Database Paid**: Higher limits available

### Caching Strategy
- **Default TTL**: 30 days
- **Cache on**: First successful lookup
- **Invalidation**: Manual via `clearCache()` or TTL expiration

## Coverage Targets

From spec (data-layer/spec.md):
- **95%+** of WIC-eligible UPCs
- **90%+** of commonly scanned non-WIC products
- **100%** of formula products (critical)

## Integration with APL

Product Service integrates with APL Eligibility Service:

```typescript
// 1. Look up product info
const productResult = await productService.lookupProduct(upc);

// 2. Check WIC eligibility (APL Service)
const aplResult = await aplService.checkEligibility({
  upc,
  state: 'MI',
  category: productResult.product?.category,
  sizeOz: productResult.product?.sizeOz,
});

// 3. Combine for complete scan result
const scanResult = {
  upc,
  productName: productResult.product?.name,
  brand: productResult.product?.brand,
  eligible: aplResult.eligible,
  reason: aplResult.ineligibilityReason,
};
```

## Troubleshooting

### Product Not Found

If a product isn't found in either database:
1. Check if UPC is valid (12-14 digits)
2. Try normalizing UPC (add/remove leading zeros)
3. Contribute to Open Food Facts: https://world.openfoodfacts.org
4. Report to UPC Database: https://upcdatabase.org

### API Errors

**Open Food Facts timeout:**
- Increase `timeout` in config
- Check network connectivity
- Open Food Facts may be under load

**UPC Database 401 Unauthorized:**
- Check API key is set correctly
- Verify key is active at https://upcdatabase.org

**Rate limit exceeded:**
- UPC Database free tier: 100/day limit
- Implement request throttling
- Consider paid tier for higher limits

## Future Enhancements

- [ ] Persistent cache (SQLite/Redis)
- [ ] Retailer product feeds integration
- [ ] Crowdsourced product submissions
- [ ] Image optimization and CDN
- [ ] Nutrition analysis for WIC compliance
- [ ] Barcode image recognition (OCR)
- [ ] Multi-language product names

## License

Part of WIC Benefits App - see main repository LICENSE.
