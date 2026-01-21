# Product Data Schema Documentation

## Overview

The Product Data Schema provides comprehensive product information for the WIC Benefits App. It supports multiple data sources (Open Food Facts, UPC Database API, retailer feeds, crowdsourced data) with a unified schema for consistency.

**Design Goals:**
- 95%+ coverage of WIC-eligible UPCs
- Fast lookups (<50ms cached, <500ms API)
- Offline-first with local caching
- Support for crowdsourced additions
- Multi-source data aggregation

---

## Database Schema

### Core Tables

#### `products`

Primary table storing product information.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | NOT NULL, PK |
| `upc` | VARCHAR(14) | Universal Product Code | NOT NULL, UNIQUE |
| `upc_normalized` | VARCHAR(14) | Normalized UPC (12 digits, zero-padded) | NOT NULL |
| `name` | VARCHAR(500) | Product name | NOT NULL |
| `brand` | VARCHAR(200) | Brand name | NOT NULL |
| `manufacturer` | VARCHAR(200) | Manufacturer/company | NULL |
| `category` | JSONB | Hierarchical category array | NOT NULL, DEFAULT '[]' |
| `size` | VARCHAR(50) | Product size (numeric value) | NOT NULL |
| `size_unit` | VARCHAR(10) | Size unit (oz, lb, gal, etc.) | NOT NULL |
| `size_oz` | DECIMAL(10,2) | Size converted to ounces | NULL |
| `image_url` | TEXT | Primary product image URL | NULL |
| `thumbnail_url` | TEXT | Thumbnail image (mobile-optimized) | NULL |
| `ingredients` | TEXT | Ingredients list | NULL |
| `nutrition` | JSONB | Structured nutrition facts | NULL |
| `allergens` | JSONB | Allergen array | NULL |
| `is_organic` | BOOLEAN | USDA Organic certified | DEFAULT FALSE |
| `is_generic` | BOOLEAN | Store/generic brand | DEFAULT FALSE |
| `verified` | BOOLEAN | Manually verified | DEFAULT FALSE |
| `verified_by` | VARCHAR(100) | Verifier user ID | NULL |
| `data_source` | VARCHAR(50) | Data source identifier | NOT NULL |
| `source_metadata` | JSONB | Source-specific metadata | NULL |
| `last_updated` | TIMESTAMP | Last update time | NOT NULL |
| `created_at` | TIMESTAMP | Creation time | NOT NULL |
| `updated_at` | TIMESTAMP | Update time | NOT NULL |

**Indexes:**
- `idx_products_upc` - Fast UPC lookup
- `idx_products_upc_normalized` - Normalized UPC lookup
- `idx_products_brand` - Brand filtering
- `idx_products_name` - Full-text search on name (GIN)
- `idx_products_category` - Category filtering (GIN)
- `idx_products_data_source` - Source filtering
- `idx_products_verified` - Verified products
- `idx_products_last_updated` - Sort by freshness

#### `product_submissions`

Crowdsourced product additions from users.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | NOT NULL, PK |
| `upc` | VARCHAR(14) | UPC being submitted | NOT NULL |
| `product_data` | JSONB | Submitted product info | NOT NULL |
| `submitted_by` | VARCHAR(100) | User ID | NOT NULL |
| `submitted_at` | TIMESTAMP | Submission time | NOT NULL |
| `status` | VARCHAR(50) | Review status | NOT NULL, DEFAULT 'pending' |
| `reviewer_notes` | TEXT | Review notes | NULL |
| `reviewed_by` | VARCHAR(100) | Reviewer user ID | NULL |
| `reviewed_at` | TIMESTAMP | Review time | NULL |
| `evidence` | JSONB | Supporting evidence (photos, links) | NULL |
| `created_at` | TIMESTAMP | Creation time | NOT NULL |
| `updated_at` | TIMESTAMP | Update time | NOT NULL |

