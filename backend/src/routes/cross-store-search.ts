import express, { Request, Response } from 'express';
import pool from '../config/database';
import { krogerIntegration } from '../services/KrogerIntegration';

const router = express.Router();

/**
 * POST /api/v1/cross-store-search
 * 
 * Cross-store formula search - find which stores have a formula in stock.
 * Supports searching by UPC, brand, formula type, or product name.
 * Returns stores sorted by availability (in stock first) then distance.
 * 
 * Body: {
 *   lat: number (required) - User's latitude
 *   lng: number (required) - User's longitude
 *   radiusMiles?: number (default 25) - Search radius
 *   
 *   // Search criteria (at least one required):
 *   upc?: string - Specific formula UPC
 *   upcs?: string[] - Multiple UPCs to search for
 *   brand?: string - Formula brand (e.g., "Similac", "Enfamil")
 *   formulaType?: string - Type (standard, sensitive, gentle, etc.)
 *   searchQuery?: string - Free-text search on brand + product name
 *   
 *   // Filters:
 *   inStockOnly?: boolean (default false) - Only show stores with recent in-stock reports
 *   maxAgeHours?: number (default 72) - Max age of crowdsourced reports to include
 *   wicAuthorizedOnly?: boolean (default false) - Only WIC-authorized stores
 * }
 * 
 * Returns: {
 *   success: boolean
 *   searchCriteria: { ... }
 *   matchedFormulas: WicFormula[] - Formulas matching search criteria
 *   stores: CrossStoreResult[] - Stores with availability info
 *   count: number
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  const {
    lat,
    lng,
    radiusMiles = 25,
    upc,
    upcs,
    brand,
    formulaType,
    searchQuery,
    inStockOnly = false,
    maxAgeHours = 72,
    wicAuthorizedOnly = false
  } = req.body;

  // Validate required fields
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({
      success: false,
      error: 'lat and lng are required'
    });
  }

  // Need at least one search criterion
  if (!upc && !upcs?.length && !brand && !formulaType && !searchQuery) {
    return res.status(400).json({
      success: false,
      error: 'At least one search criterion is required: upc, upcs, brand, formulaType, or searchQuery'
    });
  }

  try {
    // Step 1: Find matching formulas based on search criteria
    let formulaQuery = `
      SELECT DISTINCT
        upc,
        brand,
        product_name,
        formula_type,
        form,
        size,
        size_oz
      FROM wic_formulas
      WHERE active = true
    `;
    const formulaParams: any[] = [];
    let paramIndex = 1;

    // Build formula search query
    if (upc) {
      formulaQuery += ` AND upc = $${paramIndex}`;
      formulaParams.push(upc);
      paramIndex++;
    } else if (upcs?.length) {
      formulaQuery += ` AND upc = ANY($${paramIndex})`;
      formulaParams.push(upcs);
      paramIndex++;
    } else {
      // Search by brand, type, or query
      const conditions: string[] = [];
      
      if (brand) {
        conditions.push(`LOWER(brand) LIKE LOWER($${paramIndex})`);
        formulaParams.push(`%${brand}%`);
        paramIndex++;
      }
      
      if (formulaType) {
        conditions.push(`formula_type = $${paramIndex}`);
        formulaParams.push(formulaType);
        paramIndex++;
      }
      
      if (searchQuery) {
        conditions.push(`(
          LOWER(brand) LIKE LOWER($${paramIndex}) OR
          LOWER(product_name) LIKE LOWER($${paramIndex})
        )`);
        formulaParams.push(`%${searchQuery}%`);
        paramIndex++;
      }
      
      if (conditions.length > 0) {
        formulaQuery += ` AND (${conditions.join(' AND ')})`;
      }
    }
    
    formulaQuery += ' ORDER BY brand, product_name LIMIT 50';
    
    const formulaResult = await pool.query(formulaQuery, formulaParams);
    const matchedFormulas = formulaResult.rows;
    
    if (matchedFormulas.length === 0) {
      return res.json({
        success: true,
        searchCriteria: { upc, upcs, brand, formulaType, searchQuery, radiusMiles },
        matchedFormulas: [],
        stores: [],
        count: 0,
        message: 'No formulas found matching your search criteria'
      });
    }

    // Collect all UPCs from matched formulas
    const searchUpcs = matchedFormulas.map((f: any) => f.upc);

    // Step 2: Get nearby stores
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
        ${wicAuthorizedOnly ? 'AND wic_authorized = TRUE' : ''}
        AND 3959 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        ) <= $3
      ORDER BY distance_miles ASC
      LIMIT 100`,
      [lat, lng, radiusMiles]
    );

    // Step 3: Get crowdsourced availability for these formulas
    const maxAgeInterval = `${maxAgeHours} hours`;
    const availabilityResult = await pool.query(
      `SELECT
        upc,
        store_name,
        store_address,
        latitude,
        longitude,
        status,
        quantity_range,
        last_updated,
        confidence,
        report_count,
        source
      FROM formula_availability
      WHERE upc = ANY($1)
        AND last_updated >= NOW() - INTERVAL '${maxAgeInterval}'
      ORDER BY last_updated DESC`,
      [searchUpcs]
    );

    // Build a map of store availability keyed by store name (fuzzy matching)
    const availabilityByStore = new Map<string, any[]>();
    
    for (const row of availabilityResult.rows) {
      const key = row.store_name.toLowerCase().trim();
      if (!availabilityByStore.has(key)) {
        availabilityByStore.set(key, []);
      }
      availabilityByStore.get(key)!.push({
        upc: row.upc,
        status: row.status,
        quantityRange: row.quantity_range,
        lastUpdated: row.last_updated,
        confidence: row.confidence,
        reportCount: row.report_count,
        source: row.source,
        latitude: row.latitude,
        longitude: row.longitude
      });
    }

    // Step 3.5: Enrich Kroger-family stores with live API data
    if (krogerIntegration) {
      const krogerChains = ['kroger', 'harris-teeter', 'fred-meyer', 'qfc'];
      const krogerStores = storesResult.rows.filter(
        (s: any) => krogerChains.includes(s.chain?.toLowerCase())
      );

      if (krogerStores.length > 0) {
        // Limit to first 10 Kroger stores to stay within rate limits
        const storesToEnrich = krogerStores.slice(0, 10);

        for (const store of storesToEnrich) {
          const krogerLocationId = store.store_id.replace(/^kroger-/, '');

          for (const formulaUpc of searchUpcs.slice(0, 5)) {
            try {
              const apiResult = await krogerIntegration.checkFormulaAvailability(
                formulaUpc, krogerLocationId, store.store_id
              );

              if (apiResult && apiResult.status !== 'unknown') {
                // Add/merge API data into the availability map
                const storeNameKey = store.name.toLowerCase().trim();
                if (!availabilityByStore.has(storeNameKey)) {
                  availabilityByStore.set(storeNameKey, []);
                }
                availabilityByStore.get(storeNameKey)!.push({
                  upc: formulaUpc,
                  status: apiResult.status,
                  quantityRange: apiResult.quantityRange,
                  lastUpdated: new Date(),
                  confidence: apiResult.confidence,
                  reportCount: 1,
                  source: 'api',
                  latitude: store.latitude,
                  longitude: store.longitude,
                });
              }
            } catch {
              // Silently skip — graceful degradation
            }
          }
        }
      }
    }

    // Step 4: Get retailer likelihood data
    const targetFormulaType = formulaType || matchedFormulas[0]?.formula_type || 'standard';
    const likelihoodResult = await pool.query(
      `SELECT chain, likelihood, notes
       FROM formula_retailer_availability
       WHERE formula_type = $1`,
      [targetFormulaType]
    );

    const likelihoodMap: Record<string, { likelihood: string; notes: string }> = {};
    for (const row of likelihoodResult.rows) {
      likelihoodMap[row.chain.toLowerCase()] = {
        likelihood: row.likelihood,
        notes: row.notes
      };
    }

    // Step 5: Combine all data
    const results = storesResult.rows.map((store: any) => {
      // Find availability data for this store (fuzzy match by name)
      const storeNameKey = store.name.toLowerCase().trim();
      let storeAvailability = availabilityByStore.get(storeNameKey);
      
      // Also try matching by partial name if exact match fails
      if (!storeAvailability) {
        for (const [key, value] of availabilityByStore) {
          if (storeNameKey.includes(key) || key.includes(storeNameKey)) {
            storeAvailability = value;
            break;
          }
        }
      }

      // Aggregate availability across all matched UPCs for this store
      let bestStatus: string | null = null;
      let mostRecentReport: any = null;
      let totalReports = 0;
      const formulasInStock: string[] = [];

      if (storeAvailability) {
        for (const avail of storeAvailability) {
          totalReports += avail.reportCount;
          
          // Track most recent report
          if (!mostRecentReport || new Date(avail.lastUpdated) > new Date(mostRecentReport.lastUpdated)) {
            mostRecentReport = avail;
          }

          // Track best status (in_stock > low_stock > out_of_stock)
          if (avail.status === 'in_stock') {
            bestStatus = 'in_stock';
            formulasInStock.push(avail.upc);
          } else if (avail.status === 'low_stock' && bestStatus !== 'in_stock') {
            bestStatus = 'low_stock';
          } else if (!bestStatus) {
            bestStatus = avail.status;
          }
        }
      }

      // Get likelihood for this store's chain
      const likelihood = likelihoodMap[store.chain.toLowerCase()];

      // Calculate a composite score for sorting
      let score = 0;

      // Crowdsourced data is most valuable
      if (bestStatus === 'in_stock') score += 100;
      else if (bestStatus === 'low_stock') score += 50;
      else if (bestStatus === 'out_of_stock') score -= 50;

      // Likelihood data adds value when no crowdsourced data
      if (!bestStatus && likelihood) {
        if (likelihood.likelihood === 'always') score += 30;
        else if (likelihood.likelihood === 'usually') score += 20;
        else if (likelihood.likelihood === 'sometimes') score += 10;
      }

      // Prefer closer stores
      score -= parseFloat(store.distance_miles) * 2;

      // WIC authorized bonus
      if (store.wic_authorized) score += 5;

      // Recency bonus (reports within last 24h get a boost)
      if (mostRecentReport) {
        const hoursSinceReport = (Date.now() - new Date(mostRecentReport.lastUpdated).getTime()) / (1000 * 60 * 60);
        if (hoursSinceReport < 6) score += 20;
        else if (hoursSinceReport < 12) score += 15;
        else if (hoursSinceReport < 24) score += 10;
      }

      return {
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
        
        // Availability info
        availability: mostRecentReport ? {
          status: bestStatus,
          quantityRange: mostRecentReport.quantityRange,
          lastReportedAt: mostRecentReport.lastUpdated,
          lastReportedAgo: formatTimeAgo(mostRecentReport.lastUpdated),
          confidence: mostRecentReport.confidence,
          totalReports: totalReports,
          formulasInStock: formulasInStock
        } : null,
        
        // Likelihood info (when no crowdsourced data)
        likelihood: likelihood ? {
          level: likelihood.likelihood,
          notes: likelihood.notes
        } : null,
        
        // Sorting score (internal use)
        score
      };
    });

    // Filter if inStockOnly is true
    let filteredResults = results;
    if (inStockOnly) {
      filteredResults = results.filter((r: any) => 
        r.availability?.status === 'in_stock' || r.availability?.status === 'low_stock'
      );
    }

    // Sort by score (highest first)
    filteredResults.sort((a: any, b: any) => b.score - a.score);

    res.json({
      success: true,
      searchCriteria: {
        upc,
        upcs,
        brand,
        formulaType,
        searchQuery,
        radiusMiles,
        inStockOnly,
        maxAgeHours,
        wicAuthorizedOnly
      },
      matchedFormulas: matchedFormulas.map((f: any) => ({
        upc: f.upc,
        brand: f.brand,
        productName: f.product_name,
        formulaType: f.formula_type,
        form: f.form,
        size: f.size,
        sizeOz: f.size_oz
      })),
      stores: filteredResults,
      count: filteredResults.length
    });

  } catch (error) {
    console.error('Cross-store search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform cross-store search'
    });
  }
});

/**
 * GET /api/v1/cross-store-search/quick/:upc
 * 
 * Quick search for a specific UPC - simplified endpoint
 * Returns stores sorted by availability and distance
 */
