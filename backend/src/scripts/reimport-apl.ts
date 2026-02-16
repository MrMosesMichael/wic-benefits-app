#!/usr/bin/env ts-node
/**
 * APL Re-Import Script
 *
 * Re-imports NC and OR APL data from their correct Excel source files,
 * enriching the UPC-only entries with full product names, categories, and brands.
 *
 * Usage:
 *   npm run reimport-apl -- --state NC        # Re-import North Carolina
 *   npm run reimport-apl -- --state OR        # Re-import Oregon
 *   npm run reimport-apl -- --state all       # Re-import both
 *   npm run reimport-apl -- --state NC --dry-run  # Parse only, no DB writes
 */

import * as https from 'https';
import * as http from 'http';
import * as XLSX from 'xlsx';
import pool from '../config/database';

interface StateConfig {
  url: string;
  headerRow: number;
  columns: {
    upc: string;
    productName: string;
    brand?: string;
    category: string;
    subcategory: string;
    size?: string;
  };
}

const STATE_CONFIGS: Record<string, StateConfig> = {
  NC: {
    url: 'https://www.ncdhhs.gov/nc-wic-apl/open',
    headerRow: 2,
    columns: {
      upc: 'UPC',
      productName: 'PRODUCT DESCRIPTION',
      category: 'CATEGORY',
      subcategory: 'SUBCATEGORY DESCRIPTION',
      size: 'UOM',
    },
  },
  OR: {
    url: 'https://www.oregon.gov/oha/PH/HEALTHYPEOPLEFAMILIES/WIC/Documents/fdnp/Oregon-APL.xls',
    headerRow: 1,
    columns: {
      upc: 'UPC PLU',
      productName: 'Long Description',
      brand: 'Brand',
      category: 'Cat #',
      subcategory: 'Sub Cat Description',
      size: 'Units',
    },
  },
};

interface Args {
  state: string;
  dryRun: boolean;
  help: boolean;
}

