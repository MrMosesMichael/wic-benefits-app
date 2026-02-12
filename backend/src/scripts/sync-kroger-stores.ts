/**
 * Sync Kroger Stores Script
 * Populates real Kroger-family store locations from the Kroger API.
 *
 * Usage:
 *   npx ts-node src/scripts/sync-kroger-stores.ts              # All supported states
 *   npx ts-node src/scripts/sync-kroger-stores.ts --state MI   # Michigan only
 *   npx ts-node src/scripts/sync-kroger-stores.ts --zip 48150  # Specific zip code
 */

import dotenv from 'dotenv';
dotenv.config();

import { KrogerIntegration } from '../services/KrogerIntegration';
import pool from '../config/database';

// Major zip codes per state for broad coverage
const STATE_ZIPS: Record<string, { zips: string[]; chains: string[] }> = {
  MI: {
    zips: [
      '48201', // Detroit (downtown)
      '48076', // Southfield
      '48150', // Livonia
      '48105', // Ann Arbor
      '49503', // Grand Rapids
      '48911', // Lansing
      '48507', // Flint
      '49001', // Kalamazoo
      '48601', // Saginaw
      '49684', // Traverse City
    ],
    chains: ['KROGER'],
  },
  NC: {
    zips: [
      '27601', // Raleigh
      '28202', // Charlotte
      '27101', // Winston-Salem
      '27701', // Durham
      '27401', // Greensboro
      '28801', // Asheville
      '28401', // Wilmington
    ],
    chains: ['KROGER', 'HARRIS TEETER'],
  },
  OR: {
    zips: [
      '97203', // N Portland / St. Johns
      '97215', // SE Portland / Hawthorne
      '97005', // Beaverton
      '97086', // Happy Valley / Clackamas
      '97229', // Cedar Mill / West Portland
      '97401', // Eugene
      '97301', // Salem
      '97701', // Bend
      '97501', // Medford
    ],
    chains: ['FRED MEYER', 'QFC'],
  },
};

async function syncStoresForZip(
  kroger: KrogerIntegration,
  zip: string,
  chain?: string
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  const locations = await kroger.searchStores(zip, 50, chain, 50);

  for (const loc of locations) {
    const storeId = `kroger-${loc.locationId}`;
    const chainName = KrogerIntegration.mapChainName(loc.chain);

    try {
      const result = await pool.query(
        `INSERT INTO stores
         (store_id, chain, name, street_address, city, state, zip, latitude, longitude, phone, wic_authorized, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, TRUE)
         ON CONFLICT (store_id) DO UPDATE SET
           chain = EXCLUDED.chain,
           name = EXCLUDED.name,
           street_address = EXCLUDED.street_address,
           city = EXCLUDED.city,
           state = EXCLUDED.state,
           zip = EXCLUDED.zip,
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           phone = EXCLUDED.phone,
           wic_authorized = TRUE,
           updated_at = CURRENT_TIMESTAMP
         RETURNING (xmax = 0) AS inserted`,
        [
          storeId,
          chainName,
          loc.name,
          loc.address.addressLine1,
          loc.address.city,
          loc.address.state,
          loc.address.zipCode,
          loc.geolocation.latitude,
          loc.geolocation.longitude,
          loc.phone,
        ]
      );

      if (result.rows[0].inserted) {
        inserted++;
      } else {
        updated++;
      }
    } catch (error: any) {
      errors++;
      console.error(`  Error upserting ${storeId}: ${error.message}`);
    }
  }

  return { inserted, updated, errors };
}

async function main() {
  const args = process.argv.slice(2);
  const stateIdx = args.indexOf('--state');
  const zipIdx = args.indexOf('--zip');

  const targetState = stateIdx !== -1 ? args[stateIdx + 1]?.toUpperCase() : null;
  const targetZip = zipIdx !== -1 ? args[zipIdx + 1] : null;

  const kroger = KrogerIntegration.fromEnvironment();
  if (!kroger) {
    console.error('Kroger API credentials not configured.');
    console.error('Set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET in .env');
    process.exit(1);
  }

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  if (targetZip) {
    // Single zip code mode
    console.log(`Syncing Kroger stores near zip ${targetZip}...\n`);
    const result = await syncStoresForZip(kroger, targetZip);
    totalInserted += result.inserted;
    totalUpdated += result.updated;
    totalErrors += result.errors;
  } else {
    // State-based mode
    const states = targetState ? [targetState] : Object.keys(STATE_ZIPS);

    for (const state of states) {
      const config = STATE_ZIPS[state];
      if (!config) {
        console.warn(`No zip codes configured for state: ${state}`);
        continue;
      }

      console.log(`\nSyncing ${state} stores...`);

      for (const chain of config.chains) {
        console.log(`  Chain: ${chain}`);

        for (const zip of config.zips) {
          console.log(`    Zip: ${zip}`);
          const result = await syncStoresForZip(kroger, zip, chain);
          totalInserted += result.inserted;
          totalUpdated += result.updated;
          totalErrors += result.errors;
          console.log(`      +${result.inserted} new, ${result.updated} updated`);

          // Small delay between location API calls (1,600/day limit)
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Inserted: ${totalInserted}`);
  console.log(`Updated: ${totalUpdated}`);
  console.log(`Errors: ${totalErrors}`);

  // Show counts by chain
  const chainCounts = await pool.query(
    `SELECT chain, COUNT(*) as count
     FROM stores
     WHERE store_id LIKE 'kroger-%' AND active = TRUE
     GROUP BY chain
     ORDER BY count DESC`
  );
  console.log('\nKroger-family stores in DB:');
  for (const row of chainCounts.rows) {
    console.log(`  ${row.chain}: ${row.count}`);
  }

  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Store sync failed:', error);
  process.exit(1);
});
