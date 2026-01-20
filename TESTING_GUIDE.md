# WIC Benefits App - Testing Guide

> Michigan MVP - End-to-End Testing Instructions

## Prerequisites

### Backend Setup

1. **PostgreSQL Database**
   - Install PostgreSQL 16+ locally OR use hosted service (Railway/Supabase)
   - Create database: `createdb wic_benefits`

2. **Configure Environment**
   ```bash
   cd backend
   cp .env.example .env
   ```

   Edit `.env`:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/wic_benefits
   PORT=3000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:8081,exp://localhost:8081
   ```

3. **Install Dependencies & Run Migrations**
   ```bash
   npm install
   npm run migrate
   ```

4. **Import Michigan APL Data** (Optional but Recommended)
   - Download Michigan APL Excel file from: https://www.michigan.gov/mdhhs/assistance-programs/wic/wicvendors/wic-foods
   - Save as `backend/data/michigan-apl.xlsx`
   - Run: `npm run import-apl`

   If you skip this step, the app will use the 5 sample products from the migration.

5. **Start Backend Server**
   ```bash
   npm run dev
   ```

   Verify at http://localhost:3000/health (should return `{"status":"healthy","database":"connected"}`)

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd app
   npm install
   ```

2. **Start Expo Dev Server**
   ```bash
   npm start
   ```

## Testing Scenarios

### Test 1: Backend API Endpoints

**Verify Health Check**
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"healthy","database":"connected"}`

**Test Eligibility Check (Sample Product)**
```bash
curl http://localhost:3000/api/v1/eligibility/041220576067
```
Expected: Returns WIC-approved milk product

**Test Benefits Retrieval**
```bash
curl http://localhost:3000/api/v1/benefits?household_id=1
```
Expected: Returns demo household with benefits

### Test 2: Frontend App Navigation

1. Launch app on iOS simulator, Android emulator, or physical device
2. Verify home screen displays:
   - "WIC Benefits Assistant" title
   - "Michigan Edition" subtitle
   - "Scan Product" button
   - "View Benefits" button

3. Navigate to Benefits screen
   - Should show "Demo Child" participant
   - Should display 4 benefit categories (Milk, Eggs, Cereal, Peanut Butter)
   - Pull to refresh should work

4. Navigate to Scanner screen
   - Should request camera permission
   - Should show fullscreen camera view with scanning frame

### Test 3: Barcode Scanning (Physical Device Required)

**iOS Simulators and most Android emulators don't support camera. Test on physical device.**

**Sample UPCs from Migration:**
- `041220576067` - Great Value Whole Milk ✅ WIC Approved
- `041220576074` - Great Value 2% Milk ✅ WIC Approved
- `007874213959` - Great Value Large Eggs ✅ WIC Approved
- `016000275256` - General Mills Cheerios ✅ WIC Approved
- `037600100670` - Jif Peanut Butter ✅ WIC Approved

**Testing UPCs (Not in APL):**
- `012000161643` - Coca-Cola ❌ Not WIC Approved
- Any other random product

**Test Flow:**
1. Tap "Scan Product" on home screen
2. Grant camera permission if prompted
3. Point camera at barcode
4. Wait for automatic scan and eligibility check
5. Verify result screen shows:
   - Green "WIC Approved" OR Red "Not WIC Approved"
   - Product name and UPC
   - Category (if eligible)
   - Reason text

6. Test navigation from result screen:
   - "Scan Another Product" → Returns to scanner
   - "View My Benefits" → Goes to benefits screen
   - "Back to Home" → Returns to home screen

### Test 4: Error Handling

**Backend Down:**
1. Stop backend server
2. Try scanning a product
3. Should show error: "Failed to check product eligibility"

**Network Error:**
1. Put device in airplane mode
2. Try loading benefits
3. Should show: "Failed to load benefits. Please check your connection."
4. Verify "Retry" button works after re-enabling network

**Invalid UPC:**
1. Create a fake barcode image with invalid format
2. Scan it
3. Should query API and return "Not WIC Approved"

### Test 5: Camera Permissions

**iOS:**
1. Open Settings → Privacy & Security → Camera
2. Toggle off permission for WIC Benefits
3. Open app and tap "Scan Product"
4. Should show "Camera permission is required"
5. Tap "Grant Permission"
6. Should open Settings app

**Android:**
1. Open Settings → Apps → WIC Benefits → Permissions
2. Deny camera access
3. Follow similar flow as iOS

### Test 6: API Integration

**Check Request/Response:**
1. Open Expo dev tools network tab
2. Scan a product
3. Verify API call to `/api/v1/eligibility/:upc`
4. Check response structure matches expected format

## Testing with Real Michigan APL Data

If you imported the full Michigan APL:

1. Find common Michigan WIC products in your pantry
2. Scan actual barcodes
3. Verify eligibility matches official Michigan WIC guidance
4. Test edge cases:
   - Products with size restrictions
   - Different brands of same category
   - Organic vs conventional

## Known Limitations in MVP

1. **No Shopping Cart** - Scanning doesn't affect benefits yet
2. **No Checkout Flow** - Benefits don't decrease with purchases
3. **Single Household** - Always uses demo household (ID=1)
4. **No User Auth** - No login/signup yet
5. **No Offline Mode** - Requires internet connection
6. **Manual UPC Entry** - No fallback if barcode won't scan
7. **Limited Product Info** - Only shows what's in APL, no images

## Success Criteria

MVP is successful when:
- ✅ User can launch app
- ✅ User can view their benefits
- ✅ User can scan a product barcode (on physical device)
- ✅ User sees green/red result based on Michigan APL
- ✅ 95%+ accuracy for Michigan WIC products
- ✅ App handles errors gracefully

## Troubleshooting

**Camera not working:**
- iOS Simulator doesn't support camera - use physical device
- Check camera permissions in Settings
- Verify vision-camera is properly installed

**"Cannot connect to backend":**
- Check backend is running on http://localhost:3000
- Check CORS settings in backend/.env
- For physical device: Use computer's IP instead of localhost (e.g., http://192.168.1.100:3000)
  - Update `app/lib/services/api.ts` with your local IP

**Barcode not scanning:**
- Ensure good lighting
- Hold steady, not too close/far
- Try different angle
- Verify barcode is UPC-A, UPC-E, or EAN-13 format

**Database errors:**
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in .env
- Re-run migrations: `npm run migrate`

## Next Steps After Testing

Once MVP testing is complete:
1. Document bugs/issues found
2. Test with real Michigan WIC participants (beta)
3. Gather feedback on UX/UI
4. Prioritize next features:
   - Shopping cart
   - Formula tracking
   - Spanish language
   - Additional states
