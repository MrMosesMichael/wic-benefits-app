/**
 * North Carolina APL Ingestion Service (Conduent Processor)
 *
 * Downloads and processes North Carolina WIC Approved Product List.
 * North Carolina uses Conduent as their eWIC processor.
 *
 * Data Source: https://www.ncdhhs.gov/divisions/public-health/wic
 * Format: CSV/Excel (Conduent format differs from FIS)
 * Update Frequency: Monthly (public), Weekly (vendor portal)
 *
 * @module services/apl/north-carolina-ingestion
 */

import * as XLSX from 'xlsx';
import axios from 'axios';
import { createHash } from 'crypto';
import { APLEntry, APLSyncStatus, APLChangeLog, ParticipantType } from '../../types/apl.types';
import { normalizeUPC, validateCheckDigit } from '../../utils/upc.utils';
import { validateAPLEntry, sanitizeAPLEntry } from '../../utils/apl.validation';

/**
 * Configuration for North Carolina APL data source
 */
export interface NorthCarolinaAPLConfig {
  /** URL to download the North Carolina APL file */
  downloadUrl: string;
  /** Local file path for fallback/testing */
  localFilePath?: string;
  /** Use local file instead of downloading */
  useLocalFile?: boolean;
  /** Database connection pool */
  dbPool?: any;
}

/**
 * Raw row from North Carolina APL file (Conduent format)
 * Conduent uses different field names than FIS
 */
interface NorthCarolinaAPLRow {
  'UPC/PLU'?: string | number;
  UPC?: string | number;
  'Item Description'?: string;
  Description?: string;
  'Product Name'?: string;
  'Food Category'?: string;
  Category?: string;
  'Sub Category'?: string;
  Subcategory?: string;
  'Container Size'?: string;
  'Package Size'?: string;
  Size?: string;
  'Eligible Participants'?: string;
  'Participant Category'?: string;
  Brand?: string;
  'Brand Name'?: string;
  'Begin Date'?: string | Date;
  'Effective Date'?: string | Date;
  'End Date'?: string | Date;
  'Expiration Date'?: string | Date;
  'Min Quantity'?: string | number;
  'Max Quantity'?: string | number;
  'Min Size'?: string | number;
  'Max Size'?: string | number;
  Notes?: string;
  Remarks?: string;
  [key: string]: any; // Allow for variations in column names
}

/**
 * Parsed North Carolina APL entry (before normalization)
 */
interface ParsedNorthCarolinaEntry {
  upc: string;
  productDescription: string;
  category: string;
  subcategory?: string;
  packageSize?: string;
  participantTypes?: string[];
  effectiveDate?: Date;
  expirationDate?: Date;
  brand?: string;
  minSize?: number;
  maxSize?: number;
  notes?: string;
}

/**
 * Ingestion statistics
 */
export interface IngestionStats {
  totalRows: number;
  validEntries: number;
  invalidEntries: number;
  duplicates: number;
  additions: number;
  updates: number;
  expirations: number;
  errors: string[];
  warnings: string[];
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
}

/**
 * North Carolina APL Ingestion Service
 * Handles downloading, parsing, validating, and storing North Carolina WIC APL data
 */
export class NorthCarolinaAPLIngestionService {
  private config: NorthCarolinaAPLConfig;
  private stats: IngestionStats;

  constructor(config: NorthCarolinaAPLConfig) {
    this.config = config;
    this.stats = this.initStats();
  }

  /**
   * Initialize statistics tracking
   */
  private initStats(): IngestionStats {
    return {
      totalRows: 0,
      validEntries: 0,
      invalidEntries: 0,
      duplicates: 0,
      additions: 0,
      updates: 0,
      expirations: 0,
      errors: [],
      warnings: [],
      startTime: new Date(),
    };
  }

