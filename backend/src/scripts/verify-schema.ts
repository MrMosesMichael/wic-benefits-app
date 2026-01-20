import pool from '../config/database';

async function verifySchema() {
  console.log('🔍 Verifying database schema...\n');

  try {
    // Check benefits table columns
    console.log('📋 Benefits table columns:');
    const benefitsColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'benefits'
      ORDER BY ordinal_position
    `);
    benefitsColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    // Check if new columns exist
    const hasInCart = benefitsColumns.rows.some(r => r.column_name === 'in_cart_amount');
    const hasConsumed = benefitsColumns.rows.some(r => r.column_name === 'consumed_amount');
    console.log(`\n✓ in_cart_amount column: ${hasInCart ? 'EXISTS' : 'MISSING'}`);
    console.log(`✓ consumed_amount column: ${hasConsumed ? 'EXISTS' : 'MISSING'}`);

    // Check shopping cart tables
    console.log('\n📋 Shopping cart tables:');
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('shopping_carts', 'cart_items', 'transactions', 'benefit_consumptions')
      ORDER BY table_name
    `);
    tables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Check benefit constraint
    console.log('\n📋 Checking benefits constraint:');
    const sampleBenefits = await pool.query(`
      SELECT id, total_amount, available_amount, in_cart_amount, consumed_amount
      FROM benefits
      LIMIT 3
    `);
    console.log('Sample benefits (checking total = available + in_cart + consumed):');
    sampleBenefits.rows.forEach(row => {
      const total = parseFloat(row.total_amount);
      const available = parseFloat(row.available_amount);
      const inCart = parseFloat(row.in_cart_amount);
      const consumed = parseFloat(row.consumed_amount);
      const sum = available + inCart + consumed;
      const valid = Math.abs(total - sum) < 0.01; // Allow for floating point precision
      console.log(`  ID ${row.id}: total=${total}, sum=${sum} ${valid ? '✓' : '✗'}`);
    });

    // Count products in APL
    console.log('\n📊 APL Products:');
    const productCount = await pool.query(`
      SELECT COUNT(*) as count FROM apl_products WHERE state = 'MI'
    `);
    console.log(`  Michigan products: ${productCount.rows[0].count}`);

    console.log('\n✅ Schema verification complete!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifySchema();
