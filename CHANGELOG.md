# WIC Benefits App — Changelog

> Session-by-session progress log. Most recent first.

---

## 2026-02-24 — iOS Defect Fixes + Home Screen Redesign + Polish (v1.7.0)

**Fixed 10 iOS defects from device testing, redesigned home screen with live WIC Balance section, extended KeyboardAvoidingView to all editing screens, and completed Spanish i18n for the balance section.**

### Done
- ✅ D1: Scan mode toggle removed — hardcoded to 'check' mode
- ✅ D2: Add to Cart always shown for eligible items; one-time household setup prompt with remembered preference (`@wic_cart_preference`)
- ✅ D3: Manual entry save implemented — real `loadHousehold`/`saveHousehold` flow with participant selector
- ✅ D4: Unit dropdown filters by category — `CATEGORY_UNITS` map, auto-selects default unit
- ✅ D5: All dropdowns scrollable — `ScrollView` wrappers with maxHeight
- ✅ D6: `KeyboardAvoidingView` in `household-setup.tsx` benefits editing view
- ✅ D7: Period settings now updates AsyncStorage directly (not backend-only API)
- ✅ D8: Auto-save on participant add and benefit save in `household-setup.tsx`
- ✅ D9: Participant header rows tappable → navigate to household setup
- ✅ D10: Empty benefit cards silently filtered on save (no error)
- ✅ UI1: Live WIC Balance section at top of home screen — loads on focus, shows "You have X, Y, and N other items remaining. Use by [date]."
- ✅ UI2–5: Reordered home cards, camera emoji on Scan, View Benefits card removed
- ✅ KAV extended to `manual-entry`, `log-purchase`, `feedback`, `complaint`, `location` screens
- ✅ WIC Balance restyled — text-based with bottom divider, not a card element
- ✅ Balance summary: deduplicates categories across participants, caps at 3 named + "and N other items"
- ✅ WIC Balance section fully translated — `home.balance.*` + all 13 category names + a11y keys in EN + ES
- ✅ Bumped to v1.7.0 (versionCode 12)

### Files Modified
- `app/app/scanner/index.tsx` — D1
- `app/app/scanner/result.tsx` — D2
- `app/app/benefits/manual-entry.tsx` — D3+D4+D5+KAV
- `app/app/benefits/household-setup.tsx` — D6+D8+D10
- `app/app/benefits/period-settings.tsx` — D7
- `app/app/benefits/index.tsx` — D9
- `app/app/benefits/log-purchase.tsx` — KAV
- `app/app/feedback/index.tsx` — KAV
- `app/app/community/complaint.tsx` — KAV
- `app/app/settings/location.tsx` — KAV
- `app/app/index.tsx` — UI1-5, balance restyling, summary logic, i18n
- `app/lib/i18n/translations/en.json` — home.balance.* + a11y.home.balance*
- `app/lib/i18n/translations/es.json` — same keys in Spanish
- `app/app.json` — v1.6.0 → v1.7.0, versionCode 11 → 12

### Commits
```
50b22a7 feat: 10 iOS defect fixes + home screen redesign (v1.7.0)
b921da6 fix: extend KAV to all editing screens + restyle WIC Balance as text
82214b7 fix: WIC Balance summary — deduplicate categories, cap at 3 named items
04f6c57 i18n: Spanish translations for WIC Balance section
```

---

## 2026-02-17 — Spanish i18n Fixes + Brand Filter Chips (v1.6.0)

**Fixed all native-speaker-reported Spanish bugs. Added brand filter chips to Product Catalog with punctuation-normalized brand deduplication.**

