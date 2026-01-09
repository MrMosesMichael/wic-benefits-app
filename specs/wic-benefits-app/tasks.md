# WIC Benefits Assistant - Implementation Tasks

## Phase 1: Foundation & Core Infrastructure

### 1.1 Project Setup
- [ ] 1.1.1 Initialize React Native project with Expo
- [ ] 1.1.2 Configure TypeScript and linting
- [ ] 1.1.3 Set up project structure (features, components, services)
- [ ] 1.1.4 Configure CI/CD pipeline
- [ ] 1.1.5 Set up development, staging, and production environments

### 1.2 Backend Infrastructure
- [ ] 1.2.1 Design database schema (PostgreSQL)
- [ ] 1.2.2 Set up API framework (Node.js/Express or similar)
- [ ] 1.2.3 Implement authentication service
- [ ] 1.2.4 Configure cloud hosting (AWS/GCP)
- [ ] 1.2.5 Set up logging, monitoring, and alerting

### 1.3 Data Pipeline Foundation
- [ ] 1.3.1 Design data ingestion architecture
- [ ] 1.3.2 Set up message queue for async processing
- [ ] 1.3.3 Create data validation and transformation layer
- [ ] 1.3.4 Implement caching layer (Redis)

---

## Phase 2: UPC Scanner (MVP Feature)

### 2.1 Barcode Scanning
- [ ] 2.1.1 Integrate barcode scanning library (react-native-camera or vision-camera)
- [ ] 2.1.2 Implement UPC-A barcode detection
- [ ] 2.1.3 Implement UPC-E barcode detection and expansion
- [ ] 2.1.4 Implement EAN-13 barcode detection
- [ ] 2.1.5 Build manual UPC entry fallback UI
- [ ] 2.1.6 Add haptic and audio feedback on successful scan

### 2.2 UPC Database
- [ ] 2.2.1 Source UPC-to-product mapping database
- [ ] 2.2.2 Design product data schema
- [ ] 2.2.3 Build product lookup API endpoint
- [ ] 2.2.4 Implement product image storage/CDN
- [ ] 2.2.5 Create weekly UPC database sync job

### 2.3 State APL (Approved Product List) Data - Priority States: MI, NC, FL, OR
- [ ] 2.3.1 Research data sources for priority states (Michigan, North Carolina, Florida, Oregon)
- [ ] 2.3.2 Build APL data ingestion for Michigan (FIS processor)
- [ ] 2.3.3 Build APL data ingestion for North Carolina (Conduent processor)
- [ ] 2.3.4 Build APL data ingestion for Florida (FIS processor)
- [ ] 2.3.5 Build APL data ingestion for Oregon (state-specific system)
- [ ] 2.3.6 Design state eligibility rules engine
- [ ] 2.3.7 Implement state-specific eligibility lookup
- [ ] 2.3.8 Create APL update monitoring and sync
- [ ] 2.3.9 Research data sources for remaining states + DC + territories
- [ ] 2.3.10 Expand APL coverage to all states (phased rollout)

### 2.4 Eligibility Results UI
- [ ] 2.4.1 Design eligibility result screen (eligible/not eligible/unknown)
- [ ] 2.4.2 Implement result animations and visual feedback
- [ ] 2.4.3 Build product detail display
- [ ] 2.4.4 Add "suggest alternative" functionality
- [ ] 2.4.5 Implement scan history storage and display

### 2.5 Offline Scanning
- [ ] 2.5.1 Implement local APL data caching (SQLite)
- [ ] 2.5.2 Build offline eligibility lookup
- [ ] 2.5.3 Create sync queue for offline scans
- [ ] 2.5.4 Add data freshness indicators
- [ ] 2.5.5 Implement background APL sync

---

## Phase 3: Benefits Balance & Household Management

### 3.1 Household Data Model
- [ ] 3.1.1 Design household data schema (household → participants → benefits)
- [ ] 3.1.2 Implement household creation and management
- [ ] 3.1.3 Build participant CRUD (add, edit, remove participants)
- [ ] 3.1.4 Implement participant types (pregnant, postpartum, breastfeeding, infant, child)
- [ ] 3.1.5 Add infant/child age tracking and stage transitions
- [ ] 3.1.6 Create benefit category definitions per state per participant type

### 3.2 Benefits Data Model
- [ ] 3.2.1 Design benefits data schema with three-state tracking (Available, In Cart, Consumed)
- [ ] 3.2.2 Build benefits calculation engine
- [ ] 3.2.3 Implement benefit reservation system (move to "In Cart" state)
- [ ] 3.2.4 Implement benefit release (return from "In Cart" to "Available")
- [ ] 3.2.5 Implement benefit consumption (move to "Consumed" on checkout)

