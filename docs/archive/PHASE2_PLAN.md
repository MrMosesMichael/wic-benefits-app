# Phase 2: Store Intelligence - Implementation Plan

**Date:** January 18, 2026
**Prerequisites:** Phase 1 Polish Complete ✅
**Status:** Planning

---

## Overview

Phase 2 adds "Store Intelligence" features that help users:
1. **Know what's in stock** - Avoid wasted trips to stores
2. **Find supplemental resources** - Food banks when WIC isn't enough
3. **Share real-time availability** - Crowdsourced product sightings

---

## Current Status Summary

### Completed (Group H - Store Detection) ✅

All 6 store detection tasks are complete:
- GPS-based store detection
- Geofence matching
- WiFi-based location hints
- Store confirmation UX
- Manual store selection
- Location permission handling

**Files Created:**
- Store detection services
- Geofencing logic
- Location utilities
- UI components for store selection

### In Progress (Group I - Store Inventory) 🔄

**Progress:** 1/9 tasks complete

**Completed:**
- I1.1: Research retailer API availability ✅

**In Progress:**
- I1.2: Walmart inventory API integration 🔄
  - Started but not completed by orchestrator
  - Files exist: `src/services/inventory/walmart/`

**Pending:**
- I1.3: Kroger inventory API
- I1.4: Web scraping fallback
- I1.5: Inventory data normalization
- I2.1-I2.4: Inventory display UI

### Not Started ⬜

- Group J: Food Bank Finder (0/6 tasks)
- Group K: Crowdsourced Inventory (0/4 tasks)

---

## Recommended Phase 2 Roadmap

### Option 1: Complete Store Inventory (Recommended)

**Why First:** Builds directly on Phase 1 shopping cart, provides immediate user value

**Tasks:**
1. ✅ Review existing Walmart integration code
2. Complete Walmart API integration (I1.2)
   - Product search by UPC
   - Store inventory lookup
   - Stock status (in stock, low, out)
3. Add inventory display to scan results (I2.1)
   - Show stock status when scanning
   - Display at selected store
4. Implement data freshness indicators (I2.2)
5. Create alternative product suggestions (I2.3)
6. Add "check nearby stores" functionality (I2.4)

**User Value:**
- Scan product → See if it's in stock at their store
- Reduce wasted shopping trips
- Find alternatives when item is out of stock

**Timeline:** 2-3 sessions

### Option 2: Food Bank Finder

**Why:** Addresses real need - WIC alone is often insufficient

**Tasks:**
1. Source food bank data (Feeding America API, 211)
2. Build food bank search API
3. Create food bank listing UI
4. Add food bank detail view with hours, services
5. Implement "open now" filter
6. Design de-stigmatizing messaging

**User Value:**
- Find nearby food banks
- See hours and services
- Reduce shame/stigma around seeking help

**Timeline:** 2-3 sessions

### Option 3: Crowdsourced Inventory

**Why:** Community-powered when official APIs fail

**Tasks:**
1. Design crowdsourced data model
2. Implement "I found this" reporting
3. Build confidence scoring algorithm
4. Create "recently seen" indicators

**User Value:**
- Community helps each other find products
- Especially valuable for formula shortages

**Timeline:** 2 sessions

---

## Detailed Plan: Option 1 - Store Inventory (RECOMMENDED)

### Phase 2A: Complete Walmart Integration

#### Task 1: Review & Fix Existing Walmart Code

**Current State:**
- Partial implementation exists in `src/services/inventory/walmart/`
- Need to review what's working vs what needs fixing

**Actions:**
1. Read existing Walmart integration files
2. Test current implementation
3. Identify gaps and bugs
4. Document what needs to be completed

**Deliverables:**
- Working Walmart API client
- Inventory lookup by UPC
- Store inventory status

#### Task 2: Integrate with Backend API

**Requirements:**
- Add `/api/v1/inventory/check` endpoint
- Accept: UPC, store location
- Return: Stock status, alternatives, nearby stores

**Schema:**
```typescript
interface InventoryStatus {
  upc: string;
  storeId: string;
  inStock: boolean;
  quantity?: number;
  lastUpdated: Date;
  confidence: 'high' | 'medium' | 'low';
  source: 'walmart_api' | 'kroger_api' | 'crowdsourced' | 'scraped';
}
```

