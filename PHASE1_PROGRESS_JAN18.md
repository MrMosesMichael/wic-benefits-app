# Phase 1 Missing Features - Progress Report

**Date:** January 18, 2026
**Session Focus:** Formula Tracking (SURVIVAL Priority)

---

## Summary

Started implementation of Phase 1 missing features with highest priority: **Formula Tracking** (SURVIVAL).

**Status:** Week 1 backend complete, frontend UI in progress

---

## Completed Today ✅

### 1. Implementation Plan Created
- **Document:** `PHASE1_MISSING_FEATURES_PLAN.md`
- **Timeline:** 9 weeks total for all 4 missing features
- **Budget:** $2,500-4,500 estimated
- **Approach:** MVP-first, iterative implementation

### 2. Database Schema (Migration 005)
Created 5 new tables for formula tracking:

**formula_availability** - Tracks formula at stores
- UPC, store name/address, GPS coordinates
- Status: in_stock, low_stock, out_of_stock, unknown
- Quantity range: few, some, plenty
- Source: api, scrape, crowdsourced
- Confidence scoring (0-100)
- Report count for crowdsourced validation

**formula_shortages** - Regional shortage tracking
- Formula category and affected UPCs
- Severity levels: moderate, severe, critical
- Trend tracking: worsening, stable, improving
- Alternative formula suggestions

**users** - User accounts (device-based anonymous auth for MVP)
- Device ID (primary auth method)
- Optional phone/email
- Foundation for alerts and data sovereignty

**formula_alerts** - Restock notifications
- User subscriptions for specific formulas
- Max distance and notification preferences
- 30-day expiration
- Rate limiting support

**formula_equivalents** - Alternative formula mapping
- Same product different size
- Same brand different type
- Generic equivalents
- Medical alternatives

### 3. Backend API Routes (/api/v1/formula)

**Implemented 5 endpoints:**

1. `GET /formula/availability` - Get formula at nearby stores
   - Location-based search (lat/lng + radius)
   - Distance calculation via Haversine formula
   - Status filtering and sorting
   - 48-hour freshness window

2. `POST /formula/search` - Cross-store formula search
   - Search multiple UPCs simultaneously
   - Optional alternative inclusion
   - Exact match vs alternative flagging
   - Distance-sorted results

3. `GET /formula/alternatives/:upc` - Get alternative formulas
   - Relationship types (same product/brand, generic, medical)
   - State-specific filtering
   - WIC approval status

4. `GET /formula/shortages` - Regional shortage status
   - Active shortages only
   - Severity-sorted
   - Trend indicators

5. `POST /formula/report` - Crowdsourced reporting
   - Users report formula availability
   - Incremental confidence scoring
   - Duplicate detection and merging

### 4. Testing
- ✅ All API endpoints tested with curl
- ✅ Created 3 test formula availability reports
- ✅ Verified distance calculation (0.9 miles computed correctly)
- ✅ Confirmed status sorting (in_stock before low_stock)
- ✅ Validated crowdsourced reporting workflow

---

## API Test Results

### Formula Availability Search
```bash
GET /api/v1/formula/availability?latitude=42.3314&longitude=-83.0458&radius=10

Results:
- 3 formula reports found
- Distance calculation working: Kroger 0.9 miles
- Status sorting working: in_stock → low_stock
- Confidence scores: 60 (crowdsourced baseline)
```

### Formula Reporting
```bash
POST /api/v1/formula/report
Body: {
  "upc": "0070074640709",
  "storeName": "Walmart Supercenter",
  "status": "in_stock",
  "quantityRange": "plenty",
  "latitude": 42.3314,
  "longitude": -83.0458
}

Response: Success, report ID assigned, thank you message
```

---

## Next Steps

### Immediate (Continue Week 1)
1. **Frontend Formula Finder UI**
   - Create `/formula` screen
   - Search interface (radius selector, formula filter)
   - Results list with availability status
   - Store details with directions
   - "Report Formula" button

2. **Integrate with Home Screen**
   - Add "Find Formula" card for infant participants
   - Quick access from benefits screen

