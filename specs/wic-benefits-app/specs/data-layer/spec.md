# Data Layer Specification

## Purpose

Define the foundational data layer that powers all app features: State APL (Approved Product List) databases, product information, and WIC-authorized store data. This data must be accurate, fresh, and available offline.

---

## Requirements

### Requirement: State APL Database

The system SHALL maintain current APL data for all supported states.

#### Scenario: APL data coverage
- GIVEN the app supports multiple states
- WHEN APL data is loaded
- THEN data is available for priority states:
  - Michigan (FIS processor)
  - North Carolina (Conduent processor)
  - Florida (FIS processor)
  - Oregon (State-specific)
- AND each state's APL includes:
  - All WIC-eligible UPCs
  - Product category classifications
  - Size restrictions
  - Brand restrictions
  - Participant type restrictions
  - Effective dates

#### Scenario: APL data freshness
- GIVEN APL lists change periodically
- WHEN checking data freshness
- THEN APL data is updated:
  - Daily sync for changes
  - Full refresh weekly
  - Emergency updates within 4 hours
- AND last sync timestamp is tracked
- AND stale data (>7 days) triggers warning

#### Scenario: APL data ingestion (FIS states)
- GIVEN Michigan and Florida use FIS processor
- WHEN ingesting FIS APL data
- THEN parser handles FIS data format:
  - Download from FIS portal/API
  - Parse CSV/XML format
  - Map to internal schema
  - Validate completeness
  - Store with state identifier

#### Scenario: APL data ingestion (Conduent states)
- GIVEN North Carolina uses Conduent processor
- WHEN ingesting Conduent APL data
- THEN parser handles Conduent format:
  - Different field names than FIS
  - Different category codes
  - Map to unified internal schema

#### Scenario: APL data ingestion (State-specific)
- GIVEN Oregon has state-specific system
- WHEN ingesting Oregon APL data
- THEN custom parser handles Oregon format
- AND fallback to manual data entry if needed

#### Scenario: APL eligibility lookup
- GIVEN user scans a UPC
- WHEN checking eligibility
- THEN lookup returns:
  ```typescript
  {
    upc: "012345678901",
    state: "MI",
    eligible: true,
    benefitCategory: "Milk - Whole",
    participantTypes: ["child_under_2", "infant"],
    sizeRestriction: {
      minOz: 128,
      maxOz: 128,
      unit: "fl oz"
    },
    brandRestriction: null,  // Any brand allowed
    effectiveDate: "2024-01-01",
    expirationDate: null,
    notes: null
  }
  ```

---

### Requirement: Product Database

The system SHALL maintain comprehensive product information.

#### Scenario: Product data coverage
- GIVEN millions of products exist
- WHEN building product database
- THEN coverage targets:
  - 95%+ of WIC-eligible UPCs
  - 90%+ of commonly scanned non-WIC products
  - All formula products comprehensively covered
- AND missing products can be added via crowdsourcing

#### Scenario: Product data sources
- WHEN populating product database
- THEN data comes from (priority order):
  1. Open Food Facts (open source database)
  2. UPC Database API
  3. Retailer product feeds (where available)
  4. Manual data entry
  5. Crowdsourced additions
- AND sources are tracked for each product

#### Scenario: Product information stored
- WHEN product is in database
- THEN record includes:
  ```typescript
  {
    upc: "012345678901",
    name: "Great Value Whole Milk",
    brand: "Great Value",
    manufacturer: "Walmart",
    category: ["Dairy", "Milk", "Whole Milk"],
    size: "1",
    sizeUnit: "gal",
    sizeOz: 128,
    imageUrl: "https://...",
    ingredients: "...",
    nutrition: {...},
    allergens: ["milk"],
    dataSource: "open_food_facts",
    lastUpdated: "2024-01-15",
    verified: true
  }
  ```

#### Scenario: Product lookup speed
- GIVEN user scans product
- WHEN lookup is performed
- THEN response time is:
  - Local cache: <50ms
  - API (cache miss): <500ms
- AND slow lookups show loading indicator

