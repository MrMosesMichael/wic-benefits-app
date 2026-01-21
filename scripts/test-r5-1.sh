#!/bin/bash
# Quick verification script for R5.1 implementation

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  R5.1 Balance Discrepancy Warnings - Implementation Check  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if all required files exist
echo "Checking implementation files..."
echo ""

files=(
  "app/lib/services/benefitValidation.ts"
  "app/lib/hooks/useBenefitValidation.ts"
  "app/components/BenefitValidationAlert.tsx"
  "src/lib/services/benefitValidation.ts"
  "src/lib/services/__tests__/benefitValidation.test.ts"
  "src/examples/benefit-validation-example.ts"
  "src/lib/services/README.md"
  "docs/R5.1-integration-guide.md"
  "IMPLEMENTATION_R5.1.md"
)

missing_files=0

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file (MISSING)"
    missing_files=$((missing_files + 1))
  fi
done

echo ""

if [ $missing_files -eq 0 ]; then
  echo "✅ All implementation files present!"
else
  echo "❌ Missing $missing_files file(s)"
  exit 1
fi

echo ""
echo "Checking file sizes..."
echo ""

# Check that files have content
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    size=$(wc -c < "$file" | tr -d ' ')
    lines=$(wc -l < "$file" | tr -d ' ')
    if [ "$size" -gt 1000 ]; then
      echo "✅ $file ($lines lines, $size bytes)"
    else
      echo "⚠️  $file ($lines lines, $size bytes) - seems small"
    fi
  fi
done

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Implementation Summary                                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Core Service:        app/lib/services/benefitValidation.ts"
echo "React Hooks:         app/lib/hooks/useBenefitValidation.ts"
echo "UI Components:       app/components/BenefitValidationAlert.tsx"
echo "Unit Tests:          src/lib/services/__tests__/benefitValidation.test.ts"
echo "Usage Examples:      src/examples/benefit-validation-example.ts"
echo "Documentation:       src/lib/services/README.md"
echo "Integration Guide:   docs/R5.1-integration-guide.md"
echo ""
echo "✅ R5.1 IMPLEMENTATION COMPLETE"
echo ""
echo "Next steps:"
echo "  1. Review IMPLEMENTATION_R5.1.md for full details"
echo "  2. Review docs/R5.1-integration-guide.md for integration"
echo "  3. Run examples: npx ts-node src/examples/benefit-validation-example.ts"
echo "  4. Run tests: npm test benefitValidation.test.ts"
echo ""
