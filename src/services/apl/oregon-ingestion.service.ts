/**
 * Oregon APL Ingestion Service (State-Specific System)
 *
 * Downloads and processes Oregon WIC Approved Product List.
 * Oregon has its own state-specific eWIC system (not FIS or Conduent).
 *
 * Data Source: https://www.oregon.gov/oha/ph/healthypeoplefamilies/wic/pages/index.aspx
 * Format: CSV/Excel (state-specific format)
 * Update Frequency: Monthly (public), as-needed for policy changes
 *
 * OREGON-SPECIFIC POLICIES:
 * - Strong emphasis on local/organic products
 * - Expanded fruit/vegetable benefits
 * - State-specific formula contracts
 *
 * @module services/apl/oregon-ingestion
 */

import * as XLSX from 'xlsx';
import axios from 'axios';
import { createHash } from 'crypto';
import { APLEntry, APLSyncStatus, APLChangeLog, ParticipantType } from '../../types/apl.types';
import { normalizeUPC, validateCheckDigit } from '../../utils/upc.utils';
import { validateAPLEntry, sanitizeAPLEntry } from '../../utils/apl.validation';

/**
 * Configuration for Oregon APL data source
 */
export interface OregonAPLConfig {
  /** URL to download the Oregon APL file */
  downloadUrl: string;
  /** Local file path for fallback/testing */
  localFilePath?: string;
  /** Use local file instead of downloading */
  useLocalFile?: boolean;
  /** Database connection pool */
  dbPool?: any;
}

/**
 * Raw row from Oregon APL file (state-specific format)
 * Oregon uses unique field naming conventions
 */
interface OregonAPLRow {
  UPC?: string | number;
  'UPC Code'?: string | number;
  'Product UPC'?: string | number;
  'Item Number'?: string | number;
  'Product Description'?: string;
  Description?: string;
  'Item Name'?: string;
  Product?: string;
  Category?: string;
  'Food Category'?: string;
  'Benefit Category'?: string;
  Subcategory?: string;
  'Sub Category'?: string;
  'Package Size'?: string;
  Size?: string;
  'Container Size'?: string;
  'Unit Size'?: string;
  'Participant Types'?: string;
  'Eligible For'?: string;
  'Participant Category'?: string;
  'Effective Date'?: string | Date;
  'Start Date'?: string | Date;
  'Begin Date'?: string | Date;
  'Expiration Date'?: string | Date;
  'End Date'?: string | Date;
  'Termination Date'?: string | Date;
  Brand?: string;
  'Brand Name'?: string;
  'Manufacturer'?: string;
  'Minimum Size'?: string | number;
  'Maximum Size'?: string | number;
  'Min Size'?: string | number;
  'Max Size'?: string | number;
  'Organic Only'?: string; // Oregon-specific
  'Local Preference'?: string; // Oregon-specific
  Notes?: string;
  Remarks?: string;
  Comments?: string;
  [key: string]: any; // Allow for variations in column names
}

/**
 * Parsed Oregon APL entry (before normalization)
 */
interface ParsedOregonEntry {
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
  organicOnly?: boolean;
  localPreference?: boolean;
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
  organicProducts: number; // Oregon-specific
  localProducts: number; // Oregon-specific
  errors: string[];
  warnings: string[];
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
}

/**
 * Oregon APL Ingestion Service
 * Handles downloading, parsing, validating, and storing Oregon WIC APL data
 *
 * Oregon-specific features:
 * - Organic product tracking
 * - Local product preference
 * - State-specific formula contracts
 * - Enhanced fruit/vegetable categories
 */
export class OregonAPLIngestionService {
  private config: OregonAPLConfig;
  private stats: IngestionStats;

  constructor(config: OregonAPLConfig) {
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
      organicProducts: 0,
      localProducts: 0,
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
    console.log('🚀 Starting Oregon APL ingestion...');
    this.stats = this.initStats();

    try {
      // Step 1: Download or load APL file
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

      console.log('🎉 Oregon APL ingestion complete');
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
   * Download APL file from Oregon WIC website
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
   * Parse APL file into raw row objects
   * Handles Excel (.xlsx) and CSV formats
   */
  private async parseAPLFile(fileBuffer: Buffer): Promise<OregonAPLRow[]> {
    // Detect file type
    const isExcel = this.isExcelFile(fileBuffer);
    const isCSV = this.isCSVFile(fileBuffer);

    if (isExcel) {
      return this.parseExcelFile(fileBuffer);
    } else if (isCSV) {
      return this.parseCSVFile(fileBuffer);
    } else {
      throw new Error('Unsupported file format. Expected Excel (.xlsx) or CSV.');
    }
  }

  /**
   * Detect if file is Excel format
   */
  private isExcelFile(fileBuffer: Buffer): boolean {
    // Excel files start with PK (ZIP signature)
    return fileBuffer.length > 4 && fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B;
  }

  /**
   * Detect if file is CSV format
   */
  private isCSVFile(fileBuffer: Buffer): boolean {
    // Check for common CSV indicators in first 1000 bytes
    const sample = fileBuffer.slice(0, 1000).toString('utf-8');
    return sample.includes(',') && (sample.includes('\n') || sample.includes('\r'));
  }

  /**
   * Parse Excel file into raw row objects
   */
  private async parseExcelFile(fileBuffer: Buffer): Promise<OregonAPLRow[]> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // First sheet should contain the main APL
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Excel file has no sheets');
    }

    const worksheet = workbook.Sheets[sheetName];

    // Parse to JSON with header row
    const rawData = XLSX.utils.sheet_to_json<OregonAPLRow>(worksheet, {
      defval: null,
      raw: false, // Convert dates to strings
    });

    this.stats.totalRows = rawData.length;

    return rawData;
  }

