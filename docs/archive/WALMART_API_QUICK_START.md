# Walmart API Quick Start Guide

Get up and running with Walmart inventory integration in 5 minutes.

## Step 1: Get API Credentials (1-2 days)

1. Go to https://developer.walmart.com/
2. Click "Sign Up" or "Sign In"
3. Create a new application
4. Copy your **Client ID** and **Client Secret**
5. Wait for approval (typically 1-2 business days)

## Step 2: Configure Environment (1 minute)

```bash
# Copy the example environment file
cp src/services/inventory/.env.example .env

# Edit .env and add your credentials
WALMART_CLIENT_ID=your_client_id_here
WALMART_CLIENT_SECRET=your_client_secret_here
```

## Step 3: Test the Integration (2 minutes)

```typescript
import { getInventoryManager } from '@/services/inventory';

async function testWalmartAPI() {
  const manager = getInventoryManager();

  // Test with a real product UPC (Similac formula)
  const inventory = await manager.getInventory(
    '055000012345',
    'walmart-1234'
  );

  console.log('✅ Walmart API working!');
  console.log('Status:', inventory.status);
  console.log('Updated:', inventory.lastUpdated);
}

testWalmartAPI();
```

## Step 4: Use in Your App (1 minute)

```typescript
import { getInventoryManager } from '@/services/inventory';

// Check if product is in stock
const manager = getInventoryManager();
const inventory = await manager.getInventory(productUPC, storeId);

if (inventory.status === 'in_stock') {
  console.log('✅ Product available!');
}
```

## That's It!

You now have real-time Walmart inventory integration.

## Next Steps

- **Read Documentation**: `src/services/inventory/README.md`
- **See Examples**: `src/services/inventory/examples/basic-usage.ts`
- **Integration Guide**: `docs/WALMART_INVENTORY_INTEGRATION_GUIDE.md`

## Common Issues

**Problem**: "Authentication failed"
- Verify credentials are correct in `.env`
- Check that your application was approved
- Make sure there are no extra spaces in credentials

**Problem**: "Rate limit exceeded"
- Free tier: 5,000 requests/day
- Enable caching to reduce API calls
- Consider upgrading to paid tier

**Problem**: "Product not found"
- Verify UPC is correct (include check digit)
- Product may not be in Walmart catalog
- Try searching by name instead

## Support

Questions? Check:
- Full documentation: `/src/services/inventory/README.md`
- Research notes: `/docs/research/retailer-api-research.md`
- Implementation summary: `/docs/TASK_I1.2_IMPLEMENTATION_SUMMARY.md`
