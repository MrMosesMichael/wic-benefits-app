# WIC Benefits Assistant - Technical Design

## Architecture Overview

### Client Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Native App                      │
├─────────────────────────────────────────────────────────┤
│  UI Layer                                                │
│  ├── Screens (Scanner, Benefits, Store, Catalog, etc.)  │
│  ├── Components (ProductCard, StockIndicator, etc.)     │
│  └── Navigation (React Navigation)                       │
├─────────────────────────────────────────────────────────┤
│  State Management                                        │
│  ├── Redux Toolkit / Zustand                            │
│  ├── React Query (server state)                          │
│  └── Context (user preferences)                          │
├─────────────────────────────────────────────────────────┤
│  Services Layer                                          │
│  ├── API Client (Axios/fetch)                           │
│  ├── Barcode Scanner Service                            │
│  ├── Location Service                                    │
│  ├── Offline Storage (SQLite/WatermelonDB)              │
│  └── Push Notification Service                           │
├─────────────────────────────────────────────────────────┤
│  Native Modules                                          │
│  ├── Camera (vision-camera)                              │
│  ├── Geolocation                                         │
│  └── Biometrics (for eWIC auth)                         │
└─────────────────────────────────────────────────────────┘
```

### Backend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway                           │
│              (AWS API Gateway / Kong)                    │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│  Product  │  │  Benefits │  │  Store    │
│  Service  │  │  Service  │  │  Service  │
└─────┬─────┘  └─────┬─────┘  └─────┬─────┘
      │              │              │
      └──────────────┼──────────────┘
                     │
              ┌──────┴──────┐
              │             │
              ▼             ▼
        ┌──────────┐  ┌──────────┐
        │PostgreSQL│  │  Redis   │
        │ (Primary)│  │ (Cache)  │
        └──────────┘  └──────────┘

┌─────────────────────────────────────────────────────────┐
│                  Data Pipeline                           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ APL Sync    │  │ Inventory   │  │ Store Data  │     │
│  │ Workers     │  │ Scrapers    │  │ Sync        │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          ▼                              │
│                   ┌──────────────┐                      │
│                   │ Message Queue│                      │
│                   │ (SQS/RabbitMQ)                      │
│                   └──────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

## Key Technical Decisions

### 1. Mobile Framework: React Native with Expo

**Decision:** Use React Native with Expo managed workflow

**Rationale:**
- Cross-platform (iOS + Android) from single codebase
- Expo provides streamlined camera and location APIs
- Large ecosystem of community modules
- Faster iteration with Expo Go during development
- Can eject to bare workflow if needed for advanced native features

**Trade-offs:**
- Some advanced native features may require custom modules
- Larger app size than fully native

### 2. Offline-First Architecture

**Decision:** Implement offline-first with local SQLite database

**Rationale:**
- In-store connectivity is unreliable
- Core scanning must work without network
- Better user experience with instant responses
- Background sync when connectivity returns

**Implementation:**
- SQLite for local data (APL cache, scan history)
- Sync queue for pending operations
- Conflict resolution strategy (server wins for APL, merge for user data)

### 3. State Eligibility Rules Engine

**Decision:** Build configurable rules engine for state-specific eligibility

**Rationale:**
- 50+ jurisdictions with varying rules
- Rules change frequently
- Need to support complex conditions (size, brand, participant type)
- Must work offline

**Implementation:**
```typescript
interface EligibilityRule {
  state: string;
  productCategory: string;
  conditions: Condition[];
  participantTypes?: ParticipantType[];
  effectiveDate: Date;
  expirationDate?: Date;
}

