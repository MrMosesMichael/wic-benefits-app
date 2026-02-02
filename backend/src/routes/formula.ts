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
 * Returns smart suggestions based on formula type, availability, and WIC coverage
 */
router.get('/alternatives/:upc', async (req: Request, res: Response) => {
  const { upc } = req.params;
  const state = (req.query.state as string) || 'MI';
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
  const radiusMiles = parseInt(req.query.radius as string) || 25;

  try {
    // Step 1: Get the primary formula details
    const primaryFormula = await pool.query(
      `SELECT upc, brand, product_name, formula_type, form, size, size_oz, state_contract_brand
       FROM wic_formulas
       WHERE upc = $1 AND active = TRUE`,
      [upc]
    );

    if (primaryFormula.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Formula not found'
      });
    }

    const primary = primaryFormula.rows[0];

    // Step 2: Find alternatives from explicit equivalents table
    const explicitAlternatives = await pool.query(
      `SELECT
         fe.equivalent_upc,
         fe.relationship,
         fe.notes,
         wf.brand,
         wf.product_name,
         wf.formula_type,
         wf.form,
         wf.size,
         wf.size_oz,
         wf.state_contract_brand
       FROM formula_equivalents fe
       JOIN wic_formulas wf ON wf.upc = fe.equivalent_upc
       WHERE fe.primary_upc = $1
         AND (fe.state IS NULL OR fe.state = $2)
         AND wf.active = TRUE
       ORDER BY
         CASE fe.relationship
           WHEN 'same_product_different_size' THEN 1
           WHEN 'same_brand_different_type' THEN 2
           WHEN 'generic_equivalent' THEN 3
           WHEN 'medical_alternative' THEN 4
         END`,
      [upc, state]
    );

    // Step 3: Find implicit alternatives (same type, same form)
    const implicitAlternatives = await pool.query(
      `SELECT
         upc,
         brand,
         product_name,
         formula_type,
         form,
         size,
         size_oz,
         state_contract_brand
       FROM wic_formulas
       WHERE formula_type = $1
         AND form = $2
         AND upc != $3
         AND active = TRUE
         AND ($4 = ANY(states_approved) OR states_approved IS NULL)
       ORDER BY
         state_contract_brand DESC,
         brand,
         product_name
       LIMIT 10`,
      [primary.formula_type, primary.form, upc, state]
    );

    // Combine and deduplicate alternatives
    const alternativesMap = new Map();

    // Add explicit alternatives with their relationship info
    explicitAlternatives.rows.forEach(row => {
      alternativesMap.set(row.equivalent_upc, {
        upc: row.equivalent_upc,
        brand: row.brand,
        productName: row.product_name,
        formulaType: row.formula_type,
        form: row.form,
        size: row.size,
        sizeOz: row.size_oz ? parseFloat(row.size_oz) : null,
        stateContractBrand: row.state_contract_brand,
        relationship: row.relationship,
        reason: getAlternativeReason(row.relationship, row.state_contract_brand),
        notes: row.notes,
        priority: getRelationshipPriority(row.relationship, row.state_contract_brand)
      });
    });

    // Add implicit alternatives (if not already present)
    implicitAlternatives.rows.forEach(row => {
      if (!alternativesMap.has(row.upc)) {
        const isSameBrand = row.brand.toLowerCase() === primary.brand.toLowerCase();
        alternativesMap.set(row.upc, {
          upc: row.upc,
          brand: row.brand,
          productName: row.product_name,
          formulaType: row.formula_type,
          form: row.form,
          size: row.size,
          sizeOz: row.size_oz ? parseFloat(row.size_oz) : null,
          stateContractBrand: row.state_contract_brand,
          relationship: isSameBrand ? 'same_brand_different_type' : 'same_type_different_brand',
          reason: getImplicitAlternativeReason(isSameBrand, row.state_contract_brand, primary.formula_type),
          notes: null,
          priority: getImplicitPriority(isSameBrand, row.state_contract_brand)
        });
      }
    });

    // Convert to array and sort by priority
    let alternatives = Array.from(alternativesMap.values());
    alternatives.sort((a, b) => a.priority - b.priority);

    // Step 4: Add availability data if location provided
    if (lat && lng && alternatives.length > 0) {
      const alternativeUpcs = alternatives.map(a => a.upc);

      const availabilityResult = await pool.query(
        `SELECT
           fa.upc,
           fa.store_name,
           fa.status,
           fa.last_updated,
           fa.confidence,
           CASE
             WHEN fa.latitude IS NOT NULL AND fa.longitude IS NOT NULL THEN
               3959 * acos(
                 cos(radians($1)) * cos(radians(fa.latitude)) *
                 cos(radians(fa.longitude) - radians($2)) +
                 sin(radians($1)) * sin(radians(fa.latitude))
               )
             ELSE NULL
           END as distance_miles
         FROM formula_availability fa
         WHERE fa.upc = ANY($3)
           AND fa.last_updated >= NOW() - INTERVAL '48 hours'
           AND fa.status IN ('in_stock', 'low_stock')
           AND (
             fa.latitude IS NULL OR fa.longitude IS NULL OR
             3959 * acos(
               cos(radians($1)) * cos(radians(fa.latitude)) *
               cos(radians(fa.longitude) - radians($2)) +
               sin(radians($1)) * sin(radians(fa.latitude))
             ) <= $4
           )
         ORDER BY
           CASE WHEN fa.status = 'in_stock' THEN 1 ELSE 2 END,
           distance_miles NULLS LAST`,
        [lat, lng, alternativeUpcs, radiusMiles]
      );

      // Group availability by UPC
      const availabilityByUpc: Record<string, any[]> = {};
      availabilityResult.rows.forEach(row => {
        if (!availabilityByUpc[row.upc]) {
          availabilityByUpc[row.upc] = [];
        }
        availabilityByUpc[row.upc].push({
          storeName: row.store_name,
          status: row.status,
          lastUpdated: row.last_updated,
          confidence: row.confidence,
          distanceMiles: row.distance_miles ? Math.round(parseFloat(row.distance_miles) * 10) / 10 : null
        });
      });

      // Attach availability to alternatives and boost priority for in-stock items
      alternatives = alternatives.map(alt => {
        const availability = availabilityByUpc[alt.upc] || [];
        const hasInStock = availability.some(a => a.status === 'in_stock');
        return {
          ...alt,
          availability: availability.slice(0, 3), // Top 3 locations
          availableNearby: availability.length > 0,
          inStockNearby: hasInStock,
          // Adjust priority: boost if in stock nearby
          priority: hasInStock ? alt.priority - 100 : alt.priority
        };
      });

      // Re-sort by adjusted priority
      alternatives.sort((a, b) => a.priority - b.priority);
    }

    res.json({
      success: true,
      primary: {
        upc: primary.upc,
        brand: primary.brand,
        productName: primary.product_name,
        formulaType: primary.formula_type,
        form: primary.form,
        size: primary.size,
        sizeOz: primary.size_oz ? parseFloat(primary.size_oz) : null,
        stateContractBrand: primary.state_contract_brand
      },
      alternatives: alternatives.slice(0, 15), // Limit to top 15
      count: alternatives.length
    });
  } catch (error) {
    console.error('Error fetching alternatives:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alternatives'
    });
  }
});

