# Google Places Integration - Quick Start

Get up and running with Google Places integration in 5 minutes.

## Step 1: Get API Key (2 minutes)

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Click "Enable APIs and Services"
4. Search for and enable:
   - **Geocoding API**
   - **Places API**
5. Go to "Credentials" → "Create Credentials" → "API Key"
6. Copy your API key

## Step 2: Configure Environment (30 seconds)

```bash
# Copy environment template
cp src/.env.example src/.env

# Edit .env and add your API key
# Replace "your-google-places-api-key-here" with your actual key
```

Or export directly:
```bash
export GOOGLE_PLACES_API_KEY="AIza..."
```

## Step 3: Test Connection (30 seconds)

```bash
npm run google-places -- test
```

Expected output:
```
✓ API key is configured
Testing connection...

✓ SUCCESS: Connection to Google Places API is working!
```

## Step 4: Try It Out (1 minute)

### Geocode an Address
```bash
npm run google-places -- geocode "1600 Amphitheatre Parkway, Mountain View, CA"
```

Expected output:
```
✓ SUCCESS

Results:
  Formatted Address: 1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA
  Latitude:          37.4224764
  Longitude:         -122.0842499
  Source:            google
```

### Enrich a Store
```bash
npm run google-places -- enrich "Walmart Supercenter" "5555 Marketplace Dr, Rochester Hills, MI"
```

Expected output:
```
✓ SUCCESS

Enrichment Results:
  Phone:             (248) 555-1234
  Website:           https://www.walmart.com/...
  Rating:            3.8/5
  Reviews:           1234

  Operating Hours:
    Sunday     08:00 - 21:00
    Monday     06:00 - 23:00
    Tuesday    06:00 - 23:00
    Wednesday  06:00 - 23:00
    Thursday   06:00 - 23:00
    Friday     06:00 - 23:00
    Saturday   08:00 - 21:00
```

## Step 5: Use in Code (1 minute)

### Quick Example
```typescript
import { GeocodingService } from './services/google-places';

const service = new GeocodingService();
const result = await service.geocodeAddress('123 Main St, Detroit, MI');

if (result.success) {
  console.log(`Coordinates: ${result.latitude}, ${result.longitude}`);
}
```

### Full Pipeline
```typescript
import { StoreIngestionPipeline } from './services/store/StoreIngestionPipeline';

const pipeline = new StoreIngestionPipeline();

// Run with geocoding and enrichment
await pipeline.ingest({
  states: ['MI'],
  skipGeocoding: false,   // Geocode addresses
  skipEnrichment: false,  // Enrich with Places data
  dryRun: true,          // Test mode (no database writes)
});
```

## Common Issues

### "API key not configured"
- Make sure you set `GOOGLE_PLACES_API_KEY` in `.env` or environment
- Restart your terminal/IDE after setting the variable

### "Connection failed"
- Verify API key is correct
- Check that Geocoding API and Places API are enabled in Google Cloud Console
- Verify you have internet connection

### "API quota exceeded"
- Free tier limits:
  - Geocoding: 40,000 requests/month
  - Places: $200 credit/month (~11,000 requests)
- Monitor usage in Google Cloud Console
- Consider implementing caching to reduce API calls

## Next Steps

- Read the [full README](./README.md) for detailed documentation
- Run examples: `npm run google-places:examples`
- Review [implementation summary](./IMPLEMENTATION_SUMMARY.md)
- Check [completion status](./A3.4_COMPLETE.md)

## Need Help?

- See examples in `src/examples/google-places-example.ts`
- Run CLI with `npm run google-places -- help`
- Check logs for detailed error messages
- Review Google Places API documentation: https://developers.google.com/maps/documentation/places/web-service

---

**You're ready to go!** 🚀

The Google Places integration is fully operational and ready to enrich your store data.
