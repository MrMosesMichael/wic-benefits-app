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

### Core Entities

```typescript
// Product
interface Product {
  upc: string;
  name: string;
  brand: string;
  category: string[];
  size: string;
  sizeUnit: string;
  imageUrl?: string;
}

// State APL Entry
interface APLEntry {
  state: string;
  upc: string;
  eligible: boolean;
  benefitCategory: string;
  participantTypes?: string[];
  sizeRestrictions?: SizeRestriction[];
  effectiveDate: Date;
  expirationDate?: Date;
}

// Store
interface Store {
  id: string;
  name: string;
  chain?: string;
  address: Address;
  location: GeoPoint;
  wicAuthorized: boolean;
  wicVendorId?: string;
  hours: OperatingHours[];
}

// Inventory
interface Inventory {
  storeId: string;
  upc: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
  quantity?: number;
  aisle?: string;
  lastUpdated: Date;
  source: 'api' | 'scrape' | 'crowdsourced';
  confidence: number;
}

// User Benefits
interface Benefits {
  participantId: string;
  participantType: 'pregnant' | 'postpartum' | 'breastfeeding' | 'infant' | 'child';
  periodStart: Date;
  periodEnd: Date;
  categories: BenefitCategory[];
}

interface BenefitCategory {
  name: string;
  allocated: number;
  remaining: number;
  unit: string;
  lastUpdated: Date;
}
```

## API Design

### RESTful Endpoints

```
# Products & Eligibility
GET  /api/v1/products/{upc}
GET  /api/v1/products/{upc}/eligibility?state={state}
GET  /api/v1/products?category={category}&state={state}
POST /api/v1/products/scan  (batch lookup)

# Stores
GET  /api/v1/stores?lat={lat}&lng={lng}&radius={radius}
GET  /api/v1/stores/{storeId}
GET  /api/v1/stores/{storeId}/inventory

# Benefits
GET  /api/v1/benefits
POST /api/v1/benefits/link  (eWIC linking)
POST /api/v1/benefits/manual
GET  /api/v1/benefits/history

# Inventory
GET  /api/v1/inventory/{storeId}
GET  /api/v1/inventory/{storeId}/product/{upc}
POST /api/v1/inventory/report  (crowdsourced)

# Tips & Community
GET  /api/v1/tips?category={category}
POST /api/v1/tips
POST /api/v1/tips/{tipId}/upvote

# Food Banks
GET  /api/v1/foodbanks?lat={lat}&lng={lng}&radius={radius}
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
