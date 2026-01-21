# Test Specifications for A4.1 - Formula Availability Tracking

> Note: Test framework not yet implemented. These specifications outline what should be tested once a framework is in place.

## Unit Tests: FormulaAvailabilityService

### Test Suite: updateAvailability()

1. **Should update availability with valid input**
   - Given: Valid `FormulaAvailabilityUpdate` with storeId, upc, inStock=true, quantity=5, source='api'
   - When: `updateAvailability()` is called
   - Then: Returns `FormulaAvailability` with correct data and `lastChecked` set to now

2. **Should update lastChecked timestamp on every call**
   - Given: Same storeId/upc, called twice with different timestamps
   - When: Second call made 5 seconds after first
   - Then: `lastChecked` is updated to new timestamp

3. **Should overwrite previous availability**
   - Given: Initial availability with inStock=true, quantity=10
   - When: Updated with inStock=false, quantity=0
   - Then: Retrieval returns updated values, not original

### Test Suite: getAvailability()

4. **Should return null for non-existent storeId/upc**
   - Given: No data added for storeId="store-123", upc="12345"
   - When: `getAvailability("store-123", "12345")` is called
   - Then: Returns null

5. **Should return cached availability**
   - Given: Data added to cache
   - When: `getAvailability()` is called immediately after
   - Then: Returns exact same data from cache

### Test Suite: queryAvailability()

6. **Should filter by storeIds**
   - Given: Availability data for stores A, B, C
   - When: `queryAvailability({ storeIds: ['A', 'C'] })` is called
   - Then: Returns only entries for stores A and C

7. **Should filter by inStockOnly**
   - Given: Mix of inStock=true and inStock=false
   - When: `queryAvailability({ inStockOnly: true })` is called
   - Then: Returns only in-stock items

8. **Should filter by maxAge (hours)**
   - Given: Data added at different times (1 hour ago, 24 hours ago, 49 hours ago)
   - When: `queryAvailability({ maxAge: 24 })` is called
   - Then: Returns only data from last 24 hours (not 49-hour-old data)

9. **Should support multiple filters combined**
   - Given: Mixed data across stores, stock status, and ages
   - When: `queryAvailability({ storeIds: ['A'], inStockOnly: true, maxAge: 24 })` is called
   - Then: Returns only in-stock items in store A from last 24 hours

10. **Should return empty array when no results match**
    - Given: Query with no matching results
    - When: `queryAvailability()` is called
    - Then: Returns empty array (not null)

### Test Suite: recordSighting()

11. **Should create valid sighting with auto-generated ID**
    - Given: Valid userId, storeId, upc, quantity
    - When: `recordSighting()` is called
    - Then: Returns FormulaSighting with non-empty ID and timestamp set to now

12. **Should update availability based on sighting**
    - Given: No prior availability for storeId/upc
    - When: `recordSighting(userId, storeId, upc, 3)` is called
    - Then: `getAvailability()` shows inStock=true, source='crowdsourced'

13. **Should reject negative quantity**
    - Given: quantity < 0
    - When: `recordSighting()` is called
    - Then: Returns error or rejects promise

14. **Should handle concurrent sightings without data loss (race condition fix)**
    - Given: Two concurrent calls to `recordSighting()` for same storeId/upc
    - When: Both are awaited
    - Then: Both sightings are stored (no mutation loss)

### Test Suite: getSightings()

15. **Should return recent sightings**
    - Given: 3 sightings for same storeId/upc
    - When: `getSightings(storeId, upc)` is called
    - Then: Returns array with all 3 sightings

16. **Should filter by maxAge**
    - Given: Sightings from 1 hour ago, 24 hours ago, 49 hours ago
    - When: `getSightings(storeId, upc, maxAge=24)` is called
    - Then: Returns only recent ones (not 49-hour-old)

### Test Suite: verifySighting()

17. **Should mark sighting as verified**
    - Given: Unverified sighting with known ID
    - When: `verifySighting(sightingId)` is called
    - Then: Returns true and subsequent `getSightings()` shows verified=true

18. **Should return false for non-existent ID**
    - Given: sightingId that doesn't exist
    - When: `verifySighting(sightingId)` is called
    - Then: Returns false

