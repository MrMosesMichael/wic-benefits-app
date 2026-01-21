/**
 * APL Coverage Service
 *
 * Ensures 95%+ coverage of WIC-eligible UPCs from APL database in product database.
 * Identifies missing UPCs and triggers sync operations to fill gaps.
 *
 * @module services/product/APLCoverageService
 */

import { Pool } from 'pg';
import { ProductRepository } from '../../database/ProductRepository';
import { ProductSyncService, createProductSyncService } from './ProductSyncService';
import { ImageStorageService } from './ImageStorageService';

/**
 * Coverage analysis result
 */
export interface CoverageAnalysis {
  /** Total UPCs in APL database */
  totalAPLUPCs: number;

  /** UPCs present in product database */
  coveredUPCs: number;

  /** UPCs missing from product database */
  missingUPCs: number;

  /** Coverage percentage (0-100) */
  coveragePercent: number;

  /** Coverage by state */
  stateBreakdown: StatesCoverage[];

  /** Coverage by benefit category */
  categoryBreakdown: CategoryCoverage[];

  /** List of missing UPCs (limited) */
  missingUPCList: string[];

  /** Analysis timestamp */
  analyzedAt: Date;

  /** Meets 95% target */
  meetsTarget: boolean;
}

/**
 * State coverage breakdown
 */
export interface StatesCoverage {
  state: string;
  totalUPCs: number;
  coveredUPCs: number;
  missingUPCs: number;
  coveragePercent: number;
}

/**
 * Category coverage breakdown
 */
export interface CategoryCoverage {
  category: string;
  totalUPCs: number;
  coveredUPCs: number;
  missingUPCs: number;
  coveragePercent: number;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Sync recommendation based on coverage gaps
 */
export interface SyncRecommendation {
  shouldSync: boolean;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  estimatedUPCs: number;
  estimatedDuration: string;
  targetStates?: string[];
  targetCategories?: string[];
  reason: string;
}

/**
 * APL Coverage Service Configuration
 */
export interface APLCoverageConfig {
  /** Database pool for APL queries */
  pool: Pool;

  /** Product repository */
  productRepository: ProductRepository;

  /** Coverage target percentage */
  targetCoverage: number;

  /** Priority states to focus on */
  priorityStates?: string[];

  /** Priority categories (e.g., formula) */
  priorityCategories?: string[];
}

/**
 * APL Coverage Service
 *
 * Analyzes product database coverage against APL UPCs
 * and orchestrates sync operations to achieve 95%+ coverage.
 */
export class APLCoverageService {
  private config: APLCoverageConfig;

  constructor(config: APLCoverageConfig) {
    this.config = {
      targetCoverage: 95.0,
      priorityStates: ['MI', 'NC', 'FL', 'OR'],
      priorityCategories: ['formula', 'infant_formula'],
      ...config,
    };
  }