**Database Tables:**
```sql
CREATE TABLE inventory_cache (
  id SERIAL PRIMARY KEY,
  upc VARCHAR(14) NOT NULL,
  store_id VARCHAR(100) NOT NULL,
  in_stock BOOLEAN NOT NULL,
  quantity INTEGER,
  last_updated TIMESTAMP NOT NULL,
  confidence VARCHAR(20),
  source VARCHAR(50),
  UNIQUE(upc, store_id)
);

CREATE INDEX idx_inventory_upc ON inventory_cache(upc);
CREATE INDEX idx_inventory_store ON inventory_cache(store_id);
CREATE INDEX idx_inventory_updated ON inventory_cache(last_updated);
```

#### Task 3: Update Scan Result Screen

**Enhancement:** Add inventory status to existing scan result UI

**Current Flow:**
```
Scan → Check Eligibility → Show Result (Approved/Not Approved)
```

**Enhanced Flow:**
```
Scan → Check Eligibility → Check Inventory → Show Result
  ├─ Approved + In Stock → "Add to Cart" (existing)
  ├─ Approved + Out of Stock → "Check Nearby" button
  ├─ Approved + Low Stock → Warning + "Add to Cart"
  └─ Not Approved → Suggest alternatives
```

**UI Additions:**
```tsx
// Stock indicator badge
<View style={styles.stockBadge}>
  {inStock ? (
    <>
      <Icon name="check-circle" color="green" />
      <Text>In Stock</Text>
    </>
  ) : (
    <>
      <Icon name="x-circle" color="red" />
      <Text>Out of Stock</Text>
      <TouchableOpacity onPress={checkNearbyStores}>
        <Text>Check Nearby Stores</Text>
      </TouchableOpacity>
    </>
  )}
</View>

// Data freshness
<Text style={styles.freshness}>
  Updated {timeAgo(lastUpdated)}
</Text>
```

#### Task 4: Add "Check Nearby Stores" Feature

**User Flow:**
1. Product is out of stock at current store
2. User taps "Check Nearby Stores"
3. App shows list of nearby stores with stock status
4. User can navigate to store with stock

**UI Component:**
```tsx
<NearbyStoresModal
  upc={scannedUpc}
  currentStore={selectedStore}
  onSelectStore={(store) => {
    // Update selected store
    // Re-check inventory
  }}
/>
```

#### Task 5: Alternative Product Suggestions

**Logic:**
- Product out of stock OR not WIC-approved
- Find similar products in same category
- Check inventory at current store
- Show alternatives

**Example:**
```
Product: Cheerios 18oz (Out of Stock)

Alternatives:
  ✅ Honey Nut Cheerios 18oz - In Stock
  ✅ Corn Flakes 18oz - In Stock
  ⚠️ Lucky Charms 18oz - Low Stock
```

---

### Phase 2B: Kroger API Integration (Optional)

Once Walmart is working, add Kroger for broader coverage.

**Similar pattern:**
1. Kroger API client (`src/services/inventory/kroger/`)
2. Add to inventory check endpoint
3. Fallback order: Walmart → Kroger → Crowdsourced

---

### Phase 2C: Web Scraping Fallback (Later)

For stores without APIs:
- Meijer, Safeway, local chains
- Use Puppeteer or Playwright
- More fragile, requires maintenance
- Lower priority than API integrations

---

## Database Schema - Full Phase 2

### Inventory Tables

