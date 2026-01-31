# Task H5: Manual Store Selection Implementation

## Overview

Task H5 implements comprehensive manual store selection features, allowing users to search for stores, manage favorites, and quickly access their preferred shopping locations.

## Implementation Summary

### Completed Components

#### 1. Distance Calculation Utilities (`src/utils/distance.utils.ts`)
- Haversine formula for accurate geographic distance calculation
- Format distance in both imperial (miles/feet) and metric (km/m) units
- Sort and filter stores by distance from user location
- Get closest store from a list

**Key Functions:**
- `calculateDistance(point1, point2)` - Calculate distance between two coordinates
- `formatDistance(meters)` - Format distance for display (e.g., "0.5 mi")
- `sortStoresByDistance(stores, userLocation)` - Sort stores by proximity
- `filterStoresWithinRadius(stores, userLocation, radiusMeters)` - Filter by distance

#### 2. Enhanced Store API Service (`src/services/StoreApiService.ts`)
Enhanced with additional search capabilities:
- Search stores with optional location context
- Search by city/ZIP code
- WIC-only filtering
- Radius-based filtering

**New Methods:**
- `searchStores(query, options)` - Search with location awareness
- `searchStoresByLocation(location, options)` - Search by city/ZIP

#### 3. Enhanced Store Search Modal (`src/components/EnhancedStoreSearchModal.tsx`)
Full-featured search modal with dual modes:

**Text Search Mode:**
- Search by store name, address, city, or ZIP code
- Shows helpful examples
- Displays distance if user location is available
- Real-time search results

**Nearby Search Mode:**
- Uses current location to find nearby stores
- Shows stores within 5 mile radius
- Results sorted by distance
- WIC-authorized stores only

**Features:**
- Star/unstar favorites directly from search results
- Distance display for each store
- WIC authorization badges
- Feature indicators (pharmacy, live inventory)
- Search result count display

#### 4. Enhanced Nearby Stores List (`src/components/NearbyStoresList.tsx`)
Updated to show distance when user location is provided:
- Distance calculation and display
- Distance shown in green next to store name
- Optional user location parameter
- Backward compatible (distance is optional)

#### 5. Manual Store Selection Screen (`src/screens/ManualStoreSelectionScreen.tsx`)
Comprehensive manual selection screen with all features:

**Sections:**
1. **Current Store Display** - Shows currently selected store
2. **Search Card** - Prominent search button
3. **Favorite Stores** - Horizontal scroll of favorites with:
   - Default store badge
   - Set/clear default button
   - Star icon for quick identification
4. **Recent Stores** - Recently visited stores with star toggle
5. **Nearby Stores** - Auto-detected stores with distance

**Features:**
- Set default store for quick selection
- Clear default store
- Star/unstar favorites
- Distance display for all stores
- Refresh nearby stores
- Location permission handling

#### 6. Enhanced Store Selector (`src/components/EnhancedStoreSelector.tsx`)
Updated version of StoreSelector with:
- Default store indicators
- Set/clear default buttons
- Default badge on favorite/recent stores
- Better visual hierarchy

### Data Flow

```
User Input (Search/Location)
    ↓
StoreApiService
    ↓
Search/Nearby Results
    ↓
Distance Calculation (if user location available)
    ↓
Sorted Results with Distance
    ↓
Display in Modal/List Components
    ↓
User Selection
    ↓
StoreContext (currentStore update)
    ↓
StoreStorage (add to favorites/recent, set default)
```

## Features Implemented

### ✅ Search for Stores
- [x] Search by store name
- [x] Search by address
- [x] Search by city/state
- [x] Search by ZIP code
- [x] Two search modes (text and nearby)

### ✅ Location-Based Features
- [x] Use current location to find nearby stores
- [x] Calculate distance to stores
- [x] Display distance in readable format (miles/feet)
- [x] Sort by distance
- [x] 5-mile radius search

### ✅ Favorite Stores
- [x] Star/unstar stores as favorites
- [x] View all favorites in dedicated section
- [x] Quick access to favorites
- [x] Horizontal scroll for favorites
- [x] Star toggle from search results
- [x] Star toggle from nearby list

### ✅ Recent Stores
- [x] Track recently visited stores
- [x] Display recent stores section
- [x] Move to top when re-selected
- [x] Maximum of 10 recent stores
- [x] Persistent storage

### ✅ Default Store
- [x] Set a store as default
- [x] Clear default store
- [x] Default badge indicator
- [x] Persistent default store setting
- [x] Quick selection of default

### ✅ User Experience
- [x] Clear visual hierarchy
- [x] Distance display
- [x] WIC authorization badges
- [x] Store feature indicators
- [x] Current store highlighting
- [x] Loading states
- [x] Error states
- [x] Empty states with helpful messages

## File Structure

```
src/
├── components/
│   ├── EnhancedStoreSearchModal.tsx      (NEW)
│   ├── EnhancedStoreSelector.tsx         (NEW)
│   ├── NearbyStoresList.tsx              (ENHANCED)
│   └── store/
│       └── index.ts                      (UPDATED)
├── screens/
│   └── ManualStoreSelectionScreen.tsx    (NEW)
├── services/
│   └── StoreApiService.ts                (ENHANCED)
├── utils/
│   ├── distance.utils.ts                 (NEW)
│   └── storeStorage.ts                   (EXISTING - used)
├── examples/
│   └── ManualStoreSelectionExample.tsx   (NEW)
└── docs/
    └── TASK_H5_MANUAL_STORE_SELECTION.md (NEW)
```

