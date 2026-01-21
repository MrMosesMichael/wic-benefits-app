/**
 * Product Schema Example
 *
 * Demonstrates how to use the complete product data schema:
 * - Database repository for CRUD operations
 * - Enhanced service with database integration
 * - Multi-layer caching strategy
 * - Batch operations
 * - Coverage tracking
 */

import { ProductRepository, getDatabaseConfig } from '../database';
import { ProductServiceWithDB } from '../services/product/ProductServiceWithDB';

async function main() {
  console.log('=== Product Schema Example ===\n');

  // 1. Initialize database repository
  console.log('1. Initializing database connection...');
  const dbConfig = getDatabaseConfig();
  const repository = new ProductRepository(dbConfig);
  console.log('✓ Database connected\n');

  // 2. Initialize enhanced product service
  console.log('2. Initializing product service...');
  const productService = new ProductServiceWithDB(repository, {
    enableCache: true,
    cacheTtl: 30 * 24 * 60 * 60 * 1000, // 30 days
    autoSaveToDb: true, // Auto-save API results to database
  });
  console.log('✓ Product service ready\n');

  // 3. Lookup single product (multi-layer caching)
  console.log('3. Looking up product (Cheerios)...');
  const upc = '016000275287';
  const result = await productService.lookupProduct(upc);

  if (result.found && result.product) {
    console.log('✓ Product found:');
    console.log(`  Name: ${result.product.name}`);
    console.log(`  Brand: ${result.product.brand}`);
    console.log(`  Size: ${result.product.size} ${result.product.sizeUnit}`);
    console.log(`  Category: ${result.product.category.join(' > ')}`);
    console.log(`  Source: ${result.product.dataSource}`);
    console.log(`  Cached: ${result.cached}`);
    console.log(`  Response time: ${result.responseTime}ms`);
    console.log(`  Confidence: ${result.confidence}%\n`);
  } else {
    console.log('✗ Product not found\n');
  }

  // 4. Lookup again (should hit cache)
  console.log('4. Looking up same product again (cache test)...');
  const cachedResult = await productService.lookupProduct(upc);
  console.log(`✓ Cached: ${cachedResult.cached}`);
  console.log(`  Response time: ${cachedResult.responseTime}ms (should be <10ms)\n`);

  // 5. Batch lookup (efficient for multiple products)
  console.log('5. Batch lookup (multiple products)...');
  const upcs = [
    '016000275287', // Cheerios
    '041220576197', // Milk
    '007874213959', // Eggs
    '037600100670', // Peanut butter
  ];

  const batchResults = await productService.lookupProducts(upcs);
  console.log(`✓ Looked up ${batchResults.length} products:`);

  for (const result of batchResults) {
    if (result.found && result.product) {
      console.log(`  - ${result.product.name} (${result.product.brand})`);
    } else {
      console.log(`  - UPC ${result.upc}: Not found`);
    }
  }
  console.log();

  // 6. Search products
  console.log('6. Searching products (query: "milk")...');
  const searchResults = await productService.searchProducts({
    search: 'milk',
    limit: 5,
  });

  console.log(`✓ Found ${searchResults.length} products:`);
  for (const product of searchResults) {
    console.log(`  - ${product.name} (${product.brand})`);
  }
  console.log();

  // 7. Direct database access (advanced)
  console.log('7. Direct database query (brand filter)...');
  const dbResults = await repository.searchProducts({
    brand: 'General Mills',
    verifiedOnly: true,
    limit: 5,
  });

  console.log(`✓ Found ${dbResults.length} verified General Mills products:`);
  for (const product of dbResults) {
    console.log(`  - ${product.name}`);
  }
  console.log();

  // 8. Coverage statistics
  console.log('8. Getting coverage statistics...');
  const stats = await productService.getCoverageStats();
  console.log('✓ Database coverage:');
  console.log(`  Total products: ${stats.totalProducts}`);
  console.log(`  With images: ${stats.productsWithImages}`);
  console.log(`  With nutrition: ${stats.productsWithNutrition}`);
  console.log(`  Verified: ${stats.verifiedProducts}`);
  console.log(`  Coverage by source:`);
  for (const [source, count] of Object.entries(stats.coverageBySource)) {
    console.log(`    - ${source}: ${count}`);
  }
  console.log();

  // 9. Report unknown product
  console.log('9. Reporting unknown product...');
  const unknownUpc = '999999999999';
  const reportId = await productService.reportUnknownProduct(
    unknownUpc,
    'user_12345',
    {
      name: 'Mystery Product',
      brand: 'Unknown Brand',
      category: ['Food'],
      size: '1',
      sizeUnit: 'lb',
      dataSource: 'manual',
      verified: false,
      lastUpdated: new Date(),
    }
  );
  console.log(`✓ Unknown product reported: ${reportId}\n`);

  // 10. Manual product insertion
  console.log('10. Manually inserting product...');
  const newProduct = await repository.upsertProduct({
    upc: '123456789012',
    name: 'Test Product',
    brand: 'Test Brand',
    category: ['Test', 'Category'],
    size: '10',
    sizeUnit: 'oz',
    sizeOz: 10,
    dataSource: 'manual',
    verified: true,
    verifiedBy: 'admin',
    lastUpdated: new Date(),
  });
  console.log('✓ Product inserted:');
  console.log(`  ID: ${newProduct.upc}`);
  console.log(`  Name: ${newProduct.name}`);
  console.log(`  Created: ${newProduct.createdAt}\n`);

  // 11. Verify UPC normalization
  console.log('11. Testing UPC normalization...');
  const unnormalizedUpc = '11110416605'; // Missing leading zero
  const normalizedResult = await repository.getProductByUPC(unnormalizedUpc);
  if (normalizedResult) {
    console.log('✓ UPC normalization working:');
    console.log(`  Queried: ${unnormalizedUpc}`);
    console.log(`  Found: ${normalizedResult.upc}`);
    console.log(`  Product: ${normalizedResult.name}\n`);
  } else {
    console.log('✗ UPC normalization test failed\n');
  }

  // Cleanup
  console.log('12. Cleaning up...');
  productService.clearCache();
  await repository.close();
  console.log('✓ Done!\n');

  console.log('=== Example Complete ===');
}

// Run example
if (require.main === module) {
  main().catch(error => {
    console.error('Example failed:', error);
    process.exit(1);
  });
}

export { main };
