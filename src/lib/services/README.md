# Benefit Validation Service

## Overview

The Benefit Validation Service (R5.1) implements balance discrepancy warnings for the WIC Benefits App. It compares manual balance tracking against calculated usage to detect inconsistencies in the three-state benefit tracking system.

## Three-State Benefit Tracking

The WIC Benefits App uses a three-state system to track benefit usage:

1. **Available** - Benefits that can be added to cart
2. **In Cart** - Benefits reserved in shopping cart (pending)
3. **Consumed** - Benefits already used/purchased

The fundamental balance equation:
```
total = available + inCart + consumed
```

## Features

- **Automatic Discrepancy Detection**: Identifies when the balance equation doesn't hold
- **Configurable Thresholds**: Adjustable sensitivity levels for warnings
- **Severity Classification**: Low, medium, and high severity warnings
- **Actionable Recommendations**: Context-aware suggestions for resolving discrepancies
- **React Integration**: Hooks and components for easy UI integration

## Core Concepts

### Discrepancy Types

1. **Positive Discrepancy** (more available than expected)
   - Likely cause: Missed purchase logging
   - Example: User bought milk but forgot to log it

2. **Negative Discrepancy** (less available than expected)
   - Likely cause: Double-logged purchase or incorrect manual entry
   - Example: User logged same purchase twice

### Severity Levels

| Severity | Threshold | Description |
|----------|-----------|-------------|
| Low      | 5-10%     | Minor discrepancy, may be rounding |
| Medium   | 10-20%    | Significant discrepancy, review recommended |
| High     | >20%      | Major discrepancy, immediate attention needed |

### Default Thresholds

```typescript
{
  lowThresholdPercent: 5,           // 5% of total allocation
  mediumThresholdPercent: 10,       // 10% of total allocation
  highThresholdPercent: 20,         // 20% of total allocation
  minimumAbsoluteDiscrepancy: 0.1   // 0.1 units (ignore tiny floating point errors)
}
```

## Usage

### Basic Validation

```typescript
import { benefitValidationService, BenefitBalance } from './benefitValidation';

const benefit: BenefitBalance = {
  category: 'milk',
  categoryLabel: 'Milk',
  totalAmount: 4,
  availableAmount: 1.5,  // Should be 1.0 (4 - 1 - 2)
  inCartAmount: 1,
  consumedAmount: 2,
  unit: 'gal',
};

// Validate single benefit
const warning = benefitValidationService.validateBenefit(benefit);

if (warning) {
  console.log(warning.severity);        // 'medium'
  console.log(warning.message);         // Warning message
  console.log(warning.recommendation);  // What to do
}
```

### Validate Multiple Benefits

```typescript
const benefits: BenefitBalance[] = [
  // ... participant's benefits
];

const result = benefitValidationService.validateAllBenefits(benefits);

if (result.hasWarnings) {
  result.warnings.forEach(warning => {
    console.log(`${warning.categoryLabel}: ${warning.message}`);
  });
}
```

### Convert API Data

```typescript
import { convertToBenefitBalance } from './benefitValidation';

// API response format (string amounts)
const apiData = {
  category: 'milk',
  categoryLabel: 'Milk',
  total: '4',
  available: '1',
  inCart: '1',
  consumed: '2',
  unit: 'gal',
};

// Convert to BenefitBalance (numeric amounts)
const benefit = convertToBenefitBalance(apiData);
const warning = benefitValidationService.validateBenefit(benefit);
```

### React Hook

```typescript
import { useBenefitValidation } from '../hooks/useBenefitValidation';

function BenefitsScreen({ participant }) {
  const {
    warnings,
    hasWarnings,
    hasHighSeverityWarnings,
    validate
  } = useBenefitValidation(participant.benefits, {
    autoValidate: true,
    minSeverity: 'medium'  // Only show medium and high
  });

  return (
    <View>
      {hasHighSeverityWarnings && (
        <Alert severity="error">
          Critical balance issues detected!
        </Alert>
      )}

      {warnings.map(warning => (
        <BenefitValidationAlert key={warning.category} warning={warning} />
      ))}
    </View>
  );
}
```

### React Component

```tsx
import { BenefitValidationAlert } from '../components/BenefitValidationAlert';

<BenefitValidationAlert
  warning={warning}
  onDismiss={() => console.log('Dismissed')}
  onResolve={(w) => handleResolve(w)}
  showRecommendation={true}
/>
```

### Custom Thresholds

```typescript
import { BenefitValidationService } from './benefitValidation';

// Create validator with custom thresholds
const strictValidator = new BenefitValidationService({
  lowThresholdPercent: 2,
  mediumThresholdPercent: 5,
  highThresholdPercent: 10,
  minimumAbsoluteDiscrepancy: 0.05
});

const warning = strictValidator.validateBenefit(benefit);
```

## Integration Points

### When to Validate

1. **After Manual Benefit Entry**: Verify data consistency
2. **After Purchase Logging**: Check if balances remain consistent
3. **After Cart Checkout**: Ensure benefits were consumed correctly
4. **Periodic Background Checks**: Regular validation for data integrity
5. **Before Benefit Period Rollover**: Verify final balances

