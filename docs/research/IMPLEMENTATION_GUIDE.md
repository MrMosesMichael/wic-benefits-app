# Retailer API Implementation Guide

Quick reference for developers implementing inventory integrations (Tasks I1.2-I1.5).

## Overview

This guide provides actionable steps for implementing retailer inventory APIs based on research completed in Task I1.1.

📄 **Full Research Document:** [retailer-api-research.md](./retailer-api-research.md)
📊 **Data Summary:** [retailer-api-summary.json](./retailer-api-summary.json)

---

## Task I1.2: Walmart API Integration

### Prerequisites
- [ ] Register at https://developer.walmart.com/
- [ ] Obtain API credentials (typically approved in 1-2 business days)
- [ ] Review Walmart API documentation

### Implementation Steps

1. **Set up authentication**
   - Implement OAuth 2.0 client
   - Store credentials in environment variables
   - Implement token refresh logic

2. **Create Walmart inventory service**
   - Build API client with rate limiting (5000 req/day free tier)
   - Implement UPC-based product lookup
   - Parse stock status (binary: in stock / out of stock)
   - Add caching layer (reduce API calls by 80%+)

3. **Data mapping**
   - Map Walmart product data to unified inventory schema
   - Set confidence score: 0.85 for API data
   - Track data freshness (15-30 min updates)

4. **Error handling**
   - Implement exponential backoff on rate limits
   - Fallback to cached data on API failures
   - Log errors for monitoring

### Sample Code Structure

```typescript
// services/inventory/walmart/WalmartInventoryService.ts
class WalmartInventoryService implements InventoryService {
  async getInventory(upc: string, storeId: string): Promise<InventoryData> {
    // 1. Check cache first
    // 2. Call Walmart API
    // 3. Parse response
    // 4. Normalize to unified schema
    // 5. Cache result
    // 6. Return normalized data
  }
}
```

### Testing
- Test with WIC-eligible products (formula, milk, cereal)
- Verify rate limiting works correctly
- Test error scenarios (API down, invalid UPC, etc.)
- Validate data freshness tracking

### Success Criteria
- ✅ Successfully authenticate with Walmart API
- ✅ Retrieve inventory for valid UPCs
- ✅ Handle rate limits gracefully
- ✅ Cache data to reduce API calls
- ✅ Map data to unified schema

**Estimated Effort:** 2-3 days

---

## Task I1.3: Kroger API Integration

### Prerequisites
- [ ] Apply for Kroger Developer Program at https://developer.kroger.com/
- [ ] Wait for approval (1-2 weeks)
- [ ] Review Kroger API documentation
- [ ] Understand multi-banner support (Fred Meyer, Ralphs, etc.)

### Implementation Steps

1. **Set up OAuth 2.0 authentication**
   - Implement client credentials flow
   - Store credentials securely
   - Handle token expiration

2. **Create Kroger inventory service**
   - Build API client with configurable rate limits
   - Implement product lookup by UPC + store location
   - Parse stock levels (in_stock, low_stock, out_of_stock)
   - Extract aisle location if available

3. **Multi-banner support**
   - Map store IDs across Kroger banners
   - Handle banner-specific differences
   - Test across Fred Meyer (OR), Ralphs (NC), etc.

4. **Data mapping**
   - Map Kroger data to unified schema
   - Confidence score: 0.90 for Kroger API (high quality)
   - Handle quantity indicators (low/medium/high stock)

### Sample Code Structure

```typescript
// services/inventory/kroger/KrogerInventoryService.ts
class KrogerInventoryService implements InventoryService {
  private bannerMap = {
    'kroger': 'KR',
    'fred_meyer': 'FM',
    'ralphs': 'RA',
    // ...
  };

  async getInventory(upc: string, storeId: string): Promise<InventoryData> {
    // 1. Determine banner from storeId
    // 2. Build API request
    // 3. Call Kroger API with location filter
    // 4. Parse stock level and aisle
    // 5. Normalize to unified schema
    // 6. Cache result
  }
}
```

### Testing
- Test across multiple Kroger banner brands
- Verify aisle location extraction (where available)
- Test with priority state stores (MI, NC, OR)
- Validate stock level parsing

### Success Criteria
- ✅ Authenticate with Kroger API
- ✅ Retrieve inventory across banner brands
- ✅ Parse stock levels correctly
- ✅ Extract aisle location (pilot stores)
- ✅ Map to unified schema

