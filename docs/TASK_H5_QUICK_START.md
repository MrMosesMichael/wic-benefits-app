# Task H5: Quick Start Guide

## Getting Started with Manual Store Selection

This guide will help you quickly integrate the manual store selection features into your app.

## Basic Setup

### 1. Import the Screen

```tsx
import { ManualStoreSelectionScreen } from './screens/ManualStoreSelectionScreen';
import { StoreProvider } from './contexts/StoreContext';
```

### 2. Wrap with StoreProvider

```tsx
function App() {
  return (
    <StoreProvider>
      <ManualStoreSelectionScreen />
    </StoreProvider>
  );
}
```

That's it! You now have a fully functional manual store selection screen.

## Common Use Cases

### Use Case 1: Add to Navigation

```tsx
import { createStackNavigator } from '@react-navigation/stack';
import { ManualStoreSelectionScreen } from './screens/ManualStoreSelectionScreen';

const Stack = createStackNavigator();

function StoreNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="StoreSelection"
        component={ManualStoreSelectionScreen}
        options={{ title: 'Select Store' }}
      />
    </Stack.Navigator>
  );
}
```

### Use Case 2: Modal Presentation

```tsx
function HomeScreen() {
  const [showStoreSelection, setShowStoreSelection] = useState(false);

  return (
    <>
      <Button onPress={() => setShowStoreSelection(true)}>
        Change Store
      </Button>

      <Modal visible={showStoreSelection}>
        <ManualStoreSelectionScreen
          onStoreSelected={(store) => {
            console.log('Selected:', store);
            setShowStoreSelection(false);
          }}
          onBack={() => setShowStoreSelection(false)}
        />
      </Modal>
    </>
  );
}
```

### Use Case 3: Just the Search Modal

If you only need the search functionality:

```tsx
import { EnhancedStoreSearchModal } from './components/EnhancedStoreSearchModal';
import { useStore } from './contexts/StoreContext';

function MyComponent() {
  const [showSearch, setShowSearch] = useState(false);
  const { selectStore, isFavorite, toggleFavorite } = useStore();

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

### Use Case 4: Just the Enhanced Selector

If you want the selector with default store management:

```tsx
import { EnhancedStoreSelector } from './components/EnhancedStoreSelector';

function StoreSetupScreen() {
  return (
    <View>
      <Text>Choose Your Store</Text>
      <EnhancedStoreSelector
        onStoreSelected={(store) => {
          console.log('User chose:', store);
          navigation.navigate('Home');
        }}
        autoDetect={true}
        showDefaultOption={true}
      />
    </View>
  );
}
```

## Working with the StoreContext

The store context provides all the functionality you need:

```tsx
import { useStore } from './contexts/StoreContext';

function MyComponent() {
  const {
    // Current state
    currentStore,           // Currently selected store
    favoriteStores,         // Array of favorite stores
    recentStores,           // Array of recent stores
    nearbyStores,           // Array of nearby stores

    // Actions
    selectStore,            // Manually select a store
    toggleFavorite,         // Star/unstar a store
    setAsDefault,           // Set default store
    isFavorite,             // Check if store is favorited
    detectStore,            // Trigger detection

    // Status
    isDetecting,            // Boolean: detection in progress
    error,                  // Error object if failed
    permissionStatus,       // Location permission status
  } = useStore();

  return (
    <View>
      {currentStore && (
        <Text>Current: {currentStore.name}</Text>
      )}

      <Button onPress={() => detectStore()}>
        Find Nearby Stores
      </Button>

      {favoriteStores.map(store => (
        <StoreCard key={store.id} store={store} />
      ))}
    </View>
  );
}
```

## Distance Utilities

Calculate and display distances:

```tsx
import {
  calculateDistance,
  formatDistance,
  sortStoresByDistance
} from './utils/distance.utils';

// Calculate distance
const distance = calculateDistance(
  { lat: 42.2808, lng: -83.7430 },  // User location
  { lat: 42.2814, lng: -83.7483 }   // Store location
);
// Returns: 364.5 (meters)

// Format for display
const formatted = formatDistance(distance);
// Returns: "0.2 mi"

// Sort stores by distance
const userLocation = { lat: 42.2808, lng: -83.7430 };
const sortedStores = sortStoresByDistance(stores, userLocation);
// Returns: stores sorted closest first, with distance property added
```

## Managing Favorites

```tsx
import * as StoreStorage from './utils/storeStorage';

