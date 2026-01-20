import { readFileSync } from 'fs';
import { join } from 'path';
import pool from '../config/database';

async function runMigration005() {
  try {
    console.log('🔄 Running migration 005: Formula Tracking...');

    const migrationPath = join(__dirname, '../../migrations/005_formula_tracking.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    await pool.query(migrationSQL);

    console.log('✅ Migration 005 completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration 005 failed:', error);
    process.exit(1);
  }
}

runMigration005();