### Done
- ✅ Spanish i18n — `household-setup.tsx` fully wired (was 100% hardcoded English)
- ✅ Spanish i18n — formula type chips translated (`cross-store-search.tsx`)
- ✅ Spanish i18n — FAQ category chips translated (`help/index.tsx`)
- ✅ Spanish i18n — "📍 Location Settings" button translated (`index.tsx`)
- ✅ es.json — carrito→carro throughout, `cart.startScanning`→"Escanea productos", `formulaAlerts.alertSetMessage` esté→está
- ✅ Brand filter chips in Product Catalog — top 30 brands per category, auto-fetch on category change
- ✅ Brand normalization — `REGEXP_REPLACE` strips apostrophes/punctuation (Mott's = Motts = MOTT'S)
- ✅ Brand filter hides during search/UPC lookup
- ✅ Bilingual: "All Brands" / "Todas las Marcas"
- ✅ Closed GitHub issues #6, #7, #9, #10
- ✅ Bumped to v1.6.0 (versionCode 11)

### Files Modified
- `app/app/benefits/household-setup.tsx` — full i18n wiring
- `app/app/formula/cross-store-search.tsx` — formula type chips translated
- `app/app/help/index.tsx` — FAQ category chips translated
- `app/app/index.tsx` — Location Settings button translated
- `app/lib/i18n/translations/en.json` — new household/faqCategories/home/catalog keys
- `app/lib/i18n/translations/es.json` — all fixes + new sections
- `app/app/catalog/products.tsx` — brand filter chip row
- `app/lib/services/catalogService.ts` — CatalogBrand type, getBrands(), brand param
- `backend/src/routes/product-catalog.ts` — /brands endpoint, brand filter, punctuation normalization
- `app/app.json` — v1.5.0 → v1.6.0, versionCode 10 → 11

### Commits
```
352478a fix: Spanish i18n — household setup, cart, home, FAQ categories, formula types
3ac93a8 feat: Add brand filter chips to Product Catalog (issue #10)
49d52e3 fix: Normalize brand apostrophes/punctuation in catalog filter
```

---

## 2026-02-17 — MI APL Recovery + v1.5.0 Builds Shipped

**Diagnosed and resolved mass deactivation of 9,396 MI products (since Feb 10). Fixed parser_config brand column bug. v1.5.0 iOS + Android builds submitted.**

### Done
- ✅ Diagnosed: 9,396 MI products wrongly deactivated since Feb 10 — APL sync job ran with partial file, safeguard bypassed
- ✅ Confirmed scanner affected — `eligibility.ts` filters `active = true`; deactivated products returned "not eligible"
- ✅ Discovered MI APL now includes official "Brand Name" column — `enrich-upc.ts` no longer needed for MI
- ✅ Fixed `apl_source_config` parser_config: `"brand": "Brand"` → `"brand": "Brand Name"` (silent NULL mismatch)
- ✅ Fixed in `backend/migrations/019_apl_sync_monitoring.sql` to prevent regression on DB recreate
- ✅ Ran MI APL sync (force) × 2: first to restore 9,396 deactivated products, second to populate brand names
- ✅ Final state: 9,851 active MI products (up from 7,647), 9,851/9,851 branded from official source
- ✅ v1.5.0 iOS build submitted to TestFlight
- ✅ v1.5.0 Android build submitted to Google Play Console

### Files Modified
- `backend/migrations/019_apl_sync_monitoring.sql` — fix MI brand column name

### Commits
```
809af4a fix: MI APL parser_config brand column "Brand" → "Brand Name"
```

---

## 2026-02-17 — Product Catalog Smart Filtering + UPC Search

**Branded-first product browsing + UPC eligibility lookup. Hides ~55% low-quality entries by default, adds instant WIC eligibility check via UPC.**

