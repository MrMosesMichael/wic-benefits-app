# GPS-Based Store Detection - Integration Guide

This guide shows how to integrate the GPS-based store detection feature into the WIC Benefits Assistant app.

## Quick Start

### 1. Install Dependencies

```bash
npm install @react-native-community/geolocation
```

### 2. Configure Native Permissions

#### Android (`android/app/src/main/AndroidManifest.xml`)

```xml
<manifest>
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
</manifest>
```

#### iOS (`ios/YourApp/Info.plist`)

```xml
<dict>
  <key>NSLocationWhenInUseUsageDescription</key>
  <string>WIC Benefits Assistant needs your location to detect which store you are shopping at and provide store-specific information.</string>

  <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
  <string>WIC Benefits Assistant needs your location to detect which store you are shopping at.</string>
</dict>
```

### 3. Wrap App with Store Provider

```typescript
// App.tsx
import React from 'react';
import { StoreProvider } from './contexts/StoreContext';
import { HomeScreen } from './screens/HomeScreen';

export default function App() {
  return (
    <StoreProvider>
      <HomeScreen />
    </StoreProvider>
  );
}
```

### 4. Use Store Detection in Your Components

```typescript
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useStore } from './contexts/StoreContext';
import { StoreDetectionBanner } from './components/StoreDetectionBanner';

export function MyScreen() {
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
    <View>
      <StoreDetectionBanner
        currentStore={currentStore}
        isDetecting={isDetecting}
        confidence={confidence}
        requiresConfirmation={requiresConfirmation}
        onConfirm={() => currentStore && confirmStore(currentStore.id)}
        onChangeStore={() => {/* Show store selection modal */}}
      />

      {currentStore && (
        <Text>Shopping at: {currentStore.name}</Text>
      )}
    </View>
  );
}
```

## Advanced Usage

### Continuous Store Detection

Automatically detect store changes as user moves:

```typescript
import { useEffect } from 'react';
import { useStore } from './contexts/StoreContext';

function MyComponent() {
  const { startContinuousDetection, stopContinuousDetection } = useStore();

  useEffect(() => {
    // Start watching for store changes
    startContinuousDetection();

    // Cleanup on unmount
    return () => {
      stopContinuousDetection();
    };
  }, []);

  return <YourUI />;
}
```

### Manual Store Selection

Allow users to search and select stores manually:

```typescript
import React, { useState } from 'react';
import { StoreSelectionModal } from './components/StoreSelectionModal';
import { useStore } from './contexts/StoreContext';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);
  const { nearbyStores, selectStore, searchStores } = useStore();

  return (
    <>
      <Button onPress={() => setShowModal(true)}>
        Change Store
      </Button>

      <StoreSelectionModal
        visible={showModal}
        nearbyStores={nearbyStores}
        onSelectStore={(store) => {
          selectStore(store);
          setShowModal(false);
        }}
        onClose={() => setShowModal(false)}
        onSearch={searchStores}
      />
    </>
  );
}
```

### Handle Permission Requests

```typescript
import { useStore } from './contexts/StoreContext';
import { showPermissionRationale } from './utils/permissions';

function MyComponent() {
  const { permissionStatus, requestPermissions } = useStore();

  const handleRequestPermission = () => {
    if (permissionStatus?.canAskAgain) {
      showPermissionRationale(async () => {
        await requestPermissions();
      });
    } else if (permissionStatus?.blocked) {
      showPermissionSettingsAlert();
    }
  };

  if (!permissionStatus?.granted) {
    return (
      <View>
        <Text>Location permission needed</Text>
        <Button onPress={handleRequestPermission}>
          Enable Location
        </Button>
      </View>
    );
  }

  return <YourApp />;
}
```

### Use Store Detection Service Directly

For more control, use the service directly:

```typescript
import StoreDetectionService from './services/StoreDetectionService';
import LocationService from './services/LocationService';

async function detectMyStore() {
  const locationService = LocationService.getInstance();
  const detectionService = StoreDetectionService.getInstance({
    maxDistanceMeters: 100,
    minConfidence: 80,
  });

  // Check permissions first
  const permissions = await locationService.requestPermissions();
  if (!permissions.granted) {
    console.log('Permission denied');
    return;
  }

  // Detect store
  const result = await detectionService.detectStore();

  if (result.store) {
    console.log('Detected store:', result.store.name);
    console.log('Confidence:', result.confidence);
  } else {
    console.log('No store detected');
  }
}
```

### Customize Detection Behavior

Override default configuration:

