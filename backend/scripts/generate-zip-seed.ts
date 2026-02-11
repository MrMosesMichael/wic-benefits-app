/**
 * Generate SQL seed file from Census ZCTA Gazetteer data
 *
 * The Census file has: GEOID (zip), lat, lng but no city/state.
 * We derive state from zip code prefix ranges (well-known USPS mapping).
 *
 * Usage: npx ts-node scripts/generate-zip-seed.ts
 * Output: migrations/020_zip_codes_seed.sql
 */
import fs from 'fs';
import path from 'path';

// USPS zip code prefix → state mapping
// Source: https://en.wikipedia.org/wiki/ZIP_Code#Primary_state_prefixes
const ZIP_PREFIX_TO_STATE: Record<string, string> = {};

function addRange(start: number, end: number, state: string) {
  for (let i = start; i <= end; i++) {
    ZIP_PREFIX_TO_STATE[i.toString().padStart(3, '0')] = state;
  }
}

// Territories and states
addRange(6, 9, 'PR'); // Puerto Rico / VI
addRange(10, 14, 'MA');
addRange(15, 15, 'MA');
addRange(16, 16, 'ME');
addRange(17, 17, 'ME');
addRange(18, 19, 'NH');
addRange(20, 20, 'VT');
addRange(21, 21, 'NJ');
addRange(22, 22, 'NJ');
addRange(23, 23, 'PA');
addRange(24, 24, 'PA');
addRange(25, 27, 'MA');
addRange(28, 29, 'RI');
addRange(30, 30, 'NH');
addRange(31, 31, 'VT');
addRange(32, 32, 'ME');
addRange(33, 33, 'CT');
addRange(34, 34, 'CT');
addRange(35, 35, 'NY');
addRange(36, 36, 'NY');
addRange(37, 37, 'NY');
addRange(38, 38, 'PA');

// Remap more accurately with finer granularity
// This simple approach won't be perfect, let me use a proper mapping instead.

// Actually, let me use a cleaner approach - zip code to state via 3-digit prefix
const ZIP3_TO_STATE: [number, number, string][] = [
  // Connecticut
  [60, 69, 'CT'],
  // New Jersey
  [70, 89, 'NJ'],
  // Puerto Rico / VI
  [0, 5, 'PR'],
  [6, 9, 'PR'],
  // Massachusetts
  [10, 27, 'MA'],
  // Rhode Island
  [28, 29, 'RI'],
  // New Hampshire
  [30, 38, 'NH'],
  // Maine
  [39, 49, 'ME'],
  // Vermont
  [50, 59, 'VT'],
  // Connecticut (already above)
  // New Jersey (already above)
  // Military
  [90, 98, 'NY'], // AE military - assign to NY
  [99, 99, 'NY'],
  // New York
  [100, 149, 'NY'],
  // Pennsylvania
  [150, 196, 'PA'],
  // Delaware
  [197, 199, 'DE'],
  // DC
  [200, 205, 'DC'],
  // Maryland
  [206, 219, 'MD'],
  // Virginia
  [220, 246, 'VA'],
  // West Virginia
  [247, 268, 'WV'],
  // North Carolina
  [270, 289, 'NC'],
  // South Carolina
  [290, 299, 'SC'],
  // Georgia
  [300, 319, 'GA'],
  // Florida
  [320, 349, 'FL'],
  // Alabama
  [350, 369, 'AL'],
  // Tennessee
  [370, 385, 'TN'],
  // Mississippi
  [386, 397, 'MS'],
  // Kentucky
  [400, 427, 'KY'],
  // Ohio
  [430, 458, 'OH'],
  // Indiana
  [460, 479, 'IN'],
  // Michigan
  [480, 499, 'MI'],
  // Iowa
  [500, 528, 'IA'],
  // Wisconsin
  [530, 549, 'WI'],
  // Minnesota
  [550, 567, 'MN'],
  // South Dakota
  [570, 577, 'SD'],
  // North Dakota
  [580, 588, 'ND'],
  // Montana
  [590, 599, 'MT'],
  // Illinois
  [600, 629, 'IL'],
  // Missouri
  [630, 658, 'MO'],
  // Kansas
  [660, 679, 'KS'],
  // Nebraska
  [680, 693, 'NE'],
  // Louisiana
  [700, 714, 'LA'],
  // Arkansas
  [716, 729, 'AR'],
  // Oklahoma
  [730, 749, 'OK'],
  // Texas
  [750, 799, 'TX'],
  // Colorado
  [800, 816, 'CO'],
  // Wyoming
  [820, 831, 'WY'],
  // Idaho
  [832, 838, 'ID'],
  // Utah
  [840, 847, 'UT'],
  // Arizona
  [850, 865, 'AZ'],
  // New Mexico
  [870, 884, 'NM'],
  // Nevada
  [889, 898, 'NV'],
  // California
  [900, 961, 'CA'],
  // Hawaii
  [967, 968, 'HI'],
  // Guam
  [969, 969, 'GU'],
  // Oregon
  [970, 979, 'OR'],
  // Washington
  [980, 994, 'WA'],
  // Alaska
  [995, 999, 'AK'],
];

