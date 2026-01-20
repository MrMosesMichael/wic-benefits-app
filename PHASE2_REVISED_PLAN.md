# Phase 2 Revised: Community-Powered Features

**Date:** January 18, 2026
**Status:** Planning - Post Walmart API Investigation

---

## ❌ Retailer API Limitations Discovered

### Walmart API - NOT VIABLE

**Issues:**
1. **Affiliate-only:** API designed for marketing partners who drive sales to Walmart.com
2. **No inventory access:** Store-specific inventory requires OPD API with business manager approval
3. **Strict ToS:** Explicitly prohibits scraping, requires affiliate partnership
4. **Commission-based:** Designed to earn referral fees, not check inventory
5. **Rate limits:** Only 5,000 calls/day (insufficient for user base)

**Quote from ToS:**
> "The Walmart API is available to Walmart's affiliate partners solely for the purpose of advertising Walmart.com products online. It may not be used for any other purposes without express written permission from Walmart."

**Prohibits:**
- Scraping or spidering
- Use by competitors (could include WIC apps)
- Store inventory access without partnership

### Similar Issues Expected With:
- **Kroger API:** Likely similar affiliate/partnership requirements
- **Target API:** Same business model (REDcard affiliates)
- **Other major retailers:** Protect inventory data as competitive advantage

### Conclusion

**Store inventory integration via official APIs is NOT VIABLE** for a WIC benefits app without:
1. Corporate partnerships (months of negotiation)
2. Affiliate program enrollment (not our use case)
3. Potentially: Becoming a registered vendor/partner

---

## ✅ Revised Phase 2: Community & Public Data

Focus on features we CAN build with available data sources.

---

## Option A: Crowdsourced Inventory (RECOMMENDED)

**Why This Works:**
- No API dependencies
- Community-powered (users help each other)
- Especially valuable for formula shortages
- Builds user engagement

### Features

#### 1. Product Sighting Reports
**User Flow:**
```
User finds product in store
  → Taps "I Found This" button
  → Confirms store location
  → Reports stock level (plenty/some/few)
  → System timestamps report
```

**Benefits:**
- Real-time community data
- No APIs needed
- Most valuable for hard-to-find items (formula)
- Builds community spirit

#### 2. Recent Sightings Display
**What Users See:**
```
┌─────────────────────────┐
│  Similac 12.4oz Formula │
│                         │
│  Recent Sightings:      │
│                         │
│  ✓ Walmart #2719        │
│    2 hrs ago            │
│    "Plenty in stock"    │
│                         │
│  ✓ Meijer #145          │
│    5 hrs ago            │
│    "Few left"           │
│                         │
│  ? Target #8923         │
│    2 days ago           │
│    (Data may be stale)  │
└─────────────────────────┘
```

#### 3. Confidence Scoring
**Algorithm:**
```typescript
confidence = calculateConfidence({
  reportAge: 2 hours,
  reportCount: 3 reports,
  userReliability: high,
  productType: 'formula' // high priority
});

// Recent formula reports = high confidence
// Old non-formula reports = low confidence
```

#### 4. Formula Alert System
**High-Value Feature:**
```
User subscribes to formula alerts
  → When someone reports formula in stock
  → Push notification sent
  → "Similac found at Walmart #2719 - 30 min ago"
```

---

## Option B: Food Bank Finder

**Why This Works:**
- Public data (Feeding America, 211 database)
- No API restrictions
- Addresses real need (WIC alone often insufficient)
- Clear social good

### Data Sources

#### 1. Feeding America Locator API
- **URL:** https://www.feedingamerica.org/find-your-local-foodbank
- **Data:** Food bank locations, contact info
- **Access:** May require partnership, but publicly scrapable
- **Coverage:** National network

#### 2. 211 Database
- **URL:** https://www.211.org/
- **Data:** Social services including food banks
- **Access:** Some regions have public APIs
- **Coverage:** Local/regional

