/**
 * Formula Shortage Detection Service
 * A4.2 - Detects formula shortages using availability data patterns
 */

import {
  FormulaProduct,
  FormulaAvailability,
} from '../../types/formula';
import { getFormulaAvailabilityService } from './FormulaAvailabilityService';

/**
 * Shortage severity levels
 */
export enum ShortageSeverity {
  NONE = 'none',           // Widely available
  LOW = 'low',             // Limited availability (50-75% of stores)
  MODERATE = 'moderate',   // Significant shortage (25-50% of stores)
  HIGH = 'high',           // Severe shortage (10-25% of stores)
  CRITICAL = 'critical',   // Critical shortage (<10% of stores)
}

/**
 * Shortage detection result
 */
export interface ShortageDetection {
  upc: string;
  severity: ShortageSeverity;
  availableStoreCount: number;
  totalStoreCount: number;
  availabilityRate: number;  // 0-1
  trend: 'improving' | 'worsening' | 'stable' | 'unknown';
  lastChecked: Date;
  affectedRegions?: string[];  // State codes or zip prefixes
}

/**
 * Shortage analysis options
 */
export interface ShortageAnalysisOptions {
  upc?: string;  // Analyze specific formula
  storeIds?: string[];  // Limit to specific stores
  maxDataAge?: number;  // Max age of data in hours (default: 24)
  includeRegionalAnalysis?: boolean;  // Analyze by region
  trendWindowHours?: number;  // Hours to look back for trend (default: 72)
}

/**
 * Regional shortage data
 */
interface RegionalShortage {
  region: string;  // State code or zip prefix
  availableCount: number;
  totalCount: number;
  severity: ShortageSeverity;
}

/**
 * Service for detecting formula shortages
 */
export class FormulaShortageDetectionService {
  private availabilityService = getFormulaAvailabilityService();
  private historicalData: Map<string, FormulaAvailability[]> = new Map();

  /**
   * Detect shortages across all formulas or specific UPC
   */
  async detectShortages(
    options: ShortageAnalysisOptions = {}
  ): Promise<ShortageDetection[]> {
    const maxAge = options.maxDataAge || 24;

    // Get recent availability data
    const availabilityData = await this.availabilityService.queryAvailability({
      upcs: options.upc ? [options.upc] : undefined,
      storeIds: options.storeIds,
      maxAge,
    });

    if (availabilityData.length === 0) {
      return [];
    }

    // Group by UPC
    const byUpc = this.groupByUpc(availabilityData);

    // Analyze each formula
    const detections: ShortageDetection[] = [];

    for (const [upc, availability] of byUpc.entries()) {
      const detection = await this.analyzeFormula(
        upc,
        availability,
        options
      );
      detections.push(detection);
    }

    return detections;
  }

  /**
   * Detect shortage for a specific formula
   */
  async detectShortage(
    upc: string,
    options: ShortageAnalysisOptions = {}
  ): Promise<ShortageDetection> {
    const detections = await this.detectShortages({
      ...options,
      upc,
    });

    return detections[0] || this.createEmptyDetection(upc);
  }

  /**
   * Analyze a specific formula for shortage
   */
  private async analyzeFormula(
    upc: string,
    availabilityData: FormulaAvailability[],
    options: ShortageAnalysisOptions
  ): Promise<ShortageDetection> {
    // Calculate availability metrics
    const totalStores = availabilityData.length;
    const availableStores = availabilityData.filter((a) => a.inStock).length;
    const availabilityRate = totalStores > 0 ? availableStores / totalStores : 0;

    // Determine severity
    const severity = this.calculateSeverity(availabilityRate);

    // Analyze trend
    const trend = await this.analyzeTrend(
      upc,
      options.trendWindowHours || 72
    );

    // Regional analysis if requested
    let affectedRegions: string[] | undefined;
    if (options.includeRegionalAnalysis) {
      affectedRegions = await this.analyzeRegionalShortages(
        upc,
        availabilityData
      );
    }

    // Store current data for trend analysis
    this.recordHistoricalData(upc, availabilityData);

    return {
      upc,
      severity,
      availableStoreCount: availableStores,
      totalStoreCount: totalStores,
      availabilityRate,
      trend,
      lastChecked: new Date(),
      affectedRegions,
    };
  }

  /**
   * Calculate shortage severity based on availability rate
   */
  private calculateSeverity(availabilityRate: number): ShortageSeverity {
    if (availabilityRate >= 0.75) return ShortageSeverity.NONE;
    if (availabilityRate >= 0.50) return ShortageSeverity.LOW;
    if (availabilityRate >= 0.25) return ShortageSeverity.MODERATE;
    if (availabilityRate >= 0.10) return ShortageSeverity.HIGH;
    return ShortageSeverity.CRITICAL;
  }

