# WiFi-Based Store Detection Implementation

## Task H3: Add WiFi-based location hints

This implementation adds WiFi network scanning as a supplementary method for store detection, working in combination with GPS to provide higher accuracy and confidence.

## Files Created/Modified

### New Files

1. **`WiFiService.ts`** - WiFi scanning and matching service
   - Scans for nearby WiFi networks
   - Gets currently connected network
   - Matches WiFi signals to store database
   - Calculates confidence based on signal strength
   - Handles platform-specific WiFi APIs

2. **`../utils/wifi-permissions.ts`** - Permission handling utilities
   - Checks WiFi/location permissions
   - Requests permissions with user-friendly messages
   - Platform-specific permission logic
   - Settings navigation helpers

3. **`../examples/WiFiStoreDetectionExample.tsx`** - Demo component
   - Interactive WiFi + GPS detection demo
   - Real-time WiFi network scanning
   - Detection logs and metrics display
   - Simulation mode for testing

### Modified Files

1. **`StoreDetectionService.ts`** - Enhanced with WiFi integration
   - Added WiFiService instance
   - Enhanced `detectStore()` to use WiFi hints
   - Added `detectStoreWithWifiHints()` method
   - Added `combineDetectionResults()` for intelligent result merging
   - Updated detection confidence calculation

## How It Works

### Detection Flow

```
1. User requests store detection
   ↓
2. Get GPS coordinates (LocationService)
   ↓
3. Get nearby stores within radius
   ↓
4. Scan WiFi networks (WiFiService)
   ↓
5. Match WiFi to store database
   ↓
6. Perform GPS-based detection
   ↓
7. Combine WiFi + GPS results
   ↓
8. Return best match with confidence score
```

### Result Combination Logic

**Case 1: WiFi and GPS agree (same store)**
- Confidence = max(GPS, WiFi) + 10% (capped at 100%)
- Method = 'wifi'
- Very high confidence, no confirmation needed

**Case 2: WiFi and GPS disagree**
- If GPS has geofence match at 95%+: Choose GPS
- Otherwise: Choose higher confidence method
- Confirmation may be required

**Case 3: WiFi only (no GPS)**
- Use WiFi result directly
- Confidence based on signal strength

**Case 4: GPS only (no WiFi)**
- Use GPS result directly
- Confidence based on distance/geofence

### Confidence Scoring

WiFi confidence factors:
- Signal strength (RSSI)
- BSSID vs SSID match (BSSID is more precise)
- Network uniqueness

GPS confidence factors:
- Geofence containment
- Distance to store center
- Accuracy of GPS signal

## Platform Differences

### Android
- Requires `ACCESS_FINE_LOCATION` permission
- Can scan multiple nearby WiFi networks
- Provides RSSI (signal strength) for each network
- Uses `WifiManager` API

### iOS
- Limited to currently connected network
- No special permission required
- Cannot scan all nearby networks (privacy restriction)
- Uses `NEHotspotHelper` or `CaptiveNetwork` API

## Usage Examples

### Basic Detection

```typescript
import StoreDetectionService from './services/StoreDetectionService';

const storeDetection = StoreDetectionService.getInstance({
  enableWifiMatching: true,
  maxDistanceMeters: 100,
});

const result = await storeDetection.detectStore();

if (result.store) {
  console.log(`Detected: ${result.store.name}`);
  console.log(`Method: ${result.method}`);
  console.log(`Confidence: ${result.confidence}%`);
}
```

### Manual WiFi Check

```typescript
import WiFiService from './services/WiFiService';

const wifiService = WiFiService.getInstance();

// Check current network
const currentNetwork = await wifiService.getCurrentNetwork();
if (currentNetwork) {
  console.log(`Connected to: ${currentNetwork.ssid}`);
  console.log(`Signal: ${currentNetwork.signalStrength} dBm`);
}

// Scan nearby networks (Android only)
const networks = await wifiService.scanNetworks();
console.log(`Found ${networks.length} networks`);
```

### Permission Handling

```typescript
import { ensureWiFiPermission } from './utils/wifi-permissions';

const permissionResult = await ensureWiFiPermission();

if (!permissionResult.granted) {
  console.log('WiFi detection disabled:', permissionResult.message);
  // Fall back to GPS-only mode
}
```

