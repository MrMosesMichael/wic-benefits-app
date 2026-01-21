# Brief: A3 - Store Data Foundation

## Context
WIC participants need to find WIC-authorized retailers near them. Each state publishes retailer lists.

## Data Model (from design.md)
```typescript
interface WICStore {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  phone?: string;
  hours?: StoreHours;
  features: string[];  // ['accepts_eWIC', 'has_pharmacy', etc.]
  wicVendorId: string;
  lastVerified: Date;
}
```

## Tasks in Group A3
- A3.1 Source WIC-authorized retailer data by state [DONE]
- A3.2 Design store data schema [DONE]
- A3.3 Build store data ingestion pipeline [DONE]
- A3.4 Integrate with Google Places for enrichment
- A3.5 Create store search API

## A3.4 Specifics: Google Places Integration
**Goal**: Enrich WIC store data with Google Places details (hours, photos, ratings)

**Implementation**:
1. Create `src/services/places/googlePlacesService.ts`
2. Match WIC stores to Google Places by name+address
3. Fetch: hours, photos, ratings, place_id
4. Store enrichment data in store record

**API**: Use `@googlemaps/google-maps-services-js` or fetch API
**Rate limit**: Respect Google Places API quotas

## A3.5 Specifics: Store Search API
**Goal**: API endpoint to search stores by location

**Implementation**:
1. Create `src/api/stores/search.ts`
2. Accept: lat, lng, radius (miles), filters
3. Return: sorted by distance, paginated
4. Use PostGIS or Haversine formula for geo queries

## Relevant Files
- `src/services/stores/` - Store service implementations
- `src/api/stores/` - Store API endpoints
- `src/types/store.ts` - Store type definitions
