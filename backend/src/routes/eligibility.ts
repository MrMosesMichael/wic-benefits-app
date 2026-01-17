import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

/**
 * Check if a product is WIC-eligible in Michigan
 * GET /api/v1/eligibility/:upc
 */
router.get('/:upc', async (req: Request, res: Response) => {
  const upc = req.params.upc as string;

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

    // Query APL database with all UPC variants
    const result = await pool.query(
      `SELECT upc, product_name, brand, size, category, subcategory, restrictions
       FROM apl_products
       WHERE upc = ANY($1) AND state = 'MI' AND active = true
       LIMIT 1`,
      [upcVariants]
    );

    if (result.rows.length > 0) {
      const product = result.rows[0];

      res.json({
        success: true,
        data: {
          eligible: true,
          product: {
            upc: product.upc,
            name: product.product_name,
            brand: product.brand,
            size: product.size,
          },
          category: product.category,
          subcategory: product.subcategory,
          restrictions: product.restrictions,
          reason: `This product is WIC-approved in Michigan (${product.category})`,
        },
      });
    } else {
      // Not in APL - check if we have product info from other sources
      const productInfo = await pool.query(
        'SELECT upc, name, brand, size FROM products WHERE upc = ANY($1) LIMIT 1',
        [upcVariants]
      );

      res.json({
        success: true,
        data: {
          eligible: false,
          product: productInfo.rows.length > 0 ? {
            upc: productInfo.rows[0].upc,
            name: productInfo.rows[0].name,
            brand: productInfo.rows[0].brand,
            size: productInfo.rows[0].size,
          } : {
            upc: normalizedUPC,
            name: 'Unknown Product',
          },
          reason: 'This product is not on the Michigan WIC Approved Product List',
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
