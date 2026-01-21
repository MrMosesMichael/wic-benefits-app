import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

/**
 * POST /api/v1/manual-benefits
 * Save manually entered benefit amounts by category and participant
 *
 * Request body:
 * {
 *   participantId: number,
 *   category: string,
 *   categoryLabel: string,
 *   amount: number,
 *   unit: string,
 *   periodStart: string (ISO date),
 *   periodEnd: string (ISO date)
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  const {
    participantId,
    category,
    categoryLabel,
    amount,
    unit,
    periodStart,
    periodEnd,
  } = req.body;

  // Validate required fields
  if (!participantId) {
    return res.status(400).json({
      success: false,
      error: 'participantId is required',
    });
  }

  if (!category) {
    return res.status(400).json({
      success: false,
      error: 'category is required',
    });
  }

  if (!categoryLabel) {
    return res.status(400).json({
      success: false,
      error: 'categoryLabel is required',
    });
  }

  if (amount === undefined || amount === null) {
    return res.status(400).json({
      success: false,
      error: 'amount is required',
    });
  }

  if (!unit) {
    return res.status(400).json({
      success: false,
      error: 'unit is required',
    });
  }

  if (!periodStart) {
    return res.status(400).json({
      success: false,
      error: 'periodStart is required',
    });
  }

  if (!periodEnd) {
    return res.status(400).json({
      success: false,
      error: 'periodEnd is required',
    });
  }

  // Validate amount is a positive number
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return res.status(400).json({
      success: false,
      error: 'amount must be a positive number',
    });
  }

  // Validate dates
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);

  if (isNaN(startDate.getTime())) {
    return res.status(400).json({
      success: false,
      error: 'periodStart must be a valid date',
    });
  }

  if (isNaN(endDate.getTime())) {
    return res.status(400).json({
      success: false,
      error: 'periodEnd must be a valid date',
    });
  }

  if (endDate <= startDate) {
    return res.status(400).json({
      success: false,
      error: 'periodEnd must be after periodStart',
    });
  }

  try {
    // Verify participant exists
    const participantResult = await pool.query(
      'SELECT id, household_id, type, name FROM participants WHERE id = $1',
      [participantId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found',
      });
    }

    const participant = participantResult.rows[0];

    // Check if benefit already exists for this participant, category, and period
    const existingBenefit = await pool.query(
      `SELECT id, total_amount, available_amount, in_cart_amount, consumed_amount
       FROM benefits
       WHERE participant_id = $1
         AND category = $2
         AND period_start = $3
         AND period_end = $4`,
      [participantId, category, periodStart, periodEnd]
    );

    let benefitId: number;
    let operation: 'created' | 'updated';

    if (existingBenefit.rows.length > 0) {
      // Update existing benefit
      // Keep in_cart_amount and consumed_amount the same
      // Update total_amount and recalculate available_amount
      const existing = existingBenefit.rows[0];
      const newAvailableAmount = amountNum - existing.in_cart_amount - existing.consumed_amount;

      if (newAvailableAmount < 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot set total amount to ${amountNum} ${unit} because ${existing.in_cart_amount} ${unit} is in cart and ${existing.consumed_amount} ${unit} is already consumed`,
        });
      }

      const updateResult = await pool.query(
        `UPDATE benefits
         SET total_amount = $1,
             available_amount = $2,
             category_label = $3,
             unit = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING id`,
        [amountNum, newAvailableAmount, categoryLabel, unit, existing.id]
      );

      benefitId = updateResult.rows[0].id;
      operation = 'updated';
    } else {
      // Insert new benefit
      // All amount goes to available since this is new
      const insertResult = await pool.query(
        `INSERT INTO benefits (
          participant_id,
          category,
          category_label,
          total_amount,
          available_amount,
          in_cart_amount,
          consumed_amount,
          unit,
          period_start,
          period_end
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
        [
          participantId,
          category,
          categoryLabel,
          amountNum,
          amountNum, // available_amount = total_amount for new entry
          0, // in_cart_amount
          0, // consumed_amount
          unit,
          periodStart,
          periodEnd,
        ]
      );

      benefitId = insertResult.rows[0].id;
      operation = 'created';
    }

    // Fetch the complete benefit record to return
    const benefitResult = await pool.query(
      `SELECT id, participant_id, category, category_label,
              total_amount, available_amount, in_cart_amount, consumed_amount,
              unit, period_start, period_end, created_at, updated_at
       FROM benefits
       WHERE id = $1`,
      [benefitId]
    );

    const benefit = benefitResult.rows[0];

    res.status(operation === 'created' ? 201 : 200).json({
      success: true,
      operation,
      data: {
        benefit: {
          id: benefit.id,
          participantId: benefit.participant_id,
          category: benefit.category,
          categoryLabel: benefit.category_label,
          total: benefit.total_amount.toString(),
          available: benefit.available_amount.toString(),
          inCart: benefit.in_cart_amount.toString(),
          consumed: benefit.consumed_amount.toString(),
          unit: benefit.unit,
          periodStart: benefit.period_start,
          periodEnd: benefit.period_end,
          createdAt: benefit.created_at,
          updatedAt: benefit.updated_at,
        },
        participant: {
          id: participant.id,
          householdId: participant.household_id,
          type: participant.type,
          name: participant.name,
        },
      },
    });
  } catch (error) {
    console.error('Error saving manual benefit:', error);

    // Check if it's a constraint violation error
    if ((error as any).code === '23514') {
      return res.status(400).json({
        success: false,
        error: 'Benefit amounts do not balance. Total must equal available + in cart + consumed.',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to save manual benefit',
    });
  }
});

export default router;
