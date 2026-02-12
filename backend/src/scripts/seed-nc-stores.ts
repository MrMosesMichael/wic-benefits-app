/**
 * Seed North Carolina WIC-authorized stores (non-Kroger)
 * Kroger + Harris Teeter are populated via Kroger API sync.
 * This covers: Walmart, Food Lion, Target, ALDI, Publix, CVS, Walgreens
 *
 * Major metros: Charlotte, Raleigh, Durham, Greensboro, Winston-Salem, Fayetteville, Asheville, Wilmington
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
  // ==================== CHARLOTTE METRO ====================
  // Walmart
  {
    storeId: 'walmart-nc-3792',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '3240 Wilkinson Blvd',
    city: 'Charlotte',
    state: 'NC',
    zip: '28208',
    latitude: 35.2271,
    longitude: -80.8964,
    phone: '(704) 392-4052',
    wicAuthorized: true
  },
  {
    storeId: 'walmart-nc-5765',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '7735 N Tryon St',
    city: 'Charlotte',
    state: 'NC',
    zip: '28262',
    latitude: 35.3096,
    longitude: -80.7424,
    phone: '(704) 598-3449',
    wicAuthorized: true
  },
  {
    storeId: 'walmart-nc-4458',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '3849 S Tryon St',
    city: 'Charlotte',
    state: 'NC',
    zip: '28217',
    latitude: 35.1762,
    longitude: -80.8721,
    phone: '(704) 527-0710',
    wicAuthorized: true
  },

  // Food Lion — dominant NC grocery chain
  {
    storeId: 'foodlion-nc-1012',
    chain: 'food-lion',
    name: 'Food Lion',
    streetAddress: '2610 Little Rock Rd',
    city: 'Charlotte',
    state: 'NC',
    zip: '28214',
    latitude: 35.2462,
    longitude: -80.9312,
    phone: '(704) 392-2558',
    wicAuthorized: true
  },
  {
    storeId: 'foodlion-nc-1045',
    chain: 'food-lion',
    name: 'Food Lion',
    streetAddress: '1720 Sardis Rd N',
    city: 'Charlotte',
    state: 'NC',
    zip: '28270',
    latitude: 35.1312,
    longitude: -80.7634,
    phone: '(704) 847-2831',
    wicAuthorized: true
  },
  {
    storeId: 'foodlion-nc-1078',
    chain: 'food-lion',
    name: 'Food Lion',
    streetAddress: '9930 University City Blvd',
    city: 'Charlotte',
    state: 'NC',
    zip: '28213',
    latitude: 35.3089,
    longitude: -80.7212,
    phone: '(704) 549-9832',
    wicAuthorized: true
  },

  // Target
  {
    storeId: 'target-nc-2082',
    chain: 'target',
    name: 'Target',
    streetAddress: '900 Metropolitan Ave',
    city: 'Charlotte',
    state: 'NC',
    zip: '28204',
    latitude: 35.2130,
    longitude: -80.8189,
    phone: '(704) 973-9440',
    wicAuthorized: true
  },
  {
    storeId: 'target-nc-1876',
    chain: 'target',
    name: 'Target',
    streetAddress: '9841 Northlake Centre Pkwy',
    city: 'Charlotte',
    state: 'NC',
    zip: '28216',
    latitude: 35.3456,
    longitude: -80.8867,
    phone: '(704) 598-7350',
    wicAuthorized: true
  },

  // ALDI
  {
    storeId: 'aldi-nc-2301',
    chain: 'aldi',
    name: 'ALDI',
    streetAddress: '7520 Pineville-Matthews Rd',
    city: 'Charlotte',
    state: 'NC',
    zip: '28226',
    latitude: 35.1012,
    longitude: -80.8534,
    phone: null,
    wicAuthorized: true
  },
  {
    storeId: 'aldi-nc-2315',
    chain: 'aldi',
    name: 'ALDI',
    streetAddress: '2725 South Blvd',
    city: 'Charlotte',
    state: 'NC',
    zip: '28209',
    latitude: 35.1889,
    longitude: -80.8623,
    phone: null,
    wicAuthorized: true
  },

  // Publix
  {
    storeId: 'publix-nc-1672',
    chain: 'publix',
    name: 'Publix',
    streetAddress: '6820 Northlake Mall Dr',
    city: 'Charlotte',
    state: 'NC',
    zip: '28216',
    latitude: 35.3412,
    longitude: -80.8756,
    phone: '(704) 596-5130',
    wicAuthorized: true
  },

  // ==================== RALEIGH METRO ====================
  // Walmart
  {
    storeId: 'walmart-nc-1456',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '4500 Fayetteville Rd',
    city: 'Raleigh',
    state: 'NC',
    zip: '27603',
    latitude: 35.7312,
    longitude: -78.6567,
    phone: '(919) 779-1988',
    wicAuthorized: true
  },
  {
    storeId: 'walmart-nc-3222',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '1725 New Hope Church Rd',
    city: 'Raleigh',
    state: 'NC',
    zip: '27609',
    latitude: 35.8234,
    longitude: -78.5712,
    phone: '(919) 872-6800',
    wicAuthorized: true
  },

  // Food Lion
  {
    storeId: 'foodlion-nc-1234',
    chain: 'food-lion',
    name: 'Food Lion',
    streetAddress: '3426 Poole Rd',
    city: 'Raleigh',
    state: 'NC',
    zip: '27610',
    latitude: 35.7634,
    longitude: -78.5689,
    phone: '(919) 231-3433',
    wicAuthorized: true
  },
  {
    storeId: 'foodlion-nc-1256',
    chain: 'food-lion',
    name: 'Food Lion',
    streetAddress: '5720 Departure Dr',
    city: 'Raleigh',
    state: 'NC',
    zip: '27616',
    latitude: 35.8456,
    longitude: -78.5312,
    phone: '(919) 872-9711',
    wicAuthorized: true
  },

  // Target
  {
    storeId: 'target-nc-1924',
    chain: 'target',
    name: 'Target',
    streetAddress: '4841 Grove Barton Rd',
    city: 'Raleigh',
    state: 'NC',
    zip: '27613',
    latitude: 35.8712,
    longitude: -78.7234,
    phone: '(919) 459-9017',
    wicAuthorized: true
  },

  // ALDI
  {
    storeId: 'aldi-nc-2356',
    chain: 'aldi',
    name: 'ALDI',
    streetAddress: '3500 Capitol Blvd',
    city: 'Raleigh',
    state: 'NC',
    zip: '27604',
    latitude: 35.8134,
    longitude: -78.6189,
    phone: null,
    wicAuthorized: true
  },

  // ==================== DURHAM ====================
  // Walmart
  {
    storeId: 'walmart-nc-2789',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '1010 Martin Luther King Jr Pkwy',
    city: 'Durham',
    state: 'NC',
    zip: '27713',
    latitude: 35.9512,
    longitude: -78.9234,
    phone: '(919) 419-4300',
    wicAuthorized: true
  },

  // Food Lion
  {
    storeId: 'foodlion-nc-1289',
    chain: 'food-lion',
    name: 'Food Lion',
    streetAddress: '3500 N Roxboro St',
    city: 'Durham',
    state: 'NC',
    zip: '27704',
    latitude: 36.0234,
    longitude: -78.8812,
    phone: '(919) 471-2828',
    wicAuthorized: true
  },

  // Target
  {
    storeId: 'target-nc-2045',
    chain: 'target',
    name: 'Target',
    streetAddress: '4037 Durham-Chapel Hill Blvd',
    city: 'Durham',
    state: 'NC',
    zip: '27707',
    latitude: 35.9734,
    longitude: -78.9567,
    phone: '(919) 489-1001',
    wicAuthorized: true
  },

  // ==================== GREENSBORO / WINSTON-SALEM ====================
  // Walmart
  {
    storeId: 'walmart-nc-1567',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '4424 W Wendover Ave',
    city: 'Greensboro',
    state: 'NC',
    zip: '27407',
    latitude: 36.0434,
    longitude: -79.8534,
    phone: '(336) 855-7988',
    wicAuthorized: true
  },
  {
    storeId: 'walmart-nc-1589',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '3475 Parkwood School Rd',
    city: 'Winston-Salem',
    state: 'NC',
    zip: '27127',
    latitude: 36.0312,
    longitude: -80.2734,
    phone: '(336) 785-0202',
    wicAuthorized: true
  },

  // Food Lion
  {
    storeId: 'foodlion-nc-1312',
    chain: 'food-lion',
    name: 'Food Lion',
    streetAddress: '1210 Bridford Pkwy',
    city: 'Greensboro',
    state: 'NC',
    zip: '27407',
    latitude: 36.0389,
    longitude: -79.8412,
    phone: '(336) 854-0240',
    wicAuthorized: true
  },
  {
    storeId: 'foodlion-nc-1334',
    chain: 'food-lion',
    name: 'Food Lion',
    streetAddress: '3854 Country Club Rd',
    city: 'Winston-Salem',
    state: 'NC',
    zip: '27104',
    latitude: 36.0878,
    longitude: -80.3123,
    phone: '(336) 765-7424',
    wicAuthorized: true
  },

  // ==================== FAYETTEVILLE ====================
  // Walmart
  {
    storeId: 'walmart-nc-3389',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '1550 Skibo Rd',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28303',
    latitude: 35.0512,
    longitude: -78.9734,
    phone: '(910) 864-2299',
    wicAuthorized: true
  },

  // Food Lion
  {
    storeId: 'foodlion-nc-1367',
    chain: 'food-lion',
    name: 'Food Lion',
    streetAddress: '7071 Raeford Rd',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28304',
    latitude: 35.0312,
    longitude: -79.0123,
    phone: '(910) 867-4447',
    wicAuthorized: true
  },

  // ==================== ASHEVILLE ====================
  // Walmart
  {
    storeId: 'walmart-nc-2456',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '125 Bleachery Blvd',
    city: 'Asheville',
    state: 'NC',
    zip: '28805',
    latitude: 35.5834,
    longitude: -82.5012,
    phone: '(828) 298-9905',
    wicAuthorized: true
  },

  // Food Lion
  {
    storeId: 'foodlion-nc-1389',
    chain: 'food-lion',
    name: 'Food Lion',
    streetAddress: '600 Hendersonville Rd',
    city: 'Asheville',
    state: 'NC',
    zip: '28803',
    latitude: 35.5456,
    longitude: -82.5234,
    phone: '(828) 277-2052',
    wicAuthorized: true
  },

  // ==================== WILMINGTON ====================
  // Walmart
  {
    storeId: 'walmart-nc-4512',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '5135 Carolina Beach Rd',
    city: 'Wilmington',
    state: 'NC',
    zip: '28412',
    latitude: 34.1534,
    longitude: -77.9212,
    phone: '(910) 452-0944',
    wicAuthorized: true
  },

  // Food Lion
  {
    storeId: 'foodlion-nc-1412',
    chain: 'food-lion',
    name: 'Food Lion',
    streetAddress: '3501 Oleander Dr',
    city: 'Wilmington',
    state: 'NC',
    zip: '28403',
    latitude: 34.2112,
    longitude: -77.8889,
    phone: '(910) 791-0683',
    wicAuthorized: true
  },

  // CVS
  {
    storeId: 'cvs-nc-4512',
    chain: 'cvs',
    name: 'CVS Pharmacy',
    streetAddress: '701 N College Rd',
    city: 'Wilmington',
    state: 'NC',
    zip: '28405',
    latitude: 34.2456,
    longitude: -77.8634,
    phone: '(910) 392-0440',
    wicAuthorized: true
  },

  // Walgreens
  {
    storeId: 'walgreens-nc-6234',
    chain: 'walgreens',
    name: 'Walgreens',
    streetAddress: '812 S College Rd',
    city: 'Wilmington',
    state: 'NC',
    zip: '28403',
    latitude: 34.2089,
    longitude: -77.8612,
    phone: '(910) 799-3278',
    wicAuthorized: true
  },
];

async function seedStores() {
  console.log('Seeding North Carolina stores (non-Kroger)...\n');

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

  console.log(`\n=== NC Summary ===`);
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

  console.log('\nNote: Kroger + Harris Teeter stores are synced via Kroger API (npm run sync-kroger-stores -- --state NC)');

  process.exit(errors > 0 ? 1 : 0);
}

seedStores().catch(error => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
