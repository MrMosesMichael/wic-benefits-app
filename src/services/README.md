# Store Detection Services

This directory contains services for GPS-based store detection and geofence matching.

## Overview

The store detection system uses multiple methods to identify which store a user is currently shopping at:

1. **Geofence Matching** (Primary) - Checks if user is inside a store's defined boundary polygon or circle
2. **Distance-Based Matching** (Fallback) - Uses GPS distance when no geofence is available
3. **WiFi Matching** (Supplementary) - Matches against known store WiFi networks
4. **Beacon Matching** (Future) - Uses Bluetooth beacons for precise in-store location

## Services

### LocationService

Handles GPS location access and permission management.

**Key Methods:**
- `getCurrentPosition()` - Get current GPS coordinates
- `watchPosition()` - Monitor location changes
- `checkPermissions()` - Check location permission status
- `requestPermissions()` - Request location permissions from user
- `calculateDistance()` - Calculate distance between two points using Haversine formula

### StoreDetectionService

Main service for detecting which store the user is at.

**Key Methods:**
- `detectStore()` - Detect current store (one-time)
- `startContinuousDetection()` - Monitor for store changes
- `detectStoreByWifi()` - Supplementary WiFi-based detection
- `searchStores()` - Search stores by name/address
- `selectStoreManually()` - User manual selection
- `confirmStore()` - Confirm auto-detected store

**Configuration:**
```typescript
const config = {
  maxDistanceMeters: 50,      // Max distance for distance-based matching
  minConfidence: 70,          // Minimum confidence threshold
  enableWifiMatching: true,   // Enable WiFi supplementary detection
  enableBeaconMatching: false // Enable beacon detection (future)
};
```

### GeofenceManager

Advanced geofence operations and matching logic.

**Key Methods:**
- `findContainingStores()` - Find all stores that contain a GPS point
- `isPointInStoreGeofence()` - Check if point is in specific store
- `getMatchDetails()` - Get detailed matching info (distance, confidence, etc.)
- `findBestMatch()` - Find best matching store from candidates
- `generateDefaultGeofence()` - Create default geofence for stores without one
- `validateGeofences()` - Validate geofence data integrity
- `getGeofenceStats()` - Get statistics about geofence coverage

## Usage Examples

### Basic Store Detection

```typescript
import StoreDetectionService from './services/StoreDetectionService';

const service = StoreDetectionService.getInstance();

// One-time detection
const result = await service.detectStore();

if (result.store) {
  console.log(`Detected: ${result.store.name}`);
  console.log(`Confidence: ${result.confidence}%`);
  console.log(`Method: ${result.method}`); // 'geofence', 'gps', 'wifi', etc.
  console.log(`Inside geofence: ${result.insideGeofence}`);
  console.log(`Distance: ${result.distanceMeters}m`);

  if (result.requiresConfirmation) {
    // Show confirmation UI to user
    // User confirms...
    service.confirmStore(result.store.id);
  }
}
```

### Continuous Detection

```typescript
// Start monitoring for store changes
service.startContinuousDetection(
  (result) => {
    // Called when store changes or location updates
    console.log(`Store updated: ${result.store?.name}`);
  },
  (error) => {
    console.error('Detection error:', error);
  }
);

// Later, when leaving the shopping screen
service.stopContinuousDetection();
```

### Using GeofenceManager

```typescript
import GeofenceManager from './services/GeofenceManager';
import { Store, GeoPoint } from '../types/store.types';

const manager = GeofenceManager.getInstance();

// Check which stores contain a point
const userLocation: GeoPoint = { lat: 40.7128, lng: -74.0060 };
const nearbyStores: Store[] = [...]; // From API

const containingStores = manager.findContainingStores(userLocation, nearbyStores);

// Get detailed match information
const matchDetails = manager.getMatchDetails(userLocation, nearbyStores[0]);
console.log({
  inside: matchDetails.inside,
  distanceToCenter: matchDetails.distanceToCenter,
  distanceToEdge: matchDetails.distanceToEdge,
  confidence: matchDetails.confidence
});

// Find best match
const bestMatch = manager.findBestMatch(userLocation, nearbyStores);
if (bestMatch) {
  console.log(`Best match: ${bestMatch.store.name}`);
  console.log(`Confidence: ${bestMatch.result.confidence}%`);
}
```

### Creating Geofences

```typescript
import { createCircularGeofence, createRectangularGeofence } from '../utils/geofence.utils';

// Circular geofence (most common)
const circleGeofence = createCircularGeofence(
  { lat: 40.7128, lng: -74.0060 },
  75 // radius in meters
);

// Rectangular geofence
const rectGeofence = createRectangularGeofence(
  { lat: 40.7128, lng: -74.0060 },
  150, // width in meters
  100  // height in meters
);

// Custom polygon geofence
const polygonGeofence = {
  type: 'polygon' as const,
  coordinates: [
    { lat: 40.7128, lng: -74.0065 },
    { lat: 40.7130, lng: -74.0065 },
    { lat: 40.7130, lng: -74.0055 },
    { lat: 40.7128, lng: -74.0055 },
  ]
};

// Add to store
const store: Store = {
  // ... other store properties
  geofence: circleGeofence
};
```