```sql
-- Inventory cache (from APIs)
CREATE TABLE inventory_cache (
  id SERIAL PRIMARY KEY,
  upc VARCHAR(14) NOT NULL,
  store_id VARCHAR(100) NOT NULL,
  in_stock BOOLEAN NOT NULL,
  quantity INTEGER,
  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confidence VARCHAR(20) CHECK (confidence IN ('high', 'medium', 'low')),
  source VARCHAR(50) CHECK (source IN ('walmart_api', 'kroger_api', 'crowdsourced', 'scraped')),
  UNIQUE(upc, store_id)
);

-- Food banks
CREATE TABLE food_banks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(2),
  zip VARCHAR(10),
  phone VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  hours JSONB,
  services JSONB,
  website VARCHAR(255),
  source VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crowdsourced inventory reports
CREATE TABLE inventory_reports (
  id SERIAL PRIMARY KEY,
  upc VARCHAR(14) NOT NULL,
  store_id VARCHAR(100) NOT NULL,
  in_stock BOOLEAN NOT NULL,
  reported_by VARCHAR(100), -- user ID or anonymous
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confidence_score DECIMAL(3, 2) -- 0.00 to 1.00
);

CREATE INDEX idx_inventory_cache_upc ON inventory_cache(upc);
CREATE INDEX idx_inventory_cache_store ON inventory_cache(store_id);
CREATE INDEX idx_food_banks_location ON food_banks USING GIST(ll_to_earth(latitude, longitude));
CREATE INDEX idx_inventory_reports_upc ON inventory_reports(upc);
```

---

## API Endpoints - Phase 2

### Inventory

```
GET /api/v1/inventory/check
Query params:
  - upc: string (required)
  - store_id: string (required)
  - include_nearby: boolean (optional, default false)

Response:
{
  "success": true,
  "inventory": {
    "upc": "016000275256",
    "storeId": "walmart_2719",
    "inStock": true,
    "quantity": null,
    "lastUpdated": "2026-01-18T10:30:00Z",
    "confidence": "high",
    "source": "walmart_api"
  },
  "nearbyStores": [...]  // if include_nearby=true
}
```

```
GET /api/v1/inventory/nearby-stores
Query params:
  - upc: string (required)
  - latitude: number (required)
  - longitude: number (required)
  - radius_miles: number (optional, default 5)

Response:
{
  "success": true,
  "stores": [
    {
      "storeId": "walmart_2720",
      "name": "Walmart Supercenter",
      "distance": 2.3,
      "inventory": {
        "inStock": true,
        "lastUpdated": "2026-01-18T10:30:00Z"
      }
    }
  ]
}
```

### Food Banks

```
GET /api/v1/food-banks/search
Query params:
  - latitude: number (required)
  - longitude: number (required)
  - radius_miles: number (optional, default 10)
  - open_now: boolean (optional)

Response:
{
  "success": true,
  "foodBanks": [
    {
      "id": "123",
      "name": "Community Food Bank",
      "address": "123 Main St",
      "city": "Detroit",
      "state": "MI",
      "distance": 1.2,
      "phone": "(555) 123-4567",
      "hours": {...},
      "services": ["food pantry", "emergency assistance"],
      "isOpenNow": true
    }
  ]
}
```

### Crowdsourced

```
POST /api/v1/inventory/report
Body:
{
  "upc": "016000275256",
  "storeId": "walmart_2719",
  "inStock": true,
  "userId": "optional-anonymous"
}

Response:
{
  "success": true,
  "message": "Thank you for reporting!"
}
```

---

## UI/UX Enhancements

### Scan Result Screen - Enhanced

**Before (Phase 1):**
```
┌─────────────────────────┐
│   ✓ WIC Approved        │
│                         │
│   Cheerios 18oz         │
│   General Mills         │
│   UPC: 016000275256     │
│                         │
│   Category: Cereal      │
│                         │
│   [Add to Cart]         │
└─────────────────────────┘
```

**After (Phase 2):**
```
┌─────────────────────────┐
│   ✓ WIC Approved        │
│                         │
│   Cheerios 18oz         │
│   General Mills         │
│   UPC: 016000275256     │
│                         │
│   Category: Cereal      │
│                         │
│   Stock Status:         │
│   ✓ In Stock at         │
│     Walmart #2719       │
│     (Updated 2 hrs ago) │
│                         │
│   [Add to Cart]         │
│   [Check Other Stores]  │
└─────────────────────────┘
```

### New Screen: Nearby Stores

```
┌─────────────────────────┐
│  ← Cheerios 18oz        │
│                         │
│  Stores near you:       │
│                         │
│  ✓ Walmart #2719        │
│    2.3 mi  •  In Stock  │
│    [Directions]         │
│                         │
│  ✗ Meijer Store #145    │
│    3.7 mi  •  Out       │
│                         │
│  ? Kroger #892          │
│    4.1 mi  •  Unknown   │
│    (No data)            │
└─────────────────────────┘
```

