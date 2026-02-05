# Store Detection Implementation Guide

> How the GPS + WiFi + geofence store detection system works.

**Archive References:**
- Component architecture: `docs/archive/H4_COMPONENT_ARCHITECTURE.md`
- WiFi detection: `docs/archive/wifi-store-detection.md`
- Test plan: `docs/archive/TASK_H5_TEST_PLAN.md`
- Manual selection: `docs/archive/TASK_H5_MANUAL_STORE_SELECTION.md`

---

## Architecture Overview

```
StoreContext Provider
    │
    ├── HomeScreen
    │       ├── StoreDetectionBanner
    │       └── StoreSelectionModal
    │
    └── useStoreDetection Hook
            ├── currentStore
            ├── nearbyStores
            ├── confidence
            ├── isDetecting
            └── Actions: detectStore(), selectStore(), toggleFavorite()
```

---

## Component Hierarchy

```
StoreSelector (437 lines, orchestrator)
├── Permission Request Card
├── Detection State Card
├── Current Store Card
│   └── CurrentStoreDisplay (229 lines)
├── Favorites Section (horizontal scroll)
├── Recent Stores Section (horizontal scroll)
├── Nearby Stores Section
│   └── NearbyStoresList (216 lines)
├── Action Buttons
├── StoreConfirmationModal (222 lines)
└── StoreSearchModal (462 lines)
```

---

## Data Flow

### Initial Load

```
App Opens
    ↓
useStoreDetection hook initializes
    ↓
Load from AsyncStorage:
  - Confirmed stores
  - Favorite stores
  - Recent stores
    ↓
Check location permissions
    ↓
If granted → Auto-detect store
```

### Detection Flow

```
detectStore() called
    ↓
┌─────────────────┐     ┌─────────────────┐
│ LocationService │     │   WiFiService   │
│   (GPS coords)  │     │ (Network scan)  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     ↓
         Combine & Score Results
                     ↓
         Is this a new store?
                     ↓
         ┌───────────┴───────────┐
        YES                      NO
         ↓                       ↓
  Show Confirmation        Silent detection
       Modal               Store is active
```

---

## Confidence Scoring

### GPS-Only Confidence

| Distance | Confidence |
|----------|------------|
| ≤ 10m | 100% (Very Close) |
| ≤ 25m | 95% (Close) |
| ≤ 50m | 85% (Within Boundary) |
| ≤ 100m | 70% (Nearby) |
| ≤ 200m | 50% (Possibly Near) |
| > 200m | 30% (Far) |

### WiFi-Only Confidence

| Signal Strength | Match Type | Confidence |
|-----------------|------------|------------|
| Strong (>-60 dBm) | BSSID | 95% |
| Good (-60 to -70 dBm) | BSSID | 85% |
| Moderate (-70 to -80 dBm) | BSSID | 70% |
| Weak (<-80 dBm) | SSID only | 50% |

### Combined WiFi + GPS

When both methods agree on same store:
- **Confidence = max(GPS, WiFi) + 10%** (capped at 100%)
- Automatically bypasses confirmation requirement

When methods disagree:
- Geofence match at 95%+ confidence wins
- Otherwise, higher confidence method wins

---

## State Machine

```
INITIAL
    ↓
REQUESTING_PERMISSIONS
    ↓
    ├── Granted → DETECTING
    └── Denied → MANUAL_MODE
                     ↓
               DETECTING
                     ↓
    ├── Store Found → DETECTED
    └── No Store → NO_STORE
                     ↓
               DETECTED
                     ↓
    ├── Needs Confirm → PENDING_CONFIRM
    └── Auto-Accept → CONFIRMED
                     ↓
           PENDING_CONFIRM
                     ↓
    ├── User Confirms → CONFIRMED
    └── User Changes → MANUAL_MODE
```

---

## Key Files

```
app/
├── lib/
│   ├── services/
│   │   ├── storeDetection.ts      # Detection logic
│   │   ├── locationService.ts     # GPS handling
│   │   └── WiFiService.ts         # WiFi scanning
│   ├── hooks/
│   │   └── useStoreDetection.ts   # React hook
│   └── utils/
│       ├── distance.utils.ts      # Haversine, formatting
│       └── storeStorage.ts        # AsyncStorage helpers
├── components/
│   ├── StoreSelector.tsx
│   ├── CurrentStoreDisplay.tsx
│   ├── NearbyStoresList.tsx
│   ├── StoreLocationBanner.tsx
│   ├── StoreConfirmationModal.tsx
│   └── StoreSearchModal.tsx
└── types/
    └── store.types.ts
```

---

## Configuration

```typescript
const storeDetection = StoreDetectionService.getInstance({
  enableWifiMatching: true,
  enableBeaconMatching: false,  // Future
  maxDistanceMeters: 100,
  minConfidence: 70,
});

const wifiService = WiFiService.getInstance({
  scanIntervalMs: 30000,
  signalThreshold: -80,  // dBm
});
```

---

## Performance Optimizations

| Component | Strategy |
|-----------|----------|
| StoreSelector | useCallback for stable refs, conditional rendering |
| NearbyStoresList | FlatList virtualization, keyExtractor |
| StoreSearchModal | Debounced search, keyboard-aware |
| CurrentStoreDisplay | Memoized rendering |
| StoreLocationBanner | Lightweight, no heavy computations |

---

## Platform Differences

### WiFi Scanning

**Android:**
- Full WiFi network scanning available
- Requires `ACCESS_FINE_LOCATION` permission
- Can see all nearby networks with RSSI

**iOS:**
- Limited to currently connected network only
- Privacy restrictions prevent full scanning
- Relies more heavily on GPS

---

## Testing

See `TEST_STRATEGY.md` for full testing patterns.

Quick verification:
```bash
cd app
npm test distance.utils.test.ts
npm test storeStorage.test.ts
```

---

## Common Issues

### WiFi Not Detecting

**Check:**
1. `wifiService.isSupported()` returns true
2. Location permission granted (required on Android)
3. WiFi enabled on device
4. Store WiFi data exists in database

### Low Confidence Scores

**Causes:**
- Weak WiFi signal (RSSI < -80 dBm)
- SSID match only (no BSSID match)
- GPS inaccuracy

**Solutions:**
- Move closer to store
- Combine WiFi + GPS
- Update store database with BSSIDs

---

*Last Updated: February 2026*
