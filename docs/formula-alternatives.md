# Formula Alternative Suggestions - Implementation Summary

**Feature ID:** A4.5
**Status:** Implemented
**Date:** February 2, 2026

## Overview

Implements intelligent alternative formula suggestions for WIC participants when their target formula is unavailable or experiencing shortages. This is a critical SURVIVAL feature during formula shortage crises.

## What Was Implemented

### Backend API

**Endpoint:** `GET /api/v1/formula/alternatives/:upc`

**Enhanced with:**
- Smart alternative matching based on formula type and form
- Integration with `formula_equivalents` table for explicit relationships
- Implicit alternative detection (same type, same form)
- WIC contract brand prioritization
- Real-time availability data integration when location is provided
- Intelligent sorting by compatibility, availability, and WIC coverage

**Query Parameters:**
- `state` (optional): State filter (default: MI)
- `lat`, `lng` (optional): User location for availability data
- `radius` (optional): Search radius in miles (default: 25)

**Response includes:**
- Primary formula details
- Up to 15 alternative formulas, each with:
  - Full product details (brand, name, type, form, size)
  - Relationship explanation (e.g., "Same type - Sensitive • WIC Contract Brand")
  - Medical notes (if available)
  - Availability at nearby stores (up to 3 locations per alternative)
  - Priority score for sorting

**Sorting Logic:**
1. In stock nearby → highest priority
2. WIC contract brands → priority boost
3. Relationship type (same product different size > same brand > same type > generic)
4. Distance to available stock

### Frontend Components

**New Screen:** `/app/formula/alternatives.tsx`
- Displays primary formula and alternatives
- Shows medical disclaimer prominently
- Handles location permission gracefully
- Allows tapping alternatives to search for that formula

**New Component:** `FormulaAlternatives.tsx`
- Reusable alternatives list component
- Color-coded availability badges
- Clear reason explanations for each suggestion
- WIC contract brand indicators
- Availability info with distance

**Integration Points:**

1. **Formula Finder** (`/app/formula/index.tsx`)
   - "View Alternative Formulas" button under assigned formula
   - Alternatives suggested in shortage alerts for user's formula

2. **Cross-Store Search** (ready for future integration)
   - Can link from alternatives to search specific formula

### Database Schema

Uses existing `formula_equivalents` table:
```sql
CREATE TABLE formula_equivalents (
  id SERIAL PRIMARY KEY,
  primary_upc VARCHAR(14) NOT NULL,
  equivalent_upc VARCHAR(14) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  state VARCHAR(2),
  notes TEXT
);
```

**Relationship Types:**
- `same_product_different_size` - Same formula, different container size
- `same_brand_different_type` - Same manufacturer, different formulation
- `generic_equivalent` - Store brand equivalent
- `medical_alternative` - Medically acceptable substitute

### Translations

Added English and Spanish translations for:
- Medical disclaimer text
- Alternative suggestion labels
- Reason explanations
- Availability indicators
- Error states

**New Translation Keys:**
- `alternatives.disclaimerTitle`
- `alternatives.disclaimerText`
- `alternatives.suggestedAlternatives`
- `alternatives.whySuggested`
- `alternatives.inStockNearby`
- `alternatives.wicContractBrand`
- And 12 more...

## User Experience

### Medical Safety First
- Prominent disclaimer: "Always consult your baby's pediatrician before switching formulas"
- Orange warning color for disclaimer card
- Appears at top of every alternatives list

### Smart Prioritization
Alternatives are shown in order of:
1. **Best match + available nearby** (green highlight, in-stock badge)
2. **WIC contract brands** (always covered by benefits)
3. **Same product, different size** (safest switch)
4. **Same brand, different type**
5. **Same type, different brand**
6. **Generic equivalents**

### Rich Context
Each alternative shows:
- Brand and product name
- Type, form, and size
- Why it's suggested (relationship explanation)
- WIC contract brand status
- Availability at nearby stores with distances
- Additional notes (if available)

### Seamless Integration
- One tap from formula finder to see alternatives
- Shortage alerts automatically suggest alternatives
- Can tap any alternative to search for it across stores

## Technical Highlights

### Performance
- Single database query with joins for efficiency
- Limits results to top 15 alternatives
- Availability data fetched in parallel
- Results cached at database level for 48 hours

### Scalability
- Uses existing database tables and indexes
- No additional storage required
- Gracefully handles missing data (location, equivalents)
- Works offline (degrades to implicit matching only)

### Error Handling
- Continues without location if permission denied
- Shows helpful error messages with retry option
- Handles missing formula data gracefully
- Falls back to implicit alternatives if no explicit equivalents

## Future Enhancements (Not Implemented)

1. **Machine Learning Suggestions**
   - Learn from successful switches in community
   - Predict alternatives based on shortage patterns

2. **Pharmacist/Pediatrician Network**
   - Link to telehealth for formula switching advice
   - Pre-approved alternative lists from providers

3. **Nutritional Comparison**
   - Side-by-side nutrient comparison
   - Allergen compatibility checking

4. **User Feedback Loop**
   - "This alternative worked for my baby"
   - Build community-driven alternative database

## Files Modified/Created

### Backend
- `/backend/src/routes/formula.ts` - Enhanced `/alternatives/:upc` endpoint
- Added helper functions for relationship prioritization

### Frontend
- `/app/app/formula/alternatives.tsx` - New alternatives screen (NEW)
- `/app/components/FormulaAlternatives.tsx` - Reusable component (NEW)
- `/app/app/formula/index.tsx` - Added alternatives buttons
- `/app/lib/services/api.ts` - Added `getFormulaAlternatives()` function
- `/app/lib/types/index.ts` - Added `FormulaAlternative` and `FormulaAlternativesResponse` types

### Translations
- `/app/lib/i18n/translations/en.json` - Added `alternatives.*` keys
- `/app/lib/i18n/translations/es.json` - Added Spanish translations

### Documentation
- `/docs/formula-alternatives.md` - This file (NEW)

## Testing Recommendations

1. **Test with real shortage data**
   - Verify alternatives appear when formula is unavailable
   - Check sorting prioritizes in-stock items

2. **Test location scenarios**
   - With location permission granted
   - With location permission denied
   - Without location services available

3. **Test different formula types**
   - Standard formulas (many alternatives)
   - Specialty formulas (fewer alternatives)
   - Store brand formulas (generic equivalents)

4. **Test translations**
   - Switch to Spanish and verify all text appears
   - Check disclaimer text is prominent in both languages

5. **Test navigation**
   - Tap alternative → cross-store search works
   - Back button returns to previous screen

## Success Metrics

Track these to measure feature impact:

1. **Alternatives Viewed** - How many users view alternatives during shortages
2. **Alternative Adopted** - Searches triggered for alternative formulas
3. **Time to Alternative** - Time from shortage alert to viewing alternative
4. **Medical Disclaimer Read** - Ensure safety message is seen
5. **Successful Switches** - Community reports of alternatives found in stock

## Harm Prevention

This feature directly addresses formula shortage crises:
- Prevents wasted trips to stores looking for unavailable formulas
- Provides medically-appropriate alternatives quickly
- Prioritizes WIC-covered alternatives (no cost to families)
- Includes critical pediatrician consultation reminder
- Shows real-time availability to reduce search time

**This is a SURVIVAL feature during formula shortages.**

---

*Implementation complete. Feature ready for testing and deployment.*
