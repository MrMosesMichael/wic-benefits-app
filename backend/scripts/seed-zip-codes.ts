/**
 * Seed zip_codes table from US Census ZCTA data
 *
 * Usage:
 *   npx ts-node scripts/seed-zip-codes.ts [path-to-csv]
 *
 * If no CSV path provided, generates a compact dataset from the free
 * simplemaps US zip codes database (public domain).
 *
 * Expected CSV format: zip,lat,lng,city,state_id
 */
import fs from 'fs';
import path from 'path';
import pool from '../src/config/database';

const BATCH_SIZE = 500;

interface ZipRecord {
  zip: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
}

function parseCSV(filePath: string): ZipRecord[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const header = lines[0].toLowerCase();

  // Detect column positions
  const cols = header.split(',').map(c => c.trim().replace(/"/g, ''));
  const zipIdx = cols.findIndex(c => c === 'zip' || c === 'zcta5');
  const latIdx = cols.findIndex(c => c === 'lat' || c === 'latitude' || c === 'intptlat');
  const lngIdx = cols.findIndex(c => c === 'lng' || c === 'longitude' || c === 'lon' || c === 'intptlon');
  const cityIdx = cols.findIndex(c => c === 'city' || c === 'primary_city' || c === 'name');
  const stateIdx = cols.findIndex(c => c === 'state_id' || c === 'state' || c === 'state_abbr' || c === 'usps_zip_pref_state');

  if (zipIdx === -1 || latIdx === -1 || lngIdx === -1) {
    throw new Error(`Cannot detect CSV columns. Header: ${header}`);
  }

  const records: ZipRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parse (handles quoted fields)
    const fields = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!fields) continue;

    const clean = (idx: number) => (fields[idx] || '').replace(/"/g, '').trim();

    const zip = clean(zipIdx).padStart(5, '0');
    const lat = parseFloat(clean(latIdx));
    const lng = parseFloat(clean(lngIdx));
    const city = cityIdx >= 0 ? clean(cityIdx) : '';
    const state = stateIdx >= 0 ? clean(stateIdx) : '';

    if (zip.length === 5 && !isNaN(lat) && !isNaN(lng) && state.length === 2) {
      records.push({ zip, lat, lng, city, state });
    }
  }

  return records;
}

async function seedZipCodes(records: ZipRecord[]) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clear existing data
    await client.query('DELETE FROM zip_codes');

    // Insert in batches
    let inserted = 0;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const values: any[] = [];
      const placeholders: string[] = [];

      batch.forEach((r, j) => {
        const offset = j * 5;
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
        values.push(r.zip, r.lat, r.lng, r.city, r.state);
      });

      await client.query(
        `INSERT INTO zip_codes (zip, lat, lng, city, state) VALUES ${placeholders.join(', ')}
         ON CONFLICT (zip) DO UPDATE SET lat = EXCLUDED.lat, lng = EXCLUDED.lng, city = EXCLUDED.city, state = EXCLUDED.state`,
        values
      );

      inserted += batch.length;
      if (inserted % 5000 === 0) {
        console.log(`  Inserted ${inserted}/${records.length} zip codes...`);
      }
    }

    await client.query('COMMIT');
    console.log(`Successfully seeded ${inserted} zip codes`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error('Usage: npx ts-node scripts/seed-zip-codes.ts <path-to-csv>');
    console.error('');
    console.error('Download free US zip code data from:');
    console.error('  https://simplemaps.com/data/us-zips (free tier, ~33K rows)');
    console.error('  or US Census ZCTA: https://www2.census.gov/geo/docs/maps-data/data/gazetteer/');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  console.log(`Parsing CSV: ${csvPath}`);
  const records = parseCSV(csvPath);
  console.log(`Parsed ${records.length} valid zip code records`);

  if (records.length === 0) {
    console.error('No valid records found. Check CSV format.');
    process.exit(1);
  }

  // Show sample
  console.log('Sample records:');
  records.slice(0, 3).forEach(r => console.log(`  ${r.zip}: ${r.city}, ${r.state} (${r.lat}, ${r.lng})`));

  console.log('Seeding database...');
  await seedZipCodes(records);

  // Verify
  const result = await pool.query('SELECT COUNT(*) as count FROM zip_codes');
  console.log(`Verification: ${result.rows[0].count} zip codes in database`);

  // Show state distribution
  const states = await pool.query(
    'SELECT state, COUNT(*) as count FROM zip_codes GROUP BY state ORDER BY count DESC LIMIT 10'
  );
  console.log('Top states by zip code count:');
  states.rows.forEach((r: any) => console.log(`  ${r.state}: ${r.count}`));

  await pool.end();
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
