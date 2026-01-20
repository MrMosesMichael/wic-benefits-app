import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

/**
 * POST /api/v1/formula-finder/search
 * Main search endpoint: Find stores that likely have a specific formula
 * Combines static retailer likelihood data with crowdsourced availability reports
 *
 * Body: {
 *   formulaUpc: string,
 *   lat: number,
 *   lng: number,
 *   radiusMiles?: number (default 10),
 *   formulaType?: string (for likelihood matching if UPC not in database)
 * }
 */
router.post('/search', async (req: Request, res: Response) => {
  const { formulaUpc, lat, lng, radiusMiles = 10, formulaType } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      error: 'lat and lng are required'
    });
  }

  if (!formulaUpc && !formulaType) {
    return res.status(400).json({
      success: false,
      error: 'Either formulaUpc or formulaType is required'
    });
  }

  try {
    // Step 1: Get formula details from UPC if provided
    let formulaDetails = null;
    let targetFormulaType = formulaType;

    if (formulaUpc) {
      const formulaResult = await pool.query(
        `SELECT upc, brand, product_name, formula_type, form, size
         FROM wic_formulas WHERE upc = $1`,
        [formulaUpc]
      );
      if (formulaResult.rows.length > 0) {
        formulaDetails = formulaResult.rows[0];
        targetFormulaType = formulaDetails.formula_type;
      }
    }

    // Step 2: Get nearby stores with distance
    const storesResult = await pool.query(
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
        wic_authorized,
        3959 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        ) as distance_miles
      FROM stores
      WHERE active = TRUE
        AND 3959 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        ) <= $3
      ORDER BY distance_miles ASC
      LIMIT 30`,
      [lat, lng, radiusMiles]
    );

    // Step 3: Get retailer likelihood data for this formula type
    const likelihoodResult = await pool.query(
      `SELECT chain, likelihood, notes
       FROM formula_retailer_availability
       WHERE formula_type = $1
         OR (formula_type = 'store_brand' AND brand IS NOT NULL)`,
      [targetFormulaType || 'standard']
    );

    const likelihoodMap: Record<string, { likelihood: string; notes: string }> = {};
    likelihoodResult.rows.forEach(row => {
      likelihoodMap[row.chain] = {
        likelihood: row.likelihood,
        notes: row.notes
      };
    });

    // Step 4: Get crowdsourced availability data for this UPC at these stores
    const storeIds = storesResult.rows.map(s => s.store_id);
    let crowdsourcedData: Record<string, any> = {};

    if (formulaUpc && storeIds.length > 0) {
      // Check formula_availability table for recent reports
      const crowdsourcedResult = await pool.query(
        `SELECT
          store_name,
          status,
          quantity_range,
          last_updated,
          confidence,
          report_count
         FROM formula_availability
         WHERE upc = $1
           AND last_updated >= NOW() - INTERVAL '48 hours'
         ORDER BY last_updated DESC`,
        [formulaUpc]
      );

      crowdsourcedResult.rows.forEach(row => {
        // Match by store name (fuzzy)
        const matchingStore = storesResult.rows.find(s =>
          s.name.toLowerCase().includes(row.store_name.toLowerCase()) ||
          row.store_name.toLowerCase().includes(s.name.toLowerCase())
        );
        if (matchingStore) {
          crowdsourcedData[matchingStore.store_id] = {
            status: row.status,
            quantityRange: row.quantity_range,
            lastUpdated: row.last_updated,
            confidence: row.confidence,
            reportCount: row.report_count
          };
        }
      });
    }

    // Step 5: Combine all data into results
    const results = storesResult.rows.map(store => {
      const likelihood = likelihoodMap[store.chain.toLowerCase()];
      const crowdsourced = crowdsourcedData[store.store_id];

      // Calculate a composite score for sorting
      let score = 0;

      // Crowdsourced data is most valuable
      if (crowdsourced) {
        if (crowdsourced.status === 'in_stock') score += 100;
        else if (crowdsourced.status === 'low_stock') score += 50;
        else if (crowdsourced.status === 'out_of_stock') score -= 50;
      }

      // Likelihood data
      if (likelihood) {
        if (likelihood.likelihood === 'always') score += 30;
        else if (likelihood.likelihood === 'usually') score += 20;
        else if (likelihood.likelihood === 'sometimes') score += 10;
        else if (likelihood.likelihood === 'rarely') score += 0;
      }

      // Prefer closer stores
      score -= parseFloat(store.distance_miles) * 2;

      // WIC authorized bonus
      if (store.wic_authorized) score += 5;

      return {
        id: store.id,
        storeId: store.store_id,
        chain: store.chain,
        name: store.name,
        address: {
          street: store.street_address,
          city: store.city,
          state: store.state,
          zip: store.zip
        },
        location: {
          latitude: parseFloat(store.latitude),
          longitude: parseFloat(store.longitude)
        },
        phone: store.phone,
        wicAuthorized: store.wic_authorized,
        distanceMiles: Math.round(parseFloat(store.distance_miles) * 10) / 10,
        likelihood: likelihood ? {
          level: likelihood.likelihood,
          notes: likelihood.notes
        } : null,
        crowdsourced: crowdsourced || null,
        score
      };
    });

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      formula: formulaDetails ? {
        upc: formulaDetails.upc,
        brand: formulaDetails.brand,
        productName: formulaDetails.product_name,
        formulaType: formulaDetails.formula_type,
        form: formulaDetails.form,
        size: formulaDetails.size
      } : null,
      searchParams: {
        formulaUpc,
        formulaType: targetFormulaType,
        lat,
        lng,
        radiusMiles
      },
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Error searching formula finder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search for formula'
    });
  }
});

/**
 * GET /api/v1/formula-finder/likelihood
 * Get likelihood data for a formula type at all chains
 */
router.get('/likelihood/:formulaType', async (req: Request, res: Response) => {
  const { formulaType } = req.params;

  try {
    const result = await pool.query(
      `SELECT chain, likelihood, brand, notes
       FROM formula_retailer_availability
       WHERE formula_type = $1
       ORDER BY
         CASE likelihood
           WHEN 'always' THEN 1
           WHEN 'usually' THEN 2
           WHEN 'sometimes' THEN 3
           WHEN 'rarely' THEN 4
         END`,
      [formulaType]
    );

    res.json({
      success: true,
      formulaType,
      retailers: result.rows.map(row => ({
        chain: row.chain,
        likelihood: row.likelihood,
        brand: row.brand,
        notes: row.notes
      }))
    });
  } catch (error) {
    console.error('Error fetching likelihood:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch likelihood data'
    });
  }
});

export default router;