#### 3. Google Places API
- **Search:** "food bank near [location]"
- **Data:** Name, address, hours, phone
- **Cost:** Free tier: 28,000 searches/month
- **Coverage:** Excellent for finding local resources

### Features

#### 1. Food Bank Search
```
User taps "Find Food Banks"
  → App uses GPS location
  → Shows list sorted by distance
  → Filters: Open Now, Emergency Services, etc.
```

#### 2. De-Stigmatized UI
**Important:** Design reduces shame/stigma

**Good messaging:**
- "Community Food Resources"
- "Supplemental Food Assistance"
- "Additional Support Available"

**Avoid:**
- "Charity"
- "Free food"
- Anything that implies failure

#### 3. Service Information
```
┌─────────────────────────┐
│  Community Food Bank    │
│  1.2 mi away            │
│                         │
│  🕒 Open Now            │
│  Mon-Fri: 9am - 5pm     │
│                         │
│  Services:              │
│  • Food Pantry          │
│  • Emergency Boxes      │
│  • SNAP Assistance      │
│                         │
│  Requirements:          │
│  • Proof of address     │
│  • Photo ID             │
│                         │
│  [Get Directions]       │
│  [Call (555) 123-4567]  │
└─────────────────────────┘
```

---

## Option C: Enhanced Product Discovery

**Why This Works:**
- Uses data we already have (Michigan APL)
- No external APIs needed
- Helps users find alternatives

### Features

#### 1. Category Browse
```
User opens app
  → Sees benefit categories
  → "Milk" → Shows all approved milk products
  → Filtered by what user can still buy
```

#### 2. Alternative Suggestions
```
User scans Cheerios 18oz (out of stock)
  → App suggests similar cereal:
    • Honey Nut Cheerios 18oz
    • Corn Flakes 18oz
    • Life Cereal 18oz
  → All WIC-approved
  → Sorted by popularity
```

#### 3. "Shop Your Benefits"
```
User has:
- 2 gallons milk remaining
- 18oz peanut butter remaining
- 1 dozen eggs remaining

App suggests:
"You can still get:"
  → Milk products (15 options)
  → Peanut butter brands (8 options)
  → Egg varieties (4 options)
```

---

## Recommended Implementation Order

### Sprint 1: Crowdsourced Inventory (2-3 sessions)

**Aggressive scope:**
1. Database tables for sighting reports
2. "Report Sighting" button on scan results
3. Display recent sightings
4. Basic confidence scoring

**Implementation:**
```sql
-- Sighting reports table
CREATE TABLE product_sightings (
  id SERIAL PRIMARY KEY,
  upc VARCHAR(14) NOT NULL,
  store_id VARCHAR(100),
  store_name VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  stock_level VARCHAR(20), -- 'plenty', 'some', 'few', 'out'
  reported_by VARCHAR(100), -- user_id or 'anonymous'
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0
);

CREATE INDEX idx_sightings_upc ON product_sightings(upc);
CREATE INDEX idx_sightings_reported_at ON product_sightings(reported_at);
```

**API Endpoints:**
```
POST /api/v1/sightings/report
Body: {
  upc: string,
  storeId: string,
  stockLevel: 'plenty' | 'some' | 'few' | 'out',
  latitude: number,
  longitude: number
}

GET /api/v1/sightings/:upc?radius_miles=10
Response: {
  sightings: [{
    store_name: string,
    distance: number,
    stock_level: string,
    reported_at: timestamp,
    age_hours: number,
    confidence: number
  }]
}
```

**UI Updates:**
- Add "Report Sighting" button to scan result
- Show "Recent Sightings" section
- Display age and confidence indicators

---

### Sprint 2: Food Bank Finder (2-3 sessions)

**Aggressive scope:**
1. Google Places integration for food banks
2. Database table for food bank info
3. Search by location
4. Detail view with directions