**Estimated Effort:** 3-4 days

---

## Task I1.4: Web Scraping Framework

### Prerequisites
- [ ] Set up scraping infrastructure (Node.js with Puppeteer/Playwright)
- [ ] Set up proxy rotation service (optional but recommended)
- [ ] Review retailer ToS and robots.txt files

### Implementation Steps

1. **Build generic scraper framework**
   ```typescript
   abstract class RetailerScraper {
     abstract getInventory(upc: string, storeId: string): Promise<InventoryData>;
     protected abstract selectors: SelectorConfig;
     protected rateLimit: RateLimiter;
     protected userAgentRotation: UserAgentManager;
   }
   ```

2. **Implement retailer-specific scrapers**

   **Priority 1: Publix (Florida - critical)**
   - Scrape publix.com/shop for inventory
   - Binary stock status only
   - Confidence: 0.65 (web scraping)

   **Priority 2: Target**
   - Scrape Target.com for inventory
   - Parse low/limited/in stock indicators
   - Confidence: 0.70

   **Priority 3: H-E-B (Texas - critical)**
   - Scrape heb.com for inventory
   - Handle Texas-specific stores
   - Confidence: 0.70

   **Priority 4: Safeway/Albertsons**
   - Scrape safeway.com or albertsons.com
   - Handle multiple banner brands
   - Confidence: 0.65

3. **Anti-bot handling**
   - Rotate user agents
   - Implement delays between requests
   - Use headless browser for JavaScript-heavy sites
   - Consider CAPTCHA solving service for critical scrapers

4. **Scheduling**
   - Implement cron jobs for periodic scraping
   - Formula products: Every 15-30 minutes
   - Other products: Every 4-6 hours
   - Respect rate limits and be a good citizen

### Sample Code Structure

```typescript
// services/inventory/scraping/PublixScraper.ts
class PublixScraper extends RetailerScraper {
  protected selectors = {
    stockStatus: '.product-availability',
    quantity: '.product-quantity',
    price: '.product-price'
  };

  async getInventory(upc: string, storeId: string): Promise<InventoryData> {
    const url = this.buildUrl(upc, storeId);
    const page = await this.browser.newPage();
    await page.goto(url);

    const stockStatus = await page.$eval(
      this.selectors.stockStatus,
      el => el.textContent
    );

    return this.normalizeData({
      upc,
      storeId,
      status: this.parseStatus(stockStatus),
      source: 'scrape',
      confidence: 0.65,
      lastUpdated: new Date()
    });
  }
}
```

### Testing
- Test each scraper with real store IDs
- Verify parsing accuracy
- Test rate limiting
- Monitor for scraping blocks

### Success Criteria
- ✅ Publix scraper working for FL stores
- ✅ Target scraper working (national)
- ✅ H-E-B scraper working for TX stores
- ✅ Safeway/Albertsons scraper working for OR stores
- ✅ Rate limiting and anti-bot measures in place
- ✅ Scheduled jobs running

**Estimated Effort:** 4-5 days

---

## Task I1.5: Data Normalization Layer

### Prerequisites
- [ ] At least one data source implemented (I1.2, I1.3, or I1.4)
- [ ] Unified inventory schema defined

### Implementation Steps

1. **Define unified inventory schema**
   ```typescript
   interface InventoryData {
     upc: string;
     storeId: string;
     status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
     quantity?: number;
     quantityRange?: 'few' | 'some' | 'plenty';
     aisle?: string;
     lastUpdated: Date;
     source: 'api' | 'scrape' | 'crowdsourced';
     confidence: number;  // 0-1
   }
   ```

2. **Create source adapters**
   - WalmartAdapter: Maps Walmart API response to unified schema
   - KrogerAdapter: Maps Kroger API response to unified schema
   - ScraperAdapter: Maps scraping results to unified schema
   - CrowdsourcedAdapter: Maps user reports to unified schema

3. **Implement confidence scoring**
   ```typescript
   function calculateConfidence(source: DataSource, age: number): number {
     const baseConfidence = {
       'api': 0.90,
       'scrape': 0.70,
       'crowdsourced': 0.50
     }[source];

     const ageFactor = Math.max(0, 1 - (age / (24 * 60))); // Decay over 24 hours
     return baseConfidence * ageFactor;
   }
   ```