  /**
   * Analyze current coverage of APL UPCs
   *
   * Compares UPCs in apl_entries table with products table
   * to determine coverage percentage and gaps.
   *
   * @returns Coverage analysis result
   */
  async analyzeCoverage(): Promise<CoverageAnalysis> {
    console.log('📊 Analyzing APL UPC coverage...');

    // Get total unique UPCs from APL
    const totalAPLUPCsQuery = `
      SELECT COUNT(DISTINCT upc) as count
      FROM apl_entries
      WHERE (expiration_date IS NULL OR expiration_date > NOW())
        AND effective_date <= NOW()
    `;
    const totalResult = await this.config.pool.query(totalAPLUPCsQuery);
    const totalAPLUPCs = parseInt(totalResult.rows[0].count, 10);

    // Get covered UPCs (exist in both APL and products)
    const coveredUPCsQuery = `
      SELECT COUNT(DISTINCT a.upc) as count
      FROM apl_entries a
      INNER JOIN products p ON (
        p.upc = a.upc OR
        p.upc_normalized = a.upc OR
        LPAD(p.upc, 12, '0') = LPAD(a.upc, 12, '0')
      )
      WHERE (a.expiration_date IS NULL OR a.expiration_date > NOW())
        AND a.effective_date <= NOW()
    `;
    const coveredResult = await this.config.pool.query(coveredUPCsQuery);
    const coveredUPCs = parseInt(coveredResult.rows[0].count, 10);

    // Calculate missing
    const missingUPCs = totalAPLUPCs - coveredUPCs;
    const coveragePercent = totalAPLUPCs > 0
      ? (coveredUPCs / totalAPLUPCs) * 100
      : 0;

    // Get state breakdown
    const stateBreakdown = await this.getStateBreakdown();

    // Get category breakdown
    const categoryBreakdown = await this.getCategoryBreakdown();

    // Get sample of missing UPCs
    const missingUPCList = await this.getMissingUPCs(1000);

    const analysis: CoverageAnalysis = {
      totalAPLUPCs,
      coveredUPCs,
      missingUPCs,
      coveragePercent,
      stateBreakdown,
      categoryBreakdown,
      missingUPCList,
      analyzedAt: new Date(),
      meetsTarget: coveragePercent >= this.config.targetCoverage,
    };

    console.log(`✅ Coverage analysis complete:`);
    console.log(`   Total APL UPCs: ${totalAPLUPCs.toLocaleString()}`);
    console.log(`   Covered: ${coveredUPCs.toLocaleString()}`);
    console.log(`   Missing: ${missingUPCs.toLocaleString()}`);
    console.log(`   Coverage: ${coveragePercent.toFixed(2)}%`);
    console.log(`   Target: ${this.config.targetCoverage}%`);
    console.log(`   Meets target: ${analysis.meetsTarget ? 'YES ✓' : 'NO ✗'}`);

    return analysis;
  }

  /**
   * Get coverage breakdown by state
   */
  private async getStateBreakdown(): Promise<StatesCoverage[]> {
    const query = `
      SELECT
        a.state,
        COUNT(DISTINCT a.upc) as total_upcs,
        COUNT(DISTINCT CASE WHEN p.upc IS NOT NULL THEN a.upc END) as covered_upcs
      FROM apl_entries a
      LEFT JOIN products p ON (
        p.upc = a.upc OR
        p.upc_normalized = a.upc OR
        LPAD(p.upc, 12, '0') = LPAD(a.upc, 12, '0')
      )
      WHERE (a.expiration_date IS NULL OR a.expiration_date > NOW())
        AND a.effective_date <= NOW()
      GROUP BY a.state
      ORDER BY total_upcs DESC
    `;

    const result = await this.config.pool.query(query);

    return result.rows.map(row => {
      const totalUPCs = parseInt(row.total_upcs, 10);
      const coveredUPCs = parseInt(row.covered_upcs, 10);
      const missingUPCs = totalUPCs - coveredUPCs;
      const coveragePercent = totalUPCs > 0 ? (coveredUPCs / totalUPCs) * 100 : 0;

      return {
        state: row.state,
        totalUPCs,
        coveredUPCs,
        missingUPCs,
        coveragePercent,
      };
    });
  }

  /**
   * Get coverage breakdown by benefit category
   */
  private async getCategoryBreakdown(): Promise<CategoryCoverage[]> {
    const query = `
      SELECT
        a.benefit_category,
        COUNT(DISTINCT a.upc) as total_upcs,
        COUNT(DISTINCT CASE WHEN p.upc IS NOT NULL THEN a.upc END) as covered_upcs
      FROM apl_entries a
      LEFT JOIN products p ON (
        p.upc = a.upc OR
        p.upc_normalized = a.upc OR
        LPAD(p.upc, 12, '0') = LPAD(a.upc, 12, '0')
      )
      WHERE (a.expiration_date IS NULL OR a.expiration_date > NOW())
        AND a.effective_date <= NOW()
      GROUP BY a.benefit_category
      ORDER BY total_upcs DESC
    `;

    const result = await this.config.pool.query(query);

    return result.rows.map(row => {
      const totalUPCs = parseInt(row.total_upcs, 10);
      const coveredUPCs = parseInt(row.covered_upcs, 10);
      const missingUPCs = totalUPCs - coveredUPCs;
      const coveragePercent = totalUPCs > 0 ? (coveredUPCs / totalUPCs) * 100 : 0;

      // Determine priority
      const category = row.benefit_category.toLowerCase();
      let priority: 'high' | 'medium' | 'low' = 'low';

      if (
        category.includes('formula') ||
        category.includes('infant')
      ) {
        priority = 'high';
      } else if (
        category.includes('milk') ||
        category.includes('dairy') ||
        category.includes('cereal')
      ) {
        priority = 'medium';
      }

      return {
        category: row.benefit_category,
        totalUPCs,
        coveredUPCs,
        missingUPCs,
        coveragePercent,
        priority,
      };
    });
  }

