# Walmart Inventory Integration - README

## Overview

This is the production implementation of **Task I1.2: Walmart Inventory API Integration** for the WIC Benefits Assistant app. The integration enables real-time product availability tracking for WIC-eligible items at Walmart stores.

## Quick Links

- **Quick Start**: [`WALMART_INVENTORY_QUICKSTART.md`](./WALMART_INVENTORY_QUICKSTART.md)
- **Implementation Details**: [`IMPLEMENTATION_SUMMARY_I1.2.md`](./IMPLEMENTATION_SUMMARY_I1.2.md)
- **Integration Guide**: [`src/services/inventory/INTEGRATION_GUIDE.md`](./src/services/inventory/INTEGRATION_GUIDE.md)
- **API Documentation**: [`src/services/inventory/README.md`](./src/services/inventory/README.md)

## What's Included

### Core Features
- ✅ OAuth 2.0 authentication with Walmart API
- ✅ Rate limiting (4,000 requests/day)
- ✅ Product inventory lookup by UPC
- ✅ Batch inventory requests for efficiency
- ✅ Backend database synchronization
- ✅ Stock status mapping (in_stock/low_stock/out_of_stock)
- ✅ Error handling with graceful degradation
- ✅ Sync scripts with multiple commands

### Code Structure
```
wic_project/
├── src/services/inventory/           # Frontend services
│   ├── WalmartApiClient.ts          # Walmart API client
│   ├── RateLimiter.ts               # Rate limiting
│   ├── InventoryService.ts          # Multi-retailer service
│   └── INTEGRATION_GUIDE.md         # Integration docs
├── backend/src/services/            # Backend services
│   ├── WalmartInventoryIntegration.ts  # Backend integration
│   └── InventorySyncService.ts      # Database sync
└── backend/src/scripts/
    └── sync-walmart-inventory.ts    # Sync commands
```

## Getting Started

### Prerequisites
1. Walmart API credentials (see Quick Start guide)
2. PostgreSQL database (migration 007 run)
3. Node.js environment configured

### Installation

1. **Get API Credentials**
   ```
   Visit: https://developer.walmart.com/
   Register → Create App → Get Client ID & Secret
   ```

2. **Configure Environment**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add:
   WALMART_CLIENT_ID=your_client_id
   WALMART_CLIENT_SECRET=your_client_secret
   ```

3. **Run Database Migration**
   ```bash
   npm run migrate:007
   ```

4. **Test Integration**
   ```bash
   npm run sync-inventory formula
   ```

## Usage Examples

### Frontend (React Native)
```typescript
import { inventoryService } from '@/services/inventory';

const inventory = await inventoryService.getInventory(
  '055000012345',  // UPC
  'walmart-1234'   // Store ID
);

console.log(inventory.status); // 'in_stock' | 'low_stock' | 'out_of_stock'
```

### Backend (Sync Script)
```bash
# Sync formula products (high priority)
npm run sync-inventory formula

# Sync specific stores and products
npm run sync-inventory sync

# View sync statistics
npm run sync-inventory stats

# Clean up stale data
npm run sync-inventory cleanup
```

## Architecture

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ InventoryService│ (Frontend)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│WalmartApiClient │ (with Rate Limiting)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Walmart API    │
└─────────────────┘

Backend Sync:
┌─────────────────┐
│  Sync Script    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ WalmartIntegration│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL     │
│  (inventory)    │
└─────────────────┘
```

## API Rate Limits

- **Free Tier**: 5,000 requests/day
- **Our Limit**: 4,000 requests/day (conservative)
- **Burst**: 10 concurrent requests
- **Algorithm**: Token bucket

### Usage Estimate
- Formula sync (50 products × 10 stores): 500 requests
- Recommended frequency: 4x/day = 2,000 requests (safe)

## Known Limitations

1. **Store-Specific Inventory**: Walmart's public API shows online availability, not exact store inventory. Store-level data requires partnership agreements.

2. **Exact Quantities**: API doesn't provide exact item counts. We use ranges (few/some/plenty).

3. **Aisle Locations**: Not available in public API. Future enhancement via crowdsourcing.