### React Hook Usage

```typescript
import { useStoreDetection } from '../hooks/useStoreDetection';

function StoreSelector() {
  const {
    currentStore,
    nearbyStores,
    confidence,
    isDetecting,
    error,
    permissionStatus,
    requiresConfirmation,
    detectStore,
    confirmStore,
    selectStore,
    requestPermissions,
    searchStores,
    startContinuousDetection,
    stopContinuousDetection
  } = useStoreDetection();

  useEffect(() => {
    // Auto-detect on mount
    detectStore();

    // Start continuous detection
    startContinuousDetection();

    return () => {
      // Cleanup on unmount
      stopContinuousDetection();
    };
  }, []);

  if (!permissionStatus?.granted) {
    return (
      <Button onPress={requestPermissions}>
        Enable Location Access
      </Button>
    );
  }

  if (isDetecting) {
    return <LoadingSpinner />;
  }

  if (requiresConfirmation && currentStore) {
    return (
      <ConfirmDialog
        store={currentStore}
        onConfirm={() => confirmStore(currentStore.id)}
      />
    );
  }

  return (
    <View>
      {currentStore && (
        <CurrentStoreCard
          store={currentStore}
          confidence={confidence}
        />
      )}
      {nearbyStores.length > 0 && (
        <NearbyStoresList
          stores={nearbyStores}
          onSelect={selectStore}
        />
      )}
    </View>
  );
}
```

## Geofence Data Format

Stores can have either polygon or circle geofences:

### Polygon Geofence

```typescript
{
  type: 'polygon',
  coordinates: [
    { lat: 40.7128, lng: -74.0065 },  // Point 1
    { lat: 40.7130, lng: -74.0065 },  // Point 2
    { lat: 40.7130, lng: -74.0055 },  // Point 3
    { lat: 40.7128, lng: -74.0055 }   // Point 4
    // Polygon is automatically closed (first point connects to last)
  ]
}
```

### Circle Geofence

```typescript
{
  type: 'circle',
  center: { lat: 40.7128, lng: -74.0060 },
  radiusMeters: 75
}
```

## Confidence Scoring

The system calculates confidence scores (0-100) based on:

1. **Geofence Matches** (95-100):
   - Inside geofence + close to center (≤25m): 100
   - Inside geofence + moderate distance (≤100m): 98
   - Inside geofence + far from center: 95

2. **Distance-Based** (30-100):
   - ≤10m: 100
   - ≤25m: 95
   - ≤50m: 85
   - ≤100m: 70
   - ≤200m: 50
   - >200m: 30

3. **Additional Factors**:
   - Distance to geofence edge (more confidence when well inside)
   - Previous user confirmations at this store
   - WiFi network matching (boosts confidence)

## Performance Optimization

### Bounding Box Pre-filtering

For polygon geofences, the system uses bounding box checks before expensive point-in-polygon calculations:

```typescript
// Fast pre-check
if (!isPointInBoundingBox(point, polygon)) {
  return false; // Skip expensive check
}

// Only do full check if inside bounding box
return isPointInPolygon(point, polygon);
```

### Caching

The GeofenceManager caches geofence data to avoid repeated calculations:

```typescript
const manager = GeofenceManager.getInstance({
  enableCaching: true,
  cacheExpiryMs: 5 * 60 * 1000 // 5 minutes
});

// Preload geofences for nearby stores
manager.preloadGeofences(nearbyStores);
```

### Distance Filter

The StoreDetectionService filters stores by distance before checking geofences:

```typescript
const config = {
  maxDistanceMeters: 50 // Only check stores within 50m
};
```

## Testing

### Mock Store Data

```typescript
const mockStore: Store = {
  id: 'store-123',
  name: 'Walmart Supercenter',
  chain: 'Walmart',
  address: {
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    country: 'US'
  },
  location: { lat: 40.7128, lng: -74.0060 },
  geofence: {
    type: 'circle',
    center: { lat: 40.7128, lng: -74.0060 },
    radiusMeters: 100
  },
  wicAuthorized: true,
  hours: [],
  timezone: 'America/New_York',
  features: {
    acceptsWic: true,
    hasWicKiosk: true
  },
  inventoryApiAvailable: true,
  lastVerified: new Date(),
  dataSource: 'api',
  active: true
};
```

## Error Handling

```typescript
try {
  const result = await service.detectStore();
  // Handle result
} catch (error) {
  if (error.message.includes('location')) {
    // Location permission denied or unavailable
    // Show permission request UI
  } else if (error.message.includes('network')) {
    // Network error fetching stores
    // Use cached data or show offline mode
  } else {
    // Other errors
    console.error('Detection failed:', error);
  }
}
```

## Future Enhancements

- [ ] Beacon-based indoor positioning
- [ ] Machine learning for improved accuracy
- [ ] Multi-floor detection for multi-level stores
- [ ] Historical patterns (user's frequent stores)
- [ ] Crowd-sourced geofence refinement
- [ ] Integration with store entry/exit events
