# WiFi-Based Store Detection (Task H3)

## Overview

WiFi-based location hints supplement GPS detection to improve store identification accuracy. This feature combines WiFi network scanning with GPS coordinates to provide higher confidence store detection, especially in areas with weak GPS signals or densely located stores.

## Architecture

### Components

1. **WiFiService** (`src/services/WiFiService.ts`)
   - Scans for nearby WiFi networks
   - Gets currently connected WiFi network
   - Matches WiFi signals to store database
   - Provides signal strength-based confidence scoring

2. **StoreDetectionService** (Enhanced)
   - Combines WiFi and GPS detection methods
   - Implements intelligent result combination logic
   - Provides fallback mechanisms when one method fails

### Data Flow

```
User Location Request
        ↓
┌───────────────────┐
│ StoreDetection    │
│ Service           │
└────────┬──────────┘
         │
         ├─────────────────┐
         ↓                 ↓
┌────────────────┐  ┌──────────────┐
│ LocationService│  │ WiFiService  │
│ (GPS)          │  │ (WiFi Scan)  │
└────────┬───────┘  └──────┬───────┘
         │                 │
         ↓                 ↓
    GPS coords       WiFi networks
         │                 │
         └────────┬────────┘
                  ↓
         Combine & Score Results
                  ↓
         StoreDetectionResult
```

## Detection Logic

### Confidence Scoring

The system uses a multi-tier confidence scoring system:

#### WiFi-Only Detection
- Strong signal (>-60 dBm) + BSSID match: **95% confidence**
- Good signal (-60 to -70 dBm) + BSSID match: **85% confidence**
- Moderate signal (-70 to -80 dBm) + BSSID match: **70% confidence**
- Weak signal (<-80 dBm) or SSID-only match: **50% confidence**

#### GPS-Only Detection
- Inside geofence + close to center (<25m): **100% confidence**
- Inside geofence + moderate distance (25-100m): **98% confidence**
- Inside geofence + far from center (>100m): **95% confidence**
- Near store without geofence (<10m): **100% confidence**
- Near store (10-25m): **95% confidence**
- Within likely boundary (25-50m): **85% confidence**
- Nearby (50-100m): **70% confidence**
- Possibly nearby (100-200m): **50% confidence**
- Far (>200m): **30% confidence**

#### Combined WiFi + GPS Detection
When both methods agree on the same store:
- **Confidence = max(GPS confidence, WiFi confidence) + 10%**
- Capped at 100%
- Automatically bypasses confirmation requirement

When methods disagree:
- Geofence match with 95%+ confidence wins
- Otherwise, higher confidence method wins

## Implementation Details

### WiFi Scanning

#### Platform Support

**Android:**
- Requires `ACCESS_FINE_LOCATION` permission (Android 6.0+)
- Uses `WifiManager.startScan()` and `WifiManager.getScanResults()`
- Can scan for multiple nearby networks
- Provides RSSI (signal strength) for confidence scoring

**iOS:**
- Limited to currently connected network only
- Uses `NEHotspotHelper` or `CaptiveNetwork` API
- Requires special entitlements for full WiFi info
- Privacy restrictions prevent scanning all nearby networks

### WiFi Network Database

Stores maintain a list of associated WiFi networks:

```typescript
interface Store {
  // ... other fields
  wifiNetworks?: WiFiNetwork[];
}

interface WiFiNetwork {
  ssid: string;     // Network name
  bssid: string;    // MAC address (more precise than SSID)
}
```

**Data Collection Methods:**
1. Manual verification by field teams
2. Crowdsourced from user reports
3. Partnership data from retailers
4. Public WiFi databases

### Matching Algorithm

```typescript
// 1. Scan for WiFi networks
const networks = await wifiService.scanNetworks();

// 2. Build database from nearby stores
const wifiDB = new Map<storeId, WiFiNetwork[]>();
nearbyStores.forEach(store => {
  if (store.wifiNetworks) {
    wifiDB.set(store.id, store.wifiNetworks);
  }
});

// 3. Match scanned networks to stores
const matches = wifiService.matchNetworksToStores(networks, wifiDB);

// 4. Combine with GPS results
const finalResult = combineDetectionResults(gpsMatch, wifiMatch);
```

## Use Cases

### Use Case 1: Indoor Shopping Mall
**Scenario:** User is in a mall with multiple stores in close proximity

**Problem:** GPS is inaccurate indoors, stores are within 50m of each other

**Solution:** WiFi detection identifies the specific store based on unique WiFi networks

**Result:** High confidence (90%+) detection even with poor GPS signal

### Use Case 2: Urban Dense Retail
**Scenario:** Multiple grocery stores on the same block

**Problem:** GPS accuracy is 10-50m, stores are within range of each other

**Solution:** WiFi narrows down to the exact store

**Result:** Combined WiFi + GPS provides 100% confidence

### Use Case 3: Parking Lot Approach
**Scenario:** User walking from parking lot toward store