#### Scenario: Unknown product handling
- GIVEN product is not in database
- WHEN user scans unknown UPC
- THEN app shows:
  ```
  Product Not Found

  We don't have information for this product.
  This doesn't mean it's not WIC-eligible.

  [Check eligibility anyway]
  [Report product details]
  ```
- AND user can manually enter product info
- AND manual entry is queued for verification

---

### Requirement: Store Database

The system SHALL maintain WIC-authorized retailer data.

#### Scenario: Store data coverage
- GIVEN 50K+ WIC-authorized retailers nationally
- WHEN building store database
- THEN data includes:
  - All WIC-authorized stores in supported states
  - Major chain stores with inventory APIs
  - Independent WIC vendors
- AND coverage is verified against USDA lists

#### Scenario: Store data sources
- WHEN populating store database
- THEN data comes from:
  1. USDA WIC-authorized vendor lists
  2. State WIC agency retailer lists
  3. Retailer chain APIs (Walmart, Kroger, etc.)
  4. Google Places API (for hours, location)
  5. User-submitted corrections
- AND sources are reconciled for accuracy

#### Scenario: Store information stored
- WHEN store is in database
- THEN record includes:
  ```typescript
  {
    id: "store_12345",
    name: "Walmart Supercenter",
    chain: "walmart",
    address: {
      street: "123 Main St",
      city: "Detroit",
      state: "MI",
      zip: "48201"
    },
    location: {
      lat: 42.3314,
      lng: -83.0458
    },
    wicAuthorized: true,
    wicVendorId: "MI-12345",
    phone: "313-555-1234",
    hours: [
      { day: "monday", open: "06:00", close: "23:00" },
      // ...
    ],
    features: {
      hasPharmacy: true,
      hasDeliCounter: true,
      acceptsEbt: true
    },
    inventoryApiAvailable: true,
    lastVerified: "2024-01-10"
  }
  ```

#### Scenario: Store location accuracy
- GIVEN store detection relies on GPS
- WHEN storing location data
- THEN coordinates are accurate to:
  - <50 meters for building location
  - Polygon available for large stores (geofencing)
- AND addresses are geocode-verified

#### Scenario: Store hours accuracy
- GIVEN store hours affect user planning
- WHEN displaying hours
- THEN hours reflect:
  - Regular hours by day
  - Holiday closures
  - Temporary changes (weather, etc.)
- AND stale hours (>30 days) trigger verification

---

### Requirement: Data Synchronization

The system SHALL keep local data synchronized with server.

#### Scenario: Initial data download
- GIVEN new user installs app
- WHEN app is first opened
- THEN essential data is downloaded:
  1. User's state APL (priority)
  2. Common products cache
  3. Nearby stores (based on location)
- AND download shows progress
- AND app is usable after APL downloads

#### Scenario: Incremental sync
- GIVEN user has existing data
- WHEN app syncs
- THEN only changes are downloaded:
  - New/modified APL entries
  - New/modified products
  - Updated store information
- AND sync is efficient (delta updates)

#### Scenario: Background sync
- GIVEN app may be closed during updates
- WHEN significant changes occur
- THEN background fetch updates critical data
- AND user is not interrupted
- AND battery usage is minimized

#### Scenario: Sync frequency
- WHEN determining sync schedule
- THEN sync occurs:
  - On app launch (if >4 hours since last)
  - On significant location change (new state)
  - On manual refresh request
  - On push notification trigger
- AND never more than once per hour automatically

#### Scenario: Sync failure handling
- GIVEN network may be unreliable
- WHEN sync fails
- THEN:
  - Error is logged
  - Retry with exponential backoff
  - User notified only if data is very stale
  - Cached data continues to work

---

### Requirement: Offline Data Access

The system SHALL provide full offline functionality for core features.

#### Scenario: Offline APL access
- GIVEN user is offline
- WHEN scanning products
- THEN APL lookup uses cached data
- AND results show "Last updated: [date]"
- AND stale data (>7 days) shows warning

#### Scenario: Offline product access
- GIVEN user is offline
- WHEN scanning products
- THEN product info uses cached data
- AND most common products are pre-cached
- AND cache miss shows "Product info unavailable offline"

