/**
 * Seed New York WIC-authorized stores
 * No Kroger-family presence in NY — all stores are static seed.
 * Covers: ShopRite, Wegmans, Stop & Shop, Price Chopper, Walmart, Target, ALDI, CVS, Walgreens
 *
 * Major metros: NYC (5 boroughs + Long Island + Westchester), Buffalo, Rochester, Syracuse, Albany
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
  // ==================== NYC — BRONX ====================
  // ShopRite
  {
    storeId: 'shoprite-ny-1012',
    chain: 'shoprite',
    name: 'ShopRite',
    streetAddress: '1080 Leggett Ave',
    city: 'Bronx',
    state: 'NY',
    zip: '10474',
    latitude: 40.8178,
    longitude: -73.8856,
    phone: '(718) 991-7900',
    wicAuthorized: true
  },
  {
    storeId: 'shoprite-ny-1034',
    chain: 'shoprite',
    name: 'ShopRite',
    streetAddress: '2020 Bartow Ave',
    city: 'Bronx',
    state: 'NY',
    zip: '10475',
    latitude: 40.8712,
    longitude: -73.8312,
    phone: '(718) 671-7777',
    wicAuthorized: true
  },

  // ALDI
  {
    storeId: 'aldi-ny-3012',
    chain: 'aldi',
    name: 'ALDI',
    streetAddress: '496 E Fordham Rd',
    city: 'Bronx',
    state: 'NY',
    zip: '10458',
    latitude: 40.8612,
    longitude: -73.8889,
    phone: null,
    wicAuthorized: true
  },

  // Target
  {
    storeId: 'target-ny-3456',
    chain: 'target',
    name: 'Target',
    streetAddress: '40 W 225th St',
    city: 'Bronx',
    state: 'NY',
    zip: '10463',
    latitude: 40.8756,
    longitude: -73.9112,
    phone: '(718) 733-7199',
    wicAuthorized: true
  },

  // Walgreens
  {
    storeId: 'walgreens-ny-7012',
    chain: 'walgreens',
    name: 'Walgreens',
    streetAddress: '2 E Fordham Rd',
    city: 'Bronx',
    state: 'NY',
    zip: '10468',
    latitude: 40.8612,
    longitude: -73.8978,
    phone: '(718) 365-1642',
    wicAuthorized: true
  },

  // ==================== NYC — BROOKLYN ====================
  // ShopRite
  {
    storeId: 'shoprite-ny-1056',
    chain: 'shoprite',
    name: 'ShopRite',
    streetAddress: '1080 Atlantic Ave',
    city: 'Brooklyn',
    state: 'NY',
    zip: '11238',
    latitude: 40.6812,
    longitude: -73.9589,
    phone: '(718) 230-0001',
    wicAuthorized: true
  },

  // ALDI
  {
    storeId: 'aldi-ny-3034',
    chain: 'aldi',
    name: 'ALDI',
    streetAddress: '132 Flatbush Ave',
    city: 'Brooklyn',
    state: 'NY',
    zip: '11217',
    latitude: 40.6834,
    longitude: -73.9756,
    phone: null,
    wicAuthorized: true
  },
  {
    storeId: 'aldi-ny-3056',
    chain: 'aldi',
    name: 'ALDI',
    streetAddress: '585 Fulton St',
    city: 'Brooklyn',
    state: 'NY',
    zip: '11201',
    latitude: 40.6878,
    longitude: -73.9789,
    phone: null,
    wicAuthorized: true
  },

  // Target
  {
    storeId: 'target-ny-3478',
    chain: 'target',
    name: 'Target',
    streetAddress: '139 Flatbush Ave',
    city: 'Brooklyn',
    state: 'NY',
    zip: '11217',
    latitude: 40.6834,
    longitude: -73.9745,
    phone: '(718) 290-1109',
    wicAuthorized: true
  },

  // CVS
  {
    storeId: 'cvs-ny-5012',
    chain: 'cvs',
    name: 'CVS Pharmacy',
    streetAddress: '620 Atlantic Ave',
    city: 'Brooklyn',
    state: 'NY',
    zip: '11217',
    latitude: 40.6845,
    longitude: -73.9778,
    phone: '(718) 797-3794',
    wicAuthorized: true
  },

  // ==================== NYC — QUEENS ====================
  // Stop & Shop
  {
    storeId: 'stopshop-ny-2012',
    chain: 'stop-and-shop',
    name: 'Stop & Shop',
    streetAddress: '71-50 Kissena Blvd',
    city: 'Flushing',
    state: 'NY',
    zip: '11367',
    latitude: 40.7312,
    longitude: -73.8189,
    phone: '(718) 261-0133',
    wicAuthorized: true
  },
  {
    storeId: 'stopshop-ny-2034',
    chain: 'stop-and-shop',
    name: 'Stop & Shop',
    streetAddress: '90-01 Queens Blvd',
    city: 'Elmhurst',
    state: 'NY',
    zip: '11373',
    latitude: 40.7356,
    longitude: -73.8712,
    phone: '(718) 699-0096',
    wicAuthorized: true
  },

  // ALDI
  {
    storeId: 'aldi-ny-3078',
    chain: 'aldi',
    name: 'ALDI',
    streetAddress: '69-60 188th St',
    city: 'Fresh Meadows',
    state: 'NY',
    zip: '11365',
    latitude: 40.7312,
    longitude: -73.7912,
    phone: null,
    wicAuthorized: true
  },

  // Target
  {
    storeId: 'target-ny-3512',
    chain: 'target',
    name: 'Target',
    streetAddress: '13-56 40th Rd',
    city: 'Long Island City',
    state: 'NY',
    zip: '11101',
    latitude: 40.7512,
    longitude: -73.9234,
    phone: '(718) 994-8510',
    wicAuthorized: true
  },

  // ==================== NYC — MANHATTAN ====================
  // Target
  {
    storeId: 'target-ny-3534',
    chain: 'target',
    name: 'Target',
    streetAddress: '615 10th Ave',
    city: 'New York',
    state: 'NY',
    zip: '10036',
    latitude: 40.7612,
    longitude: -73.9978,
    phone: '(212) 389-1418',
    wicAuthorized: true
  },
  {
    storeId: 'target-ny-3556',
    chain: 'target',
    name: 'Target',
    streetAddress: '517 E 117th St',
    city: 'New York',
    state: 'NY',
    zip: '10035',
    latitude: 40.7956,
    longitude: -73.9389,
    phone: '(646) 390-1012',
    wicAuthorized: true
  },

  // ALDI
  {
    storeId: 'aldi-ny-3092',
    chain: 'aldi',
    name: 'ALDI',
    streetAddress: '2187 3rd Ave',
    city: 'New York',
    state: 'NY',
    zip: '10035',
    latitude: 40.8012,
    longitude: -73.9334,
    phone: null,
    wicAuthorized: true
  },

  // Walgreens
  {
    storeId: 'walgreens-ny-7034',
    chain: 'walgreens',
    name: 'Walgreens',
    streetAddress: '350 5th Ave',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    latitude: 40.7484,
    longitude: -73.9856,
    phone: '(212) 292-4185',
    wicAuthorized: true
  },

  // ==================== NYC — STATEN ISLAND ====================
  // ShopRite
  {
    storeId: 'shoprite-ny-1078',
    chain: 'shoprite',
    name: 'ShopRite',
    streetAddress: '2424 Hylan Blvd',
    city: 'Staten Island',
    state: 'NY',
    zip: '10306',
    latitude: 40.5612,
    longitude: -74.1189,
    phone: '(718) 351-0340',
    wicAuthorized: true
  },

  // Stop & Shop
  {
    storeId: 'stopshop-ny-2056',
    chain: 'stop-and-shop',
    name: 'Stop & Shop',
    streetAddress: '2754 Hylan Blvd',
    city: 'Staten Island',
    state: 'NY',
    zip: '10306',
    latitude: 40.5534,
    longitude: -74.1112,
    phone: '(718) 987-2006',
    wicAuthorized: true
  },

  // ==================== LONG ISLAND ====================
  // Stop & Shop — dominant on Long Island
  {
    storeId: 'stopshop-ny-2078',
    chain: 'stop-and-shop',
    name: 'Stop & Shop',
    streetAddress: '55 W Sunrise Hwy',
    city: 'Valley Stream',
    state: 'NY',
    zip: '11581',
    latitude: 40.6612,
    longitude: -73.7089,
    phone: '(516) 561-0256',
    wicAuthorized: true
  },
  {
    storeId: 'stopshop-ny-2092',
    chain: 'stop-and-shop',
    name: 'Stop & Shop',
    streetAddress: '2180 Jericho Tpke',
    city: 'Garden City Park',
    state: 'NY',
    zip: '11040',
    latitude: 40.7412,
    longitude: -73.6612,
    phone: '(516) 742-7737',
    wicAuthorized: true
  },

  // Walmart
  {
    storeId: 'walmart-ny-2312',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '77 Green Acres Rd',
    city: 'Valley Stream',
    state: 'NY',
    zip: '11581',
    latitude: 40.6656,
    longitude: -73.7134,
    phone: '(516) 599-1800',
    wicAuthorized: true
  },

  // Target
  {
    storeId: 'target-ny-3578',
    chain: 'target',
    name: 'Target',
    streetAddress: '11 Sunrise Hwy',
    city: 'Valley Stream',
    state: 'NY',
    zip: '11581',
    latitude: 40.6678,
    longitude: -73.7023,
    phone: '(516) 887-0252',
    wicAuthorized: true
  },

  // ==================== WESTCHESTER ====================
  // ShopRite
  {
    storeId: 'shoprite-ny-1092',
    chain: 'shoprite',
    name: 'ShopRite',
    streetAddress: '1 Elm St',
    city: 'New Rochelle',
    state: 'NY',
    zip: '10801',
    latitude: 40.9134,
    longitude: -73.7812,
    phone: '(914) 636-0400',
    wicAuthorized: true
  },

  // Stop & Shop
  {
    storeId: 'stopshop-ny-2112',
    chain: 'stop-and-shop',
    name: 'Stop & Shop',
    streetAddress: '160 S Highland Ave',
    city: 'Ossining',
    state: 'NY',
    zip: '10562',
    latitude: 41.1534,
    longitude: -73.8612,
    phone: '(914) 941-0550',
    wicAuthorized: true
  },

  // ==================== ALBANY METRO ====================
  // Price Chopper — dominant in Albany/Capital Region
  {
    storeId: 'pricechopper-ny-1012',
    chain: 'price-chopper',
    name: 'Price Chopper',
    streetAddress: '1365 New Scotland Rd',
    city: 'Slingerlands',
    state: 'NY',
    zip: '12159',
    latitude: 42.6312,
    longitude: -73.8612,
    phone: '(518) 439-7662',
    wicAuthorized: true
  },
  {
    storeId: 'pricechopper-ny-1034',
    chain: 'price-chopper',
    name: 'Price Chopper',
    streetAddress: '1892 Central Ave',
    city: 'Albany',
    state: 'NY',
    zip: '12205',
    latitude: 42.7134,
    longitude: -73.8312,
    phone: '(518) 456-0560',
    wicAuthorized: true
  },
  {
    storeId: 'pricechopper-ny-1056',
    chain: 'price-chopper',
    name: 'Price Chopper',
    streetAddress: '1640 Eastern Pkwy',
    city: 'Schenectady',
    state: 'NY',
    zip: '12309',
    latitude: 42.7856,
    longitude: -73.8912,
    phone: '(518) 372-3609',
    wicAuthorized: true
  },

  // Walmart
  {
    storeId: 'walmart-ny-2334',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '141 Washington Ave Ext',
    city: 'Albany',
    state: 'NY',
    zip: '12205',
    latitude: 42.7012,
    longitude: -73.8412,
    phone: '(518) 869-3500',
    wicAuthorized: true
  },

  // ALDI
  {
    storeId: 'aldi-ny-3112',
    chain: 'aldi',
    name: 'ALDI',
    streetAddress: '1021 Central Ave',
    city: 'Albany',
    state: 'NY',
    zip: '12205',
    latitude: 42.6978,
    longitude: -73.8234,
    phone: null,
    wicAuthorized: true
  },

  // ==================== BUFFALO ====================
  // Wegmans — dominant in western NY
  {
    storeId: 'wegmans-ny-1012',
    chain: 'wegmans',
    name: 'Wegmans',
    streetAddress: '1500 Amherst Manor Dr',
    city: 'Williamsville',
    state: 'NY',
    zip: '14221',
    latitude: 42.9612,
    longitude: -78.7412,
    phone: '(716) 631-8100',
    wicAuthorized: true
  },
  {
    storeId: 'wegmans-ny-1034',
    chain: 'wegmans',
    name: 'Wegmans',
    streetAddress: '875 Dick Rd',
    city: 'Depew',
    state: 'NY',
    zip: '14043',
    latitude: 42.9012,
    longitude: -78.6912,
    phone: '(716) 685-1900',
    wicAuthorized: true
  },

  // Walmart
  {
    storeId: 'walmart-ny-2356',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '3290 Southwestern Blvd',
    city: 'Orchard Park',
    state: 'NY',
    zip: '14127',
    latitude: 42.7534,
    longitude: -78.7389,
    phone: '(716) 675-1462',
    wicAuthorized: true
  },

  // ALDI
  {
    storeId: 'aldi-ny-3134',
    chain: 'aldi',
    name: 'ALDI',
    streetAddress: '3443 Union Rd',
    city: 'Cheektowaga',
    state: 'NY',
    zip: '14225',
    latitude: 42.9112,
    longitude: -78.7534,
    phone: null,
    wicAuthorized: true
  },

  // Target
  {
    storeId: 'target-ny-3612',
    chain: 'target',
    name: 'Target',
    streetAddress: '3800 McKinley Pkwy',
    city: 'Blasdell',
    state: 'NY',
    zip: '14219',
    latitude: 42.7978,
    longitude: -78.8312,
    phone: '(716) 826-5741',
    wicAuthorized: true
  },

  // ==================== ROCHESTER ====================
  // Wegmans — HQ'd in Rochester
  {
    storeId: 'wegmans-ny-1056',
    chain: 'wegmans',
    name: 'Wegmans',
    streetAddress: '3195 Monroe Ave',
    city: 'Rochester',
    state: 'NY',
    zip: '14618',
    latitude: 43.1212,
    longitude: -77.5412,
    phone: '(585) 586-6680',
    wicAuthorized: true
  },
  {
    storeId: 'wegmans-ny-1078',
    chain: 'wegmans',
    name: 'Wegmans',
    streetAddress: '650 Hylan Dr',
    city: 'Rochester',
    state: 'NY',
    zip: '14623',
    latitude: 43.0912,
    longitude: -77.6234,
    phone: '(585) 424-6880',
    wicAuthorized: true
  },

  // Walmart
  {
    storeId: 'walmart-ny-2378',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '2150 Chili Ave',
    city: 'Rochester',
    state: 'NY',
    zip: '14624',
    latitude: 43.1312,
    longitude: -77.6812,
    phone: '(585) 247-5305',
    wicAuthorized: true
  },

  // ALDI
  {
    storeId: 'aldi-ny-3156',
    chain: 'aldi',
    name: 'ALDI',
    streetAddress: '1000 Hylan Dr',
    city: 'Rochester',
    state: 'NY',
    zip: '14623',
    latitude: 43.0878,
    longitude: -77.6112,
    phone: null,
    wicAuthorized: true
  },

  // ==================== SYRACUSE ====================
  // Wegmans
  {
    storeId: 'wegmans-ny-1092',
    chain: 'wegmans',
    name: 'Wegmans',
    streetAddress: '6789 E Genesee St',
    city: 'Fayetteville',
    state: 'NY',
    zip: '13066',
    latitude: 43.0312,
    longitude: -76.0312,
    phone: '(315) 446-8360',
    wicAuthorized: true
  },

  // Price Chopper
  {
    storeId: 'pricechopper-ny-1078',
    chain: 'price-chopper',
    name: 'Price Chopper',
    streetAddress: '3300 W Genesee St',
    city: 'Syracuse',
    state: 'NY',
    zip: '13219',
    latitude: 43.0478,
    longitude: -76.2012,
    phone: '(315) 487-4844',
    wicAuthorized: true
  },

  // Walmart
  {
    storeId: 'walmart-ny-2392',
    chain: 'walmart',
    name: 'Walmart Supercenter',
    streetAddress: '3825 Rt 31',
    city: 'Liverpool',
    state: 'NY',
    zip: '13090',
    latitude: 43.1134,
    longitude: -76.2234,
    phone: '(315) 457-9601',
    wicAuthorized: true
  },

  // ALDI
  {
    storeId: 'aldi-ny-3178',
    chain: 'aldi',
    name: 'ALDI',
    streetAddress: '3450 Erie Blvd E',
    city: 'Syracuse',
    state: 'NY',
    zip: '13214',
    latitude: 43.0412,
    longitude: -76.0912,
    phone: null,
    wicAuthorized: true
  },
];

async function seedStores() {
  console.log('Seeding New York stores...\n');

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

  console.log(`\n=== NY Summary ===`);
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

  console.log('\nNote: No Kroger-family stores in NY. All stores are static seed data.');

  process.exit(errors > 0 ? 1 : 0);
}

seedStores().catch(error => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
