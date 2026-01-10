/**
 * Services Index
 * Central export point for all services
 */

export { default as LocationService } from './LocationService';
export { default as StoreDetectionService } from './StoreDetectionService';
export { default as WiFiService } from './WiFiService';

export type { StoreDetectionConfig } from './StoreDetectionService';
export type { WiFiScanResult, WiFiServiceConfig } from './WiFiService';
