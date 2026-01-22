# WIC Benefits App - Testing Plan v2
**Date**: 2026-01-22
**Branch**: `pre-prod-local-testing`
**Testers**: Development team + User testing group

## 🎯 Testing Objectives

Test all features added since last testing session (post bug fix deployment):

### What's New Since Last Testing
1. ✅ **Bug Fixes** (Already tested):
   - BUG-001: Scan Another Product button navigation
   - BUG-002: Cart confirmation truncated name
   - BUG-003: UPC lookup normalization

2. 🆕 **Phase 5: Manual Benefits Entry** (R1-R5 complete per tasks.md)
3. 🆕 **Backend Infrastructure** (Not directly testable in app yet):
   - Formula availability tracking (A4.1)
   - Shortage detection (A4.2)
   - Notification system (A4.3) - requires integration

## 📋 Test Plan Overview

**Testing Timeline**: 2-3 hours
**Devices Needed**:
- Android phone (primary)
- iPhone (if available)
- Different screen sizes recommended

**Prerequisites**:
- Fresh app install OR uninstall previous version first
- Stable internet connection
- Access to WIC-eligible products (or test UPCs)
- Real store locations nearby

---

## 🧪 Test Session 1: Scanner & Core Functionality (Regression Testing)

**Goal**: Ensure previous bugs stay fixed and core features still work

### Test 1.1: Product Scanning - Basic Flow

**Steps**:
1. Open app
2. Tap camera/scanner button
3. Grant camera permissions if prompted
4. Scan a WIC-eligible product (or use test UPC: `889497008245` - Juicy Juice)
5. View scan result

**Expected Results**:
- ✅ Scanner opens with camera view
- ✅ Product recognized and name displayed (not just UPC)
- ✅ Eligibility status shown clearly (Eligible/Not Eligible)
- ✅ Product image displayed (if available)

**Bug Check**:
- ❌ Scanner shows black screen → FAIL (camera permission issue)
- ❌ UPC not found (for known product) → FAIL (database issue)
- ❌ Generic name shown instead of brand → Check database

---

### Test 1.2: Scan Another Product Button (BUG-001 Fix)

**Steps**:
1. Scan a product
2. View result screen
3. Tap "Scan Another Product" button

**Expected Results**:
- ✅ Returns directly to scanner/camera view
- ✅ NOT to home screen
- ✅ Can immediately scan next product

**Bug Check**:
- ❌ Goes to home screen → FAIL (BUG-001 regression)

---

### Test 1.3: Cart Confirmation - Full Product Name (BUG-002 Fix)

**Steps**:
1. Scan eligible product (e.g., 1% Milk UPC: `041303054734`)
2. Tap "Add to Cart" (if in Shopping Mode)
3. View cart item

**Expected Results**:
- ✅ Shows FULL product name: "Great Value 1% Lowfat Milk"
- ✅ NOT truncated to "1%" or partial name
- ✅ Brand name included

**Bug Check**:
- ❌ Shows only "1%" or truncated name → FAIL (BUG-002 regression)

---

### Test 1.4: UPC Lookup Normalization (BUG-003 Fix)

**Test UPCs** (should all work):
- `889497008245` - Juicy Juice (12-digit)
- `070074000343` - Similac formula (12-digit)
- `041303054734` - Great Value Milk (12-digit)

**Steps**:
1. Scan or manually enter each UPC
2. Check if product is recognized

**Expected Results**:
- ✅ All UPCs recognized
- ✅ Products matched correctly
- ✅ No "Product not found" errors for known products

**Bug Check**:
- ❌ UPC not found (for products in database) → FAIL (normalization issue)

---

## 🆕 Test Session 2: Manual Benefits Entry (Phase 5 Features)

**Goal**: Test new manual benefits entry system for states without eWIC integration

### Test 2.1: Manual Benefits Entry Screen Access

**Steps**:
1. Open app
2. Navigate to Benefits screen/tab
3. Look for "Manual Entry" or "Add Benefits" option
4. Tap to open manual entry screen

**Expected Results**:
- ✅ Manual entry screen opens
- ✅ Shows form with category dropdowns
- ✅ Shows amount input fields
- ✅ Shows date pickers for benefit period

**Bug Check**:
- ❌ Can't find manual entry option → Check navigation/UI
- ❌ Screen crashes on open → FAIL (check logs)

---

### Test 2.2: Enter Manual Benefits - Milk Category

**Steps**:
1. Open manual benefits entry
2. Select category: "Milk"
3. Enter amount: "4"
4. Select unit: "gallons"
5. Select benefit period start: First day of current month
6. Select benefit period end: Last day of current month
7. Tap "Save" or "Add"