### Done
- ✅ Backend: `branded=1` query param filters to products with non-empty brand
- ✅ Backend: `totalUnfiltered` count in response for "Show all (N)" display
- ✅ Backend: New `GET /lookup/:upc` endpoint with leading-zero padding fallback
- ✅ Frontend: Default `brandedOnly = true` — hides entries like "Skim", "2%", "Grade A"
- ✅ Frontend: Two-chip toggle ("Branded products" / "Show all")
- ✅ Frontend: UPC detection in search bar (all digits, >= 8 chars → auto-lookup)
- ✅ Frontend: Green "WIC Approved!" / orange "Not found" result banners
- ✅ Frontend: `lookupUPC()` service function
- ✅ i18n: 5 new keys in English + Spanish (showBranded, showAll, showingBranded, upcNotFound, upcFound)
- ✅ Version bumped to 1.5.0 (buildNumber "1", versionCode 10)

### Files Modified
- `backend/src/routes/product-catalog.ts` — branded filter + `/lookup/:upc` endpoint
- `app/app/catalog/products.tsx` — branded toggle UI + UPC detection
- `app/lib/services/catalogService.ts` — `lookupUPC()` + branded param
- `app/lib/i18n/translations/en.json` — 5 new catalog keys
- `app/lib/i18n/translations/es.json` — 5 new catalog keys (Spanish)
- `app/app.json` — version bump to 1.5.0

### Commits
```
5194a8d feat: Product catalog smart filtering + UPC search
```

---

## 2026-02-17 — UPC Enrichment via Open Food Facts

**Bulk UPC enrichment using Open Food Facts API. Adds product names, brands, and sizes to MI APL products that only had UPC codes.**

### Done
- ✅ Created `backend/src/scripts/enrich-upc.ts` — queries Open Food Facts API for product metadata
- ✅ ~45% of MI products enriched with brand/name/size data

### Commits
```
7eba581 feat: Add UPC enrichment script via Open Food Facts API
```

---

## 2026-02-16 — NC & OR APL Product Data Enrichment

**Both states went from UPC-only entries to full product names, brands, categories, and subcategories.**

### Done
- ✅ Created `backend/src/scripts/reimport-apl.ts` — standalone APL reimport script
- ✅ NC: 16,952 products enriched from state APL Excel file
- ✅ OR: 14,013 products enriched from state APL Excel file
- ✅ Fixed missing category codes (`'16'` → whole_grains, non-padded NC codes)
- ✅ Fixed APL source config (NC/OR URLs and column mappings) for future automated syncs
- ✅ 0 uncategorized products remaining for both states

### Files Created
- `backend/src/scripts/reimport-apl.ts`
- `backend/migrations/fix_nc_or_source_config.sql`

### Files Modified
- `backend/package.json` — added `reimport-apl` script
- `backend/src/routes/product-catalog.ts` — added missing CATEGORY_ALIASES

### Commits
```
926aecb feat: Add APL reimport script to enrich NC/OR product data
463db5d fix: Add missing category codes to CATEGORY_ALIASES
```

---

## 2026-02-16 — Product Catalog Bug Fixes + v1.4.2

**Multiple rounds of catalog polish: numeric subcategory hiding, chip sizing, UPC display, benefits screen fix, category chip icons.**

### Done
- ✅ Hide numeric subcategory chips (codes like "02", "15" not useful to users)
- ✅ Fix chip sizing overflow on small screens
- ✅ Show UPC in product list items
- ✅ Benefits screen reads from local storage instead of backend demo data
- ✅ Fix product catalog query referencing wrong column name
- ✅ Constrain oversized category chip icons on Shopping Tips screen
- ✅ Bumped to v1.4.2 (versionCode 9)

### Commits
```
c842405 fix: Product catalog — hide numeric subcategories, fix chip sizing, show UPC
3dfefd2 fix: Benefits screen now reads from local storage instead of backend demo data
75a7494 fix: Product catalog query referenced wrong column name
9583f59 fix: Constrain oversized category chip icons on Shopping Tips screen
22f4065 chore: Bump version to 1.4.2 (versionCode 9) for bug fix release
```

---

## 2026-02-16 — v1.4.0 Feature Expansion + Bug Fixes