**Status Values:**
- `pending` - Awaiting review
- `approved` - Approved and added to products table
- `rejected` - Rejected with reason
- `needs_review` - Requires additional information

**Indexes:**
- `idx_product_submissions_upc` - UPC lookup
- `idx_product_submissions_status` - Filter by status
- `idx_product_submissions_submitted_by` - User's submissions
- `idx_product_submissions_submitted_at` - Sort by date

#### `unknown_product_reports`

Tracks UPCs not found in database.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | NOT NULL, PK |
| `upc` | VARCHAR(14) | UPC not found | NOT NULL |
| `reported_by` | VARCHAR(100) | User ID | NOT NULL |
| `reported_at` | TIMESTAMP | Report time | NOT NULL |
| `user_provided_info` | JSONB | Optional user-provided info | NULL |
| `resolved` | BOOLEAN | Has been resolved? | DEFAULT FALSE |
| `resolution_notes` | TEXT | Resolution notes | NULL |
| `resolved_at` | TIMESTAMP | Resolution time | NULL |
| `created_at` | TIMESTAMP | Creation time | NOT NULL |
| `updated_at` | TIMESTAMP | Update time | NOT NULL |

**Indexes:**
- `idx_unknown_reports_upc` - UPC lookup
- `idx_unknown_reports_resolved` - Filter by resolved status
- `idx_unknown_reports_reported_at` - Sort by date

#### `product_coverage_stats`

Periodic snapshots of database coverage metrics.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | NOT NULL, PK |
| `snapshot_at` | TIMESTAMP | Snapshot timestamp | NOT NULL |
| `total_products` | INTEGER | Total products in DB | NOT NULL |
| `products_with_images` | INTEGER | Products with images | NOT NULL |
| `products_with_nutrition` | INTEGER | Products with nutrition | NOT NULL |
| `verified_products` | INTEGER | Verified products | NOT NULL |
| `coverage_by_source` | JSONB | Coverage breakdown by source | NOT NULL |
| `coverage_by_category` | JSONB | Coverage breakdown by category | NOT NULL |
| `created_at` | TIMESTAMP | Creation time | NOT NULL |

**Index:**
- `idx_coverage_stats_snapshot_at` - Time-series queries

---

## Data Types

### TypeScript Interfaces

#### `Product`

```typescript
interface Product {
  upc: string;                      // Universal Product Code
  name: string;                     // Product name
  brand: string;                    // Brand name
  manufacturer?: string;            // Manufacturer
  category: string[];               // Hierarchical category
  size: string;                     // Size (numeric value)
  sizeUnit: string;                 // Unit (oz, lb, gal)
  sizeOz?: number;                  // Normalized to ounces
  imageUrl?: string;                // Image URL
  thumbnailUrl?: string;            // Thumbnail URL
  ingredients?: string;             // Ingredients list
  nutrition?: NutritionInfo;        // Nutrition facts
  allergens?: string[];             // Allergens
  isOrganic?: boolean;              // Organic certified
  isGeneric?: boolean;              // Generic/store brand
  verified: boolean;                // Manually verified
  verifiedBy?: string;              // Verifier user ID
  dataSource: ProductDataSource;    // Data source
  lastUpdated: Date;                // Last update time
  metadata?: Record<string, any>;   // Source-specific metadata
  createdAt: Date;                  // Creation time
  updatedAt: Date;                  // Update time
}
```

#### `NutritionInfo`

```typescript
interface NutritionInfo {
  servingSize: string;
  servingsPerContainer?: number;
  calories?: number;
  totalFat?: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  totalCarbs?: number;
  dietaryFiber?: number;
  sugars?: number;
  addedSugars?: number;
  protein?: number;
  vitaminD?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  additionalNutrients?: Record<string, number>;
}
```

#### `ProductDataSource`

