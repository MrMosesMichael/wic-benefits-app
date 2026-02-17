import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

/**
 * Map raw APL category strings to normalized IDs.
 * Must stay in sync with app/lib/data/wic-categories.ts
 */
const CATEGORY_ALIASES: Record<string, string> = {
  // Numeric codes (zero-padded — MI, OR)
  '02': 'cheese', '03': 'eggs', '04': 'juice', '05': 'yogurt',
  '06': 'peanut_butter', '08': 'fish', '09': 'cereal',
  '11': 'infant_formula', '12': 'fruits_vegetables', '13': 'infant_meats',
  '15': 'milk', '16': 'whole_grains', '18': 'whole_grains', '19': 'fruits_vegetables',
  '21': 'infant_formula', '31': 'infant_formula', '41': 'infant_formula',
  '50': 'yogurt', '51': 'milk', '52': 'milk', '53': 'milk',
  '54': 'juice', '94': 'infant_formula', '97': 'infant_food',
  // Numeric codes (non-padded — NC)
  '2': 'cheese', '3': 'eggs', '4': 'juice', '5': 'yogurt',
  '6': 'peanut_butter', '8': 'fish', '9': 'cereal',
  // Text categories
  'milk': 'milk', 'milk, whole': 'milk', 'milk, reduced fat': 'milk',
  'milk, fat free': 'milk', 'milk, lowfat': 'milk', 'milk, skim': 'milk',
  'milk whole': 'milk', 'milk fat reduced': 'milk', 'milk fat free': 'milk',
  'milk lowfat': 'milk', 'fluid milk': 'milk', 'dairy': 'milk',
  'soy milk': 'milk', 'lactose free milk': 'milk',
  'eggs': 'eggs', 'egg': 'eggs', 'eggs, large': 'eggs',
  'cereal': 'cereal', 'cereal, hot': 'cereal', 'cereal, cold': 'cereal',
  'infant cereal': 'cereal', 'adult cereal': 'cereal', 'breakfast cereal': 'cereal',
  'peanut butter': 'peanut_butter', 'peanut_butter': 'peanut_butter',
  'juice': 'juice', 'juice, frozen': 'juice', 'juice, shelf stable': 'juice',
  'juice 64oz': 'juice', 'juice 48oz': 'juice', '100% juice': 'juice',
  'cheese': 'cheese', 'cheese, domestic': 'cheese', 'cheese or tofu': 'cheese',
  'yogurt': 'yogurt',
  'whole grains': 'whole_grains', 'whole_grains': 'whole_grains',
  'bread': 'whole_grains', 'whole wheat bread': 'whole_grains',
  'tortillas': 'whole_grains', 'brown rice': 'whole_grains', 'pasta': 'whole_grains',
  'bread and  whole grains': 'whole_grains', 'bread and whole grains': 'whole_grains',
  'legumes': 'legumes', 'beans': 'legumes', 'dried beans': 'legumes',
  'canned beans': 'legumes', 'lentils': 'legumes',
  'fish': 'fish', 'canned fish': 'fish', 'tuna': 'fish', 'salmon': 'fish',
  'infant formula': 'infant_formula', 'infant_formula': 'infant_formula',
  'formula': 'infant_formula', 'baby formula': 'infant_formula',
  'infant food': 'infant_food', 'infant_food': 'infant_food',
  'baby food': 'infant_food', 'infant fruits & vegetables': 'infant_food',
  'infant fruits and vegetables': 'infant_food',
  'infant meats': 'infant_meats', 'infant_meats': 'infant_meats',
  'fruits & vegetables': 'fruits_vegetables', 'fruits_vegetables': 'fruits_vegetables',
  'fruits and vegetables': 'fruits_vegetables', 'fresh fruits & vegetables': 'fruits_vegetables',
  'fruits and vegetables cash value benefit': 'fruits_vegetables',
  'cvv': 'fruits_vegetables', 'cash value voucher': 'fruits_vegetables',
  'cash value benefit': 'fruits_vegetables', 'cvb': 'fruits_vegetables',
  'produce': 'fruits_vegetables',
};

function normalizeCategory(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (CATEGORY_ALIASES[lower]) return CATEGORY_ALIASES[lower];
  for (const [alias, id] of Object.entries(CATEGORY_ALIASES)) {
    if (lower.startsWith(alias)) return id;
  }
  return 'uncategorized';
}

/**
 * GET /api/v1/product-catalog/categories
 * Get product categories with counts for a state (normalized + merged)
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

    // Normalize and merge counts
    const merged = new Map<string, number>();
    for (const row of result.rows) {
      const normalized = normalizeCategory(row.category);
      merged.set(normalized, (merged.get(normalized) || 0) + parseInt(row.count, 10));
    }

    const categories = Array.from(merged.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      state,
      categories,
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
      // Find all raw categories that map to this normalized category
      const rawCategories = Object.entries(CATEGORY_ALIASES)
        .filter(([, norm]) => norm === category)
        .map(([raw]) => raw);
      // Also include the category itself (in case it's stored as-is)
      rawCategories.push(category);
      const placeholders = rawCategories.map((_, i) => `$${paramIndex + i}`).join(', ');
      conditions.push(`LOWER(category) IN (${placeholders})`);
      params.push(...rawCategories);
      paramIndex += rawCategories.length;
    }

    if (subcategory) {
      conditions.push(`subcategory = $${paramIndex}`);
      params.push(subcategory);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(product_name ILIKE $${paramIndex} OR brand ILIKE $${paramIndex})`);
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
      `SELECT id, upc, product_name AS name, brand, size, category, subcategory, state
       FROM apl_products
       WHERE ${whereClause}
       ORDER BY product_name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Get subcategories for this category (if category filter is applied)
    let subcategories: string[] = [];
    if (category) {
      const rawCats = Object.entries(CATEGORY_ALIASES)
        .filter(([, norm]) => norm === category)
        .map(([raw]) => raw);
      rawCats.push(category);
      const subPlaceholders = rawCats.map((_, i) => `$${2 + i}`).join(', ');
      const subResult = await pool.query(
        `SELECT DISTINCT subcategory FROM apl_products
         WHERE active = true AND state = $1 AND LOWER(category) IN (${subPlaceholders}) AND subcategory IS NOT NULL
         ORDER BY subcategory`,
        [state, ...rawCats]
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
