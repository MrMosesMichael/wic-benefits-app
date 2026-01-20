# Crowdsourced Inventory - Testing Guide

## Feature Overview

Community-powered product availability reporting. Users can:
- View recent sightings from other WIC participants
- Report where they found products
- See stock levels (Plenty/Some/Low/Out)
- View confidence scores based on report age

## Testing on Device

### Prerequisites
- Backend running: `cd backend && npm start`
- App running: `cd app && npx expo start`
- Test UPCs available:
  - **016000275256** - Cheerios (has test sighting)
  - **0886926045833** - Has 3 test sightings

### Test Flow 1: View Existing Sightings

1. Open app → Scan Product
2. Scan UPC: **0886926045833**
3. On scan result screen, scroll to "Community Reports" section
4. Should see 3 recent sightings:
   - Walmart Supercenter - "In Stock" (green badge)
   - Meijer Store #145 - "Low Stock" (orange badge)
   - Kroger #892 - "Out of Stock" (gray badge)
5. Verify each shows:
   - Store name
   - Stock level badge (color-coded)
   - Age ("Just now" or "Xh ago")
   - Confidence percentage

### Test Flow 2: Report New Sighting

1. On scan result screen, tap "+ Report Sighting" button
2. Modal should open with form:
   - Store Name text input
   - Stock Level buttons (Plenty/Some/Low/Out)
3. Enter store name: "Target Store #5678"
4. Select stock level: "Plenty"
5. Tap "Submit Report"
6. Should see success alert: "Your sighting has been reported..."
7. Sightings list should refresh and show your new report at top

### Test Flow 3: Report Without Store Name

1. Tap "+ Report Sighting"
2. Leave store name empty
3. Tap "Submit Report"
4. Should see error: "Please enter the store name."

### Test Flow 4: Product With No Sightings

1. Scan a different product (e.g., scan Cheerios: 016000275256)
2. "Community Reports" section should show:
   - "No recent reports. Be the first to report where you found this product!"
3. Tap "+ Report Sighting" and submit a report
4. Section should update to show your sighting

## Backend API Testing (Manual)

### Get Sightings
```bash
curl "http://localhost:3000/api/v1/sightings/0886926045833"
```

Expected: JSON with array of sightings

### Report Sighting
```bash
curl -X POST http://localhost:3000/api/v1/sightings/report \
  -H "Content-Type: application/json" \
  -d '{
    "upc": "016000275256",
    "storeName": "Walmart #1234",
    "stockLevel": "plenty"
  }'
```

Expected: `{"success": true, "sighting": {...}, "message": "Thank you for reporting!"}`

### Mark Helpful
```bash
curl -X POST http://localhost:3000/api/v1/sightings/1/helpful
```

Expected: `{"success": true, "helpfulCount": 1}`

## Visual Indicators

### Stock Level Colors
- **Plenty** = Green (#4CAF50) - "In Stock"
- **Some** = Amber (#FFA000) - "Some Left"
- **Few** = Orange (#FF6F00) - "Low Stock"
- **Out** = Gray (#9E9E9E) - "Out of Stock"

### Confidence Score
- 100% = Just reported (<2 hours)
- 90% = Recent (2-6 hours)
- 75% = Somewhat recent (6-12 hours)
- 60% = Same day (12-24 hours)
- 40% = Yesterday (24-48 hours)

## Edge Cases to Test

1. **Empty sightings**: Product with no reports shows helpful message
2. **Missing store name**: Validation prevents submission
3. **Many sightings**: Only shows top 3, with "+X more reports" message
4. **Just reported**: Shows "Just now" instead of "0h ago"
5. **Old reports**: Confidence degrades over time

## Known Limitations (MVP)

- No user location → distance not shown
- No "mark as helpful" button yet (backend ready, UI pending)
- No filtering by distance/stock level
- Reports are anonymous (no user accounts yet)
- 48-hour window for recent sightings

## Success Criteria

✅ Sightings load and display correctly
✅ Report modal opens and accepts input
✅ New reports appear in list after submission
✅ Stock level badges show correct colors
✅ Empty state shows for products with no sightings
✅ Validation prevents empty submissions

## Next Steps (Future Enhancements)

1. Add "Mark as Helpful" button on each sighting
2. Add location permissions → show distance
3. Add filtering (by distance, stock level)
4. Add formula-specific push notifications
5. Add reporting analytics/abuse prevention
