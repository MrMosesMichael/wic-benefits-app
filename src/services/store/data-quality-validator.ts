/**
 * Data Quality Validator for Store Ingestion
 *
 * Validates store data quality and completeness during ingestion
 */

import { Store } from '../../types/store.types';

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  score: number; // 0-100
}

export interface DataQualityReport {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  averageScore: number;
  issues: QualityIssue[];
}

export interface QualityIssue {
  severity: 'error' | 'warning';
  category: string;
  message: string;
  count: number;
}

export class DataQualityValidator {
  /**
   * Validate a single store record
   */
  validateStore(store: Store): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    let score = 100;

    // Required fields
    if (!store.name || store.name.trim().length === 0) {
      errors.push('Missing store name');
      score -= 20;
    }

    if (!store.address.street || store.address.street.trim().length === 0) {
      errors.push('Missing street address');
      score -= 15;
    }

    if (!store.address.city || store.address.city.trim().length === 0) {
      errors.push('Missing city');
      score -= 15;
    }

    if (!store.address.state || store.address.state.trim().length === 0) {
      errors.push('Missing state');
      score -= 15;
    }

    if (!store.address.zip || !this.isValidZip(store.address.zip)) {
      errors.push('Missing or invalid ZIP code');
      score -= 10;
    }

    // Location coordinates
    if (!store.location || !this.isValidCoordinate(store.location.lat, store.location.lng)) {
      errors.push('Missing or invalid coordinates');
      score -= 15;
    }

    // WIC authorization
    if (!store.wicAuthorized) {
      warnings.push('Store not marked as WIC authorized');
      score -= 5;
    }

    if (store.wicAuthorized && !store.wicVendorId) {
      warnings.push('WIC authorized but missing vendor ID');
      score -= 3;
    }

    // Optional but recommended fields
    if (!store.phone) {
      warnings.push('Missing phone number');
      score -= 2;
    } else if (!this.isValidPhone(store.phone)) {
      warnings.push('Invalid phone number format');
      score -= 1;
    }

    if (!store.hours || store.hours.length === 0) {
      warnings.push('Missing operating hours');
      score -= 3;
    }

    if (!store.timezone || !this.isValidTimezone(store.timezone)) {
      errors.push('Missing or invalid timezone');
      score -= 5;
    }

    // Data freshness
    if (store.lastVerified) {
      const daysSinceVerified = this.getDaysSince(store.lastVerified);
      if (daysSinceVerified > 90) {
        warnings.push(`Data is ${daysSinceVerified} days old`);
        score -= Math.min(5, Math.floor(daysSinceVerified / 30));
      }
    } else {
      warnings.push('No verification date');
      score -= 2;
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
      score: Math.max(0, Math.min(100, score)),
    };
  }

  /**
   * Validate batch of stores and generate report
   */
  validateBatch(stores: Store[]): DataQualityReport {
    const results = stores.map(store => this.validateStore(store));

    const validRecords = results.filter(r => r.valid).length;
    const invalidRecords = results.filter(r => !r.valid).length;
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    // Aggregate issues
    const issueMap = new Map<string, QualityIssue>();

    for (const result of results) {
      for (const error of result.errors) {
        this.addIssue(issueMap, 'error', 'Error', error);
      }
      for (const warning of result.warnings) {
        this.addIssue(issueMap, 'warning', 'Warning', warning);
      }
    }

    const issues = Array.from(issueMap.values()).sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'error' ? -1 : 1;
      }
      return b.count - a.count;
    });

    return {
      totalRecords: stores.length,
      validRecords,
      invalidRecords,
      averageScore,
      issues,
    };
  }

  /**
   * Add or increment issue in map
   */
  private addIssue(
    map: Map<string, QualityIssue>,
    severity: 'error' | 'warning',
    category: string,
    message: string
  ): void {
    const key = `${severity}:${message}`;
    const existing = map.get(key);

    if (existing) {
      existing.count++;
    } else {
      map.set(key, { severity, category, message, count: 1 });
    }
  }

  /**
   * Validate ZIP code format
   */
  private isValidZip(zip: string): boolean {
    return /^\d{5}(-\d{4})?$/.test(zip);
  }

  /**
   * Validate phone number format
   */
  private isValidPhone(phone: string): boolean {
    // Basic validation - accepts various formats
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 || cleaned.length === 11;
  }

  /**
   * Validate coordinates
   */
  private isValidCoordinate(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  /**
   * Validate timezone
   */
  private isValidTimezone(timezone: string): boolean {
    // Basic check - comprehensive list would be longer
    const validTimezones = [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Detroit',
      'America/Phoenix',
    ];
    return validTimezones.includes(timezone);
  }

  /**
   * Get days since a date
   */
  private getDaysSince(date: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Print validation report
   */
  printReport(report: DataQualityReport): void {
    console.log('\n========================================');
    console.log('Data Quality Validation Report');
    console.log('========================================');
    console.log(`Total Records:    ${report.totalRecords}`);
    console.log(`Valid Records:    ${report.validRecords} (${this.getPercentage(report.validRecords, report.totalRecords)}%)`);
    console.log(`Invalid Records:  ${report.invalidRecords} (${this.getPercentage(report.invalidRecords, report.totalRecords)}%)`);
    console.log(`Average Score:    ${report.averageScore.toFixed(1)}/100`);
    console.log('========================================\n');

    if (report.issues.length > 0) {
      console.log('Issues Found:');
      console.log('-------------');

      const errors = report.issues.filter(i => i.severity === 'error');
      const warnings = report.issues.filter(i => i.severity === 'warning');

      if (errors.length > 0) {
        console.log('\nErrors:');
        for (const issue of errors) {
          console.log(`  ❌ ${issue.message} (${issue.count} occurrences)`);
        }
      }

      if (warnings.length > 0) {
        console.log('\nWarnings:');
        for (const issue of warnings) {
          console.log(`  ⚠️  ${issue.message} (${issue.count} occurrences)`);
        }
      }

      console.log('\n========================================\n');
    }
  }

  /**
   * Calculate percentage
   */
  private getPercentage(value: number, total: number): string {
    if (total === 0) return '0.0';
    return ((value / total) * 100).toFixed(1);
  }
}
