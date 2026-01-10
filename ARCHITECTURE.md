# GPS-Based Store Detection - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React Native App                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
├─────────────────────────────────────────────────────────────┤
│  HomeScreen.tsx                                              │
│  ├── StoreDetectionBanner                                    │
│  │   ├── Store Info Display                                 │
│  │   ├── Confidence Badge                                    │
│  │   ├── Confirm/Change Buttons                             │
│  │   └── Permission Request                                 │
│  └── StoreSelectionModal                                     │
│      ├── Search Input                                        │
│      ├── Nearby Stores Tab                                   │
│      ├── Favorites Tab                                       │
│      └── Recent Stores Section                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      State Management                        │
├─────────────────────────────────────────────────────────────┤
│  StoreContext (React Context)                                │
│  └── useStoreDetection Hook                                  │
│      ├── currentStore: Store | null                         │
│      ├── nearbyStores: Store[]                              │
│      ├── confidence: number                                  │
│      ├── isDetecting: boolean                                │
│      ├── error: Error | null                                 │
│      ├── permissionStatus: LocationPermissionStatus          │
│      └── requiresConfirmation: boolean                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic                          │
├─────────────────────────────────────────────────────────────┤
│  StoreDetectionService                                       │
│  ├── detectStore()                                           │
│  │   ├── Get GPS position                                    │
│  │   ├── Fetch nearby stores                                │
│  │   ├── Calculate distances                                │
│  │   ├── Find best match                                     │
│  │   └── Calculate confidence                                │
│  ├── detectStoreByWifi()                                     │
│  ├── confirmStore()                                          │
│  ├── selectStoreManually()                                   │
│  ├── searchStores()                                          │
│  ├── startContinuousDetection()                              │
│  └── stopContinuousDetection()                               │
└─────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────┐     ┌────────────────────────────────┐
│  LocationService    │     │    StoreApiService             │
├─────────────────────┤     ├────────────────────────────────┤
│ Platform Services   │     │ Backend API                    │
├─────────────────────┤     ├────────────────────────────────┤
│ checkPermissions()  │     │ getNearbyStores()              │
│ requestPermissions()│     │ detectStore()                  │
│ getCurrentPosition()│     │ getStoreById()                 │
│ watchPosition()     │     │ searchStores()                 │
│ clearWatch()        │     │ reportStoreInfo()              │
│ calculateDistance() │     └────────────────────────────────┘
└─────────────────────┘                   │
          │                               │
          ▼                               ▼
┌─────────────────────┐     ┌────────────────────────────────┐
│  Native GPS APIs    │     │  Backend API Server            │
├─────────────────────┤     ├────────────────────────────────┤
│ Android:            │     │ GET /api/v1/stores             │
│ - Geolocation API   │     │ POST /api/v1/stores/detect     │
│ - PermissionsAndroid│     │ GET /api/v1/stores/search      │
│                     │     │ POST /api/v1/stores/report     │
│ iOS:                │     └────────────────────────────────┘
│ - CoreLocation      │
└─────────────────────┘
```

## Data Flow

### 1. Store Detection Flow

```
User Opens App
     │
     ▼
Check Location Permissions
     │
     ├─── Granted ──────────┐
     │                      ▼
     │                 Get GPS Position
     │                      │
     │                      ▼
     │              Fetch Nearby Stores (API)
     │                      │
     │                      ▼
     │              Calculate Distances
     │                      │
     │                      ▼
     │              Find Best Match
     │                      │
     │                      ▼
     │              Calculate Confidence
     │                      │
     │                      ▼
     │              Check if Needs Confirmation
     │                      │
     │                      ▼
     │              Update UI State
     │                      │
     ├─── Denied ───────────┤
     │                      │
     ▼                      ▼
Show Permission          Display Store
Request UI              Detection Result
```

### 2. Confidence Scoring Flow

```
GPS Position
     │
     ▼
Calculate Distance to Store
     │
     ├─── ≤ 10m ───→ Confidence: 100% (Very Close)
     ├─── ≤ 25m ───→ Confidence: 95%  (Close)
     ├─── ≤ 50m ───→ Confidence: 85%  (Within Boundary)
     ├─── ≤ 100m ──→ Confidence: 70%  (Nearby)
     ├─── ≤ 200m ──→ Confidence: 50%  (Possibly Near)
     └─── > 200m ──→ Confidence: 30%  (Far)
```

### 3. Permission Request Flow

```
App Needs Location
     │
     ▼
Check Current Permission Status
     │
     ├─── Already Granted ──→ Proceed with Detection
     │
     ├─── Can Ask Again ────┐
     │                      ▼
     │              Show Permission Rationale
     │                      │
     │                      ▼
     │              Request Permission
     │                      │
     │                      ├─── Granted ──→ Detect Store
     │                      ├─── Denied ───→ Manual Selection
     │                      └─── Blocked ──→ Show Settings Alert
     │
     └─── Blocked ──────────→ Show Settings Alert
```

### 4. Store Confirmation Flow

```
Store Detected
     │
     ▼
