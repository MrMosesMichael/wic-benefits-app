# Formula Features Implementation Guide

> How the formula tracking, shortage detection, and alert system works.

**Archive References:**
- Implementation plan: `docs/archive/PHASE1_MISSING_FEATURES_PLAN.md`
- Week 1 (MVP): `docs/archive/FORMULA_FINDER_WEEK1_COMPLETE.md`
- Week 2 (Shortage): `docs/archive/FORMULA_FINDER_WEEK2_COMPLETE.md`
- Device testing: `docs/archive/FORMULA_FINDER_DEVICE_TESTING_JAN19.md`

---

## Feature Overview

| Feature | Status | Description |
|---------|--------|-------------|
| Formula Finder | Done | Search for formula across stores |
| Shortage Detection | Done | Detect regional shortages |
| Restock Alerts | Done | Push notifications when formula found |
| Alternative Suggestions | Done | WIC-approved formula substitutes |
| Cross-Store Search | Done | Multi-store availability comparison |

---

## Database Schema

### formula_availability

```sql
CREATE TABLE formula_availability (
  id SERIAL PRIMARY KEY,
  upc VARCHAR(14) NOT NULL,
  store_id INTEGER REFERENCES stores(id),
  status VARCHAR(20) CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock', 'unknown')),
  quantity_range VARCHAR(20) CHECK (quantity_range IN ('few', 'some', 'plenty')),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(20) CHECK (source IN ('api', 'scrape', 'crowdsourced')),
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100)
);

CREATE INDEX idx_formula_upc_store ON formula_availability(upc, store_id);
CREATE INDEX idx_formula_updated ON formula_availability(last_updated);
```

### formula_shortages

```sql
CREATE TABLE formula_shortages (
  id SERIAL PRIMARY KEY,
  formula_category VARCHAR(100) NOT NULL,
  affected_upcs TEXT[] NOT NULL,
  region VARCHAR(100) NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('moderate', 'severe', 'critical')),
  percent_stores_affected DECIMAL(5,2),
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  trend VARCHAR(20) CHECK (trend IN ('worsening', 'stable', 'improving'))
);
```

### formula_alerts

```sql
CREATE TABLE formula_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  formula_upcs TEXT[] NOT NULL,
  max_distance_miles INTEGER DEFAULT 10,
  notification_method VARCHAR(20) DEFAULT 'push',
  specific_store_ids INTEGER[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  last_notified TIMESTAMP,
  active BOOLEAN DEFAULT TRUE
);
```

---

## Shortage Detection Algorithm

From `docs/archive/PHASE1_MISSING_FEATURES_PLAN.md`:

```typescript
async function detectShortages() {
  // For each formula UPC:
  // 1. Calculate % of stores out of stock in region
  // 2. If >50%, flag as shortage
  // 3. Track trend (worsening/stable/improving)
}
```

### Severity Levels

| Severity | Threshold | Color | Action |
|----------|-----------|-------|--------|
| Critical | 90%+ stores out | Red | Contact WIC office |
| Severe | 70-90% stores out | Orange | Expand search radius |
| Moderate | 50-70% stores out | Yellow | Check nearby stores |

### Trend Detection

- **Minimum 3 stores** required (prevents false positives)
- **10% threshold** for trend changes (prevents noise)
- **Trends:** worsening, stable, improving

---

## API Endpoints

```
GET /api/v1/formula/availability?lat={lat}&lng={lng}&radius={miles}
GET /api/v1/formula/search
GET /api/v1/formula/shortages?region={region}
GET /api/v1/formula/alternatives/{upc}
POST /api/v1/formula/sightings
```

---

## Confidence Scoring (Crowdsourced)

Time-based decay for crowdsourced sightings:

| Age | Confidence |
|-----|------------|
| < 2 hours | 100% |
| 2-6 hours | 90% |
| 6-12 hours | 70% |
| 12-24 hours | 50% |
| 24-48 hours | 30% |
| > 48 hours | 20% |

**Bonuses:**
- +4% per "helpful" mark
- +10% for verified location

---

## Frontend Components

### Formula Finder Screen

Location: `app/app/formula/index.tsx`

Features:
- Search by formula type
- Radius selector (5/10/25/50 miles)
- Results with availability status
- Store distance and directions
- "I found this!" quick report button

### Shortage Alert Banner

Display when shortage detected:
- Color-coded by severity
- Shows trend indicator
- Links to alternative suggestions

### Formula Dashboard Card (Home Screen)

- Quick access for infant participants
- Prominent "Find Formula" button
- Shows active alerts count

---

## Push Notifications

### Alert Matching Logic

When formula availability changes to `in_stock`:
1. Find active alerts matching UPC + distance
2. Send push notification
3. Rate limit: max 1 per 30 minutes

### Notification Content

```
Title: "Formula Available!"
Body: "Similac found at Walmart #2719 - 30 min ago"
Action: Navigate to store details
```

---

## Alternative Formula Mapping

Types of alternatives:
- Same brand, different sizes
- Powder vs concentrate vs ready-to-feed
- Generic equivalents (state-specific)
- Medical exception contacts

Database: 100+ formula equivalents seeded

---

## Testing

### Run Shortage Detection

```bash
cd backend
npm run detect-shortages
```

### Seed Test Data

```bash
npm run seed-shortage-test-data
```

### Verify Detection

```sql
SELECT * FROM formula_shortages
WHERE detected_at > NOW() - INTERVAL '1 day'
ORDER BY detected_at DESC;
```

---

## Device Testing Notes

From `docs/archive/FORMULA_FINDER_DEVICE_TESTING_JAN19.md`:

**Tested on:** Pixel 2, Android 11

**Verified:**
- Formula search returns results
- Shortage alerts display correctly
- Color coding matches severity
- Trend indicators work
- "I found this" reporting works
- Confidence scores decay over time

---

## Key Files

```
app/
├── app/formula/
│   └── index.tsx              # Formula finder screen
├── components/
│   ├── FormulaSearch.tsx
│   ├── ShortageAlert.tsx
│   └── AlternativeSuggestions.tsx
└── lib/services/
    └── formulaService.ts

backend/
├── src/routes/
│   └── formula.ts             # API endpoints
├── src/services/
│   └── shortageDetection.ts
├── src/scripts/
│   ├── detect-shortages.ts
│   └── seed-shortage-test-data.ts
└── migrations/
    └── 006_shortage_detection_enhancements.sql
```

---

## Why This Matters

> "Formula shortages are life-threatening for infants 0-6 months. Parents drive hours searching. This cannot wait."
> — From project roadmap

This feature is marked as **SURVIVAL** priority because:
- Infants 0-6 months cannot eat alternatives
- Parents desperately search during shortages
- Every hour matters in a crisis
- Community reporting is faster than official channels

---

*Last Updated: February 2026*
