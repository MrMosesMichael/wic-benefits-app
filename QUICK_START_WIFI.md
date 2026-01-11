# WiFi Store Detection - Quick Start Guide

## 🚀 Quick Start (5 minutes)

### 1. Import the Services

```typescript
import { StoreDetectionService, WiFiService } from './services';
import { ensureWiFiPermission } from './utils/wifi-permissions';
```

### 2. Initialize Services

```typescript
// Initialize with WiFi enabled
const storeDetection = StoreDetectionService.getInstance({
  enableWifiMatching: true,
  maxDistanceMeters: 100,
});
```

### 3. Request Permissions

```typescript
// Check/request WiFi permission (Android location permission)
const permission = await ensureWiFiPermission();

if (!permission.granted) {
  console.log('WiFi detection disabled, using GPS only');
}
```

### 4. Detect Store

```typescript
// Automatically uses WiFi + GPS for best accuracy
const result = await storeDetection.detectStore();

if (result.store) {
  console.log(`Found: ${result.store.name}`);
  console.log(`Method: ${result.method}`); // 'wifi', 'gps', or 'geofence'
  console.log(`Confidence: ${result.confidence}%`);
}
```

## 📱 Run the Demo

```typescript
import WiFiStoreDetectionExample from './examples/WiFiStoreDetectionExample';

// Render in your app to see WiFi detection in action
<WiFiStoreDetectionExample />
```

## 🎯 Key Features

- ✅ Automatic WiFi + GPS combination
- ✅ Platform-specific handling (iOS/Android)
- ✅ Confidence scoring (0-100%)
- ✅ Privacy-focused (no data storage)
- ✅ Battery-efficient
- ✅ Fallback to GPS-only

## 📊 Confidence Levels

| Method | Confidence | When Used |
|--------|-----------|-----------|
| WiFi + GPS (agree) | 95-100% | Best case - both methods confirm same store |
| WiFi strong signal | 85-95% | Good WiFi match with strong signal |
| GPS geofence | 95-100% | Inside store boundary polygon |
| GPS proximity | 70-95% | Near store, no WiFi match |
| WiFi weak signal | 50-70% | WiFi match but weak signal |

## 🔧 Configuration

```typescript
// Customize detection behavior
const storeDetection = StoreDetectionService.getInstance({
  enableWifiMatching: true,        // Enable WiFi hints
  maxDistanceMeters: 100,          // GPS search radius
  minConfidence: 70,               // Minimum confidence threshold
});

// Customize WiFi scanning
const wifiService = WiFiService.getInstance({
  scanIntervalMs: 30000,           // Scan every 30 seconds
  signalThreshold: -80,            // Minimum signal strength (dBm)
});
```

## 🐛 Troubleshooting

### WiFi not working?

```typescript
// Check if supported
const wifiService = WiFiService.getInstance();
if (!wifiService.isSupported()) {
  console.log('WiFi scanning not supported on this platform');
}

// Check permission
import { isWiFiScanningAvailable } from './utils/wifi-permissions';
const available = await isWiFiScanningAvailable();
if (!available.available) {
  console.log('WiFi unavailable:', available.reason);
}
```

### Low confidence scores?

- Move closer to store
- Check WiFi is enabled on device
- Verify store has WiFi data in database
- Check signal strength (should be > -80 dBm)

## 📖 Full Documentation

- **Technical Details:** `docs/wifi-store-detection.md`
- **Service Documentation:** `src/services/README_WIFI.md`
- **Implementation Summary:** `TASK_H3_IMPLEMENTATION.md`

## 🧪 Testing

```typescript
// Simulate WiFi match for testing
const wifiService = WiFiService.getInstance();

const mockWifi = {
  ssid: 'Test Store WiFi',
  bssid: 'AA:BB:CC:DD:EE:FF',
  signalStrength: -65,
  timestamp: new Date(),
};

wifiService.updateCurrentNetwork(mockWifi);

// Now detect - will use mocked WiFi
const result = await storeDetection.detectStore();
```

## ⚠️ Important Notes

1. **Android:** Requires location permission for WiFi scanning
2. **iOS:** Limited to current network only (platform restriction)
3. **Store Data:** Stores must have `wifiNetworks` field populated
4. **Battery:** WiFi scanning uses minimal battery (less than GPS)
5. **Privacy:** WiFi data used only for matching, not stored

## 🎨 Example Use Cases

### Use Case 1: Shopping Mall (Multiple Stores)
```typescript
// GPS shows 3 stores within 50m
// WiFi identifies exact store: "Target Guest WiFi"
// Result: High confidence (95%) detection
```

### Use Case 2: Parking Garage (Weak GPS)
```typescript
// GPS unavailable underground
// WiFi detects "Walmart Store #1234"
// Result: WiFi-only detection (90% confidence)
```

### Use Case 3: Street Corner (2 Stores)
```typescript
// GPS: "Near Kroger and Safeway"
// WiFi: "Kroger_Free_WiFi"
// Result: Combined detection (100% confidence)
```

## 🚦 Next Steps

1. ✅ Task H3 complete - WiFi hints implemented
2. ⏭️ Task H4 - Store confirmation UX
3. ⏭️ Task H5 - Manual store selection
4. ⏭️ Add unit tests
5. ⏭️ Implement native WiFi scanning module

---

**Need Help?** Check the full documentation or run the example component!