**7 new features: map view, WIC guidelines, store products, food bank enhancements, WIC clinics, recipes, plus iOS/catalog bug fixes.**

### Done
- ✅ Map view for stores
- ✅ WIC guidelines integration
- ✅ Store products display
- ✅ Food bank finder enhancements
- ✅ WIC clinics directory
- ✅ Recipe features
- ✅ Fixed iOS recipes chips, scanner overlap, catalog i18n, store finder SQL
- ✅ Fixed map numeric category codes display
- ✅ Merged duplicate catalog categories server-side
- ✅ Bumped to v1.4.1 (versionCode 8)

### Commits
```
ac5db25 feat: v1.4.0 — 7 new features
09269c8 fix: Resolve 4 iOS UI bugs — recipes chips, scanner overlap, catalog i18n, store finder
6660621 fix: Map numeric category codes to human-readable names in product catalog
ae9b3f7 fix: Scanner cancel button overlap and store finder SQL error
6b971bb chore: Bump version to 1.4.1 (versionCode 8) for bug fix release
556d5a6 fix: Merge duplicate catalog categories server-side
```

---

## 2026-02-15 — Kroger Background Batch Sync

**Cron-based inventory sync pipeline with DB-first cross-store search. Reduces per-request Kroger API calls from ~25 to near-zero when data is fresh.**

### Done
- ✅ Fixed `syncInventoryBatch()` retailer bug — was hardcoded `'walmart'`, now parameterized
- ✅ Cross-store search reads pre-synced inventory from DB before live API calls
- ✅ Live API fallback only for stores with stale/missing data (capped at 5 stores)
- ✅ `KROGER_INVENTORY_STALE_HOURS` env var (default: 4h) controls freshness threshold
- ✅ `--max-stores` and `--max-upcs` CLI flags for sync script
- ✅ Crontab configured on VPS: 3×/day sync (01:00, 09:00, 17:00 UTC) + weekly cleanup
- ✅ Zero-padded Kroger location IDs to 8 characters (API requirement)
- ✅ 12-digit UPC-A retry when 13-digit GTIN search returns no results
- ✅ Filtered out stores with invalid short location IDs from sync queries
- ✅ Deleted 4 manually-seeded stores with bad IDs (all had API-discovered replacements)
- ✅ `.claude/settings.local.json` gitignored (was blocking deploy script)

### Files Modified
- `backend/src/services/InventorySyncService.ts` — retailer param on `syncInventoryBatch()`
- `backend/src/services/KrogerIntegration.ts` — maxUpcs param, UPC-A retry, store ID filter, kroger retailer
- `backend/src/scripts/sync-kroger-inventory.ts` — `--max-stores`/`--max-upcs` flags, help text
- `backend/src/routes/cross-store-search.ts` — DB-first inventory lookup with live fallback
- `docker-compose.yml` — `KROGER_INVENTORY_STALE_HOURS` env var
- `ROADMAP.md` — Marked Kroger batch sync as done
- `CLAUDE.md` — Added Kroger sync commands and crontab to Production section
- `.gitignore` — Added `.claude/settings.local.json`

### Verification
- 29/29 inventory records synced (5 stores × 10 UPCs), 0 failures
- 32 total records: 11 in stock, 13 low stock, 8 out of stock
- Stats command correctly shows `retailer = 'kroger'`

### Commits
```
c87eef3 feat: Add Kroger background batch sync with DB-first cross-store search
fa0be8b chore: Gitignore .claude/settings.local.json
2fca5dc fix: Zero-pad Kroger location IDs to 8 characters
6b113c2 fix: Retry Kroger product search with 12-digit UPC-A format
6ffe3e0 fix: Filter out Kroger stores with invalid short location IDs
9e0db6f chore: Remove Kroger sync debug logging
```

---

## 2026-02-14 — Manual PLU Code Entry + Scanner Fix

**Fresh produce eligibility via manual PLU entry. iOS scanner mode toggle fix.**

