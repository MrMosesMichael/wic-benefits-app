/**
 * Product Lookup Service - Usage Examples
 *
 * Demonstrates how to use the Product Service for UPC lookups,
 * product search, and integration with APL eligibility checking.
 */

import { productService, ProductService, getProductServiceConfig } from '../services/product';

/**
 * Example 1: Basic UPC Lookup
 */
async function example1_basicLookup() {
  console.log('Example 1: Basic UPC Lookup');
  console.log('===========================\n');

  // General Mills Cheerios: 016000275287
  const upc = '016000275287';

  const result = await productService.lookupProduct(upc);

  console.log(`UPC: ${result.upc}`);
  console.log(`Found: ${result.found}`);
  console.log(`Cached: ${result.cached}`);
  console.log(`Response Time: ${result.responseTime}ms`);

  if (result.product) {
    console.log(`Product: ${result.product.name}`);
    console.log(`Brand: ${result.product.brand}`);
    console.log(`Size: ${result.product.size} ${result.product.sizeUnit}`);
    console.log(`Category: ${result.product.category.join(' > ')}`);
  }

  console.log('');
}

/**
 * Example 2: Batch Product Lookup
 */
async function example2_batchLookup() {
  console.log('Example 2: Batch Product Lookup');
  console.log('================================\n');

  const upcs = [
    '016000275287', // Cheerios
    '021130126026', // Kroger Whole Milk (example)
    '041220576197', // Similac Formula (example)
  ];

  const results = await productService.lookupProducts(upcs);

  results.forEach(result => {
    console.log(`UPC: ${result.upc}`);
    console.log(`  Found: ${result.found}`);
    if (result.product) {
      console.log(`  Name: ${result.product.name}`);
      console.log(`  Brand: ${result.product.brand}`);
    }
    console.log('');
  });
}

/**
 * Example 3: Product Search
 */
async function example3_productSearch() {
  console.log('Example 3: Product Search');
  console.log('=========================\n');

  const query = 'cheerios';

  const products = await productService.searchProducts({
    search: query,
    limit: 5,
  });

  console.log(`Search results for "${query}":\n`);

  products.forEach((product, index) => {
    console.log(`${index + 1}. ${product.name}`);
    console.log(`   Brand: ${product.brand}`);
    console.log(`   UPC: ${product.upc}`);
    console.log(`   Size: ${product.size} ${product.sizeUnit}`);
    console.log('');
  });
}

/**
 * Example 4: Product Search with Filters
 */
async function example4_filteredSearch() {
  console.log('Example 4: Filtered Product Search');
  console.log('===================================\n');

  const products = await productService.searchProducts({
    search: 'milk',
    category: 'dairy',
    limit: 5,
  });

  console.log(`Found ${products.length} dairy products matching "milk":\n`);

  products.forEach((product, index) => {
    console.log(`${index + 1}. ${product.name}`);
    console.log(`   Brand: ${product.brand}`);
    console.log(`   Category: ${product.category.join(' > ')}`);
    console.log('');
  });
}

/**
 * Example 5: Custom Configuration
 */
async function example5_customConfig() {
  console.log('Example 5: Custom Configuration');
  console.log('================================\n');

  // Create service with custom configuration
  const customService = new ProductService({
    upcDatabaseApiKey: process.env.UPC_DATABASE_API_KEY,
    enableCache: true,
    cacheTtl: 7 * 24 * 60 * 60 * 1000, // 7 days
    timeout: 10000, // 10 seconds
    enableRetry: true,
    maxRetries: 3,
  });

  const result = await customService.lookupProduct('016000275287');

  console.log(`Configured with:`);
  console.log(`  - Cache enabled: yes`);
  console.log(`  - Cache TTL: 7 days`);
  console.log(`  - Timeout: 10s`);
  console.log(`  - Max retries: 3`);
  console.log('');
  console.log(`Result: ${result.found ? 'Found' : 'Not found'}`);
  console.log(`Response time: ${result.responseTime}ms`);
  console.log('');
}

/**
 * Example 6: Error Handling
 */
async function example6_errorHandling() {
  console.log('Example 6: Error Handling');
  console.log('=========================\n');

  try {
    // Invalid UPC (too short)
    const result = await productService.lookupProduct('123');

    console.log(`Result: ${result.found ? 'Found' : 'Not found'}`);
  } catch (error) {
    console.log('Error caught:', error instanceof Error ? error.message : error);
  }

  console.log('');
}

/**
 * Example 7: Integration with APL Eligibility
 *
 * Demonstrates combining product lookup with APL eligibility checking
 */
async function example7_aplIntegration() {
  console.log('Example 7: APL Integration');
  console.log('==========================\n');

  const upc = '016000275287'; // Cheerios

  // Step 1: Look up product info
  const productResult = await productService.lookupProduct(upc);

  if (!productResult.found || !productResult.product) {
    console.log('Product not found in database');
    return;
  }

  const product = productResult.product;

  console.log(`Product: ${product.name}`);
  console.log(`Brand: ${product.brand}`);
  console.log(`Size: ${product.size} ${product.sizeUnit}`);
  console.log('');

  // Step 2: Check WIC eligibility (would integrate with APL service)
  console.log('WIC Eligibility Check:');
  console.log('  (Would check against state APL here)');
  console.log('  Product category: ' + product.category.join(' > '));
  console.log('  Size in ounces: ' + product.sizeOz?.toFixed(2));
  console.log('');

  // Step 3: Display combined result
  console.log('Combined Product + Eligibility Info:');
  console.log('  ✓ Product identified');
  console.log('  ✓ Category classified');
  console.log('  ✓ Size normalized for comparison');
  console.log('  → Ready for APL eligibility check');
  console.log('');
}

/**
 * Example 8: Cache Statistics
 */
async function example8_cacheStats() {
  console.log('Example 8: Cache Statistics');
  console.log('===========================\n');

  // Perform some lookups to populate cache
  await productService.lookupProduct('016000275287');
  await productService.lookupProduct('021130126026');
  await productService.lookupProduct('041220576197');

  // Get cache stats
  const stats = productService.getCoverageStats();

  console.log('Cache Statistics:');
  console.log(`  Total entries: ${stats.cacheSize}`);
  console.log(`  Cached products: ${stats.cachedProducts}`);
  console.log(`  UPC Database access: ${stats.hasUPCDatabaseAccess ? 'Yes' : 'No'}`);
  console.log('');

  // Clear cache
  productService.clearCache();
  console.log('Cache cleared');

  const statsAfter = productService.getCoverageStats();
  console.log(`  Total entries after clear: ${statsAfter.cacheSize}`);
  console.log('');
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('Product Lookup Service - Usage Examples');
  console.log('========================================\n\n');

  try {
    await example1_basicLookup();
    await example2_batchLookup();
    await example3_productSearch();
    await example4_filteredSearch();
    await example5_customConfig();
    await example6_errorHandling();
    await example7_aplIntegration();
    await example8_cacheStats();

    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  example1_basicLookup,
  example2_batchLookup,
  example3_productSearch,
  example4_filteredSearch,
  example5_customConfig,
  example6_errorHandling,
  example7_aplIntegration,
  example8_cacheStats,
};