### 3.3 eWIC Integration - Priority States: MI, NC, FL, OR
- [ ] 3.3.1 Research eWIC processor APIs for Michigan (FIS)
- [ ] 3.3.2 Research eWIC processor APIs for North Carolina (Conduent)
- [ ] 3.3.3 Research eWIC processor APIs for Florida (FIS)
- [ ] 3.3.4 Research eWIC processor APIs for Oregon (state-specific)
- [ ] 3.3.5 Implement eWIC card linking flow
- [ ] 3.3.6 Build real-time balance retrieval
- [ ] 3.3.7 Handle authentication and token refresh
- [ ] 3.3.8 Implement transaction history display

### 3.4 Manual Benefits Entry
- [ ] 3.4.1 Build manual benefits entry UI
- [ ] 3.4.2 Implement purchase logging to decrement balances
- [ ] 3.4.3 Create OCR benefit statement scanning
- [ ] 3.4.4 Add benefit period management

### 3.5 Household & Benefits UI (Hybrid View)
- [ ] 3.5.1 Design unified household benefits overview screen
- [ ] 3.5.2 Build participant section cards with individual benefits
- [ ] 3.5.3 Implement participant filter chips for quick filtering
- [ ] 3.5.4 Build shared category grouping (e.g., "Milk - Maria + Diego: 7 gal total")
- [ ] 3.5.5 Implement three-state visual progress bars (Consumed | In Cart | Available)
- [ ] 3.5.6 Add color coding: gray=consumed, amber=in cart, green=available
- [ ] 3.5.7 Build category breakdown views with state indicators
- [ ] 3.5.8 Create expiration alerts and notifications
- [ ] 3.5.9 Add "In Cart" summary banner on benefits screen

---

## Phase 4: Store Detection

### 4.1 Store Database
- [ ] 4.1.1 Source WIC-authorized retailer data by state
- [ ] 4.1.2 Build store data ingestion pipeline
- [ ] 4.1.3 Integrate with Google Places / Apple Maps for enrichment
- [ ] 4.1.4 Create store search API
- [ ] 4.1.5 Implement monthly store database refresh

### 4.2 Location Detection
- [ ] 4.2.1 Implement GPS-based store detection
- [ ] 4.2.2 Build geofence matching logic
- [ ] 4.2.3 Add WiFi-based location hints
- [ ] 4.2.4 Create store confirmation UX
- [ ] 4.2.5 Implement location permission handling

### 4.3 Store Selection
- [ ] 4.3.1 Build store search UI
- [ ] 4.3.2 Implement favorites and recent stores
- [ ] 4.3.3 Create "set as my store" functionality
- [ ] 4.3.4 Add store detail view with hours, contact info

---

## Phase 5: Store Inventory

### 5.1 Inventory Data Integrations
- [ ] 5.1.1 Research and document retailer API availability
- [ ] 5.1.2 Implement Walmart inventory API integration
- [ ] 5.1.3 Implement Kroger inventory API integration
- [ ] 5.1.4 Build web scraping fallback for non-API retailers
- [ ] 5.1.5 Create inventory data normalization layer

### 5.2 Inventory Sync
- [ ] 5.2.1 Design inventory sync scheduler
- [ ] 5.2.2 Implement periodic inventory refresh jobs
- [ ] 5.2.3 Build real-time webhook handlers (where available)
- [ ] 5.2.4 Create inventory caching with TTL
- [ ] 5.2.5 Implement user-triggered inventory refresh

### 5.3 Crowdsourced Inventory
- [ ] 5.3.1 Design crowdsourced availability data model
- [ ] 5.3.2 Implement "I found this" reporting
- [ ] 5.3.3 Build availability confidence scoring
- [ ] 5.3.4 Create "recently seen" indicators

### 5.4 Inventory Display
- [ ] 5.4.1 Build stock status indicators (in stock, low, out)
- [ ] 5.4.2 Implement data freshness display
- [ ] 5.4.3 Create alternative product suggestions
- [ ] 5.4.4 Add "check nearby stores" functionality

### 5.5 Infant Formula Tracking
- [ ] 5.5.1 Implement enhanced formula availability tracking
- [ ] 5.5.2 Build formula shortage detection
- [ ] 5.5.3 Create formula restock push notifications
- [ ] 5.5.4 Add cross-store formula search
- [ ] 5.5.5 List alternative formula sources

