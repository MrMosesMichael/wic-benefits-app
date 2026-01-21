# Formula Tracking System (A4.1, A4.2)

## Overview
Complete formula tracking system for WIC Benefits App including:
- **A4.1**: Formula availability tracking with crowdsourced sightings
- **A4.2**: Shortage detection algorithm with trend analysis

## Architecture

### Types (`src/types/formula.ts`)
- `FormulaProduct` - Formula product catalog
- `FormulaAvailability` - Real-time stock status
- `FormulaSighting` - Crowdsourced reports
- Query/Update interfaces for API operations

### Services (`src/services/formula/`)

#### FormulaAvailabilityService
Tracks formula availability across stores:
- `updateAvailability()` - Update stock status
- `getAvailability()` - Get current status
- `queryAvailability()` - Search with filters
- `recordSighting()` - Crowdsourced reports
- `getSightings()` - Retrieve user reports
- `clearStaleData()` - Data cleanup

#### FormulaProductService
Manages formula product catalog:
- `getProduct()` - Get by UPC
- `getWICApprovedFormulas()` - All approved formulas
- `getAlternatives()` - Find substitutes
- `searchFormulas()` - Search by name/brand
- `addAlternative()` - Link alternatives

#### FormulaShortageDetectionService (A4.2)
Detects and analyzes formula shortages:
- `detectShortage()` - Analyze specific formula
- `detectShortages()` - Analyze all formulas
- `getCriticalShortages()` - Get severe shortages
- `isShortage()` - Quick shortage check
- Severity levels: NONE, LOW, MODERATE, HIGH, CRITICAL
- Trend analysis: improving, worsening, stable, unknown

### API (`src/api/formula/`)

#### availability.ts
- `updateFormulaAvailability()` - Update stock
- `getFormulaAvailability()` - Get status
- `queryFormulaAvailability()` - Search
- `checkFormulaAvailability()` - Check any store
- `clearStaleAvailabilityData()` - Cleanup

#### sightings.ts
- `recordFormulaSighting()` - Report sighting
- `getFormulaSightings()` - Get reports
- `verifyFormulaSighting()` - Moderate

#### products.ts
- `getFormulaProduct()` - Get by UPC
- `getWICApprovedFormulas()` - List approved
- `getAlternativeFormulas()` - Get substitutes
- `searchFormulas()` - Search catalog
- `upsertFormulaProduct()` - Add/update
- `addAlternativeFormula()` - Link alternatives

## Data Sources
1. **API** - Official retailer APIs
2. **Crowdsourced** - User sightings
3. **Manual** - Admin updates

## Usage Examples

### Availability Tracking (A4.1)

```typescript
import {
  getFormulaAvailabilityService,
  getFormulaProductService,
} from './services/formula';

// Check availability
const service = getFormulaAvailabilityService();
const availability = await service.getAvailability(storeId, upc);

// Find alternatives
const productService = getFormulaProductService();
const alternatives = await productService.getAlternatives(upc);

// Record sighting
await service.recordSighting(userId, storeId, upc, quantity);
```

### Shortage Detection (A4.2)

```typescript
import {
  getFormulaShortageDetectionService,
  ShortageSeverity,
} from './services/formula';

const shortageService = getFormulaShortageDetectionService();

// Detect shortage for specific formula
const detection = await shortageService.detectShortage('012345678901');
console.log(`Severity: ${detection.severity}`);
console.log(`Available: ${detection.availableStoreCount}/${detection.totalStoreCount}`);
console.log(`Trend: ${detection.trend}`);

// Get all critical shortages
const critical = await shortageService.getCriticalShortages(
  ShortageSeverity.HIGH
);

// Quick check if formula has shortage
const hasShortage = await shortageService.isShortage(
  '012345678901',
  ShortageSeverity.MODERATE
);
```

See `__examples__/shortageDetectionExample.ts` for comprehensive examples.

## Shortage Detection Algorithm Details (A4.2)

### Severity Classification
| Severity | Availability Rate | Description |
|----------|------------------|-------------|
| NONE | ≥75% | Widely available |
| LOW | 50-75% | Limited availability |
| MODERATE | 25-50% | Significant shortage |
| HIGH | 10-25% | Severe shortage |
| CRITICAL | <10% | Critical shortage |

### Trend Analysis
- Analyzes historical data over 72-hour window (configurable)
- Groups data into 6-hour windows to reduce noise
- Detects improving/worsening/stable trends
- Requires ≥10% change in availability rate to classify as trending

### Data Management
- Maintains 7-day rolling history per formula
- Automatic cleanup of stale data
- In-memory caching for performance

## Next Steps (Future Tasks)
- A4.3: Push notifications for restocks
- A4.4: Cross-store search
- A4.5: Alternative suggestions UI
- A4.6: Crowdsourced reporting UI
- A4.7: Alert subscription system

## Database Integration
Current implementation uses in-memory storage. TODO comments mark where database persistence should be added.
