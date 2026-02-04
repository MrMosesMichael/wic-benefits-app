import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// Supported states with their full names
const SUPPORTED_STATES: Record<string, string> = {
  MI: 'Michigan',
  NC: 'North Carolina',
  FL: 'Florida',
  OR: 'Oregon',
  NY: 'New York',
};

/**
 * Get list of supported states
 * GET /api/v1/eligibility/states
 */
router.get('/states', async (_req: Request, res: Response) => {
  try {
    // Get states with product counts
    const result = await pool.query(
      `SELECT state, COUNT(*) as product_count
       FROM apl_products
       WHERE active = true
       GROUP BY state
       ORDER BY state`
    );

    const states = result.rows.map((row) => ({
      code: row.state,
      name: SUPPORTED_STATES[row.state] || row.state,
      productCount: parseInt(row.product_count),
    }));

    res.json({
      success: true,
      states,
      supportedStates: Object.entries(SUPPORTED_STATES).map(([code, name]) => ({
        code,
        name,
      })),
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch supported states',
    });
  }
});

/**
 * Check if a product is WIC-eligible
 * GET /api/v1/eligibility/:upc
 * Query params:
 *   - state: State code (default: MI). Supports: MI, NC, FL, OR, NY
 */
router.get('/:upc', async (req: Request, res: Response) => {
  const upc = req.params.upc as string;
  const state = ((req.query.state as string) || 'MI').toUpperCase();

  // Validate state
  if (!SUPPORTED_STATES[state]) {
    return res.status(400).json({
      success: false,
      error: `Unsupported state: ${state}. Supported states: ${Object.keys(SUPPORTED_STATES).join(', ')}`,
    });
  }

  try {
    // Normalize UPC (remove spaces, dashes)
    const normalizedUPC = upc.replace(/[\s\-]/g, '');

    // UPC-A codes are 12 digits, but often stored as EAN-13 (13 digits) with leading 0
    // Try matching with and without leading zero
    const upcVariants = [
      normalizedUPC,
      normalizedUPC.padStart(13, '0'), // Add leading zero if 12 digits
      normalizedUPC.replace(/^0+/, ''), // Remove leading zeros
    ].filter((v, i, arr) => arr.indexOf(v) === i); // Remove duplicates

    // Query APL database with all UPC variants for specified state
    const result = await pool.query(
      `SELECT upc, product_name, brand, size, category, subcategory, restrictions, state
       FROM apl_products
       WHERE upc = ANY($1) AND state = $2 AND active = true
       LIMIT 1`,
      [upcVariants, state]
    );

    const stateName = SUPPORTED_STATES[state];

    if (result.rows.length > 0) {
      const product = result.rows[0];

      res.json({
        success: true,
        data: {
          eligible: true,
          state: state,
          stateName: stateName,
          product: {
            upc: product.upc,
            name: product.product_name,
            brand: product.brand,
            size: product.size,
          },
          category: product.category,
          subcategory: product.subcategory,
          restrictions: product.restrictions,
          reason: `This product is WIC-approved in ${stateName} (${product.category})`,
        },
      });
    } else {
      // Not in APL - check if we have product info from other sources
      const productInfo = await pool.query(
        'SELECT upc, name, brand, size FROM products WHERE upc = ANY($1) LIMIT 1',
        [upcVariants]
      );

      // Check if this product is approved in any other state
      const otherStatesResult = await pool.query(
        `SELECT DISTINCT state FROM apl_products
         WHERE upc = ANY($1) AND active = true`,
        [upcVariants]
      );
      const approvedInStates = otherStatesResult.rows.map((r) => r.state);

      res.json({
        success: true,
        data: {
          eligible: false,
          state: state,
          stateName: stateName,
          product: productInfo.rows.length > 0 ? {
            upc: productInfo.rows[0].upc,
            name: productInfo.rows[0].name,
            brand: productInfo.rows[0].brand,
            size: productInfo.rows[0].size,
          } : {
            upc: normalizedUPC,
            name: 'Unknown Product',
          },
          reason: `This product is not on the ${stateName} WIC Approved Product List`,
          approvedInOtherStates: approvedInStates.length > 0 ? approvedInStates : undefined,
        },
      });
    }
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check product eligibility',
    });
  }
});

export default router;
