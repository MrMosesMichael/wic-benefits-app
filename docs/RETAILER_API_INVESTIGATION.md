# Retailer API Investigation - Findings

**Date:** January 18, 2026
**Investigator:** Phase 2 Implementation Team
**Status:** Concluded - Not Viable

---

## Summary

**Conclusion:** Official retailer inventory APIs are **NOT VIABLE** for WIC Benefits App without corporate partnerships.

**Reason:** Retailer APIs are designed for affiliate marketing partners who drive sales, not for inventory checking for social good apps.

---

## Walmart API Investigation

### API Details

**Platform:** Walmart.io Developer Portal
**Primary API:** Affiliate Product API
**Store Inventory:** Requires OPD (Online Pickup & Delivery) API with business manager approval

### Terms of Service Analysis

**Key Quote:**
> "The Walmart API is available to Walmart's affiliate partners solely for the purpose of advertising Walmart.com products online. It may not be used for any other purposes without express written permission from Walmart."

### Prohibited Uses

From Walmart API ToS, explicitly **prohibited**:
- ❌ Scraping or spidering website data
- ❌ Use by competitors (could include WIC apps showing prices/availability)
- ❌ Store-specific inventory access without partnership
- ❌ Non-affiliate use cases
- ❌ Redistributing product information
- ❌ Cookie stuffing, spyware, etc.

### Access Requirements

**To use Walmart API legitimately:**
1. Enroll as Walmart.com Affiliate through Rakuten LinkShare
2. Purpose: Drive sales to Walmart.com for commission (4% on most products, 1% on electronics)
3. Must include affiliate tracking links
4. Commission-based model (not suitable for WIC app)

**For Store Inventory (OPD API):**
1. Business partnership with Walmart
2. Approval from Walmart business manager
3. Likely requires legal agreements
4. Timeline: Months of negotiation

### Rate Limits

- **Free Tier:** 5,000 API calls per day
- **For Higher Limits:** Must justify business need

**Problem:** 5,000 calls/day is insufficient for user base. Example:
- 1,000 active users
- Each scans 5 products per day
- = 5,000 scans (at rate limit)
- Growth impossible without partnership

### Our Use Case

**What We Need:**
- Check if product is in stock at specific store
- Show availability to WIC participants
- Help users avoid wasted trips

**Why This Doesn't Fit:**
- Not driving sales to Walmart.com
- Not earning affiliate commissions
- Need store-specific data (requires OPD API)
- Not a marketing use case

---

## Kroger API Investigation

### API Details

**Platform:** Kroger Developer Portal
**Primary API:** Product Search & Store APIs

### Expected Issues

Based on industry patterns, Kroger API likely has:
- Similar affiliate/partnership requirements
- Protection of competitive inventory data
- Rate limits for non-partners
- ToS restrictions on use cases

**Status:** Not investigated in detail due to Walmart findings

**Assumption:** Same business model (protect competitive data, affiliate focus)

---

## Other Retailers

### Target

**API Availability:** Partner/affiliate program
**Expected:** Similar restrictions to Walmart/Kroger

### HEB, Publix, Safeway, Albertsons

**API Availability:** Limited or partner-only
**Expected:** Proprietary data, no public inventory APIs

---

## Why Retailers Restrict Inventory Data

### Competitive Advantage

**Inventory = Competitive Intelligence**

Retailers protect inventory data because:
1. **Pricing Strategy:** Don't want competitors knowing stock levels
2. **Supply Chain:** Proprietary information
3. **Customer Retention:** Want customers on THEIR platforms/apps
4. **Revenue:** APIs designed to drive sales, not provide free data

### Business Model

**APIs Serve Business Goals:**
- Affiliate programs → Drive e-commerce sales
- Partnerships → Negotiated data sharing with benefits to retailer
- Proprietary apps → Keep customers in ecosystem

**NOT Designed For:**
- Third-party apps checking inventory
- Social good use cases
- Comparison shopping

---

## Alternative Approaches Considered

### 1. Web Scraping ❌

**Pros:**
- Technical feasibility
- Could get data we need

