import pool from '../config/database';

async function checkCereal() {
  try {
    // Check for Cheerios-like UPCs
    const res1 = await pool.query(`
      SELECT upc, product_name, brand, category
      FROM apl_products
      WHERE category = 'cereal' AND upc LIKE '016000%'
      LIMIT 10
    `);

    console.log('Cereal products starting with 016000:');
    if (res1.rows.length === 0) {
      console.log('  (none found)');
    } else {
      res1.rows.forEach(r => {
        console.log(`  ${r.upc} - ${r.product_name} (${r.brand})`);
      });
    }

    // Check total cereal count
    const res2 = await pool.query(`
      SELECT COUNT(*) as count FROM apl_products WHERE category = 'cereal'
    `);
    console.log(`\nTotal cereal products: ${res2.rows[0].count}`);

    // Sample of cereal products
    const res3 = await pool.query(`
      SELECT upc, product_name, brand
      FROM apl_products
      WHERE category = 'cereal'
      LIMIT 10
    `);
    console.log('\nSample cereal products:');
    res3.rows.forEach(r => {
      console.log(`  ${r.upc} - ${r.product_name} (${r.brand || 'N/A'})`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkCereal();