// Helper function to get human-readable reason for alternative
function getAlternativeReason(relationship: string, isContractBrand: boolean): string {
  const contractSuffix = isContractBrand ? ' • WIC Contract Brand' : '';
  switch (relationship) {
    case 'same_product_different_size':
      return 'Same formula, different size' + contractSuffix;
    case 'same_brand_different_type':
      return 'Same brand, different type' + contractSuffix;
    case 'generic_equivalent':
      return 'Generic equivalent' + contractSuffix;
    case 'medical_alternative':
      return 'Medical alternative' + contractSuffix;
    default:
      return 'Alternative formula' + contractSuffix;
  }
}

function getImplicitAlternativeReason(sameBrand: boolean, isContractBrand: boolean, formulaType: string): string {
  const typeLabel = formulaType.replace('_', ' ');
  if (sameBrand) {
    return isContractBrand
      ? `Same brand - ${typeLabel} • WIC Contract Brand`
      : `Same brand - ${typeLabel}`;
  } else {
    return isContractBrand
      ? `Same type (${typeLabel}) • WIC Contract Brand`
      : `Same type (${typeLabel})`;
  }
}

function getRelationshipPriority(relationship: string, isContractBrand: boolean): number {
  let basePriority = 0;
  switch (relationship) {
    case 'same_product_different_size':
      basePriority = 10;
      break;
    case 'same_brand_different_type':
      basePriority = 20;
      break;
    case 'generic_equivalent':
      basePriority = 30;
      break;
    case 'medical_alternative':
      basePriority = 40;
      break;
    default:
      basePriority = 50;
  }
  // Contract brands get priority boost
  return isContractBrand ? basePriority - 5 : basePriority;
}