**Expected Results**:
- ✅ Benefit saved successfully
- ✅ Confirmation message shown
- ✅ Returns to benefits overview
- ✅ Shows milk: 4 gallons available

**Bug Check**:
- ❌ Can't select category → UI issue
- ❌ Amount doesn't save → Backend issue
- ❌ No confirmation → UX issue

---

### Test 2.3: Enter Multiple Benefit Categories

**Steps**:
Add these benefits manually:
1. Milk: 4 gallons
2. Cheese: 1 lb
3. Eggs: 2 dozen
4. Cereal: 36 oz
5. Juice: 128 oz

**Expected Results**:
- ✅ All categories saved
- ✅ Benefits overview shows all items
- ✅ Amounts display correctly
- ✅ Units displayed correctly (gallons, lb, dozen, oz)

---

### Test 2.4: Log a Purchase (Manual Tracking)

**Steps**:
1. Go to benefits screen
2. Look for "Log Purchase" or similar option
3. Select product: Milk
4. Enter quantity used: 1 gallon
5. Save

**Expected Results**:
- ✅ Purchase logged successfully
- ✅ Milk balance decreases: 4 → 3 gallons
- ✅ Status updated (if applicable)

**Bug Check**:
- ❌ Balance doesn't update → Backend issue
- ❌ Wrong calculation → Math error

---

### Test 2.5: Benefits Period Rollover

**Steps**:
1. Check current benefits
2. Navigate to period settings (if available)
3. Note benefit period dates
4. Try to set new period (next month)

**Expected Results**:
- ✅ Can see current period dates
- ✅ Can set new period
- ✅ Warning shown if period changes with active cart

**Bug Check**:
- ❌ Can't change period → Feature missing
- ❌ Old benefits don't clear → Rollover logic issue

---

### Test 2.6: OCR Benefit Statement Scanning (If Implemented)

**Prerequisites**: Have a WIC benefit statement (paper or photo)

**Steps**:
1. Go to manual entry
2. Look for "Scan Statement" or camera icon
3. Take photo of benefit statement
4. Wait for OCR processing
5. Review extracted benefits
6. Confirm/edit if needed
7. Save

**Expected Results**:
- ✅ Camera opens
- ✅ Can capture statement image
- ✅ OCR extracts benefit amounts
- ✅ User can review before saving
- ✅ Extracted data is accurate (or editable)

**Bug Check**:
- ❌ OCR extracts wrong data → May need adjustment
- ❌ Can't edit extracted data → UX issue
- ❌ Feature not visible → May not be implemented yet

---

## 🔍 Test Session 3: Integration & Edge Cases

### Test 3.1: Scan + Manual Benefits Integration

**Steps**:
1. Enter manual benefit: Milk - 4 gallons
2. Go to scanner
3. Scan milk product
4. Check if app knows your milk balance

**Expected Results**:
- ✅ Scanner shows "You have 4 gallons available"
- ✅ Eligible status considers your benefits
- ✅ Can add to cart

**Bug Check**:
- ❌ Scanner doesn't see manual benefits → Integration issue

---

### Test 3.2: Shopping Mode with Manual Benefits

**Steps**:
1. Enter manual benefits for multiple categories
2. Enable Shopping Mode
3. Scan several products
4. Add to cart
5. Go to checkout
6. Complete checkout

**Expected Results**:
- ✅ Cart shows items
- ✅ Warns if exceeding benefits
- ✅ Checkout updates manual balances
- ✅ Remaining benefits shown after checkout

---

### Test 3.3: Data Persistence (App Restart)

