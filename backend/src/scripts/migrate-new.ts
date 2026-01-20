import pool from '../config/database';
import fs from 'fs';
import path from 'path';

async function runNewMigrations() {
  console.log('🔄 Running new migrations (002 and 003)...');

  try {
    const migrationsDir = path.join(__dirname, '../../migrations');
    const newMigrations = ['002_three_state_benefits.sql', '003_shopping_cart.sql'];

    for (const file of newMigrations) {
      console.log(`  Running ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);
      console.log(`  ✅ ${file} completed`);
    }

    console.log('✅ All new migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runNewMigrations();
