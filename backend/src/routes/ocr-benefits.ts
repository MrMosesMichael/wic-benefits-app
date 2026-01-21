import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { extractBenefitsFromImage } from '../services/ocr-parser';

const router = Router();

/**
 * POST /api/v1/benefits/ocr
 * Extract benefit amounts from a scanned benefit statement image
 *
 * This endpoint accepts a base64-encoded image of a WIC benefit statement
 * and uses OCR to extract benefit categories, amounts, and period dates.
 *
 * Request body:
 * {
 *   image: string (base64-encoded image),
 *   participantId?: number (optional, for auto-saving)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   benefits: Array<{
 *     category: string,
 *     amount: string,
 *     unit: string,
 *     confidence: number (0-100)
 *   }>,
 *   periodStart?: string (ISO date),
 *   periodEnd?: string (ISO date),
 *   error?: string
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  const { image, participantId } = req.body;

  // Validate required fields
  if (!image) {
    return res.status(400).json({
      success: false,
      error: 'image data is required',
    });
  }

  try {
    // TODO: Implement actual OCR processing
    // Options for OCR implementation:
    // 1. Google Cloud Vision API (recommended for production)
    // 2. AWS Textract
    // 3. Azure Computer Vision
    // 4. Tesseract.js (open source, can run locally)
    // 5. ABBYY Cloud OCR

    // For MVP/development, we'll use a placeholder that simulates OCR
    // In production, replace this with actual OCR service call

    const ocrResult = await processImageWithOCR(image);

    // If participantId provided, optionally auto-save to database
    if (participantId && ocrResult.benefits.length > 0) {
      await saveBenefitsToDatabase(participantId, ocrResult);
    }

    return res.json({
      success: true,
      data: ocrResult,
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process image. Please try again or enter benefits manually.',
    });
  }
});

/**
 * Process image with OCR service
 *
 * Uses the OCR parser service to extract benefits from image.
 */
async function processImageWithOCR(base64Image: string) {
  // Use the OCR parser service
  const result = await extractBenefitsFromImage(base64Image);

  return {
    benefits: result.benefits,
    rawText: result.rawText,
    periodStart: result.periodStart,
    periodEnd: result.periodEnd,
  };
}

/**
 * Save extracted benefits to database
 */
async function saveBenefitsToDatabase(participantId: number, ocrResult: any) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const benefit of ocrResult.benefits) {
      await client.query(
        `INSERT INTO manual_benefits
         (participant_id, category, category_label, amount, unit,
          benefit_period_start, benefit_period_end, source, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (participant_id, category, benefit_period_start)
         DO UPDATE SET
           amount = EXCLUDED.amount,
           unit = EXCLUDED.unit,
           confidence = EXCLUDED.confidence,
           updated_at = CURRENT_TIMESTAMP`,
        [
          participantId,
          benefit.category,
          getCategoryLabel(benefit.category),
          benefit.amount,
          benefit.unit,
          ocrResult.periodStart,
          ocrResult.periodEnd,
          'ocr',
          benefit.confidence,
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get human-readable category label
 */
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    milk: 'Milk',
    cheese: 'Cheese',
    eggs: 'Eggs',
    fruits_vegetables: 'Fruits & Vegetables (CVV)',
    whole_grains: 'Whole Grains (Bread, Cereal, Rice, Pasta)',
    juice: 'Juice',
    peanut_butter: 'Peanut Butter / Beans / Legumes',
    infant_formula: 'Infant Formula',
    infant_cereal: 'Infant Cereal',
    infant_food: 'Infant Fruits & Vegetables',
    baby_food_meat: 'Baby Food Meat',
    yogurt: 'Yogurt',
    fish: 'Fish (canned)',
  };
  return labels[category] || category;
}

export default router;