4. **Multi-source aggregation**
   - Prefer most recent data
   - Weight by confidence score
   - Fallback to cached data when sources unavailable

5. **Create unified inventory service**
   ```typescript
   class UnifiedInventoryService {
     private sources: InventoryService[] = [
       walmartService,
       krogerService,
       scrapingService,
       crowdsourcedService
     ];

     async getInventory(upc: string, storeId: string): Promise<InventoryData> {
       // 1. Determine which source(s) to query based on store
       // 2. Query available sources in parallel
       // 3. Aggregate results
       // 4. Apply confidence scoring
       // 5. Return best data
     }
   }
   ```

### Sample Code Structure

```typescript
// services/inventory/UnifiedInventoryService.ts
export class UnifiedInventoryService {
  constructor(
    private walmart: WalmartInventoryService,
    private kroger: KrogerInventoryService,
    private scraping: ScrapingService,
    private cache: CacheService
  ) {}

  async getInventory(upc: string, storeId: string): Promise<InventoryData> {
    const store = await this.storeService.getStore(storeId);

    // Route to appropriate source based on store
    if (store.chain === 'Walmart' && this.walmart.isAvailable()) {
      return this.walmart.getInventory(upc, storeId);
    }

    if (this.isKrogerBanner(store.chain) && this.kroger.isAvailable()) {
      return this.kroger.getInventory(upc, storeId);
    }

    // Fallback to scraping or crowdsourced
    return this.scraping.getInventory(upc, storeId);
  }

  async getInventoryMultiSource(
    upc: string,
    storeId: string
  ): Promise<InventoryData> {
    // Query multiple sources and aggregate
    const results = await Promise.allSettled([
      this.walmart.getInventory(upc, storeId),
      this.crowdsourced.getInventory(upc, storeId)
    ]);

    return this.aggregateResults(results);
  }
}
```

### Testing
- Test with each data source
- Verify confidence scoring
- Test multi-source aggregation
- Validate fallback behavior

### Success Criteria
- ✅ Unified schema defined and used across all sources
- ✅ Adapters created for each data source
- ✅ Confidence scoring working correctly
- ✅ Multi-source aggregation functional
- ✅ Graceful degradation when sources fail

**Estimated Effort:** 2-3 days

---

## Infrastructure Setup

### Required Services

1. **Redis** (caching)
   - Cache inventory data with TTL
   - Cache API responses
   - Distributed rate limiting

2. **PostgreSQL** (storage)
   - Store inventory history
   - Store scraping results
   - Analytics data

3. **Job Scheduler** (cron/bull queue)
   - Scheduled scraping jobs
   - API polling for formula products
   - Data cleanup jobs

4. **Monitoring**
   - API health checks
   - Scraper success rates
   - Data freshness alerts
   - Error rate monitoring

### Environment Variables

```bash
# Walmart API
WALMART_API_KEY=xxx
WALMART_API_SECRET=xxx

# Kroger API
KROGER_CLIENT_ID=xxx
KROGER_CLIENT_SECRET=xxx

# Infrastructure
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://localhost:5432/wic_app

# Scraping
PROXY_SERVICE_URL=xxx
PROXY_API_KEY=xxx
```

---

## Formula Tracking - Special Requirements

### Critical Formula Tracking

Given the 2022 formula shortage crisis, infant formula requires special handling:

1. **Real-time updates**
   - Poll formula products every 15 minutes (vs 4-6 hours for other products)
   - Webhook support where available
   - Priority queue for formula lookups

2. **Multi-source aggregation**
   - Combine API, scraping, AND crowdsourced data
   - Lower confidence threshold for displaying data
   - "Recently seen by shoppers" supplemental data

3. **Proactive alerting**
   - Push notifications when formula comes in stock
   - Regional shortage detection
   - Alternative product suggestions

4. **Cross-store search**
   - Query multiple stores in parallel
   - Distance-based ranking
   - Show all stores with stock within radius

### Implementation