```typescript
import StoreDetectionService from './services/StoreDetectionService';

const detectionService = StoreDetectionService.getInstance({
  maxDistanceMeters: 100,        // Wider detection radius
  minConfidence: 60,             // Lower confidence threshold
  enableWifiMatching: true,      // Use WiFi for enhanced detection
  enableBeaconMatching: false,   // Disable beacon detection
});
```

## API Integration

### Connect to Backend API

```typescript
import StoreApiService from './services/StoreApiService';

// Set up API service
const apiService = StoreApiService.getInstance();
apiService.setApiToken('your-auth-token');

// Fetch nearby stores
const stores = await apiService.getNearbyStores({
  lat: 42.3601,
  lng: -71.0589,
  radius: 1000,
  wicOnly: true,
});

// Search stores
const searchResults = await apiService.searchStores('Walmart');

// Detect store with API
const detection = await apiService.detectStore({
  lat: 42.3601,
  lng: -71.0589,
  wifiSsid: 'Store-Guest',
});
```

### Update Store Cache

Keep local store cache up-to-date:

```typescript
import StoreDetectionService from './services/StoreDetectionService';
import StoreApiService from './services/StoreApiService';
import LocationService from './services/LocationService';

async function updateStoreCache() {
  const apiService = StoreApiService.getInstance();
  const detectionService = StoreDetectionService.getInstance();
  const locationService = LocationService.getInstance();

  // Get current position
  const position = await locationService.getCurrentPosition();

  // Fetch nearby stores from API
  const stores = await apiService.getNearbyStores({
    lat: position.lat,
    lng: position.lng,
    radius: 5000, // 5km radius
  });

  // Update detection service cache
  detectionService.updateStoreCache(stores);
}
```

## Testing

### Mock Location Services

```typescript
// __mocks__/LocationService.ts
export class LocationService {
  async getCurrentPosition() {
    return {
      lat: 42.3601,
      lng: -71.0589,
    };
  }

  async requestPermissions() {
    return {
      granted: true,
      canAskAgain: false,
      blocked: false,
    };
  }
}
```

### Test Store Detection

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useStoreDetection } from './hooks/useStoreDetection';

test('detects store successfully', async () => {
  const { result } = renderHook(() => useStoreDetection());

  await act(async () => {
    await result.current.detectStore();
  });

  expect(result.current.currentStore).toBeDefined();
  expect(result.current.confidence).toBeGreaterThan(0);
});
```

## Best Practices

1. **Request Permissions Early**: Ask for location permissions during onboarding
2. **Provide Fallback**: Always allow manual store selection
3. **Show Confidence**: Display confidence level to users
4. **Cache Stores**: Minimize API calls by caching nearby stores
5. **Handle Errors**: Gracefully handle permission denials and GPS errors
6. **Battery Efficiency**: Stop continuous detection when not needed
7. **Privacy First**: Only use location for store detection, don't track movements

## Common Issues

### Store Not Detecting

**Problem**: Store detection fails or returns no results

**Solutions**:
- Verify GPS permissions are granted
- Check GPS signal strength (move outdoors)
- Ensure store exists in database
- Increase `maxDistanceMeters` in config
- Check API connectivity

### Low Accuracy

**Problem**: Wrong store detected or low confidence

**Solutions**:
- Wait for GPS to stabilize (30-60 seconds)
- Move closer to store entrance
- Enable WiFi for improved accuracy
- Manually confirm the correct store

### Permission Denied

**Problem**: User denied location permissions

**Solutions**:
- Show permission rationale before requesting
- Guide user to Settings if blocked
- Provide manual store selection as alternative
- Don't repeatedly prompt

### Battery Drain

**Problem**: Continuous detection drains battery

**Solutions**:
- Only enable when user is actively shopping
- Increase `locationUpdateInterval`
- Use geofencing instead of continuous polling
- Stop detection when app is backgrounded

## Performance Optimization

```typescript
// Debounce store updates
import { debounce } from 'lodash';

const debouncedDetection = debounce(async () => {
  await detectStore();
}, 5000); // Wait 5 seconds after last movement

// Lazy load store selection
const StoreSelectionModal = React.lazy(() =>
  import('./components/StoreSelectionModal')
);

// Memoize store list
const nearbyStoreList = useMemo(() => {
  return nearbyStores.filter(store => store.wicAuthorized);
}, [nearbyStores]);
```

## Support

For issues or questions:
- See the [README.md](./README.md) for detailed documentation
- Check the [specification](../specs/wic-benefits-app/specs/store-detection/spec.md)
- Review the [design document](../specs/wic-benefits-app/design.md)
