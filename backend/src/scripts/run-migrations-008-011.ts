/**
 * Run Formula Finder migrations 008-011
 */
import fs from 'fs';
import path from 'path';
import pool from '../config/database';

async function runMigrations() {
  const migrations = [
    '008_wic_formula_database.sql',
    '009_stores_database.sql',
    '010_formula_retailer_mapping.sql',
    '011_participant_formula_assignment.sql'
  ];

  console.log('Running Formula Finder migrations...\n');

  for (const migration of migrations) {
    const migrationPath = path.join(__dirname, '../../migrations', migration);

    console.log(`Running migration: ${migration}`);

    try {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      await pool.query(sql);
      console.log(`  ✅ ${migration} completed successfully\n`);
    } catch (error: any) {
      // Handle specific errors that might be OK (like "already exists")
      if (error.message.includes('already exists')) {
        console.log(`  ⚠️ ${migration} - tables/indexes already exist, skipping\n`);
      } else {
        console.error(`  ❌ ${migration} failed:`, error.message);
        throw error;
      }
    }
  }

  console.log('All migrations completed successfully!');
  process.exit(0);
}

runMigrations().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