### New Screen: Food Banks

```
┌─────────────────────────┐
│  ← Food Banks           │
│                         │
│  Community Food Bank    │
│  1.2 mi away            │
│  🕒 Open Now            │
│                         │
│  Services:              │
│  • Food Pantry          │
│  • Emergency Assistance │
│                         │
│  Hours:                 │
│  Mon-Fri: 9am - 5pm     │
│                         │
│  [Get Directions]       │
│  [Call (555) 123-4567]  │
└─────────────────────────┘
```

---

## Testing Strategy

### Unit Tests

```typescript
// Walmart API client
describe('WalmartApiClient', () => {
  it('should fetch product inventory by UPC');
  it('should handle API rate limits');
  it('should fallback on network errors');
});

// Inventory service
describe('InventoryService', () => {
  it('should check multiple sources in order');
  it('should cache results for 15 minutes');
  it('should return confidence scores');
});
```

### Integration Tests

```typescript
describe('Inventory API Endpoints', () => {
  it('GET /inventory/check returns stock status');
  it('GET /inventory/nearby-stores returns sorted list');
  it('handles missing store gracefully');
});
```

### E2E Tests

```typescript
describe('Stock Status Flow', () => {
  it('User scans product → sees stock status → adds to cart');
  it('User sees out of stock → checks nearby → finds alternative');
  it('User reports product found → others see crowdsourced data');
});
```

---

## External API Dependencies

### Walmart Affiliate Program API

**Status:** Free tier available
**Documentation:** https://developer.walmart.com/
**Rate Limits:** 5,000 requests/day (free tier)
**Endpoints Needed:**
- Product search by UPC
- Store inventory (if available)

**Alternative:** Walmart.com web scraping (less reliable)

### Kroger Developer API

**Status:** Free tier available
**Documentation:** https://developer.kroger.com/
**Rate Limits:** 10,000 requests/day
**Features:**
- Product catalog
- Store locations
- Limited inventory data

### Feeding America API

**For:** Food bank data
**Status:** May require partnership
**Alternative:** 211 database, Google Places with "food bank" search

---

## Timeline Estimates

### Aggressive (2-3 Sessions)
- Focus on Walmart integration only
- Basic stock status on scan results
- Skip nearby stores, alternatives for now

### Realistic (4-6 Sessions)
- Complete Walmart integration
- Add inventory display UI
- Implement nearby stores feature
- Add alternative product suggestions

### Comprehensive (8-10 Sessions)
- Multiple retailer APIs (Walmart + Kroger)
- Food bank finder
- Crowdsourced inventory
- Full Phase 2 completion

---

## Next Steps

**Immediate Actions:**

1. **Review Existing Code**
   ```bash
   # Check what's already built
   cat src/services/inventory/walmart/WalmartApiClient.ts
   cat src/services/inventory/walmart/WalmartInventoryService.ts
   ```

2. **Choose Approach**
   - Option A: Complete Walmart integration (recommended)
   - Option B: Start with Food Bank Finder
   - Option C: Build crowdsourced inventory first

3. **Set Up External APIs**
   - Create Walmart Developer account
   - Get API keys
   - Test API access

4. **Database Updates**
   - Create migration for inventory tables
   - Set up caching strategy

5. **UI Mockups**
   - Sketch inventory status displays
   - Plan user flows

---

## Questions to Answer

Before starting implementation:

1. **API Access:** Do you have Walmart/Kroger API credentials?
2. **Priority:** Walmart first, or start with something else?
3. **Scope:** Aggressive timeline (basic) or comprehensive (full Phase 2)?
4. **Food Banks:** Important enough to prioritize over inventory?
5. **Testing:** Can you test on Android, or should we wait on device testing?

---

## Success Criteria - Phase 2 Complete

✅ User can see if product is in stock at their store
✅ User can check nearby stores for out-of-stock items
✅ User can find food banks within 10 miles
✅ User can report product sightings (crowdsourced)
✅ App handles API failures gracefully
✅ Inventory data cached for performance
✅ At least 2 retailer APIs integrated (Walmart + Kroger)

---

**Ready to proceed?** Let me know which option you'd like to pursue and we'll dive into implementation!
