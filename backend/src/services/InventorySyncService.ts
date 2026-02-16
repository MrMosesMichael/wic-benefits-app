/**
 * Inventory Sync Service
 * Backend service for syncing inventory data from external APIs to database
 */

import pool from '../config/database';

interface InventoryData {
  storeId: string;
  upc: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
  quantity?: number;
  quantityRange?: 'few' | 'some' | 'plenty';
  aisle?: string;
  source: 'api' | 'scrape' | 'crowdsourced' | 'manual';
  confidence: number;
}

interface SyncJobResult {
  jobId: number;
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

export class InventorySyncService {
  /**
   * Create a new sync job
   */
  async createSyncJob(
    retailer: string,
    storeIds: string[],
    upcs?: string[]
  ): Promise<number> {
    const query = `
      INSERT INTO inventory_sync_jobs (retailer, store_ids, upcs, status, created_at)
      VALUES ($1, $2, $3, 'pending', NOW())
      RETURNING job_id
    `;

    const result = await pool.query(query, [retailer, storeIds, upcs || null]);
    return result.rows[0].job_id;
  }

  /**
   * Start a sync job
   */
  async startSyncJob(jobId: number): Promise<void> {
    await pool.query(
      `UPDATE inventory_sync_jobs
       SET status = 'running', started_at = NOW()
       WHERE job_id = $1`,
      [jobId]
    );
  }

  /**
   * Complete a sync job
   */
  async completeSyncJob(
    jobId: number,
    processed: number,
    succeeded: number,
    failed: number,
    errorMessage?: string
  ): Promise<void> {
    const status = failed > 0 && succeeded === 0 ? 'failed' : 'completed';

    await pool.query(
      `UPDATE inventory_sync_jobs
       SET status = $1,
           completed_at = NOW(),
           items_processed = $2,
           items_succeeded = $3,
           items_failed = $4,
           error_message = $5
       WHERE job_id = $6`,
      [status, processed, succeeded, failed, errorMessage, jobId]
    );
  }

  /**
   * Sync a batch of inventory data to database
   */
  async syncInventoryBatch(inventories: InventoryData[], retailer: string = 'walmart'): Promise<SyncJobResult> {
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    const jobId = await this.createSyncJob(retailer, ['batch'], []);
    await this.startSyncJob(jobId);

    for (const inv of inventories) {
      processed++;

      try {
        await this.upsertInventory(inv);
        succeeded++;
      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${inv.storeId}:${inv.upc} - ${errorMsg}`);
        console.error(`Failed to sync inventory for ${inv.storeId}:${inv.upc}:`, error);
      }
    }

    await this.completeSyncJob(
      jobId,
      processed,
      succeeded,
      failed,
      errors.length > 0 ? errors.join('; ') : undefined
    );

    return {
      jobId,
      processed,
      succeeded,
      failed,
      errors,
    };
  }

  /**
   * Upsert a single inventory record
   */
  async upsertInventory(inventory: InventoryData): Promise<void> {
    const {
      storeId,
      upc,
      status,
      quantity,
      quantityRange,
      aisle,
      source,
      confidence,
    } = inventory;

    // Check if entry exists
    const checkQuery = `
      SELECT inventory_id, confidence, report_count
      FROM inventory
      WHERE store_id = $1 AND upc = $2
    `;

    const checkResult = await pool.query(checkQuery, [storeId, upc]);

    if (checkResult.rows.length > 0) {
      // Update existing entry
      const existing = checkResult.rows[0];

      // For crowdsourced data, blend with existing confidence
      let finalConfidence = confidence;
      if (source === 'crowdsourced' && existing.confidence) {
        // Average the confidences, weighted by report count
        const reportCount = existing.report_count || 1;
        finalConfidence = Math.min(
          Math.round((existing.confidence * reportCount + confidence) / (reportCount + 1)),
          95
        );
      }

      await pool.query(
        `UPDATE inventory
         SET status = $1,
             quantity = $2,
             quantity_range = $3,
             aisle = COALESCE($4, aisle),
             last_updated = NOW(),
             data_source = $5,
             confidence = $6
         WHERE inventory_id = $7`,
        [status, quantity, quantityRange, aisle, source, finalConfidence, existing.inventory_id]
      );
    } else {
      // Insert new entry
      await pool.query(
        `INSERT INTO inventory (
           store_id, upc, status, quantity, quantity_range, aisle,
           last_updated, data_source, confidence, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, NOW())`,
        [storeId, upc, status, quantity, quantityRange, aisle, source, confidence]
      );
    }
  }

  /**
   * Get inventory for a product at a store
   */
  async getInventory(storeId: string, upc: string): Promise<InventoryData | null> {
    const query = `
      SELECT
        store_id,
        upc,
        status,
        quantity,
        quantity_range,
        aisle,
        data_source,
        confidence
      FROM inventory
      WHERE store_id = $1 AND upc = $2
      ORDER BY last_updated DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [storeId, upc]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      storeId: row.store_id,
      upc: row.upc,
      status: row.status,
      quantity: row.quantity,
      quantityRange: row.quantity_range,
      aisle: row.aisle,
      source: row.data_source,
      confidence: row.confidence,
    };
  }

  /**
   * Clean up stale inventory data
   */
  async cleanupStaleInventory(olderThanHours: number = 24): Promise<number> {
    const query = `
      DELETE FROM inventory
      WHERE last_updated < NOW() - INTERVAL '${olderThanHours} hours'
      AND data_source = 'crowdsourced'
      RETURNING inventory_id
    `;

    const result = await pool.query(query);
    return result.rows.length;
  }

  /**
   * Get sync job statistics
   */
  async getSyncJobStats(retailer?: string, days: number = 7): Promise<any> {
    let query = `
      SELECT
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        SUM(items_processed) as total_items,
        SUM(items_succeeded) as total_succeeded,
        SUM(items_failed) as total_failed,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
      FROM inventory_sync_jobs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
    `;

    const params: any[] = [];

    if (retailer) {
      query += ` AND retailer = $1`;
      params.push(retailer);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Get recent sync jobs
   */
  async getRecentSyncJobs(limit: number = 10): Promise<any[]> {
    const query = `
      SELECT
        job_id,
        retailer,
        status,
        items_processed,
        items_succeeded,
        items_failed,
        started_at,
        completed_at,
        created_at
      FROM inventory_sync_jobs
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get inventory freshness metrics
   */
  async getInventoryFreshness(): Promise<{
    total: number;
    fresh: number;
    stale: number;
    veryStale: number;
  }> {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE last_updated >= NOW() - INTERVAL '1 hour') as fresh,
        COUNT(*) FILTER (WHERE last_updated < NOW() - INTERVAL '1 hour'
                         AND last_updated >= NOW() - INTERVAL '6 hours') as stale,
        COUNT(*) FILTER (WHERE last_updated < NOW() - INTERVAL '6 hours') as very_stale
      FROM inventory
    `;

    const result = await pool.query(query);
    const row = result.rows[0];

    return {
      total: parseInt(row.total),
      fresh: parseInt(row.fresh),
      stale: parseInt(row.stale),
      veryStale: parseInt(row.very_stale),
    };
  }
}

// Export singleton instance
export const inventorySyncService = new InventorySyncService();