  /**
   * Get list of missing UPCs
   *
   * @param limit - Maximum number of UPCs to return
   * @returns Array of missing UPCs
   */
  async getMissingUPCs(limit = 10000): Promise<string[]> {
    const query = `
      SELECT DISTINCT a.upc
      FROM apl_entries a
      LEFT JOIN products p ON (
        p.upc = a.upc OR
        p.upc_normalized = a.upc OR
        LPAD(p.upc, 12, '0') = LPAD(a.upc, 12, '0')
      )
      WHERE p.upc IS NULL
        AND (a.expiration_date IS NULL OR a.expiration_date > NOW())
        AND a.effective_date <= NOW()
      LIMIT $1
    `;

    const result = await this.config.pool.query(query, [limit]);
    return result.rows.map(row => row.upc);
  }

  /**
   * Get sync recommendation based on current coverage
   *
   * @returns Recommendation for sync operation
   */
  async getSyncRecommendation(): Promise<SyncRecommendation> {
    const analysis = await this.analyzeCoverage();

    if (analysis.meetsTarget) {
      return {
        shouldSync: false,
        priority: 'low',
        estimatedUPCs: 0,
        estimatedDuration: '0 minutes',
        reason: `Coverage is at ${analysis.coveragePercent.toFixed(1)}%, which meets the ${this.config.targetCoverage}% target.`,
      };
    }

    // Determine priority
    let priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium';
    if (analysis.coveragePercent < 80) {
      priority = 'urgent';
    } else if (analysis.coveragePercent < 90) {
      priority = 'high';
    }

    // Identify states/categories that need attention
    const lowCoverageStates = analysis.stateBreakdown
      .filter(s => s.coveragePercent < this.config.targetCoverage)
      .map(s => s.state);

    const lowCoverageCategories = analysis.categoryBreakdown
      .filter(c => c.coveragePercent < this.config.targetCoverage && c.priority === 'high')
      .map(c => c.category);

    // Estimate duration (rough estimate: 1000 UPCs per minute)
    const estimatedMinutes = Math.ceil(analysis.missingUPCs / 1000);
    const estimatedDuration = estimatedMinutes < 60
      ? `${estimatedMinutes} minutes`
      : `${Math.round(estimatedMinutes / 60)} hours`;

    const reason = [
      `Coverage is at ${analysis.coveragePercent.toFixed(1)}%, below ${this.config.targetCoverage}% target.`,
      `${analysis.missingUPCs.toLocaleString()} UPCs need to be synced.`,
      lowCoverageStates.length > 0 ? `Priority states: ${lowCoverageStates.join(', ')}` : null,
      lowCoverageCategories.length > 0 ? `Priority categories: ${lowCoverageCategories.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join(' ');

    return {
      shouldSync: true,
      priority,
      estimatedUPCs: analysis.missingUPCs,
      estimatedDuration,
      targetStates: lowCoverageStates.length > 0 ? lowCoverageStates : undefined,
      targetCategories: lowCoverageCategories.length > 0 ? lowCoverageCategories : undefined,
      reason,
    };
  }

  /**
   * Auto-sync missing UPCs to reach target coverage
   *
   * @param options - Sync options
   * @returns Sync result
   */
  async autoSyncToTarget(options: {
    batchSize?: number;
    concurrency?: number;
    syncImages?: boolean;
    imageService?: ImageStorageService;
    maxUPCs?: number;
  } = {}) {
    console.log(`🎯 Auto-syncing to reach ${this.config.targetCoverage}% coverage...`);

    // Get current coverage
    const analysis = await this.analyzeCoverage();

    if (analysis.meetsTarget) {
      console.log(`✓ Already at target coverage (${analysis.coveragePercent.toFixed(1)}%)`);
      return {
        status: 'already_at_target',
        analysis,
      };
    }

    // Get missing UPCs
    const missingUPCs = await this.getMissingUPCs(options.maxUPCs || 100000);

    console.log(`📋 Found ${missingUPCs.length.toLocaleString()} missing UPCs to sync`);

    // Create sync service
    const syncService = createProductSyncService(this.config.productRepository, {
      sources: ['open_food_facts', 'upc_database'],
      batchSize: options.batchSize || 100,
      concurrency: options.concurrency || 5,
      skipExisting: true,
      syncImages: options.syncImages || false,
      imageService: options.imageService,
      targetUPCs: missingUPCs,
    });

    // Run sync
    const syncResult = await syncService.sync();

    // Re-analyze coverage
    const newAnalysis = await this.analyzeCoverage();

    console.log('');
    console.log('📊 Coverage Update:');
    console.log(`   Before: ${analysis.coveragePercent.toFixed(2)}%`);
    console.log(`   After: ${newAnalysis.coveragePercent.toFixed(2)}%`);
    console.log(`   Improvement: +${(newAnalysis.coveragePercent - analysis.coveragePercent).toFixed(2)}%`);
    console.log(`   Meets target: ${newAnalysis.meetsTarget ? 'YES ✓' : 'NO ✗'}`);

    return {
      status: 'completed',
      beforeAnalysis: analysis,
      afterAnalysis: newAnalysis,
      syncResult,
    };
  }

  /**
   * Generate coverage report
   *
   * @param format - Report format (text, json, markdown)
   * @returns Formatted report string
   */
  async generateReport(format: 'text' | 'json' | 'markdown' = 'text'): Promise<string> {
    const analysis = await this.analyzeCoverage();
    const recommendation = await this.getSyncRecommendation();

    if (format === 'json') {
      return JSON.stringify({ analysis, recommendation }, null, 2);
    }

    if (format === 'markdown') {
      return this.formatMarkdownReport(analysis, recommendation);
    }

    // Text format (default)
    return this.formatTextReport(analysis, recommendation);
  }

  /**
   * Format text report
   */
  private formatTextReport(analysis: CoverageAnalysis, recommendation: SyncRecommendation): string {
    const lines = [];

    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('  WIC APL Product Coverage Report');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`Generated: ${analysis.analyzedAt.toLocaleString()}`);
    lines.push('');

    // Overall coverage
    lines.push('OVERALL COVERAGE');
    lines.push('─────────────────────────────────────────────────────────');
    lines.push(`Total APL UPCs:        ${analysis.totalAPLUPCs.toLocaleString()}`);
    lines.push(`Covered UPCs:          ${analysis.coveredUPCs.toLocaleString()}`);
    lines.push(`Missing UPCs:          ${analysis.missingUPCs.toLocaleString()}`);
    lines.push(`Coverage Percentage:   ${analysis.coveragePercent.toFixed(2)}%`);
    lines.push(`Target:                ${this.config.targetCoverage}%`);
    lines.push(`Status:                ${analysis.meetsTarget ? '✓ MEETS TARGET' : '✗ BELOW TARGET'}`);
    lines.push('');

    // State breakdown
    lines.push('COVERAGE BY STATE');
    lines.push('─────────────────────────────────────────────────────────');
    for (const state of analysis.stateBreakdown) {
      const status = state.coveragePercent >= this.config.targetCoverage ? '✓' : '✗';
      lines.push(
        `${state.state.padEnd(4)} ${status}  ` +
        `${state.coveragePercent.toFixed(1).padStart(5)}%  ` +
        `(${state.coveredUPCs.toLocaleString()}/${state.totalUPCs.toLocaleString()})`
      );
    }
    lines.push('');

    // Category breakdown (top 10)
    lines.push('COVERAGE BY CATEGORY (Top 10)');
    lines.push('─────────────────────────────────────────────────────────');
    for (const cat of analysis.categoryBreakdown.slice(0, 10)) {
      const status = cat.coveragePercent >= this.config.targetCoverage ? '✓' : '✗';
      const priority = cat.priority === 'high' ? '⚠' : ' ';
      lines.push(
        `${priority} ${status}  ${cat.category.substring(0, 30).padEnd(30)}  ` +
        `${cat.coveragePercent.toFixed(1).padStart(5)}%  ` +
        `(${cat.coveredUPCs.toLocaleString()}/${cat.totalUPCs.toLocaleString()})`
      );
    }
    lines.push('');

    // Recommendation
    lines.push('SYNC RECOMMENDATION');
    lines.push('─────────────────────────────────────────────────────────');
    lines.push(`Should Sync:           ${recommendation.shouldSync ? 'YES' : 'NO'}`);
    lines.push(`Priority:              ${recommendation.priority.toUpperCase()}`);
    lines.push(`Estimated UPCs:        ${recommendation.estimatedUPCs.toLocaleString()}`);
    lines.push(`Estimated Duration:    ${recommendation.estimatedDuration}`);
    lines.push('');
    lines.push(`Reason: ${recommendation.reason}`);
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Format markdown report
   */
  private formatMarkdownReport(analysis: CoverageAnalysis, recommendation: SyncRecommendation): string {
    const lines = [];

    lines.push('# WIC APL Product Coverage Report');
    lines.push('');
    lines.push(`**Generated:** ${analysis.analyzedAt.toLocaleString()}`);
    lines.push('');

    // Overall coverage
    lines.push('## Overall Coverage');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total APL UPCs | ${analysis.totalAPLUPCs.toLocaleString()} |`);
    lines.push(`| Covered UPCs | ${analysis.coveredUPCs.toLocaleString()} |`);
    lines.push(`| Missing UPCs | ${analysis.missingUPCs.toLocaleString()} |`);
    lines.push(`| Coverage Percentage | ${analysis.coveragePercent.toFixed(2)}% |`);
    lines.push(`| Target | ${this.config.targetCoverage}% |`);
    lines.push(`| Status | ${analysis.meetsTarget ? '✓ MEETS TARGET' : '✗ BELOW TARGET'} |`);
    lines.push('');

    // State breakdown
    lines.push('## Coverage by State');
    lines.push('');
    lines.push('| State | Coverage | Covered | Total | Status |');
    lines.push('|-------|----------|---------|-------|--------|');
    for (const state of analysis.stateBreakdown) {
      const status = state.coveragePercent >= this.config.targetCoverage ? '✓' : '✗';
      lines.push(
        `| ${state.state} | ${state.coveragePercent.toFixed(1)}% | ` +
        `${state.coveredUPCs.toLocaleString()} | ${state.totalUPCs.toLocaleString()} | ${status} |`
      );
    }
    lines.push('');

    // Category breakdown
    lines.push('## Coverage by Category');
    lines.push('');
    lines.push('| Category | Priority | Coverage | Covered | Total | Status |');
    lines.push('|----------|----------|----------|---------|-------|--------|');
    for (const cat of analysis.categoryBreakdown.slice(0, 15)) {
      const status = cat.coveragePercent >= this.config.targetCoverage ? '✓' : '✗';
      lines.push(
        `| ${cat.category} | ${cat.priority.toUpperCase()} | ${cat.coveragePercent.toFixed(1)}% | ` +
        `${cat.coveredUPCs.toLocaleString()} | ${cat.totalUPCs.toLocaleString()} | ${status} |`
      );
    }
    lines.push('');

    // Recommendation
    lines.push('## Sync Recommendation');
    lines.push('');
    lines.push(`**Should Sync:** ${recommendation.shouldSync ? 'YES' : 'NO'}`);
    lines.push('');
    lines.push(`**Priority:** ${recommendation.priority.toUpperCase()}`);
    lines.push('');
    lines.push(`**Estimated UPCs:** ${recommendation.estimatedUPCs.toLocaleString()}`);
    lines.push('');
    lines.push(`**Estimated Duration:** ${recommendation.estimatedDuration}`);
    lines.push('');
    lines.push(`**Reason:** ${recommendation.reason}`);
    lines.push('');

    return lines.join('\n');
  }
}

/**
 * Create APL coverage service with default configuration
 */
export function createAPLCoverageService(
  pool: Pool,
  productRepository: ProductRepository,
  options: Partial<APLCoverageConfig> = {}
): APLCoverageService {
  return new APLCoverageService({
    pool,
    productRepository,
    targetCoverage: 95.0,
    ...options,
  });
}