  /**
   * Main ingestion workflow
   * Downloads file, parses, validates, and stores in database
   */
  async ingest(): Promise<IngestionStats> {
    console.log('🚀 Starting North Carolina APL ingestion...');
    this.stats = this.initStats();

    try {
      // Step 1: Download or load file
      const fileBuffer = await this.downloadAPLFile();
      console.log('✅ APL file downloaded');

      // Step 2: Parse file into raw data
      const rawEntries = await this.parseAPLFile(fileBuffer);
      console.log(`✅ Parsed ${rawEntries.length} rows from file`);

      // Step 3: Transform to internal format
      const parsedEntries = this.transformToAPLEntries(rawEntries);
      console.log(`✅ Transformed ${parsedEntries.length} valid entries`);

      // Step 4: Validate and sanitize
      const validatedEntries = this.validateEntries(parsedEntries);
      console.log(`✅ Validated ${validatedEntries.length} entries`);

      // Step 5: Store in database
      if (this.config.dbPool) {
        await this.storeEntries(validatedEntries);
        console.log('✅ Stored entries in database');
      } else {
        this.stats.warnings.push('Database pool not configured - skipping storage');
      }

      // Step 6: Update sync status
      if (this.config.dbPool) {
        await this.updateSyncStatus(fileBuffer);
        console.log('✅ Updated sync status');
      }

      this.stats.endTime = new Date();
      this.stats.durationMs = this.stats.endTime.getTime() - this.stats.startTime.getTime();

      console.log('🎉 North Carolina APL ingestion complete');
      this.printStats();

      return this.stats;
    } catch (error) {
      this.stats.endTime = new Date();
      this.stats.durationMs = this.stats.endTime.getTime() - this.stats.startTime.getTime();
      this.stats.errors.push(`Ingestion failed: ${error.message}`);
      console.error('❌ Ingestion failed:', error);
      throw error;
    }
  }

