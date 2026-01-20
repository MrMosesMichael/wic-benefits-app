import pool from '../config/database';

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log('\n📊 Database Tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.tablename}`);
    });
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTables();
