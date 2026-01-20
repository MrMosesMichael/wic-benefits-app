# Walmart Inventory API Integration Guide

## Overview

This implementation provides integration with Walmart's Open API to retrieve real-time product inventory data for WIC-eligible products. The integration is designed to be scalable, respectful of API rate limits, and fault-tolerant.

## Architecture

### Components

1. **WalmartApiClient** (`WalmartApiClient.ts`)
   - Handles authentication (OAuth 2.0 client credentials flow)
   - Makes authenticated API requests
   - Maps Walmart API responses to our data model
   - Manages rate limiting

2. **RateLimiter** (`RateLimiter.ts`)
   - Token bucket algorithm implementation
   - Prevents exceeding API rate limits
   - Configurable per-second, per-minute, per-hour, or per-day limits
   - Supports waiting for token availability

3. **InventoryService** (`InventoryService.ts`)
   - Multi-retailer aggregator service
   - Routes requests to appropriate retailer client
   - Provides unified interface for inventory operations
   - Handles fallback to "unknown" status when APIs unavailable

4. **WalmartInventoryIntegration** (Backend)
   - Backend-specific integration layer
   - Syncs inventory data to PostgreSQL database
   - Integrates with existing InventorySyncService
   - Provides batch sync operations

## Setup

### 1. Get Walmart API Credentials

1. Register at https://developer.walmart.com/
2. Create a new application
3. Note your Client ID and Client Secret
4. (Optional) Get an API Key for enhanced access

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Walmart API Credentials
WALMART_CLIENT_ID=your_client_id_here
WALMART_CLIENT_SECRET=your_client_secret_here
WALMART_API_KEY=your_api_key_here  # Optional
```

## Usage

### Backend Sync Scripts

```bash
# Sync sample inventory
npm run sync-inventory sync

# Sync formula products (high priority)
npm run sync-inventory formula

# View sync statistics
npm run sync-inventory stats

# Clean up stale crowdsourced data
npm run sync-inventory cleanup
```

## Rate Limiting

The Walmart API has the following limits:
- **5,000 requests per day** per API key (typical)
- Our implementation: Conservative 4,000 requests/day (~2.78/min)
- Burst size: 10 requests
- Automatic waiting when rate limit reached

## Limitations

1. **Store-Specific Inventory**: Public API shows online availability, not store-specific inventory
2. **Quantity Data**: Exact quantities typically not available
3. **Aisle Location**: Not available in public API

## Future Enhancements

- Store-specific inventory (requires partnership)
- Real-time updates via webhooks
- Multi-retailer support (Kroger, Target, etc.)
- Formula shortage alerts

