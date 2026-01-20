import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

/**
 * POST /api/v1/sightings/report
 * Report a product sighting
 * Body: { upc, storeId?, storeName, stockLevel, latitude?, longitude?, reportedBy? }
 */
router.post('/report', async (req: Request, res: Response) => {
  const { upc, storeId, storeName, stockLevel, latitude, longitude, reportedBy } = req.body;

  // Validate required fields
  if (!upc || !storeName || !stockLevel) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: upc, storeName, stockLevel'
    });
  }

  // Validate stock level
  const validStockLevels = ['plenty', 'some', 'few', 'out'];
  if (!validStockLevels.includes(stockLevel)) {
    return res.status(400).json({
      success: false,
      error: 'stockLevel must be one of: plenty, some, few, out'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO product_sightings
       (upc, store_id, store_name, latitude, longitude, stock_level, reported_by, location_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, reported_at`,
      [
        upc,
        storeId || null,
        storeName,
        latitude || null,
        longitude || null,
        stockLevel,
        reportedBy || 'anonymous',
        !!(latitude && longitude) // verified if coordinates provided
      ]
    );

    res.json({
      success: true,
      sighting: {
        id: result.rows[0].id,
        reportedAt: result.rows[0].reported_at
      },
      message: 'Thank you for reporting!'
    });
  } catch (error) {
    console.error('Error reporting sighting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report sighting'
    });
  }
});

/**
 * GET /api/v1/sightings/:upc
 * Get recent sightings for a product
 * Query params: radius_miles (default 25), max_age_hours (default 48)
 */
router.get('/:upc', async (req: Request, res: Response) => {
  const { upc } = req.params;
  const radiusMiles = parseInt(req.query.radius_miles as string) || 25;
  const maxAgeHours = parseInt(req.query.max_age_hours as string) || 48;
  const userLat = parseFloat(req.query.latitude as string);
  const userLng = parseFloat(req.query.longitude as string);

  if (!upc) {
    return res.status(400).json({
      success: false,
      error: 'UPC is required'
    });
  }

  try {
    // Get recent sightings for this UPC
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    let sightings;

    if (userLat && userLng) {
      // Query with distance calculation
      sightings = await pool.query(
        `SELECT
          id,
          upc,
          store_id,
          store_name,
          latitude,
          longitude,
          stock_level,
          reported_at,
          helpful_count,
          location_verified,
          -- Calculate distance in miles using Haversine formula
          CASE
            WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN
              3959 * acos(
                cos(radians($2)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians($3)) +
                sin(radians($2)) * sin(radians(latitude))
              )
            ELSE NULL
          END as distance_miles
         FROM product_sightings
         WHERE upc = $1
         AND reported_at >= $4
         AND (
           latitude IS NULL OR longitude IS NULL OR
           3959 * acos(
             cos(radians($2)) * cos(radians(latitude)) *
             cos(radians(longitude) - radians($3)) +
             sin(radians($2)) * sin(radians(latitude))
           ) <= $5
         )
         ORDER BY reported_at DESC
         LIMIT 20`,
        [upc, userLat, userLng, cutoffTime, radiusMiles]
      );
    } else {
      // Query without distance (no user location)
      sightings = await pool.query(
        `SELECT
          id,
          upc,
          store_id,
          store_name,
          latitude,
          longitude,
          stock_level,
          reported_at,
          helpful_count,
          location_verified
         FROM product_sightings
         WHERE upc = $1
         AND reported_at >= $2
         ORDER BY reported_at DESC
         LIMIT 20`,
        [upc, cutoffTime]
      );
    }

    // Calculate confidence and age for each sighting
    const enrichedSightings = sightings.rows.map(sighting => {
      const ageHours = (Date.now() - new Date(sighting.reported_at).getTime()) / (1000 * 60 * 60);
      const confidence = calculateConfidence(
        ageHours,
        sighting.helpful_count,
        sighting.location_verified
      );

      return {
        id: sighting.id.toString(),
        storeName: sighting.store_name,
        storeId: sighting.store_id,
        stockLevel: sighting.stock_level,
        reportedAt: sighting.reported_at,
        ageHours: Math.round(ageHours * 10) / 10,
        distance: sighting.distance_miles ? Math.round(sighting.distance_miles * 10) / 10 : null,
        confidence,
        helpfulCount: sighting.helpful_count,
        locationVerified: sighting.location_verified
      };
    });

    res.json({
      success: true,
      sightings: enrichedSightings,
      count: enrichedSightings.length
    });
  } catch (error) {
    console.error('Error fetching sightings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sightings'
    });
  }
});

/**
 * POST /api/v1/sightings/:id/helpful
 * Mark a sighting as helpful
 */
router.post('/:id/helpful', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE product_sightings
       SET helpful_count = helpful_count + 1
       WHERE id = $1
       RETURNING helpful_count`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Sighting not found'
      });
    }

    res.json({
      success: true,
      helpfulCount: result.rows[0].helpful_count
    });
  } catch (error) {
    console.error('Error marking sighting as helpful:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark sighting as helpful'
    });
  }
});

/**
 * Calculate confidence score for a sighting
 * Returns 0-100
 */
function calculateConfidence(
  ageHours: number,
  helpfulCount: number,
  locationVerified: boolean
): number {
  let confidence = 100;

  // Age factor (decreases over time)
  if (ageHours < 2) {
    // Very recent: 100%
    confidence = 100;
  } else if (ageHours < 6) {
    // Recent: 90%
    confidence = 90;
  } else if (ageHours < 12) {
    // Somewhat recent: 75%
    confidence = 75;
  } else if (ageHours < 24) {
    // Same day: 60%
    confidence = 60;
  } else if (ageHours < 48) {
    // Yesterday: 40%
    confidence = 40;
  } else {
    // Older: 20%
    confidence = 20;
  }

  // Helpful count bonus (max +20)
  const helpfulBonus = Math.min(helpfulCount * 4, 20);
  confidence += helpfulBonus;

  // Location verified bonus (+10)
  if (locationVerified) {
    confidence += 10;
  }

  // Cap at 100
  return Math.min(confidence, 100);
}

export default router;
