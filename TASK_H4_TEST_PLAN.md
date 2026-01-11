# Task H4 Test Plan: Store Confirmation UX

**Task:** H4 - Create store confirmation UX
**Status:** ⏳ Tests Not Yet Written
**Testing Framework:** Jest (configured in package.json)

---

## Unit Tests

### 1. StoreConfirmationModal Tests

**File:** `src/components/__tests__/StoreConfirmationModal.test.tsx`

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StoreConfirmationModal } from '../StoreConfirmationModal';

const mockStore = {
  id: 'store-1',
  name: 'Walmart Supercenter',
  chain: 'Walmart',
  address: {
    street: '123 Main St',
    city: 'Ann Arbor',
    state: 'MI',
    zip: '48104',
    country: 'US',
  },
  wicAuthorized: true,
  // ... other required fields
};

describe('StoreConfirmationModal', () => {
  it('should render with store information', () => {});
  it('should show confidence badge when confidence < 100', () => {});
  it('should hide confidence badge when confidence = 100', () => {});
  it('should show WIC badge when store is WIC authorized', () => {});
  it('should hide WIC badge when store is not WIC authorized', () => {});
  it('should call onConfirm when confirm button pressed', () => {});
  it('should call onChangeStore when change button pressed', () => {});
  it('should call onDismiss when skip button pressed', () => {});
  it('should not render when visible is false', () => {});
  it('should not render when store is null', () => {});
  it('should call onRequestClose when modal dismissed', () => {});
});
```

**Priority:** HIGH
**Estimated Time:** 2 hours

---

### 2. StoreSelector Tests

**File:** `src/components/__tests__/StoreSelector.test.tsx`

```typescript
describe('StoreSelector', () => {
  it('should auto-detect on mount when autoDetect=true and permissions granted', () => {});
  it('should not auto-detect when autoDetect=false', () => {});
  it('should not auto-detect when permissions not granted', () => {});
  it('should show permission request when permissions not granted', () => {});
  it('should call requestPermissions when permission button pressed', () => {});
  it('should show confirmation modal when requiresConfirmation=true', () => {});
  it('should display current store when store is confirmed', () => {});
  it('should show favorites section when favoriteStores.length > 0', () => {});
  it('should hide favorites section when favoriteStores is empty', () => {});
  it('should show recent stores section when recentStores.length > 0', () => {});
  it('should hide recent stores section when recentStores is empty', () => {});
  it('should show nearby stores section when nearbyStores.length > 0', () => {});
  it('should show detecting state when isDetecting=true', () => {});
  it('should show error state when error exists', () => {});
  it('should call detectStore when detect button pressed', () => {});
  it('should open search modal when search button pressed', () => {});
  it('should call onStoreSelected when store is selected', () => {});
  it('should close confirmation modal after confirm', () => {});
  it('should open search modal when change store from confirmation', () => {});
});
```

**Priority:** HIGH
**Estimated Time:** 3 hours

---

### 3. NearbyStoresList Tests

**File:** `src/components/__tests__/NearbyStoresList.test.tsx`

```typescript
describe('NearbyStoresList', () => {
  it('should render list of stores', () => {});
  it('should highlight current store with special styling', () => {});
  it('should disable current store card', () => {});
  it('should show filled star when store is favorited', () => {});
  it('should show unfilled star when store is not favorited', () => {});
  it('should call onToggleFavorite when star is pressed', () => {});
  it('should stop event propagation when star is pressed', () => {});
  it('should call onStoreSelect when store card is pressed', () => {});
  it('should not call onStoreSelect when current store is pressed', () => {});
  it('should show WIC badge for WIC authorized stores', () => {});
  it('should not show WIC badge for non-WIC stores', () => {});
  it('should show pharmacy badge when hasPharmacy=true', () => {});
  it('should show inventory badge when inventoryApiAvailable=true', () => {});
  it('should show empty state when stores array is empty', () => {});
  it('should render correct number of items', () => {});
});
```

**Priority:** MEDIUM
**Estimated Time:** 2 hours

---

### 4. StoreSearchModal Tests

**File:** `src/components/__tests__/StoreSearchModal.test.tsx`

```typescript
describe('StoreSearchModal', () => {
  it('should render when visible=true', () => {});
  it('should not render when visible=false', () => {});
  it('should show instructions when no search performed', () => {});
  it('should show examples in instructions', () => {});
  it('should enable search button when query has text', () => {});
  it('should disable search button when query is empty', () => {});
  it('should disable search button when isSearching=true', () => {});
  it('should show loading state while searching', () => {});
  it('should display results when search completes', () => {});
  it('should show empty state when no results found', () => {});
  it('should call searchStores with query on search button press', () => {});
  it('should call searchStores on submit editing', () => {});
  it('should call onStoreSelect when result is selected', () => {});
  it('should call onClose when close button pressed', () => {});
  it('should reset state when modal closes', () => {});
  it('should reset state when query is cleared', () => {});
  it('should allow toggling favorites in results', () => {});
  it('should auto-focus search input when modal opens', () => {});
});
```

**Priority:** HIGH
**Estimated Time:** 2.5 hours

---

### 5. CurrentStoreDisplay Tests

**File:** `src/components/__tests__/CurrentStoreDisplay.test.tsx`

```typescript
describe('CurrentStoreDisplay', () => {
  it('should show "no store selected" when store is null', () => {});
  it('should show "tap to select" text when showChangeButton=true and no store', () => {});
  it('should show compact layout when compact=true', () => {});
  it('should show full layout when compact=false', () => {});
  it('should show confidence badge when confidence < 100', () => {});
  it('should hide confidence badge when confidence = 100', () => {});
  it('should show change button when showChangeButton=true', () => {});
  it('should hide change button when showChangeButton=false', () => {});
  it('should call onPress when pressed', () => {});
  it('should not call onPress when disabled', () => {});
  it('should show WIC badge when store is WIC authorized', () => {});
  it('should show inventory badge when inventoryApiAvailable=true', () => {});
  it('should show store chain when chain exists', () => {});
  it('should show store icon in compact mode', () => {});
  it('should show change indicator in compact mode when onPress provided', () => {});
});
```

**Priority:** MEDIUM
**Estimated Time:** 2 hours

---

### 6. StoreLocationBanner Tests

**File:** `src/components/__tests__/StoreLocationBanner.test.tsx`

```typescript
describe('StoreLocationBanner', () => {
  it('should show "no store selected" when store is null', () => {});
  it('should show "tap to select" when store is null and onPress provided', () => {});
  it('should show store information when store exists', () => {});
  it('should show "Shopping at" label when store exists', () => {});
  it('should show location icon when showLocationIcon=true', () => {});
  it('should hide location icon when showLocationIcon=false', () => {});
  it('should show change indicator when onPress is provided', () => {});
  it('should not show change indicator when onPress is not provided', () => {});
  it('should call onPress when pressed', () => {});
  it('should not call onPress when onPress is not provided', () => {});
  it('should show WIC indicator when store is WIC authorized', () => {});
  it('should apply custom styles from style prop', () => {});
});
```

**Priority:** LOW
**Estimated Time:** 1.5 hours

---

## Integration Tests

### Store Selection Flow Integration

**File:** `src/components/__tests__/integration/StoreSelectionFlow.test.tsx`

```typescript
describe('Store Selection Flow Integration', () => {
  describe('Auto-Detection Flow', () => {
    it('should complete full auto-detection flow', () => {
      // 1. Mount StoreSelector with autoDetect=true
      // 2. Mock permission granted
      // 3. Mock detectStore success
      // 4. Verify confirmation modal appears
      // 5. Press confirm
      // 6. Verify store is selected
      // 7. Verify onStoreSelected callback called
    });

    it('should handle low confidence detection', () => {});
    it('should handle detection error with retry', () => {});
  });

  describe('Manual Search Flow', () => {
    it('should complete manual search and selection', () => {
      // 1. Open search modal
      // 2. Enter query
      // 3. Submit search
      // 4. Wait for results
      // 5. Select store
      // 6. Verify modal closes
      // 7. Verify store is active
    });

    it('should handle empty search results', () => {});
  });

  describe('Favorite Selection Flow', () => {
    it('should select from favorites list', () => {});
    it('should toggle favorite status', () => {});
  });

  describe('Permission Handling', () => {
    it('should handle permission denial gracefully', () => {});
    it('should allow manual selection without permission', () => {});
  });
});
```

**Priority:** HIGH
**Estimated Time:** 4 hours

---

## Manual Testing Checklist

### Auto-Detection Tests

- [ ] App auto-detects store on launch with location permission
- [ ] Confirmation modal appears for first-time store detection
- [ ] Confirmation modal shows correct store information
- [ ] Confidence score displays when < 100%
- [ ] WIC badge shows for WIC-authorized stores
- [ ] "Yes, That's Right" button confirms store
- [ ] "Choose Different Store" opens search modal
- [ ] "Skip for now" dismisses modal
- [ ] Return visit to same store doesn't show confirmation
- [ ] Multiple nearby stores show in nearby list

### Permission Handling Tests

- [ ] Permission request UI appears without location permission
- [ ] Permission explanation is clear and helpful
- [ ] "Allow Location" button triggers system permission dialog
- [ ] Manual selection works without location permission
- [ ] Search works without location permission
- [ ] App doesn't crash when permission denied

### Store Selection Tests

- [ ] Can select from nearby stores list
- [ ] Can select from favorites list
- [ ] Can select from recent stores list
- [ ] Selected store becomes current immediately
- [ ] Current store displays correctly
- [ ] Current store shows in banner
- [ ] Can change store from banner

### Search Tests

- [ ] Search modal opens when "Search for Store" pressed
- [ ] Search input auto-focuses
- [ ] Can search by store name
- [ ] Can search by address
- [ ] Can search by city
- [ ] Can search by ZIP code
- [ ] Search shows loading state
- [ ] Search results display correctly
- [ ] Empty search shows helpful message
- [ ] Can select from search results
- [ ] Search modal closes after selection

### Favorites Tests

- [ ] Can toggle favorite on/off (star icon)
- [ ] Favorites persist across app restarts
- [ ] Favorites section only shows when favorites exist
- [ ] Can select from favorites quickly
- [ ] Favorite status syncs across all views

### UI/UX Tests

- [ ] All loading states show spinners
- [ ] All error states show error messages
- [ ] All empty states show helpful guidance
- [ ] All buttons provide visual feedback
- [ ] All modals dismiss properly
- [ ] Keyboard behavior is correct
- [ ] Scroll behavior is smooth
- [ ] Horizontal scroll works for favorites/recents
- [ ] Vertical scroll works for nearby stores
- [ ] No UI glitches or jank

### Edge Cases

- [ ] Works with no nearby stores
- [ ] Works with no favorites
- [ ] Works with no recent stores
- [ ] Handles detection timeout
- [ ] Handles search timeout
- [ ] Handles network errors
- [ ] Handles invalid store data
- [ ] Handles rapid user interactions
- [ ] Handles app backgrounding during detection
- [ ] Handles app backgrounding during search

### Accessibility Tests

- [ ] All touchable elements respond to touch
- [ ] Text is readable at default size
- [ ] Color contrast is sufficient
- [ ] Touch targets are large enough (44x44 min)
- [ ] VoiceOver announces all elements (iOS)
- [ ] TalkBack announces all elements (Android)
- [ ] Can navigate with VoiceOver
- [ ] Can navigate with TalkBack

### Platform Tests

- [ ] iOS - All features work
- [ ] iOS - Modals display correctly
- [ ] iOS - Keyboard behavior correct
- [ ] iOS - Safe areas respected
- [ ] Android - All features work
- [ ] Android - Modals display correctly
- [ ] Android - Keyboard behavior correct
- [ ] Android - Back button behavior correct

---

## Performance Testing

### Load Tests

- [ ] List of 100+ nearby stores renders smoothly
- [ ] Search with 1000+ results renders smoothly
- [ ] Rapid favorite toggling doesn't lag
- [ ] Modal animations are smooth
- [ ] Scroll performance is good on older devices

### Memory Tests

- [ ] No memory leaks in modals
- [ ] No memory leaks in lists
- [ ] App memory stable during repeated searches
- [ ] App memory stable during repeated selections

---

## Test Data Requirements

### Mock Stores

Create mock stores with variety:
- WIC authorized and non-WIC stores
- Stores with/without pharmacy
- Stores with/without live inventory
- Various chains (Walmart, Kroger, Safeway, etc.)
- Different distances from user
- Different confidence scores

### Mock Scenarios

- User at store location (95-100% confidence)
- User near store (70-94% confidence)
- User far from stores (<70% confidence)
- Multiple stores in proximity
- No stores nearby
- WiFi network matches
- WiFi network doesn't match

---

## Test Execution Timeline

### Week 1: Unit Tests
- Day 1-2: StoreConfirmationModal + StoreSelector
- Day 3: NearbyStoresList + CurrentStoreDisplay
- Day 4: StoreSearchModal + StoreLocationBanner
- Day 5: Review and fix failures

### Week 2: Integration & Manual
- Day 1-2: Integration tests
- Day 3-4: Manual testing (iOS + Android)
- Day 5: Accessibility testing

---

## Success Criteria

✅ All unit tests pass
✅ All integration tests pass
✅ All manual test cases pass
✅ No critical bugs found
✅ No accessibility issues
✅ Performance is acceptable on target devices
✅ Memory usage is stable

---

## Test Environment

### Required Setup

- React Native 0.72+
- Jest testing framework
- @testing-library/react-native
- Mock location services
- Mock AsyncStorage
- Mock store data

### Devices

**iOS:**
- iPhone SE (small screen)
- iPhone 14 Pro (current flagship)
- iPad (tablet layout)

**Android:**
- Pixel 4a (small screen)
- Pixel 7 Pro (large screen)
- Samsung Galaxy Tab (tablet)

---

## Reporting

### Bug Report Template

```
Title: [Component] Brief description
Severity: Critical | High | Medium | Low
Steps to Reproduce:
1.
2.
3.
Expected Result:
Actual Result:
Screenshots:
Device:
OS Version:
```

### Test Results Template

```
Test Suite: [Component Name]
Tests Run: X
Tests Passed: Y
Tests Failed: Z
Coverage: XX%
Notes:
```

---

## Notes

- All tests should be written before marking H4 as "production ready"
- Integration tests are especially important for complex flows
- Manual testing should cover both happy paths and edge cases
- Accessibility testing is critical for WIC app (government service)
- Performance testing should include older devices (many WIC users have older phones)

---

**Status:** ⏳ Tests not yet written
**Next Step:** Create test files and start with StoreConfirmationModal unit tests
