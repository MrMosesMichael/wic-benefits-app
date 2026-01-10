# Geofence System Architecture

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Native App                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              useStoreDetection Hook                      │   │
│  │  - Manages state (currentStore, confidence, etc.)        │   │
│  │  - Provides user-friendly API                            │   │
│  │  - Handles permissions                                   │   │
│  └────────────────────┬────────────────────────────────────┘   │
│                       │                                          │
│  ┌────────────────────▼───────────────────┐                    │
│  │    StoreDetectionService (Main)        │                    │
│  │  ┌──────────────────────────────────┐  │                    │
│  │  │ detectStore()                    │  │                    │
│  │  │  1. Get GPS position             │  │                    │
│  │  │  2. Fetch nearby stores          │  │                    │
│  │  │  3. Check geofences              │  │                    │
│  │  │  4. Calculate confidence         │  │                    │
│  │  │  5. Return best match            │  │                    │
│  │  └──────────────────────────────────┘  │                    │
│  └───────────┬─────────────┬──────────────┘                    │
│              │             │                                     │
│  ┌───────────▼───────┐  ┌──▼─────────────────────┐            │
│  │ LocationService   │  │  GeofenceManager       │            │
│  │ - GPS access      │  │  - Point-in-polygon    │            │
│  │ - Permissions     │  │  - Point-in-circle     │            │
│  │ - Distance calc   │  │  - Match analysis      │            │
│  └───────────────────┘  │  - Validation          │            │
│                         └────────────┬───────────┘            │
│                                      │                         │
│                         ┌────────────▼───────────┐            │
│                         │  Geofence Utils        │            │
│                         │  - Ray-casting algo    │            │
│                         │  - Haversine distance  │            │
│                         │  - Bounding box        │            │
│                         └────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Detection Flow

```
User Opens App / Enters Store
         │
         ▼
┌────────────────────┐
│ Request Location   │
│ Permissions        │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Get GPS Position   │
│ (LocationService)  │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Fetch Nearby       │
│ Stores from API    │
│ (radius: 150m)     │
└────────┬───────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ For Each Store:                         │
│                                          │
│  Store has      NO    ┌──────────────┐ │
│  geofence? ──────────►│ Distance-    │ │
│     │                  │ based match  │ │
│     │ YES              └──────┬───────┘ │
│     ▼                         │         │
│  ┌──────────────────┐         │         │
│  │ Bounding Box     │         │         │
│  │ Pre-check        │         │         │
│  └────┬─────────────┘         │         │
│       │ INSIDE                │         │
│       ▼                       │         │
│  ┌──────────────────┐         │         │
│  │ Point-in-        │         │         │
│  │ Geofence Check   │         │         │
│  └────┬─────────────┘         │         │
│       │ INSIDE                │         │
│       ▼                       │         │
│  ┌──────────────────┐         │         │
│  │ Calculate        │◄────────┘         │
│  │ Confidence       │                   │
│  └────┬─────────────┘                   │
│       │                                 │
└───────┼─────────────────────────────────┘
        │
        ▼
┌────────────────────┐
│ Rank by            │
│ Confidence         │
│ (highest first)    │
└────────┬───────────┘
        │
        ▼
┌────────────────────┐
│ Return Best        │
│ Match              │
└────────┬───────────┘
        │
        ▼
┌────────────────────┐
│ Show Store to      │
│ User with          │
│ Confidence Badge   │
└────────────────────┘
```

## Geofence Matching Detail

```
User GPS Position
       │
       ▼
┌─────────────────────────────────────────────┐
│ Has Geofence?                               │
│                                              │
│  YES (Polygon)          YES (Circle)        │
│     │                        │               │
│     ▼                        ▼               │
│  ┌────────────┐        ┌──────────────┐    │
│  │ Bounding   │        │ Calculate    │    │
│  │ Box Check  │        │ Distance to  │    │
│  └─────┬──────┘        │ Center       │    │
│        │               └──────┬───────┘    │
│        │ INSIDE               │             │
│        ▼                      ▼             │
│  ┌────────────┐        ┌──────────────┐    │
│  │ Ray-Cast   │        │ Compare to   │    │
│  │ Algorithm  │        │ Radius       │    │
│  └─────┬──────┘        └──────┬───────┘    │
│        │                      │             │
│        ▼                      ▼             │
│     INSIDE?               INSIDE?           │
│        │                      │             │
└────────┼──────────────────────┼─────────────┘
         │                      │
         └──────────┬───────────┘
                    │
                    ▼
              ┌──────────┐
              │ INSIDE?  │
              └────┬─────┘
                   │
         ┌─────────┴─────────┐
         │                   │
        YES                 NO
         │                   │
         ▼                   ▼
    ┌─────────┐         ┌─────────┐
    │ 95-100% │         │ 30-85%  │
    │ Conf.   │         │ Conf.   │
    └─────────┘         └─────────┘
```