**Implementation:**
```sql
CREATE TABLE food_banks (
  id SERIAL PRIMARY KEY,
  place_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(2),
  zip VARCHAR(10),
  phone VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  google_rating DECIMAL(2, 1),
  hours JSONB,
  website VARCHAR(255),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_food_banks_location
ON food_banks USING GIST(ll_to_earth(latitude, longitude));
```

**UI Flow:**
```
Home → "Food Resources" button
  → Shows map with food banks
  → List view sorted by distance
  → Tap for details + directions
```

---

### Sprint 3: Enhanced Product Discovery (1-2 sessions)

**Aggressive scope:**
1. Category browse UI
2. Alternative product suggestions
3. "Shop Your Benefits" recommendations

**Uses existing data:**
- Michigan APL (12,344 products)
- User's benefit balances
- Product categories

---

## Benefits of Revised Approach

### ✅ What We Gain

1. **No API Dependencies**
   - No partnership negotiations
   - No rate limits
   - No ToS violations

2. **Community Building**
   - Users help each other
   - Especially valuable for formula
   - Builds loyalty and engagement

3. **Social Good**
   - Food bank finder addresses real need
   - De-stigmatized approach
   - Supplements WIC benefits

4. **Faster Development**
   - No waiting on API approvals
   - Simpler implementation
   - Can ship features quickly

### ✅ User Value

**Crowdsourced Inventory:**
- "Formula spotted at Walmart 2 hours ago"
- Community helps find scarce items
- Real-time, hyperlocal data

**Food Bank Finder:**
- "Food bank 1.2 miles away, open now"
- Reduces shame/stigma
- Addresses gaps in WIC coverage

**Product Discovery:**
- "Here are 15 milk products you can still get"
- Helps users maximize benefits
- Suggests alternatives when items unavailable

---

## What We're NOT Building (Yet)

### ❌ Deferred Features

1. **Official Retailer Inventory APIs**
   - Requires corporate partnerships
   - 6-12 month timeline
   - May never happen

2. **Web Scraping**
   - Violates ToS
   - Legally risky
   - Fragile (breaks when sites change)

3. **In-Store Aisle Navigation**
   - Requires retailer data
   - Low priority vs other features

---

## Success Metrics - Revised Phase 2

### Sprint 1: Crowdsourced Inventory
✅ User can report product sightings
✅ User sees recent sightings for scanned products
✅ Confidence scoring shows data quality
✅ Formula sightings get priority display

### Sprint 2: Food Bank Finder
✅ User can find nearby food banks
✅ User sees hours, services, contact info
✅ User can get directions
✅ UI is de-stigmatized and welcoming

### Sprint 3: Product Discovery
✅ User can browse products by category
✅ User sees alternative products
✅ User gets personalized recommendations based on remaining benefits

---

## Next Steps - Choose Your Adventure

### Option A: Start with Crowdsourced Inventory (Recommended)
**Why:** High user value, unique feature, builds community
**Timeline:** 2-3 sessions
**Risk:** Low

### Option B: Start with Food Bank Finder
**Why:** Addresses real need, uses public data
**Timeline:** 2-3 sessions
**Risk:** Low

### Option C: Start with Product Discovery
**Why:** Uses existing data, quickest to build
**Timeline:** 1-2 sessions
**Risk:** Very low

---

## My Recommendation

**Start with Option A (Crowdsourced Inventory)** because:

1. **Unique Value**
   - No other app does this for WIC
   - Most valuable for formula shortages (critical need)
   - Community-powered solution

2. **Feasible Scope**
   - 2-3 sessions to MVP
   - No external dependencies
   - Clear user flow

3. **Foundation for Future**
   - Can add more features later
   - Formula alerts (push notifications)
   - Gamification (karma points for helpful reports)

**What we'd build first:**
1. Database table for sightings
2. "Report Sighting" button
3. Display recent sightings
4. Basic confidence algorithm

Then follow with **Food Bank Finder** in next sprint.

---

## Questions?

1. Which option appeals to you most?
2. Want to start with crowdsourced inventory?
3. Any concerns about this revised approach?

Let me know and I'll start building! 🚀
