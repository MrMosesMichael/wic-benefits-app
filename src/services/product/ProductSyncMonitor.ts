/**
 * Product Sync Monitor
 *
 * Monitors product database coverage, data freshness, and sync health.
 * Provides alerts and metrics for product database quality.
 *
 * @module services/product/ProductSyncMonitor
 */

import { ProductRepository } from '../../database/ProductRepository';
import { ProductCoverageStats } from '../../types/product.types';

/**
 * Coverage threshold configuration
 */
export interface CoverageThresholds {
  /** Minimum acceptable coverage percentage */
  minimumCoverage: number;

  /** Target coverage percentage */
  targetCoverage: number;

  /** Critical coverage percentage (triggers alerts) */
  criticalCoverage: number;

  /** Minimum products with images percentage */
  minimumImagesPercentage: number;

  /** Minimum products with nutrition percentage */
  minimumNutritionPercentage: number;
}

/**
 * Freshness threshold configuration
 */
export interface FreshnessThresholds {
  /** Maximum age for product data (days) */
  maxProductAgeDays: number;

  /** Maximum age for images (days) */
  maxImageAgeDays: number;

  /** Warn if no sync in X hours */
  warnNoSyncHours: number;

  /** Alert if no sync in X hours */
  alertNoSyncHours: number;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  timestamp: Date;
  coverage: CoverageHealthCheck;
  freshness: FreshnessHealthCheck;
  quality: QualityHealthCheck;
  alerts: HealthAlert[];
  score: number; // 0-100
}

/**
 * Coverage health check
 */
export interface CoverageHealthCheck {
  currentCoverage: number;
  targetCoverage: number;
  coverageGap: number; // percentage points below target
  status: 'healthy' | 'warning' | 'critical';
  totalProducts: number;
  productsWithImages: number;
  productsWithNutrition: number;
}

/**
 * Freshness health check
 */
export interface FreshnessHealthCheck {
  lastSyncAge: number; // hours
  status: 'healthy' | 'warning' | 'critical';
  staleProducts: number; // products older than threshold
  stalePercentage: number;
}

/**
 * Quality health check
 */
export interface QualityHealthCheck {
  verifiedPercentage: number;
  imageQuality: number; // 0-100
  nutritionQuality: number; // 0-100
  status: 'healthy' | 'warning' | 'critical';
}

/**
 * Health alert
 */
export interface HealthAlert {
  severity: 'info' | 'warning' | 'critical';
  category: 'coverage' | 'freshness' | 'quality';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Monitor configuration
 */
export interface MonitorConfig {
  repository: ProductRepository;
  coverageThresholds: CoverageThresholds;
  freshnessThresholds: FreshnessThresholds;
}

/**
 * Product Sync Monitor
 *
 * Monitors product database health and generates alerts
 */
export class ProductSyncMonitor {
  private config: MonitorConfig;
  private lastHealthCheck?: HealthCheckResult;

  constructor(config: MonitorConfig) {
    this.config = config;
  }

  /**
   * Run comprehensive health check
   */
  async checkHealth(): Promise<HealthCheckResult> {
    console.log('🏥 Running product database health check...');

    const timestamp = new Date();
    const alerts: HealthAlert[] = [];

    // Get current stats
    const stats = await this.config.repository.getCoverageStats();

    // Check coverage
    const coverage = await this.checkCoverage(stats, alerts);

    // Check freshness
    const freshness = await this.checkFreshness(stats, alerts);

    // Check quality
    const quality = await this.checkQuality(stats, alerts);

    // Calculate overall health score
    const score = this.calculateHealthScore(coverage, freshness, quality);

    // Determine overall health
    const healthy = score >= 80 && alerts.filter(a => a.severity === 'critical').length === 0;

    const result: HealthCheckResult = {
      healthy,
      timestamp,
      coverage,
      freshness,
      quality,
      alerts,
      score,
    };

    this.lastHealthCheck = result;

    // Log results
    this.logHealthCheck(result);

    return result;
  }

