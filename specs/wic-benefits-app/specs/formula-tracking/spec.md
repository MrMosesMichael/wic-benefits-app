# Formula Tracking Specification

## Purpose

Provide critical infant formula availability tracking, shortage detection, and emergency finding capabilities. This is a **SURVIVAL** feature - formula shortages are life-threatening for infants 0-6 months who cannot digest alternatives.

## Guiding Principles

1. **Speed over perfection** - A possibly-stale "in stock" is better than no information
2. **Multiple sources** - API, scraping, crowdsourced, all contribute
3. **Proactive alerts** - Don't wait for users to search; push when formula appears
4. **Alternative guidance** - When primary formula unavailable, guide to safe alternatives

---

## Requirements

### Requirement: Formula Availability Tracking

The system SHALL track formula availability across all nearby WIC-authorized stores.

#### Scenario: View formula availability at current store
- GIVEN user is at or near a WIC-authorized store
- AND user has an infant participant in household
- WHEN user opens formula finder
- THEN current store's formula inventory is displayed
- AND each formula type shows availability status:
  - In Stock (green) - Available now
  - Low Stock (amber) - Limited quantity, may sell out
  - Out of Stock (red) - Currently unavailable
  - Unknown (gray) - No recent data
- AND last updated timestamp is shown
- AND data source is indicated (API/Crowdsourced)

#### Scenario: View formula availability across stores
- GIVEN user needs to find formula
- WHEN user opens formula finder
- THEN nearby stores are listed with formula availability
- AND stores are sorted by:
  1. Has user's specific formula in stock (top)
  2. Distance from user
- AND each store shows:
  - Store name and distance
  - Formula availability status
  - Last verified timestamp
- AND user can filter by formula type/brand

#### Scenario: Formula type matching
- GIVEN user's infant has specific formula assigned (from WIC benefits)
- WHEN viewing formula availability
- THEN user's assigned formula type is highlighted
- AND matching products are shown first
- AND system understands formula equivalents:
  - Same brand, different size
  - Powder vs concentrate vs ready-to-feed
  - Generic equivalents (if allowed by state)

---

### Requirement: Formula Shortage Detection

The system SHALL detect and alert users to formula shortages proactively.

#### Scenario: Detect regional shortage
- GIVEN formula type X is out of stock at >50% of nearby stores
- WHEN shortage threshold is crossed
- THEN shortage is flagged in system
- AND affected formula types are marked as "Shortage Alert"
- AND alternative formulas are suggested (if WIC-approved)

#### Scenario: Display shortage context
- WHEN user views formula in shortage
- THEN contextual information appears:
  ```
  ⚠️ Regional Shortage Alert

  Similac Pro-Advance is currently hard to find
  in your area. Here's what we know:

  • Available at 2 of 15 nearby stores
  • Last restocked: Walmart on Main St (2 hours ago)
  • Typically restocks: Tuesday/Thursday mornings

  [Set Restock Alert] [Find Alternatives] [More Help]
  ```
- AND links to WIC office for medical exceptions if needed

#### Scenario: Track shortage trends
- GIVEN formula shortages fluctuate over time
- WHEN system detects improving availability
- THEN "Shortage Easing" indicator appears
- AND users with alerts are notified of improvement

---

### Requirement: Formula Restock Notifications

The system SHALL notify users when formula becomes available.

#### Scenario: Subscribe to restock alerts
- GIVEN user's formula is out of stock
- WHEN user taps "Notify me when available"
- THEN alert subscription is created
- AND user can configure:
  - Maximum distance to search (default: 10 miles)
  - Notification method (push, SMS, both)
  - Specific stores to watch (optional)
- AND subscription is confirmed with expected wait time

#### Scenario: Receive restock notification
- GIVEN user has active restock alert for formula X
- AND formula X becomes available at nearby store
- WHEN availability is confirmed (API or crowdsourced with high confidence)
- THEN push notification is sent:
  ```
  🍼 Formula Available!

  Similac Pro-Advance 12.4oz is now in stock
  at Walmart (2.3 mi away)

  [Get Directions] [View Details]
  ```
- AND notification includes:
  - Store name and distance
  - Quantity available (if known)
  - Time since confirmed
- AND user can snooze or dismiss alert

#### Scenario: Restock alert rate limiting
- GIVEN user may get many alerts during shortage
- WHEN multiple stores restock same formula
- THEN notifications are batched (max 1 per 30 minutes)
- AND batch notification summarizes: "Formula available at 3 stores"
- AND user can adjust notification frequency in settings

#### Scenario: Alert expiration
- GIVEN user set restock alert
- WHEN 30 days pass without finding formula
- THEN user is prompted:
  ```
  Still looking for Similac Pro-Advance?

  [Keep Alert Active] [Try Alternatives] [Cancel Alert]
  ```
