import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

/**
 * GET /api/v1/product-catalog/categories
 * Get product categories with counts for a state
 * Query params: state (required)
 */
router.get('/categories', async (req: Request, res: Response) => {
  const state = (req.query.state as string || 'MI').toUpperCase();

  try {
    const result = await pool.query(
      `SELECT category, COUNT(*) as count
       FROM apl_products
       WHERE active = true AND state = $1
       GROUP BY category
       ORDER BY count DESC`,
      [state]
    );

    res.json({
      success: true,
      state,
      categories: result.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count, 10),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

/**
 * GET /api/v1/product-catalog/products
 * Get paginated products with optional filters
 * Query params: state, category, subcategory, q (search), page, limit
 */
router.get('/products', async (req: Request, res: Response) => {
  const state = (req.query.state as string || 'MI').toUpperCase();
  const category = req.query.category as string;
  const subcategory = req.query.subcategory as string;
  const search = req.query.q as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = (page - 1) * limit;

  try {
    const conditions: string[] = ['active = true', 'state = $1'];
    const params: any[] = [state];
    let paramIndex = 2;

    if (category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (subcategory) {
      conditions.push(`subcategory = $${paramIndex}`);
      params.push(subcategory);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR brand ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM apl_products WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get products
    const productsResult = await pool.query(
      `SELECT id, upc, name, brand, size, category, subcategory, state
       FROM apl_products
       WHERE ${whereClause}
       ORDER BY name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Get subcategories for this category (if category filter is applied)
    let subcategories: string[] = [];
    if (category) {
      const subResult = await pool.query(
        `SELECT DISTINCT subcategory FROM apl_products
         WHERE active = true AND state = $1 AND category = $2 AND subcategory IS NOT NULL
         ORDER BY subcategory`,
        [state, category]
      );
      subcategories = subResult.rows.map(r => r.subcategory);
    }

    res.json({
      success: true,
      products: productsResult.rows,
      subcategories,
      total,
      page,
      limit,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

export default router;
