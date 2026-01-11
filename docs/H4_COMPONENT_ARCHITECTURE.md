# Task H4 Component Architecture

## Component Hierarchy

```
StoreSelectionScreen (Example)
│
├── StoreLocationBanner
│   └── Shows: Current store in compact format
│
├── StoreSelector (Main Component)
│   ├── Permission Request Card
│   │   └── "Allow Location" button
│   │
│   ├── Detection State Card
│   │   └── Loading spinner or error
│   │
│   ├── Current Store Card
│   │   └── CurrentStoreDisplay
│   │       └── Store info + "Change" button
│   │
│   ├── Favorites Section
│   │   └── Horizontal ScrollView
│   │       └── Favorite Store Cards
│   │
│   ├── Recent Stores Section
│   │   └── Horizontal ScrollView
│   │       └── Recent Store Cards
│   │
│   ├── Nearby Stores Section
│   │   └── NearbyStoresList
│   │       └── FlatList
│   │           └── Store Cards with:
│   │               - Store info
│   │               - Favorite toggle
│   │               - WIC badge
│   │               - Feature badges
│   │
│   ├── Action Buttons
│   │   ├── "Detect My Store" button
│   │   └── "Search for Store" button
│   │
│   ├── StoreConfirmationModal (conditional)
│   │   ├── Store info display
│   │   ├── Confidence badge
│   │   └── Actions:
│   │       ├── "Yes, That's Right"
│   │       ├── "Choose Different Store"
│   │       └── "Skip for now"
│   │
│   └── StoreSearchModal (conditional)
│       ├── Header with close button
│       ├── Search Input + Button
│       ├── Loading State
│       ├── Empty State with examples
│       ├── Instructions (idle)
│       └── Results List
│           └── Store Cards with favorite toggle
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────┐
│                  useStoreDetection Hook                  │
│  - Provides store detection logic                       │
│  - Manages state (current, nearby, favorites, recents)  │
│  - Handles permissions                                   │
│  - Provides actions (detect, select, search, favorite)  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ (hook data & actions)
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌───────────────┐     ┌──────────────────┐
│ StoreSelector │────→│ StoreLocation    │
│               │     │ Banner           │
└───────┬───────┘     └──────────────────┘
        │
        │ (orchestrates)
        │
        ├──→ StoreConfirmationModal
        │    (shows on first detection)
        │
        ├──→ StoreSearchModal
        │    (shows on search action)
        │
        ├──→ NearbyStoresList
        │    (displays nearby stores)
        │
        └──→ CurrentStoreDisplay
             (displays current store)
```

## Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                    Initial Load                           │
└───────────────────┬──────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │   useStoreDetection hook      │
    │   - Check permissions         │
    │   - Load confirmed stores     │
    │   - Load favorites            │
    │   - Load recents              │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │   Auto-detect (if enabled     │
    │   and permission granted)     │
    └───────────────┬───────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌─────────────┐         ┌──────────────┐
│ Store Found │         │ No Store or  │
│             │         │ Error        │
└──────┬──────┘         └──────┬───────┘
       │                       │
       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│ Is New Store?   │    │ Show error or    │
│                 │    │ no-store state   │
└──────┬──────────┘    └──────────────────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
  YES     NO
   │       │
   │       └──→ Silent detection
   │           (no confirmation)
   │
   └──→ Show StoreConfirmationModal
        │
        ├──→ User confirms
        │    └──→ Save to confirmed stores
        │         └──→ Add to recents
        │              └──→ Set as current
        │
        ├──→ User changes
        │    └──→ Open StoreSearchModal
        │         └──→ User searches & selects
        │              └──→ Save & set as current
        │
        └──→ User skips
             └──→ Dismiss modal
                  (detection can run again later)
```

## User Interaction Flow

```
┌──────────────────────────────────────────────────────────┐
│                    User Opens App                         │
└───────────────────┬──────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐        ┌──────────────────┐
│ Has Location │        │ No Location      │
│ Permission   │        │ Permission       │
└──────┬───────┘        └──────┬───────────┘
       │                       │
       ▼                       ▼
┌──────────────┐        ┌──────────────────────┐
│ Auto-detect  │        │ Show permission card │
│ runs         │        │ with "Allow" button  │
└──────┬───────┘        └──────┬───────────────┘
       │                       │
       ▼                       ▼
┌──────────────┐        ┌─────────────────────────┐
│ Store found? │        │ User grants permission? │
└──────┬───────┘        └──────┬──────────────────┘
       │                       │
   ┌───┴───┐               ┌───┴───┐
   │       │               │       │
  YES     NO              YES     NO
   │       │               │       │
   │       └───┐           │       └──→ Show manual
   │           │           │           selection only
   │           ▼           │
   │    ┌──────────────┐  │
   │    │ Show nearby  │  │
   │    │ stores or    │  │
   │    │ search UI    │  │
   │    └──────────────┘  │
   │                      │
   └──────────────────────┘
              │
              ▼
   ┌──────────────────────┐
   │ New store?           │
   └──────┬───────────────┘
          │
      ┌───┴───┐
      │       │
     YES     NO
      │       │
      │       └──→ Silent detection
      │           Store is active
      │
      └──→ Show StoreConfirmationModal
           │
           ├──→ "Yes, That's Right"
           │    └──→ Store confirmed & active
           │
           ├──→ "Choose Different Store"
           │    └──→ StoreSearchModal opens
           │         └──→ User searches & selects
           │
           └──→ "Skip for now"
                └──→ Store not confirmed
                     Can use manual selection
