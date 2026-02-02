# WIC Benefits Assistant - Implementation Tasks

> **Aligned with Roadmap Priorities**
> - [SURVIVAL] = Life-threatening need - highest priority
> - [DIGNITY] = Prevents shame/humiliation
> - [EMPOWERMENT] = Restores agency and control
>
> **Last Synced:** February 2, 2026

---

## Phase 0: URGENT Field Testing Bug Fixes (Jan 2026)

*Branch: `pre-prod-local-testing` - Fix before next field test*

- [x] ✅ BUG-001: Fix "Scan Another Product" button - navigates to home instead of scanner. File: app/app/scanner/result.tsx. Changed to router.replace('/scanner').

- [x] ✅ BUG-002: Fix cart confirmation truncated name - shows "1%" instead of "1% Milk". File: app/app/scanner/result.tsx. Now shows full product name with brand.

- [x] ✅ BUG-003: Fix UPC lookup normalization - Juicy Juice UPC 889497008245 not found despite being in JSON. File: app/lib/services/offlineEligibility.ts. Moved normalizeUpc() before map init and normalize on storage.

---

## Phase 1: Foundation (MVP Core)

*Goal: A user can scan products, understand WIC rules, track benefits, find formula, and use the app in Spanish*

### Group A: Data Foundation [SURVIVAL]

#### Track A1: State APL Database (Priority States: MI, NC, FL, OR)
- [x] ✅ A1.1 Research APL data sources for Michigan, North Carolina, Florida, Oregon
- [x] ✅ A1.2 Design APL data schema (UPC, eligibility, restrictions, participant types)
- [x] ✅ A1.3 Build Michigan APL ingestion (FIS processor)
- [x] ✅ A1.4 Build North Carolina APL ingestion (Conduent processor)
- [x] ✅ A1.5 Build Florida APL ingestion (FIS processor)
- [x] ✅ A1.6 Build Oregon APL ingestion (state-specific)
- [x] ✅ A1.7 Design state eligibility rules engine
- [x] ✅ A1.8 Create APL update monitoring and sync jobs

#### Track A2: Product Database
- [x] ✅ A2.1 Source UPC-to-product database (Open Food Facts, UPC Database API)
- [x] ✅ A2.2 Design product data schema
- [x] ✅ A2.3 Build product lookup API endpoint
- [x] ✅ A2.4 Implement product image storage/CDN
- [x] ✅ A2.5 Create product database sync pipeline
- [x] ✅ A2.6 Target 95%+ coverage of WIC-eligible UPCs

#### Track A3: Store Database
- [x] ✅ A3.1 Source WIC-authorized retailer data by state
- [x] ✅ A3.2 Design store data schema (location, hours, features) [haiku]
- [x] ✅ A3.3 Build store data ingestion pipeline
- [x] ✅ A3.4 Integrate with Google Places for enrichment
- [x] ✅ A3.5 Create store search API

#### Track A4: Formula Critical Features [SURVIVAL]
- [x] ✅ A4.1 Implement formula availability tracking
- [x] ✅ A4.2 Build formula shortage detection algorithm
- [x] ✅ A4.3 Create formula restock push notifications
- [x] ✅ A4.4 Build cross-store formula search (navigation + i18n wired Feb 2)
- [x] ✅ A4.5 Implement alternative formula suggestions (smart matching, WIC priority, medical disclaimer)
- [x] ✅ A4.6 Create crowdsourced formula sighting reports (quick 2-tap flow, location verification)
- [x] ✅ A4.7 Build formula alert subscription system (push notifications, 30-day expiry, batching)

---

### Group B: App Shell + Data Sovereignty

#### Track B1: Project Setup
- [x] ✅ B1.1 Initialize React Native project with Expo (SDK 52)
- [x] ✅ B1.2 Configure TypeScript and linting [haiku]
- [x] ✅ B1.3 Set up project structure (features, components, services) [haiku]
- [x] ✅ B1.4 Configure CI/CD pipeline (GitHub Actions)
- [x] ✅ B1.5 Set up development, staging, production environments

