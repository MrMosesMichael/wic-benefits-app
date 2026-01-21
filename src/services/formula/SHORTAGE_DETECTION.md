# Formula Shortage Detection Algorithm (A4.2)

## Purpose

Analyzes formula availability patterns to detect and classify shortages across WIC stores. Provides severity classification, trend analysis, and actionable shortage intelligence.

## Core Algorithm

### 1. Data Collection
```typescript
// Gather recent availability data
const availabilityData = await availabilityService.queryAvailability({
  upcs: [specificUPC],
  maxAge: 24  // hours
});
```

### 2. Availability Rate Calculation
```typescript
availabilityRate = inStockStores / totalStores
```

### 3. Severity Classification
```
if (rate >= 0.75) → NONE       (widely available)
if (rate >= 0.50) → LOW        (limited)
if (rate >= 0.25) → MODERATE   (significant shortage)
if (rate >= 0.10) → HIGH       (severe shortage)
if (rate <  0.10) → CRITICAL   (critical shortage)
```

### 4. Trend Analysis
```typescript
// Group historical data into 6-hour windows
windows = groupByTimeWindow(historicalData, 6 hours)

// Compare first and last windows
firstRate = windows[0].rate
lastRate = windows[last].rate
change = lastRate - firstRate

if (|change| < 0.10) → stable
if (change > 0.10)   → improving
if (change < -0.10)  → worsening
```

## API Reference

### Primary Methods

#### `detectShortage(upc, options?)`
Analyzes shortage for a specific formula.

**Parameters:**
- `upc: string` - Formula UPC code
- `options?: ShortageAnalysisOptions`

**Returns:** `Promise<ShortageDetection>`

**Example:**
```typescript
const detection = await shortageService.detectShortage('012345678901', {
  maxDataAge: 24,
  includeRegionalAnalysis: true,
  trendWindowHours: 72
});
```

#### `detectShortages(options?)`
Analyzes all formulas with availability data.

**Parameters:**
- `options?: ShortageAnalysisOptions`

**Returns:** `Promise<ShortageDetection[]>`

**Example:**
```typescript
const allShortages = await shortageService.detectShortages({
  storeIds: ['store1', 'store2'],  // optional filter
  maxDataAge: 12
});
```

#### `getCriticalShortages(minSeverity?, options?)`
Filters shortages by minimum severity level.

**Parameters:**
- `minSeverity?: ShortageSeverity` (default: MODERATE)
- `options?: ShortageAnalysisOptions`

**Returns:** `Promise<ShortageDetection[]>`

**Example:**
```typescript
// Get only HIGH and CRITICAL shortages
const critical = await shortageService.getCriticalShortages(
  ShortageSeverity.HIGH
);
```

#### `isShortage(upc, minSeverity?)`
Quick boolean check if formula has shortage.

**Parameters:**
- `upc: string`
- `minSeverity?: ShortageSeverity` (default: LOW)

**Returns:** `Promise<boolean>`

**Example:**
```typescript
if (await shortageService.isShortage('012345678901', ShortageSeverity.MODERATE)) {
  // Show alert or alternative formulas
}
```

## Data Types

### `ShortageDetection`
```typescript
{
  upc: string;
  severity: ShortageSeverity;
  availableStoreCount: number;
  totalStoreCount: number;
  availabilityRate: number;        // 0-1
  trend: 'improving' | 'worsening' | 'stable' | 'unknown';
  lastChecked: Date;
  affectedRegions?: string[];      // Optional regional breakdown
}
```

### `ShortageSeverity` Enum
```typescript
enum ShortageSeverity {
  NONE = 'none',           // >= 75%
  LOW = 'low',             // 50-75%
  MODERATE = 'moderate',   // 25-50%
  HIGH = 'high',           // 10-25%
  CRITICAL = 'critical'    // < 10%
}
```

### `ShortageAnalysisOptions`
```typescript
{
  upc?: string;                     // Analyze specific formula
  storeIds?: string[];              // Limit to stores
  maxDataAge?: number;              // Max age in hours (default: 24)
  includeRegionalAnalysis?: boolean; // Enable regional breakdown
  trendWindowHours?: number;        // Trend window (default: 72)
}
```

## Performance Characteristics

### Time Complexity
- `detectShortage()`: O(n) where n = number of stores with data
- `detectShortages()`: O(m × n) where m = formulas, n = stores
- `getCriticalShortages()`: O(m × n + m log m) with sorting
- `isShortage()`: O(n)

### Space Complexity
- Historical data: O(7 days × formulas × stores)
- Typically < 1MB for 100 formulas × 1000 stores

### Data Retention
- Historical data: 7 days rolling window
- Automatic cleanup of stale data
- Configurable max data age for queries

## Integration Examples

### Alert System Integration (A4.3)
```typescript
// Monitor for critical shortages every hour
setInterval(async () => {
  const critical = await shortageService.getCriticalShortages(
    ShortageSeverity.HIGH
  );

  for (const shortage of critical) {
    if (shortage.trend === 'worsening') {
      await notificationService.sendShortageAlert(shortage);
    }
  }
}, 60 * 60 * 1000);
```

### Alternative Formula Suggestions (A4.5)
```typescript
// Show alternatives when formula has shortage
const shortage = await shortageService.detectShortage(requestedUPC);

if (shortage.severity >= ShortageSeverity.MODERATE) {
  const alternatives = await productService.getAlternatives(requestedUPC);

  // Filter alternatives by availability
  const availableAlternatives = [];
  for (const alt of alternatives) {
    const altShortage = await shortageService.detectShortage(alt.upc);
    if (altShortage.severity <= ShortageSeverity.LOW) {
      availableAlternatives.push(alt);
    }
  }

  return availableAlternatives;
}
```

### Cross-Store Search Prioritization (A4.4)
```typescript
// Prioritize stores with stock during shortages
const shortage = await shortageService.detectShortage(upc);

if (shortage.severity >= ShortageSeverity.MODERATE) {
  // Search wider radius
  const stores = await storeService.search(location, 50); // 50 mile radius
} else {
  // Normal radius
  const stores = await storeService.search(location, 10);
}
```

## Testing

See `__tests__/shortageDetection.test.ts` for comprehensive test suite covering:
- Severity classification
- Multi-formula detection
- Critical shortage filtering
- Trend analysis
- Edge cases (empty data, missing formulas)

## Future Enhancements

1. **Machine Learning**: Predictive shortage modeling
2. **Regional Analysis**: Full implementation with store location data
3. **Historical Patterns**: Seasonal shortage detection
4. **External Data**: Integration with manufacturer/distributor feeds
5. **Database Persistence**: Move from in-memory to persistent storage

## Related Tasks

- **A4.1**: Formula availability tracking (prerequisite)
- **A4.3**: Restock push notifications (consumer)
- **A4.4**: Cross-store formula search (consumer)
- **A4.5**: Alternative formula suggestions (consumer)
- **A4.7**: Alert subscription system (consumer)
