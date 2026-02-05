# TEST_STRATEGY.md — Testing Patterns & Plans

> Master reference for how to test features. Links to detailed specs in archive.

---

## Quick Reference

| Feature | Test Type | Archive Reference |
|---------|-----------|-------------------|
| Store Detection | Unit + E2E | `docs/archive/TASK_H5_TEST_PLAN.md` |
| Distance Calculations | Unit | `docs/archive/TASK_H5_TEST_PLAN.md` |
| Store Storage | Unit | `docs/archive/TASK_H5_TEST_PLAN.md` |
| Formula Shortage | Integration | `docs/archive/FORMULA_FINDER_WEEK2_COMPLETE.md` |
| Benefits System | Unit + E2E | (not yet documented) |
| Cart Checkout | E2E | (not yet documented) |

---

## Test Commands

```bash
# Run all tests
cd app && npm test

# Run specific test suite
npm test distance.utils.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode during development
npm test -- --watch

# Run backend tests
cd backend && npm test
```

---

## Unit Testing Patterns

### Distance Calculations

**File:** `src/utils/__tests__/distance.utils.test.ts`
**Archive:** `docs/archive/TASK_H5_TEST_PLAN.md`

**Key Test Cases:**
- Haversine formula accuracy (NYC to LA = ~3,936km)
- Same point = 0 distance
- Points across prime meridian
- Points across equator
- Distance formatting (feet vs miles threshold)
- Store sorting by distance
- Filtering stores within radius

**Edge Cases:**
```typescript
// Prime meridian crossing
const london = { lat: 51.5074, lng: -0.1278 };
const eastLondon = { lat: 51.5074, lng: 0.1278 };
expect(calculateDistance(london, eastLondon)).toBeGreaterThan(0);

// Equator crossing
const north = { lat: 1, lng: 0 };
const south = { lat: -1, lng: 0 };
expect(calculateDistance(north, south)).toBeGreaterThan(0);
```

---

### Store Storage (AsyncStorage)

**File:** `src/utils/__tests__/storeStorage.test.ts`
**Archive:** `docs/archive/TASK_H5_TEST_PLAN.md`

**Key Test Cases:**
- Add/remove favorite stores
- Prevent duplicate favorites
- Toggle favorite status
- Recent stores (max 10, most recent first)
- Moving existing store to front of recents
- Default store set/get/clear
- Error handling for storage failures
- Date serialization/deserialization

**Known Bug to Test For:**
```typescript
// Date objects become strings after JSON round-trip
// This test catches the bug
it('should preserve Date objects when storing and loading', async () => {
  const storeWithDate = {
    ...mockStore,
    lastVerified: new Date('2024-01-01'),
  };
  await addFavoriteStore(storeWithDate);
  const loaded = await getFavoriteStores();
  // Will fail if dates not properly revived
  expect(loaded[0].lastVerified instanceof Date).toBe(true);
});
```

---

### API Service Tests

**File:** `src/services/__tests__/StoreApiService.search.test.ts`
**Archive:** `docs/archive/TASK_H5_TEST_PLAN.md`

**Key Test Cases:**
- Search by text query
- Search with location parameters
- WIC-only filter
- API error handling (500, network errors)
- Empty response handling
- Parameter validation (lat/lng must both be present or absent)

---

## Integration Testing Patterns

### Store Detection Flow

**Archive:** `docs/archive/TASK_H5_TEST_PLAN.md`

**Full Selection Flow:**
1. User opens ManualStoreSelectionScreen
2. No location permission → searches by ZIP
3. Finds stores → selects one
4. Marks as favorite
5. Sets as default
6. Navigates back → store appears in favorites

**Location-Based Flow:**
1. User grants location permission
2. Nearby stores detected automatically
3. User selects from nearby list
4. Store set as current

---

### Formula Shortage Detection

**Archive:** `docs/archive/FORMULA_FINDER_WEEK2_COMPLETE.md`

**Test Script:**
```bash
cd backend
npm run detect-shortages
```

**Test Data Seeding:**
```bash
npm run seed-shortage-test-data
```

**Verification:**
- Minimum 3 stores required for shortage detection
- 10% threshold for trend changes
- Severity levels: critical (90%+), severe (70-90%), moderate (50-70%)

