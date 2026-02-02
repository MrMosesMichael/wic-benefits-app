# Formula Sightings Feature (A4.6)

## Overview
The Formula Sightings feature enables WIC participants to quickly report when they find infant formula in stock at stores during shortage periods. This crowdsourced data helps other families locate formula faster.

## Key Features

### Quick Report Modal
- **2-tap reporting**: Quantity → Store → Submit
- **Auto-location**: Detects nearby stores automatically
- **Minimal friction**: Designed for speed during emergencies
- **Impact messaging**: Shows how the report helps others

### Formula-Specific Optimizations
1. **Higher Base Confidence**: 70% (vs 60% for general products)
2. **Faster Decay**: Tagged as `formula_sighting` for time-sensitive filtering
3. **Location Verification**: +10 confidence bonus when GPS verified
4. **Cross-table Recording**: Records in both `formula_availability` and `product_sightings`

### Integration Points
Reports can be submitted from:
- Formula Finder main screen (Quick Report button)
- Cross-Store Search results (when single formula matched)
- Scanner result screen (existing sighting system)
- Formula alternatives screen (future enhancement)

## Backend API

### POST /api/v1/formula/report-simple
Reports formula availability with enhanced confidence scoring.

**Request:**
```json
{
  "upc": "00041220966677",
  "storeId": "walmart-12345",
  "quantitySeen": "plenty" | "some" | "few" | "none",
  "latitude": 42.3314,
  "longitude": -83.0458,
  "photo": "optional-base64-image"
}
```

**Response:**
```json
{
  "success": true,
  "report": {
    "id": "12345",
    "lastUpdated": "2026-02-02T10:30:00Z",
    "reportCount": 3,
    "storeName": "Walmart Supercenter",
    "status": "in_stock",
    "quantitySeen": "plenty"
  },
  "message": "Thank you for reporting! Your report helps other families find formula.",
  "impactMessage": "This report will help even more families find formula at Walmart Supercenter"
}
```

### Confidence Scoring
- **Base confidence**: 70 (higher than general products)
- **Location verified**: +10 (GPS matches store location)
- **Multiple reports**: +5 per additional report (capped at 95)
- **Source tag**: `formula_sighting` (vs `crowdsourced`)

### Data Decay
Formula sightings decay faster than general product reports:
- **< 2 hours**: 100% confidence
- **2-6 hours**: 90% confidence
- **6-12 hours**: 75% confidence
- **12-24 hours**: 60% confidence
- **24-48 hours**: 40% confidence
- **> 48 hours**: Data expires (not shown)

## Frontend Components

### FormulaSightingModal
**Location**: `/app/components/FormulaSightingModal.tsx`

**Props:**
- `visible`: boolean - Modal visibility
- `onClose`: () => void - Close handler
- `formulaUpc`: string - UPC of formula to report
- `formulaName`: string - Display name of formula
- `preselectedStoreId?`: string - Optional pre-selected store

**Features:**
- Auto-location detection
- Store auto-selection (closest or preselected)
- Quantity selector (none/few/some/plenty)
- Success animation with impact message
- Auto-closes after 2 seconds on success

### QuantitySelector
**Location**: `/app/components/QuantitySelector.tsx`

Reuses existing component with options:
- **None** (Out of stock) - Red
- **Few** (1-3 items) - Orange
- **Some** (4-10 items) - Green
- **Plenty** (10+ items) - Blue

## Database Schema

### formula_availability table
Enhanced fields:
- `source`: Can be 'formula_sighting', 'crowdsourced', or 'api'
- `confidence`: 0-100, higher for formula sightings
- `report_count`: Tracks multiple reports
- `last_updated`: Timestamp for decay calculation

### product_sightings table
Dual recording for analytics:
- Tracks same data for cross-product analysis
- Used by general sighting system
- Enables shortage detection algorithms

## Usage Patterns

### High-Priority Flow (Shortage Mode)
1. User sees formula at store
2. Opens app → Formula Finder
3. Taps "Quick Report - I Found This!"
4. Selects quantity (2 taps)
5. Confirms store (1 tap)
6. Submits → Success message

**Total time**: ~10-15 seconds

### Discovery Flow (Search Mode)
1. User searches for formula (cross-store search)
2. Finds single formula match
3. Sees "Found This Formula? Report It!" button
4. Quick report flow (same as above)

### Verification Flow (Scan Mode)
1. User scans formula barcode
2. Views product details
3. Can report sighting from existing sighting section
4. Full report flow (already implemented)

## Internationalization

### English (en.json)
```json
"formulaSighting": {
  "modalTitle": "Report Formula Sighting",
  "modalSubtitle": "Help other families find formula",
  "quantityQuestion": "How much {{formula}} did you see?",
  "storeQuestion": "Where did you see it?",
  "thankYou": "Thank You!",
  "impactMessage": "Your report helps other families find formula"
}
```

