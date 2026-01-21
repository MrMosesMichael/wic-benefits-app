# Google Places Integration (A3.4)

Integration with Google Places API and Geocoding API for store data enrichment.

## Overview

This module provides services for:
1. **Geocoding**: Convert store addresses to latitude/longitude coordinates
2. **Place Search**: Find Google Places records for stores
3. **Place Details**: Enrich store data with hours, phone, website, ratings

## Architecture

```
┌──────────────────────────────────────────────────┐
│         Store Ingestion Pipeline                 │
│                                                   │
│  1. Scrape raw store data                        │
│  2. Geocode addresses → coordinates              │
│  3. Normalize to standard format                 │
│  4. Enrich with Google Places → hours, phone     │
│  5. Store in database                            │
└──────────────────────────────────────────────────┘
```

## Services

### GooglePlacesClient
Low-level HTTP client for Google APIs.

```typescript
const client = new GooglePlacesClient();

// Geocode an address
const geocodingResult = await client.geocode('123 Main St, Detroit, MI 48201');

// Find a place
const searchResult = await client.findPlace('Walmart Detroit MI');

// Get place details
const details = await client.getPlaceDetails('ChIJ...');
```

### GeocodingService
Service for geocoding store addresses to coordinates.

```typescript
const service = new GeocodingService();

// Geocode a single address
const result = await service.geocodeAddress('123 Main St, Detroit, MI');

// Batch geocode multiple retailers
const results = await service.geocodeRetailers(retailers, {
  skipExisting: true,    // Skip stores that already have coordinates
  maxConcurrent: 5,      // Process 5 at a time
  onProgress: (current, total) => console.log(`${current}/${total}`)
});
```

### PlacesEnrichmentService
Service for enriching store data with Google Places information.

```typescript
const service = new PlacesEnrichmentService();

// Enrich a single store
const result = await service.enrichRetailer(retailer);

// Batch enrich multiple stores
const results = await service.enrichRetailers(retailers, {
  maxConcurrent: 5,
  skipIfHasHours: false,  // Always get fresh hours
  skipIfHasPhone: false,  // Always get fresh phone
  onProgress: (current, total) => console.log(`${current}/${total}`)
});

// Apply enrichment results
const enrichedRetailers = service.applyEnrichment(retailers, results);
```

## Configuration

Set the Google Places API key in environment:

```bash
export GOOGLE_PLACES_API_KEY="your-api-key-here"
```

Or in `.env` file:
```
GOOGLE_PLACES_API_KEY=your-api-key-here
```

## Usage in Store Ingestion

The StoreIngestionPipeline automatically integrates geocoding and enrichment:

```typescript
const pipeline = new StoreIngestionPipeline();

// Run full pipeline with geocoding and enrichment
await pipeline.ingest({
  states: ['MI', 'NC', 'FL', 'OR'],
  skipGeocoding: false,   // Geocode missing coordinates
  skipEnrichment: false,  // Enrich with Places data
  batchSize: 50,
});

// Skip geocoding/enrichment if needed
await pipeline.ingest({
  states: ['MI'],
  skipGeocoding: true,    // Skip geocoding (use existing coordinates)
  skipEnrichment: true,   // Skip enrichment (faster, but less data)
});
```

## Data Flow

### Geocoding Flow
```
Raw Store Data (address string)
    ↓
GeocodingService.geocodeRetailer()
    ↓
Google Geocoding API
    ↓
{latitude, longitude, formattedAddress}
    ↓
Merge back into raw data
```

### Enrichment Flow
```
Normalized Store Data (name, address)
    ↓
PlacesEnrichmentService.enrichRetailer()
    ↓
Step 1: Find Place (name + address)
    ↓
Google Place Search API → placeId
    ↓
Step 2: Get Details (placeId)
    ↓
Google Place Details API
    ↓
{phone, website, hours[], rating, photos}
    ↓
PlacesEnrichmentService.applyEnrichment()
    ↓
Enriched store data
```

## Google Places API Fields

### Geocoding API Response
- `geometry.location.lat` - Latitude
- `geometry.location.lng` - Longitude
- `formatted_address` - Standardized address string

### Place Search Response
- `place_id` - Unique Google place identifier
- `name` - Business name
- `formatted_address` - Full address

### Place Details Response
- `formatted_phone_number` - Phone in local format
- `website` - Store website URL
- `opening_hours.periods[]` - Structured hours by day
- `rating` - User rating (0-5)
- `user_ratings_total` - Number of ratings
- `photos[]` - Photo references
- `business_status` - OPERATIONAL, CLOSED_TEMPORARILY, etc.

## Operating Hours Parsing

Google returns hours in this format:
```json
{
  "periods": [
    {
      "open": {"day": 0, "time": "0800"},
      "close": {"day": 0, "time": "2100"}
    }
  ]
}
```