### Done
- ✅ Manual PLU code entry — "Enter PLU Code" button on scanner screen opens number pad modal
- ✅ Bundled 324 IFPS produce PLU codes (203 fruits, 121 vegetables) for offline lookup
- ✅ PLU lookup service with organic detection (5-digit codes starting with 9)
- ✅ Result screen shows PLU label, CVB info note, hides sightings/cart for produce
- ✅ Unknown-but-valid PLU codes still show as eligible ("Fresh Produce")
- ✅ EN + ES translations for all PLU UI strings
- ✅ Fixed iOS bug: Check Eligibility / Shopping Mode toggle was untappable (overlay z-order)

### Files Created
- `app/assets/data/plu-codes.json` — bundled produce PLU lookup table
- `app/lib/services/pluLookup.ts` — offline PLU lookup service

### Files Modified
- `app/app/scanner/index.tsx` — PLU button, modal, mode toggle z-order fix
- `app/app/scanner/result.tsx` — isPlu param, CVB note, hide sightings/cart
- `app/lib/i18n/translations/en.json` — 9 new PLU keys
- `app/lib/i18n/translations/es.json` — 9 new PLU keys

### Commits
```
ce86050 feat: Add manual PLU code entry for produce eligibility
```

---

## 2026-02-13 — Version 1.1.2 Build (iOS + Android)

**Accessibility overhaul included in new builds.**

### Done
- ✅ Bumped version to 1.1.2 (buildNumber 2, versionCode 4)
- ✅ iOS build created and uploaded
- ✅ Android build created and uploaded
- ✅ Includes full accessibility overhaul from 932a87c (i18n, touch targets, UI fixes across 30+ files)

### Build History

| Date | Version | versionCode | buildNumber | Platform |
|------|---------|-------------|-------------|----------|
| 2026-01-26 | ~1.0.x | 1 | "1" | Android |
| 2026-02-11 | 1.1.1 | 3 | "1" | Android + iOS |
| 2026-02-13 | 1.1.2 | 4 | "2" | Android + iOS |

### Commits
```
2895bc8 chore: Bump version to 1.1.2 for accessibility overhaul build
```

---

## 2026-02-12 — Kroger API Integration + Multi-State Store Coverage

**Real-time Kroger inventory data live. All 4 states have store coverage.**

### Done
- ✅ Kroger API integration (OAuth2 auth, product search, store locator)
- ✅ Live inventory enrichment in cross-store search (Step 3.5)
- ✅ Dynamic store discovery — auto-discovers Kroger stores for unseen zip codes
- ✅ 30-min product availability cache + 24h zip discovery cache (rate limit protection)
- ✅ Kroger store sync script — populates MI, NC, OR from Kroger locations API
- ✅ Kroger inventory sync script — batch formula inventory with stats/cleanup
- ✅ NC store seed: 34 stores (Walmart, Food Lion, Target, ALDI, Publix, CVS, Walgreens)
- ✅ OR store seed: 30 stores (Walmart, Safeway, WinCo, Target, Albertsons)
- ✅ NY store seed: 50 stores (ShopRite, Wegmans, Stop & Shop, Price Chopper, Walmart, Target, ALDI)
- ✅ State onboarding checklist documented (docs/guides/state-onboarding.md)
- ✅ Graceful degradation when Kroger credentials not configured
- ✅ Docker-compose env passthrough for Kroger credentials

### Store Coverage Summary

| State | Kroger-Family (API) | Non-Kroger (Seeded) | Total |
|-------|-------------------|-------------------|-------|
| MI | Kroger | 53 (Walmart, Meijer, Target, CVS, Walgreens) | 53+API |
| NC | Kroger, Harris Teeter | 34 (Walmart, Food Lion, Target, ALDI, Publix) | 34+API |
| OR | Fred Meyer, QFC | 30 (Walmart, Safeway, WinCo, Target, Albertsons) | 30+API |
| NY | None | 50 (ShopRite, Wegmans, Stop & Shop, Price Chopper, etc.) | 50 |