```

## Component Communication

```
┌─────────────────────────────────────────────────────────┐
│                StoreStorage Utilities                    │
│  (AsyncStorage persistence layer)                       │
│  - getConfirmedStores()                                 │
│  - addConfirmedStore()                                  │
│  - getFavoriteStores()                                  │
│  - toggleFavoriteStore()                                │
│  - getRecentStores()                                    │
│  - addRecentStore()                                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ (reads/writes)
                 │
┌────────────────┴────────────────────────────────────────┐
│              useStoreDetection Hook                      │
│  - Loads data from storage on mount                     │
│  - Provides reactive state                              │
│  - Exposes actions                                      │
│  - Saves changes back to storage                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ (hook return value)
                 │
                 ├──→ currentStore (Store | null)
                 ├──→ nearbyStores (Store[])
                 ├──→ favoriteStores (Store[])
                 ├──→ recentStores (Store[])
                 ├──→ confidence (number)
                 ├──→ isDetecting (boolean)
                 ├──→ error (Error | null)
                 ├──→ permissionStatus (LocationPermissionStatus)
                 ├──→ requiresConfirmation (boolean)
                 │
                 │ (actions)
                 │
                 ├──→ detectStore()
                 ├──→ confirmStore(storeId)
                 ├──→ selectStore(store)
                 ├──→ requestPermissions()
                 ├──→ searchStores(query)
                 ├──→ toggleFavorite(store)
                 ├──→ isFavorite(storeId)
                 └──→ setAsDefault(storeId)
```

## State Management

```
┌──────────────────────────────────────────────────────────┐
│                    Component State                        │
└───────────────────┬──────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Hook     │  │Component │  │ Storage  │
│ State    │  │ UI State │  │ (Persist)│
└──────────┘  └──────────┘  └──────────┘
     │             │              │
     │             │              │
     ▼             ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ current  │  │ showing  │  │ confirmed│
│ Store    │  │ Modal    │  │ stores   │
│          │  │          │  │          │
│ nearby   │  │ showing  │  │ favorite │
│ Stores   │  │ Search   │  │ stores   │
│          │  │          │  │          │
│ isDetect │  │ show     │  │ recent   │
│ ing      │  │ Selector │  │ stores   │
│          │  │          │  │          │
│ error    │  │          │  │ default  │
│          │  │          │  │ storeId  │
└──────────┘  └──────────┘  └──────────┘
```

## Component Size & Complexity

```
Component               Lines  Complexity  Reusability
─────────────────────────────────────────────────────────
StoreSelector           437    High        Low (orchestrator)
StoreSearchModal        462    Medium      Medium
CurrentStoreDisplay     229    Low         High
NearbyStoresList        216    Low         High
StoreLocationBanner     178    Low         High
StoreConfirmationModal  222    Low         High
─────────────────────────────────────────────────────────
Total:                 1,744
```

## Integration Points

```
┌─────────────────────────────────────────────────────────┐
│                  Main App Navigation                     │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Scanner  │  │ Benefits │  │ Product  │
│ Screen   │  │ Screen   │  │ Catalog  │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┼─────────────┘
                   │
                   │ (all use)
                   │
                   ▼
        ┌──────────────────────┐
        │ StoreLocationBanner  │
        │ (at top of screen)   │
        └──────────┬───────────┘
                   │
                   │ (on tap)
                   │
                   ▼
        ┌──────────────────────┐
        │ StoreSelector        │
        │ (full screen or      │
        │  modal)              │
        └──────────────────────┘
```

## Testing Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Unit Tests                            │
│  - Component rendering                                   │
│  - Prop validation                                       │
│  - State transitions                                     │
│  - Callback execution                                    │
└───────────────────┬─────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────────────────┐
│               Integration Tests                          │
│  - Hook integration                                      │
│  - Storage operations                                    │
│  - Modal interactions                                    │
│  - Navigation flows                                      │
└───────────────────┬─────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────────────────┐
│                   E2E Tests                              │
│  - Auto-detection flow                                   │
│  - Manual selection flow                                 │
│  - Search flow                                           │
│  - Permission flow                                       │
│  - Favorite flow                                         │
└─────────────────────────────────────────────────────────┘
```

## Performance Considerations

```
Component               Performance Strategy
──────────────────────────────────────────────────────
StoreSelector          - useCallback for stable refs
                       - Conditional rendering
                       - Lazy modal loading

NearbyStoresList       - FlatList virtualization
                       - keyExtractor optimization
                       - scrollEnabled={false} when embedded

StoreSearchModal       - Debounced search (ready)
                       - Keyboard-aware
                       - Virtual keyboard handling

CurrentStoreDisplay    - Memoized rendering
                       - Conditional badge rendering
                       - Compact mode optimization

StoreLocationBanner    - Lightweight rendering
                       - No heavy computations
                       - Fast re-renders
```

## Summary

The H4 component architecture is:
- **Modular** - Each component has a clear responsibility
- **Reusable** - Most components can be used in multiple contexts
- **Composable** - Components work together seamlessly
- **Type-Safe** - Full TypeScript coverage
- **Performant** - Optimized rendering and data flow
- **Testable** - Clear interfaces for testing
- **Maintainable** - Well-documented and organized
