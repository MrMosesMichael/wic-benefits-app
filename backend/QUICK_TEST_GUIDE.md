# Quick Test Guide - Phase 1 Polish

## Backend Server Running

The backend server should already be running at `http://localhost:3000`. If not:

```bash
cd /Users/moses/projects/wic_project/backend
npm run dev
```

## Test Products (Real Michigan APL)

These UPC codes are confirmed in the Michigan APL and ready to scan:

### Cereal (36 oz benefit available)
- **0886926045833** - Corn Flakes Plain
- **0884912443861** - Honey Bunches of Oat Plain
- **0884912443854** - Honey Bunches of Oat With Almonds

### Milk (4 gal benefit available)
- **0854432002428** - Fresh & Taste Skim Milk (Quart)
- **0854432002411** - Fresh & Taste 1% Milk (Quart)

### Peanut Butter (18 oz benefit available)
- **0859459002024** - Velvet Crunchy Peanut Butter

### Eggs (2 dozen benefit available)
- **841330117255** - Fresh Thyme Market Cage-Free Eggs
- **092659011018** - Busch's Grade A Eggs

## Quick API Tests

### 1. Check Benefits (Current State)
```bash
curl -s "http://localhost:3000/api/v1/benefits?household_id=1" | python3 -m json.tool
```

Expected: See cereal with consumed=12, in_cart=0, available=24

### 2. Check Eligibility
```bash
# Test eligible product
curl -s "http://localhost:3000/api/v1/eligibility/0886926045833" | python3 -m json.tool

# Test ineligible product (not in Michigan APL)
curl -s "http://localhost:3000/api/v1/eligibility/999999999999" | python3 -m json.tool
```

### 3. Add to Cart
```bash
curl -s -X POST "http://localhost:3000/api/v1/cart/items" \
  -H "Content-Type: application/json" \
  -d '{
    "householdId":"1",
    "participantId":"1",
    "upc":"0884912443861",
    "productName":"Honey Bunches of Oat",
    "category":"cereal",
    "quantity":12,
    "unit":"oz",
    "brand":"Honey Bunches of Oat"
  }' | python3 -m json.tool
```

### 4. View Cart
```bash
curl -s "http://localhost:3000/api/v1/cart?household_id=1" | python3 -m json.tool
```

### 5. Checkout
```bash
curl -s -X POST "http://localhost:3000/api/v1/cart/checkout" \
  -H "Content-Type: application/json" \
  -d '{"householdId":"1"}' | python3 -m json.tool
```

### 6. Clear Cart (if needed)
```bash
curl -s -X DELETE "http://localhost:3000/api/v1/cart?household_id=1" | python3 -m json.tool
```

## Mobile App Testing

### Start Expo
```bash
cd /Users/moses/projects/wic_project/app
npm start
```

### Test Flow

1. **Home Screen**
   - Tap "Shopping Cart" → Should show empty cart
   - Go back

2. **Check Benefits**
   - Tap "View Benefits"
   - See three-state progress bars:
     - Gray (consumed)
     - Amber (in cart)
     - Green (available)
   - Go back

3. **Scan Product**
   - Tap "Scan Product"
   - Toggle between "Check Eligibility" and "Shopping Mode"
   - Scan one of the test UPCs above
   - Should show "WIC Approved" with green badge

4. **Add to Cart**
   - After scanning, participant should auto-select
   - Tap "Add to Cart"
   - Choose "View Cart" from success dialog

5. **Cart Management**
   - Verify item appears in cart
   - Shows participant info
   - Shows quantity and category
   - Try removing an item
   - Try "Clear All Items"

6. **Checkout**
   - Add items back to cart
   - Tap "Checkout" button
   - Confirm purchase
   - Choose "View Benefits"

7. **Verify Benefits Updated**
   - See progress bars reflect purchase
   - Consumed should increase
   - In Cart should be 0
   - Available should decrease

## Expected Behavior

### Benefits Calculation (Cereal Example)

Starting state:
- Total: 36 oz
- Available: 24 oz
- In Cart: 0 oz
- Consumed: 12 oz

After adding 12 oz to cart:
- Total: 36 oz
- Available: 12 oz
- In Cart: 12 oz
- Consumed: 12 oz

After checkout:
- Total: 36 oz
- Available: 12 oz
- In Cart: 0 oz
- Consumed: 24 oz

## Troubleshooting

### Product Not Found
- Make sure UPC is from the test list above
- Check that import completed (12,344 products)
- UPC might not be in Michigan APL (this is normal)

### Can't Add to Cart
- Check available benefits > 0
- Verify participant has that category
- Make sure quantity doesn't exceed available

### Backend Not Responding
- Check server is running: `curl http://localhost:3000/health`
- Check database connection
- Look for errors in terminal

### Frontend Can't Connect
- Check API_BASE_URL in `app/lib/services/api.ts`
- Should be your local IP: `http://192.168.12.94:3000`
- Make sure phone and computer on same network

## Current Demo Data

**Household ID:** 1
**Participant:** Demo Child (ID: 1, Type: child)

**Benefits:**
- Milk: 4 gal
- Eggs: 2 dozen
- Cereal: 36 oz (currently 12 oz consumed from previous test)
- Peanut Butter: 18 oz

## Database Stats

```sql
-- Total products in Michigan APL
SELECT COUNT(*) FROM apl_products WHERE state = 'MI';
-- Expected: 12,344

-- Products by category
SELECT category, COUNT(*) as count
FROM apl_products
WHERE state = 'MI'
GROUP BY category
ORDER BY count DESC;
```

## Reset Demo Data (if needed)

To reset benefits to original state:

```sql
UPDATE benefits SET
  available_amount = total_amount,
  in_cart_amount = 0,
  consumed_amount = 0
WHERE participant_id = 1;
```

Or run from command line:
```bash
psql wic_benefits -c "UPDATE benefits SET available_amount = total_amount, in_cart_amount = 0, consumed_amount = 0 WHERE participant_id = 1;"
```
