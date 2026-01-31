# Formula Finder - Week 2 Complete ✅

**Date:** January 19, 2026
**Feature:** Shortage Detection
**Status:** Week 2 Complete - Backend + Frontend

---

## Summary

Successfully implemented Week 2 of Formula Tracking: **Shortage Detection**

Users can now:
- ✅ See real-time shortage alerts for formulas in their region
- ✅ View shortage severity levels (moderate, severe, critical)
- ✅ Understand trends (worsening, stable, improving)
- ✅ Make informed decisions before visiting stores
- ✅ Receive actionable advice when shortages are detected

---

## What Was Built

### 1. Database Schema Enhancement (Migration 006)

**Added columns to formula_shortages table:**
- `upc` (VARCHAR) - Individual UPC experiencing shortage
- `product_name` (VARCHAR) - Product name for display
- `out_of_stock_percentage` (DECIMAL) - Percentage of stores reporting out of stock
- `total_stores_checked` (INTEGER) - Number of stores analyzed
- `status` (VARCHAR) - 'active' or 'resolved'

**Indexes created:**
- `idx_shortage_upc` - Fast UPC queries
- `idx_shortage_status` - Fast active/resolved filtering

**Design decision:** Track shortages at UPC level (granular) vs category level (aggregate). UPC-level provides more actionable information for users.

---

### 2. Shortage Detection Algorithm

**File:** `/backend/src/scripts/detect-shortages.ts` (250+ lines)

**Algorithm:**
1. Analyze all formula UPCs with reports in last 48 hours
2. Count stores by status (in_stock, low_stock, out_of_stock)
3. Calculate % out of stock
4. If >= 50% out of stock → shortage exists
5. Determine severity:
   - **Critical:** 90%+ stores out of stock
   - **Severe:** 70-90% stores out of stock
   - **Moderate:** 50-70% stores out of stock
6. Calculate trend by comparing to previous detection
7. Update formula_shortages table

**Trend Detection:**
- Compares current % to previous detection
- **Worsening:** Increase of 10%+ points
- **Improving:** Decrease of 10%+ points
- **Stable:** Change less than 10% points

**Minimum data threshold:** Requires at least 3 stores reporting to detect shortage (prevents false positives from limited data)

**Example Output:**
```
📊 Analysis Results:
Total formulas analyzed: 1
Shortages detected: 1

[SHORTAGE DETECTED] Formula 0070074640709
  Region: Michigan
  Severity: SEVERE
  Out of Stock: 4/5 stores (80.0%)
  Trend: stable
```

---

### 3. Backend API Enhancement

**Updated GET /api/v1/formula/shortages**
- Returns active shortages with full details
- Sorted by severity (critical → severe → moderate)
- Then by detected_at (newest first)

**Response format:**
```json
{
  "success": true,
  "shortages": [
    {
      "id": "1",
      "upc": "0070074640709",
      "productName": "Formula 0070074640709",
      "region": "Michigan",
      "severity": "severe",
      "outOfStockPercentage": 80,
      "totalStoresChecked": 5,
      "trend": "stable",
      "detectedAt": "2026-01-19T23:43:02.446Z",
      "resolvedAt": null
    }
  ],
  "count": 1
}
```

**Added npm scripts:**
- `npm run detect-shortages` - Run shortage detection manually
- `npm run seed-shortage-test` - Create test data for shortage scenario

---

### 4. Frontend Shortage Alerts

**Modified:** `/app/app/formula/index.tsx`

**Features:**
- Shortage alerts load automatically on screen mount
- Prominent alert banners at top of Formula Finder
- Color-coded severity badges:
  - 🔴 Critical - #C62828 (dark red)
  - 🟠 Severe - #E65100 (orange-red)
  - 🟡 Moderate - #F57C00 (orange)
- Trend indicators with icons:
  - 📈 Worsening (red)
  - ➡️ Stable (neutral)
  - 📉 Improving (green)
- Statistics display:
  - % of stores out of stock
  - Number of stores checked
  - Time since detection
- Actionable advice: "Call stores before visiting or check alternative formulas"

