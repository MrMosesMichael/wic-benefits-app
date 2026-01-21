# Formula Availability Tracking (A4.1)

## Overview
Formula availability tracking system for WIC Benefits App. Tracks formula inventory across stores with support for crowdsourced sightings.

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

## Usage Example

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

## Next Steps (Future Tasks)
- A4.2: Shortage detection algorithm
- A4.3: Push notifications for restocks
- A4.4: Cross-store search
- A4.5: Alternative suggestions UI
- A4.6: Crowdsourced reporting UI
- A4.7: Alert subscription system

## Database Integration
Current implementation uses in-memory storage. TODO comments mark where database persistence should be added.
