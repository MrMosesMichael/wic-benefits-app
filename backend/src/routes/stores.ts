import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

/**
 * GET /api/v1/stores/nearby
 * Get stores near a location
 * Query params: lat, lng, radius_miles (default 10), chain, wic_only
 */
router.get('/nearby', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radiusMiles = parseFloat(req.query.radius_miles as string) || 10;
  const chain = req.query.chain as string;
  const wicOnly = req.query.wic_only === 'true';

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      error: 'lat and lng parameters are required'
    });
  }

  try {
    let query = `
      SELECT
        id,
        store_id,
        chain,
        name,
        street_address,
        city,
        state,
        zip,
        latitude,
        longitude,
        phone,
        wic_authorized,
        -- Calculate distance in miles using Haversine formula
        3959 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        ) as distance_miles
      FROM stores
      WHERE active = TRUE
    `;

    const params: any[] = [lat, lng];
    let paramIndex = 3;

    // Filter by chain
    if (chain) {
      query += ` AND LOWER(chain) = LOWER($${paramIndex})`;
      params.push(chain);
      paramIndex++;
    }

    // Filter WIC-authorized only
    if (wicOnly) {
      query += ` AND wic_authorized = TRUE`;
    }

    // Filter by radius
    query += `
      HAVING 3959 * acos(
        cos(radians($1)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(latitude))
      ) <= $${paramIndex}
    `;
    params.push(radiusMiles);

    query += ` ORDER BY distance_miles ASC LIMIT 50`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      stores: result.rows.map(row => ({
        id: row.id,
        storeId: row.store_id,
        chain: row.chain,
        name: row.name,
        streetAddress: row.street_address,
        city: row.city,
        state: row.state,
        zip: row.zip,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        phone: row.phone,
        wicAuthorized: row.wic_authorized,
        distanceMiles: Math.round(parseFloat(row.distance_miles) * 10) / 10
      })),
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching nearby stores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nearby stores'
    });
  }
});

/**
 * GET /api/v1/stores/chains
 * Get list of retailer chains
 */
router.get('/chains', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT chain, COUNT(*) as store_count
      FROM stores
      WHERE active = TRUE
      GROUP BY chain
      ORDER BY store_count DESC
    `);

    // Chain metadata
    const chainMeta: Record<string, { displayName: string; logo?: string }> = {
      walmart: { displayName: 'Walmart' },
      target: { displayName: 'Target' },
      kroger: { displayName: 'Kroger' },
      meijer: { displayName: 'Meijer' },
      cvs: { displayName: 'CVS Pharmacy' },
      walgreens: { displayName: 'Walgreens' },
      rite_aid: { displayName: 'Rite Aid' },
      whole_foods: { displayName: 'Whole Foods Market' },
      costco: { displayName: 'Costco' },
      sams_club: { displayName: "Sam's Club" }
    };

    const chains = result.rows.map(row => ({
      id: row.chain,
      displayName: chainMeta[row.chain]?.displayName || row.chain,
      storeCount: parseInt(row.store_count)
    }));

    res.json({
      success: true,
      chains
    });
  } catch (error) {
    console.error('Error fetching chains:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chains'
    });
  }
});

/**
 * GET /api/v1/stores/:store_id
 * Get specific store details
 */
router.get('/:store_id', async (req: Request, res: Response) => {
  const { store_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT
        id,
        store_id,
        chain,
        name,
        street_address,
        city,
        state,
        zip,
        latitude,
        longitude,
        phone,
        wic_authorized
      FROM stores
      WHERE store_id = $1 AND active = TRUE`,
      [store_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    const row = result.rows[0];

    res.json({
      success: true,
      store: {
        id: row.id,
        storeId: row.store_id,
        chain: row.chain,
        name: row.name,
        streetAddress: row.street_address,
        city: row.city,
        state: row.state,
        zip: row.zip,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        phone: row.phone,
        wicAuthorized: row.wic_authorized
      }
    });
  } catch (error) {
    console.error('Error fetching store:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch store'
    });
  }
});

export default router;
