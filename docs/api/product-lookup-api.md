# Product Lookup API

**Task:** A2.3 - Build product lookup API endpoint

Product lookup API for the WIC Benefits Assistant. Provides UPC-to-product information with multi-layer caching and fallback to external APIs.

## Features

- **Single Product Lookup** - Get product by UPC
- **Batch Lookup** - Lookup up to 100 products at once
- **Product Search** - Search by name, brand, or category
- **Unknown Product Reporting** - Report UPCs not in database
- **Coverage Statistics** - Track database coverage metrics
- **Multi-Layer Caching** - Memory → Database → External APIs
- **Auto-Save to Database** - External API results cached for future use

## Architecture

```
Client Request
     ↓
API Endpoint (/api/v1/products)
     ↓
ProductServiceWithDB
     ↓
1. Check Memory Cache (fastest)
     ↓ (miss)
2. Check Database (fast)
     ↓ (miss)
3. Try Open Food Facts (slower)
     ↓ (miss)
4. Try UPC Database API (fallback)
     ↓
Auto-save to database
     ↓
Return result to client
```

## API Endpoints

### GET /api/v1/products/:upc

Get product by UPC

**Request:**
```
GET /api/v1/products/016000275287
```

**Response:**
```json
{
  "data": {
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
      "imageUrl": "https://...",
      "dataSource": "open_food_facts",
      "verified": true,
      "lastUpdated": "2024-01-15T10:30:00Z"
    },
    "dataSource": "open_food_facts",
    "cached": false,
    "responseTime": 245,
    "confidence": 85
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z",
    "responseTime": 245
  }
}
```

### POST /api/v1/products/batch

Batch lookup multiple products (max 100)

**Request:**
```json
{
  "upcs": [
    "016000275287",
    "041220576197",
    "011110416605"
  ]
}
```

**Response:**
```json
{
  "data": [
    {
      "upc": "016000275287",
      "found": true,
      "product": { ... }
    },
    {
      "upc": "041220576197",
      "found": true,
      "product": { ... }
    },
    {
      "upc": "011110416605",
      "found": false
    }
  ],
  "meta": {
    "total": 3,
    "found": 2,
    "notFound": 1,
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### GET /api/v1/products/search

Search products by query parameters

**Query Parameters:**
- `q` - Search query (name, brand, UPC)
- `brand` - Filter by brand
- `category` - Filter by category
- `verified` - Only verified products (true/false)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Request:**
```
GET /api/v1/products/search?q=milk&limit=5
```

**Response:**
```json
{
  "data": [
    {
      "upc": "011110416605",
      "name": "1% Milk",
      "brand": "Great Value",
      "category": ["Dairy", "Milk"],
      "size": "1",
      "sizeUnit": "gal"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 5,
    "count": 5,
    "hasMore": true,
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### POST /api/v1/products/report

Report unknown product

**Request:**
```json
{
  "upc": "999999999999",
  "reportedBy": "user_12345",
  "userProvidedInfo": {
    "name": "Unknown Product",
    "brand": "Unknown Brand"
  }
}
```

**Response:**
```json
{
  "data": {
    "reportId": "report_abc123"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### GET /api/v1/products/stats

Get product coverage statistics

**Response:**
```json
{
  "data": {
    "totalProducts": 150000,
    "productsWithImages": 120000,
    "productsWithNutrition": 100000,
    "verifiedProducts": 75000,
    "coverageBySource": {
      "open_food_facts": 100000,
      "upc_database": 50000
    },
    "coverageByCategory": {
      "Dairy": 5000,
      "Cereal": 3000,
      "Baby Food": 2000
    },
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

## Client Usage

### JavaScript/TypeScript Client

```typescript
import { ProductApiClient } from './services/product/ProductApiClient';

const client = new ProductApiClient({
  baseUrl: 'http://localhost:3000/api/v1',
  timeout: 10000,
});

// Single lookup
const result = await client.getProduct('016000275287');
console.log(result.product?.name); // "Cheerios"

// Batch lookup
const results = await client.batchLookup([
  '016000275287',
  '041220576197',
]);

// Search
const products = await client.searchProducts({
  q: 'milk',
  limit: 10,
});

// Report unknown
const reportId = await client.reportUnknownProduct(
  '999999999999',
  'user_12345'
);
```

### React Hook

```typescript
import { useProductLookup } from '../hooks/useProductLookup';

function ProductScanner() {
  const {
    lookupProduct,
    lookupLoading,
    lookupError,
    lookupResult,
  } = useProductLookup();

  const handleScan = async (upc: string) => {
    const result = await lookupProduct(upc);

    if (result?.found) {
      console.log('Product:', result.product);
    } else {
      console.log('Product not found');
    }
  };

  return (
    <View>
      {lookupLoading && <Text>Loading...</Text>}
      {lookupError && <Text>Error: {lookupError.message}</Text>}
      {lookupResult?.product && (
        <Text>{lookupResult.product.name}</Text>
      )}
    </View>
  );
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_UPC` | UPC must be 8-14 digits |
| `INVALID_REQUEST` | Request body is invalid |
| `TOO_MANY_UPCS` | Batch request exceeds 100 UPCs |
| `INVALID_UPCS` | One or more UPCs have invalid format |
| `INVALID_PAGE` | Page must be a positive integer |
| `INVALID_LIMIT` | Limit must be between 1 and 100 |
| `MISSING_USER_ID` | reportedBy is required |
| `PRODUCT_LOOKUP_FAILED` | Internal error during lookup |
| `BATCH_LOOKUP_FAILED` | Internal error during batch lookup |
| `SEARCH_FAILED` | Internal error during search |
| `REPORT_FAILED` | Internal error submitting report |
| `STATS_FAILED` | Internal error getting statistics |

## Configuration

### Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wic_benefits
DB_USER=postgres
DB_PASSWORD=your_password

# API Keys (optional)
UPC_DATABASE_API_KEY=your_api_key

# CORS
CORS_ORIGIN=http://localhost:8081,exp://192.168.1.100:8081
```

## Testing

```bash
# Start backend
cd backend
npm run dev

# Test single lookup
curl http://localhost:3000/api/v1/products/016000275287

# Test batch lookup
curl -X POST http://localhost:3000/api/v1/products/batch \
  -H "Content-Type: application/json" \
  -d '{"upcs": ["016000275287", "041220576197"]}'

# Test search
curl "http://localhost:3000/api/v1/products/search?q=milk&limit=5"
```

## Implementation Files

- **Backend API Route:** `backend/src/routes/products.ts`
- **API Client:** `src/services/product/ProductApiClient.ts`
- **React Hook:** `src/hooks/useProductLookup.ts`
- **Service Layer:** `src/services/product/ProductServiceWithDB.ts`
- **Repository:** `src/database/ProductRepository.ts`
- **Migration:** `backend/migrations/013_products.sql`
- **Examples:** `src/examples/product-api-example.ts`