function getStateFromZip(zip: string): string | null {
  const prefix3 = parseInt(zip.substring(0, 3), 10);
  for (const [start, end, state] of ZIP3_TO_STATE) {
    if (prefix3 >= start && prefix3 <= end) {
      return state;
    }
  }
  return null;
}

function escapeSQL(s: string): string {
  return s.replace(/'/g, "''");
}

function main() {
  const gazetteerPath = path.join(__dirname, '../data/2024_Gaz_zcta_national.txt');

  if (!fs.existsSync(gazetteerPath)) {
    console.error(`File not found: ${gazetteerPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(gazetteerPath, 'utf-8');
  const lines = content.split('\n');

  console.log(`Processing ${lines.length - 1} lines...`);

  const records: { zip: string; lat: number; lng: number; state: string }[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Tab-delimited: GEOID, ALAND, AWATER, ALAND_SQMI, AWATER_SQMI, INTPTLAT, INTPTLONG
    const fields = line.split('\t').map(f => f.trim());
    const zip = fields[0].padStart(5, '0');
    const lat = parseFloat(fields[5]);
    const lng = parseFloat(fields[6]);

    if (zip.length !== 5 || isNaN(lat) || isNaN(lng)) {
      skipped++;
      continue;
    }

    const state = getStateFromZip(zip);
    if (!state) {
      skipped++;
      continue;
    }

    records.push({ zip, lat, lng, state });
  }

  console.log(`Valid records: ${records.length}, skipped: ${skipped}`);

  // Generate SQL
  const outputPath = path.join(__dirname, '../migrations/020_zip_codes_seed.sql');
  const BATCH = 500;

  let sql = `-- Auto-generated zip code seed data from US Census 2024 ZCTA Gazetteer
-- ${records.length} zip codes
-- Generated: ${new Date().toISOString()}

-- Create table if not exists
CREATE TABLE IF NOT EXISTS zip_codes (
  zip VARCHAR(5) PRIMARY KEY,
  lat DECIMAL(8, 5) NOT NULL,
  lng DECIMAL(8, 5) NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT '',
  state VARCHAR(2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_zip_codes_lat_lng ON zip_codes (lat, lng);
CREATE INDEX IF NOT EXISTS idx_zip_codes_state ON zip_codes (state);

-- Clear and re-seed
DELETE FROM zip_codes;

`;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    sql += `INSERT INTO zip_codes (zip, lat, lng, city, state) VALUES\n`;
    sql += batch.map(r =>
      `('${r.zip}', ${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}, '', '${r.state}')`
    ).join(',\n');
    sql += `;\n\n`;
  }

  // State distribution summary
  const stateCounts: Record<string, number> = {};
  for (const r of records) {
    stateCounts[r.state] = (stateCounts[r.state] || 0) + 1;
  }
  sql += `-- State distribution:\n`;
  Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([state, count]) => {
      sql += `-- ${state}: ${count}\n`;
    });

  fs.writeFileSync(outputPath, sql);
  console.log(`SQL seed file written: ${outputPath}`);
  console.log(`Size: ${(sql.length / 1024 / 1024).toFixed(1)} MB`);

  // Show state distribution
  console.log('\nState distribution (top 10):');
  Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([state, count]) => console.log(`  ${state}: ${count}`));
}

main();