---

## Phase 6: Product Catalog

### 6.1 Category Structure
- [ ] 6.1.1 Define category hierarchy data model
- [ ] 6.1.2 Build category navigation UI
- [ ] 6.1.3 Implement subcategory views (Dairy > Milk > Types)
- [ ] 6.1.4 Create state-specific category filtering

### 6.2 Product Browsing
- [ ] 6.2.1 Build product list views with images
- [ ] 6.2.2 Implement product filtering (in stock, brand, etc.)
- [ ] 6.2.3 Create product detail screen
- [ ] 6.2.4 Add product search functionality
- [ ] 6.2.5 Integrate availability data in listings

### 6.3 Shopping Cart with Benefit Queue Tracking
- [ ] 6.3.1 Design shopping cart data model (cart session, items, participant assignment)
- [ ] 6.3.2 Build cart overview UI grouped by participant
- [ ] 6.3.3 Implement add to cart from scan results
- [ ] 6.3.4 Build multi-participant selection modal (when item eligible for multiple)
- [ ] 6.3.5 Implement quantity selector with benefit limit enforcement
- [ ] 6.3.6 Build cart item management (remove, edit quantity, change participant)
- [ ] 6.3.7 Implement "In Cart" status indicators (amber color, cart icon, pending label)
- [ ] 6.3.8 Build benefit impact summary in cart view
- [ ] 6.3.9 Create clear cart functionality with confirmation
- [ ] 6.3.10 Implement cart badge on navigation

### 6.4 Checkout Flow
- [ ] 6.4.1 Build checkout summary screen
- [ ] 6.4.2 Implement checkout confirmation with benefit consumption warning
- [ ] 6.4.3 Build post-checkout benefit update logic
- [ ] 6.4.4 Create transaction logging
- [ ] 6.4.5 Implement partial checkout (select which items were purchased)
- [ ] 6.4.6 Build success screen with updated benefit balances
- [ ] 6.4.7 Implement undo recent transaction (within 30 min)

### 6.5 Cart Session Management
- [ ] 6.5.1 Implement cart persistence across app sessions
- [ ] 6.5.2 Build cart timeout warning (4+ hours stale)
- [ ] 6.5.3 Handle store change with active cart
- [ ] 6.5.4 Handle new benefit period with active cart
- [ ] 6.5.5 Implement transaction history view
- [ ] 6.5.6 Build transaction detail screen

### 6.6 Scan-to-Cart Integration
- [ ] 6.6.1 Add "Add to Cart" button on eligible scan results
- [ ] 6.6.2 Show remaining benefits on scan result
- [ ] 6.6.3 Handle scan of product already in cart
- [ ] 6.6.4 Implement "insufficient benefits" warning on scan
- [ ] 6.6.5 Build quick scan mode (auto-add on scan)
- [ ] 6.6.6 Add undo toast for quick scan additions

---

## Phase 7: Store Finder

### 7.1 Nearby Store Search
- [ ] 7.1.1 Build store finder UI
- [ ] 7.1.2 Implement distance-based search
- [ ] 7.1.3 Create map view with store pins
- [ ] 7.1.4 Add store type filtering

### 7.2 Availability Ranking
- [ ] 7.2.1 Implement store availability scoring
- [ ] 7.2.2 Build "best availability" sort
- [ ] 7.2.3 Create store comparison view
- [ ] 7.2.4 Add category-specific availability filter

### 7.3 Food Bank Finder
- [ ] 7.3.1 Source food bank data (Feeding America, 211)
- [ ] 7.3.2 Build food bank search API
- [ ] 7.3.3 Create food bank listing UI
- [ ] 7.3.4 Add food bank detail view
- [ ] 7.3.5 Implement "open now" and service filters

### 7.4 Navigation Integration
- [ ] 7.4.1 Implement deep links to Maps apps
- [ ] 7.4.2 Add directions from current location

---

## Phase 8: In-Store Navigation

### 8.1 Product Location Data
- [ ] 8.1.1 Source retailer aisle mapping data
- [ ] 8.1.2 Build aisle lookup API
- [ ] 8.1.3 Implement crowdsourced location reporting
- [ ] 8.1.4 Create location confidence scoring

### 8.2 Store Maps
- [ ] 8.2.1 Source store layout data for major chains
- [ ] 8.2.2 Build store map display component
- [ ] 8.2.3 Implement product highlighting on map
- [ ] 8.2.4 Add department-level fallback display