---

## E2E Testing Patterns

### Manual Test Checklist: Store Search

From `docs/archive/TASK_H5_TEST_PLAN.md`:

**Search Functionality:**
- [ ] Search by store name (e.g., "Walmart")
- [ ] Search by partial name (e.g., "Wal")
- [ ] Search by address (e.g., "123 Main St")
- [ ] Search by city (e.g., "Ann Arbor")
- [ ] Search by city and state (e.g., "Ann Arbor, MI")
- [ ] Search by ZIP code (e.g., "48104")
- [ ] Search with special characters
- [ ] Empty search query (button should be disabled)

**Nearby Search:**
- [ ] Use current location with permission granted
- [ ] Request location when permission not granted
- [ ] Handle location permission denied
- [ ] Handle location service disabled
- [ ] Handle no nearby stores found
- [ ] Distance sorting verification

**Favorites Management:**
- [ ] Add store to favorites from search results
- [ ] Remove store from favorites
- [ ] Favorites persist across app restarts
- [ ] Maximum favorites limit (if any)

---

### Manual Test Checklist: Formula Finder

From `docs/archive/FORMULA_FINDER_DEVICE_TESTING_JAN19.md`:

**Device Testing (Pixel 2, Android 11):**
- [ ] Formula search returns results
- [ ] Shortage alerts display with correct severity
- [ ] Color coding matches severity (critical=red, severe=orange, moderate=yellow)
- [ ] Trend indicators show correctly
- [ ] "I found this" reporting works
- [ ] Confidence scores decay over time

---

## Performance Testing

### Metrics to Track

From `docs/archive/TASK_H5_TEST_PLAN.md`:

| Metric | Target |
|--------|--------|
| Search results render | < 200ms |
| Distance calculation (50 stores) | < 50ms |
| FlatList scroll | 60 FPS |
| Modal open/close animation | 60 FPS |
| Storage operations | < 100ms |

### Large Dataset Performance

```typescript
// Test with 100+ stores
const stores = Array.from({ length: 100 }, (_, i) => createMockStore(i));
const startTime = performance.now();
const sorted = sortStoresByDistance(stores, userLocation);
const elapsed = performance.now() - startTime;
expect(elapsed).toBeLessThan(50);
```

---

## Known Issues to Test For

Based on archive code reviews:

1. **Distance calculation on every render** — Should be memoized
2. **Race conditions in search** — Debouncing needed
3. **Memory leaks in useEffect** — Cleanup functions required
4. **Date serialization** — JSON.parse doesn't restore Date objects
5. **Input validation** — lat/lng should both be present or absent
6. **Request cancellation** — Unmount should cancel pending requests

---

## Accessibility Testing

From `docs/archive/TASK_H5_TEST_PLAN.md`:

- [ ] VoiceOver/TalkBack navigation works
- [ ] All buttons have accessible labels
- [ ] Dynamic content announcements
- [ ] Sufficient color contrast (WCAG AA)
- [ ] Touch targets >= 44x44 points

---

## Test Coverage Goals

| Test Type | Target Coverage |
|-----------|-----------------|
| Unit Tests | 90%+ |
| Component Tests | 80%+ |
| Integration Tests | Key flows 100% |
| E2E Tests | Critical paths 100% |

---

## CI/CD Integration

Tests should run:
- On every pull request
- Before merging to main
- On scheduled nightly builds

Reports should include:
- Code coverage
- Performance regression detection
- Accessibility audit results

---

## Mock Data Requirements

### Store Mocks

Needed variations:
- Locations in various US states (MI, NC, FL, OR)
- Mix of chain and independent stores
- Various features (pharmacy, deli, etc.)
- WIC authorized and non-authorized
- Complete and incomplete data (optional fields)

### Location Mocks

- Urban location (high store density)
- Suburban location (medium density)
- Rural location (low density)
- Edge cases (near state borders)

---

## Adding New Tests

When adding tests for a new feature:

1. Create unit tests for utilities/services
2. Create component tests for React components
3. Add integration test for user flow
4. Add manual test checklist to this file
5. Update coverage targets if needed
6. Document in archive if comprehensive plan needed

---

*Last Updated: February 2026*