router.get('/quick/:upc', async (req: Request, res: Response) => {
  const { upc } = req.params;
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radiusMiles = parseInt(req.query.radius as string) || 25;

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      error: 'lat and lng query parameters are required'
    });
  }

  try {
    // Get the formula details
    const formulaResult = await pool.query(
      `SELECT upc, brand, product_name, formula_type, form, size
       FROM wic_formulas WHERE upc = $1 AND active = true`,
      [upc]
    );

    if (formulaResult.rows.length === 0) {
      return res.json({
        success: true,
        formula: null,
        stores: [],
        count: 0,
        message: 'Formula not found in database'
      });
    }

    const formula = formulaResult.rows[0];

    // Get availability reports within radius
    const availabilityResult = await pool.query(
      `SELECT
        fa.store_name,
        fa.store_address,
        fa.latitude,
        fa.longitude,
        fa.status,
        fa.quantity_range,
        fa.last_updated,
        fa.confidence,
        fa.report_count,
        CASE
          WHEN fa.latitude IS NOT NULL AND fa.longitude IS NOT NULL THEN
            3959 * acos(
              cos(radians($2)) * cos(radians(fa.latitude)) *
              cos(radians(fa.longitude) - radians($3)) +
              sin(radians($2)) * sin(radians(fa.latitude))
            )
          ELSE NULL
        END as distance_miles
      FROM formula_availability fa
      WHERE fa.upc = $1
        AND fa.last_updated >= NOW() - INTERVAL '72 hours'
        AND (
          fa.latitude IS NULL OR fa.longitude IS NULL OR
          3959 * acos(
            cos(radians($2)) * cos(radians(fa.latitude)) *
            cos(radians(fa.longitude) - radians($3)) +
            sin(radians($2)) * sin(radians(fa.latitude))
          ) <= $4
        )
      ORDER BY
        CASE fa.status
          WHEN 'in_stock' THEN 1
          WHEN 'low_stock' THEN 2
          WHEN 'out_of_stock' THEN 3
        END,
        distance_miles NULLS LAST,
        fa.last_updated DESC
      LIMIT 50`,
      [upc, lat, lng, radiusMiles]
    );

    const stores = availabilityResult.rows.map(row => ({
      storeName: row.store_name,
      storeAddress: row.store_address,
      location: row.latitude && row.longitude ? {
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude)
      } : null,
      distanceMiles: row.distance_miles ? Math.round(row.distance_miles * 10) / 10 : null,
      status: row.status,
      quantityRange: row.quantity_range,
      lastReportedAt: row.last_updated,
      lastReportedAgo: formatTimeAgo(row.last_updated),
      confidence: row.confidence,
      reportCount: row.report_count
    }));

    res.json({
      success: true,
      formula: {
        upc: formula.upc,
        brand: formula.brand,
        productName: formula.product_name,
        formulaType: formula.formula_type,
        form: formula.form,
        size: formula.size
      },
      stores,
      count: stores.length
    });

  } catch (error) {
    console.error('Quick cross-store search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform search'
    });
  }
});

/**
 * GET /api/v1/cross-store-search/brands
 * 
 * Get available formula brands for search autocomplete
 */
router.get('/brands', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT brand, COUNT(*) as formula_count
       FROM wic_formulas
       WHERE active = true
       GROUP BY brand
       ORDER BY brand`
    );

    res.json({
      success: true,
      brands: result.rows.map(r => ({
        name: r.brand,
        formulaCount: parseInt(r.formula_count)
      }))
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch brands'
    });
  }
});

// Helper function to format time ago
function formatTimeAgo(timestamp: string | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
}

export default router;
