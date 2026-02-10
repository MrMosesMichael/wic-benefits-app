/**
 * APL Sync Service
 * Automates APL data import with change detection and monitoring
 *
 * Supports multiple data sources:
 * - Excel files (.xlsx)
 * - CSV files (.csv)
 * - PDF files (.pdf) - requires text extraction
 * - HTML scraping (.html)
 */

import pool from '../config/database';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import * as XLSX from 'xlsx';
import * as cheerio from 'cheerio';

// =====================================================
// Types
// =====================================================

interface APLSourceConfig {
  id: number;
  state: string;
  dataSource: string;
  sourceType: string;
  sourceUrl: string;
  fileFormat: string;
  parserConfig: Record<string, any>;
  syncSchedule: string | null;
  syncEnabled: boolean;
  minExpectedProducts: number;
  maxChangeThreshold: number;
}

interface APLProduct {
  upc: string;
  productName: string;
  brand: string | null;
  size: string | null;
  category: string;
  subcategory: string | null;
  restrictions: string | null;
}

interface SyncJobResult {
  jobId: number;
  state: string;
  dataSource: string;
  status: 'completed' | 'failed';
  totalRowsProcessed: number;
  productsAdded: number;
  productsUpdated: number;
  productsRemoved: number;
  productsUnchanged: number;
  validationErrors: number;
  durationMs: number;
  errorMessage?: string;
}

interface ProductChange {
  upc: string;
  changeType: 'added' | 'updated' | 'removed' | 'reactivated';
  changedFields?: Record<string, { old: any; new: any }>;
}

// =====================================================
// APL Sync Service
// =====================================================

