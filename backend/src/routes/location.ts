import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

const SUPPORTED_STATES = ['MI', 'NC', 'FL', 'OR', 'NY'];

/**
 * POST /api/v1/location/resolve
 * Resolve a zip code to coordinates and state
 */
router.post('/resolve', async (req: Request, res: Response) => {
  try {
    const { zipCode } = req.body;

    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return res.status(400).json({
        success: false,
        error: 'Valid 5-digit zip code required',
      });
    }

    const result = await pool.query(
      'SELECT zip, lat, lng, city, state FROM zip_codes WHERE zip = $1',
      [zipCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Zip code not found',
      });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      location: {
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        state: row.state,
        city: row.city,
        zipCode: row.zip,
        supported: SUPPORTED_STATES.includes(row.state),
      },
    });
  } catch (error) {
    console.error('Error resolving zip code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve zip code',
    });
  }
});

/**
 * GET /api/v1/location/detect-state?lat=X&lng=Y
 * Detect state from GPS coordinates (nearest zip code match)
 */
router.get('/detect-state', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: 'Valid lat and lng query parameters required',
      });
    }

    // Find nearest zip code using Euclidean distance approximation
    // Good enough for state detection within the US
    const result = await pool.query(
      `SELECT zip, lat, lng, city, state,
              SQRT(POW(lat - $1, 2) + POW(lng - $2, 2)) as distance
       FROM zip_codes
       ORDER BY distance
       LIMIT 1`,
      [lat, lng]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Could not determine state from coordinates',
      });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      location: {
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        state: row.state,
        city: row.city,
        zipCode: row.zip,
        supported: SUPPORTED_STATES.includes(row.state),
      },
    });
  } catch (error) {
    console.error('Error detecting state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect state from coordinates',
    });
  }
});

/**
 * GET /api/v1/location/supported-states
 * List states with WIC data available
 */
router.get('/supported-states', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    states: SUPPORTED_STATES,
  });
});

export default router;
