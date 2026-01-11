# WiFi Store Detection Flow Diagram

## High-Level Detection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       User Opens App                             │
│                    or Enters Store Area                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               StoreDetectionService.detectStore()                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌──────────────────────┐   ┌──────────────────────┐
    │  Get GPS Location    │   │  Scan WiFi Networks  │
    │  (LocationService)   │   │  (WiFiService)       │
    └──────────┬───────────┘   └──────────┬───────────┘
               │                           │
               │                           │
               ▼                           ▼
    ┌──────────────────────┐   ┌──────────────────────┐
    │ Get Nearby Stores    │   │ Get Current Network  │
    │ (within 150m)        │   │ SSID/BSSID          │
    └──────────┬───────────┘   └──────────┬───────────┘
               │                           │
               │                           │
               ▼                           ▼
    ┌──────────────────────┐   ┌──────────────────────┐
    │ GPS Detection:       │   │ WiFi Matching:       │
    │ - Check geofences    │   │ - Match to store DB  │
    │ - Calculate distance │   │ - Score by signal    │
    │ - Score confidence   │   │ - Get best match     │
    └──────────┬───────────┘   └──────────┬───────────┘
               │                           │
               └────────────┬──────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  Combine Results        │
              │  (Decision Logic)       │
              └────────────┬────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌──────────┐      ┌──────────┐     ┌──────────┐
   │ Both     │      │ WiFi     │     │ GPS      │
   │ Agree    │      │ Only     │     │ Only     │
   └────┬─────┘      └────┬─────┘     └────┬─────┘
        │                 │                 │
        │                 │                 │
        ▼                 ▼                 ▼
   Boost conf      Use WiFi result    Use GPS result
   +10%            (50-95% conf)      (30-100% conf)
   95-100%
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │  Return Detection       │
              │  Result to User         │
              └─────────────────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │  Confirmation Needed?   │
              └────────┬────────────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
        ┌──────────┐      ┌──────────┐
        │ Yes:     │      │ No:      │
        │ < 95%    │      │ >= 95%   │
        │ conf     │      │ conf     │
        └────┬─────┘      └────┬─────┘
             │                 │
             ▼                 ▼
      Show confirm       Auto-accept
      dialog             store
```

## Decision Logic Detail

```
┌────────────────────────────────────────────────────────────┐
│           combineDetectionResults()                        │
└────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
         Has WiFi Result?        Has GPS Result?
                │                       │
        ┌───────┴───────┐       ┌──────┴──────┐
        │               │       │             │
       YES             NO      YES           NO
        │               │       │             │
        │               │       │             │
        │               │       ▼             ▼
        │               │    Return        Return
        │               │    GPS           null
        │               │    result
        │               │
        │               ▼
        │          Return WiFi
        │          result
        │
        ▼
┌────────────────────────────────────────┐
│  Do WiFi and GPS agree on same store? │
└──────────────┬─────────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
     YES               NO
      │                 │
      ▼                 ▼
┌─────────────────┐  ┌──────────────────────┐
│ CASE 1:         │  │ CASE 2:              │
│ Agreement       │  │ Disagreement         │
├─────────────────┤  ├──────────────────────┤
│ Confidence =    │  │ GPS has geofence     │
│ max(GPS, WiFi)  │  │ at 95%+?             │
│ + 10%           │  │                      │
│                 │  │ YES → Use GPS        │
│ Cap at 100%     │  │ NO → Use higher      │
│                 │  │      confidence      │
│ Method: 'wifi'  │  │                      │
│                 │  │                      │
│ No confirmation │  │ Confirmation: Maybe  │
└─────────────────┘  └──────────────────────┘
```

## Confidence Calculation Detail

### WiFi Confidence

```
WiFi Signal Strength (RSSI)
         │
         ▼
┌────────────────────┐
│ Signal > -60 dBm?  │ ───YES──► Base Confidence: 95%
└────────┬───────────┘
         │ NO
         ▼
┌────────────────────┐
│ Signal > -70 dBm?  │ ───YES──► Base Confidence: 85%
└────────┬───────────┘
         │ NO
         ▼
┌────────────────────┐
│ Signal > -80 dBm?  │ ───YES──► Base Confidence: 70%
└────────┬───────────┘
         │ NO
         ▼
    Base Confidence: 50%
         │
         ▼
┌────────────────────┐
│ BSSID Match?       │ ───YES──► Add +10%
│ (vs SSID only)     │
└────────────────────┘
         │ NO
         ▼
    Final WiFi Confidence
```

### GPS Confidence

```
GPS Location
     │
     ▼
┌────────────────────┐
│ Inside Geofence?   │
└────────┬───────────┘
         │
    ┌────┴────┐
   YES       NO
    │         │
    ▼         ▼
┌────────┐ ┌────────────────────┐
│ Dist?  │ │ Distance to Store  │
└───┬────┘ └────────┬───────────┘
    │               │
    │          ┌────┴────┐
    │          │         │
    ▼          ▼         ▼
  < 25m     < 10m     10-25m
  100%      100%      95%
    │          │         │
    ▼          ▼         ▼
  25-100m   25-50m   50-100m
   98%       85%      70%
    │          │         │
    ▼          ▼         ▼
  > 100m   100-200m   > 200m
   95%       50%      30%