## Usage Examples

### 1. Using Manual Store Selection Screen

```tsx
import { ManualStoreSelectionScreen } from './screens/ManualStoreSelectionScreen';

function MyApp() {
  const handleStoreSelected = (store: Store) => {
    console.log('User selected:', store.name);
  };

  return (
    <ManualStoreSelectionScreen
      onStoreSelected={handleStoreSelected}
      onBack={() => navigation.goBack()}
    />
  );
}
```

### 2. Using Enhanced Store Search Modal

```tsx
import { EnhancedStoreSearchModal } from './components/EnhancedStoreSearchModal';

function MyComponent() {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <>
      <Button onPress={() => setShowSearch(true)}>
        Search Stores
      </Button>

      <EnhancedStoreSearchModal
        visible={showSearch}
        onStoreSelect={(store) => {
          selectStore(store);
          setShowSearch(false);
        }}
        onClose={() => setShowSearch(false)}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />
    </>
  );
}
```

### 3. Using Distance Utilities

```tsx
import { calculateDistance, formatDistance } from './utils/distance.utils';

const userLocation = { lat: 42.2808, lng: -83.7430 };
const store = {
  location: { lat: 42.2814, lng: -83.7483 }
};

const distance = calculateDistance(userLocation, store.location);
const formattedDistance = formatDistance(distance);
// Result: "0.3 mi"
```

### 4. Setting Default Store

```tsx
import * as StoreStorage from './utils/storeStorage';

// Set default store
await StoreStorage.setDefaultStore(store.id);

// Get default store
const defaultStoreId = await StoreStorage.getDefaultStore();

// Clear default
await StoreStorage.clearDefaultStore();
```

## API Integration

The implementation expects these API endpoints:

### Search Stores
```
GET /api/v1/stores/search?q={query}&lat={lat}&lng={lng}&radius={meters}&wic_only=true
```

### Search by Location
```
GET /api/v1/stores/search/location?location={city/zip}&wic_only=true&limit={n}
```

### Get Nearby Stores
```
GET /api/v1/stores?lat={lat}&lng={lng}&radius={meters}&limit={n}&wic_only=true
```

## Storage Keys

The following AsyncStorage keys are used:

- `@wic/confirmed_stores` - Set of confirmed store IDs
- `@wic/favorite_stores` - Array of favorite store objects
- `@wic/recent_stores` - Array of recent store objects (max 10)
- `@wic/default_store` - Default store ID string

## Testing Recommendations

### Unit Tests
- Distance calculation accuracy
- Distance formatting (imperial/metric)
- Store sorting by distance
- Store filtering by radius

### Integration Tests
- Search flow (text mode)
- Search flow (nearby mode)
- Favorite management
- Default store management
- Recent stores tracking

### UI Tests
- Search modal navigation
- Favorite star toggling
- Default badge display
- Distance display
- Empty states
- Loading states
- Error handling

## Accessibility Considerations

- All interactive elements have proper touch targets (minimum 44x44)
- Star buttons are clearly labeled (filled vs outline)
- Default badges use both color and text
- Distance information is clearly visible
- Search inputs have proper placeholders
- Loading states announced to screen readers

## Performance Considerations

- Distance calculations cached where possible
- Recent stores limited to 10 items
- Horizontal scrolls use proper optimization
- Search debouncing (handled by user's search button press)
- Async storage operations batched where possible

## Future Enhancements

Potential improvements for future iterations:

1. **Search History** - Track and suggest previous searches
2. **Smart Sorting** - Combine distance, inventory, and user preferences
3. **Store Comparison** - Side-by-side comparison of multiple stores
4. **Save Search Filters** - Remember user's filter preferences
5. **Map View** - Visual map showing store locations
6. **Store Hours Filter** - "Open Now" filtering
7. **Bulk Favorite Management** - Select multiple favorites at once

## Specification Compliance

This implementation fully satisfies the requirements from `specs/wic-benefits-app/specs/store-detection/spec.md`:

### ✅ Manual Store Selection Requirements
- **Search for store** - Implemented with dual-mode search (text and nearby)
- **Store name** - Full text search support
- **Address** - Address search support
- **City/ZIP code** - Location-based search support
- **Current location (list nearby)** - Nearby mode with distance sorting

### ✅ Favorite Stores Requirements
- **Mark as favorite** - Star toggle in all store displays
- **Quick-select list** - Horizontal scroll section
- **Set as default** - Set default button on favorites

### ✅ Recent Stores Requirements
- **Recently visited stores** - Automatic tracking
- **Appear at top** - Dedicated recent section
- **Quick re-select** - One-tap selection

## Notes

- All components are TypeScript-typed for safety
- Follows existing code patterns and styling
- Backward compatible with existing StoreSelector
- Works with existing StoreContext and StoreStorage
- No breaking changes to existing components
