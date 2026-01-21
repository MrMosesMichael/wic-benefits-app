# State Eligibility Rules Engine

## Overview

The State Eligibility Rules Engine is a comprehensive system for evaluating WIC product eligibility across different states. It applies state-specific rules, restrictions, and participant targeting to determine whether a product is WIC-approved.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Eligibility Service                      │
│  (High-level API for eligibility checking)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌─────────────┐ ┌────────────────┐
│ APL Database │ │ Rules Engine│ │ State Rules    │
│   (Postgres) │ │   (Core)    │ │ Config (MI/NC/ │
│              │ │             │ │   FL/OR)       │
└──────────────┘ └─────────────┘ └────────────────┘
```

## Components

### 1. EligibilityRulesEngine

Core engine that evaluates product eligibility based on APL entries and state rules.

**Location:** `src/services/eligibility/EligibilityRulesEngine.ts`

**Key Features:**
- Rule-based evaluation (8+ rule types)
- Size restriction checking with unit conversion
- Brand restriction validation (contract brands, allowed/excluded lists)
- Participant type targeting
- Nutritional restriction checking
- Batch evaluation support

**Rule Types:**
1. **Product Presence Rules**
   - `NOT_IN_APL` - Product not in state's APL
   - `EXPIRED_APPROVAL` - Product approval has expired
   - `NOT_YET_EFFECTIVE` - Product approval not yet active

2. **Size Rules**
   - `SIZE_TOO_SMALL` - Product below minimum size
   - `SIZE_TOO_LARGE` - Product exceeds maximum size
   - `SIZE_NOT_EXACT` - Product doesn't match exact size requirement
   - `SIZE_NOT_ALLOWED` - Product size not in allowed sizes list

3. **Brand Rules**
   - `BRAND_NOT_ALLOWED` - Brand not on allowed list
   - `BRAND_EXCLUDED` - Brand on excluded list
   - `NOT_CONTRACT_BRAND` - Not the contract brand (formula)
   - `CONTRACT_EXPIRED` - Contract brand period expired

4. **Participant Rules**
   - `PARTICIPANT_TYPE_RESTRICTED` - No eligible participants
   - `PARTICIPANT_AGE_RESTRICTED` - Participant age doesn't match

5. **Nutritional Rules**
   - `SUGAR_EXCEEDS_LIMIT` - Sugar content too high
   - `SODIUM_EXCEEDS_LIMIT` - Sodium content too high
   - `NOT_WHOLE_GRAIN` - Whole grain required but not present
   - `NOT_LOW_FAT` - Low-fat required but product is whole fat
   - `NOT_ORGANIC` - Organic certification required
   - `HAS_ARTIFICIAL_DYES` - Contains prohibited dyes (Florida)
   - `MISSING_FORTIFICATION` - Required fortification missing

### 2. StateRulesConfig

Configuration registry for state-specific policies and restrictions.

**Location:** `src/services/eligibility/StateRulesConfig.ts`

**State Configurations:**

#### Michigan (MI)
- **Processor:** FIS (Custom Data Processing)
- **Formula Contract:** Similac (Oct 2023 - Sep 2026)
- **Restrictions:**
  - Cereal: Whole grain, ≤6g sugar/serving
  - Bread: Whole grain
  - Juice: 100% juice, no added sugar

#### North Carolina (NC)
- **Processor:** Conduent
- **Formula Contract:** Enfamil (Oct 2023 - Sep 2026)
- **Restrictions:**
  - Cereal: Whole grain, ≤6g sugar/dry oz
  - Bread: Whole grain
  - Milk: Must be Vitamin D fortified

#### Florida (FL)
- **Processor:** FIS (Custom Data Processing)
- **Formula Contract:** Similac (Oct 2023 - Sep 2026)
- **Restrictions:**
  - Cereal: Whole grain, ≤6g sugar, **no artificial dyes**
  - Bread: Whole grain, **no artificial dyes**
  - Yogurt: ≤30g sugar, **no artificial dyes**

#### Oregon (OR)
- **Processor:** State-specific system
- **Formula Contract:** Similac (Oct 2023 - Sep 2026)
- **Restrictions:**
  - Cereal: Whole grain, ≤6g sugar/serving
  - Bread: Whole grain
  - Produce: Organic options encouraged

### 3. EligibilityService

High-level service that integrates APL database lookups with rules engine evaluation.

**Location:** `src/services/eligibility/EligibilityService.ts`

**Features:**
- Database integration with caching (5-minute TTL)
- Batch eligibility checking
- Alternative product suggestions
- Data freshness tracking
- State support validation

## Usage

### Basic Eligibility Check

```typescript
import { Pool } from 'pg';
import { EligibilityService } from './services/eligibility';

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const service = new EligibilityService(dbPool);

// Check single product
const result = await service.checkEligibility({
  upc: '016000275287', // Cheerios
  state: 'MI',
  product: {
    brand: 'Cheerios',
    category: 'cereal',
    size: 12,
    sizeUnit: 'oz',
  },
});

console.log('Eligible:', result.eligible);
console.log('Reason:', result.ineligibilityReason);
console.log('Confidence:', result.confidence);
```

### Eligibility with Household Context

```typescript
import { HouseholdContext } from './services/eligibility';

const household: HouseholdContext = {
  state: 'NC',
  participants: [
    { type: 'pregnant' },
    { type: 'child', ageMonths: 30 },
    { type: 'infant', ageMonths: 4 },
  ],
  benefitPeriodStart: new Date('2026-01-01'),
  benefitPeriodEnd: new Date('2026-01-31'),
};