  /**
   * Check coverage health
   */
  private async checkCoverage(
    stats: ProductCoverageStats,
    alerts: HealthAlert[]
  ): Promise<CoverageHealthCheck> {
    // TODO: Get total APL UPCs
    const totalAPLUPCs = 10000; // Placeholder
    const currentCoverage = (stats.totalProducts / totalAPLUPCs) * 100;
    const coverageGap = this.config.coverageThresholds.targetCoverage - currentCoverage;

    const imagePercentage = (stats.productsWithImages / stats.totalProducts) * 100;
    const nutritionPercentage = (stats.productsWithNutrition / stats.totalProducts) * 100;

    // Determine status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (currentCoverage < this.config.coverageThresholds.criticalCoverage) {
      status = 'critical';
      alerts.push({
        severity: 'critical',
        category: 'coverage',
        message: `Critical: Product coverage at ${currentCoverage.toFixed(1)}% (minimum: ${this.config.coverageThresholds.criticalCoverage}%)`,
        timestamp: new Date(),
        metadata: { currentCoverage, targetCoverage: this.config.coverageThresholds.criticalCoverage },
      });
    } else if (currentCoverage < this.config.coverageThresholds.minimumCoverage) {
      status = 'warning';
      alerts.push({
        severity: 'warning',
        category: 'coverage',
        message: `Warning: Product coverage at ${currentCoverage.toFixed(1)}% (target: ${this.config.coverageThresholds.minimumCoverage}%)`,
        timestamp: new Date(),
        metadata: { currentCoverage, targetCoverage: this.config.coverageThresholds.minimumCoverage },
      });
    }

    // Check image coverage
    if (imagePercentage < this.config.coverageThresholds.minimumImagesPercentage) {
      alerts.push({
        severity: 'warning',
        category: 'coverage',
        message: `Warning: Only ${imagePercentage.toFixed(1)}% of products have images`,
        timestamp: new Date(),
        metadata: { imagePercentage },
      });
    }

    // Check nutrition coverage
    if (nutritionPercentage < this.config.coverageThresholds.minimumNutritionPercentage) {
      alerts.push({
        severity: 'info',
        category: 'coverage',
        message: `Info: Only ${nutritionPercentage.toFixed(1)}% of products have nutrition data`,
        timestamp: new Date(),
        metadata: { nutritionPercentage },
      });
    }

    return {
      currentCoverage,
      targetCoverage: this.config.coverageThresholds.targetCoverage,
      coverageGap,
      status,
      totalProducts: stats.totalProducts,
      productsWithImages: stats.productsWithImages,
      productsWithNutrition: stats.productsWithNutrition,
    };
  }

  /**
   * Check freshness health
   */
  private async checkFreshness(
    stats: ProductCoverageStats,
    alerts: HealthAlert[]
  ): Promise<FreshnessHealthCheck> {
    // Check last sync time
    const lastSync = stats.lastUpdated;
    const now = new Date();
    const lastSyncAge = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60); // hours

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (lastSyncAge > this.config.freshnessThresholds.alertNoSyncHours) {
      status = 'critical';
      alerts.push({
        severity: 'critical',
        category: 'freshness',
        message: `Critical: No sync in ${lastSyncAge.toFixed(1)} hours`,
        timestamp: new Date(),
        metadata: { lastSyncAge, threshold: this.config.freshnessThresholds.alertNoSyncHours },
      });
    } else if (lastSyncAge > this.config.freshnessThresholds.warnNoSyncHours) {
      status = 'warning';
      alerts.push({
        severity: 'warning',
        category: 'freshness',
        message: `Warning: No sync in ${lastSyncAge.toFixed(1)} hours`,
        timestamp: new Date(),
        metadata: { lastSyncAge, threshold: this.config.freshnessThresholds.warnNoSyncHours },
      });
    }

    // TODO: Check for stale products
    const staleProducts = 0;
    const stalePercentage = 0;