#### Scenario: Offline store access
- GIVEN user is offline
- WHEN viewing stores
- THEN cached nearby stores are shown
- AND hours/inventory data may be stale
- AND search for distant stores unavailable

#### Scenario: Cache size management
- GIVEN device storage is limited
- WHEN managing cache
- THEN:
  - Total cache target: <100MB
  - APL data: ~20MB (per state)
  - Products: ~30MB (common products)
  - Stores: ~10MB (nearby stores)
  - Images: ~40MB (product images)
- AND LRU eviction for least-used data
- AND user can clear cache in settings

---

### Requirement: Data Quality

The system SHALL maintain high data quality.

#### Scenario: APL validation
- WHEN ingesting APL data
- THEN validation checks:
  - UPC format valid (12 digits)
  - Required fields present
  - Category codes recognized
  - Dates are valid
  - No duplicate entries
- AND invalid entries are flagged for review

#### Scenario: Product deduplication
- GIVEN same product may come from multiple sources
- WHEN merging product data
- THEN UPC is primary key
- AND data is merged preferring:
  1. Most recent update
  2. Most complete record
  3. Verified sources over unverified
- AND duplicates are consolidated

#### Scenario: Store verification
- GIVEN store data may become outdated
- WHEN store hasn't been verified in 90 days
- THEN:
  - Flag for re-verification
  - Check against authoritative sources
  - Crowdsource user confirmations
- AND closed stores are marked inactive

#### Scenario: User-reported corrections
- GIVEN users may find data errors
- WHEN user reports correction
- THEN:
  - Report is logged with evidence
  - Multiple reports trigger review
  - Corrections applied within 48 hours
  - User is thanked for contribution

---

## Data Models

### APL Entry Schema

```typescript
interface APLEntry {
  id: string;
  state: string;
  upc: string;
  eligible: boolean;
  benefitCategory: string;
  benefitSubcategory?: string;
  participantTypes?: ParticipantType[];
  sizeRestriction?: SizeRestriction;
  brandRestriction?: BrandRestriction;
  effectiveDate: Date;
  expirationDate?: Date;
  notes?: string;
  dataSource: 'fis' | 'conduent' | 'state' | 'manual';
  lastUpdated: Date;
  verified: boolean;
}

type ParticipantType =
  | 'pregnant'
  | 'postpartum'
  | 'breastfeeding'
  | 'infant_0_5'
  | 'infant_6_11'
  | 'child_1_2'
  | 'child_2_5';

interface SizeRestriction {
  minSize?: number;
  maxSize?: number;
  exactSize?: number;
  unit: string;
}

interface BrandRestriction {
  allowedBrands?: string[];
  excludedBrands?: string[];
  contractBrand?: string;  // For formula
}
```

### Product Schema

```typescript
interface Product {
  upc: string;
  name: string;
  brand: string;
  manufacturer?: string;
  category: string[];
  size: string;
  sizeUnit: string;
  sizeOz?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  ingredients?: string;
  nutrition?: NutritionInfo;
  allergens?: string[];
  isOrganic?: boolean;
  isGeneric?: boolean;
  dataSource: DataSource;
  lastUpdated: Date;
  verified: boolean;
  verifiedBy?: string;
}

interface NutritionInfo {
  servingSize: string;
  calories?: number;
  totalFat?: number;
  sodium?: number;
  totalCarbs?: number;
  sugars?: number;
  protein?: number;
  // ... other nutrition facts
}

type DataSource =
  | 'open_food_facts'
  | 'upc_database'
  | 'retailer_feed'
  | 'manual'
  | 'crowdsourced';
```

### Store Schema

