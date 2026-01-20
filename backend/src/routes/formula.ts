import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

/**
 * GET /api/v1/formula/availability
 * Get formula availability across stores near a location
 * Query params: lat, lng, radius (miles), upc (optional - filter by specific formula)
 */
router.get('/availability', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.latitude as string);
  const lng = parseFloat(req.query.longitude as string);
  const radiusMiles = parseInt(req.query.radius as string) || 25;
  const upc = req.query.upc as string;

  try {
    let query;
    let params;

    if (lat && lng) {
      // Query with distance calculation (Haversine formula)
      query = `
        SELECT
          id,
          upc,
          store_name,
          store_address,
          latitude,
          longitude,
          status,
          quantity_range,
          last_updated,
          source,
          confidence,
          report_count,
          -- Calculate distance in miles
          CASE
            WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN
              3959 * acos(
                cos(radians($1)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians($2)) +
                sin(radians($1)) * sin(radians(latitude))
              )
            ELSE NULL
          END as distance_miles
        FROM formula_availability
        WHERE 1=1
          ${upc ? 'AND upc = $4' : ''}
          AND last_updated >= NOW() - INTERVAL '48 hours'
          AND (
            latitude IS NULL OR longitude IS NULL OR
            3959 * acos(
              cos(radians($1)) * cos(radians(latitude)) *
              cos(radians(longitude) - radians($2)) +
              sin(radians($1)) * sin(radians(latitude))
            ) <= $3
          )
        ORDER BY
          CASE WHEN status = 'in_stock' THEN 1
               WHEN status = 'low_stock' THEN 2
               WHEN status = 'out_of_stock' THEN 3
               ELSE 4 END,
          last_updated DESC
        LIMIT 50
      `;
      params = upc ? [lat, lng, radiusMiles, upc] : [lat, lng, radiusMiles];
    } else {
      // Query without distance (no user location)
      query = `
        SELECT
          id,
          upc,
          store_name,
          store_address,
          latitude,
          longitude,
          status,
          quantity_range,
          last_updated,
          source,
          confidence,
          report_count
        FROM formula_availability
        WHERE 1=1
          ${upc ? 'AND upc = $1' : ''}
          AND last_updated >= NOW() - INTERVAL '48 hours'
        ORDER BY
          CASE WHEN status = 'in_stock' THEN 1
               WHEN status = 'low_stock' THEN 2
               WHEN status = 'out_of_stock' THEN 3
               ELSE 4 END,
          last_updated DESC
        LIMIT 50
      `;
      params = upc ? [upc] : [];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      availability: result.rows.map(row => ({
        id: row.id.toString(),
        upc: row.upc,
        storeName: row.store_name,
        storeAddress: row.store_address,
        latitude: row.latitude ? parseFloat(row.latitude) : null,
        longitude: row.longitude ? parseFloat(row.longitude) : null,
        status: row.status,
        quantityRange: row.quantity_range,
        lastUpdated: row.last_updated,
        source: row.source,
        confidence: row.confidence,
        reportCount: row.report_count,
        distanceMiles: row.distance_miles ? Math.round(row.distance_miles * 10) / 10 : null
      })),
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching formula availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch formula availability'
    });
  }
});

/**
 * POST /api/v1/formula/search
 * Search for formula across multiple stores
 * Body: { upcs: string[], lat: number, lng: number, radiusMiles: number, includeAlternatives: boolean }
 */