```

## Practical Example Scenarios

### Scenario 1: Mall with Multiple Stores

```
User Location: Inside Westfield Mall
GPS Accuracy: ±15 meters
Nearby Stores:
  - Target (GPS: 12m away)
  - Best Buy (GPS: 18m away)
  - Apple Store (GPS: 25m away)

WiFi Scan Results:
  - "Target Guest" (BSSID: AA:BB:CC:DD:EE:01, -62 dBm)
  - "Mall_Guest" (BSSID: BB:CC:DD:EE:FF:02, -58 dBm)

Detection Process:
1. GPS: 3 stores within range
   - Target: 100% conf (very close)
   - Best Buy: 95% conf (close)
   - Apple: 85% conf (moderate)

2. WiFi: Match to Target
   - Signal: -62 dBm (strong)
   - BSSID match: +10%
   - Confidence: 95%

3. Combine: Both agree on Target
   - Final: max(100, 95) + 10 = 100%
   - Method: 'wifi'
   - No confirmation needed ✅

Result: Target detected with 100% confidence
```

### Scenario 2: GPS-Challenged Environment

```
User Location: Underground parking garage
GPS Status: Unavailable / Very weak
Nearby Stores: Unknown (no GPS)

WiFi Scan Results:
  - "Walmart_Store_3421" (BSSID: CC:DD:EE:FF:00:01, -68 dBm)

Detection Process:
1. GPS: Failed (no signal)
   - Confidence: 0%

2. WiFi: Match to Walmart #3421
   - Signal: -68 dBm (good)
   - BSSID match: +10%
   - Confidence: 85%

3. Combine: WiFi only
   - Final: 85%
   - Method: 'wifi'
   - Confirmation needed (< 95%)

Result: Walmart detected via WiFi only, user confirms ✓
```

### Scenario 3: Conflicting Results

```
User Location: Between two stores
GPS Accuracy: ±20 meters
Nearby Stores:
  - Kroger (GPS: 35m away, geofence)
  - Safeway (GPS: 40m away)

WiFi Scan Results:
  - "Safeway_WiFi" (BSSID: DD:EE:FF:00:11:22, -70 dBm)

Detection Process:
1. GPS: Inside Kroger geofence
   - Confidence: 95% (geofence match)

2. WiFi: Match to Safeway
   - Signal: -70 dBm (moderate)
   - Confidence: 85%

3. Combine: Disagreement
   - GPS has geofence at 95% ✓
   - GPS wins (geofence override)
   - Final: Kroger, 95%
   - Method: 'geofence'

Result: Kroger detected (geofence wins over WiFi)
User can tap to switch if actually in Safeway
```

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    React Component                        │
│                  (StoreContext, Screen)                   │
└───────────────────────┬──────────────────────────────────┘
                        │
                        │ detectStore()
                        ▼
┌──────────────────────────────────────────────────────────┐
│              StoreDetectionService                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │ - detectStore()                                  │    │
│  │ - detectStoreWithWifiHints()                     │    │
│  │ - combineDetectionResults()                      │    │
│  │ - findBestMatch()                                │    │
│  │ - calculateConfidence()                          │    │
│  └─────────────────────────────────────────────────┘    │
└────────┬────────────────────────────────┬────────────────┘
         │                                │
         │ getCurrentPosition()           │ getCurrentNetwork()
         │                                │ matchNetworksToStores()
         ▼                                ▼
┌────────────────────┐          ┌────────────────────┐
│  LocationService   │          │   WiFiService      │
│  ┌──────────────┐  │          │  ┌──────────────┐  │
│  │ GPS/Location │  │          │  │ WiFi Scanner │  │
│  │ Geofencing   │  │          │  │ Signal Check │  │
│  │ Distance     │  │          │  │ Matching     │  │
│  └──────────────┘  │          │  └──────────────┘  │
└────────┬───────────┘          └────────┬───────────┘
         │                                │
         │ Platform API                   │ Platform API
         ▼                                ▼
┌────────────────────┐          ┌────────────────────┐
│  iOS/Android       │          │  iOS/Android       │
│  Location API      │          │  WiFi API          │
│  (Geolocation)     │          │  (WifiManager/     │
│                    │          │   CaptiveNetwork)  │
└────────────────────┘          └────────────────────┘
```

## State Machine

```
┌─────────────┐
│   INITIAL   │
│  (No Store) │
└──────┬──────┘
       │
       │ Start Detection
       ▼
┌─────────────┐
│  DETECTING  │
│  (Loading)  │
└──────┬──────┘
       │
       │ Results Ready
       ▼
┌─────────────┐         High Confidence
│  DETECTED   │────────────────────────►┌─────────────┐
│ (Has Store) │                         │  CONFIRMED  │
└──────┬──────┘◄────────────────────────┤(Auto-accept)│
       │        User Confirms            └─────────────┘
       │
       │ Low Confidence
       ▼
┌─────────────┐
│ CONFIRMING  │
│(Show Dialog)│
└──────┬──────┘
       │
       ├────► User Confirms ────► CONFIRMED
       │
       └────► User Rejects ────► DETECTING
```

---

This flow diagram illustrates how WiFi and GPS detection work together to provide accurate, high-confidence store identification for WIC Benefits Assistant users.
