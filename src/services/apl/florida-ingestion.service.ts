/**
 * Florida APL Ingestion Service (FIS Processor)
 *
 * Downloads and processes Florida WIC Approved Product List.
 * Florida uses FIS as their eWIC processor (same as Michigan).
 *
 * Data Source: https://www.floridahealth.gov/programs-and-services/wic/wic-foods.html
 * Format: PDF food lists (requires parsing)
 * Update Frequency: Phased updates (Oct 2025 - Mar 2026), then quarterly
 *
 * IMPORTANT FLORIDA POLICIES (Effective Oct 2025):
 * - Artificial food dyes BANNED - products with artificial dyes are NOT WIC-approved
 * - New infant formula contract effective 2/1/2026
 * - New food package assignments phased in over 6 months
 *
 * @module services/apl/florida-ingestion
 */

import * as XLSX from 'xlsx';
import axios from 'axios';
import { createHash } from 'crypto';
import { APLEntry, APLSyncStatus, APLChangeLog, ParticipantType } from '../../types/apl.types';
import { normalizeUPC, validateCheckDigit } from '../../utils/upc.utils';
import { validateAPLEntry, sanitizeAPLEntry } from '../../utils/apl.validation';

/**
 * Configuration for Florida APL data source
 */
export interface FloridaAPLConfig {
  /** URL to download the Florida APL file (PDF or Excel if available) */
  downloadUrl: string;
  /** Local file path for fallback/testing */
  localFilePath?: string;
  /** Use local file instead of downloading */
  useLocalFile?: boolean;
  /** Database connection pool */
  dbPool?: any;
  /** Formula contract effective date (for contract brand tracking) */
  formulaContractEffectiveDate?: Date;
}

/**
 * Raw row from Florida APL file
 * Florida may use Excel or CSV exports, or we parse from PDF
 */
interface FloridaAPLRow {
  UPC?: string | number;
  'UPC Code'?: string | number;
  'UPC/PLU'?: string | number;
  'Product Description'?: string;
  Description?: string;
  Product?: string;
  'Product Name'?: string;
  Category?: string;
  'Food Category'?: string;
  Subcategory?: string;
  'Sub Category'?: string;
  'Package Size'?: string;
  Size?: string;
  'Container Size'?: string;
  'Participant Types'?: string;
  'Eligible Participants'?: string;
  'Effective Date'?: string | Date;
  'Begin Date'?: string | Date;
  'Expiration Date'?: string | Date;
  'End Date'?: string | Date;
  Brand?: string;
  'Brand Name'?: string;
  'Min Size'?: string | number;
  'Max Size'?: string | number;
  'Contract Brand'?: string; // For infant formula
  'Artificial Dyes'?: string; // Florida-specific: NO/YES flag
  Notes?: string;
  Remarks?: string;
  [key: string]: any; // Allow for variations in column names
}

/**
 * Parsed Florida APL entry (before normalization)
 */
interface ParsedFloridaEntry {
  upc: string;
  productDescription: string;
  category: string;
  subcategory?: string;
  packageSize?: string;
  participantTypes?: string[];
  effectiveDate?: Date;
  expirationDate?: Date;
  brand?: string;
  contractBrand?: string;
  minSize?: number;
  maxSize?: number;
  noArtificialDyes?: boolean;
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
  rejectedArtificialDyes: number; // Florida-specific
  contractFormulaChanges: number; // Florida-specific
  errors: string[];
  warnings: string[];
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
}

/**
 * Florida APL Ingestion Service
 * Handles downloading, parsing, validating, and storing Florida WIC APL data
 *
 * Key Florida-specific features:
 * - Artificial dye detection and rejection
 * - Formula contract brand tracking
 * - Phased policy rollout handling
 */
export class FloridaAPLIngestionService {
  private config: FloridaAPLConfig;
  private stats: IngestionStats;

