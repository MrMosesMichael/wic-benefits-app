/**
 * Google Places Integration Example
 *
 * Demonstrates how to use the Google Places services for geocoding and enrichment
 */

import { GeocodingService } from '../services/google-places/GeocodingService';
import { PlacesEnrichmentService } from '../services/google-places/PlacesEnrichmentService';
import { GooglePlacesClient } from '../services/google-places/GooglePlacesClient';
import { WICRetailerRawData, NormalizedRetailerData } from '../services/retailer/types/retailer.types';

/**
 * Example 1: Geocode a single address
 */
async function exampleGeocodeAddress() {
  console.log('\n=== Example 1: Geocode Single Address ===\n');

  const geocodingService = new GeocodingService();
  const address = '1600 Amphitheatre Parkway, Mountain View, CA';

  const result = await geocodingService.geocodeAddress(address);

  if (result.success) {
    console.log('✓ Geocoding successful!');
    console.log(`  Address: ${result.formattedAddress}`);
    console.log(`  Coordinates: ${result.latitude}, ${result.longitude}`);
  } else {
    console.log('✗ Geocoding failed:', result.error);
  }
}

/**
 * Example 2: Geocode multiple store addresses
 */
async function exampleGeocodeBatch() {
  console.log('\n=== Example 2: Batch Geocode Stores ===\n');

  const geocodingService = new GeocodingService();

  // Sample store data
  const stores: WICRetailerRawData[] = [
    {
      state: 'MI',
      source: 'michigan_web',
      scrapedAt: new Date().toISOString(),
      vendorName: 'Walmart Supercenter',
      address: '5555 Marketplace Dr',
      city: 'Rochester Hills',
      stateCode: 'MI',
      zip: '48309',
    },
    {
      state: 'MI',
      source: 'michigan_web',
      scrapedAt: new Date().toISOString(),
      vendorName: 'Meijer',
      address: '2301 E Big Beaver Rd',
      city: 'Troy',
      stateCode: 'MI',
      zip: '48083',
    },
  ];

  const results = await geocodingService.geocodeRetailers(stores, {
    skipExisting: true,
    maxConcurrent: 2,
    onProgress: (current, total) => {
      console.log(`  Progress: ${current}/${total}`);
    },
  });

  console.log(`\nResults: ${results.filter(r => r.success).length}/${results.length} successful\n`);

  results.forEach((result, index) => {
    const store = stores[index];
    if (result.success) {
      console.log(`✓ ${store.vendorName}`);
      console.log(`  Coordinates: ${result.latitude}, ${result.longitude}`);
    } else {
      console.log(`✗ ${store.vendorName}: ${result.error}`);
    }
  });
}

/**
 * Example 3: Enrich a single store with Google Places data
 */