export class APLSyncService {
  /**
   * Get source configuration for a state
   */
  async getSourceConfig(state: string, dataSource?: string): Promise<APLSourceConfig | null> {
    const query = `
      SELECT
        id,
        state,
        data_source,
        source_type,
        source_url,
        file_format,
        parser_config,
        sync_schedule,
        sync_enabled,
        min_expected_products,
        max_change_threshold
      FROM apl_source_config
      WHERE state = $1
        AND is_active = true
        ${dataSource ? 'AND data_source = $2' : ''}
      LIMIT 1
    `;

    const params = dataSource ? [state, dataSource] : [state];
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      state: row.state,
      dataSource: row.data_source,
      sourceType: row.source_type,
      sourceUrl: row.source_url,
      fileFormat: row.file_format,
      parserConfig: row.parser_config || {},
      syncSchedule: row.sync_schedule,
      syncEnabled: row.sync_enabled,
      minExpectedProducts: row.min_expected_products,
      maxChangeThreshold: parseFloat(row.max_change_threshold),
    };
  }

  /**
   * Get all active source configurations
   */
  async getAllSourceConfigs(): Promise<APLSourceConfig[]> {
    const query = `
      SELECT
        id,
        state,
        data_source,
        source_type,
        source_url,
        file_format,
        parser_config,
        sync_schedule,
        sync_enabled,
        min_expected_products,
        max_change_threshold
      FROM apl_source_config
      WHERE is_active = true
      ORDER BY state
    `;

    const result = await pool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      state: row.state,
      dataSource: row.data_source,
      sourceType: row.source_type,
      sourceUrl: row.source_url,
      fileFormat: row.file_format,
      parserConfig: row.parser_config || {},
      syncSchedule: row.sync_schedule,
      syncEnabled: row.sync_enabled,
      minExpectedProducts: row.min_expected_products,
      maxChangeThreshold: parseFloat(row.max_change_threshold),
    }));
  }

  /**
   * Create a new sync job
   */
  async createSyncJob(
    state: string,
    dataSource: string,
    triggeredBy: 'scheduler' | 'manual' | 'webhook' = 'manual'
  ): Promise<number> {
    const query = `
      INSERT INTO apl_sync_jobs (state, data_source, status, triggered_by)
      VALUES ($1, $2, 'pending', $3)
      RETURNING id
    `;

    const result = await pool.query(query, [state, dataSource, triggeredBy]);
    return result.rows[0].id;
  }

  /**
   * Start a sync job
   */
  async startSyncJob(jobId: number, sourceUrl: string): Promise<void> {
    await pool.query(
      `UPDATE apl_sync_jobs
       SET status = 'running', started_at = NOW(), source_url = $2
       WHERE id = $1`,
      [jobId, sourceUrl]
    );
  }

  /**
   * Complete a sync job
   */
  async completeSyncJob(
    jobId: number,
    metrics: {
      totalRowsProcessed: number;
      productsAdded: number;
      productsUpdated: number;
      productsRemoved: number;
      productsUnchanged: number;
      validationErrors: number;
      sourceFileHash: string;
    },
    status: 'completed' | 'failed' = 'completed',
    errorMessage?: string,
    errorDetails?: Record<string, any>
  ): Promise<void> {
    await pool.query(
      `UPDATE apl_sync_jobs
       SET status = $2,
           completed_at = NOW(),
           duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
           total_rows_processed = $3,
           products_added = $4,
           products_updated = $5,
           products_removed = $6,
           products_unchanged = $7,
           validation_errors = $8,
           source_file_hash = $9,
           error_message = $10,
           error_details = $11
       WHERE id = $1`,
      [
        jobId,
        status,
        metrics.totalRowsProcessed,
        metrics.productsAdded,
        metrics.productsUpdated,
        metrics.productsRemoved,
        metrics.productsUnchanged,
        metrics.validationErrors,
        metrics.sourceFileHash,
        errorMessage,
        errorDetails ? JSON.stringify(errorDetails) : null,
      ]
    );
  }

  /**
   * Download file from URL and return buffer + hash
   */
  async downloadFile(url: string): Promise<{ buffer: Buffer; hash: string }> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const urlObj = new URL(url);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (url.startsWith('https') ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        timeout: 60000,
        headers: {
          'Host': urlObj.hostname,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/pdf, text/html, */*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'Connection': 'keep-alive',
          'Referer': 'https://www.michigan.gov/mdhhs/assistance-programs/wic/wicvendors/wic-foods',
        },
      };

      const request = protocol.request(options, response => {
        // Handle redirects
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          this.downloadFile(response.headers.location).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const hash = crypto.createHash('sha256').update(buffer).digest('hex');
          resolve({ buffer, hash });
        });
        response.on('error', reject);
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timed out'));
      });

      request.end();
    });
  }

  /**
   * Fetch HTML page content with browser-like headers
   */
  async fetchPage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const urlObj = new URL(url);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (url.startsWith('https') ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        timeout: 30000,
        headers: {
          'Host': urlObj.hostname,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'Connection': 'keep-alive',
        },
      };

      const request = protocol.request(options, response => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          this.fetchPage(response.headers.location).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const chunks: string[] = [];
        response.setEncoding('utf8');
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => resolve(chunks.join('')));
        response.on('error', reject);
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timed out'));
      });

      request.end();
    });
  }

  /**
   * Scrape download link from a page
   * Used when states require dynamic URL extraction
   */
  async scrapeDownloadLink(pageUrl: string, linkPattern: RegExp | string): Promise<string> {
    console.log(`[Scraper] Fetching page: ${pageUrl}`);
    const html = await this.fetchPage(pageUrl);
    const $ = cheerio.load(html);

    let downloadUrl: string | null = null;

    // Find links matching the pattern
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        const matches = typeof linkPattern === 'string'
          ? href.includes(linkPattern)
          : linkPattern.test(href);

        if (matches) {
          // Handle relative URLs
          if (href.startsWith('/')) {
            const urlObj = new URL(pageUrl);
            downloadUrl = `${urlObj.protocol}//${urlObj.host}${href}`;
          } else if (href.startsWith('http')) {
            downloadUrl = href;
          }
          return false; // Break the loop
        }
      }
    });

    if (!downloadUrl) {
      throw new Error(`Could not find download link matching pattern on ${pageUrl}`);
    }

    console.log(`[Scraper] Found download URL: ${downloadUrl}`);
    return downloadUrl;
  }

  /**
   * Get actual download URL for a state (handles scraping if needed)
   */
  async getDownloadUrl(config: APLSourceConfig): Promise<string> {
    // States that require page scraping to get dynamic download links
    const scrapingConfigs: Record<string, { pageUrl: string; linkPattern: RegExp }> = {
      'MI': {
        pageUrl: 'https://www.michigan.gov/mdhhs/assistance-programs/wic/wicvendors/wic-foods',
        linkPattern: /Michigan-WIC-Approved-Products-List\.xlsx/i,
      },
      // Add other states here as needed
    };

    const scrapeConfig = scrapingConfigs[config.state];
    if (scrapeConfig) {
      return this.scrapeDownloadLink(scrapeConfig.pageUrl, scrapeConfig.linkPattern);
    }

    // Default: use configured URL directly
    return config.sourceUrl;
  }

  /**
   * Check if file has changed since last sync
   */
  async hasFileChanged(state: string, dataSource: string, newHash: string): Promise<boolean> {
    const query = `
      SELECT last_file_hash
      FROM apl_sync_status
      WHERE state = $1 AND data_source = $2
    `;

    const result = await pool.query(query, [state, dataSource]);

    if (result.rows.length === 0 || !result.rows[0].last_file_hash) {
      return true; // No previous hash, consider it changed
    }

    return result.rows[0].last_file_hash !== newHash;
  }

  /**
   * Parse Excel APL file
   */
  parseExcelAPL(buffer: Buffer, config: Record<string, any>): APLProduct[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetIndex = config.sheet || 0;
    const sheetName = workbook.SheetNames[sheetIndex];
    const worksheet = workbook.Sheets[sheetName];

    console.log(`[Parser] Sheet names: ${workbook.SheetNames.join(', ')}`);
    console.log(`[Parser] Using sheet: ${sheetName}`);

    // Michigan and similar files have a title row, so we need to find the actual header row
    // Try to detect the header row by looking for UPC column
    let headerRow = config.headerRow || 1;

    // First, read with raw headers to detect structure
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Look for a row containing 'UPC' or 'UPC/PLU' as a header
    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      const row = rawRows[i] as any[];
      if (row && row.some(cell =>
        typeof cell === 'string' &&
        (cell.toUpperCase().includes('UPC') || cell.toUpperCase().includes('PLU'))
      )) {
        headerRow = i + 1; // 1-indexed
        console.log(`[Parser] Detected header row at line ${headerRow}`);
        break;
      }
    }

    // Convert to JSON with proper headers
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
      range: headerRow - 1, // 0-indexed, start from header row
    });

    console.log(`[Parser] Total rows: ${rows.length}`);
    if (rows.length > 0) {
      console.log(`[Parser] Column names: ${Object.keys(rows[0]).join(', ')}`);
      console.log(`[Parser] First row sample:`, JSON.stringify(rows[0]).substring(0, 500));
    }

    const products: APLProduct[] = [];
    const columnMap = config.columns || {};
    let skippedEmpty = 0;
    let skippedUpc = 0;

    for (const row of rows) {
      // Get UPC from configured column or common names
      const upcColumn = columnMap.upc || 'UPC/PLU' || 'UPC' || 'upc';
      let upc = this.findColumnValue(row, upcColumn) || this.findColumnValue(row, ['UPC/PLU', 'UPC', 'upc', 'Upc', 'PLU']);

      if (!upc) {
        skippedEmpty++;
        continue;
      }

      // Normalize UPC - remove spaces, dashes, dots
      upc = upc.toString().replace(/[\s\-\.]/g, '');

      // Pad short UPCs with leading zeros (Excel often strips them)
      // Standard lengths: 8 (UPC-E/EAN-8), 12 (UPC-A), 13 (EAN-13), 14 (GTIN-14)
      if (upc.length > 0 && upc.length < 8) {
        // Likely a UPC-A (12 digits) with leading zeros stripped
        upc = upc.padStart(12, '0');
      } else if (upc.length > 8 && upc.length < 12) {
        // Likely a UPC-A (12 digits) with some leading zeros stripped
        upc = upc.padStart(12, '0');
      } else if (upc.length === 12) {
        // Valid UPC-A, keep as is
      } else if (upc.length === 13) {
        // Valid EAN-13, keep as is
      } else if (upc.length === 14) {
        // Valid GTIN-14, keep as is
      } else if (upc.length === 8) {
        // Valid UPC-E or EAN-8, keep as is
      } else if (upc.length > 14) {
        skippedUpc++;
        continue;
      }

      // Extract other fields
      const productName = this.findColumnValue(row, columnMap.product_name || ['Food Description', 'Product Name', 'Description', 'product_name', 'Name']);
      const brand = this.findColumnValue(row, columnMap.brand || ['Brand Name', 'Brand', 'brand', 'Manufacturer']);
      const size = this.findColumnValue(row, columnMap.size || ['Package Size', 'Size', 'size', 'Container Size']);
      const category = this.findColumnValue(row, columnMap.category || ['Category', 'Cat Desc', 'category', 'Food Category']);
      const subcategory = this.findColumnValue(row, columnMap.subcategory || ['SubCat', 'Subcat Desc', 'Subcategory', 'subcategory', 'Sub Category']);

      products.push({
        upc,
        productName: productName || 'Unknown Product',
        brand: brand || null,
        size: size || null,
        category: category || 'uncategorized',
        subcategory: subcategory || null,
        restrictions: null,
      });
    }

    console.log(`[Parser] Skipped: ${skippedEmpty} empty UPC, ${skippedUpc} invalid UPC length`);
    return products;
  }

  /**
   * Parse CSV APL file
   */
  parseCSVAPL(buffer: Buffer, config: Record<string, any>): APLProduct[] {
    // Use xlsx to parse CSV as well (it handles both)
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    return this.parseExcelAPL(buffer, config);
  }

  /**
   * Helper to find column value by multiple possible names
   */
  private findColumnValue(row: Record<string, any>, columnNames: string | string[]): string | null {
    const names = Array.isArray(columnNames) ? columnNames : [columnNames];

    for (const name of names) {
      if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
        return String(row[name]).trim();
      }
    }

    return null;
  }

  /**
   * Get existing products for a state
   */
  async getExistingProducts(state: string): Promise<Map<string, APLProduct & { id: number }>> {
    const query = `
      SELECT id, upc, product_name, brand, size, category, subcategory, restrictions
      FROM apl_products
      WHERE state = $1 AND active = true
    `;

    const result = await pool.query(query, [state]);
    const products = new Map<string, APLProduct & { id: number }>();

    for (const row of result.rows) {
      products.set(row.upc, {
        id: row.id,
        upc: row.upc,
        productName: row.product_name,
        brand: row.brand,
        size: row.size,
        category: row.category,
        subcategory: row.subcategory,
        restrictions: row.restrictions,
      });
    }

    return products;
  }

  /**
   * Upsert a product and track changes
   */
  async upsertProduct(
    state: string,
    product: APLProduct,
    existingProducts: Map<string, APLProduct & { id: number }>,
    jobId: number
  ): Promise<ProductChange | null> {
    const existing = existingProducts.get(product.upc);

    if (!existing) {
      // New product
      await pool.query(
        `INSERT INTO apl_products (upc, product_name, brand, size, category, subcategory, restrictions, state, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         ON CONFLICT (upc) DO UPDATE SET
           product_name = EXCLUDED.product_name,
           brand = EXCLUDED.brand,
           size = EXCLUDED.size,
           category = EXCLUDED.category,
           subcategory = EXCLUDED.subcategory,
           restrictions = EXCLUDED.restrictions,
           state = EXCLUDED.state,
           active = true,
           updated_at = CURRENT_TIMESTAMP`,
        [product.upc, product.productName, product.brand, product.size, product.category, product.subcategory, product.restrictions, state]
      );

      // Record change
      await this.recordProductChange(jobId, null, product.upc, state, 'added');

      return { upc: product.upc, changeType: 'added' };
    }

    // Check for updates
    const changedFields: Record<string, { old: any; new: any }> = {};

    if (existing.productName !== product.productName) {
      changedFields.productName = { old: existing.productName, new: product.productName };
    }
    if (existing.brand !== product.brand) {
      changedFields.brand = { old: existing.brand, new: product.brand };
    }
    if (existing.size !== product.size) {
      changedFields.size = { old: existing.size, new: product.size };
    }
    if (existing.category !== product.category) {
      changedFields.category = { old: existing.category, new: product.category };
    }
    if (existing.subcategory !== product.subcategory) {
      changedFields.subcategory = { old: existing.subcategory, new: product.subcategory };
    }

    if (Object.keys(changedFields).length > 0) {
      // Update product
      await pool.query(
        `UPDATE apl_products
         SET product_name = $2,
             brand = $3,
             size = $4,
             category = $5,
             subcategory = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [existing.id, product.productName, product.brand, product.size, product.category, product.subcategory]
      );

      // Record change
      await this.recordProductChange(jobId, existing.id, product.upc, state, 'updated', changedFields);

      return { upc: product.upc, changeType: 'updated', changedFields };
    }

    // No changes
    return null;
  }

  /**
   * Mark products as removed (soft delete)
   */
  async markProductsRemoved(
    state: string,
    existingProducts: Map<string, APLProduct & { id: number }>,
    currentUPCs: Set<string>,
    jobId: number
  ): Promise<number> {
    let removedCount = 0;

    for (const [upc, product] of existingProducts) {
      if (!currentUPCs.has(upc)) {
        await pool.query(
          `UPDATE apl_products SET active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [product.id]
        );

        await this.recordProductChange(jobId, product.id, upc, state, 'removed');
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Record a product change
   */
  async recordProductChange(
    syncJobId: number,
    productId: number | null,
    upc: string,
    state: string,
    changeType: 'added' | 'updated' | 'removed' | 'reactivated',
    changedFields?: Record<string, { old: any; new: any }>
  ): Promise<void> {
    await pool.query(
      `INSERT INTO apl_product_changes (sync_job_id, product_id, upc, state, change_type, changed_fields)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [syncJobId, productId, upc, state, changeType, changedFields ? JSON.stringify(changedFields) : null]
    );
  }

  /**
   * Run a full sync for a state
   */
  async syncState(
    state: string,
    dataSource?: string,
    triggeredBy: 'scheduler' | 'manual' | 'webhook' = 'manual',
    forceSync: boolean = false
  ): Promise<SyncJobResult> {
    // Get source config
    const config = await this.getSourceConfig(state, dataSource);
    if (!config) {
      throw new Error(`No active source configuration found for state: ${state}`);
    }

    if (!config.syncEnabled && !forceSync) {
      throw new Error(`Sync is disabled for ${state}. Use forceSync=true to override.`);
    }

    // Create job
    const jobId = await this.createSyncJob(state, config.dataSource, triggeredBy);
    const startTime = Date.now();

    const metrics = {
      totalRowsProcessed: 0,
      productsAdded: 0,
      productsUpdated: 0,
      productsRemoved: 0,
      productsUnchanged: 0,
      validationErrors: 0,
      sourceFileHash: '',
    };

    try {
      // Get actual download URL (may involve page scraping for some states)
      const downloadUrl = await this.getDownloadUrl(config);
      await this.startSyncJob(jobId, downloadUrl);

      // Download file
      console.log(`[${state}] Downloading APL from ${downloadUrl}...`);
      const { buffer, hash } = await this.downloadFile(downloadUrl);
      metrics.sourceFileHash = hash;

      // Check if file changed
      if (!forceSync && !await this.hasFileChanged(state, config.dataSource, hash)) {
        console.log(`[${state}] File unchanged (hash: ${hash.substring(0, 12)}...). Skipping sync.`);
        await this.completeSyncJob(jobId, metrics, 'completed');
        return {
          jobId,
          state,
          dataSource: config.dataSource,
          status: 'completed',
          ...metrics,
          durationMs: Date.now() - startTime,
        };
      }

      console.log(`[${state}] File changed or force sync. Processing...`);

      // Parse file based on format
      let products: APLProduct[];

      switch (config.fileFormat) {
        case 'xlsx':
        case 'xls':
          products = this.parseExcelAPL(buffer, config.parserConfig);
          break;
        case 'csv':
          products = this.parseCSVAPL(buffer, config.parserConfig);
          break;
        case 'pdf':
          // PDF parsing requires additional libraries - placeholder
          throw new Error('PDF parsing not yet implemented. Requires pdf-parse or similar library.');
        case 'html':
          // HTML scraping requires cheerio - placeholder
          throw new Error('HTML scraping not yet implemented. Requires cheerio library.');
        default:
          throw new Error(`Unsupported file format: ${config.fileFormat}`);
      }

      metrics.totalRowsProcessed = products.length;
      console.log(`[${state}] Parsed ${products.length} products`);

      // Validate product count
      if (products.length < config.minExpectedProducts) {
        throw new Error(
          `Parsed ${products.length} products, expected at least ${config.minExpectedProducts}. ` +
          `This may indicate a parsing error or corrupted source file.`
        );
      }

      // Get existing products
      const existingProducts = await this.getExistingProducts(state);
      const currentUPCs = new Set<string>();

      // Process each product
      for (const product of products) {
        currentUPCs.add(product.upc);

        try {
          const change = await this.upsertProduct(state, product, existingProducts, jobId);

          if (change) {
            if (change.changeType === 'added') metrics.productsAdded++;
            else if (change.changeType === 'updated') metrics.productsUpdated++;
          } else {
            metrics.productsUnchanged++;
          }
        } catch (err) {
          metrics.validationErrors++;
          console.error(`[${state}] Error processing UPC ${product.upc}:`, err);
        }
      }

      // Check for removed products
      metrics.productsRemoved = await this.markProductsRemoved(state, existingProducts, currentUPCs, jobId);

      // Check change threshold
      const totalChanges = metrics.productsAdded + metrics.productsUpdated + metrics.productsRemoved;
      const changeRate = totalChanges / (existingProducts.size || 1);

      if (changeRate > config.maxChangeThreshold) {
        console.warn(
          `[${state}] Warning: Change rate ${(changeRate * 100).toFixed(1)}% exceeds threshold ${(config.maxChangeThreshold * 100).toFixed(1)}%`
        );
      }

      // Complete job
      await this.completeSyncJob(jobId, metrics, 'completed');

      console.log(`[${state}] Sync complete. Added: ${metrics.productsAdded}, Updated: ${metrics.productsUpdated}, Removed: ${metrics.productsRemoved}`);

      return {
        jobId,
        state,
        dataSource: config.dataSource,
        status: 'completed',
        ...metrics,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${state}] Sync failed:`, errorMessage);

      await this.completeSyncJob(
        jobId,
        metrics,
        'failed',
        errorMessage,
        { stack: error instanceof Error ? error.stack : undefined }
      );

      return {
        jobId,
        state,
        dataSource: config.dataSource,
        status: 'failed',
        ...metrics,
        durationMs: Date.now() - startTime,
        errorMessage,
      };
    }
  }

  /**
   * Get health dashboard data
   */
  async getHealthDashboard(): Promise<any[]> {
    const result = await pool.query('SELECT * FROM apl_health_dashboard');
    return result.rows;
  }

  /**
   * Get recent sync jobs
   */
  async getRecentSyncs(limit: number = 20): Promise<any[]> {
    const result = await pool.query(
      'SELECT * FROM apl_recent_syncs LIMIT $1',
      [limit]
    );
    return result.rows;
  }

  /**
   * Get sync job details
   */
  async getSyncJob(jobId: number): Promise<any> {
    const result = await pool.query(
      `SELECT * FROM apl_sync_jobs WHERE id = $1`,
      [jobId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Get product changes for this job
    const changesResult = await pool.query(
      `SELECT * FROM apl_product_changes WHERE sync_job_id = $1 ORDER BY created_at`,
      [jobId]
    );

    return {
      ...result.rows[0],
      changes: changesResult.rows,
    };
  }

  /**
   * Get daily change statistics
   */
  async getDailyChanges(days: number = 30): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM apl_daily_changes WHERE change_date > CURRENT_DATE - INTERVAL '${days} days'`
    );
    return result.rows;
  }

  /**
   * Get states that need syncing based on schedule
   */
  async getStatesDueForSync(): Promise<APLSourceConfig[]> {
    // This is a simplified check - in production, use a proper cron parser
    // to compare sync_schedule with current time
    const query = `
      SELECT
        c.*,
        s.last_sync_at
      FROM apl_source_config c
      LEFT JOIN apl_sync_status s ON c.state = s.state AND c.data_source = s.data_source
      WHERE c.is_active = true
        AND c.sync_enabled = true
        AND (
          s.last_sync_at IS NULL
          OR s.last_sync_at < NOW() - INTERVAL '23 hours'
        )
    `;

    const result = await pool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      state: row.state,
      dataSource: row.data_source,
      sourceType: row.source_type,
      sourceUrl: row.source_url,
      fileFormat: row.file_format,
      parserConfig: row.parser_config || {},
      syncSchedule: row.sync_schedule,
      syncEnabled: row.sync_enabled,
      minExpectedProducts: row.min_expected_products,
      maxChangeThreshold: parseFloat(row.max_change_threshold),
    }));
  }

  /**
   * Run scheduled sync for all due states
   */
  async runScheduledSync(): Promise<SyncJobResult[]> {
    const dueStates = await this.getStatesDueForSync();
    console.log(`Found ${dueStates.length} states due for sync`);

    const results: SyncJobResult[] = [];

    for (const config of dueStates) {
      try {
        console.log(`\nSyncing ${config.state}...`);
        const result = await this.syncState(config.state, config.dataSource, 'scheduler');
        results.push(result);
      } catch (error) {
        console.error(`Failed to sync ${config.state}:`, error);
        // Continue with other states even if one fails
      }
    }

    return results;
  }
}

// Export singleton instance
export const aplSyncService = new APLSyncService();
