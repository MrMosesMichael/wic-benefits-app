import pool from '../config/database';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Michigan WIC APL Data Importer
 *
 * Downloads and imports Michigan's WIC Approved Product List (APL) into the database.
 *
 * Michigan APL Source: https://www.michigan.gov/mdhhs/assistance-programs/wic/wicvendors/wic-foods
 * Format: Excel spreadsheet with UPC codes and product details
 *
 * Usage:
 *   1. Download the Michigan APL Excel file from the link above
 *   2. Place it in backend/data/michigan-apl.xlsx
 *   3. Run: npm run import-apl
 */

interface APLRow {
  upc?: string;
  product_name?: string;
  brand?: string;
  size?: string;
  category?: string;
  subcategory?: string;
  restrictions?: string;
}

async function importMichiganAPL() {
  const aplFilePath = path.join(__dirname, '../../data/michigan-apl.xlsx');

  console.log('🔄 Michigan WIC APL Importer');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if file exists
  if (!fs.existsSync(aplFilePath)) {
    console.error('❌ APL file not found at:', aplFilePath);
    console.log('\n📋 Instructions:');
    console.log('1. Download Michigan APL Excel from:');
    console.log('   https://www.michigan.gov/mdhhs/assistance-programs/wic/wicvendors/wic-foods');
    console.log('2. Save as: backend/data/michigan-apl.xlsx');
    console.log('3. Run this script again\n');
    process.exit(1);
  }

  try {
    // Read Excel file
    console.log('📂 Reading Excel file...');
    const workbook = XLSX.readFile(aplFilePath);
    const sheetName = workbook.SheetNames[0]; // First sheet
    const worksheet = workbook.Sheets[sheetName];
    const data: APLRow[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✅ Found ${data.length} rows in spreadsheet\n`);

    // Clear existing Michigan APL data
    console.log('🗑️  Clearing existing Michigan APL data...');
    await pool.query("DELETE FROM apl_products WHERE state = 'MI'");

    // Insert new data
    console.log('💾 Importing APL data...');
    let imported = 0;
    let skipped = 0;

    for (const row of data) {
      // Skip rows without UPC
      if (!row.upc || row.upc.trim() === '') {
        skipped++;
        continue;
      }

      // Normalize UPC (remove spaces, dashes)
      const upc = row.upc.toString().replace(/[\s\-]/g, '');

      // Skip invalid UPCs
      if (upc.length < 8 || upc.length > 14) {
        skipped++;
        continue;
      }

      try {
        await pool.query(
          `INSERT INTO apl_products (upc, product_name, brand, size, category, subcategory, restrictions, state)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'MI')
           ON CONFLICT (upc) DO UPDATE SET
             product_name = EXCLUDED.product_name,
             brand = EXCLUDED.brand,
             size = EXCLUDED.size,
             category = EXCLUDED.category,
             subcategory = EXCLUDED.subcategory,
             restrictions = EXCLUDED.restrictions,
             updated_at = CURRENT_TIMESTAMP`,
          [
            upc,
            row.product_name || 'Unknown Product',
            row.brand || null,
            row.size || null,
            row.category || 'uncategorized',
            row.subcategory || null,
            row.restrictions || null,
          ]
        );
        imported++;

        if (imported % 100 === 0) {
          process.stdout.write(`  Imported ${imported}...\r`);
        }
      } catch (err) {
        console.error(`⚠️  Error importing UPC ${upc}:`, err);
      }
    }

    console.log(`\n✅ Import complete!`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${data.length}\n`);

    // Show sample of imported data
    const sample = await pool.query(
      "SELECT upc, product_name, brand, category FROM apl_products WHERE state = 'MI' LIMIT 5"
    );
    console.log('📦 Sample products:');
    sample.rows.forEach(p => {
      console.log(`   ${p.upc} - ${p.product_name} (${p.brand || 'N/A'}) - ${p.category}`);
    });

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importMichiganAPL();