  /**
   * Download APL file from North Carolina DHHS website
   */
  private async downloadAPLFile(): Promise<Buffer> {
    if (this.config.useLocalFile && this.config.localFilePath) {
      const fs = require('fs').promises;
      return await fs.readFile(this.config.localFilePath);
    }

    const response = await axios.get(this.config.downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'WIC-Benefits-App/1.0 (Non-profit; helping WIC participants)',
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to download APL file: HTTP ${response.status}`);
    }

    return Buffer.from(response.data);
  }

  /**
   * Parse APL file (supports Excel and CSV formats)
   */
  private async parseAPLFile(fileBuffer: Buffer): Promise<NorthCarolinaAPLRow[]> {
    // Try Excel format first (most common for Conduent)
    try {
      return await this.parseExcelFile(fileBuffer);
    } catch (excelError) {
      // Fallback to CSV if Excel parsing fails
      this.stats.warnings.push('Excel parsing failed, trying CSV format');
      return await this.parseCSVFile(fileBuffer);
    }
  }

  /**
   * Parse Excel file into raw row objects
   */
  private async parseExcelFile(fileBuffer: Buffer): Promise<NorthCarolinaAPLRow[]> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // First sheet should contain the main APL
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Excel file has no sheets');
    }

    const worksheet = workbook.Sheets[sheetName];

    // Parse to JSON with header row
    const rawData = XLSX.utils.sheet_to_json<NorthCarolinaAPLRow>(worksheet, {
      defval: null,
      raw: false, // Convert dates to strings
    });

    this.stats.totalRows = rawData.length;

    return rawData;
  }

  /**
   * Parse CSV file into raw row objects
   */
  private async parseCSVFile(fileBuffer: Buffer): Promise<NorthCarolinaAPLRow[]> {
    const csvText = fileBuffer.toString('utf-8');
    const lines = csvText.split('\n');

    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse header row
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    // Parse data rows
    const rows: NorthCarolinaAPLRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: NorthCarolinaAPLRow = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });

      rows.push(row);
    }

    this.stats.totalRows = rows.length;
    return rows;
  }

  /**
   * Transform raw rows into standardized APL entries
   */
  private transformToAPLEntries(rawRows: NorthCarolinaAPLRow[]): APLEntry[] {
    const entries: APLEntry[] = [];

    for (const row of rawRows) {
      try {
        const entry = this.transformRow(row);
        if (entry) {
          entries.push(entry);
          this.stats.validEntries++;
        }
      } catch (error) {
        this.stats.invalidEntries++;
        this.stats.errors.push(`Row transform error: ${error.message}`);
      }
    }

    return entries;
  }

  /**
   * Transform single row to APL entry
   */
  private transformRow(row: NorthCarolinaAPLRow): APLEntry | null {
    // Extract UPC (Conduent uses 'UPC/PLU' or 'UPC')
    const upcRaw = row['UPC/PLU'] || row.UPC || row.upc || row['UPC Code'];
    if (!upcRaw) {
      return null; // Skip rows without UPC
    }

    // Normalize UPC
    const upcString = String(upcRaw).trim();
    const normalizedUPC = normalizeUPC(upcString);
    if (!normalizedUPC) {
      this.stats.warnings.push(`Invalid UPC format: ${upcString}`);
      return null;
    }

    // Extract product description (Conduent uses various field names)
    const productDescription =
      row['Item Description'] ||
      row['Product Name'] ||
      row.Description ||
      row.description ||
      '';

    // Extract category and subcategory
    const category =
      row['Food Category'] ||
      row.Category ||
      row.category ||
      'Unknown';
    const subcategory =
      row['Sub Category'] ||
      row.Subcategory ||
      row.subcategory ||
      undefined;

    // Combine into benefit category
    const benefitCategory = subcategory ? `${category} - ${subcategory}` : category;

    // Extract participant types (Conduent uses different terminology)
    const participantTypes = this.parseParticipantTypes(
      row['Eligible Participants'] || row['Participant Category']
    );

    // Extract size restrictions
    const sizeRestriction = this.parseSizeRestriction(row);

    // Extract brand restrictions
    const brandRestriction = (row.Brand || row['Brand Name'])
      ? { allowedBrands: [row.Brand || row['Brand Name']] }
      : null;

    // Extract dates (Conduent uses 'Begin Date' and 'End Date')
    const effectiveDate =
      this.parseDate(row['Begin Date'] || row['Effective Date']) ||
      new Date();
    const expirationDate =
      this.parseDate(row['End Date'] || row['Expiration Date']) ||
      null;

    // Build APL entry
    const entry: APLEntry = {
      id: `apl_nc_${normalizedUPC}_${this.dateToString(effectiveDate)}`,
      state: 'NC',
      upc: normalizedUPC,
      eligible: true,
      benefitCategory,
      benefitSubcategory: subcategory,
      participantTypes: participantTypes || undefined,
      sizeRestriction: sizeRestriction || undefined,
      brandRestriction: brandRestriction || undefined,
      additionalRestrictions: this.parseAdditionalRestrictions(row),
      effectiveDate,
      expirationDate: expirationDate || undefined,
      notes: (row.Notes || row.Remarks) || undefined,
      dataSource: 'conduent',
      lastUpdated: new Date(),
      verified: false, // Requires manual verification
    };

    return entry;
  }

  /**
   * Parse participant types from string (Conduent format)
   */
  private parseParticipantTypes(typeString?: string): ParticipantType[] | null {
    if (!typeString) return null;

    const lowerString = typeString.toLowerCase().trim();

    // "All" means all participant types
    if (lowerString === 'all' || lowerString === 'all participants') {
      return ['pregnant', 'postpartum', 'breastfeeding', 'infant', 'child'];
    }

    const types: ParticipantType[] = [];

    if (lowerString.includes('pregnant') || lowerString.includes('preg')) types.push('pregnant');
    if (lowerString.includes('postpartum') || lowerString.includes('pp')) types.push('postpartum');
    if (lowerString.includes('breastfeeding') || lowerString.includes('bf') || lowerString.includes('nursing')) {
      types.push('breastfeeding');
    }
    if (lowerString.includes('infant') || lowerString.includes('inf')) types.push('infant');
    if (lowerString.includes('child') || lowerString.includes('children')) types.push('child');

    return types.length > 0 ? types : null;
  }

  /**
   * Parse size restrictions from row
   */
  private parseSizeRestriction(row: NorthCarolinaAPLRow): any {
    const packageSize =
      row['Container Size'] ||
      row['Package Size'] ||
      row.Size ||
      row.size;
    const minSize = row['Min Size'] || row.minSize;
    const maxSize = row['Max Size'] || row.maxSize;

    // If we have min/max explicitly
    if (minSize || maxSize) {
      return {
        minSize: minSize ? Number(minSize) : undefined,
        maxSize: maxSize ? Number(maxSize) : undefined,
        unit: 'oz', // Default to oz, parse from packageSize if needed
      };
    }

    // If we have package size string like "12 oz" or "8.9-36 oz"
    if (packageSize && typeof packageSize === 'string') {
      return this.parseSizeFromString(packageSize);
    }

    return null;
  }

  /**
   * Parse size restriction from string like "12 oz" or "8.9-36 oz"
   */
  private parseSizeFromString(sizeString: string): any {
    const trimmed = sizeString.trim();

    // Range format: "8.9-36 oz"
    const rangeMatch = trimmed.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s*(oz|lb|gal|g|ml|l)/i);
    if (rangeMatch) {
      return {
        minSize: Number(rangeMatch[1]),
        maxSize: Number(rangeMatch[2]),
        unit: rangeMatch[3].toLowerCase(),
      };
    }

    // Exact size: "12 oz"
    const exactMatch = trimmed.match(/(\d+\.?\d*)\s*(oz|lb|gal|g|ml|l)/i);
    if (exactMatch) {
      return {
        exactSize: Number(exactMatch[1]),
        unit: exactMatch[2].toLowerCase(),
      };
    }

    return null;
  }

  /**
   * Parse additional restrictions (state-specific)
   */
  private parseAdditionalRestrictions(row: NorthCarolinaAPLRow): Record<string, any> | null {
    const restrictions: Record<string, any> = {};

    // Whole grain requirements
    if (row.Category?.toLowerCase().includes('cereal') ||
        row.category?.toLowerCase().includes('cereal')) {
      restrictions.wholeGrainRequired = true;
    }

    // Sugar limits
    if (row.Notes?.toLowerCase().includes('sugar') ||
        row.notes?.toLowerCase().includes('sugar') ||
        row.Remarks?.toLowerCase().includes('sugar')) {
      restrictions.sugarLimit = true;
    }

    // Low-fat requirements (common in NC)
    if (row.Notes?.toLowerCase().includes('low-fat') ||
        row.Notes?.toLowerCase().includes('reduced-fat')) {
      restrictions.lowFatRequired = true;
    }

    return Object.keys(restrictions).length > 0 ? restrictions : null;
  }

  /**
   * Parse date from various formats
   */
  private parseDate(dateValue?: string | Date): Date | null {
    if (!dateValue) return null;

    if (dateValue instanceof Date) {
      return dateValue;
    }

    // Try parsing string
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Convert date to YYYYMMDD string
   */
  private dateToString(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  /**
   * Validate all entries
   */
  private validateEntries(entries: APLEntry[]): APLEntry[] {
    const validated: APLEntry[] = [];

    for (const entry of entries) {
      try {
        // Validate structure
        const validation = validateAPLEntry(entry);
        if (!validation.valid) {
          this.stats.invalidEntries++;
          this.stats.errors.push(`Validation error for ${entry.upc}: ${validation.errors.join(', ')}`);
          continue;
        }

        // Sanitize
        const sanitized = sanitizeAPLEntry(entry);
        validated.push(sanitized);
      } catch (error) {
        this.stats.invalidEntries++;
        this.stats.errors.push(`Validation exception for ${entry.upc}: ${error.message}`);
      }
    }

    return validated;
  }

  /**
   * Store validated entries in database
   */
  private async storeEntries(entries: APLEntry[]): Promise<void> {
    if (!this.config.dbPool) {
      throw new Error('Database pool not configured');
    }

    const client = await this.config.dbPool.connect();

    try {
      await client.query('BEGIN');

      for (const entry of entries) {
        // Check if entry already exists
        const existingResult = await client.query(
          'SELECT id FROM apl_entries WHERE state = $1 AND upc = $2 AND effective_date = $3',
          [entry.state, entry.upc, entry.effectiveDate]
        );

        if (existingResult.rows.length > 0) {
          // Update existing
          await this.updateEntry(client, entry);
          this.stats.updates++;
        } else {
          // Insert new
          await this.insertEntry(client, entry);
          this.stats.additions++;
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Insert new APL entry
   */
  private async insertEntry(client: any, entry: APLEntry): Promise<void> {
    await client.query(
      `INSERT INTO apl_entries (
        id, state, upc, eligible, benefit_category, benefit_subcategory,
        participant_types, size_restriction, brand_restriction, additional_restrictions,
        effective_date, expiration_date, notes, data_source, last_updated, verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        entry.id,
        entry.state,
        entry.upc,
        entry.eligible,
        entry.benefitCategory,
        entry.benefitSubcategory,
        entry.participantTypes,
        JSON.stringify(entry.sizeRestriction),
        JSON.stringify(entry.brandRestriction),
        JSON.stringify(entry.additionalRestrictions),
        entry.effectiveDate,
        entry.expirationDate,
        entry.notes,
        entry.dataSource,
        entry.lastUpdated,
        entry.verified,
      ]
    );
  }