### Test Suite: isAvailableAnywhere()

19. **Should return true if available at any store**
    - Given: UPC in stock at store A (out of stock at B)
    - When: `isAvailableAnywhere(upc)` is called
    - Then: Returns true

20. **Should return false if not available anywhere**
    - Given: UPC out of stock at all stores
    - When: `isAvailableAnywhere(upc)` is called
    - Then: Returns false

### Test Suite: getStoresWithStock()

21. **Should return list of stores with stock**
    - Given: UPC in stock at stores A and C (out at B)
    - When: `getStoresWithStock(upc)` is called
    - Then: Returns ['A', 'C'] (or similar array)

22. **Should return empty array if nowhere in stock**
    - Given: UPC out of stock everywhere
    - When: `getStoresWithStock(upc)` is called
    - Then: Returns empty array

### Test Suite: clearStaleData()

23. **Should remove data older than maxAgeHours**
    - Given: Data from 12 hours ago, 24 hours ago, 36 hours ago
    - When: `clearStaleData(24)` is called
    - Then: Returns removedCount=1 (the 36-hour-old entry)

24. **Should keep recent data**
    - Given: Data from 12 hours ago
    - When: `clearStaleData(24)` is called
    - Then: Data remains in cache

---

## Unit Tests: FormulaProductService

### Test Suite: upsertProduct()

25. **Should add new product to catalog**
    - Given: New product with upc, brand, name, size, wicApproved, alternativeUPCs=Set
    - When: `upsertProduct(product)` is called
    - Then: `getProduct(upc)` returns the product

26. **Should update existing product**
    - Given: Product already exists
    - When: `upsertProduct(updated_product)` is called with same upc
    - Then: `getProduct(upc)` returns updated data

27. **Should normalize alternativeUPCs to Set**
    - Given: Product with alternativeUPCs as plain array
    - When: `upsertProduct()` is called
    - Then: Stored product has alternativeUPCs as Set

### Test Suite: getProduct()

28. **Should return null for non-existent UPC**
    - Given: UPC never added
    - When: `getProduct(upc)` is called
    - Then: Returns null

29. **Should return exact product data**
    - Given: Product stored
    - When: `getProduct(upc)` is called
    - Then: Returns product with all fields intact

### Test Suite: getWICApprovedFormulas()

30. **Should return only WIC-approved formulas**
    - Given: Mix of approved (wicApproved=true) and unapproved (false)
    - When: `getWICApprovedFormulas()` is called
    - Then: Returns only approved ones

31. **Should return empty array if none approved**
    - Given: No WIC-approved products added
    - When: `getWICApprovedFormulas()` is called
    - Then: Returns empty array

### Test Suite: getAlternatives()

32. **Should return empty array for product with no alternatives**
    - Given: Product with alternativeUPCs = Set()
    - When: `getAlternatives(upc)` is called
    - Then: Returns empty array

33. **Should return all alternative products**
    - Given: Product with alternativeUPCs containing 3 UPCs, all in catalog
    - When: `getAlternatives(upc)` is called
    - Then: Returns array with 3 products

34. **Should skip alternatives not in catalog**
    - Given: alternativeUPCs with 3 UPCs, but only 2 exist in catalog
    - When: `getAlternatives(upc)` is called
    - Then: Returns array with 2 products (skips missing)

### Test Suite: searchFormulas()

35. **Should find by brand (case-insensitive)**
    - Given: Products with brands "Similac", "SIMILAC", "similac"
    - When: `searchFormulas("similac")` is called
    - Then: Returns all 3

36. **Should find by name (case-insensitive)**
    - Given: Product named "Advance Infant Formula"
    - When: `searchFormulas("infant")` is called
    - Then: Returns the product

37. **Should return empty array if no match**
    - Given: Search query with no matching products
    - When: `searchFormulas(query)` is called
    - Then: Returns empty array

### Test Suite: getFormulasByBrand()

38. **Should return all products from brand (case-insensitive)**
    - Given: 3 products with brand "Similac"
    - When: `getFormulasByBrand("SIMILAC")` is called
    - Then: Returns all 3