#### Track B2: Backend Infrastructure
- [x] ✅ B2.1 Design database schema (PostgreSQL) [haiku]
- [x] ✅ B2.2 Set up API framework (Node.js/Express)
- [ ] B2.3 Implement authentication service
- [x] ✅ B2.4 Configure cloud hosting (VPS at mdmichael.com)
- [ ] B2.5 Set up Redis caching
- [ ] B2.6 Set up message queue (SQS/RabbitMQ)
- [x] ✅ B2.7 Configure logging, monitoring, alerting

#### Track B4: Deployment Scripts [OPERATIONAL]
- [ ] B4.1 Create backend deployment script (push to VPS at mdmichael.com)
- [ ] B4.2 Create Android APK build script (assembleRelease + output to known location)
- [ ] B4.3 Create iOS IPA build script (for TestFlight distribution)
- [ ] B4.4 Document deployment procedures in README or docs/

#### Track B3: User Data Sovereignty [FOUNDATIONAL RIGHT]
- [ ] B3.1 Implement data export (JSON, CSV, PDF formats)
- [ ] B3.2 Implement account + data deletion with 72-hour timeline
- [ ] B3.3 Build "What data we store" transparency screen
- [ ] B3.4 Implement local-only mode option
- [ ] B3.5 Create privacy policy (protects USERS, not state)
- [ ] B3.6 Implement consent management system
- [ ] B3.7 Build data category viewing (view your scans, transactions, etc.)

---

### Group C: Benefits System [EMPOWERMENT]

#### Track C1: Household & Benefits Data Model
- [x] ✅ C1.1 Design household schema (household → participants → benefits) [haiku]
- [x] ✅ C1.2 Implement household CRUD operations
- [x] ✅ C1.3 Build participant management (add, edit, remove)
- [x] ✅ C1.4 Implement participant types (pregnant, postpartum, breastfeeding, infant, child)
- [x] ✅ C1.5 Add infant/child age tracking and stage transitions
- [x] ✅ C1.6 Implement three-state benefit tracking (Available → In Cart → Consumed)
- [x] ✅ C1.7 Build benefits calculation engine

#### Track C2: Benefits UI
- [x] ✅ C2.1 Design unified household benefits overview screen
- [x] ✅ C2.2 Build participant section cards with individual benefits
- [x] ✅ C2.3 Implement participant filter chips for quick filtering
- [x] ✅ C2.4 Build three-state progress bars (gray/amber/green)
- [x] ✅ C2.5 Create "In Cart" summary banner
- [x] ✅ C2.6 Implement expiration alerts and notifications
- [x] ✅ C2.7 Build benefit category icons (warm, friendly design)

---

### Group D: UPC Scanner [DIGNITY]

*Private eligibility checking - no more asking clerks*

#### Track D1: Barcode Scanning
- [x] ✅ D1.1 Integrate vision-camera library
- [x] ✅ D1.2 Implement UPC-A barcode detection
- [x] ✅ D1.3 Implement UPC-E barcode detection and expansion
- [x] ✅ D1.4 Implement EAN-13 barcode detection
- [x] ✅ D1.5 Build manual UPC entry fallback UI
- [x] ✅ D1.6 Add haptic and audio feedback on successful scan

#### Track D2: Eligibility Lookup
- [x] ✅ D2.1 Build state eligibility rules engine
- [x] ✅ D2.2 Implement eligibility lookup API
- [x] ✅ D2.3 Design scan result UI (eligible/not eligible/unknown)
- [x] ✅ D2.4 Build "suggest alternative" feature
- [x] ✅ D2.5 Implement friendly "Not Eligible" messages

#### Track D3: Scan Modes
- [x] ✅ D3.1 Implement "Check Eligibility" mode (default)
- [x] ✅ D3.2 Implement "Shopping Mode" with cart integration
- [x] ✅ D3.3 Build add-to-cart confirmation dialog
- [x] ✅ D3.4 Add mode toggle and persistence

