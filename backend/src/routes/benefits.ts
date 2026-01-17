import { Router, Request, Response } from 'express';
import pool from '../config/database';

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
          `SELECT category, category_label, total_amount, available_amount, unit, period_start, period_end
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

export default router;
