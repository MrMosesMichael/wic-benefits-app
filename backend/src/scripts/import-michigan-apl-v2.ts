import pool from '../config/database';
import * as XLSX from 'xlsx';
import * as path from 'path';

/**
 * Michigan WIC APL Data Importer - Version 2
 *
 * Imports three Michigan WIC data sources:
 * 1. Michigan APL (9,941 products)
 * 2. Cage-Free Eggs (66 products)
 * 3. WIC PLUs for fresh produce (2,378 items)
 */

interface APLProduct {
  category: string;
  catDesc: string;
  subcat: string;
  subcatDesc: string;
  upc: string;
  brand: string;
  foodDescription: string;
  packageSize: string;
  productDescription: string;
  unitOfMeasure: string;
}

interface EggProduct {
  cat: string;
  subcat: string;
  upc: string;
  brandName: string;
  description: string;
}

interface PLUProduct {
  plu: string;
  checkDigit: string;
  pluWithCheckDigit: string;
  category: string;
  commodity: string;
  variety: string;
  size: string;
}

/**
 * Map WIC category codes to our benefit categories
 */
function mapCategory(catCode: string, catDesc: string, subcatDesc: string): string {
  const code = catCode?.toString().trim();
  const desc = (catDesc || '').toLowerCase();
  const subdesc = (subcatDesc || '').toLowerCase();

  // Map based on category code and descriptions
  if (code === '52' || desc.includes('milk') || subdesc.includes('milk')) {
    return 'milk';
  }
  if (code === '03' || desc.includes('egg') || subdesc.includes('egg')) {
    return 'eggs';
  }
  if (desc.includes('cereal') || subdesc.includes('cereal')) {
    return 'cereal';
  }
  if (desc.includes('peanut butter') || subdesc.includes('peanut butter')) {
    return 'peanut_butter';
  }
  if (desc.includes('juice') || subdesc.includes('juice')) {
    return 'juice';
  }
  if (desc.includes('cheese') || subdesc.includes('cheese')) {
    return 'cheese';
  }
  if (desc.includes('grain') || desc.includes('bread') || desc.includes('tortilla')) {
    return 'whole_grains';
  }
  if (desc.includes('formula') || subdesc.includes('formula')) {
    return 'infant_food';
  }
  if (desc.includes('infant food') || desc.includes('baby food')) {
    return 'infant_food';
  }
  if (desc.includes('fruit') || desc.includes('vegetable') || desc.includes('produce')) {
    return 'fruits_vegetables';
  }

  return 'uncategorized';
}

async function importMainAPL() {
  console.log('\n📦 Importing Main Michigan APL...');
  const filePath = path.join(__dirname, '../../data/michigan-apl.xlsx');

  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets['Export Worksheet'];

  // Read as array of arrays to handle the weird header structure
  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  // Skip first row (header row)
  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Column mapping based on inspection:
    // 0: Category, 1: Cat Desc, 2: SubCat, 3: Subcat Desc,
    // 4: UPC/PLU, 5: Brand Name, 6: Food Description, 7: Package Size,
    // 8: Product Description, 9: Unit of Measure, 10: Auth Date, 11: Effective Date

    const upc = (row[4] || '').toString().trim().replace(/[\s\-]/g, '');

    if (!upc || upc.length < 4) {
      skipped++;
      continue;
    }

    const category = mapCategory(row[0], row[1], row[3]);
    const brand = (row[5] || '').toString().trim();
    const productName = (row[6] || row[8] || 'Unknown Product').toString().trim();
    const size = (row[7] || '').toString().trim();
    const subcatDesc = (row[3] || '').toString().trim();

    try {
      await pool.query(
        `INSERT INTO apl_products (upc, product_name, brand, size, category, subcategory, state)
         VALUES ($1, $2, $3, $4, $5, $6, 'MI')
         ON CONFLICT (upc) DO UPDATE SET
           product_name = EXCLUDED.product_name,
           brand = EXCLUDED.brand,
           size = EXCLUDED.size,
           category = EXCLUDED.category,
           subcategory = EXCLUDED.subcategory,
           updated_at = CURRENT_TIMESTAMP`,
        [upc, productName, brand || null, size || null, category, subcatDesc || null]
      );
      imported++;

      if (imported % 500 === 0) {
        process.stdout.write(`  Imported ${imported}...\r`);
      }
    } catch (err) {
      // Silently skip duplicates or errors
      skipped++;
    }
  }

  console.log(`\n  ✅ Main APL: ${imported} products imported, ${skipped} skipped`);
  return imported;
}