#### Track D4: Offline Scanning
- [x] ✅ D4.1 Implement local APL data caching (AsyncStorage/JSON bundle)
- [x] ✅ D4.2 Build offline eligibility lookup
- [x] ✅ D4.3 Create sync queue for offline operations
- [x] ✅ D4.4 Add data freshness indicators
- [x] ✅ D4.5 Implement background APL sync

---

### Group E: Shopping Cart [EMPOWERMENT]

#### Track E1: Cart Core
- [x] ✅ E1.1 Design shopping cart data model
- [x] ✅ E1.2 Build cart overview UI grouped by participant
- [x] ✅ E1.3 Implement add-to-cart from scan results
- [x] ✅ E1.4 Build multi-participant selection modal
- [x] ✅ E1.5 Implement quantity selector with benefit limit enforcement
- [x] ✅ E1.6 Build cart item management (remove, edit, change participant)
- [x] ✅ E1.7 Implement "In Cart" status indicators

#### Track E2: Checkout Flow
- [x] ✅ E2.1 Build checkout summary screen
- [x] ✅ E2.2 Implement checkout confirmation with benefit warning
- [x] ✅ E2.3 Build post-checkout benefit update logic (In Cart → Consumed)
- [x] ✅ E2.4 Create transaction logging
- [x] ✅ E2.5 Implement partial checkout (select items purchased)
- [x] ✅ E2.6 Build success screen with updated balances
- [x] ✅ E2.7 Implement undo recent transaction (within 30 min)
- [x] ✅ E2.8 Create checkout celebration message

#### Track E3: Cart Session Management
- [x] ✅ E3.1 Implement cart persistence across app sessions
- [x] ✅ E3.2 Build cart timeout warning (4+ hours stale)
- [x] ✅ E3.3 Handle store change with active cart
- [x] ✅ E3.4 Handle new benefit period with active cart
- [x] ✅ E3.5 Implement transaction history view

---

### Group F: Help & FAQ [DIGNITY]

*Prevents harm BEFORE it happens*

#### Track F1: FAQ System
- [x] ✅ F1.1 Design FAQ data model (categories, questions, keywords) [haiku]
- [x] ✅ F1.2 Build FAQ browsing UI with categories
- [x] ✅ F1.3 Implement FAQ search functionality
- [x] ✅ F1.4 Build contextual FAQ (relevant FAQs per screen)

#### Track F2: WIC Rules FAQ Content [CRITICAL FOR HARM PREVENTION]
- [x] ✅ F2.1 Write formula rules FAQ (contract brands, exact sizes) [haiku]
- [x] ✅ F2.2 Write size requirements FAQ ("12.4oz ≠ 12.5oz") [haiku]
- [x] ✅ F2.3 Write checkout process FAQ (reduces anxiety) [haiku]
- [x] ✅ F2.4 Write brand restrictions FAQ [haiku]
- [x] ✅ F2.5 Write "Why was this rejected?" FAQ [haiku]
- [x] ✅ F2.6 Write participant categories FAQ [haiku]
- [x] ✅ F2.7 Write benefits period FAQ (expiration, no rollover) [haiku]
- [x] ✅ F2.8 Write state-specific content for MI, NC, FL, OR [haiku]

#### Track F3: Contextual Help
- [x] ✅ F3.1 Implement info icons with tooltips throughout app
- [x] ✅ F3.2 Build first-time feature tooltips
- [x] ✅ F3.3 Add "Why was this rejected?" inline help on scan results
- [x] ✅ F3.4 Create onboarding help flow for new users (NeedHelpLink component with deep linking)

---

### Group G: Spanish Language Support [INCLUSION]

*40% of WIC participants are Latinx - language barriers = exclusion*

- [x] ✅ G1 Set up i18n framework (react-i18next)
- [x] ✅ G2 Extract all UI strings to translation files [haiku]
- [x] ✅ G3 Translate all UI strings to Spanish (255 keys complete)
- [x] ✅ G4 Translate FAQ content to Spanish
- [x] ✅ G5 Translate error messages to Spanish
- [x] ✅ G6 Implement language detection and switching
- [ ] G7 Test all screens in Spanish
- [ ] G8 Native speaker review of all translations

