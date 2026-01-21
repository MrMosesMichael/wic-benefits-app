/**
 * OCR Parser Service
 *
 * Extracts benefit information from WIC benefit statement images.
 *
 * ## Implementation Phases
 *
 * **Phase 1 (Current):** Pattern matching on OCR text to extract benefits
 * - Uses regex patterns to identify common WIC benefit formats
 * - Handles variations in spacing, capitalization, and punctuation
 * - Validates extracted amounts against typical ranges
 * - Calculates confidence scores based on pattern quality
 *
 * **Phase 2 (Future):** State-specific format handlers
 * - Dedicated parsers for each state's WIC statement format
 * - Improved accuracy through format-specific rules
 *
 * **Phase 3 (Future):** ML-based extraction
 * - Machine learning model trained on WIC statement images
 * - Higher accuracy on degraded or unusual formats
 *
 * ## Supported Formats
 *
 * This parser handles WIC statement formats from:
 * - **Michigan** - FIS processor (colon-separated, full words)
 * - **North Carolina** - Conduent processor (all caps, space-separated)
 * - **Florida** - FIS processor (hyphenated, infant benefits)
 * - **Oregon** - State-specific (hyphenated, YYYY-MM-DD dates)
 *
 * ## OCR Integration
 *
 * Currently uses mock OCR text for testing. To integrate with actual OCR:
 *
 * 1. **Tesseract.js** (free, runs locally):
 *    ```typescript
 *    import Tesseract from 'tesseract.js';
 *    const { data: { text } } = await Tesseract.recognize(imageBuffer);
 *    const benefits = parseBenefitsFromText(text);
 *    ```
 *
 * 2. **Google Cloud Vision API** (best accuracy):
 *    ```typescript
 *    import vision from '@google-cloud/vision';
 *    const [result] = await client.textDetection(imageBuffer);
 *    const text = result.fullTextAnnotation.text;
 *    const benefits = parseBenefitsFromText(text);
 *    ```
 *
 * 3. **AWS Textract**:
 *    ```typescript
 *    import { TextractClient } from '@aws-sdk/client-textract';
 *    const response = await textract.detectDocumentText({ Document: { Bytes: imageBuffer } });
 *    const text = response.Blocks.filter(b => b.BlockType === 'LINE').map(b => b.Text).join('\n');
 *    const benefits = parseBenefitsFromText(text);
 *    ```
 *
 * ## Usage Example
 *
 * ```typescript
 * import { extractBenefitsFromImage } from './services/ocr-parser';
 *
 * const result = await extractBenefitsFromImage(base64Image);
 * console.log(result.benefits);
 * // [
 * //   { category: 'milk', amount: 4, unit: 'gal', confidence: 95 },
 * //   { category: 'eggs', amount: 2, unit: 'doz', confidence: 98 },
 * //   ...
 * // ]
 * ```
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
    // For now, simulate OCR text extraction

    // In production, this would:
    // 1. Decode base64 image
    // 2. Send to OCR service (Tesseract.js for local, or cloud service)
    // 3. Get raw text output from OCR
    // 4. Parse text to extract benefits
    // 5. Return structured data

    // Simulate OCR text output for testing
    const mockOcrText = generateMockOcrText();

    // Parse the OCR text to extract benefits
    const benefits = parseBenefitsFromText(mockOcrText);

    // Extract period dates
    const { start, end } = extractPeriodDates(mockOcrText);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      benefits,
      rawText: mockOcrText,
      periodStart: start,
      periodEnd: end,
    };
  } catch (error) {
    console.error('OCR extraction error:', error);
    throw new Error('Failed to extract benefits from image');
  }
}

/**
 * Generate mock OCR text for testing
 * This simulates what an OCR service would return
 */
function generateMockOcrText(): string {
  return `WIC BENEFITS STATEMENT
Michigan Department of Health & Human Services

Benefit Period: 01/01/2026 - 01/31/2026

Participant: Jane Doe (Postpartum)

Your WIC Food Benefits:

Milk: 4 gallons
Cheese: 1 lb
Eggs: 2 dozen
Fruits & Vegetables (CVV): $11.00
Whole Grains: 16 oz
Juice: 144 oz
Peanut Butter: 18 oz
Yogurt: 32 oz

Use these benefits by 01/31/2026

For questions, call: 1-800-WIC-HELP`;
}

/**
 * Parse raw OCR text to extract benefit amounts
 *
 * This function uses pattern matching to identify benefit categories and amounts
 * from unstructured OCR text output. Handles common WIC statement formats.
 */