  /**
   * Analyze trend over time (improving/worsening/stable)
   */
  private async analyzeTrend(
    upc: string,
    windowHours: number
  ): Promise<'improving' | 'worsening' | 'stable' | 'unknown'> {
    const historicalKey = `trend:${upc}`;
    const history = this.historicalData.get(historicalKey);

    if (!history || history.length < 2) {
      return 'unknown';
    }

    // Filter to window
    const cutoffTime = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const recentData = history.filter((h) => h.lastChecked >= cutoffTime);

    if (recentData.length < 2) {
      return 'unknown';
    }

    // Calculate availability rates at different time points
    const dataPoints = this.groupByTimeWindow(recentData);

    if (dataPoints.length < 2) {
      return 'stable';
    }

    // Calculate trend
    const firstRate = dataPoints[0].rate;
    const lastRate = dataPoints[dataPoints.length - 1].rate;
    const change = lastRate - firstRate;

    // Threshold for significant change: 10%
    if (Math.abs(change) < 0.10) {
      return 'stable';
    }

    return change > 0 ? 'improving' : 'worsening';
  }

  /**
   * Analyze regional shortages (by state)
   */
  private async analyzeRegionalShortages(
    upc: string,
    availabilityData: FormulaAvailability[]
  ): Promise<string[]> {
    // Group by region (would need store data with state info)
    // For now, return empty - would need store service integration
    // TODO: Integrate with store service to get state/region data
    return [];
  }

  /**
   * Group availability data by UPC
   */
  private groupByUpc(
    data: FormulaAvailability[]
  ): Map<string, FormulaAvailability[]> {
    const grouped = new Map<string, FormulaAvailability[]>();

    for (const item of data) {
      const existing = grouped.get(item.upc) || [];
      grouped.set(item.upc, [...existing, item]);
    }

    return grouped;
  }

  /**
   * Group historical data into time windows for trend analysis
   */
  private groupByTimeWindow(
    data: FormulaAvailability[]
  ): Array<{ timestamp: Date; rate: number }> {
    // Sort by time
    const sorted = [...data].sort(
      (a, b) => a.lastChecked.getTime() - b.lastChecked.getTime()
    );

    // Group into 6-hour windows
    const windowMs = 6 * 60 * 60 * 1000;
    const windows = new Map<number, FormulaAvailability[]>();

    for (const item of sorted) {
      const windowKey = Math.floor(item.lastChecked.getTime() / windowMs);
      const existing = windows.get(windowKey) || [];
      windows.set(windowKey, [...existing, item]);
    }

    // Calculate rate for each window
    const dataPoints = [];
    for (const [windowKey, items] of windows.entries()) {
      const inStock = items.filter((i) => i.inStock).length;
      const rate = items.length > 0 ? inStock / items.length : 0;
      dataPoints.push({
        timestamp: new Date(windowKey * windowMs),
        rate,
      });
    }

    return dataPoints;
  }

  /**
   * Record historical data for trend analysis
   */
  private recordHistoricalData(
    upc: string,
    data: FormulaAvailability[]
  ): void {
    const key = `trend:${upc}`;
    const existing = this.historicalData.get(key) || [];

    // Add new data
    const updated = [...existing, ...data];

    // Keep only last 7 days
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const filtered = updated.filter((d) => d.lastChecked >= cutoffTime);

    this.historicalData.set(key, filtered);
  }

  /**
   * Create empty detection result
   */
  private createEmptyDetection(upc: string): ShortageDetection {
    return {
      upc,
      severity: ShortageSeverity.NONE,
      availableStoreCount: 0,
      totalStoreCount: 0,
      availabilityRate: 0,
      trend: 'unknown',
      lastChecked: new Date(),
    };
  }

  /**
   * Get shortages above a certain severity level
   */
  async getCriticalShortages(
    minSeverity: ShortageSeverity = ShortageSeverity.MODERATE,
    options: ShortageAnalysisOptions = {}
  ): Promise<ShortageDetection[]> {
    const allShortages = await this.detectShortages(options);

    const severityOrder = {
      [ShortageSeverity.NONE]: 0,
      [ShortageSeverity.LOW]: 1,
      [ShortageSeverity.MODERATE]: 2,
      [ShortageSeverity.HIGH]: 3,
      [ShortageSeverity.CRITICAL]: 4,
    };

    const minLevel = severityOrder[minSeverity];

    return allShortages.filter(
      (s) => severityOrder[s.severity] >= minLevel
    );
  }

  /**
   * Check if a formula is experiencing a shortage
   */
  async isShortage(
    upc: string,
    minSeverity: ShortageSeverity = ShortageSeverity.LOW
  ): Promise<boolean> {
    const detection = await this.detectShortage(upc);

    const severityOrder = {
      [ShortageSeverity.NONE]: 0,
      [ShortageSeverity.LOW]: 1,
      [ShortageSeverity.MODERATE]: 2,
      [ShortageSeverity.HIGH]: 3,
      [ShortageSeverity.CRITICAL]: 4,
    };

    return severityOrder[detection.severity] >= severityOrder[minSeverity];
  }

  /**
   * Clear historical data (cleanup)
   */
  clearHistoricalData(): void {
    this.historicalData.clear();
  }
}

// Singleton instance
let instance: FormulaShortageDetectionService | null = null;

export function getFormulaShortageDetectionService(): FormulaShortageDetectionService {
  if (!instance) {
    instance = new FormulaShortageDetectionService();
  }
  return instance;
}
