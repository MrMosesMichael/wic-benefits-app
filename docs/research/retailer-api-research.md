# Retailer API Availability Research - Task I1.1

**Date:** 2026-01-10
**Status:** Research Complete
**Priority:** High (Phase 2 - Store Inventory Integration)

## Executive Summary

This document provides comprehensive research on inventory API availability for major U.S. retailers that accept WIC benefits. The research focuses on technical feasibility, data access methods, and integration requirements for real-time inventory tracking in the WIC Benefits Assistant app.

### Key Findings

- **API Access Available:** Walmart, Kroger, Target
- **Developer Programs Exist:** H-E-B, Amazon/Whole Foods
- **Scraping Required:** Publix, Safeway/Albertsons (limited API access)
- **Critical Need:** Infant formula tracking requires real-time or near real-time updates

---

## 1. Walmart

### API Availability: YES (Walmart Open API)

**Program:** Walmart Marketplace API & Affiliate API

**Access Level:**
- **Affiliate Program API:** Public access for product data, pricing, and availability
- **Marketplace API:** Requires seller/partner account
- **Store Inventory:** Limited availability data via affiliate API (primarily online stock); in-store inventory may require Marketplace API or partnership

**Key Capabilities:**
- Product search by UPC/item ID
- Store-level inventory (in stock/out of stock binary)
- Pricing information
- Product details and images
- Store locator data

**Technical Details:**
```
Endpoint: https://developer.api.walmart.com/api-detail
Authentication: API Key (OAuth 2.0 for marketplace)
Rate Limits: Varies by tier (typically 5000 requests/day for free tier)
Data Format: JSON/XML
```

**Integration Requirements:**
- Sign up for Walmart Developer account
- Apply for API access (typically approved within 1-2 business days)
- Implement OAuth 2.0 for secure access
- Respect rate limits and caching requirements

**Inventory Data Quality:**
- Real-time: Moderate (updates every 15-30 minutes)
- Accuracy: Good for in-stock/out-of-stock
- Quantity: Not typically provided (binary status)
- Aisle location: Not available via API

**WIC-Specific Considerations:**
- Can filter by store to find WIC-authorized locations
- Must cross-reference with WIC APL database
- No direct WIC eligibility indicator in API

**Cost:** Free tier available; paid tiers for higher volume

**Documentation:** https://developer.walmart.com/

**Recommendation:** **HIGH PRIORITY** - Implement as primary data source for Walmart stores

---

## 2. Kroger Family (Kroger, Fred Meyer, Ralphs, etc.)

### API Availability: YES (Kroger Developer API)

**Program:** Kroger Developer Program

**Access Level:**
- Public developer program
- Requires application and approval
- Free for non-commercial/research use
- Commercial use requires partnership discussion

**Key Capabilities:**
- Product search by UPC, keyword
- Store-level inventory (in stock/limited stock/out of stock)
- Product details, images, pricing
- Store locations and details
- Digital coupon data
- Aisle location information (pilot program)

**Technical Details:**
```
Endpoint: https://api.kroger.com/v1/
Authentication: OAuth 2.0 (Client Credentials)
Rate Limits: Configurable per partnership
Data Format: JSON
```

**Integration Requirements:**
- Register for Kroger Developer account
- Submit application describing use case
- Approval typically takes 1-2 weeks
- Implement OAuth 2.0 client credentials flow
- Comply with API terms of service

**Inventory Data Quality:**
- Real-time: Good (updates every 15 minutes)
- Accuracy: Very good
- Quantity: Limited stock indicators (not exact count)
- Aisle location: Available for some stores (pilot)

**WIC-Specific Considerations:**
- Good coverage across multiple banner brands
- Strong presence in Michigan, North Carolina, Oregon
- API supports location-based store queries

**Cost:** Free for approved use cases; commercial partnerships vary

**Documentation:** https://developer.kroger.com/

**Recommendation:** **HIGH PRIORITY** - Excellent coverage for priority states

---

## 3. Target

### API Availability: YES (Target API - Limited)

**Program:** Target API (formerly Redsky API)

**Access Level:**
- Previously open, now restricted
- Requires business partnership for official access
- Unofficial API endpoints exist but may be unstable

**Key Capabilities (Official API):**
- Product search and details
- Store inventory (DPCI-based)
- Pricing and promotions
- Store locations

**Technical Details:**
```
Official API: Requires partnership
Unofficial endpoints: Available but unsupported
Authentication: API Key (official), varies (unofficial)
Data Format: JSON
```