### Example: Post-Checkout Validation

```typescript
async function handleCheckout(cart: Cart) {
  // 1. Process checkout
  await checkoutService.processCheckout(cart);

  // 2. Fetch updated benefits
  const updatedBenefits = await benefitService.getBenefits(householdId);

  // 3. Validate balances
  const validation = benefitValidationService.validateAllBenefits(updatedBenefits);

  // 4. Show warnings if any
  if (validation.hasWarnings) {
    showValidationWarnings(validation.warnings);
  }
}
```

## API

### BenefitValidationService

#### Methods

- `validateBenefit(benefit: BenefitBalance): DiscrepancyWarning | null`
  - Validate single benefit category

- `validateAllBenefits(benefits: BenefitBalance[]): ValidationResult`
  - Validate all benefits for a participant

- `isBalanceConsistent(benefit: BenefitBalance): boolean`
  - Quick check if balance equation holds

- `updateThresholds(thresholds: Partial<ValidationThresholds>): void`
  - Update validation thresholds

- `getThresholds(): ValidationThresholds`
  - Get current threshold configuration

### Types

```typescript
interface BenefitBalance {
  category: string;
  categoryLabel: string;
  totalAmount: number;
  availableAmount: number;
  inCartAmount: number;
  consumedAmount: number;
  unit: string;
  periodStart?: string;
  periodEnd?: string;
}

interface DiscrepancyWarning {
  category: string;
  categoryLabel: string;
  expectedAvailable: number;
  actualAvailable: number;
  discrepancy: number;
  discrepancyPercentage: number;
  unit: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation: string;
}

interface ValidationResult {
  isValid: boolean;
  hasWarnings: boolean;
  warnings: DiscrepancyWarning[];
  checkedAt: Date;
}
```

## Examples

See `/src/examples/benefit-validation-example.ts` for comprehensive examples including:

- Valid benefit (no discrepancy)
- Missed purchase detection
- Double-logged purchase detection
- Batch validation
- API data conversion
- Custom thresholds
- Post-checkout validation

Run examples:
```bash
npx ts-node src/examples/benefit-validation-example.ts
```

## Testing Scenarios

### Test Case 1: Consistent Balance (No Warning)
```typescript
{
  total: 4, available: 1, inCart: 1, consumed: 2
  // 4 = 1 + 1 + 2 ✓
}
```

### Test Case 2: Missed Purchase (High Severity)
```typescript
{
  total: 4, available: 2.5, inCart: 0.5, consumed: 1
  // Expected available: 4 - 0.5 - 1 = 2.5
  // Actual available: 2.5
  // Wait... this is CORRECT. Let me fix:

  total: 4, available: 2.5, inCart: 0, consumed: 1
  // Expected available: 4 - 0 - 1 = 3.0
  // Actual available: 2.5
  // Discrepancy: -0.5 (12.5%) → MEDIUM severity
}
```

### Test Case 3: Double-Logged Purchase (Medium Severity)
```typescript
{
  total: 4, available: 0.5, inCart: 0, consumed: 3.5
  // Expected available: 4 - 0 - 3.5 = 0.5
  // This is CORRECT. Let me fix:

  total: 4, available: 1.5, inCart: 0, consumed: 3.5
  // Expected available: 4 - 0 - 3.5 = 0.5
  // Actual available: 1.5
  // Discrepancy: +1.0 (25%) → HIGH severity
}
```

## Architecture Notes

### Why This Approach?

1. **Separation of Concerns**: Validation logic separate from UI
2. **Reusable**: Service can be used in React, React Native, or backend
3. **Configurable**: Thresholds can be adjusted per deployment or user preference
4. **Type-Safe**: Full TypeScript support with comprehensive types
5. **Testable**: Pure functions make testing straightforward

### Performance Considerations

- **Lightweight**: No heavy dependencies
- **Fast**: O(n) complexity for validating n benefits
- **Lazy**: Only validates when called (opt-in auto-validation in hooks)
- **Minimal Memory**: Small object footprint

## Future Enhancements

- [ ] Historical trend analysis (repeated discrepancies)
- [ ] Machine learning to detect patterns
- [ ] Automatic correction suggestions
- [ ] Integration with transaction history for root cause analysis
- [ ] User-adjustable thresholds in settings
- [ ] Analytics on discrepancy frequency

## Related Files

- `app/lib/services/benefitValidation.ts` - Service implementation
- `app/lib/hooks/useBenefitValidation.ts` - React hooks
- `app/components/BenefitValidationAlert.tsx` - UI components
- `src/examples/benefit-validation-example.ts` - Usage examples
- `backend/src/routes/manual-benefits.ts` - Backend integration point

## Support

For questions or issues:
1. Check the examples in `/src/examples/benefit-validation-example.ts`
2. Review the test scenarios in this README
3. See the React hook documentation in `/app/lib/hooks/useBenefitValidation.ts`
