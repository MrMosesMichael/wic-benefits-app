# WIC Benefits App — Changelog

> Session-by-session progress log. Most recent first.

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
