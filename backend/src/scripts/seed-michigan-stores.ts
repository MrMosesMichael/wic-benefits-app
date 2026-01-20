/**
 * Seed Michigan WIC-authorized stores
 * Focus on major metro areas: Detroit, Grand Rapids, Lansing, Ann Arbor, Flint
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
  // ==================== DETROIT METRO AREA ====================
  // Walmart
  {
    storeId: 'walmart-1791',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '29574 7 Mile Rd',
    city: 'Livonia',
    state: 'MI',
    zip: '48152',
    latitude: 42.4259,
    longitude: -83.3724,
    phone: '(248) 476-1940',
    wicAuthorized: true
  },
  {
    storeId: 'walmart-2172',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '43825 W Oaks Dr',
    city: 'Novi',
    state: 'MI',
    zip: '48377',
    latitude: 42.4892,
    longitude: -83.4742,
    phone: '(248) 349-2930',
    wicAuthorized: true
  },
  {
    storeId: 'walmart-3526',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '39500 Ford Rd',
    city: 'Canton',
    state: 'MI',
    zip: '48187',
    latitude: 42.3182,
    longitude: -83.4501,
    phone: '(734) 981-0401',
    wicAuthorized: true
  },
  {
    storeId: 'walmart-2091',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '20100 Haggerty Rd',
    city: 'Northville',
    state: 'MI',
    zip: '48167',
    latitude: 42.4328,
    longitude: -83.4785,
    phone: '(248) 735-1600',
    wicAuthorized: true
  },
  {
    storeId: 'walmart-5157',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '45555 Michigan Ave',
    city: 'Canton',
    state: 'MI',
    zip: '48188',
    latitude: 42.2854,
    longitude: -83.4968,
    phone: '(734) 397-7530',
    wicAuthorized: true
  },

  // Target
  {
    storeId: 'target-1117',
    chain: 'target',
    name: 'Target',
    streetAddress: '29451 Plymouth Rd',
    city: 'Livonia',
    state: 'MI',
    zip: '48150',
    latitude: 42.3942,
    longitude: -83.3657,
    phone: '(734) 261-6601',
    wicAuthorized: true
  },
  {
    storeId: 'target-1297',
    chain: 'target',
    name: 'Target',
    streetAddress: '43700 West Oaks Dr',
    city: 'Novi',
    state: 'MI',
    zip: '48377',
    latitude: 42.4878,
    longitude: -83.4732,
    phone: '(248) 675-4300',
    wicAuthorized: true
  },
  {
    storeId: 'target-1378',
    chain: 'target',
    name: 'Target',
    streetAddress: '45001 Ford Rd',
    city: 'Canton',
    state: 'MI',
    zip: '48187',
    latitude: 42.3174,
    longitude: -83.4876,
    phone: '(734) 844-6200',
    wicAuthorized: true
  },
  {
    storeId: 'target-2154',
    chain: 'target',
    name: 'Target',
    streetAddress: '3333 Fairlane Dr',
    city: 'Allen Park',
    state: 'MI',
    zip: '48101',
    latitude: 42.2923,
    longitude: -83.2312,
    phone: '(313) 441-1305',
    wicAuthorized: true
  },

  // Meijer
  {
    storeId: 'meijer-173',
    chain: 'meijer',
    name: 'Meijer',
    streetAddress: '40000 Ann Arbor Rd',
    city: 'Plymouth',
    state: 'MI',
    zip: '48170',
    latitude: 42.3489,
    longitude: -83.4521,
    phone: '(734) 420-2662',
    wicAuthorized: true
  },
  {
    storeId: 'meijer-50',
    chain: 'meijer',
    name: 'Meijer',
    streetAddress: '25001 Michigan Ave',
    city: 'Dearborn',
    state: 'MI',
    zip: '48124',
    latitude: 42.3067,
    longitude: -83.2489,
    phone: '(313) 562-1300',
    wicAuthorized: true
  },
  {
    storeId: 'meijer-174',
    chain: 'meijer',
    name: 'Meijer',
    streetAddress: '30800 Gratiot Ave',
    city: 'Roseville',
    state: 'MI',
    zip: '48066',
    latitude: 42.5185,
    longitude: -82.9387,
    phone: '(586) 294-4110',
    wicAuthorized: true
  },

  // Kroger
  {
    storeId: 'kroger-628',
    chain: 'kroger',
    name: 'Kroger',
    streetAddress: '31100 5 Mile Rd',
    city: 'Livonia',
    state: 'MI',
    zip: '48154',
    latitude: 42.3982,
    longitude: -83.4012,
    phone: '(734) 522-6200',
    wicAuthorized: true
  },
  {
    storeId: 'kroger-631',
    chain: 'kroger',
    name: 'Kroger',
    streetAddress: '47650 Grand River Ave',
    city: 'Novi',
    state: 'MI',
    zip: '48374',
    latitude: 42.4712,
    longitude: -83.5012,
    phone: '(248) 347-5670',
    wicAuthorized: true
  },
  {
    storeId: 'kroger-633',
    chain: 'kroger',
    name: 'Kroger',
    streetAddress: '44525 Ann Arbor Rd',
    city: 'Plymouth',
    state: 'MI',
    zip: '48170',
    latitude: 42.3478,
    longitude: -83.5123,
    phone: '(734) 455-3700',
    wicAuthorized: true
  },

  // CVS
  {
    storeId: 'cvs-8156',
    chain: 'cvs',
    name: 'CVS Pharmacy',
    streetAddress: '28120 Plymouth Rd',
    city: 'Livonia',
    state: 'MI',
    zip: '48150',
    latitude: 42.3937,
    longitude: -83.3523,
    phone: '(734) 427-1370',
    wicAuthorized: true
  },
  {
    storeId: 'cvs-8234',
    chain: 'cvs',
    name: 'CVS Pharmacy',
    streetAddress: '43430 Grand River Ave',
    city: 'Novi',
    state: 'MI',
    zip: '48375',
    latitude: 42.4654,
    longitude: -83.4687,
    phone: '(248) 348-7676',
    wicAuthorized: true
  },

  // Walgreens
  {
    storeId: 'walgreens-3987',
    chain: 'walgreens',
    name: 'Walgreens',
    streetAddress: '30095 Ford Rd',
    city: 'Garden City',
    state: 'MI',
    zip: '48135',
    latitude: 42.3251,
    longitude: -83.3452,
    phone: '(734) 425-0707',
    wicAuthorized: true
  },
  {
    storeId: 'walgreens-4012',
    chain: 'walgreens',
    name: 'Walgreens',
    streetAddress: '39475 W 10 Mile Rd',
    city: 'Novi',
    state: 'MI',
    zip: '48375',
    latitude: 42.4756,
    longitude: -83.4523,
    phone: '(248) 427-1120',
    wicAuthorized: true
  },

  // ==================== ANN ARBOR ====================
  {
    storeId: 'walmart-2912',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '7000 Green Rd',
    city: 'Ann Arbor',
    state: 'MI',
    zip: '48105',
    latitude: 42.2912,
    longitude: -83.7123,
    phone: '(734) 477-4910',
    wicAuthorized: true
  },
  {
    storeId: 'target-1245',
    chain: 'target',
    name: 'Target',
    streetAddress: '3185 Lohr Rd',
    city: 'Ann Arbor',
    state: 'MI',
    zip: '48108',
    latitude: 42.2434,
    longitude: -83.7456,
    phone: '(734) 997-5045',
    wicAuthorized: true
  },
  {
    storeId: 'meijer-189',
    chain: 'meijer',
    name: 'Meijer',
    streetAddress: '3145 Ann Arbor-Saline Rd',
    city: 'Ann Arbor',
    state: 'MI',
    zip: '48103',
    latitude: 42.2387,
    longitude: -83.7534,
    phone: '(734) 662-5700',
    wicAuthorized: true
  },
  {
    storeId: 'kroger-612',
    chain: 'kroger',
    name: 'Kroger',
    streetAddress: '2641 Plymouth Rd',
    city: 'Ann Arbor',
    state: 'MI',
    zip: '48105',
    latitude: 42.2978,
    longitude: -83.7312,
    phone: '(734) 769-3700',
    wicAuthorized: true
  },

  // ==================== GRAND RAPIDS ====================
  {
    storeId: 'walmart-2345',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '5859 28th St SE',
    city: 'Grand Rapids',
    state: 'MI',
    zip: '49546',
    latitude: 42.9123,
    longitude: -85.5678,
    phone: '(616) 957-4450',
    wicAuthorized: true
  },
  {
    storeId: 'walmart-2567',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '3999 Alpine Ave NW',
    city: 'Grand Rapids',
    state: 'MI',
    zip: '49321',
    latitude: 43.0234,
    longitude: -85.6789,
    phone: '(616) 785-6700',
    wicAuthorized: true
  },
  {
    storeId: 'target-1467',
    chain: 'target',
    name: 'Target',
    streetAddress: '4580 28th St SE',
    city: 'Grand Rapids',
    state: 'MI',
    zip: '49512',
    latitude: 42.9145,
    longitude: -85.5834,
    phone: '(616) 942-0666',
    wicAuthorized: true
  },
  {
    storeId: 'meijer-112',
    chain: 'meijer',
    name: 'Meijer',
    streetAddress: '1997 E Beltline Ave NE',
    city: 'Grand Rapids',
    state: 'MI',
    zip: '49525',
    latitude: 42.9878,
    longitude: -85.5456,
    phone: '(616) 361-5200',
    wicAuthorized: true
  },
  {
    storeId: 'meijer-28',
    chain: 'meijer',
    name: 'Meijer',
    streetAddress: '3757 28th St SW',
    city: 'Grandville',
    state: 'MI',
    zip: '49418',
    latitude: 42.8912,
    longitude: -85.7234,
    phone: '(616) 531-0200',
    wicAuthorized: true
  },

  // ==================== LANSING ====================
  {
    storeId: 'walmart-1823',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '5110 Times Square Pl',
    city: 'Okemos',
    state: 'MI',
    zip: '48864',
    latitude: 42.7012,
    longitude: -84.4234,
    phone: '(517) 381-9051',
    wicAuthorized: true
  },
  {
    storeId: 'walmart-2934',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '6795 S Cedar St',
    city: 'Lansing',
    state: 'MI',
    zip: '48911',
    latitude: 42.6723,
    longitude: -84.5567,
    phone: '(517) 393-6060',
    wicAuthorized: true
  },
  {
    storeId: 'target-1589',
    chain: 'target',
    name: 'Target',
    streetAddress: '2233 Grand River Ave',
    city: 'Okemos',
    state: 'MI',
    zip: '48864',
    latitude: 42.7134,
    longitude: -84.4123,
    phone: '(517) 347-0800',
    wicAuthorized: true
  },
  {
    storeId: 'meijer-88',
    chain: 'meijer',
    name: 'Meijer',
    streetAddress: '5125 W Saginaw Hwy',
    city: 'Lansing',
    state: 'MI',
    zip: '48917',
    latitude: 42.7456,
    longitude: -84.6123,
    phone: '(517) 327-9540',
    wicAuthorized: true
  },

  // ==================== FLINT ====================
  {
    storeId: 'walmart-1567',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '5323 W Pierson Rd',
    city: 'Flushing',
    state: 'MI',
    zip: '48433',
    latitude: 43.0678,
    longitude: -83.8234,
    phone: '(810) 720-2070',
    wicAuthorized: true
  },
  {
    storeId: 'walmart-3456',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '4313 Corunna Rd',
    city: 'Flint',
    state: 'MI',
    zip: '48532',
    latitude: 43.0234,
    longitude: -83.7567,
    phone: '(810) 733-3290',
    wicAuthorized: true
  },
  {
    storeId: 'target-1723',
    chain: 'target',
    name: 'Target',
    streetAddress: '4393 Miller Rd',
    city: 'Flint',
    state: 'MI',
    zip: '48507',
    latitude: 42.9987,
    longitude: -83.7234,
    phone: '(810) 733-0035',
    wicAuthorized: true
  },
  {
    storeId: 'meijer-156',
    chain: 'meijer',
    name: 'Meijer',
    streetAddress: '6200 S Saginaw St',
    city: 'Grand Blanc',
    state: 'MI',
    zip: '48439',
    latitude: 42.9123,
    longitude: -83.6234,
    phone: '(810) 695-7080',
    wicAuthorized: true
  }
];

async function seedStores() {
  console.log('Seeding Michigan stores...\n');

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
        console.log(`  ✅ Inserted: ${store.name} - ${store.city}`);
      } else {
        updated++;
        console.log(`  🔄 Updated: ${store.name} - ${store.city}`);
      }
    } catch (error: any) {
      errors++;
      console.error(`  ❌ Error: ${store.name} - ${error.message}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${stores.length}`);

  // Print store count by chain
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

  process.exit(errors > 0 ? 1 : 0);
}

seedStores().catch(error => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