    return {
      lastSyncAge,
      status,
      staleProducts,
      stalePercentage,
    };
  }

  /**
   * Check quality health
   */
  private async checkQuality(
    stats: ProductCoverageStats,
    alerts: HealthAlert[]
  ): Promise<QualityHealthCheck> {
    const verifiedPercentage = (stats.verifiedProducts / stats.totalProducts) * 100;
    const imageQuality = (stats.productsWithImages / stats.totalProducts) * 100;
    const nutritionQuality = (stats.productsWithNutrition / stats.totalProducts) * 100;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (verifiedPercentage < 50) {
      status = 'warning';
      alerts.push({
        severity: 'warning',
        category: 'quality',
        message: `Warning: Only ${verifiedPercentage.toFixed(1)}% of products are verified`,
        timestamp: new Date(),
        metadata: { verifiedPercentage },
      });
    }

    return {
      verifiedPercentage,
      imageQuality,
      nutritionQuality,
      status,
    };
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(
    coverage: CoverageHealthCheck,
    freshness: FreshnessHealthCheck,
    quality: QualityHealthCheck
  ): number {
    // Coverage weight: 50%
    const coverageScore = Math.min(
      100,
      (coverage.currentCoverage / coverage.targetCoverage) * 100
    );

    // Freshness weight: 30%
    const freshnessScore =
      freshness.status === 'healthy' ? 100 : freshness.status === 'warning' ? 70 : 30;

    // Quality weight: 20%
    const qualityScore = (quality.imageQuality + quality.nutritionQuality + quality.verifiedPercentage) / 3;

    return coverageScore * 0.5 + freshnessScore * 0.3 + qualityScore * 0.2;
  }

  /**
   * Log health check results
   */
  private logHealthCheck(result: HealthCheckResult): void {
    console.log('');
    console.log('📊 Health Check Results:');
    console.log('========================');
    console.log(`Overall Health: ${result.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    console.log(`Health Score: ${result.score.toFixed(1)}/100`);
    console.log('');
    console.log('Coverage:');
    console.log(`  Status: ${this.statusEmoji(result.coverage.status)} ${result.coverage.status.toUpperCase()}`);
    console.log(`  Current: ${result.coverage.currentCoverage.toFixed(1)}%`);
    console.log(`  Target: ${result.coverage.targetCoverage}%`);
    console.log(`  Total Products: ${result.coverage.totalProducts.toLocaleString()}`);
    console.log(`  With Images: ${result.coverage.productsWithImages.toLocaleString()}`);
    console.log(`  With Nutrition: ${result.coverage.productsWithNutrition.toLocaleString()}`);
    console.log('');
    console.log('Freshness:');
    console.log(`  Status: ${this.statusEmoji(result.freshness.status)} ${result.freshness.status.toUpperCase()}`);
    console.log(`  Last Sync: ${result.freshness.lastSyncAge.toFixed(1)} hours ago`);
    console.log('');
    console.log('Quality:');
    console.log(`  Status: ${this.statusEmoji(result.quality.status)} ${result.quality.status.toUpperCase()}`);
    console.log(`  Verified: ${result.quality.verifiedPercentage.toFixed(1)}%`);
    console.log(`  Image Quality: ${result.quality.imageQuality.toFixed(1)}%`);
    console.log(`  Nutrition Quality: ${result.quality.nutritionQuality.toFixed(1)}%`);
    console.log('');

    if (result.alerts.length > 0) {
      console.log('Alerts:');
      for (const alert of result.alerts) {
        console.log(`  ${this.severityEmoji(alert.severity)} ${alert.message}`);
      }
      console.log('');
    }
  }

  /**
   * Get status emoji
   */
  private statusEmoji(status: 'healthy' | 'warning' | 'critical'): string {
    return status === 'healthy' ? '✅' : status === 'warning' ? '⚠️' : '❌';
  }

  /**
   * Get severity emoji
   */
  private severityEmoji(severity: 'info' | 'warning' | 'critical'): string {
    return severity === 'info' ? 'ℹ️' : severity === 'warning' ? '⚠️' : '❌';
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck(): HealthCheckResult | undefined {
    return this.lastHealthCheck;
  }

  /**
   * Get alerts from last health check
   */
  getAlerts(): HealthAlert[] {
    return this.lastHealthCheck?.alerts || [];
  }

  /**
   * Get critical alerts
   */
  getCriticalAlerts(): HealthAlert[] {
    return this.getAlerts().filter(a => a.severity === 'critical');
  }
}

/**
 * Create monitor with default config
 */
export function createProductSyncMonitor(
  repository: ProductRepository,
  options: Partial<MonitorConfig> = {}
): ProductSyncMonitor {
  const config: MonitorConfig = {
    repository,
    coverageThresholds: {
      minimumCoverage: 85,
      targetCoverage: 95,
      criticalCoverage: 70,
      minimumImagesPercentage: 80,
      minimumNutritionPercentage: 60,
    },
    freshnessThresholds: {
      maxProductAgeDays: 90,
      maxImageAgeDays: 180,
      warnNoSyncHours: 48,
      alertNoSyncHours: 72,
    },
    ...options,
  };

  return new ProductSyncMonitor(config);
}
