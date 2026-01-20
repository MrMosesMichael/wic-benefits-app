/**
 * Inventory Routes
 * Backend API endpoints for product inventory management
 */

import express, { Request, Response, Router } from 'express';
import pool from '../config/database';

const router: Router = express.Router();

/**
 * GET /api/v1/inventory/store/:storeId/product/:upc
 * Get inventory for a specific product at a store
 */
router.get('/store/:storeId/product/:upc', async (req: Request, res: Response) => {
  try {
    const { storeId, upc } = req.params;

    const query = `
      SELECT
        inventory_id,
        store_id,
        upc,
        status,
        quantity,
        quantity_range,
        aisle,
        last_updated,
        data_source,
        confidence,
        report_count
      FROM inventory
      WHERE store_id = $1 AND upc = $2
      ORDER BY last_updated DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [storeId, upc]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Inventory not found',
        message: `No inventory data for UPC ${upc} at store ${storeId}`,
      });
    }

    const inventory = result.rows[0];

    res.json({
      storeId: inventory.store_id,
      upc: inventory.upc,
      status: inventory.status,
      quantity: inventory.quantity,
      quantityRange: inventory.quantity_range,
      aisle: inventory.aisle,
      lastUpdated: inventory.last_updated,
      source: inventory.data_source,
      confidence: inventory.confidence,
      reportCount: inventory.report_count,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch inventory data',
    });
  }
});

/**
 * GET /api/v1/inventory/store/:storeId
 * Get all inventory for a store (optionally filter by UPCs)
 */
router.get('/store/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { upcs, category, status } = req.query;

    let query = `
      SELECT
        inventory_id,
        store_id,
        upc,
        status,
        quantity,
        quantity_range,
        aisle,
        last_updated,
        data_source,
        confidence,
        report_count
      FROM inventory
      WHERE store_id = $1
    `;

    const params: any[] = [storeId];
    let paramIndex = 2;

    // Filter by UPCs if provided
    if (upcs && typeof upcs === 'string') {
      const upcList = upcs.split(',').map(u => u.trim());
      query += ` AND upc = ANY($${paramIndex})`;
      params.push(upcList);
      paramIndex++;
    }

    // Filter by status if provided
    if (status && typeof status === 'string') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY last_updated DESC`;

    const result = await pool.query(query, params);

    const inventories = result.rows.map(row => ({
      storeId: row.store_id,
      upc: row.upc,
      status: row.status,
      quantity: row.quantity,
      quantityRange: row.quantity_range,
      aisle: row.aisle,
      lastUpdated: row.last_updated,
      source: row.data_source,
      confidence: row.confidence,
      reportCount: row.report_count,
    }));

    res.json({
      storeId,
      count: inventories.length,
      inventories,
    });
  } catch (error) {
    console.error('Error fetching store inventory:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch store inventory data',
    });
  }
});

/**
 * POST /api/v1/inventory/batch
 * Get inventory for multiple products across multiple stores
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { upcs, storeIds } = req.body;

    if (!upcs || !Array.isArray(upcs) || upcs.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'upcs array is required',
      });
    }

    if (!storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'storeIds array is required',
      });
    }

    const query = `
      SELECT
        inventory_id,
        store_id,
        upc,
        status,
        quantity,
        quantity_range,
        aisle,
        last_updated,
        data_source,
        confidence,
        report_count
      FROM inventory
      WHERE upc = ANY($1) AND store_id = ANY($2)
      ORDER BY last_updated DESC
    `;

    const result = await pool.query(query, [upcs, storeIds]);

    const inventories = result.rows.map(row => ({
      storeId: row.store_id,
      upc: row.upc,
      status: row.status,
      quantity: row.quantity,
      quantityRange: row.quantity_range,
      aisle: row.aisle,
      lastUpdated: row.last_updated,
      source: row.data_source,
      confidence: row.confidence,
      reportCount: row.report_count,
    }));

    res.json({
      count: inventories.length,
      inventories,
    });
  } catch (error) {
    console.error('Error fetching batch inventory:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch batch inventory data',
    });
  }
});

/**
 * POST /api/v1/inventory/report
 * Crowdsourced inventory report from users
 */
