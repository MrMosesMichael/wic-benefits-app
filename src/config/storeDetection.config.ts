/**
 * Store Detection Configuration
 * Configuration values for GPS-based store detection
 */

export const STORE_DETECTION_CONFIG = {
  // Maximum distance in meters to consider a store match
  maxDistanceMeters: 50,

  // Minimum confidence score (0-100) to automatically select a store
  minConfidence: 70,

  // Distance for "nearby stores" search (wider radius)
  nearbySearchRadiusMeters: 500,

  // Enable WiFi-based store matching
  enableWifiMatching: true,

  // Enable Bluetooth beacon-based matching
  enableBeaconMatching: false,

  // Location update frequency for continuous detection (milliseconds)
  locationUpdateInterval: 10000, // 10 seconds

  // Minimum distance change to trigger location update (meters)
  locationDistanceFilter: 50,

  // GPS timeout for location requests (milliseconds)
  gpsTimeout: 15000, // 15 seconds

  // Maximum age of cached location (milliseconds)
  maxLocationAge: 10000, // 10 seconds

  // Enable high accuracy GPS
  enableHighAccuracy: true,

  // Confidence thresholds for different distances
  confidenceThresholds: {
    veryClose: { maxDistance: 10, confidence: 100 },
    close: { maxDistance: 25, confidence: 95 },
    withinBoundary: { maxDistance: 50, confidence: 85 },
    nearby: { maxDistance: 100, confidence: 70 },
    possiblyNear: { maxDistance: 200, confidence: 50 },
    far: { maxDistance: Infinity, confidence: 30 },
  },

  // Store confirmation settings
  requireConfirmationForNewStores: true,
  requireConfirmationIfLowConfidence: true,
  lowConfidenceThreshold: 80,

  // Cache settings
  storeCacheDuration: 3600000, // 1 hour in milliseconds
  maxCachedStores: 100,

  // API settings
  apiRetryAttempts: 3,
  apiRetryDelay: 1000, // milliseconds

  // Permission request settings
  maxPermissionPrompts: 3,
  permissionPromptInterval: 86400000, // 24 hours in milliseconds
};

export default STORE_DETECTION_CONFIG;