## Error Handling

The integration handles errors gracefully:
- **Authentication failed** → Check credentials
- **Rate limit exceeded** → Automatic wait and retry
- **Product not found** → Return "unknown" status
- **Network error** → Log and degrade gracefully

## Monitoring

Track sync jobs in the database:
```sql
SELECT * FROM inventory_sync_jobs 
ORDER BY created_at DESC 
LIMIT 10;
```

Check inventory freshness:
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE last_updated > NOW() - INTERVAL '1 hour') as fresh
FROM inventory;
```

## Security

- ✅ Credentials in environment variables only
- ✅ HTTPS for all API requests
- ✅ OAuth 2.0 authentication
- ✅ Automatic token refresh
- ✅ Rate limiting to prevent abuse
- ✅ No sensitive data in logs

## Testing

### Manual Testing
```bash
# Test sync with real API
npm run sync-inventory sync

# View results
npm run sync-inventory stats
```

### Database Verification
```bash
# Check inventory records
psql -d wic_benefits -c "SELECT * FROM inventory LIMIT 10;"

# Check sync jobs
psql -d wic_benefits -c "SELECT * FROM inventory_sync_jobs ORDER BY created_at DESC LIMIT 5;"
```

## Troubleshooting

### Common Issues

**"Authentication failed"**
- Verify WALMART_CLIENT_ID and WALMART_CLIENT_SECRET in .env
- Check that app is approved on developer.walmart.com
- Ensure credentials haven't expired

**"No Walmart stores found"**
- Add stores to database: `INSERT INTO stores (store_id, name) VALUES ('walmart-1234', 'Walmart #1234')`
- Store IDs must start with "walmart-"

**"Rate limit exceeded"**
- Reduce sync frequency
- Enable caching (already enabled by default)
- Consider upgrading to paid tier

## Performance Tips

1. **Enable Caching**: Already enabled (30min default, 15min for formula)
2. **Batch Requests**: Use `getInventoryBatch()` instead of individual calls
3. **Schedule Syncs**: Run during off-peak hours
4. **Regional Focus**: Only sync stores in active user regions

## Future Enhancements

### Phase 2 (Planned)
- [ ] Store-specific inventory (requires partnership)
- [ ] Real-time webhooks for updates
- [ ] Enhanced quantity estimates
- [ ] Aisle location tracking

### Phase 3 (Future)
- [ ] Kroger API integration (Task I1.3)
- [ ] Target API integration
- [ ] Web scraping fallback (Task I1.4)
- [ ] Multi-retailer comparison

## Cost Analysis

### Free Tier
- **Cost**: $0/month
- **Limit**: 5,000 requests/day
- **Use Case**: Development, small deployments (20-50 stores)

### Paid Tier (if needed)
- **Cost**: $500-2000/month
- **Limit**: Custom
- **Use Case**: Production scale (100+ stores)

## Documentation

- **Quick Start**: [`WALMART_INVENTORY_QUICKSTART.md`](./WALMART_INVENTORY_QUICKSTART.md) - Get started in 5 minutes
- **Implementation Summary**: [`IMPLEMENTATION_SUMMARY_I1.2.md`](./IMPLEMENTATION_SUMMARY_I1.2.md) - Full technical details
- **Integration Guide**: [`src/services/inventory/INTEGRATION_GUIDE.md`](./src/services/inventory/INTEGRATION_GUIDE.md) - API setup and usage
- **API Reference**: [`src/services/inventory/README.md`](./src/services/inventory/README.md) - Complete API documentation

## Support

- Walmart Developer Portal: https://developer.walmart.com/
- API Documentation: https://developer.walmart.com/api/us/mp/items
- Project Issues: GitHub repository

## Contributing

When extending this integration:
1. Follow existing code structure
2. Add tests for new functionality
3. Update documentation
4. Maintain rate limiting compliance

## License

Part of the WIC Benefits Assistant project. See main LICENSE file.

---

**Status**: Implementation complete ✅  
**Next Step**: Obtain Walmart API credentials and test  
**Task**: I1.2 - Implement Walmart inventory API integration  
**Date**: January 19, 2026