// Add to favorites
await StoreStorage.addFavoriteStore(store);

// Remove from favorites
await StoreStorage.removeFavoriteStore(store.id);

// Check if favorite
const isFav = await StoreStorage.isStoreFavorite(store.id);

// Toggle favorite (returns new state)
const nowFavorite = await StoreStorage.toggleFavoriteStore(store);

// Get all favorites
const favorites = await StoreStorage.getFavoriteStores();
```

## Managing Default Store

```tsx
import * as StoreStorage from './utils/storeStorage';

// Set default
await StoreStorage.setDefaultStore(store.id);

// Get default
const defaultId = await StoreStorage.getDefaultStore();

// Clear default
await StoreStorage.clearDefaultStore();
```

## Customizing the UI

### Change Search Radius

Edit `EnhancedStoreSearchModal.tsx`:

```tsx
// Find this line (around line 101)
radius: 8000, // 5 miles in meters

// Change to 16000 for 10 miles
radius: 16000, // 10 miles in meters
```

### Change Recent Store Limit

Edit `storeStorage.ts`:

```tsx
// Find this line (around line 18)
const MAX_RECENT_STORES = 10;

// Change to your desired limit
const MAX_RECENT_STORES = 20;
```

## Styling Customization

All components use inline StyleSheet. To customize:

1. Copy the component to your project
2. Modify the styles object at the bottom
3. Import your customized version

Example - changing the primary color:

```tsx
// In ManualStoreSelectionScreen.tsx
const styles = StyleSheet.create({
  searchCard: {
    borderColor: '#2196F3', // Changed from #4CAF50
  },
  // ... other styles
});
```

## Troubleshooting

### Search not working
- Check that `StoreApiService` is properly configured
- Verify API endpoints are responding
- Check network connectivity

### Location not working
- Ensure location permissions are granted
- Check `permissionStatus` from `useStore()`
- Verify `LocationService` is configured

### Favorites not persisting
- Verify AsyncStorage is properly set up
- Check for storage permission issues
- Look for console errors

### Distance showing as "0 ft"
- Ensure `userLocation` is being passed to components
- Check that location permissions are granted
- Verify location coordinates are valid

## Performance Tips

1. **Limit nearby search radius** - Smaller radius = faster results
2. **Paginate search results** - Don't load all results at once
3. **Cache distance calculations** - Store in component state
4. **Lazy load images** - Use `Image` with proper cache settings

## Testing Your Integration

Quick checklist:

- [ ] Can search by store name
- [ ] Can search by ZIP code
- [ ] Can use current location to find nearby
- [ ] Distance displays correctly
- [ ] Can star/unstar favorites
- [ ] Can set default store
- [ ] Can clear default store
- [ ] Recent stores appear
- [ ] Empty states show helpful messages
- [ ] Loading states work
- [ ] Error states handled

## Need Help?

See the full documentation:
- **Full Documentation**: `docs/TASK_H5_MANUAL_STORE_SELECTION.md`
- **Implementation Summary**: `TASK_H5_SUMMARY.md`
- **Working Example**: `src/examples/ManualStoreSelectionExample.tsx`

## API Requirements

Your backend needs these endpoints:

```
GET /api/v1/stores/search
  ?q={query}
  &lat={latitude}
  &lng={longitude}
  &radius={meters}
  &wic_only={boolean}

GET /api/v1/stores/search/location
  ?location={city or zip}
  &wic_only={boolean}
  &limit={number}

GET /api/v1/stores
  ?lat={latitude}
  &lng={longitude}
  &radius={meters}
  &limit={number}
  &wic_only={boolean}
```

Response format:
```json
{
  "stores": [
    {
      "id": "store123",
      "name": "Walmart Supercenter",
      "chain": "Walmart",
      "address": {
        "street": "123 Main St",
        "city": "Ann Arbor",
        "state": "MI",
        "zip": "48104"
      },
      "location": {
        "lat": 42.2808,
        "lng": -83.7430
      },
      "wicAuthorized": true,
      "features": {
        "hasPharmacy": true
      },
      "inventoryApiAvailable": true
    }
  ]
}
```

That's it! You're ready to use manual store selection.
