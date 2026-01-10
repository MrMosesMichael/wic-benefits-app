# WiFi Service Tests - TODO

## Overview
This document outlines the tests that should be written for the WiFi-based store detection functionality (Task H3).

## Test Files Needed

### 1. `WiFiService.test.ts`

Unit tests for WiFiService core functionality.

#### Test Suites

**WiFiService - Network Scanning**
- [ ] `should initialize with default config`
- [ ] `should initialize with custom config`
- [ ] `should return true for isSupported() on iOS and Android`
- [ ] `should return false for isSupported() on unsupported platforms`
- [ ] `should return null when getCurrentNetwork() fails`
- [ ] `should return cached network when available`
- [ ] `should return empty array when scanNetworks() fails`
- [ ] `should handle platform-specific scanning limitations`

**WiFiService - Continuous Scanning**
- [ ] `should start continuous scanning successfully`
- [ ] `should not start scanning if already in progress`
- [ ] `should stop continuous scanning and clear interval`
- [ ] `should detect network changes correctly`
- [ ] `should not notify callback if networks haven't changed`
- [ ] `should handle errors during continuous scanning`
- [ ] `should use configured scan interval`

**WiFiService - Network Comparison**
- [ ] `hasNetworksChanged should return true when networks added`
- [ ] `hasNetworksChanged should return true when networks removed`
- [ ] `hasNetworksChanged should return false when networks unchanged`
- [ ] `hasNetworksChanged should compare by BSSID not SSID`

**WiFiService - Signal Strength Filtering**
- [ ] `should filter networks below signal threshold`
- [ ] `should keep networks above signal threshold`
- [ ] `should use configured threshold when provided`
- [ ] `should use default threshold when not provided`
- [ ] `should handle networks with undefined signal strength`

**WiFiService - Network Matching**
- [ ] `should match network by SSID`
- [ ] `should match network by BSSID`
- [ ] `should prefer BSSID match over SSID match`
- [ ] `should calculate confidence based on signal strength`
  - Strong signal (>-60 dBm) should give 95% base confidence
  - Good signal (-60 to -70 dBm) should give 85% base confidence
  - Moderate signal (-70 to -80 dBm) should give 70% base confidence
  - Weak signal (<-80 dBm) should give 50% base confidence
- [ ] `should add 10% confidence for BSSID match (capped at 100%)`
- [ ] `should sort matches by confidence descending`
- [ ] `should handle empty scanned networks list`
- [ ] `should handle empty store WiFi database`
- [ ] `should skip networks with no SSID or BSSID`
- [ ] `should handle multiple stores with same WiFi network`

**WiFiService - Helper Methods**
- [ ] `getStrongestNetwork should return network with highest signal`
- [ ] `getStrongestNetwork should handle networks without signal strength`
- [ ] `getStrongestNetwork should return null for empty array`
- [ ] `updateCurrentNetwork should cache network correctly`
- [ ] `getLastScanResults should return cached results`
- [ ] `clearCache should clear all cached data`

### 2. `wifi-permissions.test.ts`

Unit tests for WiFi permission utilities.

#### Test Suites

**WiFi Permissions - Check Permission**
- [ ] `checkWiFiPermission should return granted:true on Android when permission granted`
- [ ] `checkWiFiPermission should return granted:false on Android when permission denied`
- [ ] `checkWiFiPermission should return granted:true on iOS (no permission needed)`
- [ ] `checkWiFiPermission should handle permission check errors gracefully`

**WiFi Permissions - Request Permission**
- [ ] `requestWiFiPermission should request ACCESS_FINE_LOCATION on Android`
- [ ] `requestWiFiPermission should return granted:true when user accepts`
- [ ] `requestWiFiPermission should return granted:false when user denies`
- [ ] `requestWiFiPermission should detect NEVER_ASK_AGAIN status`
- [ ] `requestWiFiPermission should return granted:true on iOS without prompting`
- [ ] `requestWiFiPermission should handle request errors gracefully`

**WiFi Permissions - Combined Operations**
- [ ] `ensureWiFiPermission should return immediately if already granted`
- [ ] `ensureWiFiPermission should request if not granted and can request`
- [ ] `ensureWiFiPermission should not request if permanently denied`

**WiFi Permissions - Settings Navigation**
- [ ] `openWiFiPermissionSettings should call Linking.openSettings on Android`
- [ ] `openWiFiPermissionSettings should call Linking.openURL with app-settings on iOS`
- [ ] `openWiFiPermissionSettings should handle errors gracefully`

**WiFi Permissions - Status Messages**
- [ ] `getWiFiPermissionStatusMessage should return appropriate message for each status`
- [ ] `isWiFiScanningAvailable should check platform support`
- [ ] `isWiFiScanningAvailable should check permission status`

### 3. `StoreDetectionService.WiFi.test.ts`

Integration tests for WiFi integration with StoreDetectionService.

#### Test Suites

**Store Detection - WiFi Integration**
- [ ] `detectStore should use WiFi when enabled in config`
- [ ] `detectStore should skip WiFi when disabled in config`
- [ ] `detectStore should skip WiFi when platform not supported`
- [ ] `detectStoreWithWifiHints should match WiFi networks to nearby stores`
- [ ] `detectStoreWithWifiHints should return null when no WiFi data available`
- [ ] `detectStoreWithWifiHints should return null when no WiFi match found`

