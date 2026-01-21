/**
 * Eligibility Service
 *
 * High-level service for checking WIC product eligibility.
 * Integrates APL database lookups with rules engine evaluation.
 *
 * @module services/eligibility/EligibilityService
 */

import { Pool } from 'pg';
import { APLEntry, StateCode, ParticipantType } from '../../types/apl.types';
import {
  EligibilityRulesEngine,
  EligibilityEvaluation,
  ProductEligibilityInput,
  HouseholdContext,
} from './EligibilityRulesEngine';
import { StateRulesConfig } from './StateRulesConfig';
import { normalizeUPC } from '../../utils/upc.utils';

/**
 * Eligibility check request
 */
export interface EligibilityCheckRequest {
  /** UPC to check */
  upc: string;

  /** State to check in */
  state: StateCode;

  /** Product details (if known) */
  product?: {
    size?: number;
    sizeUnit?: string;
    brand?: string;
    category?: string;
  };

  /** Household context (optional, for participant targeting) */
  household?: HouseholdContext;

  /** Use cached APL data if available */
  useCache?: boolean;

  /** Include alternative products if not eligible */
  includeAlternatives?: boolean;
}

/**
 * Batch eligibility check request
 */
export interface BatchEligibilityCheckRequest {
  /** UPCs to check */
  upcs: string[];

  /** State to check in */
  state: StateCode;

  /** Household context */
  household?: HouseholdContext;

  /** Use cached APL data */
  useCache?: boolean;
}

/**
 * Eligibility check response
 */
export interface EligibilityCheckResponse extends EligibilityEvaluation {
  /** Cache hit indicator */
  fromCache?: boolean;

  /** Data age in milliseconds */
  dataAgeMs?: number;

  /** Last APL sync timestamp */
  lastSync?: Date;
}

/**
 * Eligibility Service
 *
 * Main service for product eligibility checking.
 */
