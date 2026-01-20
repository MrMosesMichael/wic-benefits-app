/**
 * Run Migration 007 - Inventory Tables
 * Creates tables for storing product inventory data
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import pool from '../config/database';

async function runMigration() {
  console.log('📦 Running Migration 007: Inventory Tables...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '../../migrations/007_inventory_tables.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('Executing migration SQL...');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Show created tables
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('inventory', 'inventory_reports_log', 'inventory_sync_jobs')
      ORDER BY table_name;
    `;

    const tablesResult = await pool.query(tablesQuery);

    console.log('📋 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Show table stats
    console.log('\n📊 Table statistics:');

    const statsQueries = [
      { table: 'inventory', query: 'SELECT COUNT(*) as count FROM inventory' },
      { table: 'inventory_reports_log', query: 'SELECT COUNT(*) as count FROM inventory_reports_log' },
      { table: 'inventory_sync_jobs', query: 'SELECT COUNT(*) as count FROM inventory_sync_jobs' },
    ];

    for (const { table, query } of statsQueries) {
      try {
        const result = await pool.query(query);
        console.log(`   ${table}: ${result.rows[0].count} rows`);
      } catch (error) {
        console.log(`   ${table}: Error checking (${error})`);
      }
    }

    console.log('\n✨ Migration 007 complete!');
    console.log('The inventory tables are ready for use.');
    console.log('\nYou can now:');
    console.log('  - Store inventory data from Walmart API');
    console.log('  - Accept crowdsourced inventory reports');
    console.log('  - Track inventory sync jobs');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