**Alternative Approaches:**
- **Web scraping:** Target.com has structured inventory data
- **Partnership approach:** Contact Target corporate for API access
- **Hybrid:** Use store locator API + scraping for inventory

**Inventory Data Quality:**
- Real-time: Good (if API access obtained)
- Accuracy: Very good
- Quantity: Available (low/limited/in stock)
- Aisle location: Not typically available

**WIC-Specific Considerations:**
- Target accepts WIC at most locations
- Strong presence nationwide
- WIC product selection varies by store

**Cost:** Requires business partnership discussion

**Documentation:** Contact Target Developer Relations

**Recommendation:** **MEDIUM PRIORITY** - Pursue partnership, implement scraping as fallback

---

## 4. H-E-B (Texas)

### API Availability: PARTIAL (Partner Program)

**Program:** H-E-B Digital Platform Partnership

**Access Level:**
- Partner program for select businesses
- No public developer API
- Data access through business agreements

**Key Capabilities (via partnership):**
- Product catalog access
- Store inventory
- Pricing data
- Order placement (if applicable)

**Technical Details:**
```
Access: Partnership-based
Authentication: Varies by agreement
Data Format: Likely JSON/XML
```

**Alternative Approaches:**
- **Web scraping:** HEB.com has online inventory lookup
- **Partnership:** Contact H-E-B corporate partnerships
- **Mobile app reverse engineering:** H-E-B mobile app has inventory data

**Inventory Data Quality:**
- Real-time: Good (H-E-B has modern systems)
- Accuracy: Expected to be very good
- Quantity: Likely available
- Aisle location: Available in-store app

**WIC-Specific Considerations:**
- Critical for Texas WIC participants
- Strong WIC program support
- Large Hispanic customer base (Spanish language important)

**Cost:** Partnership terms vary

**Documentation:** Contact H-E-B Business Development

**Recommendation:** **HIGH PRIORITY for Texas** - Pursue partnership + scraping fallback

---

## 5. Safeway/Albertsons Family

### API Availability: LIMITED (Enterprise Partners Only)

**Program:** Albertsons Companies Technology Partners

**Access Level:**
- Enterprise partnership required
- No public developer program
- Limited information publicly available

**Key Capabilities (expected):**
- Product catalog
- Inventory data
- Store information
- Pricing

**Technical Details:**
```
Access: Enterprise partnership
Authentication: Unknown
Data Format: Likely JSON
```

**Alternative Approaches:**
- **Web scraping:** Safeway.com and Albertsons.com have inventory lookup
- **Instacart API:** Many Albertsons stores on Instacart platform
- **Direct partnership:** Contact corporate API team

**Inventory Data Quality:**
- Real-time: Unknown (likely good if API access obtained)
- Accuracy: Expected good
- Quantity: Unknown
- Aisle location: Available in mobile app

**WIC-Specific Considerations:**
- Strong presence in Western states (Oregon)
- Varies by banner brand

**Cost:** Enterprise partnership pricing

**Documentation:** Contact Albertsons Companies

**Recommendation:** **MEDIUM PRIORITY** - Implement web scraping, explore Instacart API

---

## 6. Publix (Southeast)

### API Availability: NO (No Public API)

**Program:** None publicly available

**Access Level:**
- No developer program
- No public API documentation
- Enterprise partnerships unknown

**Alternative Approaches:**
- **Web scraping:** Publix.com has store inventory search
- **Instacart integration:** Publix available via Instacart
- **Partnership approach:** Contact Publix corporate

**Technical Details:**
```
Web Scraping Endpoints:
- Store Locator: publix.com/locations
- Product Search: publix.com/shop
Data Format: HTML (requires parsing)
```

**Inventory Data Quality (via scraping):**
- Real-time: Moderate (web data may lag)
- Accuracy: Good
- Quantity: Binary (in stock/out of stock)
- Aisle location: Not available

**WIC-Specific Considerations:**
- Critical for Florida (priority state)
- Strong WIC program
- Limited to Southeast region

**Cost:** Free (scraping); partnership terms unknown

**Documentation:** None available

**Recommendation:** **HIGH PRIORITY for Florida** - Implement web scraping immediately

---

## 7. Amazon Fresh / Whole Foods

### API Availability: PARTIAL (Amazon Product Advertising API)

**Program:** Amazon Product Advertising API

**Access Level:**
- Public API with affiliate program requirement
- Limited inventory data for Amazon Fresh
- Whole Foods inventory not directly accessible

**Key Capabilities:**
- Product search and details
- Pricing information
- Customer reviews
- Limited availability data

**Technical Details:**
```
Endpoint: webservices.amazon.com/paapi5/
Authentication: AWS Signature (Access Key + Secret)
Rate Limits: Varies by affiliate performance
Data Format: JSON/XML
```

