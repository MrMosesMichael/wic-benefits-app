/**
 * Product API Example
 *
 * Demonstrates how to use the product lookup API endpoint (A2.3)
 *
 * This example shows:
 * - Single product lookup
 * - Batch product lookup
 * - Product search
 * - Unknown product reporting
 * - Coverage statistics
 */

import {
  ProductApiClient,
  getProductApiClient,
} from '../services/product/ProductApiClient';

/**
 * Example 1: Single Product Lookup
 *
 * Lookup a product by UPC
 */
async function exampleSingleLookup() {
  console.log('\n=== Example 1: Single Product Lookup ===\n');

  const client = getProductApiClient();

  // Lookup Cheerios
  const result = await client.getProduct('016000275287');

  console.log('UPC:', result.upc);
  console.log('Found:', result.found);

  if (result.found && result.product) {
    console.log('Product Name:', result.product.name);
    console.log('Brand:', result.product.brand);
    console.log('Size:', result.product.size, result.product.sizeUnit);
    console.log('Data Source:', result.dataSource);
  }

  console.log('Cached:', result.cached);
  console.log('Confidence:', result.confidence);
  console.log('Response Time:', result.responseTime, 'ms');
}

/**
 * Example 2: Batch Lookup
 *
 * Lookup multiple products at once
 */
async function exampleBatchLookup() {
  console.log('\n=== Example 2: Batch Product Lookup ===\n');

  const client = getProductApiClient();

  const upcs = [
    '016000275287', // Cheerios
    '041220576197', // Similac Formula
    '011110416605', // 1% Milk
  ];

  const results = await client.batchLookup(upcs);

  console.log(`Looked up ${results.length} products:`);
  console.log();

  for (const result of results) {
    console.log(`UPC: ${result.upc}`);
    console.log(`  Found: ${result.found}`);

    if (result.found && result.product) {
      console.log(`  Name: ${result.product.name}`);
      console.log(`  Brand: ${result.product.brand}`);
    }

    console.log();
  }
}

/**
 * Example 3: Product Search
 *
 * Search products by name, brand, or category
 */
async function exampleProductSearch() {
  console.log('\n=== Example 3: Product Search ===\n');

  const client = getProductApiClient();

  // Search for milk products
  const products = await client.searchProducts({
    q: 'milk',
    limit: 5,
  });

  console.log(`Found ${products.length} milk products:`);
  console.log();

  for (const product of products) {
    console.log(`${product.name} - ${product.brand}`);
    console.log(`  UPC: ${product.upc}`);
    console.log(`  Size: ${product.size} ${product.sizeUnit}`);
    console.log();
  }
}

/**
 * Example 4: Brand Filter Search
 *
 * Search for products by specific brand
 */
async function exampleBrandSearch() {
  console.log('\n=== Example 4: Brand Filter Search ===\n');

  const client = getProductApiClient();

  // Search for Great Value products
  const products = await client.searchProducts({
    brand: 'Great Value',
    limit: 5,
  });

  console.log(`Found ${products.length} Great Value products:`);
  console.log();

  for (const product of products) {
    console.log(`${product.name}`);
    console.log(`  UPC: ${product.upc}`);
    console.log(`  Category: ${product.category.join(' > ')}`);
    console.log();
  }
}

/**
 * Example 5: Report Unknown Product
 *
 * Report a UPC that's not in the database
 */
async function exampleReportUnknown() {
  console.log('\n=== Example 5: Report Unknown Product ===\n');

  const client = getProductApiClient();

  const reportId = await client.reportUnknownProduct(
    '999999999999', // Unknown UPC
    'user_12345', // User ID
    {
      // Optional: user-provided info
      name: 'Mystery Product',
      brand: 'Unknown Brand',
    }
  );

  console.log('Report submitted!');
  console.log('Report ID:', reportId);
}

/**
 * Example 6: Get Coverage Statistics
 *
 * Check product database coverage metrics
 */
async function exampleCoverageStats() {
  console.log('\n=== Example 6: Coverage Statistics ===\n');

  const client = getProductApiClient();

  const stats = await client.getCoverageStats();

  console.log('Total Products:', stats.totalProducts.toLocaleString());
  console.log(
    'Products with Images:',
    stats.productsWithImages.toLocaleString()
  );
  console.log(
    'Products with Nutrition:',
    stats.productsWithNutrition.toLocaleString()
  );
  console.log('Verified Products:', stats.verifiedProducts.toLocaleString());
  console.log();

  console.log('Coverage by Source:');
  for (const [source, count] of Object.entries(stats.coverageBySource)) {
    console.log(`  ${source}: ${count.toLocaleString()}`);
  }

  console.log();
  console.log('Top Categories:');
  const topCategories = Object.entries(stats.coverageByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  for (const [category, count] of topCategories) {
    console.log(`  ${category}: ${count.toLocaleString()}`);
  }
}

/**
 * Example 7: Custom API Client Configuration
 *
 * Use a custom API client with specific configuration
 */
async function exampleCustomClient() {
  console.log('\n=== Example 7: Custom API Client ===\n');

  const client = new ProductApiClient({
    baseUrl: 'https://api.example.com/v1',
    timeout: 15000,
    apiKey: 'my_api_key',
  });

  const result = await client.getProduct('016000275287');

  console.log('Looked up product using custom client');
  console.log('Found:', result.found);
}

/**
 * Example 8: Error Handling
 *
 * Handle API errors gracefully
 */
async function exampleErrorHandling() {
  console.log('\n=== Example 8: Error Handling ===\n');

  const client = getProductApiClient();

  try {
    // Invalid UPC (too short)
    await client.getProduct('123');
  } catch (error) {
    console.error('Error caught:', error instanceof Error ? error.message : error);
  }

  try {
    // Batch with too many UPCs
    const tooManyUpcs = Array(150).fill('016000275287');
    await client.batchLookup(tooManyUpcs);
  } catch (error) {
    console.error('Error caught:', error instanceof Error ? error.message : error);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await exampleSingleLookup();
    await exampleBatchLookup();
    await exampleProductSearch();
    await exampleBrandSearch();
    await exampleReportUnknown();
    await exampleCoverageStats();
    await exampleCustomClient();
    await exampleErrorHandling();

    console.log('\n✅ All examples completed!\n');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  exampleSingleLookup,
  exampleBatchLookup,
  exampleProductSearch,
  exampleBrandSearch,
  exampleReportUnknown,
  exampleCoverageStats,
  exampleCustomClient,
  exampleErrorHandling,
};
