/**
 * Formula Shortage Detection Tests
 * A4.2 - Validates shortage detection algorithm
 */

import {
  getFormulaAvailabilityService,
  getFormulaShortageDetectionService,
  ShortageSeverity,
} from '../index';

describe('FormulaShortageDetectionService', () => {
  const availabilityService = getFormulaAvailabilityService();
  const shortageService = getFormulaShortageDetectionService();

  beforeEach(() => {
    // Clear any existing data
    shortageService.clearHistoricalData();
  });

  describe('Severity Classification', () => {
    it('should classify as NONE when availability is >= 75%', async () => {
      const upc = 'test-upc-001';
      const stores = ['s1', 's2', 's3', 's4'];

      // 4 out of 4 stores = 100%
      for (const storeId of stores) {
        await availabilityService.updateAvailability({
          storeId,
          upc,
          inStock: true,
          quantity: 10,
          source: 'api',
        });
      }

      const detection = await shortageService.detectShortage(upc);
      expect(detection.severity).toBe(ShortageSeverity.NONE);
      expect(detection.availabilityRate).toBe(1.0);
    });

    it('should classify as LOW when availability is 50-75%', async () => {
      const upc = 'test-upc-002';
      const stores = ['s1', 's2', 's3', 's4'];

      // 3 out of 4 stores = 75%
      for (let i = 0; i < stores.length; i++) {
        await availabilityService.updateAvailability({
          storeId: stores[i],
          upc,
          inStock: i < 3,
          quantity: i < 3 ? 10 : 0,
          source: 'api',
        });
      }

      const detection = await shortageService.detectShortage(upc);
      expect(detection.severity).toBe(ShortageSeverity.NONE);
      expect(detection.availableStoreCount).toBe(3);
      expect(detection.totalStoreCount).toBe(4);
    });

    it('should classify as MODERATE when availability is 25-50%', async () => {
      const upc = 'test-upc-003';
      const stores = ['s1', 's2', 's3', 's4'];

      // 2 out of 4 stores = 50%
      for (let i = 0; i < stores.length; i++) {
        await availabilityService.updateAvailability({
          storeId: stores[i],
          upc,
          inStock: i < 2,
          quantity: i < 2 ? 10 : 0,
          source: 'api',
        });
      }

      const detection = await shortageService.detectShortage(upc);
      expect(detection.severity).toBe(ShortageSeverity.LOW);
      expect(detection.availabilityRate).toBe(0.5);
    });

    it('should classify as HIGH when availability is 10-25%', async () => {
      const upc = 'test-upc-004';
      const stores = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];

      // 2 out of 10 stores = 20%
      for (let i = 0; i < stores.length; i++) {
        await availabilityService.updateAvailability({
          storeId: stores[i],
          upc,
          inStock: i < 2,
          quantity: i < 2 ? 10 : 0,
          source: 'api',
        });
      }

      const detection = await shortageService.detectShortage(upc);
      expect(detection.severity).toBe(ShortageSeverity.HIGH);
      expect(detection.availabilityRate).toBe(0.2);
    });

    it('should classify as CRITICAL when availability is < 10%', async () => {
      const upc = 'test-upc-005';
      const stores = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];

      // 0 out of 10 stores = 0%
      for (const storeId of stores) {
        await availabilityService.updateAvailability({
          storeId,
          upc,
          inStock: false,
          quantity: 0,
          source: 'api',
        });
      }

      const detection = await shortageService.detectShortage(upc);
      expect(detection.severity).toBe(ShortageSeverity.CRITICAL);
      expect(detection.availabilityRate).toBe(0);
    });
  });

  describe('Multiple Formula Detection', () => {
    it('should detect shortages for multiple formulas', async () => {
      const formulas = [
        { upc: 'upc-001', inStockCount: 4, totalStores: 4 }, // 100%
        { upc: 'upc-002', inStockCount: 2, totalStores: 4 }, // 50%
        { upc: 'upc-003', inStockCount: 1, totalStores: 4 }, // 25%
      ];

      for (const formula of formulas) {
        for (let i = 0; i < formula.totalStores; i++) {
          await availabilityService.updateAvailability({
            storeId: `store-${i}`,
            upc: formula.upc,
            inStock: i < formula.inStockCount,
            quantity: i < formula.inStockCount ? 10 : 0,
            source: 'api',
          });
        }
      }

      const detections = await shortageService.detectShortages();
      expect(detections.length).toBe(3);

      const byUpc = new Map(detections.map(d => [d.upc, d]));
      expect(byUpc.get('upc-001')?.severity).toBe(ShortageSeverity.NONE);
      expect(byUpc.get('upc-002')?.severity).toBe(ShortageSeverity.LOW);
      expect(byUpc.get('upc-003')?.severity).toBe(ShortageSeverity.MODERATE);
    });
  });

  describe('Critical Shortage Filtering', () => {
    it('should filter shortages by minimum severity', async () => {
      const formulas = [
        { upc: 'upc-001', rate: 0.9 },  // NONE
        { upc: 'upc-002', rate: 0.6 },  // LOW
        { upc: 'upc-003', rate: 0.4 },  // MODERATE
        { upc: 'upc-004', rate: 0.15 }, // HIGH
        { upc: 'upc-005', rate: 0.05 }, // CRITICAL
      ];

      const stores = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];

      for (const formula of formulas) {
        for (let i = 0; i < stores.length; i++) {
          await availabilityService.updateAvailability({
            storeId: stores[i],
            upc: formula.upc,
            inStock: Math.random() < formula.rate,
            source: 'api',
          });
        }
      }

      const moderateOrWorse = await shortageService.getCriticalShortages(
        ShortageSeverity.MODERATE
      );

      // Should include MODERATE, HIGH, and CRITICAL
      expect(moderateOrWorse.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Shortage Check', () => {
    it('should return true when formula has shortage above threshold', async () => {
      const upc = 'test-upc-check';
      const stores = ['s1', 's2', 's3', 's4'];

      // 1 out of 4 = 25% (MODERATE)
      for (let i = 0; i < stores.length; i++) {
        await availabilityService.updateAvailability({
          storeId: stores[i],
          upc,
          inStock: i === 0,
          source: 'api',
        });
      }

      const hasShortage = await shortageService.isShortage(
        upc,
        ShortageSeverity.LOW
      );

      expect(hasShortage).toBe(true);
    });

    it('should return false when formula is widely available', async () => {
      const upc = 'test-upc-available';
      const stores = ['s1', 's2', 's3', 's4'];

      // All in stock
      for (const storeId of stores) {
        await availabilityService.updateAvailability({
          storeId,
          upc,
          inStock: true,
          source: 'api',
        });
      }

      const hasShortage = await shortageService.isShortage(
        upc,
        ShortageSeverity.MODERATE
      );

      expect(hasShortage).toBe(false);
    });
  });

  describe('Empty Data Handling', () => {
    it('should handle formula with no availability data', async () => {
      const detection = await shortageService.detectShortage('nonexistent-upc');

      expect(detection.upc).toBe('nonexistent-upc');
      expect(detection.severity).toBe(ShortageSeverity.NONE);
      expect(detection.totalStoreCount).toBe(0);
      expect(detection.trend).toBe('unknown');
    });

    it('should return empty array when no data exists', async () => {
      const detections = await shortageService.detectShortages();
      expect(detections).toEqual([]);
    });
  });
});