export class EligibilityService {
  private dbPool: Pool;
  private rulesEngine: EligibilityRulesEngine;
  private cache: Map<string, { entry: APLEntry | null; timestamp: number }>;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
    this.rulesEngine = new EligibilityRulesEngine();
    this.cache = new Map();
  }

  /**
   * Check eligibility for a single product
   */
  async checkEligibility(
    request: EligibilityCheckRequest
  ): Promise<EligibilityCheckResponse> {
    // Normalize UPC
    const normalizedUPC = normalizeUPC(request.upc);

    // Look up APL entry
    const aplEntry = await this.getAPLEntry(
      normalizedUPC,
      request.state,
      request.useCache !== false
    );

    // Build product input
    const productInput: ProductEligibilityInput = {
      upc: normalizedUPC,
      state: request.state,
      actualSize: request.product?.size,
      sizeUnit: request.product?.sizeUnit,
      brand: request.product?.brand,
      category: request.product?.category,
    };

    // Evaluate eligibility
    const evaluation = this.rulesEngine.evaluate(
      productInput,
      aplEntry,
      request.household
    );

    // Get alternatives if not eligible
    if (!evaluation.eligible && request.includeAlternatives) {
      evaluation.alternatives = await this.findAlternatives(
        request.state,
        request.product?.category
      );
    }

    // Get data age
    const syncStatus = await this.getAPLSyncStatus(request.state);

    return {
      ...evaluation,
      fromCache: this.isCached(normalizedUPC, request.state),
      dataAgeMs: syncStatus?.dataAgeMs,
      lastSync: syncStatus?.lastSync,
    };
  }

  /**
   * Check eligibility for multiple products
   */
  async checkEligibilityBatch(
    request: BatchEligibilityCheckRequest
  ): Promise<EligibilityCheckResponse[]> {
    // Normalize UPCs
    const normalizedUPCs = request.upcs.map(upc => normalizeUPC(upc));

    // Look up APL entries in batch
    const aplEntries = await this.getAPLEntriesBatch(
      normalizedUPCs,
      request.state,
      request.useCache !== false
    );

    // Evaluate each product
    const evaluations: EligibilityCheckResponse[] = [];
    const syncStatus = await this.getAPLSyncStatus(request.state);

    for (const upc of normalizedUPCs) {
      const aplEntry = aplEntries.get(upc) || null;

      const productInput: ProductEligibilityInput = {
        upc,
        state: request.state,
      };

      const evaluation = this.rulesEngine.evaluate(
        productInput,
        aplEntry,
        request.household
      );

      evaluations.push({
        ...evaluation,
        fromCache: this.isCached(upc, request.state),
        dataAgeMs: syncStatus?.dataAgeMs,
        lastSync: syncStatus?.lastSync,
      });
    }

    return evaluations;
  }

  /**
   * Get APL entry from database (with caching)
   */
  private async getAPLEntry(
    upc: string,
    state: StateCode,
    useCache: boolean
  ): Promise<APLEntry | null> {
    const cacheKey = `${state}:${upc}`;

    // Check cache
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.entry;
      }
    }

    // Query database
    try {
      const result = await this.dbPool.query<APLEntry>(
        `SELECT
           id,
           state,
           upc,
           eligible,
           benefit_category as "benefitCategory",
           benefit_subcategory as "benefitSubcategory",
           participant_types as "participantTypes",
           size_restriction as "sizeRestriction",
           brand_restriction as "brandRestriction",
           additional_restrictions as "additionalRestrictions",
           effective_date as "effectiveDate",
           expiration_date as "expirationDate",
           notes,
           data_source as "dataSource",
           last_updated as "lastUpdated",
           verified,
           source_hash as "sourceHash",
           created_at as "createdAt",
           updated_at as "updatedAt"
         FROM apl_entries
         WHERE state = $1
           AND upc = $2
           AND (expiration_date IS NULL OR expiration_date > NOW())
           AND effective_date <= NOW()
         ORDER BY last_updated DESC
         LIMIT 1`,
        [state, upc]
      );

      const entry = result.rows.length > 0 ? result.rows[0] : null;

      // Cache result
      this.cache.set(cacheKey, { entry, timestamp: Date.now() });

      return entry;
    } catch (error) {
      console.error('Error fetching APL entry:', error);
      throw new Error(`Failed to fetch APL entry: ${error.message}`);
    }
  }

  /**
   * Get APL entries in batch
   */
  private async getAPLEntriesBatch(
    upcs: string[],
    state: StateCode,
    useCache: boolean
  ): Promise<Map<string, APLEntry | null>> {
    const results = new Map<string, APLEntry | null>();
    const uncachedUPCs: string[] = [];

    // Check cache first
    if (useCache) {
      for (const upc of upcs) {
        const cacheKey = `${state}:${upc}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
          results.set(upc, cached.entry);
        } else {
          uncachedUPCs.push(upc);
        }
      }
    } else {
      uncachedUPCs.push(...upcs);
    }

    // Query database for uncached entries
    if (uncachedUPCs.length > 0) {
      try {
        const result = await this.dbPool.query<APLEntry>(
          `SELECT
             id,
             state,
             upc,
             eligible,
             benefit_category as "benefitCategory",
             benefit_subcategory as "benefitSubcategory",
             participant_types as "participantTypes",
             size_restriction as "sizeRestriction",
             brand_restriction as "brandRestriction",
             additional_restrictions as "additionalRestrictions",
             effective_date as "effectiveDate",
             expiration_date as "expirationDate",
             notes,
             data_source as "dataSource",
             last_updated as "lastUpdated",
             verified,
             source_hash as "sourceHash",
             created_at as "createdAt",
             updated_at as "updatedAt"
           FROM apl_entries
           WHERE state = $1
             AND upc = ANY($2)
             AND (expiration_date IS NULL OR expiration_date > NOW())
             AND effective_date <= NOW()`,
          [state, uncachedUPCs]
        );

        // Map results
        for (const upc of uncachedUPCs) {
          const entry = result.rows.find(row => row.upc === upc) || null;
          results.set(upc, entry);

          // Cache result
          const cacheKey = `${state}:${upc}`;
          this.cache.set(cacheKey, { entry, timestamp: Date.now() });
        }
      } catch (error) {
        console.error('Error fetching APL entries batch:', error);
        throw new Error(`Failed to fetch APL entries: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Get APL sync status
   */
  private async getAPLSyncStatus(
    state: StateCode
  ): Promise<{ dataAgeMs: number; lastSync: Date } | null> {
    try {
      const result = await this.dbPool.query(
        `SELECT
           last_sync_at,
           last_success_at
         FROM apl_sync_status
         WHERE state = $1
         ORDER BY last_sync_at DESC
         LIMIT 1`,
        [state]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const lastSync = new Date(result.rows[0].last_success_at || result.rows[0].last_sync_at);
      const dataAgeMs = Date.now() - lastSync.getTime();

      return { dataAgeMs, lastSync };
    } catch (error) {
      console.error('Error fetching sync status:', error);
      return null;
    }
  }

  /**
   * Find alternative products
   */
  private async findAlternatives(
    state: StateCode,
    category?: string
  ): Promise<string[]> {
    if (!category) return [];

    try {
      const result = await this.dbPool.query(
        `SELECT upc
         FROM apl_entries
         WHERE state = $1
           AND benefit_category = $2
           AND eligible = true
           AND (expiration_date IS NULL OR expiration_date > NOW())
           AND effective_date <= NOW()
         LIMIT 5`,
        [state, category]
      );

      return result.rows.map(row => row.upc);
    } catch (error) {
      console.error('Error finding alternatives:', error);
      return [];
    }
  }

  /**
   * Check if entry is cached
   */
  private isCached(upc: string, state: StateCode): boolean {
    const cacheKey = `${state}:${upc}`;
    const cached = this.cache.get(cacheKey);
    return cached !== undefined && Date.now() - cached.timestamp < this.cacheTTL;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get state policy summary
   */
  getStatePolicySummary(state: StateCode): string {
    return StateRulesConfig.getPolicySummary(state);
  }

  /**
   * Check if state is supported
   */
  isStateSupported(state: StateCode): boolean {
    return StateRulesConfig.isStateSupported(state);
  }

  /**
   * Get supported states
   */
  getSupportedStates(): StateCode[] {
    return ['MI', 'NC', 'FL', 'OR'];
  }
}
