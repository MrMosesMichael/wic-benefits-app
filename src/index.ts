/**
 * WIC Benefits Assistant - Store Detection Module
 * Main exports for GPS-based store detection functionality
 */

// Services
export { default as LocationService } from './services/LocationService';
export { default as StoreDetectionService } from './services/StoreDetectionService';
export { default as StoreApiService } from './services/StoreApiService';

// Hooks
export { useStoreDetection } from './hooks/useStoreDetection';
export type { UseStoreDetectionResult } from './hooks/useStoreDetection';

// Components
export { StoreDetectionBanner } from './components/StoreDetectionBanner';
export { StoreSelectionModal } from './components/StoreSelectionModal';

// Contexts
export { StoreProvider, useStore } from './contexts/StoreContext';

// Types
export type {
  Store,
  StoreDetectionResult,
  LocationPermissionStatus,
  GeoPoint,
  Address,
  StoreFeatures,
  WiFiNetwork,
  Beacon,
  DataSource,
} from './types/store.types';

// Config
export { STORE_DETECTION_CONFIG } from './config/storeDetection.config';

// Utils
export {
  showPermissionSettingsAlert,
  openAppSettings,
  getPermissionStatusMessage,
  shouldShowPermissionRationale,
  showPermissionRationale,
} from './utils/permissions';