function parseBenefitsFromText(ocrText: string): OCRBenefit[] {
  const benefits: OCRBenefit[] = [];

  // Normalize text for better matching
  const normalizedText = normalizeOcrText(ocrText);

  // Common WIC benefit patterns with variations
  // Format examples:
  // - "Milk: 4 gal"
  // - "Milk 4 gallons"
  // - "MILK - 4 GAL"
  // - "Eggs: 2 dozen"
  // - "Fruits & Vegetables: $11"
  // - "CVV (Fruits/Vegetables) $11.00"

  const patterns = [
    // Milk - various formats
    {
      regex: /\b(?:milk|whole\s*milk|reduced\s*fat|lowfat|skim)[:\s\-]*(\d+(?:\.\d+)?)\s*(?:gal(?:lon)?s?)/gi,
      category: 'milk',
      unit: 'gal',
      confidence: 90
    },

    // Cheese
    {
      regex: /\bcheese[:\s\-]*(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds)/gi,
      category: 'cheese',
      unit: 'lb',
      confidence: 90
    },

    // Eggs
    {
      regex: /\beggs?[:\s\-]*(\d+)\s*(?:doz(?:en)?|dzn)/gi,
      category: 'eggs',
      unit: 'doz',
      confidence: 95
    },

    // Fruits & Vegetables (CVV) - multiple formats
    {
      regex: /\b(?:fruits?\s*(?:&|and|\/|\band\b)?\s*veg(?:etable)?s?|cvv|cash\s*value\s*(?:voucher|benefit)?)\s*(?:\(cvv\))?[:\s\-]*\$?\s*(\d+(?:\.\d+)?)/gi,
      category: 'fruits_vegetables',
      unit: 'dollars',
      confidence: 85
    },

    // Whole Grains (Bread/Cereal)
    {
      regex: /\b(?:whole\s*grains?|bread|cereal)[:\s\-]*(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces)/gi,
      category: 'whole_grains',
      unit: 'oz',
      confidence: 85
    },

    // Juice
    {
      regex: /\bjuice[:\s\-]*(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces)/gi,
      category: 'juice',
      unit: 'oz',
      confidence: 90
    },

    // Peanut Butter / Beans
    {
      regex: /\b(?:peanut\s*butter|beans?|legumes?)[:\s\-]*(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces)/gi,
      category: 'peanut_butter',
      unit: 'oz',
      confidence: 85
    },

    // Yogurt
    {
      regex: /\byogurt[:\s\-]*(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces)/gi,
      category: 'yogurt',
      unit: 'oz',
      confidence: 85
    },

    // Infant Formula
    {
      regex: /\b(?:infant\s*)?formula[:\s\-]*(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces|can|cans)/gi,
      category: 'infant_formula',
      unit: 'oz',
      confidence: 90
    },

    // Infant Cereal
    {
      regex: /\binfant\s*cereal[:\s\-]*(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces)/gi,
      category: 'infant_cereal',
      unit: 'oz',
      confidence: 90
    },

    // Infant Fruits & Vegetables (Baby Food)
    {
      regex: /\b(?:infant|baby)\s*(?:food|fruits?|veg(?:etable)?s?)[:\s\-]*(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces|jar|jars)/gi,
      category: 'infant_food',
      unit: 'oz',
      confidence: 85
    },

    // Baby Food Meat
    {
      regex: /\bbaby\s*(?:food\s*)?meat[:\s\-]*(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces|jar|jars)/gi,
      category: 'baby_food_meat',
      unit: 'oz',
      confidence: 85
    },

    // Fish (canned)
    {
      regex: /\b(?:canned\s*)?fish[:\s\-]*(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces|can|cans)/gi,
      category: 'fish',
      unit: 'oz',
      confidence: 85
    },
  ];

  // Track which categories we've already found to avoid duplicates
  const foundCategories = new Set<string>();

  for (const pattern of patterns) {
    // Reset lastIndex for global regex
    pattern.regex.lastIndex = 0;

    const match = pattern.regex.exec(normalizedText);

    if (match && !foundCategories.has(pattern.category)) {
      const amount = parseFloat(match[1]);

      // Validate amount is reasonable
      if (isValidAmount(amount, pattern.category)) {
        const confidence = calculateConfidence(amount, pattern.category, pattern.confidence);

        benefits.push({
          category: pattern.category,
          amount,
          unit: pattern.unit,
          confidence,
        });

        foundCategories.add(pattern.category);
      }
    }
  }

  return benefits;
}

/**
 * Normalize OCR text for better pattern matching
 */
function normalizeOcrText(text: string): string {
  return text
    // Replace newlines with spaces to create single searchable text
    .replace(/\n/g, ' ')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Normalize currency symbols
    .replace(/\$/g, '$')
    // Normalize dashes and colons
    .replace(/[–—]/g, '-')
    // Remove common OCR artifacts
    .replace(/[|]/g, 'l')
    .trim();
}

/**
 * Validate that extracted amount is within reasonable range
 */