We convert to our format:
```typescript
{
  dayOfWeek: 0,        // 0=Sunday, 6=Saturday
  openTime: "08:00",   // HH:MM format
  closeTime: "21:00",
  closed: false
}
```

### Special Cases Handled
1. **24-hour stores**: No close time → `openTime: "00:00", closeTime: "23:59"`
2. **Cross-midnight hours**: Open day != close day → Split into two entries
3. **Closed days**: Missing day → Add `{closed: true}` entry
4. **Variable hours**: Multiple periods per day → Separate entries

## Rate Limiting

- **Default**: 100ms delay between requests (max 10 req/sec)
- **Configurable**: Set `requestDelayMs` in config
- **Automatic**: Client enforces rate limits internally
- **Retries**: Up to 3 retries on transient failures

## Error Handling

### Geocoding Errors
```typescript
{
  success: false,
  error: "Address not found" | "API quota exceeded" | "Network error",
  source: "google"
}
```

### Enrichment Errors
```typescript
{
  success: false,
  error: "Place not found" | "Failed to get details" | "API error"
}
```

### Error Recovery
- Failed geocoding: Store keeps original address, no coordinates
- Failed enrichment: Store keeps scraped data, no additional info
- Partial failures: Other stores continue processing

## API Quotas & Costs

### Google Geocoding API
- **Free tier**: 40,000 requests/month
- **Cost**: $5 per 1,000 requests after free tier
- **Estimate**: ~3,000 stores = ~$0.15 (within free tier)

### Google Places API
- **Free tier**: $200 credit/month
- **Place Search**: $17 per 1,000 requests
- **Place Details**: $17 per 1,000 requests (with selected fields)
- **Estimate**: 3,000 stores × 2 requests = $102/month

### Cost Optimization
1. **Cache geocoding results**: Don't re-geocode existing coordinates
2. **Cache enrichment**: Update monthly, not daily
3. **Field selection**: Only request needed fields in Place Details
4. **Batch processing**: Process all states together to minimize overhead

## Testing

```typescript
// Test geocoding
const geocodingService = new GeocodingService();
const result = await geocodingService.geocodeAddress('1600 Amphitheatre Parkway, Mountain View, CA');
console.log(result);
// { success: true, latitude: 37.422, longitude: -122.084, ... }

// Test enrichment
const enrichmentService = new PlacesEnrichmentService();
const retailer = {
  name: "Walmart Supercenter",
  address: { street: "123 Main St", city: "Detroit", state: "MI", ... },
  ...
};
const result = await enrichmentService.enrichRetailer(retailer);
console.log(result);
// { success: true, phone: "(313) 555-1234", hours: [...], ... }

// Test full pipeline
const pipeline = new StoreIngestionPipeline();
await pipeline.ingest({ states: ['MI'], dryRun: true });
```

## Environment Setup

```bash
# Get Google Places API key
# 1. Go to https://console.cloud.google.com/
# 2. Create project or select existing
# 3. Enable APIs: "Geocoding API" and "Places API"
# 4. Create credentials → API key
# 5. Restrict API key (optional but recommended):
#    - API restrictions: Geocoding API, Places API
#    - Application restrictions: IP addresses (server IPs)

# Set environment variable
export GOOGLE_PLACES_API_KEY="AIza..."

# Verify configuration
node -e "console.log(require('./config/google-places.config').validateGooglePlacesConfig(require('./config/google-places.config').getGooglePlacesConfig()))"
```

## Monitoring

Key metrics to track:
- **Geocoding success rate**: Should be >95%
- **Enrichment success rate**: Should be >80% (some stores won't have Google listings)
- **API quota usage**: Monitor to avoid overages
- **Processing time**: Track to optimize batch sizes
- **Data completeness**: % of stores with hours, phone, etc.

## Future Enhancements

1. **Caching layer**: Redis cache for frequently accessed places
2. **Alternative providers**: Bing Maps, Here Maps as fallbacks
3. **Confidence scoring**: Rate quality of geocoding/enrichment
4. **Photo integration**: Download and serve store photos
5. **Review integration**: Pull recent reviews for store quality signals
6. **Real-time updates**: Subscribe to Places API changes
7. **Crowdsourcing**: Allow users to report incorrect data

## Related Files

- `src/config/google-places.config.ts` - Configuration
- `src/services/google-places/types.ts` - Type definitions
- `src/services/google-places/GooglePlacesClient.ts` - HTTP client
- `src/services/google-places/GeocodingService.ts` - Geocoding service
- `src/services/google-places/PlacesEnrichmentService.ts` - Enrichment service
- `src/services/retailer/RetailerDataService.ts` - Integration point
- `src/services/store/StoreIngestionPipeline.ts` - Pipeline integration