```typescript
interface Store {
  id: string;
  externalId?: string;  // WIC vendor ID
  name: string;
  chain?: string;
  chainId?: string;
  address: Address;
  location: GeoPoint;
  wicAuthorized: boolean;
  wicVendorId?: string;
  phone?: string;
  hours: OperatingHours[];
  holidayHours?: HolidayHours[];
  timezone: string;
  features: StoreFeatures;
  inventoryApiAvailable: boolean;
  inventoryApiType?: 'walmart' | 'kroger' | 'target' | 'scrape';
  wifiNetworks?: WiFiNetwork[];
  beacons?: Beacon[];
  lastVerified: Date;
  dataSource: StoreDataSource;
  active: boolean;
}

interface Address {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface GeoPoint {
  lat: number;
  lng: number;
}

interface OperatingHours {
  day: DayOfWeek;
  open: string;  // "HH:MM"
  close: string;
  open24Hours?: boolean;
  closed?: boolean;
}

interface StoreFeatures {
  hasPharmacy?: boolean;
  hasDeliCounter?: boolean;
  hasBakery?: boolean;
  acceptsEbt?: boolean;
  acceptsWic?: boolean;
  hasWicKiosk?: boolean;
  parkingAvailable?: boolean;
  wheelchairAccessible?: boolean;
}

type StoreDataSource =
  | 'usda_wic'
  | 'state_wic'
  | 'retailer_api'
  | 'google_places'
  | 'manual'
  | 'crowdsourced';
```

---

## API Requirements

```
# APL Data
GET  /api/v1/apl/{state}
GET  /api/v1/apl/{state}/updates?since={timestamp}
GET  /api/v1/apl/{state}/upc/{upc}

# Product Data
GET  /api/v1/products/{upc}
POST /api/v1/products/batch
  Body: { upcs: string[] }
GET  /api/v1/products/search?q={query}
POST /api/v1/products/report
  Body: { upc, correction, evidence }

# Store Data
GET  /api/v1/stores?lat={lat}&lng={lng}&radius={miles}
GET  /api/v1/stores/{storeId}
GET  /api/v1/stores/updates?since={timestamp}
POST /api/v1/stores/report
  Body: { storeId, correction, evidence }

# Sync
GET  /api/v1/sync/status
POST /api/v1/sync/check
  Body: { aplVersion, productVersion, storeVersion }
  Response: { needsSync: boolean, changes: {...} }
```

---

## Caching Strategy

### Cache Layers

1. **SQLite (Device)** - Primary offline storage
2. **Redis (Server)** - Hot data cache
3. **CDN** - Static product images

### Cache TTLs

| Data Type | Device Cache | Server Cache |
|-----------|--------------|--------------|
| APL Entry | 7 days | 24 hours |
| Product | 30 days | 7 days |
| Store | 7 days | 24 hours |
| Inventory | 1 hour | 5 minutes |
| Images | 90 days | 30 days |

### Cache Invalidation

- APL: On state sync or push notification
- Products: On access if stale
- Stores: On proximity or manual refresh
- Inventory: On store entry or manual refresh

---

## Data Pipeline Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Data Sources                        │
├──────────┬──────────┬───────────┬───────────┬──────────┤
│ FIS APL  │ Conduent │ Open Food │ USDA WIC  │ Retailer │
│  Portal  │   API    │   Facts   │  Vendors  │   APIs   │
└────┬─────┴────┬─────┴─────┬─────┴─────┬─────┴────┬─────┘
     │          │           │           │          │
     ▼          ▼           ▼           ▼          ▼
┌─────────────────────────────────────────────────────────┐
│                    Ingestion Workers                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │APL Sync │ │Product  │ │ Store   │ │Inventory│       │
│  │ Worker  │ │ Worker  │ │ Worker  │ │ Worker  │       │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │
└───────┼──────────┼──────────┼──────────┼───────────────┘
        │          │          │          │
        ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────┐
│                    Message Queue                        │
│                   (RabbitMQ/SQS)                        │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Processing Layer                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │Validation│ │ Merge &  │ │Indexing  │                │
│  │  Worker  │ │ Dedupe   │ │ Worker   │                │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘                │
└───────┼────────────┼────────────┼──────────────────────┘
        │            │            │
        ▼            ▼            ▼
┌─────────────────────────────────────────────────────────┐
│                     Data Stores                         │
├─────────────────────┬───────────────────────────────────┤
│     PostgreSQL      │           Redis                   │
│   (Primary Store)   │       (Hot Cache)                 │
└─────────────────────┴───────────────────────────────────┘
```

---

## Monitoring Requirements

- Data freshness alerts (APL >24h stale)
- Ingestion failure alerts
- Cache hit rate monitoring
- API response time tracking
- Data quality metrics (validation failure rate)