**Cons:**
- Violates ToS (explicitly prohibited by Walmart)
- Legally risky (CFAA violations)
- Fragile (breaks when sites change)
- Unethical (violates agreements)
- Could lead to legal action

**Verdict:** NOT ACCEPTABLE

### 2. Corporate Partnerships 🤔

**Pros:**
- Legitimate access to inventory data
- Official support
- No ToS violations

**Cons:**
- 6-12 month timeline (minimum)
- Requires legal team, contracts
- May require revenue sharing
- Not guaranteed (retailers may decline)
- Resource intensive

**Verdict:** DEFERRED - Maybe in Phase 3+

### 3. Crowdsourced Data ✅

**Pros:**
- No API dependencies
- Community-powered
- No ToS violations
- Can start immediately
- Unique value (real-time community data)

**Cons:**
- Depends on user participation
- Data quality varies
- Not comprehensive initially

**Verdict:** RECOMMENDED - See PHASE2_REVISED_PLAN.md

---

## Lessons Learned

### 1. Corporate APIs ≠ Public Good APIs

**Mistake:** Assuming retailer APIs are publicly available for any use case

**Reality:** Retailer APIs serve business goals (affiliate sales, partnerships)

**Learning:** Social good apps need different data sources (public data, crowdsourced, partnerships)

### 2. Read ToS Early

**Mistake:** Building integration before thoroughly reading ToS

**Reality:** ToS would have revealed non-viability sooner

**Learning:** Always read API ToS before starting integration work

### 3. Plan B is Essential

**Mistake:** Single dependency on retailer APIs

**Reality:** Need multiple approaches (crowdsourced, public data, etc.)

**Learning:** Always have fallback options

---

## Recommendations for Future

### Short Term (Now)

**Build:** Crowdsourced inventory system
- User reports: "I found this product"
- Community-powered
- No API dependencies
- See PHASE2_REVISED_PLAN.md

### Medium Term (3-6 months)

**Explore:**
1. **Food Bank Finder** - Public data, no restrictions
2. **Product Discovery** - Use APL data we already have
3. **Formula Alerts** - Crowdsourced formula sightings

### Long Term (6+ months)

**Consider:**
1. **Corporate Partnerships** - If app grows, negotiate with retailers
2. **Become Walmart Affiliate** - If we can genuinely drive sales
3. **Industry Partnerships** - Work with WIC agencies for data access

### Not Pursuing

❌ **Web Scraping** - Violates ToS, legally risky, unethical
❌ **Unauthorized API Use** - Would be shut down

---

## Documentation of Existing Code

### Files Created (Pre-Investigation)

These files exist in `src/services/inventory/walmart/`:
- `WalmartApiClient.ts` - OAuth2 auth, API calls
- `WalmartInventoryService.ts` - Inventory lookup, caching
- `../types/inventory.types.ts` - Type definitions

### Status of Code

**Disposition:** Archive, do not use

**Reason:** Cannot use Walmart API without partnership

**Keep or Delete?**
- **Keep:** Well-structured code, may be useful for future partnerships
- **Archive:** Move to `src/services/inventory/_archive/walmart/`
- **Document:** Note why not in use

### What to Do With Code

**Recommendation:**
1. Move to archive folder
2. Add README explaining why archived
3. Keep for future reference
4. Do NOT integrate into active codebase

---

## Questions Answered

### Q: Can we use Walmart API for inventory checking?
**A:** No, requires affiliate partnership or business agreement.

### Q: Can we scrape Walmart.com?
**A:** No, explicitly prohibited by ToS, legally risky.

### Q: What about other retailers?
**A:** Expect similar restrictions (inventory = competitive data).

### Q: How do we check inventory without APIs?
**A:** Crowdsourced data from users (see revised Phase 2 plan).

### Q: Could we get partnership in future?
**A:** Possible, but 6-12 month timeline, requires traction/user base.

---

## Final Recommendation

**Pivot to community-powered features:**
1. Crowdsourced inventory (users report sightings)
2. Food bank finder (public data)
3. Product discovery (use APL data we have)

See **PHASE2_REVISED_PLAN.md** for implementation details.

---

**Status:** Investigation complete, pivoting to viable alternatives.
