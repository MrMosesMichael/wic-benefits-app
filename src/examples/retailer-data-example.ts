/**
 * WIC Retailer Data Service - Usage Examples
 *
 * Demonstrates how to use the RetailerDataService for sourcing WIC retailer data
 */

import {
  createRetailerDataService,
  createMichiganScraper,
  StateCode,
} from '../services/retailer';

/**
 * Example 1: Scrape all states
 */
async function exampleScrapeAllStates() {
  console.log('=== Example 1: Scrape All States ===\n');

  const service = createRetailerDataService();

  // Scrape all configured states
  const results = await service.scrapeAllStates();

  // Display results
  for (const result of results) {
    console.log(`${result.state}:`);
    console.log(`  Success: ${result.success}`);
    console.log(`  Records: ${result.recordsScraped}`);
    console.log(`  Duration: ${result.durationMs}ms`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log('');
  }

  // Calculate total records
  const totalRecords = results.reduce((sum, r) => sum + r.recordsScraped, 0);
  console.log(`Total retailers scraped: ${totalRecords}\n`);
}

/**
 * Example 2: Scrape specific state
 */
async function exampleScrapeSpecificState() {
  console.log('=== Example 2: Scrape Specific State ===\n');

  const service = createRetailerDataService();

  // Scrape just Michigan
  const result = await service.scrapeState('MI');

  console.log('Michigan scraping result:');
  console.log(`  Success: ${result.success}`);
  console.log(`  Records: ${result.recordsScraped}`);
  console.log(`  Scraped at: ${result.scrapedAt}`);

  if (result.data.length > 0) {
    console.log('\nSample retailer:');
    console.log(JSON.stringify(result.data[0], null, 2));
  }
}

/**
 * Example 3: Normalize retailer data
 */
async function exampleNormalizeData() {
  console.log('=== Example 3: Normalize Data ===\n');

  const service = createRetailerDataService();

  // Scrape Michigan
  const result = await service.scrapeState('MI');

  console.log(`Raw records: ${result.recordsScraped}`);

  // Normalize the data
  const normalized = await service.normalizeData(result.data);

  console.log(`Normalized records: ${normalized.length}`);

  if (normalized.length > 0) {
    console.log('\nSample normalized retailer:');
    const sample = normalized[0];
    console.log(`  ID: ${sample.id}`);
    console.log(`  Name: ${sample.name}`);
    console.log(`  Chain: ${sample.chain || 'Independent'}`);
    console.log(`  Address: ${sample.address.street}, ${sample.address.city}, ${sample.address.state}`);
    console.log(`  WIC Authorized: ${sample.wicAuthorized}`);
    console.log(`  WIC Vendor ID: ${sample.wicVendorId || 'N/A'}`);
    console.log(`  Location: ${sample.location.lat}, ${sample.location.lng}`);
  }
}

/**
 * Example 4: Calculate data quality metrics
 */
async function exampleDataQualityMetrics() {
  console.log('=== Example 4: Data Quality Metrics ===\n');

  const service = createRetailerDataService();

  // Scrape all states
  const results = await service.scrapeAllStates();

  // Calculate metrics for each state
  for (const result of results) {
    if (result.data.length === 0) continue;

    const metrics = service.calculateQualityMetrics(result.data);

    console.log(`${result.state} Quality Metrics:`);
    console.log(`  Total records: ${metrics.totalRecords}`);
    console.log(`  With coordinates: ${metrics.recordsWithCoordinates} (${Math.round((metrics.recordsWithCoordinates / metrics.totalRecords) * 100)}%)`);
    console.log(`  With phone: ${metrics.recordsWithPhone} (${Math.round((metrics.recordsWithPhone / metrics.totalRecords) * 100)}%)`);
    console.log(`  With hours: ${metrics.recordsWithHours} (${Math.round((metrics.recordsWithHours / metrics.totalRecords) * 100)}%)`);
    console.log(`  With vendor ID: ${metrics.recordsWithVendorId} (${Math.round((metrics.recordsWithVendorId / metrics.totalRecords) * 100)}%)`);
    console.log(`  Completeness score: ${metrics.completenessScore}%`);
    console.log('');
  }
}

/**
 * Example 5: Use individual scraper
 */
async function exampleIndividualScraper() {
  console.log('=== Example 5: Individual Scraper ===\n');

  const scraper = createMichiganScraper();

  // Validate scraper
  console.log('Validating Michigan scraper...');
  const isValid = await scraper.validate();
  console.log(`Validation result: ${isValid ? 'PASS' : 'FAIL'}\n`);

  // Scrape specific zip code
  console.log('Scraping Detroit (48201)...');
  const retailers = await scraper.scrapeByZip('48201');
  console.log(`Found ${retailers.length} retailers in 48201`);

  if (retailers.length > 0) {
    console.log('\nSample retailer:');
    console.log(JSON.stringify(retailers[0], null, 2));
  }
}

/**
 * Example 6: Validate all scrapers
 */
async function exampleValidateScrapers() {
  console.log('=== Example 6: Validate All Scrapers ===\n');

  const service = createRetailerDataService();

  // Validate all scrapers
  const validationResults = await service.validateAllScrapers();

  console.log('Scraper validation results:');
  for (const [state, isValid] of Object.entries(validationResults)) {
    console.log(`  ${state}: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
  }
}

/**
 * Example 7: Full pipeline (scrape → normalize → quality check)
 */
async function exampleFullPipeline() {
  console.log('=== Example 7: Full Pipeline ===\n');

  const service = createRetailerDataService();

  // 1. Scrape
  console.log('Step 1: Scraping all states...');
  const results = await service.scrapeAllStates();
  const totalRaw = results.reduce((sum, r) => sum + r.recordsScraped, 0);
  console.log(`✓ Scraped ${totalRaw} raw records\n`);

  // 2. Normalize
  console.log('Step 2: Normalizing data...');
  const allRawData = results.flatMap((r) => r.data);
  const normalized = await service.normalizeData(allRawData);
  console.log(`✓ Normalized to ${normalized.length} unique records\n`);

  // 3. Quality check
  console.log('Step 3: Checking data quality...');
  const metrics = service.calculateQualityMetrics(allRawData);
  console.log(`✓ Completeness score: ${metrics.completenessScore}%`);
  console.log(`  - ${metrics.recordsWithCoordinates}/${metrics.totalRecords} with coordinates`);
  console.log(`  - ${metrics.recordsWithPhone}/${metrics.totalRecords} with phone`);
  console.log(`  - ${metrics.recordsWithVendorId}/${metrics.totalRecords} with vendor ID\n`);

  console.log('Pipeline complete!');
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await exampleScrapeAllStates();
    await exampleScrapeSpecificState();
    await exampleNormalizeData();
    await exampleDataQualityMetrics();
    await exampleIndividualScraper();
    await exampleValidateScrapers();
    await exampleFullPipeline();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export examples for use in tests or documentation
export {
  exampleScrapeAllStates,
  exampleScrapeSpecificState,
  exampleNormalizeData,
  exampleDataQualityMetrics,
  exampleIndividualScraper,
  exampleValidateScrapers,
  exampleFullPipeline,
  runAllExamples,
};

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