## Confidence Calculation

```
┌─────────────────────────────────────────────┐
│          Confidence Calculation             │
├─────────────────────────────────────────────┤
│                                              │
│  Inside Geofence?                           │
│         │                                    │
│   ┌─────┴─────┐                             │
│   │           │                              │
│  YES          NO                             │
│   │           │                              │
│   ▼           ▼                              │
│  Distance    Distance                        │
│  to Center   to Center                       │
│   │           │                              │
│   ├─ ≤25m  → 100%                            │
│   ├─ ≤100m → 98%                             │
│   └─ >100m → 95%                             │
│              │                               │
│              ├─ ≤10m  → 100%                 │
│              ├─ ≤25m  → 95%                  │
│              ├─ ≤50m  → 85%                  │
│              ├─ ≤100m → 70%                  │
│              ├─ ≤200m → 50%                  │
│              └─ >200m → 30%                  │
│                                              │
└─────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────┐
│   Backend   │
│   Store DB  │
└──────┬──────┘
       │ GET /api/v1/stores
       │ ?lat=40.7&lng=-74&radius=150
       ▼
┌─────────────────────────────────┐
│ [                                │
│   {                              │
│     id: "store-1",               │
│     location: { lat, lng },      │
│     geofence: {                  │
│       type: "circle",            │
│       center: { lat, lng },      │
│       radiusMeters: 75           │
│     }                            │
│   },                             │
│   ...                            │
│ ]                                │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────┐
│ StoreDetectionSvc   │
│ - Cache stores      │
│ - Match geofences   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Detection Result    │
│ {                   │
│   store: Store,     │
│   confidence: 98,   │
│   method: "geofence"│
│   insideGeofence:   │
│     true            │
│ }                   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ React Component     │
│ - Display store     │
│ - Show confidence   │
│ - Confirm if needed │
└─────────────────────┘
```

## Multiple Store Resolution

```
User at lat: 40.7130, lng: -74.0060
              │
              ▼
    ┌─────────────────────┐
    │ Find Nearby Stores  │
    │ (within 150m)       │
    └─────────┬───────────┘
              │
              ▼
    ┌──────────────────────────────────┐
    │ Found 3 Stores:                  │
    │                                  │
    │ Store A: 40m away, inside geo   │
    │ Store B: 45m away, inside geo   │
    │ Store C: 120m away, outside geo │
    └─────────┬────────────────────────┘
              │
              ▼
    ┌──────────────────────────────────┐
    │ Filter by Geofence Match         │
    │                                  │
    │ Store A: inside ✓                │
    │ Store B: inside ✓                │
    │ Store C: outside ✗               │
    └─────────┬────────────────────────┘
              │
              ▼
    ┌──────────────────────────────────┐
    │ Calculate Confidence             │
    │                                  │
    │ Store A: 98% (inside, 40m)      │
    │ Store B: 98% (inside, 45m)      │
    └─────────┬────────────────────────┘
              │
              ▼
    ┌──────────────────────────────────┐
    │ Rank by Distance (tiebreaker)    │
    │                                  │
    │ 1. Store A: 40m                  │
    │ 2. Store B: 45m                  │
    └─────────┬────────────────────────┘
              │
              ▼
    ┌──────────────────────────────────┐
    │ Return:                          │
    │   store: Store A                 │
    │   nearbyStores: [Store B]        │
    └──────────────────────────────────┘
```

## Performance Optimization