---

## Phase 1 Complete Milestone

✅ User can check formula availability across stores (SURVIVAL)
✅ User can scan products and see eligibility privately (DIGNITY)
✅ User can track benefits with three-state system (EMPOWERMENT)
✅ User understands WIC rules before checkout (HARM PREVENTION)
⏳ User can export/delete their data (SOVEREIGNTY) - B3 not started
✅ Spanish-speaking users partially supported (INCLUSION) - G partial

---

## Phase 2: Store Intelligence

*Goal: Know what's in stock, find supplemental food sources*

### Group H: Store Detection
- [x] ✅ H1 Implement GPS-based store detection
- [x] ✅ H2 Build geofence matching logic
- [x] ✅ H3 Add WiFi-based location hints
- [x] ✅ H4 Create store confirmation UX
- [x] ✅ H5 Build manual store selection (search, favorites)
- [x] ✅ H6 Implement location permission handling

### Group I: Store Inventory

#### Track I1: Inventory Integrations
- [x] ✅ I1.1 Research retailer API availability
- [B] ⏸️ I1.2 Implement Walmart inventory API integration (BLOCKED - awaiting API partnership)
- [ ] I1.3 Implement Kroger inventory API integration
- [ ] I1.4 Build web scraping fallback for non-API retailers
- [ ] I1.5 Create inventory data normalization layer

#### Track I2: Inventory Display
- [x] ✅ I2.1 Build stock status indicators (in stock, low, out) - via crowdsourced data
- [x] ✅ I2.2 Implement data freshness display
- [ ] I2.3 Create alternative product suggestions
- [x] ✅ I2.4 Add "check nearby stores" functionality (cross-store search)

### Group J: Food Bank Finder

*WIC benefits alone are insufficient for many families*

- [ ] J1 Source food bank data (Feeding America, 211) [haiku]
- [ ] J2 Build food bank search API
- [ ] J3 Create food bank listing UI
- [ ] J4 Add food bank detail view
- [ ] J5 Implement "open now" and service filters
- [ ] J6 Design de-stigmatizing UI and messaging

### Group K: Crowdsourced Inventory
- [x] ✅ K1 Design crowdsourced availability data model [haiku]
- [x] ✅ K2 Implement "I found this" reporting
- [x] ✅ K3 Build availability confidence scoring (decay over time)
- [x] ✅ K4 Create "recently seen" indicators

---

## Phase 3: Discovery & Navigation

### Group L: Product Catalog
- [ ] L1 Define category hierarchy data model [haiku]
- [ ] L2 Build category navigation UI
- [ ] L3 Implement subcategory views
- [ ] L4 Build product list views with images
- [ ] L5 Implement "Can Buy Now" filter (based on remaining benefits)
- [ ] L6 Add product search functionality

### Group M: Store Finder
- [ ] M1 Build store finder UI
- [ ] M2 Implement distance-based search
- [ ] M3 Create map view with store pins
- [ ] M4 Build "best availability" ranking
- [ ] M5 Implement store comparison view
- [ ] M6 Add directions integration (deep link to Maps)
- [ ] M7 Create "Everything You Need" badge

### Group N: In-Store Navigation (DEFER IF NEEDED)
- [ ] N1 Source retailer aisle mapping data [haiku]
- [ ] N2 Build aisle lookup API
- [ ] N3 Implement crowdsourced location reporting
- [ ] N4 Create department-level fallback display

---

## Phase 4: Community & Advocacy

### Group O: Tips & Community
- [ ] O1 Create tips content management system
- [ ] O2 Write initial tips content (50+ tips) [haiku]
- [ ] O3 Build tips browsing UI
- [ ] O4 Implement personalized tip recommendations
- [ ] O5 Build tip submission flow
- [ ] O6 Implement moderation system
- [ ] O7 Add reactions (Helpful, Saved Money)

### Group P: Advocacy Tools

*Move users from passive recipients to active participants*