**Problem:** GPS shows proximity but user hasn't entered yet

**Solution:** WiFi signal appears when user gets close enough

**Result:** System detects when user enters store boundary via WiFi

### Use Case 4: GPS Denied Environment
**Scenario:** User in underground parking or GPS-challenged area

**Problem:** GPS unavailable or highly inaccurate

**Solution:** WiFi-only detection provides store identification

**Result:** Functional store detection without GPS dependency

## Configuration

### Service Configuration

```typescript
const storeDetection = StoreDetectionService.getInstance({
  enableWifiMatching: true,        // Enable WiFi detection
  enableBeaconMatching: false,     // Bluetooth beacons (future)
  maxDistanceMeters: 100,          // GPS search radius
  minConfidence: 70,               // Minimum confidence threshold
});

const wifiService = WiFiService.getInstance({
  scanIntervalMs: 30000,           // Scan every 30 seconds
  signalThreshold: -80,            // Minimum RSSI in dBm
});
```

### Feature Flags

The system automatically detects platform capabilities:

```typescript
if (wifiService.isSupported()) {
  // WiFi scanning available
} else {
  // Fall back to GPS-only
}
```

## Privacy & Security

### Location Privacy
- WiFi data used only for store matching
- No WiFi scan results stored long-term
- No sharing with third parties
- User can disable WiFi matching in settings

### Data Minimization
- Only store WiFi network identifiers (SSID/BSSID)
- No sensitive network information collected
- WiFi data cleared after store detection

### User Consent
- Location permission required (covers WiFi on Android)
- Clear explanation of how WiFi is used
- Opt-out available in privacy settings

## Testing

### Manual Testing

Use the example component to test WiFi detection:

```typescript
import WiFiStoreDetectionExample from './examples/WiFiStoreDetectionExample';

// Renders interactive demo with:
// - Real-time WiFi scanning
// - Combined detection results
// - Confidence scoring display
// - Detection logs
```

### Simulated Testing

The example includes a "Simulate WiFi Match" feature to test without being physically at a store:

```typescript
const mockWifi: WiFiScanResult = {
  ssid: 'Walmart WiFi',
  bssid: 'AA:BB:CC:DD:EE:01',
  signalStrength: -65,
  timestamp: new Date(),
};

wifiService.updateCurrentNetwork(mockWifi);
const result = await storeDetection.detectStore();
```

## Performance Considerations

### Battery Impact
- WiFi scanning is less power-intensive than GPS
- Scan interval configurable (default: 30s)
- Scans triggered only when needed

### Network Load
- WiFi scanning is passive (no network requests)
- Store WiFi database cached locally
- Minimal data transfer

### CPU Usage
- Matching algorithm is O(n×m) where n=scanned networks, m=stores
- Typically: n<10, m<20, very fast
- Runs on background thread to avoid UI blocking

## Future Enhancements

### Phase 2 Features
1. **Bluetooth Beacon Support**
   - Even more precise indoor positioning
   - Aisle-level location detection
   - Requires retailer partnerships

2. **WiFi Fingerprinting**
   - Use signal strength patterns from multiple access points
   - Create location "fingerprints" for stores
   - Improves accuracy in complex environments

3. **Machine Learning**
   - Learn WiFi patterns over time
   - Predict store entry/exit based on signal changes
   - Personalized detection based on user patterns

4. **Crowd-Sourced WiFi Data**
   - Users report WiFi networks at stores
   - Verification system to prevent spam
   - Expand WiFi database coverage

## Troubleshooting

### WiFi Not Detecting

**Symptoms:** WiFi detection always returns null

**Possible Causes:**
1. Platform not supported (check `wifiService.isSupported()`)
2. Location permission not granted (required on Android)
3. No WiFi enabled on device
4. Store WiFi database empty

**Solutions:**
- Check platform support
- Request location permission
- Enable WiFi on device
- Populate store WiFi data

### Low Confidence Scores

**Symptoms:** WiFi detection confidence below 70%

**Possible Causes:**
1. Weak WiFi signal (RSSI < -80 dBm)
2. SSID match only (no BSSID match)
3. Interference from multiple networks

**Solutions:**
- Move closer to store
- Update store WiFi database with BSSIDs
- Combine with GPS for higher confidence

### WiFi and GPS Disagree

**Symptoms:** WiFi detects Store A, GPS detects Store B

**Behavior:**
- System chooses higher confidence result
- Geofence match at 95%+ confidence overrides WiFi
- Otherwise WiFi typically wins due to higher precision

**User Experience:**
- Brief confirmation prompt shown
- User can select correct store
- Selection teaches system over time

## References

- Store Detection Spec: `specs/wic-benefits-app/specs/store-detection/spec.md`
- Design Document: `specs/wic-benefits-app/design.md`
- WiFi Service: `src/services/WiFiService.ts`
- Store Detection Service: `src/services/StoreDetectionService.ts`
- Example Implementation: `src/examples/WiFiStoreDetectionExample.tsx`
