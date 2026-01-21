#!/usr/bin/env node
/**
 * Google Places CLI Tool
 *
 * Command-line interface for testing Google Places integration
 */

import { GeocodingService } from '../services/google-places/GeocodingService';
import { PlacesEnrichmentService } from '../services/google-places/PlacesEnrichmentService';
import { GooglePlacesClient } from '../services/google-places/GooglePlacesClient';

interface CLIOptions {
  command: 'test' | 'geocode' | 'enrich' | 'help';
  address?: string;
  storeName?: string;
  storeAddress?: string;
}

function printHelp() {
  console.log(`
Google Places CLI Tool

Usage:
  npm run google-places -- <command> [options]

Commands:
  test                    Test API connection
  geocode <address>       Geocode an address to coordinates
  enrich <name> <addr>    Enrich a store with Places data
  help                    Show this help message

Examples:
  # Test API connection
  npm run google-places -- test

  # Geocode an address
  npm run google-places -- geocode "1600 Amphitheatre Parkway, Mountain View, CA"

  # Enrich a store
  npm run google-places -- enrich "Walmart Supercenter" "5555 Marketplace Dr, Rochester Hills, MI"

Environment:
  GOOGLE_PLACES_API_KEY   Your Google Places API key (required)
  `);
}

async function testConnection() {
  console.log('Testing Google Places API connection...\n');

  const client = new GooglePlacesClient();

  if (!client.isConfigured()) {
    console.error('✗ ERROR: GOOGLE_PLACES_API_KEY not set in environment');
    console.error('\nSet the environment variable:');
    console.error('  export GOOGLE_PLACES_API_KEY="your-api-key-here"');
    process.exit(1);
  }

  console.log('✓ API key is configured');
  console.log('Testing connection...');

  const isConnected = await client.testConnection();

  if (isConnected) {
    console.log('\n✓ SUCCESS: Connection to Google Places API is working!');
    console.log('\nYou can now use geocoding and enrichment services.');
    process.exit(0);
  } else {
    console.error('\n✗ ERROR: Failed to connect to Google Places API');
    console.error('\nPossible issues:');
    console.error('  - Invalid API key');
    console.error('  - Network connection problem');
    console.error('  - API not enabled in Google Cloud Console');
    console.error('  - API quota exceeded');
    process.exit(1);
  }
}

async function geocodeAddress(address: string) {
  console.log('Geocoding address...\n');
  console.log(`Input: ${address}\n`);

  const geocodingService = new GeocodingService();
  const result = await geocodingService.geocodeAddress(address);

  if (result.success) {
    console.log('✓ SUCCESS\n');
    console.log('Results:');
    console.log(`  Formatted Address: ${result.formattedAddress}`);
    console.log(`  Latitude:          ${result.latitude}`);
    console.log(`  Longitude:         ${result.longitude}`);
    console.log(`  Source:            ${result.source}`);
    process.exit(0);
  } else {
    console.error('✗ FAILED\n');
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}

async function enrichStore(storeName: string, storeAddress: string) {
  console.log('Enriching store with Google Places data...\n');
  console.log(`Store Name: ${storeName}`);
  console.log(`Address:    ${storeAddress}\n`);

  // First, geocode the address
  console.log('Step 1: Geocoding address...');
  const geocodingService = new GeocodingService();
  const geocoded = await geocodingService.geocodeAddress(storeAddress);

  if (!geocoded.success) {
    console.error(`✗ Geocoding failed: ${geocoded.error}`);
    process.exit(1);
  }

  console.log(`✓ Geocoded: ${geocoded.latitude}, ${geocoded.longitude}\n`);

  // Then, enrich with Places data
  console.log('Step 2: Fetching Places data...');
  const enrichmentService = new PlacesEnrichmentService();

  // Create a minimal normalized store object
  const store = {
    id: 'cli-test',
    name: storeName,
    address: {
      street: storeAddress,
      city: '',
      state: '',
      zip: '',
      country: 'USA',
    },
    location: {
      lat: geocoded.latitude!,
      lng: geocoded.longitude!,
    },
    wicAuthorized: true,
    wicState: 'MI' as const,
    timezone: 'America/Detroit',
    features: { acceptsWic: true },
    dataSource: 'manual' as const,
    lastVerified: new Date().toISOString(),
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await enrichmentService.enrichRetailer(store);

  if (result.success) {
    console.log('✓ SUCCESS\n');
    console.log('Enrichment Results:');
    console.log(`  Place ID:          ${result.placeId || 'N/A'}`);
    console.log(`  Phone:             ${result.phone || 'N/A'}`);
    console.log(`  Website:           ${result.website || 'N/A'}`);
    console.log(`  Rating:            ${result.rating ? `${result.rating}/5` : 'N/A'}`);
    console.log(`  Reviews:           ${result.userRatingsTotal || 0}`);

    if (result.hours && result.hours.length > 0) {
      console.log('\n  Operating Hours:');
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      result.hours.forEach(h => {
        const dayName = dayNames[h.dayOfWeek].padEnd(10);
        if (h.closed) {
          console.log(`    ${dayName} Closed`);
        } else {
          console.log(`    ${dayName} ${h.openTime} - ${h.closeTime}`);
        }
      });
    } else {
      console.log('\n  Operating Hours:   Not available');
    }

    if (result.photos && result.photos.length > 0) {
      console.log(`\n  Photos:            ${result.photos.length} available`);
    }

    process.exit(0);
  } else {
    console.error('✗ FAILED\n');
    console.error(`Error: ${result.error}`);
    console.error('\nPossible reasons:');
    console.error('  - Store not found in Google Places database');
    console.error('  - Store name/address mismatch');
    console.error('  - API quota exceeded');
    process.exit(1);
  }
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    return { command: 'help' };
  }

  const command = args[0] as CLIOptions['command'];

  if (command === 'test') {
    return { command: 'test' };
  }

  if (command === 'geocode') {
    if (args.length < 2) {
      console.error('Error: geocode command requires an address argument');
      console.error('Usage: npm run google-places -- geocode "<address>"');
      process.exit(1);
    }
    return {
      command: 'geocode',
      address: args.slice(1).join(' '),
    };
  }

  if (command === 'enrich') {
    if (args.length < 3) {
      console.error('Error: enrich command requires store name and address arguments');
      console.error('Usage: npm run google-places -- enrich "<store name>" "<address>"');
      process.exit(1);
    }
    return {
      command: 'enrich',
      storeName: args[1],
      storeAddress: args.slice(2).join(' '),
    };
  }

  console.error(`Error: Unknown command: ${command}`);
  console.error('Run "npm run google-places -- help" for usage information');
  process.exit(1);
}

async function main() {
  const options = parseArgs();

  try {
    switch (options.command) {
      case 'help':
        printHelp();
        break;

      case 'test':
        await testConnection();
        break;

      case 'geocode':
        if (!options.address) {
          console.error('Error: address is required');
          process.exit(1);
        }
        await geocodeAddress(options.address);
        break;

      case 'enrich':
        if (!options.storeName || !options.storeAddress) {
          console.error('Error: store name and address are required');
          process.exit(1);
        }
        await enrichStore(options.storeName, options.storeAddress);
        break;
    }
  } catch (error) {
    console.error('\nUnexpected error:', error);
    process.exit(1);
  }
}

// Run CLI
if (require.main === module) {
  main();
}