Check if Previously Confirmed
     │
     ├─── Yes ──→ Auto-Accept (No Prompt)
     │
     └─── No ───┐
                ▼
          Check Confidence Level
                │
                ├─── High (>80%) ──→ Ask for Confirmation
                │
                └─── Low (≤80%) ───→ Require Confirmation
```

## Component Relationships

```
StoreContext Provider
    │
    ├─── HomeScreen
    │       │
    │       ├─── StoreDetectionBanner
    │       │       │
    │       │       └─── Uses: currentStore, confidence, etc.
    │       │
    │       └─── StoreSelectionModal
    │               │
    │               └─── Uses: nearbyStores, searchStores()
    │
    ├─── Any Other Screen
    │       │
    │       └─── useStore() hook
    │               │
    │               └─── Access to store state
    │
    └─── Shopping Cart Screen (future)
            │
            └─── Uses current store for inventory
```

## Service Dependencies

```
StoreDetectionService
    │
    ├─── Depends on: LocationService
    │       │
    │       └─── Provides: GPS coordinates, permissions
    │
    └─── Depends on: StoreApiService
            │
            └─── Provides: Store data, search results
```

## State Machine

```
Store Detection States:

┌──────────────┐
│  INITIAL     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  REQUESTING  │ ← Checking permissions
│  PERMISSIONS │
└──────┬───────┘
       │
       ├─── Granted ────┐
       │                │
       └─── Denied ──────────→ ┌──────────────┐
                        │       │   MANUAL     │
                        │       │   MODE       │
                        │       └──────────────┘
                        ▼
                 ┌──────────────┐
                 │  DETECTING   │ ← Getting GPS & stores
                 └──────┬───────┘
                        │
                        ├─── Store Found ───┐
                        │                   │
                        └─── No Store ──────────→ ┌──────────────┐
                                            │      │  NO_STORE    │
                                            │      └──────────────┘
                                            ▼
                                     ┌──────────────┐
                                     │  DETECTED    │
                                     └──────┬───────┘
                                            │
                                            ├─── Needs Confirm ──┐
                                            │                    │
                                            └─── Auto-Accept ────────→ ┌──────────────┐
                                                                 │      │  CONFIRMED   │
                                                                 │      └──────────────┘
                                                                 ▼
                                                          ┌──────────────┐
                                                          │  PENDING     │
                                                          │  CONFIRM     │
                                                          └──────┬───────┘
                                                                 │
                                                                 ├─── User Confirms ──→ CONFIRMED
                                                                 │
                                                                 └─── User Changes ───→ MANUAL MODE
```

## Error Handling Flow

```
Any Operation
     │
     ├─── Success ──→ Update State
     │
     └─── Error ────┐
                    ▼
            Categorize Error
                    │
                    ├─── Permission Error ──→ Show Permission UI
                    │
                    ├─── GPS Error ────────→ Show "Enable GPS" message
                    │
                    ├─── Network Error ────→ Use cached data / offline mode
                    │
                    └─── Unknown Error ────→ Show generic error + manual fallback
```

## Thread/Async Model

```
Main Thread (UI)
     │
     ├─── React Components
     │    └─── Render UI based on state
     │
     └─── Event Handlers
          └─── Trigger async operations

Background (Promises)
     │
     ├─── LocationService.getCurrentPosition()
     │    └─── Native GPS API call
     │
     ├─── StoreApiService.getNearbyStores()
     │    └─── HTTP request to backend
     │
     └─── StoreDetectionService.detectStore()
          └─── Coordinate async operations
               │
               ├─── await getPosition()
               ├─── await getNearbyStores()
               ├─── Calculate matches (sync)
               └─── Return result
```

## Performance Optimization Points

```
1. Store Cache
   └─── Keep last fetched stores in memory
        └─── Reduce API calls

2. Distance Calculation
   └─── Only calculate for stores within max radius
        └─── Skip far stores

3. Debounced Detection
   └─── Don't re-detect on every position update
        └─── Use 50m distance filter

4. Lazy Loading
   └─── Load StoreSelectionModal only when needed
        └─── Reduce initial bundle size

5. Memoization
   └─── Memoize nearby store list
        └─── Prevent unnecessary re-renders
```

## Security Considerations

```
1. Location Data
   └─── Only used for store matching
   └─── Not sent to analytics
   └─── Not stored long-term

2. API Calls
   └─── HTTPS only
   └─── Authentication token required
   └─── Rate limiting applied

3. Permissions
   └─── Request only when needed
   └─── Clear rationale provided
   └─── Graceful degradation if denied

4. Store Data
   └─── Cached locally with TTL
   └─── Validated before use
   └─── Sanitized for display
```

## Scalability Considerations

```
1. Many Stores
   └─── Spatial indexing on backend
   └─── Limit results to reasonable radius
   └─── Pagination for search results

2. Many Users
   └─── CDN for static store data
   └─── API caching with Redis
   └─── Rate limiting per user

3. Frequent Updates
   └─── WebSocket for real-time updates
   └─── Push notifications for changes
   └─── Background sync when app inactive
```
