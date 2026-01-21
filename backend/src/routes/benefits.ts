import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { extractBenefitsFromImage } from '../services/ocr-parser';

const router = Router();

/**
 * Get benefits for a household
 * GET /api/v1/benefits?household_id=1
 */
router.get('/', async (req: Request, res: Response) => {
  const householdId = req.query.household_id || '1'; // Default to demo household

  try {
    // Get household info
    const household = await pool.query(
      'SELECT * FROM households WHERE id = $1',
      [householdId]
    );

    if (household.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Household not found',
      });
    }

    // Get participants
    const participants = await pool.query(
      `SELECT id, type, name FROM participants WHERE household_id = $1`,
      [householdId]
    );

    // Get benefits for each participant
    const participantsWithBenefits = await Promise.all(
      participants.rows.map(async (participant) => {
        const benefits = await pool.query(
          `SELECT category, category_label, total_amount, available_amount, in_cart_amount, consumed_amount, unit, period_start, period_end
           FROM benefits
           WHERE participant_id = $1 AND period_end >= CURRENT_DATE
           ORDER BY category`,
          [participant.id]
        );

        return {
          id: participant.id,
          type: participant.type,
          name: participant.name,
          benefits: benefits.rows.map(b => ({
            category: b.category,
            categoryLabel: b.category_label,
            available: b.available_amount.toString(),
            inCart: b.in_cart_amount.toString(),
            consumed: b.consumed_amount.toString(),
            total: b.total_amount.toString(),
            unit: b.unit,
            periodStart: b.period_start,
            periodEnd: b.period_end,
          })),
        };
      })
    );

    res.json({
      success: true,
      data: {
        household: {
          id: household.rows[0].id,
          state: household.rows[0].state,
          participants: participantsWithBenefits,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching benefits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch benefits',
    });
  }
});

/**
 * PUT /api/v1/benefits/participants/:id/formula
 * Assign a formula to a participant
 * Body: { formulaUpc: string, formulaName?: string }
 */
router.put('/participants/:id/formula', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { formulaUpc, formulaName } = req.body;

  if (!formulaUpc) {
    return res.status(400).json({
      success: false,
      error: 'formulaUpc is required'
    });
  }

  try {
    // Verify participant exists
    const participant = await pool.query(
      'SELECT id, type, name FROM participants WHERE id = $1',
      [id]
    );

    if (participant.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found'
      });
    }

    // Get formula name from database if not provided
    let resolvedFormulaName = formulaName;
    if (!resolvedFormulaName) {
      const formula = await pool.query(
        'SELECT brand, product_name FROM wic_formulas WHERE upc = $1',
        [formulaUpc]
      );
      if (formula.rows.length > 0) {
        resolvedFormulaName = `${formula.rows[0].brand} ${formula.rows[0].product_name}`;
      }
    }

    // Update participant's assigned formula
    await pool.query(
      `UPDATE participants
       SET assigned_formula_upc = $1,
           assigned_formula_name = $2,
           formula_assignment_source = 'manual'
       WHERE id = $3`,
      [formulaUpc, resolvedFormulaName, id]
    );

    res.json({
      success: true,
      participant: {
        id: participant.rows[0].id,
        name: participant.rows[0].name,
        type: participant.rows[0].type,
        assignedFormula: {
          upc: formulaUpc,
          name: resolvedFormulaName,
          source: 'manual'
        }
      }
    });
  } catch (error) {
    console.error('Error assigning formula:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign formula'
    });
  }
});

/**
 * GET /api/v1/benefits/participants/:id/formula
 * Get participant's assigned formula
 */
router.get('/participants/:id/formula', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT
        p.id,
        p.name,
        p.type,
        p.assigned_formula_upc,
        p.assigned_formula_name,
        p.formula_assignment_source,
        wf.brand,
        wf.product_name,
        wf.formula_type,
        wf.form,
        wf.size,
        wf.image_url
      FROM participants p
      LEFT JOIN wic_formulas wf ON p.assigned_formula_upc = wf.upc
      WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found'
      });
    }

    const row = result.rows[0];

    res.json({
      success: true,
      participant: {
        id: row.id,
        name: row.name,
        type: row.type
      },
      formula: row.assigned_formula_upc ? {
        upc: row.assigned_formula_upc,
        name: row.assigned_formula_name,
        source: row.formula_assignment_source,
        details: row.brand ? {
          brand: row.brand,
          productName: row.product_name,
          formulaType: row.formula_type,
          form: row.form,
          size: row.size,
          imageUrl: row.image_url
        } : null
      } : null
    });
  } catch (error) {
    console.error('Error fetching participant formula:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch participant formula'
    });
  }
});

/**
 * DELETE /api/v1/benefits/participants/:id/formula
 * Remove formula assignment from a participant
 */