- [ ] P1 Build "Report System Failure" feature (APL errors, store issues)
- [ ] P2 Create "Know Your Rights" content [haiku]
- [ ] P3 Add links to local WIC advocacy groups
- [ ] P4 Build policy change notifications ("Comment period open")

### Group Q: Recipes (DEFER IF NEEDED)
- [ ] Q1 Source WIC-friendly recipes [haiku]
- [ ] Q2 Build recipe browsing UI
- [ ] Q3 Implement recipe-to-shopping-list conversion
- [ ] Q4 Add recipe filtering by available benefits

---

## Phase 5: Manual Benefits Entry

*For states without eWIC API integration*

### Group R: Manual Entry Fallback

- [x] ✅ R1.1 Create manual benefits entry screen. File: app/app/benefits/manual-entry.tsx. Build form with category dropdowns (milk, cheese, eggs, etc.), amount input, unit selector, and benefit period date picker.

- [x] ✅ R1.2 Create benefits data model for manual entry. File: backend/src/routes/manual-benefits.ts. Add POST /api/v1/manual-benefits endpoint to save user-entered benefit amounts by category and participant.

- [x] ✅ R1.3 Create migration for manual benefits table. File: backend/migrations/012_manual_benefits.sql. Create table with columns: id, household_id, participant_id, category, amount, unit, benefit_period_start, benefit_period_end, created_at, updated_at.

- [x] ✅ R2.1 Build purchase logging UI. File: app/app/benefits/log-purchase.tsx. Create screen to log purchases that decrement benefits - product selector, quantity, participant selector.

- [x] ✅ R2.2 Implement purchase logging backend. File: backend/src/routes/manual-benefits.ts. Add POST /api/v1/manual-benefits/log-purchase endpoint to record purchase and decrement available balance.

- [x] ✅ R3.1 Add OCR benefit statement scanning. File: app/app/benefits/scan-statement.tsx. Use expo-camera to capture benefit statement photo, send to OCR service to extract benefit amounts.

- [x] ✅ R3.2 Create OCR parsing service. File: backend/src/services/ocr-parser.ts. Parse OCR text output to extract benefit categories and amounts from common WIC statement formats.

- [x] ✅ R4.1 Build benefit period management UI. File: app/app/benefits/period-settings.tsx. Allow users to set benefit period start/end dates, show days remaining, handle period rollover.

- [x] ✅ R5.1 Implement balance discrepancy warnings. File: app/lib/services/benefitValidation.ts. Compare manual balance vs calculated usage, warn if discrepancy exceeds threshold.

---

## Phase 6: eWIC Integration

*Live balance from eWIC card*

### Group S: eWIC APIs (Priority States: MI, NC, FL, OR)

- [ ] S1.1 Research Michigan eWIC API documentation. File: docs/ewic/michigan-api-research.md. Document FIS processor API endpoints, authentication method, data formats, rate limits, and registration requirements. [haiku]

- [ ] S2.1 Research North Carolina eWIC API documentation. File: docs/ewic/north-carolina-api-research.md. Document Conduent processor API endpoints, authentication, data formats for NC WIC program. [haiku]

- [ ] S3.1 Research Florida eWIC API documentation. File: docs/ewic/florida-api-research.md. Document FIS processor API for Florida, note any differences from Michigan FIS implementation. [haiku]

- [ ] S4.1 Research Oregon eWIC API documentation. File: docs/ewic/oregon-api-research.md. Document Oregon's state-specific eWIC system, API access requirements. [haiku]

- [ ] S5.1 Create eWIC card linking UI. File: app/app/settings/link-ewic.tsx. Build screen for users to enter eWIC card number, PIN (if required), and state selection to link their card.

- [ ] S5.2 Create eWIC linking backend. File: backend/src/routes/ewic.ts. Add POST /api/v1/ewic/link endpoint to validate card credentials with state API and store encrypted card reference.

- [ ] S5.3 Create migration for eWIC card storage. File: backend/migrations/013_ewic_cards.sql. Create table with columns: id, household_id, state, card_number_encrypted, card_hash, linked_at, last_sync, status. [haiku]