  /**
   * Update existing APL entry
   */
  private async updateEntry(client: any, entry: APLEntry): Promise<void> {
    await client.query(
      `UPDATE apl_entries SET
        eligible = $4,
        benefit_category = $5,
        benefit_subcategory = $6,
        participant_types = $7,
        size_restriction = $8,
        brand_restriction = $9,
        additional_restrictions = $10,
        expiration_date = $11,
        notes = $12,
        last_updated = $13
      WHERE state = $1 AND upc = $2 AND effective_date = $3`,
      [
        entry.state,
        entry.upc,
        entry.effectiveDate,
        entry.eligible,
        entry.benefitCategory,
        entry.benefitSubcategory,
        entry.participantTypes,
        JSON.stringify(entry.sizeRestriction),
        JSON.stringify(entry.brandRestriction),
        JSON.stringify(entry.additionalRestrictions),
        entry.expirationDate,
        entry.notes,
        entry.lastUpdated,
      ]
    );
  }

  /**
   * Update sync status in database
   */
  private async updateSyncStatus(fileBuffer: Buffer): Promise<void> {
    if (!this.config.dbPool) {
      return;
    }

    const client = await this.config.dbPool.connect();

    try {
      // Calculate file hash
      const hash = createHash('sha256');
      hash.update(fileBuffer);
      const fileHash = hash.digest('hex');

      // Check if hash has changed (indicates new data)
      const existingResult = await client.query(
        'SELECT file_hash FROM apl_sync_status WHERE state = $1 AND data_source = $2',
        ['NC', 'conduent']
      );

      const hasChanged = existingResult.rows.length === 0 ||
                        existingResult.rows[0].file_hash !== fileHash;

      // Update or insert sync status
      await client.query(
        `INSERT INTO apl_sync_status (
          state, data_source, last_sync_at, last_success_at, sync_status,
          entries_count, file_hash, last_error
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (state, data_source) DO UPDATE SET
          last_sync_at = $3,
          last_success_at = $4,
          sync_status = $5,
          entries_count = $6,
          file_hash = $7,
          consecutive_failures = 0`,
        [
          'NC',
          'conduent',
          new Date(),
          new Date(),
          'success',
          this.stats.additions + this.stats.updates,
          fileHash,
          null,
        ]
      );

      // Log change if detected
      if (hasChanged && existingResult.rows.length > 0) {
        this.stats.warnings.push('APL file hash changed - new data detected');
      }
    } finally {
      client.release();
    }
  }

