#!/usr/bin/env node
/**
 * Import Michigan APL JSON data to PostgreSQL
 * Usage: node import-apl-to-db.js <path-to-michigan-apl.json>
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Get file path from command line argument
const jsonFilePath = process.argv[2];

if (!jsonFilePath) {
  console.error('❌ Error: Please provide path to michigan-apl.json');
  console.error('Usage: node import-apl-to-db.js <path-to-json-file>');
  process.exit(1);
}

if (!fs.existsSync(jsonFilePath)) {
  console.error(`❌ Error: File not found: ${jsonFilePath}`);
  process.exit(1);
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function importAPL() {
  console.log('📦 WIC Michigan APL Data Import');
  console.log('================================\n');

  try {
    // Read JSON file
    console.log(`📖 Reading file: ${jsonFilePath}`);
    const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
    const products = JSON.parse(fileContent);

    console.log(`✅ Loaded ${products.length} products from JSON\n`);

    // Connect to database
    console.log('🔌 Connecting to database...');
    await pool.query('SELECT 1');
    console.log('✅ Database connected\n');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'apl_products'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('❌ Error: apl_products table does not exist');
      console.error('Run migrations first: see deployment/DEPLOYMENT.md');
      process.exit(1);
    }

    // Clear existing data (optional - comment out if you want to keep existing)
    console.log('🗑️  Clearing existing APL data...');
    const deleteResult = await pool.query('DELETE FROM apl_products WHERE state = $1', ['MI']);
    console.log(`✅ Removed ${deleteResult.rowCount} existing Michigan products\n`);

    // Insert products in batches
    const batchSize = 100;
    let imported = 0;
    let skipped = 0;

    console.log('📥 Importing products...');

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      for (const product of batch) {
        try {
          await pool.query(`
            INSERT INTO apl_products (
              state,
              upc,
              product_name,
              brand,
              size,
              category,
              subcategory,
              participant_types,
              restrictions,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            ON CONFLICT (state, upc) DO UPDATE SET
              product_name = EXCLUDED.product_name,
              brand = EXCLUDED.brand,
              size = EXCLUDED.size,
              category = EXCLUDED.category,
              subcategory = EXCLUDED.subcategory,
              participant_types = EXCLUDED.participant_types,
              restrictions = EXCLUDED.restrictions,
              updated_at = NOW()
          `, [
            'MI',
            product.upc,
            product.name,
            product.brand || null,
            product.size || null,
            product.category || null,
            product.subcategory || null,
            product.participantTypes ? JSON.stringify(product.participantTypes) : null,
            product.restrictions || null
          ]);

          imported++;
        } catch (err) {
          console.error(`⚠️  Skipped product ${product.upc}: ${err.message}`);
          skipped++;
        }
      }

      // Progress indicator
      process.stdout.write(`\r   Progress: ${Math.min(i + batchSize, products.length)}/${products.length} products`);
    }

    console.log('\n');
    console.log('================================');
    console.log('✅ Import Complete!');
    console.log(`   Imported: ${imported} products`);
    console.log(`   Skipped:  ${skipped} products`);
    console.log('================================\n');

    // Verify import
    const countResult = await pool.query('SELECT COUNT(*) FROM apl_products WHERE state = $1', ['MI']);
    console.log(`📊 Total Michigan products in database: ${countResult.rows[0].count}\n`);

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run import
importAPL();
