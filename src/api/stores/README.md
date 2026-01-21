# Store Search API

RESTful API endpoint for searching WIC-authorized stores by location.

## Endpoint

```
GET /api/stores/search
```

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lat` | number | Yes | - | Latitude of search location |
| `lng` | number | Yes | - | Longitude of search location |
| `radiusMiles` | number | No | 10 | Search radius in miles |
| `wicAuthorizedOnly` | boolean | No | true | Only return WIC-authorized stores |
| `limit` | number | No | 20 | Results per page (max: 100) |
| `offset` | number | No | 0 | Pagination offset |
| `state` | string | No | - | Filter by state code (e.g., "MI") |
| `features` | string | No | - | Comma-separated features (e.g., "hasPharmacy,hasWicKiosk") |

## Response

```typescript
{
  stores: Array<{
    id: string;
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
    location: {
      lat: number;
      lng: number;
    };
    distanceMeters: number;
    distanceMiles: number;
    phone?: string;
    hours: OperatingHours[];
    features: {
      hasPharmacy?: boolean;
      hasWicKiosk?: boolean;
      // ... other features
    };
    wicAuthorized: boolean;
    wicVendorId?: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

## Example Usage

### Basic Search (10 mile radius)
```
GET /api/stores/search?lat=42.3314&lng=-83.0458
```

### Custom Radius (5 miles)
```
GET /api/stores/search?lat=42.3314&lng=-83.0458&radiusMiles=5
```

### Filter by Features
```
GET /api/stores/search?lat=42.3314&lng=-83.0458&features=hasPharmacy,hasWicKiosk
```

### Pagination
```
GET /api/stores/search?lat=42.3314&lng=-83.0458&limit=10&offset=0
```

### State Filter
```
GET /api/stores/search?lat=42.3314&lng=-83.0458&state=MI
```

## Integration with Express

```typescript
import express from 'express';
import { Pool } from 'pg';
import { createSearchHandler } from './api/stores';

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Register store search endpoint
app.get('/api/stores/search', createSearchHandler(pool));

app.listen(3000, () => {
  console.log('API server running on port 3000');
});
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid parameters",
  "message": "lat and lng are required and must be valid numbers"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Failed to search stores"
}
```

## Technical Details

- **Distance Calculation**: Uses PostGIS `earth_distance` function (requires `earthdistance` extension)
- **Sorting**: Results are sorted by distance (nearest first)
- **Default Limit**: 50 stores maximum per query in database layer
- **Pagination**: Applied after filtering, allows up to 100 results per page

## Feature Filters

Available feature filters:
- `hasPharmacy` - Store has pharmacy
- `hasDeliCounter` - Store has deli counter
- `hasBakery` - Store has bakery
- `acceptsEbt` - Store accepts EBT
- `acceptsWic` - Store accepts WIC (equivalent to wicAuthorized)
- `hasWicKiosk` - Store has WIC kiosk

Multiple features can be combined with comma separation. All specified features must be present (AND logic).
