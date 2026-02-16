/**
 * Seed WIC Clinic Data for MI, NC, NY, OR
 *
 * Usage:
 *   npx ts-node src/scripts/scrape-wic-clinics.ts --state MI
 *   npx ts-node src/scripts/scrape-wic-clinics.ts --state all
 *   npx ts-node src/scripts/scrape-wic-clinics.ts --state NC --dry-run
 *   npx ts-node src/scripts/scrape-wic-clinics.ts --state NY --force
 */

import pool from '../config/database';

interface WicClinicSeed {
  name: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  county: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  appointmentUrl: string | null;
  hoursJson: Record<string, { open: string; close: string }> | null;
  hoursNotes: string | null;
  services: string[];
  languages: string[];
  dataSource: string;
}

const WEEKDAY_HOURS = {
  monday: { open: '08:00', close: '17:00' },
  tuesday: { open: '08:00', close: '17:00' },
  wednesday: { open: '08:00', close: '17:00' },
  thursday: { open: '08:00', close: '17:00' },
  friday: { open: '08:00', close: '17:00' },
};

// --- MI Clinics ---
const MI_CLINICS: WicClinicSeed[] = [
  {
    name: 'Wayne County WIC - Detroit Main Office',
    streetAddress: '33030 Van Born Rd',
    city: 'Wayne',
    state: 'MI',
    zipCode: '48184',
    county: 'Wayne',
    latitude: 42.2814,
    longitude: -83.3863,
    phone: '734-727-7400',
    website: 'https://www.waynecounty.com/departments/hhvs/wic.aspx',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: 'Walk-ins accepted, appointments preferred',
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support', 'referrals'],
    languages: ['English', 'Spanish', 'Arabic'],
    dataSource: 'state_directory',
  },
  {
    name: 'Detroit Health Department WIC',
    streetAddress: '100 Mack Ave',
    city: 'Detroit',
    state: 'MI',
    zipCode: '48201',
    county: 'Wayne',
    latitude: 42.3422,
    longitude: -83.0502,
    phone: '313-876-4355',
    website: 'https://detroitmi.gov/departments/health-department',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: 'By appointment',
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish', 'Arabic', 'Bengali'],
    dataSource: 'state_directory',
  },
  {
    name: 'Oakland County WIC - Pontiac',
    streetAddress: '1200 N Telegraph Rd',
    city: 'Pontiac',
    state: 'MI',
    zipCode: '48341',
    county: 'Oakland',
    latitude: 42.6500,
    longitude: -83.2911,
    phone: '248-858-1311',
    website: 'https://www.oakgov.com/health',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: 'Appointments recommended',
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support', 'referrals'],
    languages: ['English', 'Spanish', 'Arabic'],
    dataSource: 'state_directory',
  },
  {
    name: 'Washtenaw County WIC',
    streetAddress: '555 Towner St',
    city: 'Ypsilanti',
    state: 'MI',
    zipCode: '48198',
    county: 'Washtenaw',
    latitude: 42.2411,
    longitude: -83.6129,
    phone: '734-544-6700',
    website: 'https://www.washtenaw.org/297/WIC',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: null,
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Genesee County WIC - Flint',
    streetAddress: '630 S Saginaw St Suite 4',
    city: 'Flint',
    state: 'MI',
    zipCode: '48502',
    county: 'Genesee',
    latitude: 43.0091,
    longitude: -83.6880,
    phone: '810-257-3612',
    website: 'https://www.gchd.us/services/wic/',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: 'Call for appointment',
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support', 'referrals'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Kent County WIC - Grand Rapids',
    streetAddress: '700 Fuller Ave NE',
    city: 'Grand Rapids',
    state: 'MI',
    zipCode: '49503',
    county: 'Kent',
    latitude: 42.9762,
    longitude: -85.6507,
    phone: '616-632-7200',
    website: 'https://www.accesskent.com/Health/WIC/',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: null,
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support', 'referrals'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Ingham County WIC - Lansing',
    streetAddress: '5303 S Cedar St',
    city: 'Lansing',
    state: 'MI',
    zipCode: '48911',
    county: 'Ingham',
    latitude: 42.6885,
    longitude: -84.5795,
    phone: '517-887-4311',
    website: 'https://hd.ingham.org/DepartmentalDirectory/WIC.aspx',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: 'Walk-ins welcome',
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Kalamazoo County WIC',
    streetAddress: '311 E Alcott St',
    city: 'Kalamazoo',
    state: 'MI',
    zipCode: '49001',
    county: 'Kalamazoo',
    latitude: 42.2943,
    longitude: -85.5756,
    phone: '269-373-5267',
    website: 'https://www.kalcounty.com/hcs/wic/',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: null,
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
];

// --- NC Clinics ---
const NC_CLINICS: WicClinicSeed[] = [
  {
    name: 'Wake County WIC - Raleigh',
    streetAddress: '10 Sunnybrook Rd',
    city: 'Raleigh',
    state: 'NC',
    zipCode: '27610',
    county: 'Wake',
    latitude: 35.7843,
    longitude: -78.6087,
    phone: '919-250-4098',
    website: 'https://www.wake.gov/departments-government/human-services/child-health/wic',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: 'Appointment required',
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support', 'referrals'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Mecklenburg County WIC - Charlotte',
    streetAddress: '249 Billingsley Rd',
    city: 'Charlotte',
    state: 'NC',
    zipCode: '28211',
    county: 'Mecklenburg',
    latitude: 35.1707,
    longitude: -80.8107,
    phone: '980-314-9180',
    website: 'https://www.mecknc.gov/HealthDepartment/WIC',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: 'Multiple locations in Mecklenburg County',
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support', 'referrals'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Guilford County WIC - Greensboro',
    streetAddress: '1100 E Wendover Ave Suite A',
    city: 'Greensboro',
    state: 'NC',
    zipCode: '27405',
    county: 'Guilford',
    latitude: 36.0612,
    longitude: -79.7533,
    phone: '336-641-7777',
    website: 'https://www.guilfordcountync.gov/our-county/human-services/health-department/wic',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: null,
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Durham County WIC',
    streetAddress: '414 E Main St',
    city: 'Durham',
    state: 'NC',
    zipCode: '27701',
    county: 'Durham',
    latitude: 35.9962,
    longitude: -78.8928,
    phone: '919-560-7842',
    website: 'https://www.dconc.gov/government/departments-a-e/public-health/wic-program',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: 'By appointment only',
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Forsyth County WIC - Winston-Salem',
    streetAddress: '799 N Highland Ave',
    city: 'Winston-Salem',
    state: 'NC',
    zipCode: '27101',
    county: 'Forsyth',
    latitude: 36.1040,
    longitude: -80.2507,
    phone: '336-703-3200',
    website: 'https://www.forsyth.cc/PublicHealth/wic.aspx',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: null,
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support', 'referrals'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Buncombe County WIC - Asheville',
    streetAddress: '40 Coxe Ave',
    city: 'Asheville',
    state: 'NC',
    zipCode: '28801',
    county: 'Buncombe',
    latitude: 35.5896,
    longitude: -82.5561,
    phone: '828-250-5000',
    website: 'https://www.buncombecounty.org/governing/depts/health/programs/wic.aspx',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: 'Appointments preferred',
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Cumberland County WIC - Fayetteville',
    streetAddress: '1235 Ramsey St',
    city: 'Fayetteville',
    state: 'NC',
    zipCode: '28301',
    county: 'Cumberland',
    latitude: 35.0576,
    longitude: -78.8783,
    phone: '910-433-3600',
    website: 'https://co.cumberland.nc.us/departments/public-health-group/health/wic',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: null,
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
];

// --- NY Clinics ---
const NY_CLINICS: WicClinicSeed[] = [
  {
    name: 'NYC WIC - Bronx Lebanon',
    streetAddress: '1276 Fulton Ave 3rd Floor',
    city: 'Bronx',
    state: 'NY',
    zipCode: '10456',
    county: 'Bronx',
    latitude: 40.8337,
    longitude: -73.9050,
    phone: '718-901-8810',
    website: 'https://www.health.ny.gov/prevention/nutrition/wic/',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: 'Walk-ins accepted',
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support', 'referrals'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Brooklyn WIC Center',
    streetAddress: '485 Throop Ave',
    city: 'Brooklyn',
    state: 'NY',
    zipCode: '11221',
    county: 'Kings',
    latitude: 40.6911,
    longitude: -73.9410,
    phone: '718-573-1693',
    website: 'https://www.health.ny.gov/prevention/nutrition/wic/',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: 'Appointment recommended',
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish', 'Haitian Creole'],
    dataSource: 'state_directory',
  },
  {
    name: 'Manhattan WIC Center',
    streetAddress: '158 E 115th St',
    city: 'New York',
    state: 'NY',
    zipCode: '10029',
    county: 'New York',
    latitude: 40.7973,
    longitude: -73.9425,
    phone: '212-360-0777',
    website: 'https://www.health.ny.gov/prevention/nutrition/wic/',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: null,
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Queens WIC Center - Jamaica',
    streetAddress: '90-37 Parsons Blvd',
    city: 'Jamaica',
    state: 'NY',
    zipCode: '11432',
    county: 'Queens',
    latitude: 40.7077,
    longitude: -73.8007,
    phone: '718-262-5555',
    website: 'https://www.health.ny.gov/prevention/nutrition/wic/',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: null,
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish', 'Chinese'],
    dataSource: 'state_directory',
  },
  {
    name: 'Erie County WIC - Buffalo',
    streetAddress: '95 Franklin St',
    city: 'Buffalo',
    state: 'NY',
    zipCode: '14202',
    county: 'Erie',
    latitude: 42.8846,
    longitude: -78.8759,
    phone: '716-858-7647',
    website: 'https://www2.erie.gov/health/wic',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: 'Multiple clinic sites in Erie County',
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support', 'referrals'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Monroe County WIC - Rochester',
    streetAddress: '111 Westfall Rd',
    city: 'Rochester',
    state: 'NY',
    zipCode: '14620',
    county: 'Monroe',
    latitude: 43.1294,
    longitude: -77.6222,
    phone: '585-753-5437',
    website: 'https://www.monroecounty.gov/hhs-wic',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: null,
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Albany County WIC',
    streetAddress: '175 Green St',
    city: 'Albany',
    state: 'NY',
    zipCode: '12202',
    county: 'Albany',
    latitude: 42.6443,
    longitude: -73.7553,
    phone: '518-447-4653',
    website: 'https://www.albanycounty.com/departments/health/community-health/wic-program',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: 'Appointment required',
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Nassau County WIC - Hempstead',
    streetAddress: '240 Old Country Rd',
    city: 'Mineola',
    state: 'NY',
    zipCode: '11501',
    county: 'Nassau',
    latitude: 40.7469,
    longitude: -73.6383,
    phone: '516-227-9424',
    website: 'https://www.nassaucountyny.gov/620/WIC-Nutrition-Program',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: null,
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support', 'referrals'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
];

// --- OR Clinics ---
const OR_CLINICS: WicClinicSeed[] = [
  {
    name: 'Multnomah County WIC - Portland',
    streetAddress: '426 SW Stark St 8th Floor',
    city: 'Portland',
    state: 'OR',
    zipCode: '97204',
    county: 'Multnomah',
    latitude: 45.5200,
    longitude: -122.6790,
    phone: '503-988-3503',
    website: 'https://www.multco.us/wic',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: 'Telehealth appointments available',
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support', 'referrals'],
    languages: ['English', 'Spanish', 'Vietnamese', 'Russian', 'Chinese'],
    dataSource: 'state_directory',
  },
  {
    name: 'Marion County WIC - Salem',
    streetAddress: '3180 Center St NE',
    city: 'Salem',
    state: 'OR',
    zipCode: '97301',
    county: 'Marion',
    latitude: 44.9408,
    longitude: -122.9911,
    phone: '503-588-5350',
    website: 'https://www.co.marion.or.us/HLT/WIC',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: null,
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish', 'Russian'],
    dataSource: 'state_directory',
  },
  {
    name: 'Lane County WIC - Eugene',
    streetAddress: '151 W 7th Ave Suite 310',
    city: 'Eugene',
    state: 'OR',
    zipCode: '97401',
    county: 'Lane',
    latitude: 44.0508,
    longitude: -123.0916,
    phone: '541-682-4041',
    website: 'https://lanecounty.org/government/county_departments/health_and_human_services/wic',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: 'Phone and in-person appointments',
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Jackson County WIC - Medford',
    streetAddress: '140 S Holly St',
    city: 'Medford',
    state: 'OR',
    zipCode: '97501',
    county: 'Jackson',
    latitude: 42.3253,
    longitude: -122.8747,
    phone: '541-774-8203',
    website: 'https://jacksoncountyor.org/hhs/WIC',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: null,
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Washington County WIC - Hillsboro',
    streetAddress: '155 N 1st Ave',
    city: 'Hillsboro',
    state: 'OR',
    zipCode: '97124',
    county: 'Washington',
    latitude: 45.5225,
    longitude: -122.9899,
    phone: '503-846-4402',
    website: 'https://www.washingtoncountyor.gov/hhs/wic',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: 'Multiple sites in Washington County',
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support', 'referrals'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Deschutes County WIC - Bend',
    streetAddress: '2577 NE Courtney Dr',
    city: 'Bend',
    state: 'OR',
    zipCode: '97701',
    county: 'Deschutes',
    latitude: 44.0879,
    longitude: -121.2851,
    phone: '541-322-7400',
    website: 'https://www.deschutes.org/health/page/wic',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: null,
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish'],
    dataSource: 'state_directory',
  },
  {
    name: 'Clackamas County WIC - Oregon City',
    streetAddress: '2051 Kaen Rd',
    city: 'Oregon City',
    state: 'OR',
    zipCode: '97045',
    county: 'Clackamas',
    latitude: 45.3332,
    longitude: -122.5881,
    phone: '503-655-8476',
    website: 'https://www.clackamas.us/wic',
    appointmentUrl: null,
    hoursJson: WEEKDAY_HOURS,
    hoursNotes: null,
    services: ['wic_enrollment', 'nutrition_education', 'breastfeeding_support'],
    languages: ['English', 'Spanish', 'Russian'],
    dataSource: 'state_directory',
  },
];

const STATE_DATA: Record<string, WicClinicSeed[]> = {
  MI: MI_CLINICS,
  NC: NC_CLINICS,
  NY: NY_CLINICS,
  OR: OR_CLINICS,
};

async function seedState(state: string, dryRun: boolean, force: boolean): Promise<number> {
  const clinics = STATE_DATA[state];
  if (!clinics) {
    console.error(`No data for state: ${state}`);
    return 0;
  }

  console.log(`\nSeeding ${clinics.length} WIC clinics for ${state}...`);

  if (force && !dryRun) {
    const deleted = await pool.query('DELETE FROM wic_clinics WHERE state = $1', [state]);
    console.log(`  Force mode: deleted ${deleted.rowCount} existing clinics for ${state}`);
  }

  if (dryRun) {
    clinics.forEach((c) => console.log(`  [DRY RUN] Would insert: ${c.name} (${c.city}, ${c.state})`));
    return clinics.length;
  }

  let inserted = 0;
  let skipped = 0;

  for (const clinic of clinics) {
    const existing = await pool.query(
      'SELECT id FROM wic_clinics WHERE name = $1 AND state = $2',
      [clinic.name, clinic.state]
    );

    if (existing.rows.length > 0) {
      console.log(`  Skipping (exists): ${clinic.name}`);
      skipped++;
      continue;
    }

    await pool.query(
      `INSERT INTO wic_clinics (
        name, street_address, city, state, zip_code, county,
        latitude, longitude, phone, website, appointment_url,
        hours_json, hours_notes, services, languages,
        data_source, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, TRUE)`,
      [
        clinic.name,
        clinic.streetAddress,
        clinic.city,
        clinic.state,
        clinic.zipCode,
        clinic.county,
        clinic.latitude,
        clinic.longitude,
        clinic.phone,
        clinic.website,
        clinic.appointmentUrl,
        clinic.hoursJson ? JSON.stringify(clinic.hoursJson) : null,
        clinic.hoursNotes,
        clinic.services,
        clinic.languages,
        clinic.dataSource,
      ]
    );

    console.log(`  Inserted: ${clinic.name} (${clinic.city})`);
    inserted++;
  }

  console.log(`  Done: ${inserted} inserted, ${skipped} skipped`);
  return inserted;
}

async function main() {
  const args = process.argv.slice(2);
  const stateIdx = args.indexOf('--state');
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const stateArg = stateIdx >= 0 ? args[stateIdx + 1]?.toUpperCase() : null;

  if (!stateArg) {
    console.error('Usage: npx ts-node src/scripts/scrape-wic-clinics.ts --state <MI|NC|NY|OR|all> [--dry-run] [--force]');
    process.exit(1);
  }

  console.log('=== WIC Clinic Seeder ===');
  if (dryRun) console.log('DRY RUN MODE — no database changes');
  if (force) console.log('FORCE MODE — existing data will be replaced');

  const states = stateArg === 'ALL' ? Object.keys(STATE_DATA) : [stateArg];
  let total = 0;

  for (const state of states) {
    total += await seedState(state, dryRun, force);
  }

  console.log(`\nTotal: ${total} WIC clinics processed`);
  await pool.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