### 8.3 Route Optimization
- [ ] 8.3.1 Implement shopping list route optimization
- [ ] 8.3.2 Build step-by-step navigation UI
- [ ] 8.3.3 Add accessibility route options

---

## Phase 9: Tips & Community

### 9.1 Official Tips Content
- [ ] 9.1.1 Create tips content management system
- [ ] 9.1.2 Write initial tips content (50+ tips)
- [ ] 9.1.3 Build tips browsing UI
- [ ] 9.1.4 Implement personalized tip recommendations

### 9.2 Community Features
- [ ] 9.2.1 Design community data model
- [ ] 9.2.2 Build tip submission flow
- [ ] 9.2.3 Implement upvoting and commenting
- [ ] 9.2.4 Create moderation tools and workflows
- [ ] 9.2.5 Add content reporting functionality

### 9.3 Store Reviews
- [ ] 9.3.1 Build store review submission
- [ ] 9.3.2 Implement review display
- [ ] 9.3.3 Create rating aggregation

### 9.4 Recipes
- [ ] 9.4.1 Source WIC-friendly recipes
- [ ] 9.4.2 Build recipe browsing UI
- [ ] 9.4.3 Implement recipe-to-shopping-list conversion
- [ ] 9.4.4 Add recipe filtering by available benefits

---

## Phase 10: Help & FAQ

### 10.1 FAQ Content System
- [ ] 10.1.1 Design FAQ data model (categories, questions, keywords)
- [ ] 10.1.2 Build FAQ content management system
- [ ] 10.1.3 Create FAQ browsing UI with categories
- [ ] 10.1.4 Implement FAQ search functionality
- [ ] 10.1.5 Build contextual FAQ (show relevant FAQs per screen)

### 10.2 WIC Rules FAQ Content
- [ ] 10.2.1 Write size requirements FAQ (exact oz/sizes matter)
- [ ] 10.2.2 Write formula-specific FAQ (contract brands, exact sizes, forms)
- [ ] 10.2.3 Write brand restrictions FAQ (approved vs non-approved)
- [ ] 10.2.4 Write package vs unit size FAQ
- [ ] 10.2.5 Write state-specific content for MI, NC, FL, OR

### 10.3 Benefits & Shopping FAQ Content
- [ ] 10.3.1 Write benefits period FAQ (expiration, no rollover)
- [ ] 10.3.2 Write participant categories FAQ (pregnant, infant, child)
- [ ] 10.3.3 Write checkout process FAQ (WIC checkout at register)
- [ ] 10.3.4 Write "item rejected" troubleshooting FAQ
- [ ] 10.3.5 Write "In Cart vs Purchased" explanation FAQ

### 10.4 App Usage FAQ Content
- [ ] 10.4.1 Write scanning tips FAQ
- [ ] 10.4.2 Write offline mode FAQ
- [ ] 10.4.3 Write cart and checkout FAQ
- [ ] 10.4.4 Write household/participant management FAQ

### 10.5 Contextual Help
- [ ] 10.5.1 Implement info icons with tooltips throughout app
- [ ] 10.5.2 Build first-time feature tooltips
- [ ] 10.5.3 Add "Why was this rejected?" inline help on scan results
- [ ] 10.5.4 Create onboarding help flow for new users

---

## Phase 11: Polish & Launch

### 11.1 Accessibility
- [ ] 11.1.1 Implement VoiceOver/TalkBack support
- [ ] 11.1.2 Add high contrast mode
- [ ] 11.1.3 Test with screen readers
- [ ] 11.1.4 Ensure WCAG 2.1 AA compliance

### 11.2 Localization
- [ ] 11.2.1 Prepare app for translation
- [ ] 11.2.2 Add Spanish language support
- [ ] 11.2.3 Add other high-priority languages

### 11.3 Performance Optimization
- [ ] 11.3.1 Profile and optimize app startup
- [ ] 11.3.2 Optimize image loading and caching
- [ ] 11.3.3 Reduce bundle size
- [ ] 11.3.4 Optimize API response times

### 11.4 Testing & QA
- [ ] 11.4.1 Write unit tests for core logic
- [ ] 11.4.2 Implement integration tests
- [ ] 11.4.3 Perform accessibility testing
- [ ] 11.4.4 Conduct beta testing program
- [ ] 11.4.5 Address beta feedback

### 11.5 App Store Launch
- [ ] 11.5.1 Prepare App Store and Play Store listings
- [ ] 11.5.2 Create screenshots and preview videos
- [ ] 11.5.3 Submit for app review
- [ ] 11.5.4 Plan launch marketing
- [ ] 11.5.5 Set up user support channels