router.delete('/participants/:id/formula', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE participants
       SET assigned_formula_upc = NULL,
           assigned_formula_name = NULL,
           formula_assignment_source = 'manual'
       WHERE id = $1
       RETURNING id, name, type`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found'
      });
    }

    res.json({
      success: true,
      participant: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        type: result.rows[0].type,
        assignedFormula: null
      }
    });
  } catch (error) {
    console.error('Error removing formula assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove formula assignment'
    });
  }
});

/**
 * Process benefit statement image with OCR
 * POST /api/v1/benefits/ocr
 */
router.post('/ocr', async (req: Request, res: Response) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Image data is required',
      });
    }

    // Extract benefits from image using OCR service
    const result = await extractBenefitsFromImage(image);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('OCR processing error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process image',
    });
  }
});

/**
 * Update benefit period dates for all participants in a household
 * PUT /api/v1/benefits/period
 */
router.put('/period', async (req: Request, res: Response) => {
  const { householdId, periodStart, periodEnd } = req.body;

  if (!householdId || !periodStart || !periodEnd) {
    return res.status(400).json({
      success: false,
      error: 'householdId, periodStart, and periodEnd are required',
    });
  }

  // Validate dates
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);

  if (endDate <= startDate) {
    return res.status(400).json({
      success: false,
      error: 'End date must be after start date',
    });
  }

  try {
    // Update all benefits for the household
    await pool.query(
      `UPDATE benefits
       SET period_start = $1, period_end = $2
       WHERE participant_id IN (
         SELECT id FROM participants WHERE household_id = $3
       )`,
      [periodStart, periodEnd, householdId]
    );

    res.json({
      success: true,
      message: 'Benefit period updated successfully',
      period: {
        start: periodStart,
        end: periodEnd,
      },
    });
  } catch (error) {
    console.error('Error updating benefit period:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update benefit period',
    });
  }
});

/**
 * Rollover to new benefit period
 * Archives current period and resets benefit amounts
 * POST /api/v1/benefits/rollover
 */
router.post('/rollover', async (req: Request, res: Response) => {
  const { householdId, newPeriodStart, newPeriodEnd } = req.body;

  if (!householdId || !newPeriodStart || !newPeriodEnd) {
    return res.status(400).json({
      success: false,
      error: 'householdId, newPeriodStart, and newPeriodEnd are required',
    });
  }

  // Validate dates
  const startDate = new Date(newPeriodStart);
  const endDate = new Date(newPeriodEnd);

  if (endDate <= startDate) {
    return res.status(400).json({
      success: false,
      error: 'End date must be after start date',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get all participants in household
    const participants = await client.query(
      'SELECT id FROM participants WHERE household_id = $1',
      [householdId]
    );

    // Archive current benefits (mark as expired)
    await client.query(
      `UPDATE benefits
       SET period_end = CURRENT_DATE - INTERVAL '1 day'
       WHERE participant_id IN (
         SELECT id FROM participants WHERE household_id = $1
       )
       AND period_end >= CURRENT_DATE`,
      [householdId]
    );

    // Reset benefit amounts for new period
    // Set total_amount to 0, available to 0, consumed to 0, in_cart to 0
    await client.query(
      `UPDATE benefits
       SET
         period_start = $1,
         period_end = $2,
         total_amount = 0,
         available_amount = 0,
         consumed_amount = 0,
         in_cart_amount = 0
       WHERE participant_id IN (
         SELECT id FROM participants WHERE household_id = $3
       )
       AND period_end >= CURRENT_DATE`,
      [newPeriodStart, newPeriodEnd, householdId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Benefit period rolled over successfully',
      period: {
        start: newPeriodStart,
        end: newPeriodEnd,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rolling over benefit period:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rollover benefit period',
    });
  } finally {
    client.release();
  }
});

/**
 * Get benefit period info for a household
 * GET /api/v1/benefits/period?household_id=1
 */
router.get('/period', async (req: Request, res: Response) => {
  const householdId = req.query.household_id || '1';

  try {
    const result = await pool.query(
      `SELECT
        period_start,
        period_end,
        COUNT(*) as benefit_count
       FROM benefits
       WHERE participant_id IN (
         SELECT id FROM participants WHERE household_id = $1
       )
       AND period_end >= CURRENT_DATE
       GROUP BY period_start, period_end
       LIMIT 1`,
      [householdId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active benefit period found',
      });
    }

    const row = result.rows[0];
    const now = new Date();
    const startDate = new Date(row.period_start);
    const endDate = new Date(row.period_end);

    // Calculate days remaining
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const daysInPeriod = Math.max(0, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      period: {
        start: row.period_start,
        end: row.period_end,
        daysRemaining,
        daysInPeriod,
        daysElapsed,
        isActive: now >= startDate && now <= endDate,
        isExpired: now > endDate,
        isUpcoming: now < startDate,
      },
    });
  } catch (error) {
    console.error('Error fetching benefit period:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch benefit period',
    });
  }
});

export default router;