router.post('/search', async (req: Request, res: Response) => {
  const { upcs, lat, lng, radiusMiles = 25, includeAlternatives = false } = req.body;

  if (!upcs || !Array.isArray(upcs) || upcs.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'upcs array is required'
    });
  }

  try {
    let searchUpcs = [...upcs];

    // If including alternatives, fetch equivalent UPCs
    if (includeAlternatives) {
      const equivResult = await pool.query(
        `SELECT DISTINCT equivalent_upc
         FROM formula_equivalents
         WHERE primary_upc = ANY($1)
           AND (state IS NULL OR state = 'MI')`,
        [upcs]
      );
      const alternativeUpcs = equivResult.rows.map(r => r.equivalent_upc);
      searchUpcs = [...searchUpcs, ...alternativeUpcs];
    }

    let query;
    let params;

    if (lat && lng) {
      // Search with distance
      query = `
        SELECT
          fa.*,
          NULL as product_name,
          NULL as brand,
          NULL as size,
          -- Calculate distance
          CASE
            WHEN fa.latitude IS NOT NULL AND fa.longitude IS NOT NULL THEN
              3959 * acos(
                cos(radians($2)) * cos(radians(fa.latitude)) *
                cos(radians(fa.longitude) - radians($3)) +
                sin(radians($2)) * sin(radians(fa.latitude))
              )
            ELSE NULL
          END as distance_miles,
          -- Mark if this is an exact match or alternative
          CASE WHEN fa.upc = ANY($1) THEN true ELSE false END as exact_match
        FROM formula_availability fa
        WHERE fa.upc = ANY($4)
          AND fa.last_updated >= NOW() - INTERVAL '48 hours'
          AND fa.status IN ('in_stock', 'low_stock')
          AND (
            fa.latitude IS NULL OR fa.longitude IS NULL OR
            3959 * acos(
              cos(radians($2)) * cos(radians(fa.latitude)) *
              cos(radians(fa.longitude) - radians($3)) +
              sin(radians($2)) * sin(radians(fa.latitude))
            ) <= $5
          )
        ORDER BY
          exact_match DESC,
          CASE WHEN fa.status = 'in_stock' THEN 1 ELSE 2 END,
          distance_miles NULLS LAST,
          fa.confidence DESC
        LIMIT 100
      `;
      params = [upcs, lat, lng, searchUpcs, radiusMiles];
    } else {
      // Search without distance
      query = `
        SELECT
          fa.*,
          NULL as product_name,
          NULL as brand,
          NULL as size,
          CASE WHEN fa.upc = ANY($1) THEN true ELSE false END as exact_match
        FROM formula_availability fa
        WHERE fa.upc = ANY($2)
          AND fa.last_updated >= NOW() - INTERVAL '48 hours'
          AND fa.status IN ('in_stock', 'low_stock')
        ORDER BY
          exact_match DESC,
          CASE WHEN fa.status = 'in_stock' THEN 1 ELSE 2 END,
          fa.confidence DESC
        LIMIT 100
      `;
      params = [upcs, searchUpcs];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      results: result.rows.map(row => ({
        id: row.id.toString(),
        upc: row.upc,
        productName: row.product_name,
        brand: row.brand,
        size: row.size,
        storeName: row.store_name,
        storeAddress: row.store_address,
        latitude: row.latitude ? parseFloat(row.latitude) : null,
        longitude: row.longitude ? parseFloat(row.longitude) : null,
        status: row.status,
        quantityRange: row.quantity_range,
        lastUpdated: row.last_updated,
        source: row.source,
        confidence: row.confidence,
        distanceMiles: row.distance_miles ? Math.round(row.distance_miles * 10) / 10 : null,
        exactMatch: row.exact_match
      })),
      count: result.rows.length,
      searchedUpcs: searchUpcs
    });
  } catch (error) {
    console.error('Error searching formula:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search formula'
    });
  }
});

/**
 * GET /api/v1/formula/alternatives/:upc
 * Get alternative formulas for a given UPC
 */
router.get('/alternatives/:upc', async (req: Request, res: Response) => {
  const { upc } = req.params;
  const state = (req.query.state as string) || 'MI';

  try {
    const result = await pool.query(
      `SELECT
         fe.equivalent_upc,
         fe.relationship,
         fe.notes,
         NULL as product_name,
         NULL as brand,
         NULL as size,
         NULL as category
       FROM formula_equivalents fe
       WHERE fe.primary_upc = $1
         AND (fe.state IS NULL OR fe.state = $2)
       ORDER BY
         CASE fe.relationship
           WHEN 'same_product_different_size' THEN 1
           WHEN 'same_brand_different_type' THEN 2
           WHEN 'generic_equivalent' THEN 3
           WHEN 'medical_alternative' THEN 4
         END`,
      [upc, state]
    );

    res.json({
      success: true,
      alternatives: result.rows.map(row => ({
        upc: row.equivalent_upc,
        productName: row.product_name,
        brand: row.brand,
        size: row.size,
        category: row.category,
        relationship: row.relationship,
        notes: row.notes
      })),
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching alternatives:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alternatives'
    });
  }
});