**Store Detection - Combined Results**
- [ ] `should boost confidence when WiFi and GPS agree (same store)`
- [ ] `should prefer geofence match when WiFi and GPS disagree`
- [ ] `should prefer higher confidence method when WiFi and GPS disagree`
- [ ] `should use WiFi result when no GPS match`
- [ ] `should use GPS result when no WiFi match`
- [ ] `should return null when neither WiFi nor GPS match`
- [ ] `should set requiresConfirmation=false for high confidence (95%+)`
- [ ] `should set requiresConfirmation=false when store already confirmed`
- [ ] `should handle null store without crashing`

**Store Detection - WiFi-Only Scenarios**
- [ ] `should detect store using WiFi when GPS unavailable`
- [ ] `should detect store using WiFi in indoor environment`
- [ ] `should detect store using WiFi in GPS-denied area`

**Store Detection - Real-World Scenarios**
- [ ] `should handle shopping mall with multiple stores (WiFi disambiguates)`
- [ ] `should handle parking lot approach (WiFi confirms entry)`
- [ ] `should handle weak WiFi signal properly`
- [ ] `should handle store without WiFi data (GPS fallback)`

### 4. `WiFiStoreDetectionExample.test.tsx`

Component tests for the example UI.

#### Test Suites

**WiFi Example Component**
- [ ] `should render without crashing`
- [ ] `should initialize services only once using useMemo`
- [ ] `should display mock store data`
- [ ] `should update WiFi networks list on scan`
- [ ] `should display detection results correctly`
- [ ] `should show confidence, method, and distance metrics`
- [ ] `should add logs during detection process`
- [ ] `should handle detection errors gracefully`
- [ ] `should simulate WiFi match correctly`
- [ ] `should clear logs when clear button pressed`

## Mock Data Requirements

### Mock WiFi Networks
```typescript
const mockWiFiNetworks: WiFiScanResult[] = [
  {
    ssid: 'Walmart WiFi',
    bssid: 'AA:BB:CC:DD:EE:01',
    signalStrength: -65,
    timestamp: new Date(),
  },
  {
    ssid: 'Kroger_Guest',
    bssid: 'BB:CC:DD:EE:FF:01',
    signalStrength: -75,
    timestamp: new Date(),
  },
];
```

### Mock Stores with WiFi Data
```typescript
const mockStores: Store[] = [
  {
    id: 'store-1',
    name: 'Walmart',
    wifiNetworks: [
      { ssid: 'Walmart WiFi', bssid: 'AA:BB:CC:DD:EE:01' },
      { ssid: 'Walmart Guest', bssid: 'AA:BB:CC:DD:EE:02' },
    ],
    // ... other store fields
  },
];
```

## Testing Utilities Needed

### WiFi Service Mocks
```typescript
const createMockWiFiService = () => ({
  isSupported: jest.fn(() => true),
  getCurrentNetwork: jest.fn(),
  scanNetworks: jest.fn(),
  matchNetworksToStores: jest.fn(),
  startContinuousScanning: jest.fn(),
  stopContinuousScanning: jest.fn(),
});
```

### Platform Mocks
```typescript
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  PermissionsAndroid: {
    check: jest.fn(),
    request: jest.fn(),
    PERMISSIONS: { ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION' },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
  },
  Linking: {
    openSettings: jest.fn(),
    openURL: jest.fn(),
  },
}));
```

## Test Coverage Goals

- **WiFiService.ts**: Target 90%+ coverage
  - All public methods tested
  - Error handling tested
  - Edge cases covered

- **wifi-permissions.ts**: Target 85%+ coverage
  - Platform-specific logic tested
  - Permission states covered

- **StoreDetectionService WiFi integration**: Target 80%+ coverage
  - Combined detection logic tested
  - All confidence calculation paths tested

- **Example Component**: Target 70%+ coverage
  - Main user flows tested
  - Error states tested

## Test Execution

### Run all WiFi-related tests
```bash
npm test -- WiFi
```

### Run specific test file
```bash
npm test -- WiFiService.test.ts
```

### Run with coverage
```bash
npm test -- --coverage WiFi
```

## Notes

1. **Native Module Mocking**: Since WiFi scanning requires native modules, tests should mock these dependencies appropriately.

2. **Async Testing**: Most WiFi operations are async, so tests should use async/await or return promises.

3. **Signal Strength**: Test various signal strength scenarios to ensure confidence calculations are correct.

4. **Platform Differences**: Test both iOS and Android code paths separately.

5. **Error Scenarios**: Test network errors, permission denials, and platform-specific failures.

6. **Performance**: Test that continuous scanning doesn't cause memory leaks or excessive callbacks.

## Priority

**High Priority** (Implement first):
- WiFiService core functionality tests
- Store detection integration tests
- Permission handling tests

**Medium Priority**:
- Edge case tests
- Performance tests

**Low Priority**:
- Component rendering tests
- Mock data validation tests
