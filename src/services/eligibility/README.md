# State Eligibility Rules Engine

> **Task A1.7** - Design state eligibility rules engine

## Overview

The State Eligibility Rules Engine is a comprehensive system for determining WIC product eligibility across different states. It evaluates products against state-specific rules, size/brand restrictions, participant targeting, and nutritional requirements.

## Key Features

- ✅ **Multi-State Support** - Michigan, North Carolina, Florida, Oregon
- ✅ **8+ Rule Types** - Size, brand, participant, nutritional restrictions
- ✅ **Contract Brand Validation** - Infant formula contract enforcement
- ✅ **Participant Targeting** - Determine which household members can use products
- ✅ **Batch Evaluation** - Check multiple products efficiently
- ✅ **Database Integration** - Direct APL lookup with caching
- ✅ **Unit Conversion** - Automatic size unit normalization
- ✅ **Confidence Scoring** - Data freshness and accuracy metrics

## Quick Start

```typescript
import { Pool } from 'pg';
import { EligibilityService } from './services/eligibility';

// Initialize service
const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
const service = new EligibilityService(dbPool);

// Check product eligibility
const result = await service.checkEligibility({
  upc: '016000275287',
  state: 'MI',
  product: {
    brand: 'Cheerios',
    size: 12,
    sizeUnit: 'oz',
  },
});

console.log(result.eligible ? '✓ Eligible' : '✗ Not Eligible');
```

## Architecture

```
┌────────────────────────────────────────────────┐
│         EligibilityService (API Layer)         │
│  - Database integration                        │
│  - Caching (5-min TTL)                         │
│  - Batch operations                            │
└───────────────────┬────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌─────────┐  ┌────────────┐  ┌─────────────┐
│   APL   │  │   Rules    │  │   State     │
│Database │  │  Engine    │  │   Rules     │
│(Lookup) │  │(Evaluate)  │  │  Config     │
└─────────┘  └────────────┘  └─────────────┘
```

## Components

### 1. EligibilityRulesEngine
**File:** `EligibilityRulesEngine.ts`

Core rule evaluation engine. Applies business logic to determine eligibility.

**Responsibilities:**
- Size restriction validation
- Brand restriction enforcement
- Participant type filtering
- Nutritional requirement checking
- Rule violation tracking

### 2. StateRulesConfig
**File:** `StateRulesConfig.ts`

State-specific policy configuration registry.

**Supported States:**
- **MI** (Michigan) - FIS processor, Similac contract
- **NC** (North Carolina) - Conduent processor, Enfamil contract
- **FL** (Florida) - FIS processor, Similac contract, no artificial dyes
- **OR** (Oregon) - State system, Similac contract, organic preference

### 3. EligibilityService
**File:** `EligibilityService.ts`

High-level service integrating database and rules engine.

**Features:**
- APL database lookups
- Response caching
- Batch eligibility checks
- Alternative product suggestions

## Rule Types

### Product Presence Rules
- `NOT_IN_APL` - Product not in state's approved list
- `EXPIRED_APPROVAL` - Product approval expired
- `NOT_YET_EFFECTIVE` - Product approval not yet active

### Size Rules
- `SIZE_TOO_SMALL` - Below minimum size
- `SIZE_TOO_LARGE` - Above maximum size
- `SIZE_NOT_EXACT` - Doesn't match exact size
- `SIZE_NOT_ALLOWED` - Not in allowed sizes list

### Brand Rules
- `BRAND_NOT_ALLOWED` - Brand not on approved list
- `BRAND_EXCLUDED` - Brand on excluded list
- `NOT_CONTRACT_BRAND` - Not the contract brand (formula)
- `CONTRACT_EXPIRED` - Contract period ended

### Participant Rules
- `PARTICIPANT_TYPE_RESTRICTED` - No eligible participants
- `PARTICIPANT_AGE_RESTRICTED` - Age doesn't match

### Nutritional Rules
- `SUGAR_EXCEEDS_LIMIT` - Sugar content too high
- `SODIUM_EXCEEDS_LIMIT` - Sodium content too high
- `NOT_WHOLE_GRAIN` - Whole grain required
- `NOT_LOW_FAT` - Low-fat required
- `NOT_ORGANIC` - Organic required
- `HAS_ARTIFICIAL_DYES` - Contains prohibited dyes
- `MISSING_FORTIFICATION` - Missing required vitamins

## Usage Examples

### Basic Check

```typescript
const result = await service.checkEligibility({
  upc: '016000275287',
  state: 'MI',
});

if (result.eligible) {
  console.log('✓ Product is WIC-eligible');
} else {
  console.log('✗ Not eligible:', result.ineligibilityReason);
}
```

### With Product Details

```typescript
const result = await service.checkEligibility({
  upc: '016000275287',
  state: 'FL',
  product: {
    brand: 'Cheerios',
    category: 'cereal',
    size: 12,
    sizeUnit: 'oz',
  },
});
```

### With Household Context

```typescript
const household = {
  state: 'NC',
  participants: [
    { type: 'pregnant' },
    { type: 'infant', ageMonths: 4 },
    { type: 'child', ageMonths: 30 },
  ],
};

const result = await service.checkEligibility({
  upc: '070074657103',
  state: 'NC',
  household,
});

console.log('Eligible for:', result.eligibleParticipants);
console.log('Not eligible for:', result.ineligibleParticipants);
```

### Batch Check

