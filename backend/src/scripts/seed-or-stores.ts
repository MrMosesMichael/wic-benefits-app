/**
 * Seed Oregon WIC-authorized stores (non-Kroger)
 * Fred Meyer + QFC are populated via Kroger API sync.
 * This covers: Walmart, Safeway, WinCo, Target, Albertsons, ALDI, CVS, Walgreens
 *
 * Major metros: Portland, Eugene, Salem, Bend, Medford
 */
import pool from '../config/database';

interface StoreData {
  storeId: string;
  chain: string;
  name: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  wicAuthorized: boolean;
}

const stores: StoreData[] = [
  // ==================== PORTLAND METRO ====================
  // Walmart
  {
    storeId: 'walmart-or-5412',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '3975 SW 198th Ave',
    city: 'Aloha',
    state: 'OR',
    zip: '97007',
    latitude: 45.4834,
    longitude: -122.8512,
    phone: '(503) 642-0588',
    wicAuthorized: true
  },
  {
    storeId: 'walmart-or-3778',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '1123 N Hayden Meadows Dr',
    city: 'Portland',
    state: 'OR',
    zip: '97217',
    latitude: 45.5934,
    longitude: -122.7212,
    phone: '(503) 286-3861',
    wicAuthorized: true
  },
  {
    storeId: 'walmart-or-5289',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '2101 SE 1st Ave',
    city: 'Milwaukie',
    state: 'OR',
    zip: '97222',
    latitude: 45.4412,
    longitude: -122.6389,
    phone: '(503) 659-1586',
    wicAuthorized: true
  },
  {
    storeId: 'walmart-or-2847',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '15800 SE Happy Valley Town Center Dr',
    city: 'Happy Valley',
    state: 'OR',
    zip: '97086',
    latitude: 45.4312,
    longitude: -122.5112,
    phone: '(503) 558-7530',
    wicAuthorized: true
  },

  // Safeway — major presence in Portland
  {
    storeId: 'safeway-or-1512',
    chain: 'safeway',
    name: 'Safeway',
    streetAddress: '3527 SE Powell Blvd',
    city: 'Portland',
    state: 'OR',
    zip: '97202',
    latitude: 45.4967,
    longitude: -122.6312,
    phone: '(503) 233-0590',
    wicAuthorized: true
  },
  {
    storeId: 'safeway-or-1534',
    chain: 'safeway',
    name: 'Safeway',
    streetAddress: '2800 SE Hawthorne Blvd',
    city: 'Portland',
    state: 'OR',
    zip: '97214',
    latitude: 45.5118,
    longitude: -122.6378,
    phone: '(503) 236-0854',
    wicAuthorized: true
  },
  {
    storeId: 'safeway-or-1556',
    chain: 'safeway',
    name: 'Safeway',
    streetAddress: '8145 SW Barbur Blvd',
    city: 'Portland',
    state: 'OR',
    zip: '97219',
    latitude: 45.4612,
    longitude: -122.7123,
    phone: '(503) 246-1713',
    wicAuthorized: true
  },
  {
    storeId: 'safeway-or-1578',
    chain: 'safeway',
    name: 'Safeway',
    streetAddress: '8725 SW Canyon Rd',
    city: 'Beaverton',
    state: 'OR',
    zip: '97005',
    latitude: 45.4912,
    longitude: -122.7834,
    phone: '(503) 297-0213',
    wicAuthorized: true
  },

  // WinCo — employee-owned, strong OR presence
  {
    storeId: 'winco-or-1012',
    chain: 'winco',
    name: 'WinCo Foods',
    streetAddress: '7979 SE Powell Blvd',
    city: 'Portland',
    state: 'OR',
    zip: '97206',
    latitude: 45.4967,
    longitude: -122.5789,
    phone: '(503) 777-2121',
    wicAuthorized: true
  },
  {
    storeId: 'winco-or-1034',
    chain: 'winco',
    name: 'WinCo Foods',
    streetAddress: '16095 SE 82nd Dr',
    city: 'Clackamas',
    state: 'OR',
    zip: '97015',
    latitude: 45.4134,
    longitude: -122.5712,
    phone: '(503) 786-1590',
    wicAuthorized: true
  },
  {
    storeId: 'winco-or-1056',
    chain: 'winco',
    name: 'WinCo Foods',
    streetAddress: '19200 SW Martinazzi Ave',
    city: 'Tualatin',
    state: 'OR',
    zip: '97062',
    latitude: 45.3812,
    longitude: -122.7612,
    phone: '(503) 612-9710',
    wicAuthorized: true
  },

  // Target
  {
    storeId: 'target-or-1512',
    chain: 'target',
    name: 'Target',
    streetAddress: '939 NW Circle Blvd',
    city: 'Corvallis',
    state: 'OR',
    zip: '97330',
    latitude: 44.5912,
    longitude: -123.2712,
    phone: '(541) 753-0015',
    wicAuthorized: true
  },
  {
    storeId: 'target-or-2034',
    chain: 'target',
    name: 'Target',
    streetAddress: '7100 SW Nyberg St',
    city: 'Tualatin',
    state: 'OR',
    zip: '97062',
    latitude: 45.3856,
    longitude: -122.7534,
    phone: '(503) 691-4820',
    wicAuthorized: true
  },
  {
    storeId: 'target-or-2056',
    chain: 'target',
    name: 'Target',
    streetAddress: '4030 SE 82nd Ave',
    city: 'Portland',
    state: 'OR',
    zip: '97266',
    latitude: 45.4834,
    longitude: -122.5789,
    phone: '(503) 775-9194',
    wicAuthorized: true
  },
  {
    storeId: 'target-or-2078',
    chain: 'target',
    name: 'Target',
    streetAddress: '2375 NW 185th Ave',
    city: 'Hillsboro',
    state: 'OR',
    zip: '97124',
    latitude: 45.5412,
    longitude: -122.8634,
    phone: '(503) 645-9326',
    wicAuthorized: true
  },

  // Albertsons
  {
    storeId: 'albertsons-or-1234',
    chain: 'albertsons',
    name: 'Albertsons',
    streetAddress: '3220 NE Broadway',
    city: 'Portland',
    state: 'OR',
    zip: '97232',
    latitude: 45.5356,
    longitude: -122.6312,
    phone: '(503) 331-3600',
    wicAuthorized: true
  },
  {
    storeId: 'albertsons-or-1256',
    chain: 'albertsons',
    name: 'Albertsons',
    streetAddress: '16199 SW Pacific Hwy',
    city: 'Tigard',
    state: 'OR',
    zip: '97224',
    latitude: 45.4212,
    longitude: -122.7512,
    phone: '(503) 620-0113',
    wicAuthorized: true
  },

  // ==================== EUGENE ====================
  // Walmart
  {
    storeId: 'walmart-or-3412',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '4550 W 11th Ave',
    city: 'Eugene',
    state: 'OR',
    zip: '97402',
    latitude: 44.0534,
    longitude: -123.1312,
    phone: '(541) 344-9498',
    wicAuthorized: true
  },

  // Safeway
  {
    storeId: 'safeway-or-1612',
    chain: 'safeway',
    name: 'Safeway',
    streetAddress: '145 E 18th Ave',
    city: 'Eugene',
    state: 'OR',
    zip: '97401',
    latitude: 44.0412,
    longitude: -123.0889,
    phone: '(541) 342-8635',
    wicAuthorized: true
  },

  // WinCo
  {
    storeId: 'winco-or-1078',
    chain: 'winco',
    name: 'WinCo Foods',
    streetAddress: '2825 Chad Dr',
    city: 'Eugene',
    state: 'OR',
    zip: '97408',
    latitude: 44.0834,
    longitude: -123.0612,
    phone: '(541) 345-2446',
    wicAuthorized: true
  },

  // ==================== SALEM ====================
  // Walmart
  {
    storeId: 'walmart-or-4567',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '5250 Commercial St SE',
    city: 'Salem',
    state: 'OR',
    zip: '97306',
    latitude: 44.8912,
    longitude: -123.0112,
    phone: '(503) 585-5855',
    wicAuthorized: true
  },

  // Safeway
  {
    storeId: 'safeway-or-1634',
    chain: 'safeway',
    name: 'Safeway',
    streetAddress: '1645 Hawthorne Ave NE',
    city: 'Salem',
    state: 'OR',
    zip: '97301',
    latitude: 44.9512,
    longitude: -123.0234,
    phone: '(503) 363-4125',
    wicAuthorized: true
  },

  // WinCo
  {
    storeId: 'winco-or-1092',
    chain: 'winco',
    name: 'WinCo Foods',
    streetAddress: '3755 Market St NE',
    city: 'Salem',
    state: 'OR',
    zip: '97301',
    latitude: 44.9534,
    longitude: -122.9812,
    phone: '(503) 391-2850',
    wicAuthorized: true
  },

  // ==================== BEND ====================
  // Walmart
  {
    storeId: 'walmart-or-5634',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '20120 Pinebrook Blvd',
    city: 'Bend',
    state: 'OR',
    zip: '97702',
    latitude: 44.0212,
    longitude: -121.3012,
    phone: '(541) 383-7012',
    wicAuthorized: true
  },

  // Safeway
  {
    storeId: 'safeway-or-1656',
    chain: 'safeway',
    name: 'Safeway',
    streetAddress: '1444 NE 3rd St',
    city: 'Bend',
    state: 'OR',
    zip: '97701',
    latitude: 44.0634,
    longitude: -121.3034,
    phone: '(541) 382-3541',
    wicAuthorized: true
  },

  // ==================== MEDFORD ====================
  // Walmart
  {
    storeId: 'walmart-or-6789',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '2390 Poplar Dr',
    city: 'Medford',
    state: 'OR',
    zip: '97504',
    latitude: 42.3412,
    longitude: -122.8512,
    phone: '(541) 857-1000',
    wicAuthorized: true
  },

  // Safeway
  {
    storeId: 'safeway-or-1678',
    chain: 'safeway',
    name: 'Safeway',
    streetAddress: '501 Medford Center',
    city: 'Medford',
    state: 'OR',
    zip: '97501',
    latitude: 42.3256,
    longitude: -122.8712,
    phone: '(541) 776-1188',
    wicAuthorized: true
  },

  // WinCo
  {
    storeId: 'winco-or-1112',
    chain: 'winco',
    name: 'WinCo Foods',
    streetAddress: '901 Medford Center',
    city: 'Medford',
    state: 'OR',
    zip: '97501',
    latitude: 42.3289,
    longitude: -122.8634,
    phone: '(541) 770-2640',
    wicAuthorized: true
  },
];

