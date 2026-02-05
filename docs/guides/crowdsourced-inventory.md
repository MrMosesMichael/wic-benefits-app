# Crowdsourced Inventory Implementation Guide

> How the community-powered product sighting system works.

**Archive References:**
- Revised plan: `docs/archive/PHASE2_REVISED_PLAN.md`
- Completion report: `docs/archive/PHASE2_CROWDSOURCED_COMPLETION.md`
- Why not retailer APIs: `docs/archive/README_WALMART_INTEGRATION.md`

---

## Why Crowdsourced?

Retailer APIs (Walmart, Kroger, Target) are **not viable** because:
- Require affiliate partnerships
- Designed for driving sales, not inventory checking
- No store-level inventory without business partnership
- Rate limits too restrictive

**Solution:** Users report product sightings, creating hyperlocal real-time data.

---

## Database Schema

```sql
CREATE TABLE product_sightings (
  id SERIAL PRIMARY KEY,
  upc VARCHAR(14) NOT NULL,
  store_id VARCHAR(100),
  store_name VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  stock_level VARCHAR(20),  -- 'plenty', 'some', 'few', 'out'
  reported_by VARCHAR(100), -- user_id or 'anonymous'
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0
);

CREATE INDEX idx_sightings_upc ON product_sightings(upc);
CREATE INDEX idx_sightings_reported_at ON product_sightings(reported_at);
```

---

## Stock Levels

| Level | Meaning | Display |
|-------|---------|---------|
| plenty | Many on shelf | Green badge |
| some | Moderate stock | Yellow badge |
| few | Almost out | Orange badge |
| out | None available | Red badge |

---

## Confidence Algorithm

### Time-Based Decay

Reports become less reliable over time:

```typescript
function calculateConfidence(reportAge: number): number {
  if (reportAge < 2 * HOUR) return 100;
  if (reportAge < 6 * HOUR) return 90;
  if (reportAge < 12 * HOUR) return 70;
  if (reportAge < 24 * HOUR) return 50;
  if (reportAge < 48 * HOUR) return 30;
  return 20;
}
```

### Bonus Modifiers

```typescript
// Each "helpful" mark adds confidence
confidence += helpfulCount * 4;

// Location verification adds confidence
if (verified) confidence += 10;

// Cap at 100%
confidence = Math.min(100, confidence);
```

---

## API Endpoints

### Report a Sighting

```
POST /api/v1/sightings/report
Body: {
  upc: string,
  storeId: string,
  stockLevel: 'plenty' | 'some' | 'few' | 'out',
  latitude: number,
  longitude: number
}
```

### Get Sightings for Product

```
GET /api/v1/sightings/:upc?radius_miles=10
Response: {
  sightings: [{
    store_name: string,
    distance: number,
    stock_level: string,
    reported_at: timestamp,
    age_hours: number,
    confidence: number
  }]
}
```

### Mark as Helpful

```
POST /api/v1/sightings/:id/helpful
```

---

## User Flow

### Reporting a Sighting

```
User scans product at store
    ↓
Sees "I Found This!" button
    ↓
Taps button
    ↓
Confirms store (auto-detected or manual)
    ↓
Selects stock level (plenty/some/few/out)
    ↓
Report submitted
    ↓
System records location + timestamp
    ↓
Other users see sighting
```

### Viewing Sightings

```
User scans product (or searches)
    ↓
App shows "Recent Sightings" section
    ↓
┌─────────────────────────────┐
│  Recent Sightings:          │
│                             │
│  ✓ Walmart #2719            │
│    2 hrs ago                │
│    "Plenty in stock"        │
│    Confidence: 94%          │
│                             │
│  ✓ Meijer #145              │
│    5 hrs ago                │
│    "Few left"               │
│    Confidence: 82%          │
│                             │
│  ? Target #8923             │
│    2 days ago               │
│    (Data may be stale)      │
│    Confidence: 25%          │
└─────────────────────────────┘
```

---

## Frontend Components

### "I Found This" Button

On scan result screen:
```typescript
<TouchableOpacity onPress={openReportModal}>
  <Text>I Found This!</Text>
</TouchableOpacity>
```

### Report Modal

```typescript
<ReportSightingModal
  upc={product.upc}
  currentStore={detectedStore}
  onSubmit={handleReport}
  onClose={closeModal}
/>
```

### Sightings List

```typescript
<RecentSightings
  upc={product.upc}
  userLocation={location}
  maxAgeHours={48}
/>
```

---

## Key Files

```
app/
├── components/
│   ├── ReportSightingModal.tsx
│   ├── RecentSightings.tsx
│   └── SightingCard.tsx
└── lib/services/
    └── sightingsService.ts

backend/
├── src/routes/
│   └── sightings.ts
└── src/services/
    └── confidenceCalculator.ts
```

---

## Privacy Considerations

- Location data used only for store matching
- No GPS coordinates stored long-term
- Reports can be anonymous
- No sharing with third parties
- User can delete their reports

---

## Benefits vs Trade-offs

| Benefit | Trade-off |
|---------|-----------|
| No API dependencies | Data quality depends on participation |
| No ToS violations | Stale data if no recent reports |
| Real-time reports | Requires critical mass of users |
| Community building | Potential for false reports |
| Most valuable for scarce items | Less useful for common items |

---

## Formula Priority

Formula sightings get special treatment:
- Higher visibility in UI
- Trigger shortage alerts
- Feed into shortage detection algorithm
- Enable push notification alerts

---

## Testing

### Seed Test Data

```bash
cd backend
npm run seed-sightings-test-data
```

### Verify Sightings

```sql
SELECT
  upc,
  store_name,
  stock_level,
  reported_at,
  helpful_count
FROM product_sightings
ORDER BY reported_at DESC
LIMIT 10;
```

### Test Confidence Decay

```bash
# Check sightings of various ages
SELECT
  upc,
  stock_level,
  reported_at,
  EXTRACT(EPOCH FROM (NOW() - reported_at))/3600 as age_hours
FROM product_sightings
ORDER BY reported_at DESC;
```

---

## Future Enhancements

1. **Gamification** — Karma points for helpful reports
2. **Verification** — Cross-check with multiple reporters
3. **Push Alerts** — "Similac found at Walmart 2 hours ago"
4. **Trend Analysis** — Predict when products will be restocked

---

*Last Updated: February 2026*
