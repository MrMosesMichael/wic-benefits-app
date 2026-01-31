# WIC Benefits App — Changelog

> Session-by-session progress log. Most recent first.

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