39. **Should return empty array for unknown brand**
    - Given: Brand never added
    - When: `getFormulasByBrand(brand)` is called
    - Then: Returns empty array

### Test Suite: addAlternative()

40. **Should add alternative to product (prevents concurrent mutation)**
    - Given: Product with alternativeUPCs containing [upc1, upc2]
    - When: `addAlternative(mainUpc, upc3)` is called
    - Then: Product now contains [upc1, upc2, upc3] (no duplicates)

41. **Should not add duplicate alternative**
    - Given: Product with alternativeUPCs containing [upc1]
    - When: `addAlternative(mainUpc, upc1)` is called twice
    - Then: Still contains only [upc1], not [upc1, upc1]

42. **Should return false for non-existent product**
    - Given: mainUpc doesn't exist
    - When: `addAlternative(mainUpc, altUpc)` is called
    - Then: Returns false

### Test Suite: removeAlternative()

43. **Should remove alternative from product**
    - Given: Product with alternativeUPCs containing [upc1, upc2, upc3]
    - When: `removeAlternative(mainUpc, upc2)` is called
    - Then: Product contains [upc1, upc3]

44. **Should return false if alternative doesn't exist**
    - Given: mainUpc exists, but altUpc not in alternativeUPCs
    - When: `removeAlternative(mainUpc, altUpc)` is called
    - Then: Returns false

45. **Should return false for non-existent product**
    - Given: mainUpc doesn't exist
    - When: `removeAlternative(mainUpc, altUpc)` is called
    - Then: Returns false

---

## Integration Tests: API Layer

### Test Suite: Products API Serialization

46. **Should serialize alternativeUPCs Set to array**
    - Given: Product with alternativeUPCs as Set(['upc1', 'upc2'])
    - When: `serializeFormulaProduct()` is called
    - Then: Returns JSON-safe object with alternativeUPCs as ['upc1', 'upc2']

47. **Should deserialize array to Set**
    - Given: JSON object with alternativeUPCs as ['upc1', 'upc2']
    - When: `deserializeFormulaProduct()` is called
    - Then: Returns FormulaProduct with alternativeUPCs as Set

### Test Suite: getFormulaProduct API

48. **Should return serialized product**
    - Given: Call to getFormulaProduct(upc)
    - When: Product exists
    - Then: Returns { success: true, data: { ...fields with alternativeUPCs as array } }

49. **Should return error for missing UPC**
    - Given: Call with empty upc
    - When: getFormulaProduct('') is called
    - Then: Returns { success: false, error: 'UPC is required' }

---

## Test Infrastructure Notes

**Framework Requirements:**
- Support for async/await test functions
- Assertion library (expect, assert, etc.)
- Setup/teardown hooks for isolating service instances
- Mocking capability (optional, but useful for database TODO items)

**Test Organization:**
- Create separate test files for each service class:
  - `FormulaAvailabilityService.test.ts`
  - `FormulaProductService.test.ts`
  - `api/formula/products.test.ts`
- Use describe() blocks to group related tests
- Use beforeEach() to reset service instances between tests

**Service Singleton Issue:**
- Tests must handle singleton instances in services
- May need to add reset() or clear() methods for testing
- Consider factory pattern modification to support test isolation

**Coverage Goals:**
- Aim for >90% line coverage
- 100% coverage of error paths
- All race condition fixes verified

---

## Bugs Fixed in This Review

1. **Race condition in recordSighting()** (Line 129-132)
   - Fixed: Defensive copy pattern to prevent concurrent mutation loss

2. **Mutable state in addAlternative()** (Line 102)
   - Fixed: Create new product copy before mutation

3. **Mutable state in removeAlternative()** (Line 121)
   - Fixed: Create new product copy before mutation

4. **alternativeUPCs array inefficiency**
   - Fixed: Changed type from `string[]` to `Set<string>` for O(1) lookups
   - Added: Serialization utilities for JSON compatibility

5. **Missing Set serialization**
   - Fixed: Added `utils.ts` with `serializeFormulaProduct()` and `deserializeFormulaProduct()`

6. **API endpoints not handling Set serialization**
   - Fixed: Updated all product API endpoints to use serialization functions