- AND system suggests contacting WIC office for assistance

---

### Requirement: Cross-Store Formula Search

The system SHALL search multiple stores simultaneously for formula.

#### Scenario: Emergency formula finder
- GIVEN user urgently needs formula
- WHEN user taps "Find Formula Now"
- THEN search parameters are shown:
  - Formula type (pre-filled from benefits)
  - Search radius (5/10/25/50 miles)
  - Include alternatives (checkbox)
- AND search executes against all stores in radius
- AND results stream in as found (don't wait for all)

#### Scenario: Display search results
- WHEN search returns results
- THEN stores with formula are shown:
  ```
  Found at 3 stores:

  1. Walmart - Main St (2.3 mi)
     ✓ Similac Pro-Advance 12.4oz - In Stock
     Last verified: 45 min ago (crowdsourced)
     [Directions] [Call Store]

  2. Kroger - Oak Ave (4.1 mi)
     ✓ Similac Pro-Advance 12.4oz - Low Stock
     Last verified: 2 hours ago (API)
     [Directions] [Call Store]

  3. Target - Mall Rd (7.8 mi)
     ✓ Similac Pro-Advance 23.2oz - In Stock
     ⚠️ Different size - check WIC eligibility
     Last verified: 1 hour ago (API)
     [Directions] [Call Store]
  ```
- AND "Call Store" allows verification before traveling
- AND results include confidence indicator

#### Scenario: No formula found
- WHEN search finds no formula in radius
- THEN helpful guidance appears:
  ```
  No Similac Pro-Advance found within 25 miles

  Here's what you can do:

  1. Expand Search
     [Search 50 miles] [Search 100 miles]

  2. Try Approved Alternatives
     These formulas are also covered by WIC:
     • Similac Advance (same nutrients)
     • [View all alternatives]

  3. Contact WIC Office
     They may know of emergency supplies
     [Find WIC Office] [Call WIC Hotline]

  4. Other Resources
     • Hospital lactation consultants
     • Formula exchange groups
     • [More emergency resources]
  ```
- AND alternative suggestions only show WIC-approved options

#### Scenario: Search with alternatives
- GIVEN user checked "Include alternatives"
- WHEN searching for Similac Pro-Advance
- THEN results include:
  - Exact matches (highlighted)
  - Same brand alternatives (Similac Advance, Similac Sensitive)
  - State-approved generic equivalents
- AND each alternative shows eligibility status
- AND medical exception formulas are noted but searchable

---

### Requirement: Crowdsourced Formula Reporting

The system SHALL allow users to report formula availability.

#### Scenario: Report formula found
- GIVEN user finds formula on store shelf
- WHEN user taps "I found this!" on formula product
- THEN quick report form appears:
  ```
  Report Formula Sighting

  Similac Pro-Advance 12.4oz
  at Walmart - Main St

  Quantity on shelf:
  ○ Just a few (1-3)
  ○ Some (4-10)
  ○ Plenty (10+)

  [Submit Report]
  ```
- AND report is submitted with timestamp and location
- AND user receives thank you message
- AND report contributes to availability scoring

#### Scenario: Report formula out of stock
- GIVEN user went to store for formula
- AND formula was not on shelf
- WHEN user reports "Not here"
- THEN out-of-stock report is logged
- AND system updates availability status
- AND user is offered to search other stores

#### Scenario: Crowdsourced confidence scoring
- GIVEN multiple users report on same formula/store
- WHEN reports are consistent
- THEN confidence score increases
- AND data is weighted:
  - API data: 90% confidence
  - Recent crowdsourced (<1 hour): 80% confidence
  - Older crowdsourced (1-4 hours): 60% confidence
  - Very old crowdsourced (>4 hours): 40% confidence
  - Conflicting reports: averaged with recency weight

---

### Requirement: Alternative Formula Guidance

The system SHALL guide users to safe alternatives when primary formula unavailable.

#### Scenario: Suggest WIC-approved alternatives
- GIVEN user's assigned formula is unavailable
- WHEN viewing shortage or search results
- THEN WIC-approved alternatives are suggested:
  ```
  Alternatives covered by your WIC benefits:

  ✓ Similac Advance
    Same brand, similar nutrition
    Available at 5 nearby stores

  ✓ Similac Sensitive
    For fussiness/gas, same brand
    Available at 3 nearby stores

  ⚠️ Generic equivalent
    Check with your WIC office first
    [Why?]
  ```
- AND alternatives are filtered by user's state APL
- AND special formulas (soy, hypoallergenic) note medical requirement

#### Scenario: Link to WIC office for exceptions
- GIVEN user may need formula not on their benefits
- WHEN alternative is medical or requires approval
- THEN clear guidance appears:
  ```
  Need a different formula?

  Your WIC office can update your benefits for:
  • Medical needs (allergies, reflux)
  • Shortage exceptions
  • Generic equivalents

  [Find Your WIC Office]
  [What to tell them]
  ```
- AND "What to tell them" provides script/talking points

---

## Data Requirements

### Formula Availability Data

```typescript
interface FormulaAvailability {
  upc: string;
  storeId: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
  quantity?: number;
  quantityRange?: 'few' | 'some' | 'plenty';
  lastUpdated: Date;
  source: 'api' | 'scrape' | 'crowdsourced';
  confidence: number;  // 0-100
  reportCount?: number;  // For crowdsourced
}

interface FormulaAlert {
  id: string;
  userId: string;
  formulaUpcs: string[];  // Can watch multiple UPCs
  maxDistanceMiles: number;
  notificationMethod: 'push' | 'sms' | 'both';
  specificStoreIds?: string[];
  createdAt: Date;
  expiresAt: Date;
  lastNotified?: Date;
  active: boolean;
}

interface FormulaSighting {
  id: string;
  upc: string;
  storeId: string;
  reportedBy: string;  // anonymized user ID
  quantityRange: 'few' | 'some' | 'plenty' | 'none';
  reportedAt: Date;
  location: GeoPoint;
  verified: boolean;
}

interface FormulaShortage {
  formulaCategory: string;
  affectedUpcs: string[];
  region: string;  // Geographic area affected
  severity: 'moderate' | 'severe' | 'critical';
  percentStoresAffected: number;
  detectedAt: Date;
  trend: 'worsening' | 'stable' | 'improving';
  alternativeUpcs: string[];
}
```

### Formula Type Hierarchy

```typescript
interface FormulaType {
  category: 'standard' | 'sensitive' | 'soy' | 'hypoallergenic' | 'specialty';
  brand: string;
  productLine: string;
  form: 'powder' | 'concentrate' | 'ready_to_feed';
  sizeOz: number;
  ageRange: string;  // "0-12 months", "0-3 months", etc.
  requiresMedicalException: boolean;
  equivalentUpcs: string[];  // Other sizes/forms of same formula
}
```

---

## API Requirements

```
# Formula Availability
GET  /api/v1/formula/availability?lat={lat}&lng={lng}&radius={miles}
GET  /api/v1/formula/availability/store/{storeId}
GET  /api/v1/formula/availability/product/{upc}?lat={lat}&lng={lng}

# Formula Search
POST /api/v1/formula/search
  Body: {
    upcs: string[],
    lat: number,
    lng: number,
    radiusMiles: number,
    includeAlternatives: boolean
  }

# Formula Alerts
POST /api/v1/formula/alerts
GET  /api/v1/formula/alerts
PUT  /api/v1/formula/alerts/{alertId}
DELETE /api/v1/formula/alerts/{alertId}

# Crowdsourced Reports
POST /api/v1/formula/sightings
GET  /api/v1/formula/sightings/store/{storeId}

# Shortage Information
GET  /api/v1/formula/shortages?region={region}
GET  /api/v1/formula/alternatives/{upc}
```

---

## Offline Behavior

### What Works Offline:
- View cached formula availability (with staleness warning)
- Queue crowdsourced reports (sync when online)
- View alternative formula information (cached)

### Requires Connectivity:
- Real-time availability search
- Push notifications
- Cross-store search
- Alert subscription management

### Offline Messaging:
```
You're offline

Cached formula data may be outdated.
Connect to internet for current availability.

Last synced: 2 hours ago

[Retry Connection]
```

---

## Accessibility Requirements

- Screen readers announce availability status clearly
- Color-blind safe status indicators (use icons + text, not just color)
- Large touch targets for "Get Directions" and "Call Store"
- Voice search support for formula finder
- High contrast mode support

---

## Notification Design

### Push Notification Templates:

**Restock Alert:**
```
🍼 Formula Available!
[Formula name] is in stock at [Store] ([distance])
Tap to get directions
```

**Shortage Alert:**
```
⚠️ Formula Shortage Alert
[Formula name] is currently hard to find in your area.
Tap for alternatives and help.
```

**Shortage Improving:**
```
✓ Shortage Easing
[Formula name] is becoming more available.
Found at [X] stores in your area.
```

---

## Metrics

Track these to measure feature success:

1. **Families Connected to Formula** - Users who found formula via app
2. **Average Time to Find Formula** - From search to store arrival
3. **Restock Alert Response Rate** - Users who went to store after alert
4. **Crowdsourced Report Accuracy** - Verified vs false reports
5. **Shortage Early Warning** - How early shortages are detected