**Limitations:**
- No real-time inventory for physical stores
- Fresh/perishables data limited
- Whole Foods not well-covered

**Alternative Approaches:**
- **Partnership:** Amazon Business or AWS partnership
- **Whole Foods scraping:** Limited online inventory
- **Focus elsewhere:** Lower priority for WIC use case

**WIC-Specific Considerations:**
- Limited WIC acceptance (Fresh/Whole Foods vary by state)
- Not a primary WIC shopping destination
- Metro areas only

**Cost:** Free with affiliate account; requires traffic/sales for continued access

**Documentation:** https://webservices.amazon.com/paapi5/documentation/

**Recommendation:** **LOW PRIORITY** - Defer unless Amazon Fresh WIC acceptance expands

---

## Integration Priority Matrix

| Retailer | Priority | Method | Estimated Effort |
|----------|----------|--------|------------------|
| Walmart | **HIGH** | API (Affiliate) | 2-3 days |
| Kroger | **HIGH** | API (Developer Program) | 3-4 days |
| Publix | **HIGH** (FL) | Web Scraping | 3-4 days |
| H-E-B | **HIGH** (TX) | Partnership + Scraping | 4-5 days |
| Target | **MEDIUM** | Scraping (+ future API) | 3-4 days |
| Safeway/Albertsons | **MEDIUM** | Scraping + Instacart | 3-4 days |
| Amazon/WF | **LOW** | Defer | - |

---

## Technical Implementation Approach

### Phase 1: API Integrations

1. **Walmart API Integration (I1.2)**
   - Register developer account
   - Implement OAuth client
   - Build inventory lookup service
   - Add rate limiting and caching
   - Test with priority states

2. **Kroger API Integration (I1.3)**
   - Apply for developer access
   - Wait for approval (typically 1-2 weeks)
   - Implement OAuth 2.0 flow
   - Build multi-banner support (Fred Meyer, Ralphs, etc.)
   - Test across priority states

### Phase 2: Web Scraping Fallback

3. **Generic Web Scraping Framework (I1.4)**
   - Build configurable scraper framework
   - Implement anti-bot detection handling
   - Add proxy rotation support
   - Create scraping job scheduler
   - Implement data validation and cleaning

4. **Retailer-Specific Scrapers**
   - Publix scraper (priority for FL)
   - Target scraper
   - Safeway/Albertsons scraper
   - H-E-B scraper (priority for TX)

### Phase 3: Data Normalization

5. **Inventory Data Normalization Layer (I1.5)**
   - Unified data schema
   - Source-specific adapters
   - Confidence scoring algorithm
   - Data freshness tracking
   - Conflict resolution (multiple sources for same product)

---

## API Authentication & Security

### Best Practices

1. **Credential Management:**
   - Store API keys in secure environment variables
   - Use AWS Secrets Manager or similar for production
   - Rotate credentials regularly
   - Never commit credentials to version control

2. **Rate Limiting:**
   - Implement per-retailer rate limiters
   - Use Redis for distributed rate limiting
   - Queue requests to avoid exceeding limits
   - Implement exponential backoff on failures

3. **Error Handling:**
   - Graceful degradation when APIs unavailable
   - Fallback to cached data
   - Alert on sustained API failures
   - Log errors for debugging

4. **Monitoring:**
   - Track API response times
   - Monitor rate limit consumption
   - Alert on error rate thresholds
   - Dashboard for API health status

---

## Data Freshness Strategy

### Update Frequencies

| Product Category | Target Freshness | Update Method |
|------------------|------------------|---------------|
| Infant Formula | Real-time (< 15 min) | Webhook or aggressive polling |
| Dairy/Perishables | 1 hour | Scheduled sync |
| Shelf-stable | 4-6 hours | Scheduled sync |
| Non-WIC products | 12-24 hours | Low priority sync |

### Sync Mechanisms

1. **Webhook-based (preferred):**
   - Real-time updates when retailer supports
   - Low latency
   - Efficient (no polling)

2. **Scheduled polling:**
   - Cron jobs at appropriate intervals
   - Batch updates for efficiency
   - Prioritize high-demand products

3. **User-triggered refresh:**
   - Manual refresh in app
   - Triggered on store entry (geofence)
   - Ensures data relevance

---

## Legal & Compliance Considerations

### Terms of Service

- **Walmart:** Affiliate API terms prohibit scraping; must use API only
- **Kroger:** Developer terms require proper attribution
- **Target:** Scraping may violate ToS; partnership preferred
- **Publix:** ToS should be reviewed for scraping permissions
- **H-E-B:** No public API; scraping may be gray area