/**
 * GET /api/v1/formula/shortages
 * Get active formula shortages in a region
 * Query params: region (default: Michigan)
 */
router.get('/shortages', async (req: Request, res: Response) => {
  const region = (req.query.region as string) || 'Michigan';

  try {
    const result = await pool.query(
      `SELECT
         id,
         upc,
         product_name,
         region,
         severity,
         out_of_stock_percentage,
         total_stores_checked,
         trend,
         status,
         detected_at,
         resolved_at,
         formula_category,
         affected_upcs,
         alternative_upcs
       FROM formula_shortages
       WHERE region = $1
         AND status = 'active'
       ORDER BY
         CASE WHEN severity = 'critical' THEN 1
              WHEN severity = 'severe' THEN 2
              WHEN severity = 'moderate' THEN 3
              ELSE 4 END,
         detected_at DESC`,
      [region]
    );

    res.json({
      success: true,
      shortages: result.rows.map(row => ({
        id: row.id.toString(),
        upc: row.upc,
        productName: row.product_name,
        region: row.region,
        severity: row.severity,
        outOfStockPercentage: row.out_of_stock_percentage ? parseFloat(row.out_of_stock_percentage) : null,
        totalStoresChecked: row.total_stores_checked,
        trend: row.trend,
        detectedAt: row.detected_at,
        resolvedAt: row.resolved_at,
        // Legacy fields (may be null for new shortages)
        formulaCategory: row.formula_category,
        affectedUpcs: row.affected_upcs,
        alternativeUpcs: row.alternative_upcs
      })),
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching shortages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shortages'
    });
  }
});

/**
 * POST /api/v1/formula/report
 * Report formula availability (crowdsourced)
 * Body: { upc, storeName, storeAddress?, latitude?, longitude?, status, quantityRange? }
 */
router.post('/report', async (req: Request, res: Response) => {
  const { upc, storeName, storeAddress, latitude, longitude, status, quantityRange } = req.body;

  // Validate required fields
  if (!upc || !storeName || !status) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: upc, storeName, status'
    });
  }

  // Validate status
  const validStatuses = ['in_stock', 'low_stock', 'out_of_stock'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'status must be one of: in_stock, low_stock, out_of_stock'
    });
  }

  try {
    // Check if report already exists for this UPC/store
    const existing = await pool.query(
      `SELECT id, report_count FROM formula_availability
       WHERE upc = $1 AND store_name = $2
       ORDER BY last_updated DESC
       LIMIT 1`,
      [upc, storeName]
    );

    let result;
    let reportCount = 1;

    if (existing.rows.length > 0) {
      // Update existing report
      const existingReport = existing.rows[0];
      reportCount = existingReport.report_count + 1;

      result = await pool.query(
        `UPDATE formula_availability
         SET status = $1,
             quantity_range = $2,
             last_updated = CURRENT_TIMESTAMP,
             source = 'crowdsourced',
             confidence = LEAST(60 + (report_count * 5), 95),
             report_count = report_count + 1
         WHERE id = $3
         RETURNING id, last_updated`,
        [status, quantityRange || null, existingReport.id]
      );
    } else {
      // Create new report
      result = await pool.query(
        `INSERT INTO formula_availability
         (upc, store_name, store_address, latitude, longitude, status, quantity_range, source, confidence, report_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'crowdsourced', 60, 1)
         RETURNING id, last_updated`,
        [
          upc,
          storeName,
          storeAddress || null,
          latitude || null,
          longitude || null,
          status,
          quantityRange || null
        ]
      );
    }

    res.json({
      success: true,
      report: {
        id: result.rows[0].id.toString(),
        lastUpdated: result.rows[0].last_updated,
        reportCount
      },
      message: 'Thank you for reporting formula availability!'
    });
  } catch (error) {
    console.error('Error reporting formula availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report formula availability'
    });
  }
});

