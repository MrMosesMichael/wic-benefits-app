import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

/**
 * GET /api/v1/formula-products
 * List WIC-approved formulas with optional filters
 * Query params: state, type, brand, search, active
 */
router.get('/', async (req: Request, res: Response) => {
  const { state, type, brand, search, active = 'true' } = req.query;

  try {
    let query = `
      SELECT
        id,
        upc,
        brand,
        product_name,
        formula_type,
        form,
        size,
        size_oz,
        state_contract_brand,
        states_approved,
        manufacturer,
        image_url,
        active,
        created_at
      FROM wic_formulas
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by active status
    if (active === 'true') {
      query += ` AND active = TRUE`;
    }

    // Filter by state
    if (state) {
      query += ` AND ($${paramIndex} = ANY(states_approved) OR states_approved IS NULL)`;
      params.push(state);
      paramIndex++;
    }

    // Filter by formula type
    if (type) {
      query += ` AND formula_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    // Filter by brand
    if (brand) {
      query += ` AND LOWER(brand) = LOWER($${paramIndex})`;
      params.push(brand);
      paramIndex++;
    }

    // Search by name or brand
    if (search) {
      query += ` AND (LOWER(product_name) LIKE $${paramIndex} OR LOWER(brand) LIKE $${paramIndex})`;
      params.push(`%${(search as string).toLowerCase()}%`);
      paramIndex++;
    }

    query += ` ORDER BY state_contract_brand DESC, brand, product_name`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      formulas: result.rows.map(row => ({
        id: row.id,
        upc: row.upc,
        brand: row.brand,
        productName: row.product_name,
        formulaType: row.formula_type,
        form: row.form,
        size: row.size,
        sizeOz: row.size_oz ? parseFloat(row.size_oz) : null,
        stateContractBrand: row.state_contract_brand,
        statesApproved: row.states_approved,
        manufacturer: row.manufacturer,
        imageUrl: row.image_url,
        active: row.active
      })),
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching formulas:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch formulas'
    });
  }
});

/**
 * GET /api/v1/formula-products/types
 * Get list of formula types for filter options
 */
router.get('/types', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT formula_type, COUNT(*) as count
      FROM wic_formulas
      WHERE active = TRUE
      GROUP BY formula_type
      ORDER BY count DESC
    `);

    const types = [
      { value: 'standard', label: 'Standard', description: 'Regular milk-based formula for most infants' },
      { value: 'sensitive', label: 'Sensitive', description: 'For fussiness and gas, reduced lactose' },
      { value: 'gentle', label: 'Gentle', description: 'Easy to digest, partially hydrolyzed' },
      { value: 'hypoallergenic', label: 'Hypoallergenic', description: 'For milk protein allergy, extensively hydrolyzed' },
      { value: 'organic', label: 'Organic', description: 'Made with organic ingredients' },
      { value: 'soy', label: 'Soy', description: 'Plant-based, no dairy' },
      { value: 'specialty', label: 'Specialty', description: 'For specific medical needs (AR, preemie, etc.)' },
      { value: 'store_brand', label: 'Store Brand', description: 'Retailer private label formulas' }
    ];

    // Add count from database
    const typesWithCount = types.map(t => {
      const dbRow = result.rows.find(r => r.formula_type === t.value);
      return {
        ...t,
        count: dbRow ? parseInt(dbRow.count) : 0
      };
    });

    res.json({
      success: true,
      types: typesWithCount
    });
  } catch (error) {
    console.error('Error fetching formula types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch formula types'
    });
  }
});

/**
 * GET /api/v1/formula-products/:upc
 * Get specific formula details by UPC
 */
router.get('/:upc', async (req: Request, res: Response) => {
  const { upc } = req.params;

  try {
    const result = await pool.query(
      `SELECT
        id,
        upc,
        brand,
        product_name,
        formula_type,
        form,
        size,
        size_oz,
        state_contract_brand,
        states_approved,
        manufacturer,
        image_url,
        active,
        created_at
      FROM wic_formulas
      WHERE upc = $1`,
      [upc]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Formula not found'
      });
    }

    const row = result.rows[0];

    res.json({
      success: true,
      formula: {
        id: row.id,
        upc: row.upc,
        brand: row.brand,
        productName: row.product_name,
        formulaType: row.formula_type,
        form: row.form,
        size: row.size,
        sizeOz: row.size_oz ? parseFloat(row.size_oz) : null,
        stateContractBrand: row.state_contract_brand,
        statesApproved: row.states_approved,
        manufacturer: row.manufacturer,
        imageUrl: row.image_url,
        active: row.active
      }
    });
  } catch (error) {
    console.error('Error fetching formula:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch formula'
    });
  }
});

export default router;