## Configuration

### StoreDetectionService Config

```typescript
{
  enableWifiMatching: true,        // Enable/disable WiFi detection
  enableBeaconMatching: false,     // Bluetooth beacons (future)
  maxDistanceMeters: 100,          // GPS search radius
  minConfidence: 70,               // Minimum confidence to accept
}
```

### WiFiService Config

```typescript
{
  scanIntervalMs: 30000,           // How often to scan (30s default)
  signalThreshold: -80,            // Minimum RSSI in dBm
}
```

## Store Data Requirements

Stores need WiFi network data in their records:

```typescript
interface Store {
  // ... other fields
  wifiNetworks?: WiFiNetwork[];
}

interface WiFiNetwork {
  ssid: string;     // "Walmart WiFi"
  bssid: string;    // "AA:BB:CC:DD:EE:FF" (MAC address)
}
```

**Data Collection:**
- Manual verification by store visits
- Crowdsourced user reports
- Retailer partnership data
- Public WiFi databases

## Testing

### Run Example Demo

```typescript
// Import and render the example component
import WiFiStoreDetectionExample from './examples/WiFiStoreDetectionExample';

// Component includes:
// - Real WiFi scanning
// - Simulated WiFi matching
// - Detection logs
// - Metrics display
```

### Mock WiFi Data

```typescript
// Simulate WiFi network for testing
import WiFiService from './services/WiFiService';

const wifiService = WiFiService.getInstance();

const mockNetwork = {
  ssid: 'Test WiFi',
  bssid: 'AA:BB:CC:DD:EE:FF',
  signalStrength: -65,
  timestamp: new Date(),
};

wifiService.updateCurrentNetwork(mockNetwork);
```

## Known Limitations

### iOS Restrictions
- Cannot scan multiple WiFi networks
- Only current network available
- Less effective for store selection in dense areas

### Android Battery
- WiFi scanning uses battery
- Default scan interval: 30s (configurable)
- Scans only when app is active

### WiFi Data Coverage
- Requires stores to have WiFi data in database
- Not all stores have public WiFi
- Some stores may have multiple networks

## Future Improvements

1. **WiFi Fingerprinting**
   - Use signal patterns from multiple APs
   - Create location "fingerprints"
   - Improve indoor accuracy

2. **Crowdsourced WiFi Data**
   - Users report WiFi at stores
   - Verification system
   - Expand coverage

3. **Machine Learning**
   - Learn WiFi patterns over time
   - Predict store entry/exit
   - Personalized detection

4. **Bluetooth Beacons**
   - Even more precise positioning
   - Aisle-level detection
   - Requires retailer partnerships

## API Integration

### Backend Endpoint

WiFi data should be included in store records from the API:

```typescript
GET /api/v1/stores/{storeId}

Response:
{
  "id": "store-123",
  "name": "Walmart Supercenter",
  // ... other fields
  "wifiNetworks": [
    {
      "ssid": "Walmart WiFi",
      "bssid": "AA:BB:CC:DD:EE:01"
    },
    {
      "ssid": "Walmart Guest",
      "bssid": "AA:BB:CC:DD:EE:02"
    }
  ]
}
```

### Crowdsource WiFi Reports

Future endpoint to collect WiFi data from users:

```typescript
POST /api/v1/stores/{storeId}/wifi-report
{
  "ssid": "Store WiFi",
  "bssid": "AA:BB:CC:DD:EE:FF",
  "signalStrength": -65,
  "verified": false
}
```

## Support

For questions or issues with WiFi detection:
1. Check platform support with `wifiService.isSupported()`
2. Verify permissions with `checkWiFiPermission()`
3. Review logs in example component
4. Test with simulated WiFi data

## References

- Store Detection Spec: `../../specs/wic-benefits-app/specs/store-detection/spec.md`
- Design Doc: `../../specs/wic-benefits-app/design.md`
- Documentation: `../../docs/wifi-store-detection.md`
- Tasks: `../../specs/wic-benefits-app/tasks.md` (Task H3)
