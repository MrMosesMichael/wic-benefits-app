# Retailer API Quick Reference Card

**Task I1.1 Research Summary** | Updated: 2026-01-10

---

## 🎯 Implementation Priority

```
Phase 1 (Weeks 1-4):
┌─────────────────────────────────────────────┐
│ 1. Walmart API        │ 2-3 days │ HIGH    │
│ 2. Kroger API         │ 3-4 days │ HIGH    │
│ 3. Publix Scraper     │ 3-4 days │ HIGH    │
│ 4. Normalization      │ 2-3 days │ HIGH    │
└─────────────────────────────────────────────┘

Phase 2 (Weeks 4-8):
┌─────────────────────────────────────────────┐
│ 5. Target Scraper     │ 3-4 days │ MEDIUM  │
│ 6. H-E-B Scraper      │ 3-4 days │ MEDIUM  │
│ 7. Safeway Scraper    │ 3-4 days │ MEDIUM  │
│ 8. Crowdsourcing      │ 4-5 days │ MEDIUM  │
└─────────────────────────────────────────────┘
```

---

## 📊 Retailer Matrix

| Retailer | Method | Access | Approval Time | Cost | Priority | Next Task |
|----------|--------|--------|---------------|------|----------|-----------|
| **Walmart** | API | ✅ Public | 1-2 days | Free tier | 🔴 HIGH | I1.2 |
| **Kroger** | API | ✅ Public | 1-2 weeks | Free | 🔴 HIGH | I1.3 |
| **Publix** | Scrape | ⚠️ None | N/A | Infra only | 🔴 HIGH | I1.4 |
| **H-E-B** | Both | ⚠️ Partner | TBD | TBD | 🟡 MED | I1.4 |
| **Target** | Scrape | ⚠️ Partner | TBD | TBD | 🟡 MED | I1.4 |
| **Safeway** | Scrape | ⚠️ Partner | TBD | TBD | 🟡 MED | I1.4 |
| **Amazon** | API | ✅ Public | Immediate | Free* | ⚪ LOW | Defer |

---

## 🚀 Getting Started

### For Task I1.2 (Walmart)
```bash
# 1. Register
https://developer.walmart.com/

# 2. Review docs
https://developer.walmart.com/api-detail

# 3. Get credentials
- API Key
- API Secret

# 4. Implement
- OAuth 2.0 authentication
- Rate limit: 5000 req/day
- Data: Binary stock status
```

### For Task I1.3 (Kroger)
```bash
# 1. Apply
https://developer.kroger.com/

# 2. Wait for approval (1-2 weeks)

# 3. Review docs
https://developer.kroger.com/documentation

# 4. Implement
- OAuth 2.0 client credentials
- Multi-banner support
- Data: Stock levels + aisle location
```

### For Task I1.4 (Web Scraping)
```bash
# 1. Setup infrastructure
- Node.js + Puppeteer/Playwright
- Proxy service (optional)
- Job scheduler

# 2. Implement scrapers
- Publix (Priority: FL)
- Target (Priority: National)
- H-E-B (Priority: TX)
- Safeway (Priority: OR)

# 3. Add safeguards
- Rate limiting
- User-agent rotation
- robots.txt compliance
```

### For Task I1.5 (Normalization)
```bash
# 1. Define unified schema
interface InventoryData {
  upc: string;
  storeId: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
  source: 'api' | 'scrape' | 'crowdsourced';
  confidence: number;
  lastUpdated: Date;
}

# 2. Create adapters
- WalmartAdapter
- KrogerAdapter
- ScraperAdapter

# 3. Implement aggregation
- Multi-source queries
- Confidence scoring
- Fallback logic
```

---

## 💰 Cost Estimates (100K users/year)

| Service | Annual Cost |
|---------|-------------|
| Walmart API | $0 - $6,000 |
| Kroger API | $0 - $12,000 |
| Scraping Infra | $2,400 - $6,000 |
| Proxy Services | $1,200 - $3,600 |
| **TOTAL** | **$3,600 - $27,600** |

**Optimization Strategy:** Aggressive caching can reduce costs by 80%+

---

## 📈 Success Metrics

- **Coverage:** >95% of WIC stores in MI, NC, FL, OR
- **Freshness:** <1 hour for formula, <6 hours for other
- **Accuracy:** >90% match with actual stock
- **Latency:** <500ms p95
- **Uptime:** 99.5%

---

## 🔔 Formula Tracking (Critical)

```
┌─────────────────────────────────────────────┐
│ UPDATE FREQUENCY: Every 15 minutes          │
│ METHOD: Real-time or aggressive polling     │
│ SOURCES: API + Scraping + Crowdsourced      │
│ ALERTS: Push notification on stock arrival  │
└─────────────────────────────────────────────┘
```

**Why critical:** 2022 formula shortage crisis demonstrated need for real-time tracking

**Special handling:**
- Multi-source aggregation
- Proactive push notifications
- Cross-store search (25 mile radius)
- Alternative product suggestions
- Regional shortage detection

---

## 🗺️ State Coverage