function isValidAmount(amount: number, category: string): boolean {
  // Must be positive
  if (amount <= 0) return false;

  // Check against typical ranges for each category
  const ranges: Record<string, { min: number; max: number }> = {
    milk: { min: 0.5, max: 8 },
    cheese: { min: 0.25, max: 3 },
    eggs: { min: 0.5, max: 4 },
    fruits_vegetables: { min: 3, max: 30 },
    whole_grains: { min: 4, max: 48 },
    juice: { min: 32, max: 256 },
    peanut_butter: { min: 8, max: 36 },
    yogurt: { min: 8, max: 64 },
    infant_formula: { min: 16, max: 512 },
    infant_cereal: { min: 8, max: 48 },
    infant_food: { min: 8, max: 128 },
    baby_food_meat: { min: 2, max: 32 },
    fish: { min: 8, max: 64 },
  };

  const range = ranges[category];
  if (!range) return true; // Unknown category, allow it

  return amount >= range.min && amount <= range.max;
}

/**
 * Extract benefit period dates from OCR text
 */
function extractPeriodDates(ocrText: string): { start?: string; end?: string } {
  // Common date patterns in WIC statements:
  // - "Valid: 01/01/2026 - 01/31/2026"
  // - "Benefit Period: 01/01/2026 - 01/31/2026"
  // - "Period: January 1, 2026 to January 31, 2026"
  // - "01/01/2026 through 01/31/2026"

  // Pattern 1: MM/DD/YYYY - MM/DD/YYYY
  const dateRangePattern1 = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[-–to]+\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i;
  const match1 = ocrText.match(dateRangePattern1);

  if (match1) {
    try {
      const startDate = new Date(parseInt(match1[3]), parseInt(match1[1]) - 1, parseInt(match1[2]));
      const endDate = new Date(parseInt(match1[6]), parseInt(match1[4]) - 1, parseInt(match1[5]));
      return {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      };
    } catch (e) {
      // Invalid date, try other patterns
    }
  }

  // Pattern 2: YYYY-MM-DD format
  const dateRangePattern2 = /(\d{4})-(\d{2})-(\d{2})\s*[-–to]+\s*(\d{4})-(\d{2})-(\d{2})/i;
  const match2 = ocrText.match(dateRangePattern2);

  if (match2) {
    try {
      const startDate = new Date(parseInt(match2[1]), parseInt(match2[2]) - 1, parseInt(match2[3]));
      const endDate = new Date(parseInt(match2[4]), parseInt(match2[5]) - 1, parseInt(match2[6]));
      return {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      };
    } catch (e) {
      // Invalid date
    }
  }

  // Pattern 3: Month DD, YYYY format
  const dateRangePattern3 = /((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4})\s*(?:[-–]|to)\s*((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4})/i;
  const match3 = ocrText.match(dateRangePattern3);

  if (match3) {
    try {
      const startDate = new Date(match3[1]);
      const endDate = new Date(match3[2]);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        };
      }
    } catch (e) {
      // Invalid date
    }
  }

  return {};
}

/**
 * Calculate confidence score based on OCR quality and validation
 *
 * Factors considered:
 * - Base pattern confidence (how specific the regex is)
 * - Value range validation (is amount typical for this category?)
 * - Text quality indicators
 */
function calculateConfidence(
  amount: number,
  category: string,
  baseConfidence: number
): number {
  let confidence = baseConfidence;

  // Check if amount is in typical range
  const typicalRanges: Record<string, { min: number; max: number; optimal: number }> = {
    milk: { min: 1, max: 6, optimal: 4 },
    cheese: { min: 0.5, max: 2, optimal: 1 },
    eggs: { min: 1, max: 3, optimal: 2 },
    fruits_vegetables: { min: 5, max: 20, optimal: 11 },
    whole_grains: { min: 8, max: 32, optimal: 16 },
    juice: { min: 64, max: 192, optimal: 144 },
    peanut_butter: { min: 8, max: 36, optimal: 18 },
    yogurt: { min: 8, max: 64, optimal: 32 },
    infant_formula: { min: 32, max: 512, optimal: 256 },
    infant_cereal: { min: 8, max: 48, optimal: 16 },
    infant_food: { min: 16, max: 128, optimal: 64 },
    baby_food_meat: { min: 4, max: 32, optimal: 16 },
    fish: { min: 8, max: 64, optimal: 30 },
  };

  const range = typicalRanges[category];

  if (range) {
    // Boost confidence if close to optimal value
    const distanceFromOptimal = Math.abs(amount - range.optimal);
    const rangeSpan = range.max - range.min;
    const normalizedDistance = distanceFromOptimal / rangeSpan;

    if (normalizedDistance < 0.2) {
      // Very close to optimal - boost confidence
      confidence = Math.min(confidence + 5, 98);
    } else if (amount < range.min || amount > range.max) {
      // Outside typical range - reduce confidence
      confidence = Math.max(confidence - 20, 50);
    } else if (normalizedDistance > 0.7) {
      // Far from optimal but still in range - slight reduction
      confidence = Math.max(confidence - 10, 60);
    }
  }

  return Math.min(Math.max(Math.round(confidence), 0), 100);
}

export { OCRBenefit, OCRResult };
export { parseBenefitsFromText, normalizeOcrText, isValidAmount, extractPeriodDates };