interface Condition {
  field: 'size' | 'brand' | 'sugarContent' | 'wholeGrain' | etc;
  operator: 'eq' | 'gt' | 'lt' | 'in' | 'contains';
  value: string | number | string[];
}
```

### 4. Inventory Data Strategy

**Decision:** Hybrid approach - APIs where available, scraping as fallback, crowdsourced as supplement

**Priority order:**
1. Official retailer APIs (Walmart, Kroger, Target)
2. Web scraping from retailer sites
3. Crowdsourced availability reports

**Data freshness targets:**
- Formula: Real-time or near real-time
- Perishables: Frequently updated
- Shelf-stable: Regularly updated

**Caching strategy:**
- Redis for hot data (current store inventory)
- PostgreSQL for historical/analytical data
- Client-side cache with TTL

### 5. eWIC Integration Approach

**Decision:** Phased integration starting with manual entry

**Phase 1 (MVP):**
- Manual benefits entry
- OCR scanning of benefit statements

**Phase 2:**
- Integration with major eWIC processors
- Real-time balance retrieval

**Rationale:**
- eWIC APIs vary by state and processor
- Partnership negotiations take time
- MVP can launch without blocking on integrations

### 6. Privacy & Security

**Data Classification:**
- **High Sensitivity:** eWIC credentials, benefit balances, transaction history
- **Medium Sensitivity:** Location data, shopping patterns
- **Low Sensitivity:** Product data, store data

**Security Measures:**
- Encryption at rest (SQLite encryption, encrypted cloud storage)
- Encryption in transit (TLS 1.3)
- No PII stored without explicit consent
- Location data not retained long-term
- Biometric authentication for benefits access
- Secure enclave for eWIC credentials

### 7. Push Notification Strategy

**High-Priority Notifications (immediate):**
- Formula availability at nearby stores
- Benefits expiring soon

**Standard Notifications:**
- Weekly benefit summary
- New tips relevant to user

**Implementation:**
- Firebase Cloud Messaging (FCM) for Android
- Apple Push Notification Service (APNS) for iOS
- User-configurable notification preferences

## Data Models

### Type Definitions

```typescript
// Participant types for WIC eligibility
type ParticipantType =
  | 'pregnant'
  | 'postpartum'
  | 'breastfeeding'
  | 'infant'
  | 'child';

// Benefit units (constrained for consistency)
type BenefitUnit =
  | 'gal'
  | 'oz'
  | 'lb'
  | 'doz'
  | 'can'
  | 'box'
  | 'count'
  | 'dollars';

// Data sources for tracking provenance
type DataSource =
  | 'api'
  | 'scrape'
  | 'crowdsourced'
  | 'manual';
```

### Core Entities

```typescript
// Product
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
  dataSource: DataSource;
  lastUpdated: Date;
  verified: boolean;
}

// State APL Entry
interface APLEntry {
  id: string;
  state: string;
  upc: string;
  eligible: boolean;
  benefitCategory: string;
  benefitSubcategory?: string;
  participantTypes?: ParticipantType[];
  sizeRestrictions?: SizeRestriction;
  brandRestriction?: BrandRestriction;
  effectiveDate: Date;
  expirationDate?: Date;
  notes?: string;
  dataSource: 'fis' | 'conduent' | 'state' | 'manual';
  lastUpdated: Date;
}

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