  constructor(config: FloridaAPLConfig) {
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
      rejectedArtificialDyes: 0,
      contractFormulaChanges: 0,
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
    console.log('🚀 Starting Florida APL ingestion...');
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

      console.log('🎉 Florida APL ingestion complete');
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
   * Download APL file from Florida DOH website
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
   * Handles Excel (.xlsx) format
   * PDF parsing would require additional libraries (pdf-parse, pdfjs-dist)
   */
  private async parseAPLFile(fileBuffer: Buffer): Promise<FloridaAPLRow[]> {
    // Detect file type
    const isExcel = this.isExcelFile(fileBuffer);

    if (isExcel) {
      return this.parseExcelFile(fileBuffer);
    } else {
      // PDF parsing would go here
      // For now, throw error if not Excel
      throw new Error('PDF parsing not yet implemented. Please provide Excel file.');
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
   * Parse Excel file into raw row objects
   */
  private async parseExcelFile(fileBuffer: Buffer): Promise<FloridaAPLRow[]> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // First sheet should contain the main APL
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Excel file has no sheets');
    }

    const worksheet = workbook.Sheets[sheetName];

    // Parse to JSON with header row
    const rawData = XLSX.utils.sheet_to_json<FloridaAPLRow>(worksheet, {
      defval: null,
      raw: false, // Convert dates to strings
    });

    this.stats.totalRows = rawData.length;

    return rawData;
  }

  /**
   * Transform raw file rows into standardized APL entries
   */
  private transformToAPLEntries(rawRows: FloridaAPLRow[]): APLEntry[] {
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
   * Applies Florida-specific rules (artificial dyes, formula contracts)
   */
  private transformRow(row: FloridaAPLRow): APLEntry | null {
    // Extract UPC (handle various column name variations)
    const upcRaw = row.UPC || row['UPC Code'] || row['UPC/PLU'] || row.upc;
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

    // FLORIDA POLICY: Check for artificial dyes (effective Oct 2025)
    const hasArtificialDyes = this.detectArtificialDyes(row);
    if (hasArtificialDyes) {
      this.stats.rejectedArtificialDyes++;
      this.stats.warnings.push(`UPC ${normalizedUPC} rejected: contains artificial dyes (FL policy)`);
      return null; // Skip products with artificial dyes
    }

    // Extract product description
    const productDescription =
      row['Product Description'] ||
      row.Description ||
      row.Product ||
      row['Product Name'] ||
      '';

    // Extract category and subcategory
    const category = row.Category || row['Food Category'] || row.category || 'Unknown';
    const subcategory = row.Subcategory || row['Sub Category'] || row.subcategory || undefined;

    // Combine into benefit category
    const benefitCategory = subcategory ? `${category} - ${subcategory}` : category;

    // Extract participant types
    const participantTypes = this.parseParticipantTypes(
      row['Participant Types'] || row['Eligible Participants']
    );

    // Extract size restrictions
    const sizeRestriction = this.parseSizeRestriction(row);

    // Extract brand restrictions
    const brandRestriction = this.parseBrandRestriction(row);

    // Check if this is a contract formula (Florida-specific)
    const isContractFormula = this.isContractFormula(row, category);
    if (isContractFormula) {
      this.stats.contractFormulaChanges++;
    }

    // Extract dates
    const effectiveDate = this.parseDate(row['Effective Date'] || row['Begin Date']) || new Date();
    const expirationDate = this.parseDate(row['Expiration Date'] || row['End Date']) || null;

    // Build APL entry
    const entry: APLEntry = {
      id: `apl_fl_${normalizedUPC}_${this.dateToString(effectiveDate)}`,
      state: 'FL',
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
      notes: this.buildNotes(row),
      dataSource: 'fis',
      lastUpdated: new Date(),
      verified: false, // Requires manual verification
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return entry;
  }

  /**
   * Detect artificial dyes in product (Florida-specific policy)
   *
   * Florida banned artificial dyes effective Oct 2025
   * Products with artificial dyes are NOT WIC-approved
   */
  private detectArtificialDyes(row: FloridaAPLRow): boolean {
    // Check explicit flag if available
    if (row['Artificial Dyes']) {
      const dyeValue = String(row['Artificial Dyes']).toLowerCase().trim();
      if (dyeValue === 'yes' || dyeValue === 'y' || dyeValue === 'true' || dyeValue === '1') {
        return true;
      }
    }

    // Check product description and notes for dye keywords
    const textToCheck = [
      row.Description,
      row['Product Description'],
      row.Product,
      row.Notes,
      row.Remarks,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // Common artificial dye names
    const artificialDyeKeywords = [
      'red 40',
      'red 3',
      'yellow 5',
      'yellow 6',
      'blue 1',
      'blue 2',
      'green 3',
      'artificial color',
      'artificial dye',
      'fd&c',
      'lake dye',
    ];

    return artificialDyeKeywords.some(keyword => textToCheck.includes(keyword));
  }

  /**
   * Check if product is contract infant formula
   * Florida has specific contract brands that change over time
   */
  private isContractFormula(row: FloridaAPLRow, category: string): boolean {
    const categoryLower = category.toLowerCase();
    const isFormula =
      categoryLower.includes('formula') ||
      categoryLower.includes('infant formula');

    if (!isFormula) {
      return false;
    }

    // Contract brand specified explicitly
    return Boolean(row['Contract Brand'] || row.contractBrand);
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
    if (lowerString.includes('postpartum')) types.push('postpartum');
    if (lowerString.includes('breastfeeding') || lowerString.includes('nursing')) {
      types.push('breastfeeding');
    }
    if (lowerString.includes('infant')) types.push('infant');
    if (lowerString.includes('child') || lowerString.includes('children')) types.push('child');

    return types.length > 0 ? types : null;
  }

  /**
   * Parse size restrictions from row
   */
  private parseSizeRestriction(row: FloridaAPLRow): any {
    const packageSize = row['Package Size'] || row.Size || row['Container Size'] || row.size;
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
   * Parse brand restrictions (including contract brands for formula)
   */
  private parseBrandRestriction(row: FloridaAPLRow): any {
    const brand = row.Brand || row['Brand Name'];
    const contractBrand = row['Contract Brand'] || row.contractBrand;

    if (contractBrand) {
      // Formula contract brand (exclusive)
      return {
        contractBrand: String(contractBrand),
        contractStartDate: this.config.formulaContractEffectiveDate || new Date('2026-02-01'),
        contractEndDate: null, // Unknown until next contract
      };
    }

    if (brand) {
      // Regular brand restriction
      return {
        allowedBrands: [String(brand)],
      };
    }

    return null;
  }

  /**
   * Parse additional restrictions (state-specific)
   */
  private parseAdditionalRestrictions(row: FloridaAPLRow): Record<string, any> | null {
    const restrictions: Record<string, any> = {};

    // FLORIDA POLICY: No artificial dyes (effective Oct 2025)
    restrictions.noArtificialDyes = true;

    // Whole grain requirements for cereals
    const category = row.Category || row['Food Category'] || '';
    if (category.toLowerCase().includes('cereal')) {
      restrictions.wholeGrainRequired = true;
    }

    // Sugar limits
    if (row.Notes?.toLowerCase().includes('sugar') ||
        row.Remarks?.toLowerCase().includes('sugar')) {
      restrictions.sugarLimit = true;
    }

    return Object.keys(restrictions).length > 0 ? restrictions : null;
  }

  /**
   * Build notes field with Florida-specific information
   */
  private buildNotes(row: FloridaAPLRow): string | undefined {
    const notes: string[] = [];

    // Add original notes
    if (row.Notes) notes.push(String(row.Notes));
    if (row.Remarks) notes.push(String(row.Remarks));

    // Add Florida policy notes
    notes.push('FL Policy: No artificial dyes (effective Oct 2025)');

    // Check if this is during phased rollout period
    const now = new Date();
    const phasedStart = new Date('2025-10-01');
    const phasedEnd = new Date('2026-03-31');
    if (now >= phasedStart && now <= phasedEnd) {
      notes.push('FL: Phased policy rollout in effect (Oct 2025 - Mar 2026)');
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
        ['FL', 'fis']
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
          'FL',
          'fis',
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
    console.log('\n📊 Florida APL Ingestion Statistics:');
    console.log(`   Total Rows: ${this.stats.totalRows}`);
    console.log(`   Valid Entries: ${this.stats.validEntries}`);
    console.log(`   Invalid Entries: ${this.stats.invalidEntries}`);
    console.log(`   Additions: ${this.stats.additions}`);
    console.log(`   Updates: ${this.stats.updates}`);
    console.log(`   Rejected (Artificial Dyes): ${this.stats.rejectedArtificialDyes}`);
    console.log(`   Contract Formula Changes: ${this.stats.contractFormulaChanges}`);
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
 * Convenience function to run Florida APL ingestion
 */
export async function ingestFloridaAPL(
  config: FloridaAPLConfig
): Promise<IngestionStats> {
  const service = new FloridaAPLIngestionService(config);
  return await service.ingest();
}