  /**
   * Parse CSV file into raw row objects
   */
  private async parseCSVFile(fileBuffer: Buffer): Promise<OregonAPLRow[]> {
    // Use xlsx to parse CSV as well (it handles CSV)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rawData = XLSX.utils.sheet_to_json<OregonAPLRow>(worksheet, {
      defval: null,
      raw: false,
    });

    this.stats.totalRows = rawData.length;

    return rawData;
  }

  /**
   * Transform raw file rows into standardized APL entries
   */
  private transformToAPLEntries(rawRows: OregonAPLRow[]): APLEntry[] {
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
   * Applies Oregon-specific rules (organic, local preference)
   */
  private transformRow(row: OregonAPLRow): APLEntry | null {
    // Extract UPC (handle various column name variations)
    const upcRaw =
      row.UPC ||
      row['UPC Code'] ||
      row['Product UPC'] ||
      row['Item Number'] ||
      row.upc;

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

    // Extract product description
    const productDescription =
      row['Product Description'] ||
      row.Description ||
      row['Item Name'] ||
      row.Product ||
      '';

    // Extract category and subcategory
    const category =
      row.Category ||
      row['Food Category'] ||
      row['Benefit Category'] ||
      row.category ||
      'Unknown';

    const subcategory =
      row.Subcategory ||
      row['Sub Category'] ||
      row.subcategory ||
      undefined;

    // Combine into benefit category
    const benefitCategory = subcategory ? `${category} - ${subcategory}` : category;

    // Extract participant types
    const participantTypes = this.parseParticipantTypes(
      row['Participant Types'] ||
      row['Eligible For'] ||
      row['Participant Category']
    );

    // Extract size restrictions
    const sizeRestriction = this.parseSizeRestriction(row);

    // Extract brand restrictions
    const brandRestriction = this.parseBrandRestriction(row);

    // OREGON-SPECIFIC: Check for organic and local preferences
    const organicOnly = this.parseOrganicFlag(row);
    const localPreference = this.parseLocalFlag(row);

    if (organicOnly) {
      this.stats.organicProducts++;
    }
    if (localPreference) {
      this.stats.localProducts++;
    }

    // Extract dates
    const effectiveDate = this.parseDate(
      row['Effective Date'] ||
      row['Start Date'] ||
      row['Begin Date']
    ) || new Date();

    const expirationDate = this.parseDate(
      row['Expiration Date'] ||
      row['End Date'] ||
      row['Termination Date']
    ) || null;

    // Build APL entry
    const entry: APLEntry = {
      id: `apl_or_${normalizedUPC}_${this.dateToString(effectiveDate)}`,
      state: 'OR',
      upc: normalizedUPC,
      eligible: true,
      benefitCategory,
      benefitSubcategory: subcategory,
      participantTypes: participantTypes || undefined,
      sizeRestriction: sizeRestriction || undefined,
      brandRestriction: brandRestriction || undefined,
      additionalRestrictions: this.parseAdditionalRestrictions(row, organicOnly, localPreference),
      effectiveDate,
      expirationDate: expirationDate || undefined,
      notes: this.buildNotes(row, organicOnly, localPreference),
      dataSource: 'state',
      lastUpdated: new Date(),
      verified: false, // Requires manual verification
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return entry;
  }

  /**
   * Parse participant types from string
   */
  private parseParticipantTypes(typeString?: string): ParticipantType[] | null {
    if (!typeString) return null;

    const lowerString = typeString.toLowerCase().trim();

    // "All" means all participant types
    if (lowerString === 'all' || lowerString === 'all participants') {
      return ['pregnant', 'postpartum', 'breastfeeding', 'infant', 'child'];
    }

    const types: ParticipantType[] = [];

    if (lowerString.includes('pregnant')) types.push('pregnant');
    if (lowerString.includes('postpartum') || lowerString.includes('post-partum')) {
      types.push('postpartum');
    }
    if (lowerString.includes('breastfeeding') || lowerString.includes('nursing') || lowerString.includes('lactating')) {
      types.push('breastfeeding');
    }
    if (lowerString.includes('infant')) types.push('infant');
    if (lowerString.includes('child') || lowerString.includes('children')) types.push('child');

    return types.length > 0 ? types : null;
  }

  /**
   * Parse size restrictions from row
   */
  private parseSizeRestriction(row: OregonAPLRow): any {
    const packageSize =
      row['Package Size'] ||
      row.Size ||
      row['Container Size'] ||
      row['Unit Size'] ||
      row.size;

    const minSize =
      row['Minimum Size'] ||
      row['Min Size'] ||
      row.minSize;

    const maxSize =
      row['Maximum Size'] ||
      row['Max Size'] ||
      row.maxSize;

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
    const rangeMatch = trimmed.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s*(oz|lb|gal|qt|pt|g|ml|l|ct)/i);
    if (rangeMatch) {
      return {
        minSize: Number(rangeMatch[1]),
        maxSize: Number(rangeMatch[2]),
        unit: rangeMatch[3].toLowerCase(),
      };
    }

    // Exact size: "12 oz"
    const exactMatch = trimmed.match(/(\d+\.?\d*)\s*(oz|lb|gal|qt|pt|g|ml|l|ct)/i);
    if (exactMatch) {
      return {
        exactSize: Number(exactMatch[1]),
        unit: exactMatch[2].toLowerCase(),
      };
    }

    return null;
  }

  /**
   * Parse brand restrictions
   */
  private parseBrandRestriction(row: OregonAPLRow): any {
    const brand = row.Brand || row['Brand Name'] || row.Manufacturer;

    if (brand) {
      return {
        allowedBrands: [String(brand)],
      };
    }

    return null;
  }

  /**
   * Parse organic flag (Oregon-specific)
   */
  private parseOrganicFlag(row: OregonAPLRow): boolean {
    if (row['Organic Only']) {
      const value = String(row['Organic Only']).toLowerCase().trim();
      return value === 'yes' || value === 'y' || value === 'true' || value === '1';
    }

    // Check description for organic keywords
    const description = [
      row.Description,
      row['Product Description'],
      row['Item Name'],
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return description.includes('organic only');
  }

  /**
   * Parse local preference flag (Oregon-specific)
   */
  private parseLocalFlag(row: OregonAPLRow): boolean {
    if (row['Local Preference']) {
      const value = String(row['Local Preference']).toLowerCase().trim();
      return value === 'yes' || value === 'y' || value === 'true' || value === '1';
    }

    // Check notes for local preference keywords
    const notes = [
      row.Notes,
      row.Remarks,
      row.Comments,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return notes.includes('local') || notes.includes('oregon grown');
  }

  /**
   * Parse additional restrictions (state-specific)
   */
  private parseAdditionalRestrictions(
    row: OregonAPLRow,
    organicOnly: boolean,
    localPreference: boolean
  ): Record<string, any> | null {
    const restrictions: Record<string, any> = {};

    // OREGON POLICY: Organic requirements
    if (organicOnly) {
      restrictions.organicRequired = true;
    }

    // OREGON POLICY: Local preference
    if (localPreference) {
      restrictions.localPreferred = true;
    }

    // Whole grain requirements for cereals
    const category = row.Category || row['Food Category'] || '';
    if (category.toLowerCase().includes('cereal')) {
      restrictions.wholeGrainRequired = true;
    }

    // Sugar limits
    if (row.Notes?.toLowerCase().includes('sugar') ||
        row.Remarks?.toLowerCase().includes('sugar') ||
        row.Comments?.toLowerCase().includes('sugar')) {
      restrictions.sugarLimit = true;
    }

    return Object.keys(restrictions).length > 0 ? restrictions : null;
  }

  /**
   * Build notes field with Oregon-specific information
   */
  private buildNotes(
    row: OregonAPLRow,
    organicOnly: boolean,
    localPreference: boolean
  ): string | undefined {
    const notes: string[] = [];

    // Add original notes
    if (row.Notes) notes.push(String(row.Notes));
    if (row.Remarks) notes.push(String(row.Remarks));
    if (row.Comments) notes.push(String(row.Comments));

    // Add Oregon policy notes
    if (organicOnly) {
      notes.push('OR Policy: Organic certification required');
    }
    if (localPreference) {
      notes.push('OR Policy: Local Oregon products preferred');
    }

    return notes.length > 0 ? notes.join(' | ') : undefined;
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
        effective_date, expiration_date, notes, data_source, last_updated, verified,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
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
        entry.createdAt,
        entry.updatedAt,
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
        last_updated = $13,
        updated_at = $14
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
        entry.updatedAt,
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
        ['OR', 'state']
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
          'OR',
          'state',
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
    console.log('\n📊 Oregon APL Ingestion Statistics:');
    console.log(`   Total Rows: ${this.stats.totalRows}`);
    console.log(`   Valid Entries: ${this.stats.validEntries}`);
    console.log(`   Invalid Entries: ${this.stats.invalidEntries}`);
    console.log(`   Additions: ${this.stats.additions}`);
    console.log(`   Updates: ${this.stats.updates}`);
    console.log(`   Organic Products: ${this.stats.organicProducts}`);
    console.log(`   Local Products: ${this.stats.localProducts}`);
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
 * Convenience function to run Oregon APL ingestion
 */
export async function ingestOregonAPL(
  config: OregonAPLConfig
): Promise<IngestionStats> {
  const service = new OregonAPLIngestionService(config);
  return await service.ingest();
}