```typescript
type ProductDataSource =
  | 'open_food_facts'     // Open Food Facts (priority)
  | 'upc_database'        // UPC Database API
  | 'retailer_feed'       // Retailer product feeds
  | 'manual'              // Manual entry
  | 'crowdsourced';       // User submissions
```

---

## Data Flow

### Product Ingestion Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                     Data Sources                        │
├──────────┬──────────┬───────────┬───────────┬──────────┤
│ Open     │ UPC      │ Walmart   │ Kroger    │ User     │
│ Food     │ Database │ API       │ API       │ Submit   │
│ Facts    │ API      │           │           │          │
└────┬─────┴────┬─────┴─────┬─────┴─────┬─────┴────┬─────┘
     │          │           │           │          │
     ▼          ▼           ▼           ▼          ▼
┌─────────────────────────────────────────────────────────┐
│                    Product Service                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 1. Fetch from source                            │   │
│  │ 2. Normalize data to unified schema             │   │
│  │ 3. Validate required fields                     │   │
│  │ 4. Convert units (size → oz)                    │   │
│  │ 5. Deduplicate                                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Product Repository                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Upsert to PostgreSQL                            │   │
│  │ - INSERT ON CONFLICT DO UPDATE                  │   │
│  │ - Preserve existing data if new data is null    │   │
│  │ - Update timestamps                             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                PostgreSQL Database                       │
│                    products table                        │
└─────────────────────────────────────────────────────────┘
```

### Product Lookup Flow

```
User scans UPC
     │
     ▼
┌─────────────────┐
│ ProductService  │
│ .lookupProduct()│
└────────┬────────┘
         │
         ▼
    ┌─────────┐
    │  Cache? │ ───Yes──> Return cached product
    └────┬────┘
         │ No
         ▼
┌──────────────────┐
│ ProductRepository│
│ .getProductByUPC()│
└────────┬─────────┘
         │
         ▼
    ┌─────────┐
    │  Found? │ ───Yes──> Cache & return
    └────┬────┘
         │ No
         ▼
┌──────────────────┐
│ Fetch from APIs  │
│ (Open Food Facts)│
└────────┬─────────┘
         │
         ▼
    ┌─────────┐
    │  Found? │ ───Yes──> Save to DB, cache, return
    └────┬────┘
         │ No
         ▼
┌──────────────────┐
│ Fetch from APIs  │
│ (UPC Database)   │
└────────┬─────────┘
         │
         ▼
    ┌─────────┐
    │  Found? │ ───Yes──> Save to DB, cache, return
    └────┬────┘
         │ No
         ▼
┌──────────────────┐
│  Product Not     │
│  Found           │
└──────────────────┘
```

---

## UPC Normalization

UPCs can have multiple valid formats:
- **UPC-A**: 12 digits (e.g., `016000275287`)
- **UPC-E**: 8 digits (compressed form)
- **EAN-13**: 13 digits (international)
- **Leading zeros**: May or may not be present

### Normalization Strategy

1. **Strip non-digits**: Remove spaces, dashes, etc.
2. **Pad to 12 digits**: Add leading zeros to reach UPC-A standard
3. **Store both**: Original UPC and normalized version
4. **Query both**: Search for both in database

**Example:**
```
Input:    "11110416605"
Normalized: "011110416605"

Both stored:
- upc: "11110416605"
- upc_normalized: "011110416605"