### Data Usage Rights

- Inventory data is typically allowed for display to end-users
- Cannot resell or redistribute inventory data
- Must respect retailer branding guidelines
- Proper attribution required for some APIs

### Recommendations

1. **Pursue official partnerships** where possible to avoid ToS issues
2. **Implement robots.txt compliance** for web scraping
3. **Consult legal counsel** on scraping practices
4. **Consider data licensing agreements** for commercial launch
5. **Respect rate limits and be a good API citizen**

---

## Infant Formula Tracking - Critical Requirements

### Real-Time Tracking Requirements

Given the 2022 formula shortage crisis and ongoing concerns, infant formula requires enhanced tracking:

1. **Multi-source aggregation:**
   - Combine API, scraping, and crowdsourced data
   - Weighted confidence scoring
   - Prefer most recent data source

2. **Proactive alerting:**
   - Push notifications when formula in stock
   - Regional shortage detection
   - Alternative product suggestions

3. **Cross-store search:**
   - Query multiple stores simultaneously
   - Distance-based ranking
   - Real-time availability display

4. **Data validation:**
   - Crowdsourced verification
   - "I found this" reporting
   - False positive detection

### Formula-Specific Data Points

- **Exact brand/size matching:** WIC requires specific products
- **Contract brand tracking:** Varies by state
- **Alternative formula mapping:** Medical necessity alternatives
- **Shortage trend analysis:** Predict availability issues

---

## Crowdsourced Data Integration

### When API/Scraping Unavailable

For retailers without API or reliable scraping:

1. **User-reported inventory:**
   - "I found this in-store" reporting
   - Timestamp + store location
   - Anonymous user ID for fraud detection

2. **Confidence scoring:**
   ```
   confidence = baseConfidence * recencyFactor * reportCountFactor * userTrustScore

   recencyFactor = max(0, 1 - (hoursSinceReport / 24))
   reportCountFactor = min(1, reportCount / 5)
   userTrustScore = historicalAccuracy(userId)
   ```

3. **Display to users:**
   - "Last seen 2 hours ago by shoppers"
   - "3 shoppers reported in stock today"
   - "Availability uncertain - help by reporting"

4. **Gamification:**
   - Badge system for helpful reporters
   - Accuracy tracking
   - Community contribution stats

---

## Cost Analysis

### API Costs (Estimated Annual at 100K Users)

| Service | Free Tier | Paid Tier | Est. Annual Cost |
|---------|-----------|-----------|------------------|
| Walmart API | 5K req/day | $500-2000/mo | $0-6,000 |
| Kroger API | Approved use | Partnership | $0-12,000 |
| Target Partnership | N/A | Negotiated | TBD |
| H-E-B Partnership | N/A | Negotiated | TBD |
| Scraping Infrastructure | N/A | $200-500/mo | $2,400-6,000 |
| Proxy Services | N/A | $100-300/mo | $1,200-3,600 |
| **Total Estimated** | - | - | **$3,600-27,600** |

### Cost Optimization Strategies

1. **Aggressive caching:** Reduce API calls by 80%+
2. **Selective updates:** Prioritize WIC-eligible products only
3. **Regional deployment:** Only query stores in active user areas
4. **Batch requests:** Combine requests where APIs allow
5. **Free tier maximization:** Design within free tier limits initially

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| API access revoked | High | Multi-source data, scraping fallback |
| Rate limits exceeded | Medium | Caching, queuing, user-triggered refresh |
| Scraping blocked | Medium | Proxy rotation, user-agent rotation, CAPTCHA solving |
| Data accuracy issues | Medium | Confidence scoring, crowdsourced validation |
| API format changes | Medium | Automated tests, error monitoring, graceful degradation |

### Legal Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| ToS violation | High | Pursue partnerships, legal review |
| Copyright claims | Low | Proper attribution, fair use |
| Data misuse accusations | Medium | Clear privacy policy, user consent |

### Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Partnership delays | Medium | Scraping fallback, phased rollout |
| High API costs | Medium | Optimization, crowdsourcing supplement |
| Retailer objections | Low | Position as customer service tool |

---

## Recommendations Summary

### Immediate Actions

1. Register for Walmart Developer API
2. Apply for Kroger Developer Program
3. Begin Publix web scraping implementation
4. Set up scraping infrastructure (proxies, job scheduler)

### Short-term

5. Implement Walmart API integration
6. Implement Kroger API integration (post-approval)
7. Build generic scraping framework
8. Implement Target scraper
9. Create data normalization layer