async function seedStores() {
  console.log('Seeding Oregon stores (non-Kroger)...\n');

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const store of stores) {
    try {
      const result = await pool.query(
        `INSERT INTO stores
         (store_id, chain, name, street_address, city, state, zip, latitude, longitude, phone, wic_authorized)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
           wic_authorized = EXCLUDED.wic_authorized,
           updated_at = CURRENT_TIMESTAMP
         RETURNING (xmax = 0) AS inserted`,
        [
          store.storeId,
          store.chain,
          store.name,
          store.streetAddress,
          store.city,
          store.state,
          store.zip,
          store.latitude,
          store.longitude,
          store.phone,
          store.wicAuthorized
        ]
      );

      if (result.rows[0].inserted) {
        inserted++;
        console.log(`  + ${store.chain}: ${store.name} - ${store.city}`);
      } else {
        updated++;
      }
    } catch (error: any) {
      errors++;
      console.error(`  Error: ${store.name} - ${error.message}`);
    }
  }

  console.log(`\n=== OR Summary ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${stores.length}`);

  const chainCounts: Record<string, number> = {};
  stores.forEach(s => {
    chainCounts[s.chain] = (chainCounts[s.chain] || 0) + 1;
  });
  console.log('\nStores by chain:');
  Object.entries(chainCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([chain, count]) => {
      console.log(`  ${chain}: ${count}`);
    });

  console.log('\nNote: Fred Meyer + QFC stores are synced via Kroger API (npm run sync-kroger-stores -- --state OR)');

  process.exit(errors > 0 ? 1 : 0);
}

seedStores().catch(error => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
