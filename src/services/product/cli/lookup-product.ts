#!/usr/bin/env node
/**
 * Product Lookup CLI
 *
 * Command-line tool for testing product database integration.
 *
 * Usage:
 *   ts-node src/services/product/cli/lookup-product.ts <upc>
 *   ts-node src/services/product/cli/lookup-product.ts --search "cheerios"
 *
 * Examples:
 *   ts-node src/services/product/cli/lookup-product.ts 016000275287
 *   ts-node src/services/product/cli/lookup-product.ts --search "whole milk"
 */

import { ProductService } from '../ProductService';
import { getProductServiceConfig } from '../config';

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: lookup-product <upc> | --search <query>');
    console.error('');
    console.error('Examples:');
    console.error('  lookup-product 016000275287');
    console.error('  lookup-product --search "cheerios"');
    process.exit(1);
  }

  // Initialize service
  const config = getProductServiceConfig();
  const service = new ProductService(config);

  console.log('Product Database Lookup');
  console.log('======================\n');

  // Handle search mode
  if (args[0] === '--search' || args[0] === '-s') {
    const query = args.slice(1).join(' ');
    if (!query) {
      console.error('Error: Search query required');
      process.exit(1);
    }

    console.log(`Searching for: "${query}"\n`);

    try {
      const results = await service.searchProducts({ search: query, limit: 10 });

      if (results.length === 0) {
        console.log('No products found.');
        return;
      }

      console.log(`Found ${results.length} products:\n`);

      results.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   Brand: ${product.brand}`);
        console.log(`   UPC: ${product.upc}`);
        console.log(`   Size: ${product.size} ${product.sizeUnit}`);
        console.log(`   Category: ${product.category.join(' > ')}`);
        console.log(`   Source: ${product.dataSource}`);
        if (product.imageUrl) {
          console.log(`   Image: ${product.imageUrl}`);
        }
        console.log('');
      });
    } catch (error) {
      console.error('Search failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }

    return;
  }

  // Handle UPC lookup mode
  const upc = args[0];

  console.log(`Looking up UPC: ${upc}\n`);

  try {
    const result = await service.lookupProduct(upc);

    console.log('Lookup Result:');
    console.log('--------------');
    console.log(`UPC: ${result.upc}`);
    console.log(`Found: ${result.found ? 'Yes' : 'No'}`);
    console.log(`Cached: ${result.cached ? 'Yes' : 'No'}`);
    console.log(`Response Time: ${result.responseTime}ms`);
    console.log(`Confidence: ${result.confidence}%`);
    if (result.dataSource) {
      console.log(`Data Source: ${result.dataSource}`);
    }
    console.log('');

    if (result.product) {
      const p = result.product;
      console.log('Product Details:');
      console.log('----------------');
      console.log(`Name: ${p.name}`);
      console.log(`Brand: ${p.brand}`);
      if (p.manufacturer) {
        console.log(`Manufacturer: ${p.manufacturer}`);
      }
      console.log(`Category: ${p.category.join(' > ')}`);
      console.log(`Size: ${p.size} ${p.sizeUnit}${p.sizeOz ? ` (${p.sizeOz.toFixed(2)} oz)` : ''}`);
      console.log(`Organic: ${p.isOrganic ? 'Yes' : 'No'}`);
      console.log(`Generic: ${p.isGeneric ? 'Yes' : 'No'}`);
      console.log(`Verified: ${p.verified ? 'Yes' : 'No'}`);
      console.log(`Last Updated: ${p.lastUpdated.toISOString()}`);

      if (p.imageUrl) {
        console.log(`Image: ${p.imageUrl}`);
      }

      if (p.ingredients) {
        console.log(`\nIngredients: ${p.ingredients.substring(0, 200)}${p.ingredients.length > 200 ? '...' : ''}`);
      }

      if (p.allergens && p.allergens.length > 0) {
        console.log(`Allergens: ${p.allergens.join(', ')}`);
      }

      if (p.nutrition) {
        const n = p.nutrition;
        console.log('\nNutrition Facts:');
        console.log(`  Serving Size: ${n.servingSize}`);
        if (n.calories !== undefined) console.log(`  Calories: ${n.calories}`);
        if (n.totalFat !== undefined) console.log(`  Total Fat: ${n.totalFat}g`);
        if (n.sodium !== undefined) console.log(`  Sodium: ${n.sodium}mg`);
        if (n.totalCarbs !== undefined) console.log(`  Total Carbs: ${n.totalCarbs}g`);
        if (n.sugars !== undefined) console.log(`  Sugars: ${n.sugars}g`);
        if (n.protein !== undefined) console.log(`  Protein: ${n.protein}g`);
      }
    } else {
      console.log('Product not found in database.');
      console.log('');
      console.log('This UPC may be:');
      console.log('  - Not yet added to Open Food Facts or UPC Database');
      console.log('  - A store-specific or regional product');
      console.log('  - An invalid/malformed UPC');
      console.log('');
      console.log('You can contribute this product to Open Food Facts:');
      console.log('  https://world.openfoodfacts.org/cgi/product.pl?type=add&code=' + upc);
    }
  } catch (error) {
    console.error('Lookup failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  // Show coverage stats
  console.log('\nCache Statistics:');
  console.log('-----------------');
  const stats = service.getCoverageStats();
  console.log(`Cache Size: ${stats.cacheSize} entries`);
  console.log(`Cached Products: ${stats.cachedProducts}`);
  console.log(`UPC Database Access: ${stats.hasUPCDatabaseAccess ? 'Enabled' : 'Disabled (set UPC_DATABASE_API_KEY)'}`);
}

// Run CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
