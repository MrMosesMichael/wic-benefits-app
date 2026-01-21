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

/**
 * POST /api/v1/manual-benefits/log-purchase
 * Record a purchase and decrement available benefits
 *
 * Request body:
 * {
 *   participantId: number,
 *   category: string,
 *   quantity: number,
 *   unit: string,
 *   productName: string (optional - for transaction history)
 * }
 */
router.post('/log-purchase', async (req: Request, res: Response) => {
  const { participantId, category, quantity, unit, productName } = req.body;

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

  if (quantity === undefined || quantity === null) {
    return res.status(400).json({
      success: false,
      error: 'quantity is required',
    });
  }

  if (!unit) {
    return res.status(400).json({
      success: false,
      error: 'unit is required',
    });
  }

  // Validate quantity is a positive number
  const quantityNum = parseFloat(quantity);
  if (isNaN(quantityNum) || quantityNum <= 0) {
    return res.status(400).json({
      success: false,
      error: 'quantity must be a positive number',
    });
  }

  try {
    // Start a transaction to ensure data consistency
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verify participant exists
      const participantResult = await client.query(
        'SELECT id, household_id, type, name FROM participants WHERE id = $1',
        [participantId]
      );

      if (participantResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Participant not found',
        });
      }

      const participant = participantResult.rows[0];

      // Find the current active benefit for this participant and category
      // Use CURRENT_DATE to find benefit period that includes today
      const benefitResult = await client.query(
        `SELECT id, category, category_label, total_amount, available_amount,
                in_cart_amount, consumed_amount, unit, period_start, period_end
         FROM benefits
         WHERE participant_id = $1
           AND category = $2
           AND period_start <= CURRENT_DATE
           AND period_end >= CURRENT_DATE
         ORDER BY period_start DESC
         LIMIT 1`,
        [participantId, category]
      );

      if (benefitResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: `No active benefit found for participant ${participant.name} in category ${category}`,
        });
      }

      const benefit = benefitResult.rows[0];

      // Verify unit matches
      if (benefit.unit !== unit) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: `Unit mismatch: expected ${benefit.unit} but got ${unit}`,
        });
      }

      // Check if there's enough available balance
      const availableAmount = parseFloat(benefit.available_amount);
      if (availableAmount < quantityNum) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: `Insufficient balance: only ${availableAmount} ${unit} available, but ${quantityNum} ${unit} requested`,
          data: {
            available: availableAmount.toString(),
            requested: quantityNum.toString(),
            unit,
          },
        });
      }

      // Calculate new amounts
      const newAvailableAmount = availableAmount - quantityNum;
      const newConsumedAmount = parseFloat(benefit.consumed_amount) + quantityNum;

      // Update the benefit record
      // Decrement available_amount and increment consumed_amount
      const updateResult = await client.query(
        `UPDATE benefits
         SET available_amount = $1,
             consumed_amount = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, category, category_label, total_amount,
                   available_amount, in_cart_amount, consumed_amount,
                   unit, period_start, period_end, updated_at`,
        [newAvailableAmount, newConsumedAmount, benefit.id]
      );

      const updatedBenefit = updateResult.rows[0];

      // Create transaction record
      const transactionResult = await client.query(
        `INSERT INTO transactions (household_id, completed_at)
         VALUES ($1, CURRENT_TIMESTAMP)
         RETURNING id, completed_at`,
        [participant.household_id]
      );

      const transaction = transactionResult.rows[0];

      // Create benefit consumption record
      const consumptionResult = await client.query(
        `INSERT INTO benefit_consumptions (
           transaction_id, participant_id, benefit_id, upc, product_name,
           category, amount_consumed, unit, consumed_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         RETURNING id, amount_consumed, consumed_at`,
        [
          transaction.id,
          participant.id,
          benefit.id,
          '', // No UPC for manual purchase logging
          productName || 'Manual purchase entry',
          benefit.category,
          quantityNum,
          benefit.unit,
        ]
      );

      const consumption = consumptionResult.rows[0];

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        message: 'Purchase logged successfully',
        data: {
          transaction: {
            id: transaction.id,
            completedAt: transaction.completed_at,
          },
          consumption: {
            id: consumption.id,
            amountConsumed: consumption.amount_consumed.toString(),
            consumedAt: consumption.consumed_at,
          },
          purchase: {
            productName: productName || 'Manual purchase entry',
            category: benefit.category,
            categoryLabel: benefit.category_label,
            quantity: quantityNum.toString(),
            unit: benefit.unit,
            participantId: participant.id,
            participantName: participant.name,
          },
          benefit: {
            id: updatedBenefit.id,
            participantId: participant.id,
            category: updatedBenefit.category,
            categoryLabel: updatedBenefit.category_label,
            total: updatedBenefit.total_amount.toString(),
            available: updatedBenefit.available_amount.toString(),
            inCart: updatedBenefit.in_cart_amount.toString(),
            consumed: updatedBenefit.consumed_amount.toString(),
            unit: updatedBenefit.unit,
            periodStart: updatedBenefit.period_start,
            periodEnd: updatedBenefit.period_end,
            updatedAt: updatedBenefit.updated_at,
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
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error logging purchase:', error);

    // Check if it's a constraint violation error (benefits_amount_balance)
    if ((error as any).code === '23514') {
      return res.status(500).json({
        success: false,
        error: 'Database constraint violation: benefit amounts do not balance correctly',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to log purchase',
    });
  }
});

export default router;