### Medium-term

10. Initiate H-E-B partnership discussions
11. Initiate Target partnership discussions
12. Implement Safeway/Albertsons scraper
13. Build crowdsourced inventory system
14. Implement formula shortage detection

### Long-term

15. Expand to regional chains
16. Enhanced formula tracking
17. Predictive inventory modeling
18. Aisle-level navigation (where data available)

---

## Success Metrics

### Coverage Targets

- **State Coverage:** 95%+ of WIC-authorized stores in MI, NC, FL, OR
- **Data Freshness:** < 1 hour for formula, < 6 hours for other products
- **Data Accuracy:** 90%+ match between reported and actual stock
- **Uptime:** 99.5% availability for inventory services

### User Experience Metrics

- **Inventory query latency:** < 500ms p95
- **Data confidence:** > 80% of products have "high confidence" status
- **User satisfaction:** < 5% "availability data was wrong" reports

---

## Next Steps

**Task I1.2: Implement Walmart inventory API integration**
- Prerequisites: I1.1 complete ✅
- Dependencies: None
- Estimated effort: 2-3 days
- Deliverables: Working Walmart inventory service

**Task I1.3: Implement Kroger inventory API integration**
- Prerequisites: I1.1 complete ✅, Kroger API approval
- Dependencies: Developer account approval (1-2 weeks)
- Estimated effort: 3-4 days
- Deliverables: Working Kroger inventory service for all banners

**Task I1.4: Build web scraping fallback for non-API retailers**
- Prerequisites: I1.1 complete ✅
- Dependencies: None
- Estimated effort: 4-5 days
- Deliverables: Generic scraping framework + retailer-specific scrapers

**Task I1.5: Create inventory data normalization layer**
- Prerequisites: I1.2, I1.3, I1.4 complete
- Dependencies: At least one data source implemented
- Estimated effort: 2-3 days
- Deliverables: Unified inventory service interface

---

## Appendix A: API Endpoint Examples

### Walmart API Example

```javascript
// Product lookup by UPC (Affiliate API)
// Note: Store-level inventory may require Marketplace API partnership
GET https://developer.api.walmart.com/api-proxy/service/affil/product/v2/items/{itemId}
Headers:
  WM_SEC.KEY_VERSION: 1
  WM_CONSUMER.ID: {consumer_id}
  WM_SEC.AUTH_SIGNATURE: {signature}

Response:
{
  "items": [{
    "itemId": 12345678,
    "name": "Gerber Good Start Gentle Powder Infant Formula",
    "upc": "055000012345",
    "stock": "Available",  // Online availability; in-store may vary
    "salePrice": 29.99,
    "largeImage": "https://...",
    "categoryPath": "Food/Baby Food/Formula"
  }]
}

// Note: For reliable in-store inventory, partnership with Walmart may be required
```

### Kroger API Example

```javascript
// Store inventory lookup
GET https://api.kroger.com/v1/products?filter.term={upc}&filter.locationId={storeId}
Headers:
  Authorization: Bearer {oauth_token}

Response:
{
  "data": [{
    "productId": "0005500000123",
    "description": "Similac Pro-Advance Infant Formula",
    "items": [{
      "itemId": "0005500000123456",
      "inventory": {
        "stockLevel": "LOW"
      },
      "price": {
        "regular": 31.99
      }
    }],
    "aisle": "Baby - Aisle 12"
  }]
}
```

---

## Appendix B: Web Scraping Pseudo-Code

```javascript
// Generic scraper framework
class RetailerScraper {
  constructor(retailerConfig) {
    this.baseUrl = retailerConfig.baseUrl;
    this.selectors = retailerConfig.selectors;
    this.rateLimit = retailerConfig.rateLimit;
  }

  async getInventory(upc, storeId) {
    const url = this.buildUrl(upc, storeId);
    const html = await this.fetch(url);
    const $ = cheerio.load(html);

    const stockStatus = $(this.selectors.stockStatus).text();
    const quantity = $(this.selectors.quantity).text();

    return this.normalizeData({
      upc,
      storeId,
      status: this.parseStatus(stockStatus),
      quantity: this.parseQuantity(quantity),
      lastUpdated: new Date(),
      source: 'scrape',
      confidence: 0.7
    });
  }

  parseStatus(statusText) {
    if (/in stock/i.test(statusText)) return 'in_stock';
    if (/low stock/i.test(statusText)) return 'low_stock';
    if (/out of stock/i.test(statusText)) return 'out_of_stock';
    return 'unknown';
  }
}
```

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-10 | Initial research document | System |

---

**End of Research Document**
