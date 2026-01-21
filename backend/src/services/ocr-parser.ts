/**
 * OCR Parser Service
 *
 * Extracts benefit information from WIC benefit statement images.
 *
 * Phase 1: Simple text extraction using Tesseract.js
 * Phase 2: Advanced parsing with state-specific formats
 * Phase 3: ML-based extraction for improved accuracy
 */

interface OCRBenefit {
  category: string;
  amount: number;
  unit: string;
  confidence: number;
}

interface OCRResult {
  benefits: OCRBenefit[];
  rawText: string;
  periodStart?: string;
  periodEnd?: string;
}

/**
 * Extract benefits from base64 encoded image
 *
 * For MVP implementation, this uses pattern matching on OCR text.
 * Future versions will integrate with Tesseract.js or cloud OCR services (Google Vision, AWS Textract).
 */
export async function extractBenefitsFromImage(base64Image: string): Promise<OCRResult> {
  try {
    // TODO: Integrate with actual OCR service (Tesseract.js, Google Vision API, AWS Textract)
    // For now, return mock data to demonstrate the flow

    // In production, this would:
    // 1. Decode base64 image
    // 2. Send to OCR service (Tesseract.js for local, or cloud service)
    // 3. Parse OCR text output
    // 4. Extract benefit amounts using pattern matching
    // 5. Return structured data

    const mockResult: OCRResult = {
      benefits: [
        { category: 'milk', amount: 4, unit: 'gal', confidence: 95 },
        { category: 'cheese', amount: 1, unit: 'lb', confidence: 92 },
        { category: 'eggs', amount: 2, unit: 'doz', confidence: 98 },
        { category: 'fruits_vegetables', amount: 11, unit: 'dollars', confidence: 88 },
        { category: 'whole_grains', amount: 16, unit: 'oz', confidence: 90 },
        { category: 'juice', amount: 144, unit: 'oz', confidence: 85 },
        { category: 'peanut_butter', amount: 18, unit: 'oz', confidence: 82 },
      ],
      rawText: 'MOCK OCR TEXT - WIC BENEFITS STATEMENT\n\nBenefit Period: 01/01/2026 - 01/31/2026\n\nMilk: 4 gal\nCheese: 1 lb\nEggs: 2 doz\nFruits & Vegetables: $11\nWhole Grains: 16 oz\nJuice: 144 oz\nPeanut Butter: 18 oz',
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return mockResult;
  } catch (error) {
    console.error('OCR extraction error:', error);
    throw new Error('Failed to extract benefits from image');
  }
}

/**
 * Parse raw OCR text to extract benefit amounts
 *
 * This function uses pattern matching to identify benefit categories and amounts
 * from unstructured OCR text output.
 */
function parseBenefitsFromText(ocrText: string): OCRBenefit[] {
  const benefits: OCRBenefit[] = [];

  // Common WIC benefit patterns
  // Format: "Milk: 4 gal", "Eggs: 2 dozen", "Fruits & Vegetables: $11"
  const patterns = [
    // Milk
    { regex: /milk[:\s]+(\d+(?:\.\d+)?)\s*(gal|gallon)/i, category: 'milk', unit: 'gal' },
    // Cheese
    { regex: /cheese[:\s]+(\d+(?:\.\d+)?)\s*(lb|pound)/i, category: 'cheese', unit: 'lb' },
    // Eggs
    { regex: /eggs?[:\s]+(\d+)\s*(doz|dozen)/i, category: 'eggs', unit: 'doz' },
    // Fruits & Vegetables (CVV)
    { regex: /(?:fruits?\s*&?\s*vegetables?|cvv|cash\s*value)[:\s]+\$?\s*(\d+(?:\.\d+)?)/i, category: 'fruits_vegetables', unit: 'dollars' },
    // Whole Grains
    { regex: /(?:whole\s*grains?|bread|cereal)[:\s]+(\d+)\s*(oz|ounce)/i, category: 'whole_grains', unit: 'oz' },
    // Juice
    { regex: /juice[:\s]+(\d+)\s*(oz|ounce)/i, category: 'juice', unit: 'oz' },
    // Peanut Butter
    { regex: /(?:peanut\s*butter|beans?)[:\s]+(\d+)\s*(oz|ounce)/i, category: 'peanut_butter', unit: 'oz' },
    // Infant Formula
    { regex: /(?:infant\s*)?formula[:\s]+(\d+)\s*(oz|ounce|can)/i, category: 'infant_formula', unit: 'oz' },
    // Infant Cereal
    { regex: /(?:infant\s*)?cereal[:\s]+(\d+)\s*(oz|ounce)/i, category: 'cereal', unit: 'oz' },
    // Yogurt
    { regex: /yogurt[:\s]+(\d+)\s*(oz|ounce)/i, category: 'yogurt', unit: 'oz' },
  ];

  for (const pattern of patterns) {
    const match = ocrText.match(pattern.regex);
    if (match) {
      benefits.push({
        category: pattern.category,
        amount: parseFloat(match[1]),
        unit: pattern.unit,
        confidence: 85, // Base confidence for pattern matching
      });
    }
  }

  return benefits;
}

/**
 * Extract benefit period dates from OCR text
 */
function extractPeriodDates(ocrText: string): { start?: string; end?: string } {
  // Common date patterns in WIC statements
  // "Valid: 01/01/2026 - 01/31/2026"
  // "Benefit Period: January 1, 2026 to January 31, 2026"

  const dateRangePattern = /(?:valid|period)[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–to]+\s*(\d{1,2}\/\d{1,2}\/\d{4})/i;
  const match = ocrText.match(dateRangePattern);

  if (match) {
    return {
      start: new Date(match[1]).toISOString(),
      end: new Date(match[2]).toISOString(),
    };
  }

  return {};
}

/**
 * Calculate confidence score based on OCR quality
 *
 * Factors:
 * - Text clarity (character confidence from OCR)
 * - Pattern match strength
 * - Known value ranges (e.g., milk typically 1-4 gal)
 */
function calculateConfidence(
  amount: number,
  category: string,
  ocrConfidence: number
): number {
  let confidence = ocrConfidence;

  // Adjust based on typical value ranges
  const typicalRanges: Record<string, { min: number; max: number }> = {
    milk: { min: 1, max: 6 },
    cheese: { min: 0.5, max: 2 },
    eggs: { min: 1, max: 3 },
    fruits_vegetables: { min: 5, max: 20 },
    whole_grains: { min: 8, max: 32 },
    juice: { min: 64, max: 192 },
  };

  const range = typicalRanges[category];
  if (range && (amount < range.min || amount > range.max)) {
    // Reduce confidence if value is outside typical range
    confidence = Math.max(confidence - 20, 50);
  }

  return Math.min(Math.max(confidence, 0), 100);
}

export { OCRBenefit, OCRResult };