  /**
   * Print statistics to console
   */
  private printStats(): void {
    console.log('\n📊 Ingestion Statistics:');
    console.log(`   Total Rows: ${this.stats.totalRows}`);
    console.log(`   Valid Entries: ${this.stats.validEntries}`);
    console.log(`   Invalid Entries: ${this.stats.invalidEntries}`);
    console.log(`   Additions: ${this.stats.additions}`);
    console.log(`   Updates: ${this.stats.updates}`);
    console.log(`   Duration: ${this.stats.durationMs}ms`);

    if (this.stats.errors.length > 0) {
      console.log(`\n❌ Errors (${this.stats.errors.length}):`);
      this.stats.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
      if (this.stats.errors.length > 10) {
        console.log(`   ... and ${this.stats.errors.length - 10} more`);
      }
    }

    if (this.stats.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.stats.warnings.length}):`);
      this.stats.warnings.slice(0, 10).forEach(warn => console.log(`   - ${warn}`));
      if (this.stats.warnings.length > 10) {
        console.log(`   ... and ${this.stats.warnings.length - 10} more`);
      }
    }
  }

  /**
   * Get current statistics
   */
  public getStats(): IngestionStats {
    return { ...this.stats };
  }
}

/**
 * Convenience function to run North Carolina APL ingestion
 */
export async function ingestNorthCarolinaAPL(
  config: NorthCarolinaAPLConfig
): Promise<IngestionStats> {
  const service = new NorthCarolinaAPLIngestionService(config);
  return await service.ingest();
}