### Files Created
- `backend/src/services/KrogerIntegration.ts`
- `backend/src/scripts/sync-kroger-stores.ts`
- `backend/src/scripts/sync-kroger-inventory.ts`
- `backend/src/scripts/seed-nc-stores.ts`
- `backend/src/scripts/seed-or-stores.ts`
- `backend/src/scripts/seed-ny-stores.ts`
- `docs/guides/state-onboarding.md`

### Files Modified
- `backend/src/routes/cross-store-search.ts` — Kroger enrichment + dynamic discovery
- `backend/.env.example` — Kroger credentials
- `backend/package.json` — 5 new npm scripts
- `docker-compose.yml` — Kroger env passthrough

### Commits
```
26fa512 feat: Add Kroger API integration for real-time store/inventory data
eb81c0c fix: Pass Kroger API credentials through docker-compose environment
88d1c86 feat: Dynamic Kroger store discovery + expanded seed coverage
aa9a418 feat: State onboarding checklist + NC/OR non-Kroger store seeds
c19b7b6 feat: Add NY store seed script (50 stores across 9 metros)
```

---

## 2026-02-10 — Multi-State APL Automation Complete

**4 states syncing automatically with 62,027 products**

### Done
- ✅ Michigan APL: 9,940 products (web scraping + Excel)
- ✅ North Carolina APL: 16,949 products (web scraping + Excel)
- ✅ New York APL: 21,125 products (nyswicvendors.com + Excel)
- ✅ Oregon APL: 14,013 products (web scraping + Excel)
- ✅ Daily automated sync via cron (5am UTC)
- ✅ Web scraping for dynamic download URLs
- ✅ Browser-like headers to bypass 403 blocks
- ✅ UPC normalization with leading-zero padding
- ✅ PDF parsing support (pdf-parse library)
- ✅ Health monitoring dashboard

### Shelved
- ⏸️ Florida: State has own WIC app, no public UPC-based APL

### Files Modified
- `backend/src/services/APLSyncService.ts` — Web scraping, PDF parsing, UPC detection
- `backend/package.json` — Added cheerio, pdf-parse dependencies

### Technical Notes
- NY Excel has headers at row 6 (disclaimer rows above) — configured via `parser_config.headerRow`
- OR uses "UPC PLU" column name (space, not slash)
- FL only publishes visual food guides, not UPC-based APL
- Cron: `0 5 * * * cd ~/projects/wic-app && docker compose exec -T backend npm run apl-sync`

### Commits
```
192ddb6 feat: Add NY APL sync via nyswicvendors.com
1a812f5 feat: Add OR APL sync with web scraping, fix PDF parsing
56ef420 feat: Add APL sync with web scraping and UPC padding for Michigan
```

---

## 2026-02-04 — Documentation Consolidation

**Bridged gap between archive and primary docs**

### Done
- ✅ Created `.claude/DECISIONS.md` — Architectural decisions & trade-offs
- ✅ Created `TEST_STRATEGY.md` — Testing patterns & plans
- ✅ Created `docs/guides/` — Consolidated implementation guides
- ✅ Updated `ROADMAP.md` with archive references

---

## 2026-01-26 — Production Deployment

**Backend deployed to VPS + Production APK built**

### Done
- ✅ Dockerized backend + PostgreSQL
- ✅ Deployed to https://mdmichael.com/wic/ via Traefik reverse proxy
- ✅ SSL via Let's Encrypt
- ✅ 9,940 Michigan products imported to production DB
- ✅ Landing page with API health monitoring
- ✅ Production APK built (95MB, release build)
- ✅ APK download link on landing page

### Files Created
- `backend/Dockerfile`
- `docker-compose.yml`
- `.env.production.example`
- `deployment/import-apl-data.sh`
- `BUILD_PRODUCTION_APK.md`