const result = await service.checkEligibility({
  upc: '070074657103', // Formula
  state: 'NC',
  product: {
    brand: 'Enfamil',
    category: 'infant_formula',
  },
  household,
});

console.log('Eligible Participants:', result.eligibleParticipants);
console.log('Ineligible Participants:', result.ineligibleParticipants);
```

### Batch Eligibility Check

```typescript
const upcs = [
  '016000275287', // Cheerios
  '011110416605', // 1% Milk
  '070074657103', // Formula
  '041303001004', // Eggs
];

const results = await service.checkEligibilityBatch({
  upcs,
  state: 'FL',
});

results.forEach(result => {
  console.log(`${result.upc}: ${result.eligible ? '✓' : '✗'}`);
});
```

### Direct Rules Engine Usage (No Database)

```typescript
import { EligibilityRulesEngine, ProductEligibilityInput } from './services/eligibility';
import { APLEntry } from './types/apl.types';

const engine = new EligibilityRulesEngine();

const aplEntry: APLEntry = {
  // ... APL entry data
};

const product: ProductEligibilityInput = {
  upc: '016000275287',
  state: 'MI',
  actualSize: 12,
  sizeUnit: 'oz',
  brand: 'Cheerios',
};

const result = engine.evaluate(product, aplEntry);
console.log(engine.getSummary(result));
```

## Data Model

### EligibilityEvaluation

```typescript
interface EligibilityEvaluation {
  eligible: boolean;
  upc: string;
  state: StateCode;
  aplEntry?: APLEntry;
  ineligibilityReason?: string;
  ruleViolations: RuleViolation[];
  eligibleParticipants: ParticipantType[];
  ineligibleParticipants: ParticipantType[];
  confidence: number; // 0-100
  warnings: string[];
  alternatives?: string[];
  evaluatedAt: Date;
}
```

### RuleViolation

```typescript
interface RuleViolation {
  rule: RuleType;
  severity: 'error' | 'warning';
  message: string;
  expected?: any;
  actual?: any;
}
```

## Performance

- **Single Check:** <100ms (cached), <500ms (database)
- **Batch Check (10 products):** <200ms (cached), <800ms (database)
- **Cache TTL:** 5 minutes
- **Confidence Scoring:** 90-100% (lower if data is stale)

## Testing

Run examples:

```bash
# Basic check
npm run example:eligibility 1

# Household context
npm run example:eligibility 2

# Batch check
npm run example:eligibility 3

# Rule violations
npm run example:eligibility 4

# State policy comparison
npm run example:eligibility 5

# Formula contract brands
npm run example:eligibility 6

# Direct rules engine
npm run example:eligibility 7

# Size restrictions edge cases
npm run example:eligibility 8
```

## State Policy Queries

```typescript
import { StateRulesConfig } from './services/eligibility';

// Check if state is supported
const supported = StateRulesConfig.isStateSupported('MI');

// Get state policy summary
const summary = StateRulesConfig.getPolicySummary('MI');

// Get formula contract brand
const formulaBrand = StateRulesConfig.getFormulaContractBrand('NC');

// Get category restrictions
const cerealRules = StateRulesConfig.getCategoryRestriction('FL', 'cereal');
```

## Integration Points

### Frontend Integration

```typescript
// React Native app
import { EligibilityService } from '@/services/eligibility';

const checkProductEligibility = async (upc: string, userState: string) => {
  const result = await eligibilityService.checkEligibility({
    upc,
    state: userState,
    includeAlternatives: true,
  });

  if (result.eligible) {
    showEligibleUI(result);
  } else {
    showNotEligibleUI(result);
    if (result.alternatives) {
      showAlternatives(result.alternatives);
    }
  }
};
```

### Backend API Integration

```typescript
// Express route
app.post('/api/v1/eligibility/check', async (req, res) => {
  const { upc, state, product, household } = req.body;

  const result = await eligibilityService.checkEligibility({
    upc,
    state,
    product,
    household,
  });

  res.json(result);
});
```

## Future Enhancements

1. **Age-Based Restrictions**
   - Infant formula by age (0-5 months vs 6-11 months)
   - Toddler formulas (12-24 months)

2. **Additional States**
   - Expand beyond MI, NC, FL, OR
   - Support all 50 states + territories

3. **Machine Learning**
   - Predict eligibility based on product attributes
   - Auto-categorize new products

4. **Real-Time Updates**
   - WebSocket notifications for APL changes
   - Push notifications when products become eligible

5. **Enhanced Alternatives**
   - Smart alternative suggestions based on price, availability
   - Brand preference learning

## Maintenance

### Adding a New State

1. Add state code to `StateCode` type in `apl.types.ts`
2. Create configuration in `StateRulesConfig.ts`:
   ```typescript
   private static getNewStateConfig(): StatePolicyConfig {
     // Define state-specific rules
   }
   ```
3. Register in `initialize()` method
4. Add ingestion service for state's APL data
5. Update documentation

### Adding a New Rule Type

1. Add to `RuleType` enum in `EligibilityRulesEngine.ts`
2. Implement check method in `EligibilityRulesEngine`
3. Add to evaluation logic
4. Update tests and examples

## Troubleshooting

### Low Confidence Scores

**Cause:** Stale APL data
**Solution:** Check APL sync status, trigger manual sync

### Missing Products

**Cause:** Product not in APL database
**Solution:** Verify UPC normalization, check state APL source

### Incorrect Brand Restrictions

**Cause:** Brand name mismatch (case, spacing)
**Solution:** Normalize brand names, check APL data quality

## License

Part of WIC Benefits Assistant - User sovereignty over corporate interests.