Query matches either:
- WHERE upc = '11110416605' OR upc_normalized = '011110416605'
```

---

## Data Sources

### Priority Order

1. **Open Food Facts** (Priority)
   - Open source, crowdsourced
   - Best nutrition data
   - Confidence: 85%

2. **UPC Database API** (Fallback)
   - Commercial database
   - Less nutrition info
   - Confidence: 75%

3. **Retailer Feeds** (Future)
   - Walmart, Kroger APIs
   - High accuracy for in-stock items
   - Confidence: 90%

4. **Crowdsourced** (Supplemental)
   - User submissions
   - Requires verification
   - Confidence: 60% (unverified), 95% (verified)

---

## Caching Strategy

### Layers

1. **Memory Cache** (ProductService)
   - In-memory Map
   - TTL: 30 days
   - Fast: <10ms

2. **Database** (PostgreSQL)
   - Primary store
   - TTL: No expiration (updated on sync)
   - Fast: <50ms

3. **Local Storage** (SQLite on mobile)
   - Offline cache
   - TTL: 30 days
   - Fast: <50ms

### Cache Invalidation

- **On update**: Clear cache for specific UPC
- **On sync**: Refresh stale entries (>30 days)
- **On error**: Don't cache errors (404s)
- **Manual**: User can clear cache in settings

---

## API Endpoints

### Product Lookup

```http
GET /api/v1/products/:upc
```

**Response:**
```json
{
  "upc": "016000275287",
  "found": true,
  "product": {
    "upc": "016000275287",
    "name": "Cheerios",
    "brand": "General Mills",
    "category": ["Breakfast", "Cereal", "Whole Grain"],
    "size": "18",
    "sizeUnit": "oz",
    "sizeOz": 18.0,
    "dataSource": "open_food_facts",
    "verified": true,
    "lastUpdated": "2026-01-15T10:30:00Z"
  },
  "cached": false,
  "responseTime": 245,
  "confidence": 85
}
```

### Batch Lookup

```http
POST /api/v1/products/batch
Content-Type: application/json

{
  "upcs": ["016000275287", "041220576197", "007874213959"]
}
```

**Response:**
```json
{
  "results": [
    { "upc": "016000275287", "found": true, "product": {...} },
    { "upc": "041220576197", "found": true, "product": {...} },
    { "upc": "007874213959", "found": false }
  ]
}
```

### Search

```http
GET /api/v1/products/search?q=cheerios&page=1&limit=20
```

### Report Unknown

```http
POST /api/v1/products/report
Content-Type: application/json

{
  "upc": "123456789012",
  "reportedBy": "user_12345",
  "userProvidedInfo": {
    "name": "Example Product",
    "brand": "Brand X"
  }
}
```

---

## Performance Requirements

| Operation | Target | Notes |
|-----------|--------|-------|
| Cache hit | <50ms | Memory or DB cache |
| API lookup | <500ms | Open Food Facts or UPC DB |
| Batch lookup | <2s | 100 UPCs |
| Search | <300ms | Full-text search |
| Insert | <100ms | Single product |
| Batch insert | <5s | 1000 products |

---

## Monitoring

### Metrics to Track

1. **Coverage**
   - Total products in DB
   - Coverage by category (target: 95% WIC-eligible)
   - Coverage by data source

2. **Performance**
   - Cache hit rate (target: >80%)
   - Average lookup time
   - API response times
   - Database query times

3. **Quality**
   - Products with images (target: >70%)
   - Products with nutrition (target: >60%)
   - Verified products (target: >80% WIC-eligible)
   - Unknown product reports per week

4. **Data Freshness**
   - Products updated in last 30 days
   - Stale products (>90 days)
   - Sync frequency

### Alerts

- Coverage drops below 90% for WIC categories
- Cache hit rate drops below 70%
- Average lookup time exceeds 1s
- Unknown product reports spike (>100/day)
- Sync failures

---

## Maintenance

### Daily Tasks

- Monitor coverage stats
- Review unknown product reports
- Check API error rates

### Weekly Tasks

- Review crowdsourced submissions
- Update products with missing data
- Run data quality checks

### Monthly Tasks

- Full data refresh from all sources
- Archive old coverage stats
- Review and update categories

---

## Future Enhancements

1. **ML-based categorization** - Auto-categorize products
2. **Image recognition** - Extract info from product photos
3. **Nutrition scoring** - WIC-friendliness score
4. **Price tracking** - Historical price data
5. **Alternative suggestions** - Similar products when out of stock
6. **Localization** - Multi-language product names
