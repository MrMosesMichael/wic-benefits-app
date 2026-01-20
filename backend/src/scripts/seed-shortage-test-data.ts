/**
 * Seed test data for shortage detection testing
 *
 * Creates formula availability reports simulating a shortage scenario:
 * - 5 stores total for Similac Pro-Advance (UPC: 0070074640709)
 * - 4 stores out of stock (80% - should trigger severe shortage)
 * - 1 store with low stock
 */

import pool from '../config/database';

async function seedShortageTestData() {
  console.log('🌱 Seeding shortage test data...');

  const testUpc = '0070074640709'; // Similac Pro-Advance Powder
  const stores = [
    { name: 'Walmart Supercenter #123', address: '123 Main St, Detroit, MI', lat: 42.3314, lng: -83.0458, status: 'out_of_stock' },
    { name: 'Meijer #456', address: '456 Oak Ave, Detroit, MI', lat: 42.3520, lng: -83.0650, status: 'out_of_stock' },
    { name: 'Target #789', address: '789 Elm St, Detroit, MI', lat: 42.3420, lng: -83.0520, status: 'out_of_stock' },
    { name: 'Kroger #234', address: '234 Pine Rd, Detroit, MI', lat: 42.3280, lng: -83.0400, status: 'out_of_stock' },
    { name: 'CVS Pharmacy #567', address: '567 Maple Dr, Detroit, MI', lat: 42.3380, lng: -83.0480, status: 'low_stock', quantity: 'few' },
  ];

  try {
    // Clear existing test data for this UPC
    await pool.query(
      `DELETE FROM formula_availability WHERE upc = $1`,
      [testUpc]
    );

    // Insert new test reports
    for (const store of stores) {
      await pool.query(
        `INSERT INTO formula_availability
         (upc, store_name, store_address, latitude, longitude, status, quantity_range, source, confidence, report_count, last_updated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'crowdsourced', 75, 3, CURRENT_TIMESTAMP)`,
        [
          testUpc,
          store.name,
          store.address,
          store.lat,
          store.lng,
          store.status,
          store.quantity || null
        ]
      );
    }

    console.log('✅ Test data seeded successfully!');
    console.log('');
    console.log('Created 5 formula availability reports:');
    console.log(`  - UPC: ${testUpc} (Similac Pro-Advance)`);
    console.log('  - 4 stores: OUT OF STOCK');
    console.log('  - 1 store: LOW STOCK');
    console.log('  - 80% out of stock → should trigger SEVERE shortage');
    console.log('');
    console.log('Run: npm run detect-shortages');
  } catch (error) {
    console.error('❌ Failed to seed test data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedShortageTestData();