async function importEggs() {
  console.log('\n🥚 Importing Cage-Free Eggs...');
  const filePath = path.join(__dirname, '../../data/18012026-michigan-egg-upc.xlsx');

  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets['Export Worksheet'];

  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  let imported = 0;
  let skipped = 0;

  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Column mapping:
    // 0: Cat, 1: Subcat, 2: UPC Code, 3: Authorized,
    // 4: Effective Date, 5: Auth Date, 6: Brand Name, 7: Description

    const upc = (row[2] || '').toString().trim().replace(/[\s\-]/g, '');

    if (!upc || upc.length < 8) {
      skipped++;
      continue;
    }

    const brand = (row[6] || '').toString().trim();
    const description = (row[7] || 'Cage-Free Eggs').toString().trim();

    try {
      await pool.query(
        `INSERT INTO apl_products (upc, product_name, brand, size, category, subcategory, state)
         VALUES ($1, $2, $3, $4, $5, $6, 'MI')
         ON CONFLICT (upc) DO UPDATE SET
           product_name = EXCLUDED.product_name,
           brand = EXCLUDED.brand,
           category = EXCLUDED.category,
           subcategory = EXCLUDED.subcategory,
           updated_at = CURRENT_TIMESTAMP`,
        [upc, description, brand || null, 'DOZEN', 'eggs', 'Cage-Free Eggs']
      );
      imported++;
    } catch (err) {
      skipped++;
    }
  }

  console.log(`  ✅ Cage-Free Eggs: ${imported} products imported, ${skipped} skipped`);
  return imported;
}

async function importPLUs() {
  console.log('\n🍎 Importing WIC PLUs (Fresh Produce)...');
  const filePath = path.join(__dirname, '../../data/18012026-michigan-wic-plu.xlsx');

  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets['WIC Authorized PLUs'];

  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  let imported = 0;
  let skipped = 0;

  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Column mapping:
    // 0: PLU, 1: Check Digit, 2: PLU with Check Digit, 3: 17 Digit PLU,
    // 4: PLU Data Length, 5: CATEGORY, 6: COMMODITY, 7: VARIETY, 8: SIZE

    const plu = (row[2] || row[0] || '').toString().trim(); // Use PLU with check digit

    if (!plu || plu.length < 4) {
      skipped++;
      continue;
    }

    const commodity = (row[6] || '').toString().trim();
    const variety = (row[7] || '').toString().trim();
    const size = (row[8] || '').toString().trim();

    let productName = commodity;
    if (variety) {
      productName += ` - ${variety}`;
    }
    if (size && size !== 'NONE') {
      productName += ` (${size})`;
    }

    try {
      await pool.query(
        `INSERT INTO apl_products (upc, product_name, brand, size, category, subcategory, state)
         VALUES ($1, $2, $3, $4, $5, $6, 'MI')
         ON CONFLICT (upc) DO UPDATE SET
           product_name = EXCLUDED.product_name,
           size = EXCLUDED.size,
           category = EXCLUDED.category,
           subcategory = EXCLUDED.subcategory,
           updated_at = CURRENT_TIMESTAMP`,
        [
          plu,
          productName || 'Fresh Produce',
          null, // No brand for PLU items
          size && size !== 'NONE' ? size : null,
          'fruits_vegetables',
          variety || commodity
        ]
      );
      imported++;

      if (imported % 500 === 0) {
        process.stdout.write(`  Imported ${imported}...\r`);
      }
    } catch (err) {
      skipped++;
    }
  }

  console.log(`\n  ✅ PLU Products: ${imported} items imported, ${skipped} skipped`);
  return imported;
}

async function importAll() {
  console.log('🔄 Michigan WIC Data Importer v2');
  console.log('━'.repeat(60));

  try {
    // Clear existing Michigan data
    console.log('\n🗑️  Clearing existing Michigan data...');
    await pool.query("DELETE FROM apl_products WHERE state = 'MI'");

    // Import all three sources
    const aplCount = await importMainAPL();
    const eggCount = await importEggs();
    const pluCount = await importPLUs();

    const total = aplCount + eggCount + pluCount;

    console.log('\n' + '━'.repeat(60));
    console.log('✅ Import Complete!');
    console.log(`   Total products imported: ${total}`);
    console.log('━'.repeat(60));

    // Show sample products from each category
    console.log('\n📦 Sample products by category:\n');
    const categories = ['milk', 'eggs', 'cereal', 'peanut_butter', 'fruits_vegetables'];

    for (const cat of categories) {
      const sample = await pool.query(
        `SELECT upc, product_name, brand, size
         FROM apl_products
         WHERE state = 'MI' AND category = $1
         LIMIT 2`,
        [cat]
      );

      if (sample.rows.length > 0) {
        console.log(`${cat}:`);
        sample.rows.forEach(p => {
          console.log(`  - ${p.product_name} ${p.brand ? `(${p.brand})` : ''} [${p.upc}]`);
        });
      }
    }

    // Show category breakdown
    console.log('\n📊 Products by category:');
    const breakdown = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM apl_products
      WHERE state = 'MI'
      GROUP BY category
      ORDER BY count DESC
    `);
    breakdown.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count}`);
    });

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importAll();