- [ ] S6.1 Implement balance retrieval service. File: backend/src/services/ewic/balanceService.ts. Create service to fetch current benefits balance from linked eWIC card via state API.

- [ ] S6.2 Create eWIC balance endpoint. File: backend/src/routes/ewic.ts. Add GET /api/v1/ewic/balance endpoint to return current benefits from linked card, with caching to reduce API calls.

- [ ] S6.3 Update benefits screen to show live eWIC data. File: app/app/benefits/index.tsx. When eWIC card is linked, fetch and display live balance instead of manual/mock data.

- [ ] S7.1 Implement eWIC authentication handler. File: backend/src/services/ewic/authService.ts. Handle OAuth or API key auth for each state processor, manage token refresh and expiration.

- [ ] S7.2 Create state-specific API adapters. File: backend/src/services/ewic/adapters/index.ts. Create adapter interface and implementations for FIS (MI, FL), Conduent (NC), and Oregon processors.

- [ ] S8.1 Implement transaction history sync. File: backend/src/services/ewic/transactionService.ts. Fetch recent transactions from eWIC API to show purchase history.

- [ ] S8.2 Create transaction history endpoint. File: backend/src/routes/ewic.ts. Add GET /api/v1/ewic/transactions endpoint to return synced transaction history.

- [ ] S8.3 Build transaction history UI. File: app/app/benefits/transactions.tsx. Display synced eWIC transaction history with date, store, items, amounts.

---

## Phase 7: Polish & Launch

### Group T: Accessibility
- [ ] T1 Implement VoiceOver/TalkBack support
- [ ] T2 Add high contrast mode
- [ ] T3 Ensure WCAG 2.1 AA compliance
- [ ] T4 Test with screen readers
- [ ] T5 Add keyboard navigation support

### Group U: Additional Languages
- [ ] U1 Identify next priority languages (Chinese, Vietnamese, Korean) [haiku]
- [ ] U2 Add language support based on regional demographics

### Group V: Launch
- [ ] V1 Conduct beta testing with WIC participants
- [ ] V2 Prepare App Store and Play Store listings [haiku]
- [ ] V3 Create screenshots and preview videos
- [ ] V4 Submit for app review
- [ ] V5 Set up user support channels
- [ ] V6 Plan launch communications [haiku]

---

## Governance (DECIDE BEFORE LAUNCH)

**This app must be owned by users, not exploited by corporations.**

- [ ] GOV1 Decide: Non-Profit with User Board OR User Cooperative
- [ ] GOV2 Establish 501(c)(3) or cooperative structure
- [ ] GOV3 Form user advisory council
- [ ] GOV4 Finalize open-source license (AGPL recommended) [haiku]
- [ ] GOV5 Create bylaws preventing sale to for-profit entity

---

## Task Count Summary

| Phase | Groups | Total | Done | Remaining |
|-------|--------|-------|------|-----------|
| Phase 0: Bug Fixes | BUG | 3 | 3 | 0 |
| Phase 1: Foundation | A, B, C, D, E, F, G | 99 | 88 | 11 |
| Phase 2: Store Intelligence | H, I, J, K | 21 | 13 | 8 |
| Phase 3: Discovery & Navigation | L, M, N | 17 | 0 | 17 |
| Phase 4: Community & Advocacy | O, P, Q | 15 | 0 | 15 |
| Phase 5: Manual Entry | R | 9 | 9 | 0 |
| Phase 6: eWIC Integration | S | 15 | 0 | 15 |
| Phase 7: Polish & Launch | T, U, V | 13 | 0 | 13 |
| Governance | GOV | 5 | 0 | 5 |
| **Total** | | **197** | **113** | **84** |

---

## Next Up (Priority Order)

1. **B4.1-B4.4** - Deployment scripts (backend + mobile builds)
2. **G7** - Test all screens in Spanish (manual)
3. **G8** - Native speaker review of translations (manual)
4. **B3** - Data sovereignty (pre-launch requirement)
5. **J1-J6** - Food bank finder
