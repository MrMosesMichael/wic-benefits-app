# GPS-Based Store Detection - Quick Reference

## Installation

```bash
npm install @react-native-community/geolocation
```

## Setup

### 1. Add Permissions

**Android** (`android/app/src/main/AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

**iOS** (`ios/YourApp/Info.plist`):
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to detect which store you're shopping at.</string>
```

### 2. Wrap App with Provider

```typescript
import { StoreProvider } from './src/contexts/StoreContext';

function App() {
  return (
    <StoreProvider>
      <YourApp />
    </StoreProvider>
  );
}
```

## Basic Usage

```typescript
import { useStore } from './src/contexts/StoreContext';
import { StoreDetectionBanner } from './src/components/StoreDetectionBanner';

function MyScreen() {
  const {
    currentStore,
    isDetecting,
    confidence,
    requiresConfirmation,
    detectStore,
    confirmStore,
  } = useStore();

  useEffect(() => {
    detectStore();
  }, []);

  return (
    <StoreDetectionBanner
      currentStore={currentStore}
      isDetecting={isDetecting}
      confidence={confidence}
      requiresConfirmation={requiresConfirmation}
      onConfirm={() => confirmStore(currentStore.id)}
      onChangeStore={handleChangeStore}
    />
  );
}
```

## Common Patterns

### Auto-detect on mount
```typescript
useEffect(() => {
  detectStore();
}, []);
```

### Continuous detection
```typescript
useEffect(() => {
  startContinuousDetection();
  return () => stopContinuousDetection();
}, []);
```

### Manual store selection
```typescript
const handleSelectStore = (store) => {
  selectStore(store);
};
```

### Search stores
```typescript
const stores = await searchStores('Walmart');
```

### Request permissions
```typescript
const status = await requestPermissions();
if (!status.granted) {
  // Handle denied
}
```

## API Reference

### useStore() Hook

```typescript
const {
  // State
  currentStore: Store | null,
  nearbyStores: Store[],
  confidence: number,
  isDetecting: boolean,
  error: Error | null,
  permissionStatus: LocationPermissionStatus | null,
  requiresConfirmation: boolean,

  // Actions
  detectStore: () => Promise<void>,
  confirmStore: (storeId: string) => void,
  selectStore: (store: Store) => void,
  requestPermissions: () => Promise<void>,
  searchStores: (query: string) => Promise<Store[]>,
  startContinuousDetection: () => void,
  stopContinuousDetection: () => void,
} = useStore();
```

### StoreDetectionService

```typescript
const service = StoreDetectionService.getInstance();

// Detect store
const result = await service.detectStore();

// Manual selection
const result = service.selectStoreManually(store);

// Confirm store
service.confirmStore(storeId);

// Search
const stores = await service.searchStores(query);

// Continuous detection
service.startContinuousDetection(onStoreChange, onError);
service.stopContinuousDetection();
```

### LocationService

```typescript
const service = LocationService.getInstance();

// Get position
const position = await service.getCurrentPosition();
// Returns: { lat: number, lng: number }

// Check permissions
const status = await service.checkPermissions();
// Returns: { granted: boolean, canAskAgain: boolean, blocked: boolean }

// Request permissions
const status = await service.requestPermissions();

// Watch position
service.watchPosition(onPositionChange, onError);
service.clearWatch();

// Calculate distance
const meters = LocationService.calculateDistance(point1, point2);
```

### StoreApiService

```typescript
const api = StoreApiService.getInstance();
api.setApiToken('your-token');

// Nearby stores
const stores = await api.getNearbyStores({
  lat: 42.3601,
  lng: -71.0589,
  radius: 500,
  limit: 20,
  wicOnly: true,
});

// Search
const stores = await api.searchStores('Walmart');

// Detect
const result = await api.detectStore({
  lat: 42.3601,
  lng: -71.0589,
  wifiSsid: 'Store-WiFi',
});
```

## Configuration

Edit `src/config/storeDetection.config.ts`:

```typescript
export const STORE_DETECTION_CONFIG = {
  maxDistanceMeters: 50,          // Detection radius
  minConfidence: 70,              // Auto-accept threshold
  enableWifiMatching: true,       // Use WiFi
  locationUpdateInterval: 10000,  // 10 seconds
  locationDistanceFilter: 50,     // 50 meters
};
```

## Confidence Levels

| Distance | Confidence | Status |
|----------|-----------|--------|
| ≤ 10m | 100% | Very Close |
| ≤ 25m | 95% | Close |
| ≤ 50m | 85% | Within Boundary |
| ≤ 100m | 70% | Nearby |
| ≤ 200m | 50% | Possibly Near |
| > 200m | 30% | Far |

## Component Props

### StoreDetectionBanner

```typescript
<StoreDetectionBanner
  currentStore={Store | null}
  isDetecting={boolean}
  confidence={number}
  requiresConfirmation={boolean}
  onConfirm={() => void}
  onChangeStore={() => void}
  onRequestPermissions={() => void}  // optional
  permissionDenied={boolean}         // optional
/>
```

### StoreSelectionModal

```typescript
<StoreSelectionModal
  visible={boolean}
  nearbyStores={Store[]}
  favoriteStores={Store[]}           // optional
  recentStores={Store[]}             // optional
  onSelectStore={(store) => void}
  onClose={() => void}
  onSearch={(query) => Promise<Store[]>}
/>
```

## Type Definitions

```typescript
interface Store {
  id: string;
  name: string;
  chain?: string;
  address: Address;
  location: GeoPoint;
  wicAuthorized: boolean;
  phone?: string;
  hours: OperatingHours[];
  features: StoreFeatures;
  // ... more fields
}

interface GeoPoint {
  lat: number;
  lng: number;
}

interface StoreDetectionResult {
  store: Store | null;
  confidence: number;
  method: 'gps' | 'wifi' | 'beacon' | 'manual';
  nearbyStores?: Store[];
  requiresConfirmation: boolean;
}

interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  blocked: boolean;
}
```

## Common Issues

### Store not detected
- Check GPS permissions
- Move closer to store
- Wait for GPS to stabilize
- Check store is in database

### Permission denied
```typescript
if (permissionStatus?.blocked) {
  showPermissionSettingsAlert();
}
```

### Low confidence
```typescript
if (confidence < 80 && currentStore) {
  // Show confirmation dialog
}
```

## Best Practices

✅ **DO**:
- Request permissions with clear rationale
- Provide manual selection fallback
- Stop continuous detection when not needed
- Show confidence level to users
- Cache nearby stores

❌ **DON'T**:
- Request permissions without explanation
- Repeatedly prompt for permissions
- Run continuous detection all the time
- Store precise location long-term
- Share location with third parties

## Testing

```typescript
// Mock LocationService
jest.mock('./services/LocationService', () => ({
  getInstance: () => ({
    getCurrentPosition: () => Promise.resolve({ lat: 42.36, lng: -71.06 }),
    requestPermissions: () => Promise.resolve({ granted: true }),
  }),
}));

// Test store detection
test('detects store', async () => {
  const { result } = renderHook(() => useStoreDetection());
  await act(async () => {
    await result.current.detectStore();
  });
  expect(result.current.currentStore).toBeDefined();
});
```

## Debugging

```typescript
// Enable detailed logging
const service = StoreDetectionService.getInstance();
console.log('Detection config:', STORE_DETECTION_CONFIG);
console.log('Current position:', await LocationService.getInstance().getCurrentPosition());
console.log('Nearby stores:', await service.getNearbyStores(...));
```

## Files to Import

```typescript
// Main exports
import {
  StoreProvider,
  useStore,
  StoreDetectionBanner,
  StoreSelectionModal,
  STORE_DETECTION_CONFIG,
} from './src';

// Services (if needed directly)
import LocationService from './src/services/LocationService';
import StoreDetectionService from './src/services/StoreDetectionService';
import StoreApiService from './src/services/StoreApiService';

// Types
import type {
  Store,
  StoreDetectionResult,
  LocationPermissionStatus,
  GeoPoint,
} from './src/types/store.types';
```

## Support

- 📖 [Full Documentation](./src/README.md)
- 🔧 [Integration Guide](./src/INTEGRATION_GUIDE.md)
- 🏗️ [Architecture](./ARCHITECTURE.md)
- 📋 [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
