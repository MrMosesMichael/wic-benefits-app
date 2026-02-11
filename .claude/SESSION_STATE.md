# Session State

> **Last Updated:** 2026-02-11
> **Session:** GPS Location System, Feedback i18n, Privacy Page, Landing Page Fixes

---

## Current Status

**All tasks complete for this session. Ready for Android APK + iOS IPA rebuild.**

---

## Work Completed This Session

### 1. GPS-Based State Detection (Major Feature)
Centralized location system replacing per-screen hardcoded Michigan defaults.

**New files:**
- `app/lib/services/locationService.ts` — GPS wrapper, AsyncStorage persistence, zip fallback
- `app/lib/hooks/useLocation.ts` — React hook wrapping locationService
- `app/components/LocationPrompt.tsx` — Reusable "Use GPS / Enter Zip Code" component
- `app/app/settings/location.tsx` — Location settings screen (GPS, zip entry, preferences)
- `backend/src/routes/location.ts` — `/resolve` (zip→coords) + `/detect-state` (coords→state)
- `backend/migrations/020_zip_codes.sql` — Table definition
- `backend/migrations/020_zip_codes_seed.sql` — 33,760 US zip codes from Census ZCTA
- `backend/scripts/generate-zip-seed.ts` — Seed generator from Census Gazetteer data

**Refactored screens (5):**
- `app/app/formula/index.tsx` — Replaced inline GPS with useLocation hook
- `app/app/formula/cross-store-search.tsx` — Same
- `app/app/formula/alternatives.tsx` — Same, uses detected state instead of hardcoded MI
- `app/app/formula/report.tsx` — Same
- `app/app/foodbanks/index.tsx` — Same

**Other modified files:**
- `backend/src/index.ts` — Registered location routes
- `app/app/_layout.tsx` — Added Stack.Screen entries for alternatives + location settings
- `app/lib/services/api.ts` — `checkEligibility()` now accepts optional `state` param
- `app/app/scanner/index.tsx` — Passes detected state to eligibility check
- `app/app/formula/select.tsx` — Uses detected state for formula lookup

**Deployed:** Zip codes seeded on VPS (33,760 records in `zip_codes` table).

### 2. Feedback Screen i18n
- Added `feedback` section (20 keys) to `en.json` and `es.json`
- Updated `app/app/feedback/index.tsx` to use `useI18n()` + `t()` calls
- All strings translated: title, categories, placeholders, success/error messages

### 3. Privacy Policy Page
- Created `deployment/wic-landing/privacy.html` — comprehensive privacy policy
- Covers: data collected, data never collected, sharing, third parties, user rights
- Matches support.html styling (purple gradient, card layout)
- Deployed to VPS

### 4. Landing Page Link Fixes
- Fixed `index.html`: `/wic/support` → `/wic/support.html`
- Fixed `support.html`: self-referencing link + privacy link updated to `.html`
- Root cause: nginx default config doesn't resolve extensionless URLs

### 5. Documentation Updates
- Updated `ROADMAP.md` — Phase 7 to 45%, added location system + feedback to "What's Working", marked support/privacy URLs done
- Updated `DECISIONS.md` — Added GPS/location architecture decision
- Updated `SESSION_STATE.md` — This file
- Updated `MEMORY.md` — Modernized to match current project state

---

## Files Modified (Summary)

```
# New files
app/lib/services/locationService.ts
app/lib/hooks/useLocation.ts
app/components/LocationPrompt.tsx
app/app/settings/location.tsx
backend/src/routes/location.ts
backend/migrations/020_zip_codes.sql
backend/migrations/020_zip_codes_seed.sql
backend/scripts/generate-zip-seed.ts
deployment/wic-landing/privacy.html

# Modified files
backend/src/index.ts
app/app/_layout.tsx
app/app/index.tsx
app/lib/services/api.ts
app/app/scanner/index.tsx
app/app/formula/index.tsx
app/app/formula/cross-store-search.tsx
app/app/formula/alternatives.tsx
app/app/formula/report.tsx
app/app/formula/select.tsx
app/app/foodbanks/index.tsx
app/app/feedback/index.tsx
app/lib/i18n/translations/en.json
app/lib/i18n/translations/es.json
deployment/wic-landing/index.html
deployment/wic-landing/support.html
ROADMAP.md
.claude/DECISIONS.md
.claude/MEMORY.md
```

---

## What's Next

### Immediate: Rebuild Apps
- Deploy updated backend (location routes + feedback GitHub integration)
- Rebuild Android APK: `./scripts/build-android.sh --upload`
- Rebuild iOS IPA: `npx eas-cli build --platform ios --profile production --local`
- Resubmit to TestFlight

### Short Term
1. **Complete Spanish i18n** — Have native speaker review all translations
2. **App Store assets** — Screenshots, description, keywords (see ROADMAP.md checklist)
3. **Accessibility (Track T)** — VoiceOver/TalkBack support
4. **External TestFlight beta** — Enable public link after Apple review

### VPS Environment Notes
- SSH user: `mmichael` (files owned by `dmichael`, sudo needed for some ops)
- Docker services: `backend`, `postgres` (user: `wic_admin`)
- Web root: `/data/docker/www/mdmichael.com/www/wic/`
- Env vars needed: `GITHUB_TOKEN`, `GITHUB_FEEDBACK_REPO` (both set as of this session)

---

## Technical Notes

### Location System Architecture
```
User opens screen → useLocation hook
  ├── Cached location? → return it (check 30-day staleness)
  ├── Preference = 'gps'? → request GPS → detect-state API → cache
  ├── Preference = 'manual'? → show zip prompt → resolve API → cache
  └── Preference = 'ask'? → show LocationPrompt component
```

### APL Sources (Working — 5 states)
- **MI**: michigan.gov → Excel scraping (9,940 products)
- **NC**: ncdhhs.gov → Excel scraping (16,949 products)
- **NY**: nyswicvendors.com → Excel scraping (21,125 products)
- **OR**: oregon.gov → Excel scraping (14,013 products)
- **FL**: Shelved (state has own app, no UPC-based APL)

### Key API Endpoints
```
GET  /api/v1/location/detect-state?lat=X&lng=Y   # GPS → state
POST /api/v1/location/resolve                      # {zipCode} → coords+state
GET  /api/v1/location/supported-states             # [MI, NC, FL, OR, NY]
POST /api/v1/feedback                              # Creates GitHub Issue
GET  /api/v1/apl-sync/health                       # APL sync dashboard
```

---

*Previous session: iOS build + TestFlight submission (Feb 10)*