router.post('/report', async (req: Request, res: Response) => {
  try {
    const {
      storeId,
      upc,
      status,
      quantityRange,
      aisle,
      userId,
    } = req.body;

    // Validate required fields
    if (!storeId || !upc || !status) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'storeId, upc, and status are required',
      });
    }

    // Validate status
    const validStatuses = ['in_stock', 'low_stock', 'out_of_stock', 'unknown'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Check if inventory entry exists
    const checkQuery = `
      SELECT inventory_id, report_count
      FROM inventory
      WHERE store_id = $1 AND upc = $2
      ORDER BY last_updated DESC
      LIMIT 1
    `;

    const checkResult = await pool.query(checkQuery, [storeId, upc]);

    if (checkResult.rows.length > 0) {
      // Update existing entry
      const existingInventory = checkResult.rows[0];
      const newReportCount = (existingInventory.report_count || 0) + 1;

      const updateQuery = `
        UPDATE inventory
        SET
          status = $1,
          quantity_range = COALESCE($2, quantity_range),
          aisle = COALESCE($3, aisle),
          last_updated = NOW(),
          data_source = 'crowdsourced',
          confidence = LEAST(confidence + 5, 95),
          report_count = $4
        WHERE inventory_id = $5
        RETURNING
          inventory_id,
          store_id,
          upc,
          status,
          quantity,
          quantity_range,
          aisle,
          last_updated,
          data_source,
          confidence,
          report_count
      `;

      const updateResult = await pool.query(updateQuery, [
        status,
        quantityRange,
        aisle,
        newReportCount,
        existingInventory.inventory_id,
      ]);

      const inventory = updateResult.rows[0];

      res.json({
        message: 'Inventory report updated',
        inventory: {
          storeId: inventory.store_id,
          upc: inventory.upc,
          status: inventory.status,
          quantity: inventory.quantity,
          quantityRange: inventory.quantity_range,
          aisle: inventory.aisle,
          lastUpdated: inventory.last_updated,
          source: inventory.data_source,
          confidence: inventory.confidence,
          reportCount: inventory.report_count,
        },
      });
    } else {
      // Create new entry
      const insertQuery = `
        INSERT INTO inventory (
          store_id,
          upc,
          status,
          quantity_range,
          aisle,
          last_updated,
          data_source,
          confidence,
          report_count
        ) VALUES ($1, $2, $3, $4, $5, NOW(), 'crowdsourced', 60, 1)
        RETURNING
          inventory_id,
          store_id,
          upc,
          status,
          quantity,
          quantity_range,
          aisle,
          last_updated,
          data_source,
          confidence,
          report_count
      `;

      const insertResult = await pool.query(insertQuery, [
        storeId,
        upc,
        status,
        quantityRange,
        aisle,
      ]);

      const inventory = insertResult.rows[0];

      res.status(201).json({
        message: 'Inventory report created',
        inventory: {
          storeId: inventory.store_id,
          upc: inventory.upc,
          status: inventory.status,
          quantity: inventory.quantity,
          quantityRange: inventory.quantity_range,
          aisle: inventory.aisle,
          lastUpdated: inventory.last_updated,
          source: inventory.data_source,
          confidence: inventory.confidence,
          reportCount: inventory.report_count,
        },
      });
    }

    // Log the report for analytics (optional)
    if (userId) {
      await pool.query(
        `INSERT INTO inventory_reports_log (user_id, store_id, upc, status, reported_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, storeId, upc, status]
      ).catch(err => {
        // Non-critical - just log the error
        console.warn('Failed to log inventory report:', err);
      });
    }
  } catch (error) {
    console.error('Error processing inventory report:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process inventory report',
    });
  }
});

/**
 * POST /api/v1/inventory/sync
 * Internal endpoint to sync inventory data from external APIs
 * (Used by backend sync jobs)
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { inventories } = req.body;

    if (!inventories || !Array.isArray(inventories)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'inventories array is required',
      });
    }

    const syncedCount = { created: 0, updated: 0, failed: 0 };

    for (const inv of inventories) {
      try {
        const {
          storeId,
          upc,
          status,
          quantity,
          quantityRange,
          aisle,
          source,
          confidence,
        } = inv;

        // Check if entry exists
        const checkQuery = `
          SELECT inventory_id
          FROM inventory
          WHERE store_id = $1 AND upc = $2
          ORDER BY last_updated DESC
          LIMIT 1
        `;

        const checkResult = await pool.query(checkQuery, [storeId, upc]);

        if (checkResult.rows.length > 0) {
          // Update existing
          await pool.query(
            `UPDATE inventory
             SET status = $1, quantity = $2, quantity_range = $3, aisle = $4,
                 last_updated = NOW(), data_source = $5, confidence = $6
             WHERE inventory_id = $7`,
            [
              status,
              quantity,
              quantityRange,
              aisle,
              source,
              confidence,
              checkResult.rows[0].inventory_id,
            ]
          );
          syncedCount.updated++;
        } else {
          // Insert new
          await pool.query(
            `INSERT INTO inventory (store_id, upc, status, quantity, quantity_range, aisle, last_updated, data_source, confidence)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)`,
            [storeId, upc, status, quantity, quantityRange, aisle, source, confidence]
          );
          syncedCount.created++;
        }
      } catch (error) {
        console.error('Error syncing individual inventory:', error);
        syncedCount.failed++;
      }
    }

    res.json({
      message: 'Inventory sync completed',
      syncedCount,
    });
  } catch (error) {
    console.error('Error syncing inventory:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to sync inventory data',
    });
  }
});

/**
 * GET /api/v1/inventory/stats/:storeId
 * Get inventory statistics for a store
 */
router.get('/stats/:storeId', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;

    const query = `
      SELECT
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE status = 'in_stock') as in_stock,
        COUNT(*) FILTER (WHERE status = 'low_stock') as low_stock,
        COUNT(*) FILTER (WHERE status = 'out_of_stock') as out_of_stock,
        COUNT(*) FILTER (WHERE status = 'unknown') as unknown,
        AVG(confidence) as avg_confidence,
        MAX(last_updated) as latest_update,
        MIN(last_updated) as oldest_update
      FROM inventory
      WHERE store_id = $1
    `;

    const result = await pool.query(query, [storeId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Store not found',
        message: `No inventory data for store ${storeId}`,
      });
    }

    const stats = result.rows[0];

    res.json({
      storeId,
      totalProducts: parseInt(stats.total_products),
      inStock: parseInt(stats.in_stock),
      lowStock: parseInt(stats.low_stock),
      outOfStock: parseInt(stats.out_of_stock),
      unknown: parseInt(stats.unknown),
      averageConfidence: parseFloat(stats.avg_confidence || 0).toFixed(2),
      latestUpdate: stats.latest_update,
      oldestUpdate: stats.oldest_update,
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch inventory statistics',
    });
  }
});

/**
 * DELETE /api/v1/inventory/store/:storeId/product/:upc
 * Delete inventory entry (admin only)
 */
router.delete('/store/:storeId/product/:upc', async (req: Request, res: Response) => {
  try {
    const { storeId, upc } = req.params;

    const query = `
      DELETE FROM inventory
      WHERE store_id = $1 AND upc = $2
      RETURNING inventory_id
    `;

    const result = await pool.query(query, [storeId, upc]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Inventory not found',
        message: `No inventory data found for UPC ${upc} at store ${storeId}`,
      });
    }

    res.json({
      message: 'Inventory entry deleted',
      inventoryId: result.rows[0].inventory_id,
    });
  } catch (error) {
    console.error('Error deleting inventory:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete inventory entry',
    });
  }
});

export default router;
