/**
 * Run migration 006 - Shortage Detection Enhancements
 */
import fs from 'fs';
import path from 'path';
import pool from '../config/database';

async function runMigration() {
  try {
    console.log('📦 Running migration 006: Shortage Detection Enhancements...');

    const migrationPath = path.join(__dirname, '../../migrations/006_shortage_detection_enhancements.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(sql);

    console.log('✅ Migration 006 completed successfully!');
    console.log('');
    console.log('Added columns to formula_shortages:');
    console.log('  - upc (VARCHAR)');
    console.log('  - product_name (VARCHAR)');
    console.log('  - out_of_stock_percentage (DECIMAL)');
    console.log('  - total_stores_checked (INTEGER)');
    console.log('  - status (VARCHAR)');
    console.log('');
    console.log('Created indexes:');
    console.log('  - idx_shortage_upc');
    console.log('  - idx_shortage_status');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