// Store
interface Store {
  id: string;
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
  dataSource: DataSource;
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

interface StoreFeatures {
  hasPharmacy?: boolean;
  hasDeliCounter?: boolean;
  hasBakery?: boolean;
  acceptsEbt?: boolean;
  acceptsWic?: boolean;
  hasWicKiosk?: boolean;
}

// Inventory
interface Inventory {
  storeId: string;
  upc: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
  quantity?: number;
  quantityRange?: 'few' | 'some' | 'plenty';
  aisle?: string;
  lastUpdated: Date;
  source: DataSource;
  confidence: number;  // 0-100
  reportCount?: number;  // For crowdsourced data
}
```

### Household & Participant Entities

```typescript
// Household (contains multiple participants)
interface Household {
  id: string;
  userId: string;
  name?: string;
  participants: Participant[];
  ewicCardLast4?: string;
  primaryState: string;
  createdAt: Date;
  updatedAt: Date;
}

// Participant (individual WIC recipient in household)
interface Participant {
  id: string;
  householdId: string;
  displayName: string;
  participantType: ParticipantType;
  birthDate?: Date;
  benefits: Benefits;
  createdAt: Date;
  updatedAt: Date;
}
```

### Benefits Entities (Three-State Tracking)

```typescript
// Benefits for a participant
interface Benefits {
  id: string;
  participantId: string;
  periodStart: Date;
  periodEnd: Date;
  categories: BenefitCategory[];
  lastSynced: Date;
  syncSource: 'ewic' | 'manual' | 'ocr';
}

// Benefit category with three-state tracking
// States: Available → In Cart → Consumed
interface BenefitCategory {
  id: string;
  benefitId: string;
  name: string;
  allocated: number;      // Total allocated for period
  consumed: number;       // Amount already purchased
  inCart: number;         // Amount reserved in active cart
  // available = allocated - consumed - inCart (computed)
  unit: BenefitUnit;
  lastUpdated: Date;
}
```

### Shopping Cart Entities

```typescript
// Shopping cart session
interface ShoppingCart {
  id: string;
  householdId: string;
  storeId: string;
  storeName: string;
  status: 'active' | 'checking_out' | 'completed' | 'abandoned';
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;  // For timeout warnings
  items: CartItem[];
}

// Individual cart item
interface CartItem {
  id: string;
  cartId: string;
  upc: string;
  productName: string;
  productImage?: string;
  participantId: string;
  participantName: string;
  benefitCategory: string;
  quantity: number;
  unit: BenefitUnit;
  addedAt: Date;
  addedBy?: string;  // For shared household carts
}
```

### Transaction Entities

```typescript
// Completed transaction (checkout)
interface Transaction {
  id: string;
  cartId: string;
  householdId: string;
  storeId: string;
  storeName: string;
  completedAt: Date;
  items: TransactionItem[];
  benefitsConsumed: BenefitConsumption[];
  status: 'completed' | 'voided';
  voidedAt?: Date;
  voidReason?: string;
}

// Transaction line item
interface TransactionItem {
  upc: string;
  productName: string;
  participantId: string;
  participantName: string;
  benefitCategory: string;
  quantity: number;
  unit: BenefitUnit;
}

// Benefit consumption record
interface BenefitConsumption {
  participantId: string;
  category: string;
  amountConsumed: number;
  unit: BenefitUnit;
  balanceBefore: number;
  balanceAfter: number;
}
```

### Food Bank Entity

```typescript
// Food bank / food assistance location
interface FoodBank {
  id: string;
  name: string;
  organizationType: 'food_bank' | 'food_pantry' | 'soup_kitchen' | 'mobile_pantry';
  address: Address;
  location: GeoPoint;
  phone?: string;
  website?: string;
  hours: OperatingHours[];
  services: string[];  // 'pantry', 'hot_meals', 'baby_supplies', etc.
  eligibility?: string;
  acceptsWic: boolean;
  dataSource: 'feeding_america' | '211' | 'local' | 'crowdsourced';
  lastVerified: Date;
  active: boolean;
}
```

### User Preferences Entity

```typescript
// User preferences and settings
interface UserPreferences {
  userId: string;
  language: 'en' | 'es';
  favoriteStores: string[];
  recentStoreIds: string[];
  defaultStoreId?: string;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  accessibility: AccessibilityPreferences;
}

interface NotificationPreferences {
  formulaAlerts: boolean;
  benefitReminders: boolean;
  weeklyDigest: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
}

interface PrivacyPreferences {
  locationConsent: boolean;
  scanHistoryEnabled: boolean;
  analyticsEnabled: boolean;
  localOnlyMode: boolean;
}

interface AccessibilityPreferences {
  highContrast: boolean;
  largeText: boolean;
  screenReaderOptimized: boolean;
}
```

### Formula Alert Entity

```typescript
// Formula availability alert subscription
interface FormulaAlert {
  id: string;
  userId: string;
  formulaUpcs: string[];  // Can watch multiple UPCs
  formulaName: string;    // For display
  maxDistanceMiles: number;
  notificationMethod: 'push' | 'sms' | 'both';
  specificStoreIds?: string[];  // Optional store filter
  active: boolean;
  createdAt: Date;
  expiresAt: Date;
  lastNotifiedAt?: Date;
}

// Formula sighting report (crowdsourced)
interface FormulaSighting {
  id: string;
  upc: string;
  storeId: string;
  reportedBy: string;  // Anonymized user ID
  quantityRange: 'few' | 'some' | 'plenty' | 'none';
  reportedAt: Date;
  location: GeoPoint;
  verified: boolean;
  verifiedAt?: Date;
}

// Regional formula shortage
interface FormulaShortage {
  id: string;
  formulaCategory: string;
  affectedUpcs: string[];
  region: string;  // Geographic area
  severity: 'moderate' | 'severe' | 'critical';
  percentStoresAffected: number;
  detectedAt: Date;
  trend: 'worsening' | 'stable' | 'improving';
  alternativeUpcs: string[];
  updatedAt: Date;
}
```

## API Design

### RESTful Endpoints

```
# Authentication
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/profile
PUT  /api/v1/auth/profile

# Products & Eligibility
GET  /api/v1/products/{upc}
GET  /api/v1/products/{upc}/eligibility?state={state}
GET  /api/v1/products?category={category}&state={state}
POST /api/v1/products/batch  (batch lookup)
GET  /api/v1/products/search?q={query}
POST /api/v1/products/report  (crowdsourced correction)

# APL (State Eligibility)
GET  /api/v1/apl/{state}
GET  /api/v1/apl/{state}/upc/{upc}
GET  /api/v1/apl/{state}/updates?since={timestamp}

# Stores
GET  /api/v1/stores?lat={lat}&lng={lng}&radius={radius}&limit={n}
GET  /api/v1/stores/{storeId}
GET  /api/v1/stores/{storeId}/inventory
POST /api/v1/stores/detect  (with lat/lng, wifi_bssid)
POST /api/v1/stores/compare  (compare multiple stores)
POST /api/v1/stores/rank-by-availability  (rank by benefits match)
POST /api/v1/stores/report  (crowdsourced correction)

# Household & Participants
GET  /api/v1/household
POST /api/v1/household
PUT  /api/v1/household
GET  /api/v1/household/participants
POST /api/v1/household/participants
PUT  /api/v1/household/participants/{id}
DELETE /api/v1/household/participants/{id}

# Benefits
GET  /api/v1/benefits
POST /api/v1/benefits/link  (eWIC linking)
POST /api/v1/benefits/manual
PUT  /api/v1/benefits/{benefitId}
GET  /api/v1/benefits/history

# Shopping Cart
GET  /api/v1/cart
POST /api/v1/cart/items
PUT  /api/v1/cart/items/{itemId}
DELETE /api/v1/cart/items/{itemId}
POST /api/v1/cart/checkout
DELETE /api/v1/cart  (clear cart)
GET  /api/v1/cart/history

# Inventory
GET  /api/v1/inventory/{storeId}?category={cat}&upcs={upc1,upc2}
GET  /api/v1/inventory/{storeId}/product/{upc}
POST /api/v1/inventory/report  (crowdsourced)

# Formula Tracking
GET  /api/v1/formula/availability?lat={lat}&lng={lng}&radius={miles}
GET  /api/v1/formula/availability/store/{storeId}
POST /api/v1/formula/search
GET  /api/v1/formula/shortages?region={region}
GET  /api/v1/formula/alternatives/{upc}
POST /api/v1/formula/sightings  (crowdsourced report)

# Formula Alerts
GET  /api/v1/formula/alerts
POST /api/v1/formula/alerts
PUT  /api/v1/formula/alerts/{alertId}
DELETE /api/v1/formula/alerts/{alertId}

# Food Banks
GET  /api/v1/foodbanks?lat={lat}&lng={lng}&radius={radius}
GET  /api/v1/foodbanks/{id}

# Tips & Community
GET  /api/v1/tips?category={category}
POST /api/v1/tips
POST /api/v1/tips/{tipId}/upvote

# Notifications
POST /api/v1/notifications/device  (register push token)
GET  /api/v1/notifications/preferences
PUT  /api/v1/notifications/preferences

# User Data & Privacy
POST /api/v1/user/data/export
GET  /api/v1/user/data/export/{exportId}
GET  /api/v1/user/data/{category}
DELETE /api/v1/user/data/{category}
DELETE /api/v1/user/account
GET  /api/v1/user/privacy
PUT  /api/v1/user/privacy
GET  /api/v1/user/consent
PUT  /api/v1/user/consent
```

## Scalability Considerations

### Expected Scale

- **Users:** 1M+ (6.2M WIC participants nationally)
- **Products:** 500K+ UPCs
- **Stores:** 50K+ WIC-authorized retailers
- **Daily scans:** 5M+ at scale

### Scaling Strategy

1. **Read-heavy optimization:** CDN for static data, aggressive caching
2. **Geographic distribution:** Regional API deployments
3. **Database sharding:** Shard by state for APL data
4. **Async processing:** Queue-based inventory updates
5. **Rate limiting:** Per-user and per-device limits

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Retailer blocks scraping | Multiple scraping approaches, prioritize API partnerships |
| State APL format varies | Build flexible parser, manual review process |
| eWIC integration delayed | Ship MVP without live balance, add OCR |
| App store rejection | Follow guidelines strictly, prepare appeals |
| Data accuracy issues | Confidence scoring, user feedback loops |