/**
 * POST /api/v1/formula/report-simple
 * Simplified formula reporting: Just UPC, store, and quantity
 * Body: { upc: string, storeId: string, quantitySeen: 'none' | 'few' | 'some' | 'plenty', latitude?: number, longitude?: number }
 */
router.post('/report-simple', async (req: Request, res: Response) => {
  const { upc, storeId, quantitySeen, latitude, longitude } = req.body;

  // Validate required fields
  if (!upc || !storeId || !quantitySeen) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: upc, storeId, quantitySeen'
    });
  }

  // Validate quantitySeen
  const validQuantities = ['none', 'few', 'some', 'plenty'];
  if (!validQuantities.includes(quantitySeen)) {
    return res.status(400).json({
      success: false,
      error: 'quantitySeen must be one of: none, few, some, plenty'
    });
  }

  // Map quantity to status
  const statusMap: Record<string, string> = {
    'none': 'out_of_stock',
    'few': 'low_stock',
    'some': 'in_stock',
    'plenty': 'in_stock'
  };

  const quantityRangeMap: Record<string, string | null> = {
    'none': null,
    'few': 'few',
    'some': 'some',
    'plenty': 'plenty'
  };

  try {
    // Look up store details
    const storeResult = await pool.query(
      'SELECT name, street_address, city, state, latitude, longitude FROM stores WHERE store_id = $1',
      [storeId]
    );

    let storeName = storeId;
    let storeAddress = null;
    let storeLat = latitude;
    let storeLng = longitude;

    if (storeResult.rows.length > 0) {
      const store = storeResult.rows[0];
      storeName = store.name;
      storeAddress = `${store.street_address}, ${store.city}, ${store.state}`;
      storeLat = storeLat || parseFloat(store.latitude);
      storeLng = storeLng || parseFloat(store.longitude);
    }

    const status = statusMap[quantitySeen];
    const quantityRange = quantityRangeMap[quantitySeen];

    // Check if report already exists for this UPC/store
    const existing = await pool.query(
      `SELECT id, report_count FROM formula_availability
       WHERE upc = $1 AND store_name = $2
       ORDER BY last_updated DESC
       LIMIT 1`,
      [upc, storeName]
    );

    let result;
    let reportCount = 1;

    if (existing.rows.length > 0) {
      // Update existing report
      const existingReport = existing.rows[0];
      reportCount = existingReport.report_count + 1;

      result = await pool.query(
        `UPDATE formula_availability
         SET status = $1,
             quantity_range = $2,
             last_updated = CURRENT_TIMESTAMP,
             source = 'crowdsourced',
             confidence = LEAST(60 + (report_count * 5), 95),
             report_count = report_count + 1
         WHERE id = $3
         RETURNING id, last_updated`,
        [status, quantityRange, existingReport.id]
      );
    } else {
      // Create new report
      result = await pool.query(
        `INSERT INTO formula_availability
         (upc, store_name, store_address, latitude, longitude, status, quantity_range, source, confidence, report_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'crowdsourced', 60, 1)
         RETURNING id, last_updated`,
        [
          upc,
          storeName,
          storeAddress,
          storeLat || null,
          storeLng || null,
          status,
          quantityRange
        ]
      );
    }

    res.json({
      success: true,
      report: {
        id: result.rows[0].id.toString(),
        lastUpdated: result.rows[0].last_updated,
        reportCount,
        storeName,
        status,
        quantitySeen
      },
      message: 'Thank you for reporting formula availability!'
    });
  } catch (error) {
    console.error('Error reporting formula (simple):', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report formula availability'
    });
  }
});

export default router;
