# Database Layer

This directory contains the data access layer for the WIC Benefits App.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│              (Services, Business Logic)                  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   Repository Layer                       │
│          (Data Access, Query Building)                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ - ProductRepository                             │   │
│  │ - APLRepository (future)                        │   │
│  │ - StoreRepository (future)                      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                     │
│         (Persistent Storage, ACID Transactions)          │
└─────────────────────────────────────────────────────────┘
```

## Design Patterns

### Repository Pattern

The repository pattern provides a clean separation between:
- **Business logic** (what to do with data)
- **Data access** (how to get/store data)

Benefits:
- Single source of truth for queries
- Easier to test (mock repositories)
- Database-agnostic interface
- Centralized query optimization

### Example

```typescript
// Good: Using repository
const product = await productRepository.getProductByUPC(upc);

// Bad: Direct SQL in business logic
const result = await db.query('SELECT * FROM products WHERE upc = $1', [upc]);
```

## Files

### `ProductRepository.ts`

Data access layer for the `products` table.

**Key methods:**
- `getProductByUPC(upc)` - Lookup single product
- `getProductsByUPCs(upcs)` - Batch lookup
- `upsertProduct(product)` - Insert or update product
- `upsertProductsBatch(products)` - Batch insert/update
- `searchProducts(params)` - Search with filters
- `getCoverageStats()` - Database metrics
- `reportUnknownProduct(upc, userId)` - Report missing UPC

**Features:**
- UPC normalization (handles leading zeros)
- Parameterized queries (SQL injection protection)
- Connection pooling
- Batch operations
- Full-text search (PostgreSQL GIN indexes)

### `config.ts`

Database connection configuration.

**Environment variables:**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wic_benefits
DB_USER=wic_user
DB_PASSWORD=secure_password
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000
```

### `index.ts`

Module exports.

## Usage

### Basic Setup

```typescript
import { ProductRepository, getDatabaseConfig } from './database';

// Initialize repository
const config = getDatabaseConfig();
const repository = new ProductRepository(config);

// Use repository
const product = await repository.getProductByUPC('016000275287');

// Cleanup when done
await repository.close();
```

### With Service Layer

```typescript
import { ProductRepository, getDatabaseConfig } from './database';
import { ProductServiceWithDB } from './services/product';

// Initialize
const config = getDatabaseConfig();
const repository = new ProductRepository(config);
const service = new ProductServiceWithDB(repository);

// Service handles caching and API fallback automatically
const result = await service.lookupProduct('016000275287');
```

### Search Products

```typescript
// Search by name
const products = await repository.searchProducts({
  search: 'cheerios',
  limit: 10
});

// Filter by brand
const gmProducts = await repository.searchProducts({
  brand: 'General Mills',
  verifiedOnly: true
});

// Filter by category
const cerealProducts = await repository.searchProducts({
  category: ['Breakfast', 'Cereal'],
  page: 1,
  limit: 20
});
```

### Batch Operations

```typescript
// Lookup multiple products efficiently
const upcs = ['016000275287', '041220576197', '007874213959'];
const productsMap = await repository.getProductsByUPCs(upcs);

for (const [upc, product] of productsMap) {
  console.log(`${upc}: ${product.name}`);
}

// Batch insert/update
const newProducts = [
  { upc: '123456789012', name: 'Product A', ... },
  { upc: '234567890123', name: 'Product B', ... },
];
const count = await repository.upsertProductsBatch(newProducts);
console.log(`Inserted/updated ${count} products`);
```

### Coverage Tracking

```typescript
// Get database coverage stats
const stats = await repository.getCoverageStats();

console.log(`Total products: ${stats.totalProducts}`);
console.log(`With images: ${stats.productsWithImages}`);
console.log(`With nutrition: ${stats.productsWithNutrition}`);
console.log(`Verified: ${stats.verifiedProducts}`);

// Coverage by data source
for (const [source, count] of Object.entries(stats.coverageBySource)) {
  console.log(`  ${source}: ${count}`);
}
```

## Database Schema

The database schema is defined in SQL migrations:
- **Migration 013**: `backend/migrations/013_products.sql`

Key tables:
- `products` - Product information
- `product_submissions` - Crowdsourced additions
- `unknown_product_reports` - Missing UPCs
- `product_coverage_stats` - Coverage snapshots

See `src/docs/PRODUCT_SCHEMA.md` for complete schema documentation.

## Connection Pooling

The repository uses PostgreSQL connection pooling for efficiency:

- **Max connections**: 20 (configurable)
- **Idle timeout**: 30 seconds
- **Connection timeout**: 5 seconds

Pool automatically:
- Reuses connections
- Closes idle connections
- Handles connection failures
- Queues requests when pool is full

## Error Handling

The repository catches and logs database errors but doesn't throw in most cases. This allows the application to fall back to API sources when the database is unavailable.

```typescript
try {
  const product = await repository.getProductByUPC(upc);
  if (product) {
    return product;
  }
} catch (error) {
  console.warn('Database lookup failed:', error);
  // Fall back to API
}
```

## Testing

### Unit Tests

Mock the repository in tests:

```typescript
const mockRepository = {
  getProductByUPC: jest.fn().mockResolvedValue(mockProduct),
  searchProducts: jest.fn().mockResolvedValue([mockProduct]),
};

const service = new ProductServiceWithDB(mockRepository);
```

### Integration Tests

Use a test database:

```typescript
const testConfig = {
  ...getDatabaseConfig(),
  database: 'wic_benefits_test',
};

const repository = new ProductRepository(testConfig);
```

## Performance

### Query Optimization

All queries use indexes:
- UPC lookups: `idx_products_upc`, `idx_products_upc_normalized`
- Brand filter: `idx_products_brand`
- Full-text search: `idx_products_name` (GIN)
- Category filter: `idx_products_category` (GIN)

### Benchmark Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Single lookup | <50ms | UPC index |
| Batch lookup (100) | <200ms | IN query with index |
| Full-text search | <300ms | GIN index |
| Insert | <100ms | Single row |
| Batch insert (1000) | <5s | Transaction |

### Monitoring

Monitor these metrics:
- Query response times
- Connection pool usage
- Cache hit rates
- Database size
- Index bloat

## Future Repositories

Additional repositories to be implemented:

- **APLRepository** - State APL data (Track A1)
- **StoreRepository** - WIC-authorized stores (Track A3)
- **BenefitsRepository** - Household benefits (Track C1)
- **InventoryRepository** - Store inventory (Track I2)
- **FormulaRepository** - Formula tracking (Track A4)

Each follows the same pattern as ProductRepository.