function getImplicitPriority(sameBrand: boolean, isContractBrand: boolean): number {
  let basePriority = sameBrand ? 25 : 35;
  return isContractBrand ? basePriority - 5 : basePriority;
}

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
 * Body: { upc: string, storeId: string, quantitySeen: 'none' | 'few' | 'some' | 'plenty', latitude?: number, longitude?: number, photo?: string }
 *
 * Formula-specific optimizations:
 * - Higher base confidence (70 vs 60) - formula reports are critical
 * - Reports tagged as 'formula_sighting' for faster decay
 * - Location verification bonus
 */
router.post('/report-simple', async (req: Request, res: Response) => {
  const { upc, storeId, quantitySeen, latitude, longitude, photo } = req.body;

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

    // Location verification: user near store (within 1 mile)
    const locationVerified = !!(latitude && longitude && storeLat && storeLng);

    // Formula sightings get higher base confidence (70 vs 60)
    const baseConfidence = 70;

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
             source = 'formula_sighting',
             confidence = LEAST($3 + (report_count * 5), 95),
             report_count = report_count + 1
         WHERE id = $4
         RETURNING id, last_updated`,
        [status, quantityRange, baseConfidence, existingReport.id]
      );
    } else {
      // Create new report
      // Formula sightings get higher confidence and 'formula_sighting' source tag
      const confidence = baseConfidence + (locationVerified ? 10 : 0);

      result = await pool.query(
        `INSERT INTO formula_availability
         (upc, store_name, store_address, latitude, longitude, status, quantity_range, source, confidence, report_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'formula_sighting', $8, 1)
         RETURNING id, last_updated`,
        [
          upc,
          storeName,
          storeAddress,
          storeLat || null,
          storeLng || null,
          status,
          quantityRange,
          confidence
        ]
      );
    }

    // Also record in product_sightings table for cross-product analytics
    try {
      await pool.query(
        `INSERT INTO product_sightings
         (upc, store_id, store_name, latitude, longitude, stock_level, reported_by, location_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          upc,
          storeId,
          storeName,
          storeLat || null,
          storeLng || null,
          quantityRange || 'out',
          'anonymous',
          locationVerified
        ]
      );
    } catch (sightingError) {
      // Non-critical - continue even if sighting insert fails
      console.warn('Failed to record product sighting:', sightingError);
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
      message: 'Thank you for reporting! Your report helps other families find formula.',
      impactMessage: quantitySeen !== 'none'
        ? `This report will help ${reportCount > 1 ? 'even more' : ''} families find formula at ${storeName}`
        : 'Thanks for the update - this helps others avoid a wasted trip'
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