**Steps**:
1. Enter manual benefits
2. Add items to cart (don't checkout)
3. Force close app
4. Reopen app

**Expected Results**:
- ✅ Manual benefits still there
- ✅ Cart items still there
- ✅ No data loss

**Bug Check**:
- ❌ Benefits cleared → Storage issue
- ❌ Cart cleared → Persistence issue

---

### Test 3.4: Offline Functionality

**Steps**:
1. Enter manual benefits (online)
2. Turn on airplane mode
3. Try to scan products
4. Try to view benefits
5. Try to add to cart
6. Turn off airplane mode
7. Check if data syncs

**Expected Results**:
- ✅ Cached data still visible
- ✅ Can scan cached products
- ✅ Can view manual benefits offline
- ✅ Shows "offline" indicator
- ✅ Data syncs when online

**Bug Check**:
- ❌ App crashes offline → Handle network errors
- ❌ No offline indicator → UX issue

---

## 🌐 Test Session 4: Multi-Language Support (If Implemented)

### Test 4.1: Spanish Language Toggle

**Steps**:
1. Go to Settings
2. Find Language option
3. Change to Spanish
4. Navigate through app

**Expected Results**:
- ✅ All UI text in Spanish
- ✅ Category names translated
- ✅ Error messages in Spanish
- ✅ Scanner results in Spanish

**Note**: If not implemented, mark as "Feature not available yet"

---

## 📊 Test Session 5: Performance & Usability

### Test 5.1: Scanner Performance

**Steps**:
1. Scan 10 products in a row
2. Time how long each scan takes
3. Note any delays or stutters

**Expected Results**:
- ✅ Scans complete in < 2 seconds
- ✅ No camera freezes
- ✅ Smooth navigation between scans

---

### Test 5.2: App Responsiveness

**Steps**:
1. Navigate through all screens
2. Tap buttons rapidly
3. Switch between tabs
4. Enter data in forms

**Expected Results**:
- ✅ No crashes
- ✅ UI responds quickly (< 300ms)
- ✅ No stuck screens
- ✅ Back button works everywhere

---

### Test 5.3: Large Data Sets

**Steps**:
1. Enter 20+ manual benefit items
2. Add 20+ items to cart
3. Scroll through lists
4. Search if available

**Expected Results**:
- ✅ Lists scroll smoothly
- ✅ No lag with many items
- ✅ Search works (if available)

---

## 🐛 Bug Reporting Template

When you find a bug, report it with this format:

```
**Bug ID**: [Unique identifier, e.g., BUG-004]
**Severity**: [Critical / High / Medium / Low]
**Device**: [Phone model, Android version]
**App Version**: [From About screen or build number]

**Summary**: [One-line description]

**Steps to Reproduce**:
1. [Exact steps]
2. [Be specific]
3. [Include data entered]

**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]

**Screenshots**: [Attach if possible]
**Logs**: [Check logcat if available]

**Workaround**: [If any]
**Frequency**: [Always / Sometimes / Rare]
```

### Example Bug Report
```
**Bug ID**: BUG-004
**Severity**: Medium
**Device**: Samsung Galaxy S21, Android 13
**App Version**: 1.0.0-beta2

**Summary**: Manual benefits not saving when amount is decimal

**Steps to Reproduce**:
1. Open manual benefits entry
2. Select Milk category
3. Enter amount: 2.5 (decimal)
4. Select unit: gallons
5. Tap Save

**Expected Result**: Should save 2.5 gallons
**Actual Result**: Error message "Invalid amount" or rounds to 2

**Screenshots**: [Attached]

**Workaround**: Enter whole numbers only
**Frequency**: Always
```

---

## 📝 Test Execution Checklist

### Pre-Testing Setup
- [ ] Fresh app install completed
- [ ] Camera permissions granted
- [ ] Location permissions granted (if asked)
- [ ] Internet connection verified
- [ ] Test UPCs prepared
- [ ] WIC statement available (for OCR test)
- [ ] Bug report template ready

### Testing Execution
- [ ] Session 1: Scanner regression tests (30 min)
- [ ] Session 2: Manual benefits entry (45 min)
- [ ] Session 3: Integration tests (30 min)
- [ ] Session 4: Language tests (15 min, if applicable)
- [ ] Session 5: Performance tests (20 min)

### Post-Testing
- [ ] Bug reports filed
- [ ] Screenshots collected
- [ ] Test results documented
- [ ] Feedback session with team
- [ ] Prioritize bugs for fix

---

## 🎯 Success Criteria

### Must Pass (Critical)
- ✅ All Phase 0 bugs remain fixed
- ✅ No app crashes during normal use
- ✅ Scanner successfully scans products
- ✅ Manual benefits can be added and saved
- ✅ Data persists across app restarts

### Should Pass (High Priority)
- ✅ Manual benefits integrate with scanner
- ✅ Shopping mode works with manual benefits
- ✅ Offline mode shows cached data
- ✅ App is responsive (no lag)

### Nice to Have (Medium Priority)
- ✅ OCR statement scanning works
- ✅ Spanish language complete
- ✅ Smooth performance with large datasets

---

## 📞 Support & Questions

**During Testing**:
- Take screenshots of any issues
- Note exact steps that caused problems
- Check device logs if app crashes
- Test on different screen sizes if possible

**After Testing**:
- File bugs using template above
- Suggest improvements
- Report confusing UX
- Share user feedback

---

## 📱 Next Steps After Testing

1. **Triage Bugs**: Categorize by severity
2. **Fix Critical Bugs**: Address P0 issues first
3. **User Feedback Session**: Discuss findings with test users
4. **Plan Next Sprint**: Decide what to fix/improve
5. **Retest**: Verify bug fixes in next build

---

**Ready to Test!** Follow this plan, report bugs clearly, and help make the WIC app better for families. 💙