### Spanish (es.json)
```json
"formulaSighting": {
  "modalTitle": "Reportar Avistamiento de Fórmula",
  "modalSubtitle": "Ayude a otras familias a encontrar fórmula",
  "quantityQuestion": "¿Cuánto {{formula}} vio?",
  "storeQuestion": "¿Dónde lo vio?",
  "thankYou": "¡Gracias!",
  "impactMessage": "Su reporte ayuda a otras familias a encontrar fórmula"
}
```

## Future Enhancements

### Photo Capture (Optional)
- Camera integration for proof
- Shelf photos show quantity visually
- Helps prevent false reports
- Stored as base64 or cloud URL

### Smart Notifications
- Notify users when their formula reported nearby
- Push notifications for critical sightings
- SMS alerts during severe shortages

### Report Verification
- Admin dashboard to review reports
- Flag suspicious patterns
- Reward helpful reporters
- Ban spam accounts

### Advanced Analytics
- Track shortage patterns by region
- Predict restocking times
- Identify reliable reporters
- Generate shortage alerts

## Harm Prevention

### Design Decisions
1. **No "out of stock" only reports**: Must allow all statuses to prevent wasted trips
2. **Show report age**: Users see how recent data is
3. **Confidence scoring**: Helps users judge reliability
4. **Auto-decay**: Old data expires automatically
5. **Location verification**: GPS check prevents false locations

### Privacy
- Reports are anonymous (no user ID stored)
- Location is store-level, not user's exact position
- Photos are optional (not implemented yet)
- No personal information collected

## Performance Considerations

### Optimizations
1. **Cached location**: Reuse user's location across app
2. **Store pre-loading**: Load nearby stores on app start
3. **Modal pre-mount**: Ready to show instantly
4. **Auto-close success**: Don't block user flow
5. **Offline queuing**: Save reports when offline (future)

### Database Indexes
```sql
-- For fast sighting lookups
CREATE INDEX idx_formula_availability_upc ON formula_availability(upc);
CREATE INDEX idx_formula_availability_updated ON formula_availability(last_updated);
CREATE INDEX idx_formula_availability_source ON formula_availability(source);

-- For location queries
CREATE INDEX idx_formula_availability_coords ON formula_availability(latitude, longitude);
```

## Testing

### Manual Test Cases
1. **Happy path**: Report plenty of formula at known store
2. **No location**: Report without GPS (should work with manual store select)
3. **No stores**: Test with location services disabled
4. **Multiple reports**: Same user reports same formula again
5. **Old data**: Verify reports older than 48h are filtered out
6. **Spanish**: Test all flows in Spanish language

### API Test Cases
```bash
# Test formula sighting report
curl -X POST http://localhost:3000/api/v1/formula/report-simple \
  -H "Content-Type: application/json" \
  -d '{
    "upc": "00041220966677",
    "storeId": "walmart-12345",
    "quantitySeen": "plenty",
    "latitude": 42.3314,
    "longitude": -83.0458
  }'

# Verify confidence scoring
# Expected: 70 (base) + 10 (location verified) = 80

# Test without location
curl -X POST http://localhost:3000/api/v1/formula/report-simple \
  -H "Content-Type: application/json" \
  -d '{
    "upc": "00041220966677",
    "storeId": "walmart-12345",
    "quantitySeen": "few"
  }'

# Expected: 70 (base only)
```

## Metrics to Track

### User Engagement
- Reports submitted per day
- Time from app open to report submission
- Report completion rate (started vs completed)
- Repeat reporters

### Data Quality
- Average confidence score
- Location verification rate
- Reports with multiple confirmations
- False report rate (admin flagged)

### Impact
- Reports during active shortages vs normal times
- Time between report and next user search
- User searches that found recent sightings
- Estimated families helped per report

## Related Files

### Backend
- `/backend/src/routes/formula.ts` - Formula API endpoints
- `/backend/src/routes/sightings.ts` - General sightings API
- `/backend/migrations/004_product_sightings.sql` - Sightings table

### Frontend
- `/app/components/FormulaSightingModal.tsx` - Quick report modal
- `/app/components/QuantitySelector.tsx` - Quantity picker
- `/app/app/formula/index.tsx` - Formula finder screen
- `/app/app/formula/cross-store-search.tsx` - Cross-store search
- `/app/app/scanner/result.tsx` - Scanner result screen
- `/app/lib/services/api.ts` - API client methods

### Translations
- `/app/lib/i18n/translations/en.json` - English strings
- `/app/lib/i18n/translations/es.json` - Spanish strings

## See Also
- [Formula Features Overview](./FORMULA_FEATURES.md)
- [Crowdsourced Inventory System](../docs/archive/crowdsourced_inventory.md)
- [Shortage Detection](./SHORTAGE_DETECTION.md)