### Priority States (Phase 1)

**Michigan (MI)**
- Kroger ✅ (API)
- Walmart ✅ (API)
- Meijer ⚠️ (Scrape - future)

**North Carolina (NC)**
- Kroger family ✅ (API)
- Walmart ✅ (API)
- Food Lion ⚠️ (Scrape - future)

**Florida (FL)**
- Publix 🔴 (Scrape - critical)
- Walmart ✅ (API)
- Winn-Dixie ⚠️ (Scrape - future)

**Oregon (OR)**
- Fred Meyer ✅ (Kroger API)
- Safeway ⚠️ (Scrape)
- Walmart ✅ (API)

---

## ⚠️ Legal Considerations

| Retailer | Scraping OK? | Notes |
|----------|--------------|-------|
| Walmart | ❌ No | Must use API only |
| Kroger | ➖ API only | Developer terms |
| Target | ⚠️ Gray area | Partnership preferred |
| Publix | ⚠️ Review ToS | Check robots.txt |
| H-E-B | ⚠️ Gray area | No public API |
| Safeway | ⚠️ Gray area | Check ToS |

**Recommendation:** Pursue partnerships, consult legal counsel

---

## 📚 Documentation Links

- **Full Research:** [retailer-api-research.md](./retailer-api-research.md)
- **Implementation Guide:** [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
- **Data Summary:** [retailer-api-summary.json](./retailer-api-summary.json)
- **Inventory Spec:** [../../specs/wic-benefits-app/specs/inventory/spec.md](../../specs/wic-benefits-app/specs/inventory/spec.md)

---

## 🛠️ Technical Stack

```typescript
// Recommended technologies

// API Integration
- axios (HTTP client)
- node-oauth2-server (OAuth)
- rate-limiter-flexible (rate limiting)

// Web Scraping
- puppeteer or playwright (headless browser)
- cheerio (HTML parsing)
- proxy-chain (proxy rotation)

// Data Storage
- PostgreSQL (primary DB)
- Redis (caching)
- bull (job queue)

// Monitoring
- prometheus (metrics)
- grafana (dashboards)
- sentry (error tracking)
```

---

## 🔄 Data Freshness Targets

| Product Category | Target | Method |
|------------------|--------|--------|
| Infant Formula | <15 min | Real-time/webhook |
| Dairy/Perishables | 1 hour | Scheduled sync |
| Shelf-stable | 4-6 hours | Scheduled sync |
| Non-WIC | 12-24 hours | Low priority |

---

## ✅ Pre-Implementation Checklist

### Before Starting I1.2 (Walmart)
- [ ] Walmart developer account created
- [ ] API credentials obtained
- [ ] Redis cache configured
- [ ] Rate limiter implemented
- [ ] Error monitoring setup

### Before Starting I1.3 (Kroger)
- [ ] Kroger developer application submitted
- [ ] Approval received (wait 1-2 weeks)
- [ ] OAuth 2.0 client ready
- [ ] Multi-banner store mapping ready

### Before Starting I1.4 (Scraping)
- [ ] Legal review of scraping practices
- [ ] Proxy service selected (if needed)
- [ ] Puppeteer/Playwright installed
- [ ] Job scheduler configured
- [ ] robots.txt compliance implemented

### Before Starting I1.5 (Normalization)
- [ ] At least one data source working
- [ ] Unified schema defined
- [ ] Confidence scoring algorithm designed
- [ ] Multi-source aggregation strategy planned

---

## 🎓 Key Learnings

1. **API access varies widely** - From fully public (Walmart) to enterprise-only (Albertsons)
2. **Scraping is necessary** - Not all retailers have APIs (e.g., Publix)
3. **Formula needs special handling** - Real-time tracking essential
4. **Multi-source is critical** - No single source covers all stores
5. **Caching saves money** - Can reduce API costs by 80%+
6. **Legal matters** - Some ToS prohibit scraping; partnerships preferred

---

## 🚨 Common Pitfalls to Avoid

1. ❌ **Don't scrape Walmart** - They have an API; scraping violates ToS
2. ❌ **Don't ignore rate limits** - Will get blocked; implement proper throttling
3. ❌ **Don't cache forever** - Stale data is worse than no data
4. ❌ **Don't skip error handling** - APIs fail; have fallback strategies
5. ❌ **Don't forget formula priority** - It's life-critical; track aggressively
6. ❌ **Don't store credentials in code** - Use environment variables/secrets manager

---

## 📞 Next Actions

### This Week
1. ✅ Review this quick reference
2. ✅ Read full research document
3. 📝 Register for Walmart API
4. 📝 Apply for Kroger API
5. 📝 Set up development environment

### Next Week
1. 📝 Implement Walmart integration (I1.2)
2. 📝 Build Publix scraper (I1.4)
3. 📝 Wait for Kroger approval
4. 📝 Set up monitoring infrastructure

---

**Last Updated:** 2026-01-10
**Task Status:** I1.1 ✅ Complete | I1.2-I1.5 📋 Ready to start
**Estimated Total Effort:** 10-15 days for Phase 1