function parseArgs(): Args {
  const args: Args = { state: '', dryRun: false, help: false };
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--state' || arg === '-s') {
      args.state = argv[++i]?.toUpperCase() || '';
    } else if (arg === '--dry-run' || arg === '-n') {
      args.dryRun = true;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
APL Re-Import — Enrich NC/OR product data from Excel source files

Usage:
  npm run reimport-apl -- --state <STATE> [--dry-run]

Options:
  --state, -s <STATE>   State to reimport: NC, OR, or all
  --dry-run, -n         Parse and report only, no database writes
  --help, -h            Show this help message

Examples:
  npm run reimport-apl -- --state NC           # Re-import North Carolina
  npm run reimport-apl -- --state OR           # Re-import Oregon
  npm run reimport-apl -- --state all          # Re-import both NC and OR
  npm run reimport-apl -- --state NC --dry-run # Preview without writing
`);
}

async function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (url.startsWith('https') ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 120000,
      headers: {
        'Host': urlObj.hostname,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, */*;q=0.8',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
      },
    };

    const request = protocol.request(options, response => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timed out'));
    });

    request.end();
  });
}

interface ParsedProduct {
  upc: string;
  productName: string;
  brand: string | null;
  size: string | null;
  category: string;
  subcategory: string | null;
}

function parseExcel(buffer: Buffer, config: StateConfig): ParsedProduct[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  console.log(`  Sheet: ${sheetName}`);

  // Auto-detect header row
  let headerRow = config.headerRow;
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const row = rawRows[i];
    if (row && row.some((cell: any) =>
      typeof cell === 'string' &&
      (cell.toUpperCase().includes('UPC') || cell.toUpperCase().includes('PLU'))
    )) {
      headerRow = i + 1;
      break;
    }
  }

  console.log(`  Header row: ${headerRow}`);

  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    range: headerRow - 1,
  });

  console.log(`  Total rows: ${rows.length}`);
  if (rows.length > 0) {
    console.log(`  Columns: ${Object.keys(rows[0]).join(', ')}`);
  }

  const products: ParsedProduct[] = [];
  let skippedEmpty = 0;
  let skippedInvalid = 0;

  for (const row of rows) {
    // Get UPC
    let upc = getVal(row, config.columns.upc);
    if (!upc) {
      skippedEmpty++;
      continue;
    }

    // Normalize UPC
    upc = upc.toString().replace(/[\s\-\.]/g, '');

    // Pad short UPCs
    if (upc.length > 0 && upc.length < 8) {
      upc = upc.padStart(12, '0');
    } else if (upc.length > 8 && upc.length < 12) {
      upc = upc.padStart(12, '0');
    } else if (upc.length > 14) {
      skippedInvalid++;
      continue;
    }

    const productName = getVal(row, config.columns.productName) || 'Unknown Product';
    const brand = config.columns.brand ? getVal(row, config.columns.brand) : null;
    const size = config.columns.size ? getVal(row, config.columns.size) : null;
    const category = getVal(row, config.columns.category) || 'uncategorized';
    const subcategory = getVal(row, config.columns.subcategory) || null;

    products.push({ upc, productName, brand, size, category, subcategory });
  }

  console.log(`  Parsed: ${products.length} products (skipped: ${skippedEmpty} empty UPC, ${skippedInvalid} invalid UPC)`);
  return products;
}

function getVal(row: Record<string, any>, columnName: string): string | null {
  const val = row[columnName];
  if (val === undefined || val === null || val === '') return null;
  return String(val).trim();
}

async function reimportState(state: string, dryRun: boolean): Promise<void> {
  const config = STATE_CONFIGS[state];
  if (!config) {
    console.error(`No config for state: ${state}`);
    return;
  }

  console.log(`\n[${ state}] Downloading from ${config.url}...`);
  const buffer = await downloadFile(config.url);
  console.log(`[${state}] Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);

  console.log(`[${state}] Parsing Excel...`);
  const products = parseExcel(buffer, config);

  if (products.length === 0) {
    console.error(`[${state}] No products parsed — aborting`);
    return;
  }

  // Show category distribution
  const catCounts: Record<string, number> = {};
  for (const p of products) {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
  }
  console.log(`\n[${state}] Category distribution:`);
  const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sorted.slice(0, 15)) {
    console.log(`  ${cat}: ${count}`);
  }
  if (sorted.length > 15) {
    console.log(`  ... and ${sorted.length - 15} more categories`);
  }

  // Show sample products
  console.log(`\n[${state}] Sample products:`);
  for (const p of products.slice(0, 5)) {
    console.log(`  UPC=${p.upc} | ${p.productName} | brand=${p.brand || '-'} | cat=${p.category} | sub=${p.subcategory || '-'}`);
  }

  if (dryRun) {
    console.log(`\n[${state}] DRY RUN — no database changes made`);
    console.log(`[${state}] Would upsert ${products.length} products`);
    return;
  }

  // Upsert products
  console.log(`\n[${state}] Upserting ${products.length} products...`);
  let added = 0;
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];

    try {
      const result = await pool.query(
        `INSERT INTO apl_products (upc, product_name, brand, size, category, subcategory, state, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (upc) DO UPDATE SET
           product_name = EXCLUDED.product_name,
           brand = EXCLUDED.brand,
           size = EXCLUDED.size,
           category = EXCLUDED.category,
           subcategory = EXCLUDED.subcategory,
           state = EXCLUDED.state,
           active = true,
           updated_at = CURRENT_TIMESTAMP
         RETURNING (xmax = 0) AS inserted`,
        [p.upc, p.productName, p.brand, p.size, p.category, p.subcategory, state]
      );

      if (result.rows[0]?.inserted) {
        added++;
      } else {
        updated++;
      }
    } catch (err) {
      errors++;
      if (errors <= 5) {
        console.error(`  Error on UPC ${p.upc}:`, err instanceof Error ? err.message : err);
      }
    }

    // Progress every 2000 rows
    if ((i + 1) % 2000 === 0) {
      console.log(`  Progress: ${i + 1}/${products.length} (added=${added}, updated=${updated})`);
    }
  }

  console.log(`\n[${state}] Complete:`);
  console.log(`  Added:   ${added}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors:  ${errors}`);
  console.log(`  Total:   ${products.length}`);

  // Verify
  const countResult = await pool.query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE product_name != 'Unknown Product') as named,
       COUNT(*) FILTER (WHERE category != 'uncategorized') as categorized
     FROM apl_products WHERE state = $1 AND active = true`,
    [state]
  );
  const row = countResult.rows[0];
  console.log(`\n[${state}] DB verification:`);
  console.log(`  Total active: ${row.total}`);
  console.log(`  With names:   ${row.named} (${((row.named / row.total) * 100).toFixed(1)}%)`);
  console.log(`  Categorized:  ${row.categorized} (${((row.categorized / row.total) * 100).toFixed(1)}%)`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.state) {
    console.error('Error: --state is required (NC, OR, or all)');
    printHelp();
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  APL Re-Import — Enrich NC/OR Product Data');
  console.log(`  Started: ${new Date().toISOString()}`);
  if (args.dryRun) console.log('  Mode: DRY RUN');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const states = args.state === 'ALL' ? ['NC', 'OR'] : [args.state];

    for (const state of states) {
      if (!STATE_CONFIGS[state]) {
        console.error(`Unknown state: ${state}. Supported: NC, OR`);
        continue;
      }
      await reimportState(state, args.dryRun);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  Completed: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
