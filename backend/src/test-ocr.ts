/**
 * Test script for OCR endpoint
 *
 * Usage: ts-node src/test-ocr.ts
 */

import { extractBenefitsFromImage } from './services/ocr-parser';

async function testOCR() {
  console.log('Testing OCR service...\n');

  // Test with mock base64 image
  const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  try {
    const result = await extractBenefitsFromImage(mockBase64);

    console.log('✓ OCR processing succeeded\n');
    console.log('Extracted Benefits:');
    console.log('-------------------');

    result.benefits.forEach((benefit, index) => {
      console.log(`${index + 1}. ${benefit.category}: ${benefit.amount} ${benefit.unit} (${benefit.confidence}% confidence)`);
    });

    console.log('\nBenefit Period:');
    console.log('---------------');
    console.log(`Start: ${result.periodStart || 'N/A'}`);
    console.log(`End: ${result.periodEnd || 'N/A'}`);

    console.log('\nRaw OCR Text:');
    console.log('-------------');
    console.log(result.rawText);

    console.log('\n✓ All tests passed!');
  } catch (error) {
    console.error('✗ OCR processing failed:', error);
    process.exit(1);
  }
}

testOCR();