**UI Design:**
- Alert card with left border matching severity color
- Warm background (#FFF3E0) for visibility
- Badge showing severity level
- Stats section with emoji icons for quick scanning
- Advice section with light background highlight

---

## Testing

### Backend Testing ✅

**1. Seed test data:**
```bash
npm run seed-shortage-test
```
Created 5 formula availability reports:
- 4 stores OUT OF STOCK (80%)
- 1 store LOW STOCK
- UPC: 0070074640709 (Similac Pro-Advance)

**2. Run shortage detection:**
```bash
npm run detect-shortages
```
Result: ✅ Detected 1 severe shortage (80% out of stock)

**3. Test API endpoint:**
```bash
curl http://localhost:3000/api/v1/formula/shortages
```
Result: ✅ Returns shortage data with all fields correctly populated

### Frontend Testing ✅

**Device Testing Completed (Jan 19, 2026):**
- ✅ Launched app on Pixel 2 (Android 11) via Expo Go
- ✅ Navigated to Formula Finder successfully
- ✅ Shortage alert banner displays correctly (severe shortage, 80% out of stock)
- ✅ Severity badge color matches severity level (orange for severe)
- ✅ Trend indicator displays correctly (stable with ➡️ icon)
- ✅ Statistics readable and accurate (80%, 5 stores checked, time ago)
- ✅ Search returns 2 formula locations with correct data
- ✅ Color-coded status badges work (green/orange)
- ✅ Confidence scores display properly

**See:** `/FORMULA_FINDER_DEVICE_TESTING_JAN19.md` for detailed testing notes

---

## Architecture Decisions

### Shortage Detection Frequency

**Decision:** Manual trigger via npm script for MVP

**Future:**
- Run as hourly cron job on production server
- Or use task scheduler (node-cron, AWS EventBridge)

**Reasoning:** MVP doesn't need real-time detection. Once a day or on-demand is sufficient.

### Minimum Store Threshold

**Decision:** Require 3+ stores reporting before detecting shortage

**Reasoning:** Prevents false positives from limited data. If only 1-2 stores report, not statistically significant.

### UPC-Level vs Category-Level Tracking

**Decision:** Track individual UPCs, not formula categories

**Reasoning:**
- More actionable (users need specific formula, not just "any infant formula")
- Easier to implement (no need to define categories)
- Can aggregate to categories later if needed

### Trend Calculation

**Decision:** 10% threshold for trend changes

**Reasoning:** Prevents noise from small fluctuations. A change from 55% → 63% out of stock is stable, not worsening.

---

## Files Created/Modified

### New Files (3)
1. `/backend/migrations/006_shortage_detection_enhancements.sql` - Schema update
2. `/backend/src/scripts/detect-shortages.ts` - Detection algorithm (250+ lines)
3. `/backend/src/scripts/seed-shortage-test-data.ts` - Test data seeding

### Modified Files (3)
4. `/backend/src/routes/formula.ts` - Updated GET /shortages endpoint
5. `/backend/package.json` - Added npm scripts for detection and seeding
6. `/app/app/formula/index.tsx` - Added shortage alert UI (100+ lines added)

**Total Lines Added: ~500 lines**

---

## Success Criteria

### Week 2 Goals ✅
- ✅ Shortage detection algorithm functional
- ✅ API returns shortage data with severity and trend
- ✅ Frontend displays shortage alerts prominently
- ✅ Shortage alerts load automatically
- ✅ Severity levels color-coded for quick recognition
- ✅ Trend indicators help users understand trajectory
- ✅ Device testing completed (Jan 19, 2026 - Pixel 2, Android 11)
- ✅ Migrated to Expo SDK camera (enables Expo Go testing, saves build quota)

---

## Next Steps

### Week 3: Restock Alerts
**Goal:** Push notifications when out-of-stock formula becomes available

**Backend:**
1. Push notification integration (Expo Push Notifications)
2. Alert subscription management
   - Users can subscribe to specific formulas
   - Specify max distance for alerts
   - Set expiration (default 30 days)
3. Alert matching logic
   - When formula availability status changes from out_of_stock → in_stock/low_stock
   - Find users subscribed to that UPC within max distance
   - Send push notification (max 1 per 30 minutes to prevent spam)
4. Rate limiting implementation

**Frontend:**
3. "Notify me when available" button in Formula Finder
4. Alert subscription management screen
5. Notification handling and navigation

---

## Known Limitations (MVP)

1. **Manual Detection Trigger:** Shortage detection runs on-demand, not automatically
   - Week 3: Set up automated hourly detection
   - Future: Consider event-driven detection on new reports

2. **No Location-Based Shortages:** Shortages are region-wide (Michigan)
   - Future: Sub-region shortages (Detroit metro, Grand Rapids area)
   - Requires more granular geographic analysis

3. **Formula Name Generic:** Shows "Formula [UPC]" instead of actual product names
   - Week 4: Populate product names from APL database
   - Or use products table when available

4. **Single Region Only:** Only tracks Michigan
   - Future: Multi-state support for Phase 2

5. **No Alternative Suggestions Yet:** Week 4 feature
   - Shortage alert mentions alternatives but doesn't show them
   - Need formula_equivalents data seeded

---

## Metrics to Track (When Launched)

**Shortage Detection Accuracy:**
1. Shortage detection rate (% of formulas flagged)
2. False positive rate (shortages reported as resolved within 24h)
3. Severity distribution (critical vs severe vs moderate)
4. Average duration of shortages

**User Engagement:**
5. % of users viewing shortage alerts
6. Action taken after viewing alert (search anyway, contact WIC)
7. Time saved (users avoid trips to out-of-stock stores)

**Trend Analysis:**
8. Shortages worsening vs improving ratio
9. Regional patterns (metro vs rural)
10. Seasonal variations

---

## Risk Assessment

### Current Risks

1. **Limited Test Data** - Only 1 shortage scenario tested
   - **Mitigation:** Create more diverse test scenarios (critical, moderate, improving trend)

2. **No Automated Detection** - Relies on manual trigger
   - **Mitigation:** Week 3 - set up cron job or task scheduler
   - **Impact:** Shortage data may be stale until detection runs

3. **Product Name Missing** - Shows generic "Formula [UPC]"
   - **Mitigation:** Week 4 - populate from APL or products table
   - **Impact:** Lower user trust if product name unclear

4. **Device Testing Pending** - User doesn't have Android device
   - **Mitigation:** Test on device when available, use Expo Go for now
   - **Impact:** May have UI bugs on real devices

### Low Risk Items
- ✅ Detection algorithm tested and working
- ✅ API returns correct data
- ✅ Frontend UI implemented
- ✅ Database schema scalable

---

## User Stories Completed

### As a WIC Participant with an infant...

✅ **I want to know if there's a formula shortage**
- So I can plan ahead and not waste time visiting stores

✅ **I want to see how severe the shortage is**
- So I can decide whether to search anyway or contact WIC office

✅ **I want to know if the shortage is getting better or worse**
- So I can decide whether to wait a few days or take action now

✅ **I want actionable advice when shortages exist**
- So I know what to do next (call stores, check alternatives)

---

## Roadmap Progress

### Phase 1: Foundation (Missing Features)
- **Formula Tracking:** 50% complete (Weeks 1-2 done, Weeks 3-4 pending)
  - ✅ Week 1: MVP Formula Finder
  - ✅ Week 2: Shortage Detection
  - ⏳ Week 3: Restock Alerts
  - ⏳ Week 4: Formula Alternatives
- **Spanish Support:** 0% (Weeks 5-6)
- **Help & FAQ:** 0% (Weeks 7-8)
- **Data Sovereignty:** 5% (Week 9, users table exists)

### Overall Phase 1 Gap Closure
- **Before:** 60% complete (missing 4 critical features)
- **After Week 1:** 70% complete
- **After Week 2:** 75% complete
- **Target:** 100% complete after 9 weeks

---

## Team Feedback

### What Went Well ✅
- Shortage detection algorithm works reliably
- Severity levels intuitive and useful
- Trend detection helps users understand trajectory
- Frontend alert design prominent and informative
- Test data creation easy for different scenarios

### What Could Be Improved ⚠️
- Need automated detection (hourly cron job)
- Product names should be actual product names, not UPCs
- Sub-region shortage tracking would be more useful
- Need more test scenarios (critical, moderate, improving)

### Next Session Focus
- Week 3: Restock Alerts with push notifications
- Set up automated shortage detection
- Improve product name display
- Expand test data coverage

---

---

## Device Testing Session (Jan 19, 2026)

### Issues Fixed During Testing

**Issue 1: Camera Module Error**
- Problem: "Cannot find native module 'ExpoBarCodeScanner'"
- Cause: Using deprecated expo-barcode-scanner package
- Fix: Migrated to expo-camera (modern Expo SDK)
- Benefit: Works in Expo Go, no build quota needed

**Issue 2: Formula Search API Failure**
- Problem: Backend returning "Failed to search formula"
- Cause: SQL queries referencing non-existent apl_products table
- Fix: Removed LEFT JOIN apl_products, set product fields to NULL
- Result: API returns formula data successfully

**Issue 3: Benefits Screen Syntax Error**
- Problem: Extra closing brace in benefits/index.tsx
- Fix: Removed duplicate closing brace at line 145

### Testing Results ✅

**Device:** Pixel 2 (Android 11) via Expo Go
**Features Tested:**
- ✅ Formula Finder with shortage alerts
- ✅ Search functionality (returns 2 locations)
- ✅ Shortage alert banner with severity/trend
- ✅ Status badges color-coded correctly
- ✅ Confidence scores and time ago formatting

**Files Modified:**
- `/app/app/scanner/index.tsx` - Switched to expo-camera
- `/app/app.json` - Updated plugins
- `/app/app/benefits/index.tsx` - Fixed syntax error
- `/backend/src/services/WalmartInventoryIntegration.ts` - Fixed TypeScript
- `/backend/src/routes/formula.ts` - Removed apl_products joins

**Build Quota Saved:** 10+ development builds by using Expo Go instead of custom builds

---

**Status:** ✅ Week 2 Complete + Device Tested - Ready for Week 3

**Next Milestone:** Restock Alerts with push notifications