```
┌─────────────────────────────────────────────┐
│         Optimization Techniques              │
├─────────────────────────────────────────────┤
│                                              │
│  1. Distance Pre-filter                      │
│     Only check stores within 150m           │
│     Complexity: O(n) where n = total stores │
│     Result: Reduced to ~5-20 stores         │
│                                              │
│  2. Bounding Box Pre-check                   │
│     For polygon geofences                    │
│     Complexity: O(1)                         │
│     Rejects ~80% before ray-casting         │
│                                              │
│  3. Geofence Caching                         │
│     Cache duration: 5 minutes                │
│     Avoids repeated JSON parsing            │
│     Saves ~10ms per store                    │
│                                              │
│  4. Early Termination                        │
│     Stop after finding 95%+ match           │
│     Saves ~50% of checks on average         │
│                                              │
│  Total Detection Time: <750ms for 20 stores │
│                                              │
└─────────────────────────────────────────────┘
```

## State Management

```
┌─────────────────────────────────────────────┐
│              Application State               │
├─────────────────────────────────────────────┤
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ StoreContext (Global)                  │ │
│  │                                        │ │
│  │  currentStore: Store | null           │ │
│  │  confidence: number                   │ │
│  │  isDetecting: boolean                 │ │
│  │  error: Error | null                  │ │
│  │  permissionStatus: Permission         │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ StoreDetectionService (Singleton)      │ │
│  │                                        │ │
│  │  storeCache: Store[]                  │ │
│  │  confirmedStores: Set<string>         │ │
│  │  config: DetectionConfig              │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ GeofenceManager (Singleton)            │ │
│  │                                        │ │
│  │  geofenceCache: Map<id, Geofence>     │ │
│  │  lastCacheUpdate: Map<id, timestamp>  │ │
│  └────────────────────────────────────────┘ │
│                                              │
└─────────────────────────────────────────────┘
```

## Error Handling

```
┌─────────────────────────────────────────────┐
│            Error Handling Flow               │
├─────────────────────────────────────────────┤
│                                              │
│  detectStore()                              │
│       │                                      │
│       ├─ Permission Denied                  │
│       │    └─► Show permission request UI   │
│       │                                      │
│       ├─ GPS Timeout                         │
│       │    └─► Retry with cached location   │
│       │                                      │
│       ├─ Network Error                       │
│       │    └─► Use cached store data        │
│       │                                      │
│       ├─ No Stores Found                     │
│       │    └─► Show manual search UI        │
│       │                                      │
│       └─ Geofence Validation Error           │
│            └─► Fall back to distance match  │
│                                              │
└─────────────────────────────────────────────┘
```

## File Organization

```
src/
├── services/
│   ├── GeofenceManager.ts          ◄─ Advanced operations
│   ├── StoreDetectionService.ts    ◄─ Main orchestrator
│   ├── LocationService.ts          ◄─ GPS handling
│   └── README.md                   ◄─ Documentation
│
├── utils/
│   └── geofence.utils.ts          ◄─ Core algorithms
│
├── types/
│   └── store.types.ts             ◄─ Type definitions
│
├── hooks/
│   └── useStoreDetection.ts       ◄─ React integration
│
├── config/
│   └── storeDetection.config.ts   ◄─ Configuration
│
└── examples/
    └── StoreDetectionExample.tsx  ◄─ Usage demo
```

## Integration Checklist

- [x] Core geofence utilities implemented
- [x] Point-in-polygon algorithm (ray-casting)
- [x] Point-in-circle algorithm (Haversine)
- [x] Store type definitions updated
- [x] StoreDetectionService enhanced
- [x] GeofenceManager created
- [x] Configuration added
- [x] React hook ready
- [x] Unit tests written
- [x] Integration tests written
- [x] Documentation complete
- [x] Example component created
- [ ] Backend API endpoints
- [ ] Geofence data in database
- [ ] Production testing
- [ ] Performance monitoring

## Next Steps

1. **Backend Integration**
   - Add geofence field to store schema
   - Implement API endpoints
   - Populate geofence data

2. **Data Collection**
   - Major chains: Draw polygons from maps
   - Generate defaults for missing data
   - Validate all geofences

3. **Testing**
   - Field test at real stores
   - Verify confidence scores
   - Tune thresholds

4. **Monitoring**
   - Track detection accuracy
   - Monitor performance metrics
   - Collect user feedback
