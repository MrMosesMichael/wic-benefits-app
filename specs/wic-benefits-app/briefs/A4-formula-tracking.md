# Brief: A4 - Formula Tracking

## Context
WIC provides infant formula benefits. Formula shortages are common. Parents need to find formula quickly.

## Data Model
```typescript
interface FormulaProduct {
  upc: string;
  brand: string;
  name: string;
  size: string;
  wicApproved: boolean;
  alternativeUPCs: string[];  // Similar formulas
}

interface FormulaAvailability {
  storeId: string;
  upc: string;
  inStock: boolean;
  quantity?: number;
  lastChecked: Date;
  source: 'api' | 'crowdsourced' | 'manual';
}

interface FormulaSighting {
  id: string;
  userId: string;
  storeId: string;
  upc: string;
  quantity: number;
  timestamp: Date;
  verified: boolean;
}
```

## Tasks
- A4.1 Implement formula availability tracking
- A4.2 Build formula shortage detection algorithm
- A4.3 Create formula restock push notifications
- A4.4 Build cross-store formula search
- A4.5 Implement alternative formula suggestions
- A4.6 Create crowdsourced formula sighting reports
- A4.7 Build formula alert subscription system

## Key Implementation Notes
- Use push notifications for alerts (Expo Notifications)
- Cross-store search: query multiple stores, sort by distance + availability
- Alternative suggestions: map UPCs to equivalent formulas
- Crowdsourced: verify sightings with multiple reports

## Relevant Directories
- `src/services/formula/` - Formula tracking services
- `src/api/formula/` - Formula API endpoints
- `src/types/formula.ts` - Type definitions