async function exampleEnrichStore() {
  console.log('\n=== Example 3: Enrich Single Store ===\n');

  const enrichmentService = new PlacesEnrichmentService();

  // Sample normalized store data
  const store: NormalizedRetailerData = {
    id: 'example-1',
    name: 'Walmart Supercenter',
    address: {
      street: '5555 Marketplace Dr',
      city: 'Rochester Hills',
      state: 'MI',
      zip: '48309',
      country: 'USA',
    },
    location: {
      lat: 42.6753,
      lng: -83.1945,
    },
    wicAuthorized: true,
    wicState: 'MI',
    timezone: 'America/Detroit',
    features: {
      acceptsWic: true,
    },
    dataSource: 'michigan_web',
    lastVerified: new Date().toISOString(),
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await enrichmentService.enrichRetailer(store);

  if (result.success) {
    console.log('✓ Enrichment successful!');
    console.log(`  Phone: ${result.phone || 'N/A'}`);
    console.log(`  Website: ${result.website || 'N/A'}`);
    console.log(`  Rating: ${result.rating || 'N/A'} (${result.userRatingsTotal || 0} reviews)`);
    if (result.hours && result.hours.length > 0) {
      console.log(`  Operating Hours:`);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      result.hours.forEach(h => {
        if (h.closed) {
          console.log(`    ${dayNames[h.dayOfWeek]}: Closed`);
        } else {
          console.log(`    ${dayNames[h.dayOfWeek]}: ${h.openTime} - ${h.closeTime}`);
        }
      });
    }
  } else {
    console.log('✗ Enrichment failed:', result.error);
  }
}

/**
 * Example 4: Test API connection
 */
async function exampleTestConnection() {
  console.log('\n=== Example 4: Test API Connection ===\n');

  const client = new GooglePlacesClient();

  if (!client.isConfigured()) {
    console.log('✗ Google Places API key not configured');
    console.log('  Set GOOGLE_PLACES_API_KEY environment variable');
    return;
  }

  console.log('Testing connection to Google Places API...');
  const isConnected = await client.testConnection();

  if (isConnected) {
    console.log('✓ Connection successful!');
    console.log('  API key is valid and working');
  } else {
    console.log('✗ Connection failed');
    console.log('  Check API key and network connection');
  }
}

/**
 * Example 5: Full pipeline simulation
 */
async function exampleFullPipeline() {
  console.log('\n=== Example 5: Full Pipeline Simulation ===\n');

  const geocodingService = new GeocodingService();
  const enrichmentService = new PlacesEnrichmentService();

  // Step 1: Raw store data (from scraper)
  const rawStores: WICRetailerRawData[] = [
    {
      state: 'MI',
      source: 'michigan_web',
      scrapedAt: new Date().toISOString(),
      vendorName: 'Target',
      address: '43650 West Oaks Dr',
      city: 'Novi',
      stateCode: 'MI',
      zip: '48377',
    },
  ];

  console.log('Step 1: Raw store data from scraper');
  console.log(`  Store: ${rawStores[0].vendorName}`);
  console.log(`  Address: ${rawStores[0].address}, ${rawStores[0].city}, ${rawStores[0].stateCode}`);

  // Step 2: Geocode
  console.log('\nStep 2: Geocoding address...');
  const geocodingResults = await geocodingService.geocodeRetailers(rawStores);
  const geocoded = geocodingResults[0];

  if (!geocoded.success) {
    console.log('✗ Geocoding failed, stopping pipeline');
    return;
  }

  console.log(`✓ Geocoded: ${geocoded.latitude}, ${geocoded.longitude}`);

  // Step 3: Normalize (simplified - in real pipeline this is more complex)
  console.log('\nStep 3: Normalizing data...');
  const normalized: NormalizedRetailerData = {
    id: 'example-target',
    name: rawStores[0].vendorName,
    address: {
      street: rawStores[0].address,
      city: rawStores[0].city,
      state: rawStores[0].stateCode,
      zip: rawStores[0].zip,
      country: 'USA',
    },
    location: {
      lat: geocoded.latitude!,
      lng: geocoded.longitude!,
    },
    wicAuthorized: true,
    wicState: 'MI',
    timezone: 'America/Detroit',
    features: { acceptsWic: true },
    dataSource: rawStores[0].source,
    lastVerified: new Date().toISOString(),
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log('✓ Data normalized');

  // Step 4: Enrich
  console.log('\nStep 4: Enriching with Google Places data...');
  const enrichmentResults = await enrichmentService.enrichRetailers([normalized]);
  const enriched = enrichmentResults[0];

  if (enriched.success) {
    console.log('✓ Enrichment successful');
    console.log(`  Phone: ${enriched.phone || 'N/A'}`);
    console.log(`  Website: ${enriched.website || 'N/A'}`);
    console.log(`  Hours: ${enriched.hours?.length || 0} day(s) configured`);
  } else {
    console.log(`✗ Enrichment failed: ${enriched.error}`);
  }

  // Step 5: Apply enrichment
  console.log('\nStep 5: Applying enrichment to store data...');
  const finalStores = enrichmentService.applyEnrichment([normalized], enrichmentResults);
  const finalStore = finalStores[0];

  console.log('✓ Final enriched store data:');
  console.log(`  Name: ${finalStore.name}`);
  console.log(`  Location: ${finalStore.location.lat}, ${finalStore.location.lng}`);
  console.log(`  Phone: ${finalStore.phone || 'N/A'}`);
  console.log(`  Website: ${finalStore.website || 'N/A'}`);
  console.log(`  Hours: ${finalStore.hours?.length || 0} day(s)`);

  console.log('\n✓ Pipeline complete!');
}

/**
 * Main function - run all examples
 */
async function main() {
  console.log('=================================================');
  console.log('   Google Places Integration Examples');
  console.log('=================================================');

  try {
    // Test connection first
    await exampleTestConnection();

    // Run examples
    await exampleGeocodeAddress();
    await exampleGeocodeBatch();
    await exampleEnrichStore();
    await exampleFullPipeline();

    console.log('\n=================================================');
    console.log('   All examples completed!');
    console.log('=================================================\n');
  } catch (error) {
    console.error('\n✗ Error running examples:', error);
    process.exit(1);
  }
}

// CLI entry point
if (require.main === module) {
  main();
}

export {
  exampleGeocodeAddress,
  exampleGeocodeBatch,
  exampleEnrichStore,
  exampleTestConnection,
  exampleFullPipeline,
};