```typescript
const results = await service.checkEligibilityBatch({
  upcs: [
    '016000275287', // Cheerios
    '011110416605', // Milk
    '070074657103', // Formula
  ],
  state: 'MI',
});

results.forEach(r => {
  console.log(`${r.upc}: ${r.eligible ? '✓' : '✗'}`);
});
```

## CLI Tool

Command-line interface for testing eligibility.

```bash
# Basic check
npm run eligibility:check 016000275287 MI

# With product details
npm run eligibility:check 016000275287 MI \
  --brand Cheerios \
  --size 12 \
  --unit oz

# Show state policy
npm run eligibility:check --policy MI

# Help
npm run eligibility:check --help
```

## State Policies

### Michigan (MI)
```
Processor: FIS
Formula: Similac (Oct 2023 - Sep 2026)
Cereal: Whole grain, ≤6g sugar
Bread: Whole grain
Juice: 100% juice, no added sugar
```

### North Carolina (NC)
```
Processor: Conduent
Formula: Enfamil (Oct 2023 - Sep 2026)
Cereal: Whole grain, ≤6g sugar/oz
Bread: Whole grain
Milk: Vitamin D fortified
```

### Florida (FL)
```
Processor: FIS
Formula: Similac (Oct 2023 - Sep 2026)
Cereal: Whole grain, ≤6g sugar, no dyes
Bread: Whole grain, no dyes
Yogurt: ≤30g sugar, no dyes
⚠ SPECIAL: No artificial dyes allowed
```

### Oregon (OR)
```
Processor: State-specific
Formula: Similac (Oct 2023 - Sep 2026)
Cereal: Whole grain, ≤6g sugar
Bread: Whole grain
Produce: Organic encouraged
```

## Testing

Run the example suite:

```bash
# All examples
npm run example:eligibility

# Specific example (1-8)
npm run example:eligibility 5
```

**Available Examples:**
1. Basic eligibility check
2. Household context
3. Batch eligibility check
4. Rule violations analysis
5. State policy comparison
6. Formula contract brand checking
7. Direct rules engine usage
8. Size restrictions edge cases

## Performance

| Operation | Cache Hit | Cache Miss |
|-----------|-----------|------------|
| Single check | <50ms | <500ms |
| Batch (10 products) | <100ms | <800ms |
| State policy lookup | <1ms | N/A |

**Cache:** 5-minute TTL, in-memory Map

## API Reference

### EligibilityService

#### checkEligibility(request)
Check eligibility for a single product.

**Parameters:**
- `request.upc` - Product UPC
- `request.state` - State code
- `request.product` - Product details (optional)
- `request.household` - Household context (optional)
- `request.includeAlternatives` - Include alternatives if not eligible

**Returns:** `EligibilityCheckResponse`

#### checkEligibilityBatch(request)
Check eligibility for multiple products.

**Parameters:**
- `request.upcs` - Array of UPCs
- `request.state` - State code
- `request.household` - Household context (optional)

**Returns:** `EligibilityCheckResponse[]`

### StateRulesConfig

#### getConfig(state)
Get configuration for a state.

#### isStateSupported(state)
Check if state is supported.

#### getPolicySummary(state)
Get human-readable policy summary.

#### getFormulaContractBrand(state)
Get current formula contract brand for state.

## File Structure

```
src/services/eligibility/
├── README.md                       # This file
├── index.ts                        # Module exports
├── EligibilityRulesEngine.ts       # Core rules engine
├── StateRulesConfig.ts             # State policies
├── EligibilityService.ts           # Service layer
└── cli/
    └── check-eligibility.ts        # CLI tool

src/examples/
└── eligibility-rules-example.ts    # Usage examples

src/docs/
└── ELIGIBILITY_RULES_ENGINE.md     # Full documentation
```

## Integration

### React Native App

```typescript
import { EligibilityService } from '@/services/eligibility';

const ScanResultScreen = ({ upc }) => {
  const [result, setResult] = useState(null);

  useEffect(() => {
    checkEligibility();
  }, [upc]);

  const checkEligibility = async () => {
    const result = await eligibilityService.checkEligibility({
      upc,
      state: userState,
      includeAlternatives: true,
    });
    setResult(result);
  };

  if (!result) return <Loading />;

  if (result.eligible) {
    return <EligibleUI result={result} />;
  } else {
    return <NotEligibleUI result={result} />;
  }
};
```

### Express API

```typescript
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

## Error Handling

```typescript
try {
  const result = await service.checkEligibility({ upc, state });
  // Handle result
} catch (error) {
  if (error.message.includes('DATABASE_URL')) {
    // Database connection error
  } else if (error.message.includes('Failed to fetch')) {
    // APL lookup error
  } else {
    // Other error
  }
}
```

## Troubleshooting

### "Product not found in APL"
- Check if UPC is normalized (leading zeros)
- Verify state has APL data synced
- Check if product approval is current (not expired)

### "Low confidence score"
- APL data may be stale (>7 days)
- Trigger manual APL sync
- Check sync status in database

### "Incorrect brand restrictions"
- Verify brand name matching (case-insensitive)
- Check APL data quality
- Review state configuration

## Next Steps

1. **Add more states** - Expand beyond MI, NC, FL, OR
2. **Age-based restrictions** - Infant formula by age ranges
3. **Machine learning** - Predict eligibility for new products
4. **Real-time updates** - WebSocket notifications for APL changes
5. **Enhanced alternatives** - Smart suggestions based on availability

## License

Part of WIC Benefits Assistant - User sovereignty project.