### Technical Notes
- Backend product routes disabled (TypeScript import errors) — no MVP impact
- Store data not yet imported — search returns empty
- Java 17 required for Android builds: `export JAVA_HOME=/usr/local/opt/openjdk@17`

---

## 2026-01-23 — Manual Entry UX Fix

**Fixed benefit category visibility**

### Done
- ✅ Enabled horizontal scroll indicator for benefit categories
- ✅ Added "scroll right for more" hint
- ✅ All 14 categories now discoverable

### Decision
Keep manual entry UX minimal — it's temporary until eWIC API integration.

---

## 2026-01-22 — Offline Build + Manual Benefits Entry

**Standalone APK + manual benefits system**

### Done
- ✅ Built release APK (debug was launching Expo Go)
- ✅ Created household storage service (AsyncStorage)
- ✅ Built household setup screen (650+ lines)
- ✅ 14 benefit categories with participant management
- ✅ Data persists across app restarts

### Files Created
- `app/lib/services/householdStorage.ts`
- `app/app/benefits/household-setup.tsx`

### Technical Notes
- Release APK works standalone, debug APK requires Expo Go
- getBenefits() priority: AsyncStorage → mock data → backend API

---

## 2026-01-19 — Formula Finder Week 2

**Shortage detection algorithm + UI**

### Done
- ✅ Database schema enhancement (migration 006)
- ✅ Shortage detection algorithm (250+ lines)
- ✅ Severity levels: critical (90%+), severe (70-90%), moderate (50-70%)
- ✅ Trend detection: worsening, stable, improving
- ✅ Frontend alert banners with color-coded severity
- ✅ Device tested on Pixel 2 (Android 11)

### Files Created
- `backend/migrations/006_shortage_detection_enhancements.sql`
- `backend/src/scripts/detect-shortages.ts`
- `backend/src/scripts/seed-shortage-test-data.ts`

### Technical Notes
- Minimum 3 stores required to detect shortage (prevents false positives)
- 10% threshold for trend changes (prevents noise)

---

## 2026-01-18 — Formula Finder Week 1

**MVP formula finder with store inventory**

### Done
- ✅ Formula search API
- ✅ Store inventory display
- ✅ Status badges (in stock, low stock, out of stock)
- ✅ Confidence scoring with time decay
- ✅ Crowdsourced sighting reports

### Files Created
- `app/app/formula/index.tsx`
- `backend/src/routes/formula.ts`

---

## 2026-01-16 — MVP Complete

**Core functionality working end-to-end**

### Done
- ✅ Barcode scanning (UPC-A, UPC-E, EAN-13)
- ✅ Eligibility checking against Michigan APL
- ✅ Benefits tracking (available → in cart → consumed)
- ✅ Shopping cart with checkout
- ✅ Network communication (phone → laptop)

---

## 2026-01-10 — Store Detection Complete

**GPS + WiFi + manual selection**

### Done
- ✅ GPS-based store detection
- ✅ WiFi SSID matching
- ✅ Geofence matching
- ✅ Manual store search
- ✅ Store favorites
- ✅ Confidence scoring (distance-based)

### Files Created
- `app/lib/services/storeDetection.ts`
- `app/lib/services/locationService.ts`
- `backend/src/routes/stores.ts`

---

## 2026-01-09 — Project Setup

**Initial React Native + Expo + Backend**

### Done
- ✅ React Native + Expo SDK 52
- ✅ TypeScript configuration
- ✅ Node.js/Express backend
- ✅ PostgreSQL schema (11 tables)
- ✅ Michigan APL data import (12,344 products initially)

---

## Earlier Work (December 2025)

- Project inception
- OpenSpec specifications written
- Technical architecture designed
- Roadmap created

---

*For detailed implementation notes, see `docs/archive/`*
