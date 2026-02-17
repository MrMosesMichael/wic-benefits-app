#!/usr/bin/env ts-node
/**
 * UPC Enrichment via Open Food Facts API
 *
 * Looks up product UPCs in Open Food Facts to get real brand names,
 * better product descriptions, and size info.
 *
 * Usage:
 *   npm run enrich-upc -- --state MI                    # Enrich MI products
 *   npm run enrich-upc -- --state MI --dry-run          # Preview only
 *   npm run enrich-upc -- --state MI --category cereal  # Only cereal products
 *   npm run enrich-upc -- --state MI --offset 500       # Resume from product 500
 *   npm run enrich-upc -- --state all                   # All states
 */

import * as https from 'https';
import pool from '../config/database';

interface Args {
  state: string;
  dryRun: boolean;
  category: string;
  offset: number;
  help: boolean;
}

function parseArgs(): Args {
  const args: Args = { state: '', dryRun: false, category: '', offset: 0, help: false };
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--state' || arg === '-s') {
      args.state = argv[++i]?.toUpperCase() || '';
    } else if (arg === '--dry-run' || arg === '-n') {
      args.dryRun = true;
    } else if (arg === '--category' || arg === '-c') {
      args.category = argv[++i]?.toLowerCase() || '';
    } else if (arg === '--offset' || arg === '-o') {
      args.offset = parseInt(argv[++i] || '0', 10) || 0;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
UPC Enrichment — Look up brands and names via Open Food Facts API

Usage:
  npm run enrich-upc -- --state <STATE> [options]

Options:
  --state, -s <STATE>      State to enrich: MI, NC, OR, NY, or all
  --dry-run, -n            Preview API lookups, no database writes
  --category, -c <CAT>     Only enrich products in this category
  --offset, -o <N>         Skip first N products (for resuming)
  --help, -h               Show this help message

Examples:
  npm run enrich-upc -- --state MI                    # Enrich all MI products
  npm run enrich-upc -- --state MI --dry-run          # Preview only
  npm run enrich-upc -- --state MI --category cereal  # Only cereal
  npm run enrich-upc -- --state MI --offset 500       # Resume from #500
  npm run enrich-upc -- --state all                   # All states
`);
}

interface OFFProduct {
  product_name?: string;
  brands?: string;
  quantity?: string;
}

interface OFFResponse {
  status: number;
  product?: OFFProduct;
}

function fetchOFF(upc: string): Promise<OFFResponse> {
  return new Promise((resolve, reject) => {
    const url = `https://world.openfoodfacts.org/api/v2/product/${upc}.json?fields=product_name,brands,quantity`;

    const request = https.get(url, {
      headers: {
        'User-Agent': 'WICBenefitsApp/1.0 (contact: admin@mdmichael.com)',
      },
      timeout: 10000,
    }, (response) => {
      if (response.statusCode !== 200) {
        resolve({ status: 0 });
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString('utf-8');
          const data = JSON.parse(body);
          resolve(data as OFFResponse);
        } catch {
          resolve({ status: 0 });
        }
      });
      response.on('error', () => resolve({ status: 0 }));
    });

    request.on('error', () => resolve({ status: 0 }));
    request.on('timeout', () => {
      request.destroy();
      resolve({ status: 0 });
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface EnrichStats {
  total: number;
  found: number;
  notFound: number;
  brandSet: number;
  nameImproved: number;
  sizeSet: number;
  updated: number;
  errors: number;
}

async function enrichState(state: string, args: Args): Promise<EnrichStats> {
  const stats: EnrichStats = {
    total: 0, found: 0, notFound: 0,
    brandSet: 0, nameImproved: 0, sizeSet: 0,
    updated: 0, errors: 0,
  };

  // Build query for products needing enrichment
  const conditions = [`state = $1`, `active = true`, `(brand IS NULL OR brand = '')`];
  const params: any[] = [state];

  if (args.category) {
    params.push(args.category);
    conditions.push(`LOWER(category) = $${params.length}`);
  }

  const query = `SELECT id, upc, product_name, brand, size
    FROM apl_products
    WHERE ${conditions.join(' AND ')}
    ORDER BY id
    OFFSET $${params.length + 1}`;
  params.push(args.offset);

  const result = await pool.query(query, params);
  const products = result.rows;
  stats.total = products.length;

  console.log(`\n[${state}] Found ${products.length} products needing enrichment`);
  if (args.category) console.log(`  Category filter: ${args.category}`);
  if (args.offset > 0) console.log(`  Offset: ${args.offset}`);

  if (products.length === 0) {
    console.log(`[${state}] Nothing to enrich`);
    return stats;
  }

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const upc = product.upc;

    // Call Open Food Facts API
    const off = await fetchOFF(upc);

    if (off.status !== 1 || !off.product) {
      stats.notFound++;

      // Progress every 100
      if ((i + 1) % 100 === 0) {
        console.log(`  [${i + 1}/${products.length}] hits=${stats.found} misses=${stats.notFound} updated=${stats.updated}`);
      }

      await sleep(500);
      continue;
    }

    stats.found++;
    const offProduct = off.product;

    // Determine what to update
    const updates: string[] = [];
    const updateParams: any[] = [];
    let paramIdx = 1;

    // Brand: set if currently empty and OFF has it
    const offBrand = offProduct.brands?.trim();
    if (offBrand && (!product.brand || product.brand === '')) {
      updates.push(`brand = $${paramIdx++}`);
      updateParams.push(offBrand.substring(0, 100));
      stats.brandSet++;
    }

    // Product name: improve if current is very short and OFF has a longer one
    const offName = offProduct.product_name?.trim();
    if (offName && offName.length > (product.product_name?.length || 0) && (product.product_name?.length || 0) < 20) {
      updates.push(`product_name = $${paramIdx++}`);
      updateParams.push(offName.substring(0, 255));
      stats.nameImproved++;
    }

    // Size: set if currently empty and OFF has quantity
    const offSize = offProduct.quantity?.trim();
    if (offSize && (!product.size || product.size === '')) {
      updates.push(`size = $${paramIdx++}`);
      updateParams.push(offSize.substring(0, 50));
      stats.sizeSet++;
    }

    if (updates.length > 0) {
      if (args.dryRun) {
        console.log(`  [DRY RUN] UPC=${upc} | "${product.product_name}" → brand="${offBrand || '-'}" name="${offName || '-'}" size="${offSize || '-'}"`);
      } else {
        try {
          updates.push(`updated_at = CURRENT_TIMESTAMP`);
          updateParams.push(product.id);
          await pool.query(
            `UPDATE apl_products SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
            updateParams,
          );
          stats.updated++;
        } catch (err) {
          stats.errors++;
          if (stats.errors <= 5) {
            console.error(`  Error updating UPC ${upc}:`, err instanceof Error ? err.message : err);
          }
        }
      }
    }

    // Progress every 100
    if ((i + 1) % 100 === 0) {
      console.log(`  [${i + 1}/${products.length}] hits=${stats.found} misses=${stats.notFound} updated=${stats.updated}`);
    }

    // Rate limit: 500ms between API calls
    await sleep(500);
  }

  return stats;
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.state) {
    console.error('Error: --state is required (MI, NC, OR, NY, or all)');
    printHelp();
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  UPC Enrichment via Open Food Facts');
  console.log(`  Started: ${new Date().toISOString()}`);
  if (args.dryRun) console.log('  Mode: DRY RUN');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const allStates = ['MI', 'NC', 'OR', 'NY'];
    const states = args.state === 'ALL' ? allStates : [args.state];

    for (const state of states) {
      if (!allStates.includes(state)) {
        console.error(`Unknown state: ${state}. Supported: ${allStates.join(', ')}`);
        continue;
      }

      const stats = await enrichState(state, args);

      console.log(`\n[${state}] Results:`);
      console.log(`  Total products:   ${stats.total}`);
      console.log(`  API hits:         ${stats.found} (${stats.total > 0 ? ((stats.found / stats.total) * 100).toFixed(1) : 0}%)`);
      console.log(`  API misses:       ${stats.notFound}`);
      console.log(`  Brands set:       ${stats.brandSet}`);
      console.log(`  Names improved:   ${stats.nameImproved}`);
      console.log(`  Sizes set:        ${stats.sizeSet}`);
      console.log(`  DB rows updated:  ${stats.updated}`);
      console.log(`  Errors:           ${stats.errors}`);
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