3. **Extend Scan Result**
   - Show formula availability on scan result
   - Quick "Find at other stores" button

### Week 2: Shortage Detection
- Shortage detection algorithm (>50% stores out = shortage)
- Shortage display in formula finder
- Alternative suggestions

### Week 3: Restock Alerts
- Push notification integration (Expo Push)
- Alert subscription UI
- Notification matching and rate limiting

### Week 4: Formula Alternatives
- Formula equivalents data seeding
- Alternative suggestions UI
- WIC office contact integration

---

## Architecture Decisions

### MVP Simplifications
1. **No Stores Table Yet**: Using store names as strings instead of foreign keys
   - Faster MVP implementation
   - Can migrate to proper stores table later
   - Sufficient for MVP functionality

2. **Device-Based Anonymous Auth**: No email/password required
   - Lower barrier to entry
   - Can upgrade to full auth later
   - Sufficient for alerts and data export

3. **Crowdsourced Primary**: No retailer API integration yet
   - Retailer APIs not viable (per investigation)
   - Crowdsourced data works well
   - Community-powered from day 1

---

## Technical Highlights

### Haversine Distance Calculation
```sql
3959 * acos(
  cos(radians(user_lat)) * cos(radians(store_lat)) *
  cos(radians(store_lng) - radians(user_lng)) +
  sin(radians(user_lat)) * sin(radians(store_lat))
) as distance_miles
```

### Confidence Scoring Logic
- Crowdsourced baseline: 60
- Each additional report: +5 (max 95)
- API data: 90
- Degrades over time (48-hour window)

### Smart Report Merging
- Duplicate UPC + store → update existing
- Increments report_count
- Boosts confidence
- Updates timestamp

---

## Files Created/Modified

### New Files
1. `/backend/migrations/005_formula_tracking.sql` - 130 lines
2. `/backend/src/routes/formula.ts` - 500+ lines
3. `/backend/src/scripts/run-migration-005.ts` - Helper script
4. `/backend/src/scripts/check-db-tables.ts` - Utility
5. `/PHASE1_MISSING_FEATURES_PLAN.md` - 800+ lines
6. `/PHASE1_PROGRESS_JAN18.md` - This document

### Modified Files
7. `/backend/src/index.ts` - Registered formula routes

---

## Database State

### New Tables (5)
- formula_availability (3 test records)
- formula_shortages (empty - Week 2)
- users (1 demo user)
- formula_alerts (empty - Week 3)
- formula_equivalents (empty - Week 4)

### Modified Tables
- households.user_id (foreign key added)

---

## Timeline

**Completed:** Week 1 Day 1 (Backend)
**In Progress:** Week 1 Day 2 (Frontend UI)
**Remaining:** 8.5 weeks

**Projected Completion:** End of March 2026

---

## Success Criteria Progress

### Formula Tracking MVP
- ✅ Users can search formula across stores (API ready)
- ⏳ Search completes within 2 minutes (UI needed)
- ✅ Distance calculation working
- ✅ Crowdsourced reporting functional
- ⏳ Frontend UI (in progress)

### Overall Phase 1
- ✅ Formula Tracking: 40% complete (backend done, frontend pending)
- ⏳ Spanish Support: 0% (Week 5-6)
- ⏳ Help & FAQ: 0% (Week 7-8)
- ⏳ Data Sovereignty: 5% (users table exists, features pending)

---

## Blockers & Risks

### Current Blockers
- ❌ None - progressing smoothly

### Risks
1. **Frontend complexity** - Formula finder UI has many features
   - Mitigation: Start with simple search, iterate

2. **Test data limited** - Only 3 formula reports so far
   - Mitigation: Seed more test data, encourage beta testing

3. **Push notifications** - Complex integration (Week 3)
   - Mitigation: Expo Push well-documented, allocate extra time

---

## Key Metrics to Track

**When Formula Finder launches:**
1. Searches per day
2. Formulas found vs not found
3. Reports submitted by users
4. Time from search to store visit (future)

---

**Next Session:** Continue with Formula Finder frontend UI

**Status:** ✅ On track for 9-week completion timeline