```typescript
// services/inventory/FormulaTrackingService.ts
class FormulaTrackingService {
  private FORMULA_CATEGORIES = ['infant_formula', 'specialty_formula'];
  private FORMULA_UPDATE_INTERVAL = 15 * 60 * 1000; // 15 minutes

  async trackFormula(upc: string, userLocation: GeoPoint) {
    // 1. Identify nearby stores (within 25 miles)
    // 2. Query inventory across all stores in parallel
    // 3. Aggregate results
    // 4. Return stores with stock, sorted by distance
    // 5. Set up alert if not found
  }

  async detectShortage(region: string, formulaCategory: string) {
    // 1. Query inventory across stores in region
    // 2. Calculate percentage out of stock
    // 3. If > 70% out of stock, trigger shortage alert
    // 4. Suggest alternatives
  }
}
```

---

## Monitoring & Metrics

### Key Metrics to Track

1. **Data Source Health**
   - API uptime per retailer
   - Scraper success rate
   - Average response time

2. **Data Quality**
   - Accuracy (compare to user reports)
   - Freshness (average age of data)
   - Coverage (% of stores with inventory data)

3. **Performance**
   - Query latency (p50, p95, p99)
   - Cache hit rate
   - API rate limit utilization

4. **Cost**
   - API usage per retailer
   - Scraping costs (proxy, compute)
   - Total monthly spend

### Alerts

- API error rate > 5% for 10 minutes
- Scraper failing for > 1 hour
- Data freshness > 6 hours for formula products
- Cache hit rate < 70%
- API rate limit > 90% utilized

---

## Cost Optimization

### Strategies to Minimize Costs

1. **Aggressive caching**
   - Cache API responses with appropriate TTL
   - Serve cached data when possible
   - Only refresh on user request or scheduled sync

2. **Selective queries**
   - Only query WIC-eligible products
   - Don't query every product in catalog
   - Focus on products in active user benefits

3. **Regional optimization**
   - Only query stores in active user regions
   - Don't maintain inventory for unused stores
   - Lazy load inventory on store entry

4. **Batch requests**
   - Combine multiple product lookups where APIs support
   - Use store-wide inventory dumps instead of per-product

5. **Free tier maximization**
   - Design to stay within free tiers initially
   - Upgrade only when user base justifies

**Expected savings:** 80%+ reduction in API costs

---

## Legal & Compliance

### Before Launching

- [ ] Review Walmart API Terms of Service
- [ ] Review Kroger Developer Terms
- [ ] Review scraping legality with legal counsel
- [ ] Implement robots.txt compliance
- [ ] Add proper attribution where required
- [ ] Create privacy policy covering inventory data usage

### Ongoing

- [ ] Monitor for ToS changes
- [ ] Respect rate limits
- [ ] Be a good API citizen
- [ ] Consider partnership agreements before commercial launch

---

## Testing Strategy

### Unit Tests
- Test each adapter's data normalization
- Test confidence scoring algorithm
- Test rate limiting logic
- Test error handling

### Integration Tests
- Test full API integration flows
- Test scraping with real websites
- Test multi-source aggregation
- Test caching behavior

### End-to-End Tests
- Test complete inventory lookup flow
- Test formula tracking across stores
- Test user-triggered refresh
- Test offline/cache fallback

### Load Tests
- Test at 1000 concurrent users
- Test API rate limit handling
- Test cache performance
- Test database query performance

---

## Rollout Plan

### Phase 1: MVP (Weeks 1-4)
- ✅ Task I1.1: Research complete
- 🔄 Task I1.2: Walmart API
- 🔄 Task I1.3: Kroger API
- 🔄 Task I1.4: Publix scraper
- 🔄 Task I1.5: Normalization layer

### Phase 2: Expansion (Weeks 4-8)
- Target scraper
- H-E-B scraper (Texas)
- Safeway/Albertsons scraper
- Crowdsourced inventory

### Phase 3: Enhancement (Weeks 8-12)
- Formula shortage detection
- Predictive inventory
- Aisle-level navigation
- Regional partnerships

---

## Resources

- [Full Research Document](./retailer-api-research.md) - Detailed findings
- [API Summary JSON](./retailer-api-summary.json) - Structured data
- [Design Document](../../specs/wic-benefits-app/design.md) - System architecture
- [Inventory Spec](../../specs/wic-benefits-app/specs/inventory/spec.md) - Requirements

---

## Support

Questions about implementation?
1. Review the full research document
2. Check API documentation for specific retailer
3. Review data model in design.md
4. Consult inventory specification

---

**Last Updated:** 2026-01-10
**Document Version:** 1.0
**Related Tasks:** I1.1 (complete), I1.2-I1.5 (pending)
