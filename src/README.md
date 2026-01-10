# WIC Benefits Assistant - GPS-Based Store Detection

This directory contains the implementation of GPS-based store detection for the WIC Benefits Assistant mobile app.

## Overview

The GPS-based store detection feature automatically identifies which WIC-authorized store the user is currently shopping at, enabling store-specific inventory information and personalized shopping assistance.

## Architecture

### Core Components

#### 1. Services Layer (`/services`)

- **LocationService.ts**: Handles GPS location access and permission management
  - Manages Android and iOS location permissions
  - Provides current position and position watching
  - Implements Haversine distance calculation

- **StoreDetectionService.ts**: Implements GPS-based store matching logic
  - Detects stores based on GPS coordinates
  - Calculates confidence scores based on distance
  - Manages confirmed stores
  - Supports WiFi-based detection (supplementary)
  - Provides continuous store detection

- **StoreApiService.ts**: Handles API calls for store data
  - Fetches nearby stores
  - Searches stores by query
  - Reports crowdsourced store corrections

#### 2. Hooks (`/hooks`)

- **useStoreDetection.ts**: React hook for store detection
  - Manages store detection state
  - Provides permission handling
  - Enables manual store selection
  - Supports continuous detection mode

#### 3. Components (`/components`)

- **StoreDetectionBanner.tsx**: Banner component displaying detected store
  - Shows current store information
  - Displays confidence level
  - Provides confirmation and change actions
  - Handles permission requests

- **StoreSelectionModal.tsx**: Modal for manual store selection
  - Search stores by name, address, or ZIP
  - View nearby stores
  - Access favorite and recent stores
  - Tab-based navigation

#### 4. Contexts (`/contexts`)

- **StoreContext.tsx**: React context for app-wide store state
  - Provides store detection state to entire app
  - Enables centralized store management

#### 5. Screens (`/screens`)

- **HomeScreen.tsx**: Example implementation of store detection
  - Integrates all store detection components
  - Demonstrates usage patterns

#### 6. Types (`/types`)

- **store.types.ts**: TypeScript type definitions
  - Store data structures
  - Location types
  - Detection result types

#### 7. Utils (`/utils`)

- **permissions.ts**: Permission handling utilities
  - Permission status messages
  - Settings navigation
  - Permission rationale dialogs

#### 8. Config (`/config`)

- **storeDetection.config.ts**: Configuration constants
  - Distance thresholds
  - Confidence levels
  - Timing parameters

## Key Features

### 1. GPS-Based Detection

The system uses GPS coordinates to detect nearby stores:

```typescript
const result = await detectStore();
// Returns: { store, confidence, method: 'gps', nearbyStores, requiresConfirmation }
```

**Distance-based Confidence Scoring:**
- ≤ 10m: 100% confidence (very close)
- ≤ 25m: 95% confidence (close)
- ≤ 50m: 85% confidence (within store boundary)
- ≤ 100m: 70% confidence (nearby)
- ≤ 200m: 50% confidence (possibly near)
- > 200m: 30% confidence (low)

### 2. Permission Management

Handles location permissions for both Android and iOS:

```typescript
const status = await requestPermissions();
// Returns: { granted, canAskAgain, blocked }
```

### 3. Store Confirmation

First-time store detection requires user confirmation:

```typescript
if (requiresConfirmation) {
  confirmStore(storeId); // Prevents future confirmation prompts
}
```

### 4. Manual Store Selection

Users can manually search and select stores:

```typescript
const stores = await searchStores('Walmart');
selectStore(store); // Manually select a store
```

### 5. Continuous Detection

Automatic store detection as user moves:

```typescript
startContinuousDetection(); // Updates every 50m or 10 seconds
stopContinuousDetection(); // Cleanup
```

### 6. WiFi-Based Detection (Supplementary)

Enhances GPS detection with WiFi network matching:

```typescript
const result = await detectStoreByWifi({ ssid: 'Walmart-Guest', bssid: '...' });
// Returns higher confidence when WiFi matches
```

## Usage

### Basic Implementation

```typescript
import { useStoreDetection } from './hooks/useStoreDetection';
import { StoreDetectionBanner } from './components/StoreDetectionBanner';

function MyScreen() {
  const {
    currentStore,
    isDetecting,
    confidence,
    requiresConfirmation,
    detectStore,
    confirmStore,
  } = useStoreDetection();

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
      onChangeStore={() => {/* Show store selection */}}
    />
  );
}
```

### Using Store Context

```typescript
import { StoreProvider, useStore } from './contexts/StoreContext';

// Wrap app with provider
function App() {
  return (
    <StoreProvider>
      <MyApp />
    </StoreProvider>
  );
}

// Access store anywhere
function AnyComponent() {
  const { currentStore } = useStore();
  return <Text>{currentStore?.name}</Text>;
}
```

## Configuration

Adjust detection behavior in `config/storeDetection.config.ts`:

```typescript
export const STORE_DETECTION_CONFIG = {
  maxDistanceMeters: 50,        // Match stores within 50m
  minConfidence: 70,             // Minimum confidence to auto-select
  enableWifiMatching: true,      // Use WiFi for enhanced detection
  locationUpdateInterval: 10000, // Update every 10 seconds
  // ... more settings
};
```

## API Integration

The implementation expects these API endpoints:

- `GET /api/v1/stores?lat={lat}&lng={lng}&radius={radius}` - Get nearby stores
- `POST /api/v1/stores/detect` - Detect store with location and WiFi data
- `GET /api/v1/stores/search?q={query}` - Search stores
- `POST /api/v1/stores/report` - Report store corrections

See `StoreApiService.ts` for full API specification.

## Dependencies

Required React Native packages:

```json
{
  "@react-native-community/geolocation": "^3.0.0",
  "react": "^18.0.0",
  "react-native": "^0.72.0"
}
```

### Android Permissions

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### iOS Permissions

Add to `Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>WIC Benefits Assistant needs your location to detect which store you are shopping at.</string>
```

## Testing

To test store detection:

1. Mock location services in development
2. Use test stores with known coordinates
3. Test permission flows on both platforms
4. Verify confidence calculations
5. Test offline/no-permission scenarios

## Privacy Considerations

The implementation follows privacy best practices:

- ✅ Location used only for store detection
- ✅ No long-term location history storage
- ✅ User can disable location and use manual selection
- ✅ Clear permission rationale provided
- ✅ No third-party location data sharing

## Future Enhancements

Planned improvements (not yet implemented):

1. **Bluetooth Beacon Support** - For precise in-store positioning
2. **Geofencing** - Store boundary polygons for higher accuracy
3. **Store Visit History** - Learn user's frequent stores
4. **Predictive Detection** - Suggest likely stores based on patterns
5. **Offline Store Database** - Local cache for offline detection

## Troubleshooting

### Store Not Detected

- Check location permissions are granted
- Verify GPS signal strength (try outdoors)
- Ensure store exists in database
- Check if within 50m of store location

### Low Confidence Score

- Move closer to store entrance
- Wait for GPS accuracy to improve
- Manually confirm the store

### Permission Denied

- Guide user to Settings app
- Explain benefits of location access
- Offer manual store selection as fallback

## Related Documentation

- [Store Detection Specification](../../specs/wic-benefits-app/specs/store-detection/spec.md)
- [Design Document](../../specs/wic-benefits-app/design.md)
- [Task Roadmap](../../specs/wic-benefits-app/tasks.md)
