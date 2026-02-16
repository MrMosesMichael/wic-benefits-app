/**
 * Scrape / Seed Food Banks for NC, NY, OR
 *
 * Usage:
 *   npx ts-node src/scripts/scrape-food-banks.ts --state NC
 *   npx ts-node src/scripts/scrape-food-banks.ts --state all
 *   npx ts-node src/scripts/scrape-food-banks.ts --state NY --dry-run
 *
 * Seeds verified food bank data for supported states.
 * MI is already seeded via migration 017.
 */

import pool from '../config/database';

interface FoodBankSeed {
  name: string;
  organizationType: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  hoursJson: Record<string, { open: string; close: string }> | null;
  hoursNotes: string | null;
  services: string[];
  eligibilityNotes: string | null;
  requiredDocuments: string[];
  dataSource: string;
}

// --- NC Food Banks ---
const NC_FOOD_BANKS: FoodBankSeed[] = [
  {
    name: 'Food Bank of Central & Eastern NC',
    organizationType: 'food_bank',
    streetAddress: '3808 Tarheel Dr',
    city: 'Raleigh',
    state: 'NC',
    zipCode: '27609',
    latitude: 35.8196,
    longitude: -78.6382,
    phone: '919-875-0707',
    website: 'https://www.foodbankcenc.org',
    hoursJson: { monday: { open: '08:00', close: '17:00' }, tuesday: { open: '08:00', close: '17:00' }, wednesday: { open: '08:00', close: '17:00' }, thursday: { open: '08:00', close: '17:00' }, friday: { open: '08:00', close: '17:00' } },
    hoursNotes: 'Distribution through 800+ partner agencies',
    services: ['groceries', 'produce', 'baby_supplies', 'formula'],
    eligibilityNotes: 'Serves 34 counties in central and eastern North Carolina',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
  {
    name: 'Second Harvest Food Bank of NW NC',
    organizationType: 'food_bank',
    streetAddress: '3655 Reed St',
    city: 'Winston-Salem',
    state: 'NC',
    zipCode: '27107',
    latitude: 36.0560,
    longitude: -80.2644,
    phone: '336-784-5770',
    website: 'https://www.secondharvestnwnc.org',
    hoursJson: { monday: { open: '08:00', close: '16:30' }, tuesday: { open: '08:00', close: '16:30' }, wednesday: { open: '08:00', close: '16:30' }, thursday: { open: '08:00', close: '16:30' }, friday: { open: '08:00', close: '16:30' } },
    hoursNotes: 'Serves 18 counties through partner agencies',
    services: ['groceries', 'produce', 'meat', 'dairy', 'baby_supplies'],
    eligibilityNotes: 'Serves 18 counties in northwest North Carolina',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
  {
    name: 'MANNA FoodBank',
    organizationType: 'food_bank',
    streetAddress: '627 Swannanoa River Rd',
    city: 'Asheville',
    state: 'NC',
    zipCode: '28805',
    latitude: 35.5579,
    longitude: -82.4947,
    phone: '828-299-3663',
    website: 'https://www.mannafoodbank.org',
    hoursJson: { monday: { open: '08:00', close: '16:30' }, tuesday: { open: '08:00', close: '16:30' }, wednesday: { open: '08:00', close: '16:30' }, thursday: { open: '08:00', close: '16:30' }, friday: { open: '08:00', close: '16:30' } },
    hoursNotes: 'Over 200 partner agencies in WNC',
    services: ['groceries', 'produce', 'baby_supplies'],
    eligibilityNotes: 'Serves 16 counties in western North Carolina',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
  {
    name: 'Second Harvest Food Bank of Metrolina',
    organizationType: 'food_bank',
    streetAddress: '500 Spratt St',
    city: 'Charlotte',
    state: 'NC',
    zipCode: '28206',
    latitude: 35.2401,
    longitude: -80.8320,
    phone: '704-376-1785',
    website: 'https://www.secondharvestmetrolina.org',
    hoursJson: { monday: { open: '08:00', close: '17:00' }, tuesday: { open: '08:00', close: '17:00' }, wednesday: { open: '08:00', close: '17:00' }, thursday: { open: '08:00', close: '17:00' }, friday: { open: '08:00', close: '17:00' } },
    hoursNotes: 'Serves through 950+ partner agencies',
    services: ['groceries', 'produce', 'meat', 'dairy', 'baby_supplies', 'formula'],
    eligibilityNotes: 'Serves 24 counties in the Carolinas',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
  {
    name: 'Inter-Faith Food Shuttle',
    organizationType: 'food_pantry',
    streetAddress: '1001 Blair Dr Suite 120',
    city: 'Raleigh',
    state: 'NC',
    zipCode: '27603',
    latitude: 35.7596,
    longitude: -78.6569,
    phone: '919-250-0043',
    website: 'https://www.foodshuttle.org',
    hoursJson: { monday: { open: '08:30', close: '17:00' }, tuesday: { open: '08:30', close: '17:00' }, wednesday: { open: '08:30', close: '17:00' }, thursday: { open: '08:30', close: '17:00' }, friday: { open: '08:30', close: '17:00' } },
    hoursNotes: 'Community grocery programs and mobile markets',
    services: ['groceries', 'produce', 'hot_meals'],
    eligibilityNotes: 'Serves Wake, Durham, Orange, Chatham, Johnston, Nash, Edgecombe counties',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
  {
    name: 'Durham Rescue Mission',
    organizationType: 'soup_kitchen',
    streetAddress: '1201 E Main St',
    city: 'Durham',
    state: 'NC',
    zipCode: '27701',
    latitude: 35.9948,
    longitude: -78.8870,
    phone: '919-688-9641',
    website: 'https://www.durhamrescuemission.org',
    hoursJson: { monday: { open: '11:00', close: '13:00' }, tuesday: { open: '11:00', close: '13:00' }, wednesday: { open: '11:00', close: '13:00' }, thursday: { open: '11:00', close: '13:00' }, friday: { open: '11:00', close: '13:00' }, saturday: { open: '11:00', close: '13:00' }, sunday: { open: '11:00', close: '13:00' } },
    hoursNotes: 'Hot meals served daily',
    services: ['hot_meals', 'groceries'],
    eligibilityNotes: 'Open to anyone in need',
    requiredDocuments: [],
    dataSource: 'manual',
  },
  {
    name: 'Fayetteville Urban Ministry',
    organizationType: 'food_pantry',
    streetAddress: '711 Executive Pl',
    city: 'Fayetteville',
    state: 'NC',
    zipCode: '28305',
    latitude: 35.0469,
    longitude: -78.8843,
    phone: '910-483-5944',
    website: 'https://www.fayurbmin.org',
    hoursJson: { monday: { open: '09:00', close: '12:00' }, tuesday: { open: '09:00', close: '12:00' }, wednesday: { open: '09:00', close: '12:00' }, thursday: { open: '09:00', close: '12:00' }, friday: { open: '09:00', close: '12:00' } },
    hoursNotes: null,
    services: ['groceries', 'baby_supplies'],
    eligibilityNotes: 'Serves Cumberland County residents',
    requiredDocuments: ['photo_id', 'proof_of_address'],
    dataSource: 'manual',
  },
  {
    name: 'Loaves & Fishes/Friendship Trays',
    organizationType: 'food_pantry',
    streetAddress: '648 Griffith Rd',
    city: 'Charlotte',
    state: 'NC',
    zipCode: '28217',
    latitude: 35.1876,
    longitude: -80.8810,
    phone: '704-523-4333',
    website: 'https://www.loavesandfishes.org',
    hoursJson: { monday: { open: '09:00', close: '15:00' }, tuesday: { open: '09:00', close: '15:00' }, wednesday: { open: '09:00', close: '15:00' }, thursday: { open: '09:00', close: '15:00' }, friday: { open: '09:00', close: '15:00' } },
    hoursNotes: '40+ pantry locations across Mecklenburg County',
    services: ['groceries', 'produce', 'baby_supplies', 'diapers'],
    eligibilityNotes: 'Serves Mecklenburg County residents in crisis',
    requiredDocuments: ['photo_id'],
    dataSource: 'manual',
  },
];

// --- NY Food Banks ---
const NY_FOOD_BANKS: FoodBankSeed[] = [
  {
    name: 'Food Bank For New York City',
    organizationType: 'food_bank',
    streetAddress: '39 Broadway 10th Floor',
    city: 'New York',
    state: 'NY',
    zipCode: '10006',
    latitude: 40.7065,
    longitude: -74.0131,
    phone: '212-566-7855',
    website: 'https://www.foodbanknyc.org',
    hoursJson: { monday: { open: '09:00', close: '17:00' }, tuesday: { open: '09:00', close: '17:00' }, wednesday: { open: '09:00', close: '17:00' }, thursday: { open: '09:00', close: '17:00' }, friday: { open: '09:00', close: '17:00' } },
    hoursNotes: 'Serves through 1,000+ member programs across NYC',
    services: ['groceries', 'produce', 'hot_meals', 'baby_supplies', 'formula'],
    eligibilityNotes: 'Serves all five boroughs of New York City',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
  {
    name: 'City Harvest',
    organizationType: 'food_bank',
    streetAddress: '150 52nd St',
    city: 'Brooklyn',
    state: 'NY',
    zipCode: '11232',
    latitude: 40.6456,
    longitude: -74.0028,
    phone: '917-351-8700',
    website: 'https://www.cityharvest.org',
    hoursJson: { monday: { open: '08:00', close: '17:00' }, tuesday: { open: '08:00', close: '17:00' }, wednesday: { open: '08:00', close: '17:00' }, thursday: { open: '08:00', close: '17:00' }, friday: { open: '08:00', close: '17:00' } },
    hoursNotes: 'Mobile markets and community partner sites',
    services: ['groceries', 'produce', 'meat', 'dairy'],
    eligibilityNotes: 'Serves all five boroughs through 400+ programs',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
  {
    name: 'Regional Food Bank of Northeastern NY',
    organizationType: 'food_bank',
    streetAddress: '965 Albany Shaker Rd',
    city: 'Latham',
    state: 'NY',
    zipCode: '12110',
    latitude: 42.7453,
    longitude: -73.7543,
    phone: '518-786-3691',
    website: 'https://www.regionalfoodbank.net',
    hoursJson: { monday: { open: '08:00', close: '16:30' }, tuesday: { open: '08:00', close: '16:30' }, wednesday: { open: '08:00', close: '16:30' }, thursday: { open: '08:00', close: '16:30' }, friday: { open: '08:00', close: '16:30' } },
    hoursNotes: 'Serves through 1,000+ charitable agencies',
    services: ['groceries', 'produce', 'baby_supplies', 'formula'],
    eligibilityNotes: 'Serves 23 counties in northeastern New York',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
  {
    name: 'Food Bank of the Southern Tier',
    organizationType: 'food_bank',
    streetAddress: '388 Upper Oakwood Ave',
    city: 'Elmira',
    state: 'NY',
    zipCode: '14903',
    latitude: 42.0936,
    longitude: -76.7876,
    phone: '607-796-6061',
    website: 'https://www.foodbankst.org',
    hoursJson: { monday: { open: '08:00', close: '16:30' }, tuesday: { open: '08:00', close: '16:30' }, wednesday: { open: '08:00', close: '16:30' }, thursday: { open: '08:00', close: '16:30' }, friday: { open: '08:00', close: '16:30' } },
    hoursNotes: 'Mobile food pantry schedule varies',
    services: ['groceries', 'produce', 'baby_supplies'],
    eligibilityNotes: 'Serves 6 counties in the Southern Tier of New York',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
  {
    name: 'FeedMore WNY (Food Bank of WNY)',
    organizationType: 'food_bank',
    streetAddress: '91 Holt St',
    city: 'Buffalo',
    state: 'NY',
    zipCode: '14206',
    latitude: 42.8695,
    longitude: -78.8235,
    phone: '716-852-1305',
    website: 'https://www.feedmorewny.org',
    hoursJson: { monday: { open: '08:00', close: '16:30' }, tuesday: { open: '08:00', close: '16:30' }, wednesday: { open: '08:00', close: '16:30' }, thursday: { open: '08:00', close: '16:30' }, friday: { open: '08:00', close: '16:30' } },
    hoursNotes: 'Serves through 300+ member agencies',
    services: ['groceries', 'produce', 'meat', 'dairy', 'baby_supplies', 'diapers'],
    eligibilityNotes: 'Serves Cattaraugus, Chautauqua, Erie, and Niagara counties',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
  {
    name: 'Long Island Cares',
    organizationType: 'food_bank',
    streetAddress: '10 Davids Dr',
    city: 'Hauppauge',
    state: 'NY',
    zipCode: '11788',
    latitude: 40.8204,
    longitude: -73.2137,
    phone: '631-582-3663',
    website: 'https://www.licares.org',
    hoursJson: { monday: { open: '08:30', close: '16:30' }, tuesday: { open: '08:30', close: '16:30' }, wednesday: { open: '08:30', close: '16:30' }, thursday: { open: '08:30', close: '16:30' }, friday: { open: '08:30', close: '16:30' } },
    hoursNotes: 'Multiple distribution sites across Long Island',
    services: ['groceries', 'produce', 'baby_supplies', 'formula'],
    eligibilityNotes: 'Serves Nassau and Suffolk Counties',
    requiredDocuments: ['photo_id', 'proof_of_address'],
    dataSource: 'feeding_america',
  },
  {
    name: 'Foodlink',
    organizationType: 'food_bank',
    streetAddress: '1999 Mt Read Blvd',
    city: 'Rochester',
    state: 'NY',
    zipCode: '14615',
    latitude: 43.1878,
    longitude: -77.6562,
    phone: '585-328-3380',
    website: 'https://www.foodlinkny.org',
    hoursJson: { monday: { open: '08:00', close: '17:00' }, tuesday: { open: '08:00', close: '17:00' }, wednesday: { open: '08:00', close: '17:00' }, thursday: { open: '08:00', close: '17:00' }, friday: { open: '08:00', close: '17:00' } },
    hoursNotes: 'Curbside market and mobile pantry available',
    services: ['groceries', 'produce', 'hot_meals', 'baby_supplies'],
    eligibilityNotes: 'Serves 10 counties in the Finger Lakes and Rochester region',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
  {
    name: 'Food Bank of Central New York',
    organizationType: 'food_bank',
    streetAddress: '7066 Interstate Island Rd',
    city: 'Syracuse',
    state: 'NY',
    zipCode: '13209',
    latitude: 43.0756,
    longitude: -76.2140,
    phone: '315-437-1899',
    website: 'https://www.foodbankcny.org',
    hoursJson: { monday: { open: '08:00', close: '16:30' }, tuesday: { open: '08:00', close: '16:30' }, wednesday: { open: '08:00', close: '16:30' }, thursday: { open: '08:00', close: '16:30' }, friday: { open: '08:00', close: '16:30' } },
    hoursNotes: 'Serves through 300+ partner programs',
    services: ['groceries', 'produce', 'baby_supplies'],
    eligibilityNotes: 'Serves 11 counties in central New York',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
];

// --- OR Food Banks ---
const OR_FOOD_BANKS: FoodBankSeed[] = [
  {
    name: 'Oregon Food Bank',
    organizationType: 'food_bank',
    streetAddress: '7900 NE 33rd Dr',
    city: 'Portland',
    state: 'OR',
    zipCode: '97211',
    latitude: 45.5726,
    longitude: -122.6282,
    phone: '503-282-0555',
    website: 'https://www.oregonfoodbank.org',
    hoursJson: { monday: { open: '08:00', close: '17:00' }, tuesday: { open: '08:00', close: '17:00' }, wednesday: { open: '08:00', close: '17:00' }, thursday: { open: '08:00', close: '17:00' }, friday: { open: '08:00', close: '17:00' } },
    hoursNotes: '1,400+ partner agencies statewide',
    services: ['groceries', 'produce', 'meat', 'dairy', 'baby_supplies', 'formula', 'diapers'],
    eligibilityNotes: 'Serves all of Oregon and Clark County, WA',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
  {
    name: 'Marion Polk Food Share',
    organizationType: 'food_bank',
    streetAddress: '1660 Salem Industrial Dr NE',
    city: 'Salem',
    state: 'OR',
    zipCode: '97301',
    latitude: 44.9563,
    longitude: -123.0037,
    phone: '503-581-3855',
    website: 'https://www.marionpolkfoodshare.org',
    hoursJson: { monday: { open: '08:00', close: '16:30' }, tuesday: { open: '08:00', close: '16:30' }, wednesday: { open: '08:00', close: '16:30' }, thursday: { open: '08:00', close: '16:30' }, friday: { open: '08:00', close: '16:30' } },
    hoursNotes: '100+ partner pantries in Marion and Polk counties',
    services: ['groceries', 'produce', 'baby_supplies'],
    eligibilityNotes: 'Serves Marion and Polk counties',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
  {
    name: 'FOOD for Lane County',
    organizationType: 'food_bank',
    streetAddress: '770 Bailey Hill Rd',
    city: 'Eugene',
    state: 'OR',
    zipCode: '97402',
    latitude: 44.0316,
    longitude: -123.1233,
    phone: '541-343-2822',
    website: 'https://www.foodforlanecounty.org',
    hoursJson: { monday: { open: '08:30', close: '17:00' }, tuesday: { open: '08:30', close: '17:00' }, wednesday: { open: '08:30', close: '17:00' }, thursday: { open: '08:30', close: '17:00' }, friday: { open: '08:30', close: '17:00' } },
    hoursNotes: 'Dining room and gardens on-site',
    services: ['groceries', 'produce', 'hot_meals', 'baby_supplies'],
    eligibilityNotes: 'Serves Lane County',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
  {
    name: 'ACCESS Food Share',
    organizationType: 'food_pantry',
    streetAddress: '3630 Aviation Way',
    city: 'Medford',
    state: 'OR',
    zipCode: '97504',
    latitude: 42.3505,
    longitude: -122.8686,
    phone: '541-779-1462',
    website: 'https://www.accesshelps.org',
    hoursJson: { monday: { open: '09:00', close: '16:00' }, tuesday: { open: '09:00', close: '16:00' }, wednesday: { open: '09:00', close: '16:00' }, thursday: { open: '09:00', close: '16:00' }, friday: { open: '09:00', close: '16:00' } },
    hoursNotes: 'Mobile food pantry available',
    services: ['groceries', 'produce', 'baby_supplies'],
    eligibilityNotes: 'Serves Jackson and Josephine counties',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
  {
    name: 'Linn Benton Food Share',
    organizationType: 'food_bank',
    streetAddress: '545 SW 2nd St',
    city: 'Corvallis',
    state: 'OR',
    zipCode: '97333',
    latitude: 44.5601,
    longitude: -123.2639,
    phone: '541-752-1010',
    website: 'https://www.linnbentonfoodshare.org',
    hoursJson: { monday: { open: '08:30', close: '16:30' }, tuesday: { open: '08:30', close: '16:30' }, wednesday: { open: '08:30', close: '16:30' }, thursday: { open: '08:30', close: '16:30' }, friday: { open: '08:30', close: '16:30' } },
    hoursNotes: 'Multiple partner sites',
    services: ['groceries', 'produce'],
    eligibilityNotes: 'Serves Linn and Benton counties',
    requiredDocuments: [],
    dataSource: 'feeding_america',
  },
  {
    name: 'Central Oregon Community Action Agency',
    organizationType: 'food_pantry',
    streetAddress: '2375 NE Conners Ave',
    city: 'Bend',
    state: 'OR',
    zipCode: '97701',
    latitude: 44.0756,
    longitude: -121.2871,
    phone: '541-389-6507',
    website: 'https://www.coaction.org',
    hoursJson: { monday: { open: '09:00', close: '17:00' }, tuesday: { open: '09:00', close: '17:00' }, wednesday: { open: '09:00', close: '17:00' }, thursday: { open: '09:00', close: '17:00' }, friday: { open: '09:00', close: '17:00' } },
    hoursNotes: null,
    services: ['groceries', 'baby_supplies', 'diapers'],
    eligibilityNotes: 'Serves Crook, Deschutes, and Jefferson counties',
    requiredDocuments: ['photo_id'],
    dataSource: 'manual',
  },
  {
    name: 'Sunshine Division',
    organizationType: 'food_pantry',
    streetAddress: '687 N Thompson St',
    city: 'Portland',
    state: 'OR',
    zipCode: '97227',
    latitude: 45.5358,
    longitude: -122.6706,
    phone: '503-823-2102',
    website: 'https://www.sunshinedivision.org',
    hoursJson: { monday: { open: '09:00', close: '15:00' }, tuesday: { open: '09:00', close: '15:00' }, wednesday: { open: '09:00', close: '15:00' }, thursday: { open: '09:00', close: '15:00' }, friday: { open: '09:00', close: '15:00' } },
    hoursNotes: 'Walk-in emergency food boxes available',
    services: ['groceries', 'produce', 'baby_supplies'],
    eligibilityNotes: 'Serves Portland area residents',
    requiredDocuments: ['photo_id'],
    dataSource: 'manual',
  },
];

const STATE_DATA: Record<string, FoodBankSeed[]> = {
  NC: NC_FOOD_BANKS,
  NY: NY_FOOD_BANKS,
  OR: OR_FOOD_BANKS,
};

async function seedState(state: string, dryRun: boolean): Promise<number> {
  const banks = STATE_DATA[state];
  if (!banks) {
    console.error(`No data for state: ${state}`);
    return 0;
  }

  console.log(`\nSeeding ${banks.length} food banks for ${state}...`);

  if (dryRun) {
    banks.forEach((b) => console.log(`  [DRY RUN] Would insert: ${b.name} (${b.city}, ${b.state})`));
    return banks.length;
  }

  let inserted = 0;
  let skipped = 0;

  for (const bank of banks) {
    // Check if already exists (by name + state)
    const existing = await pool.query(
      'SELECT id FROM food_banks WHERE name = $1 AND state = $2',
      [bank.name, bank.state]
    );

    if (existing.rows.length > 0) {
      console.log(`  Skipping (exists): ${bank.name}`);
      skipped++;
      continue;
    }

    await pool.query(
      `INSERT INTO food_banks (
        name, organization_type, street_address, city, state, zip_code,
        latitude, longitude, phone, website,
        hours_json, hours_notes, services, eligibility_notes, required_documents,
        data_source, accepts_wic_participants, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, TRUE, TRUE)`,
      [
        bank.name,
        bank.organizationType,
        bank.streetAddress,
        bank.city,
        bank.state,
        bank.zipCode,
        bank.latitude,
        bank.longitude,
        bank.phone,
        bank.website,
        bank.hoursJson ? JSON.stringify(bank.hoursJson) : null,
        bank.hoursNotes,
        bank.services,
        bank.eligibilityNotes,
        bank.requiredDocuments,
        bank.dataSource,
      ]
    );

    console.log(`  Inserted: ${bank.name} (${bank.city})`);
    inserted++;
  }

  console.log(`  Done: ${inserted} inserted, ${skipped} skipped`);
  return inserted;
}

async function main() {
  const args = process.argv.slice(2);
  const stateIdx = args.indexOf('--state');
  const dryRun = args.includes('--dry-run');
  const stateArg = stateIdx >= 0 ? args[stateIdx + 1]?.toUpperCase() : null;

  if (!stateArg) {
    console.error('Usage: npx ts-node src/scripts/scrape-food-banks.ts --state <NC|NY|OR|all> [--dry-run]');
    process.exit(1);
  }

  console.log('=== Food Bank Seeder ===');
  if (dryRun) console.log('DRY RUN MODE — no database changes');

  const states = stateArg === 'ALL' ? Object.keys(STATE_DATA) : [stateArg];
  let total = 0;

  for (const state of states) {
    total += await seedState(state, dryRun);
  }

  console.log(`\nTotal: ${total} food banks processed`);
  await pool.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
