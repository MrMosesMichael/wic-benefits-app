# WIC Benefits Assistant Application

## Summary

Build a comprehensive mobile application that empowers WIC (Women, Infants, and Children) program participants to maximize their benefits through real-time product eligibility checking, store inventory awareness, benefits tracking, and personalized shopping guidance.

## Motivation

WIC participants face significant challenges when shopping:

1. **Eligibility Confusion**: Each state has different approved products, sizes, and brands. Participants often don't know if a product is covered until checkout.

2. **Stock Uncertainty**: Even if a product is WIC-eligible, it may not be in stock at their store, wasting time and causing frustration.

3. **Benefits Tracking**: Understanding what benefits remain and what can still be purchased requires mental math or separate app lookups.

4. **Store Navigation**: Large stores make finding WIC products time-consuming, especially with children in tow.

5. **Benefit Optimization**: Many participants don't fully utilize their benefits due to lack of awareness about eligible products.

## Proposed Solution

A mobile-first application with the following core capabilities:

### Tier 1: Core Features (MVP)

1. **UPC Scanner** - Scan any product barcode to instantly see WIC eligibility for user's state
2. **Benefits Balance** - View current month's WIC benefits and remaining allowances by category
3. **Store Detection** - Automatically detect which store the user is shopping at

### Tier 2: Enhanced Features

4. **Store Inventory Integration** - Show which WIC-eligible products are in stock at the current store
5. **Categorized Product Lists** - Browse available products by category (Dairy > Milk, Dairy > Cheese, etc.)
6. **In-Store Navigation** - Guide users to product locations within the store

### Tier 3: Advanced Features

7. **Store Finder** - Find nearby stores ranked by WIC product availability
8. **Tips & Community** - Share and discover strategies for maximizing WIC benefits

## Scope

### In Scope

- Mobile application (iOS and Android)
- All 50 US states + DC + territories
- Major grocery retailers (Walmart, Kroger, Safeway, Albertsons, Publix, etc.)
- WIC-authorized specialty stores
- Real-time and periodic inventory updates
- Offline UPC scanning capability

### Out of Scope (Future Considerations)

- Direct eWIC card transactions
- Appointment scheduling with WIC offices
- Recipe suggestions based on available benefits
- Delivery/pickup ordering integration
- Non-English languages (Phase 2)

## Technical Approach

### Data Sources

1. **WIC Eligibility Data**
   - State WIC agency APL (Approved Product List) databases
   - Federal WIC food packages regulations
   - UPC-to-product mapping databases

2. **Store Inventory**
   - Retailer API integrations where available
   - Web scraping for real-time availability
   - Crowdsourced availability updates

3. **Benefits Data**
   - eWIC card integration APIs
   - Manual entry fallback
   - OCR scanning of benefit statements

4. **Store/Location Data**
   - Google Places / Apple Maps APIs
   - Store layout databases
   - Beacon/indoor positioning systems

### Architecture Considerations

- Offline-first for in-store reliability
- State-specific eligibility rules engine
- Caching layer for inventory data
- Privacy-preserving design (no PII stored unnecessarily)

## Success Criteria

1. User can scan a UPC and see eligibility result quickly
2. User can view their benefits balance with one tap
3. Store detection accuracy > 95% when user is inside store
4. Inventory data is current for participating stores
5. Category browsing shows accurate product availability
6. Store finder returns results efficiently

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Retailer API access denied | Cannot show real inventory | Web scraping fallback, crowdsourced data |
| State eligibility data fragmented | Incomplete coverage | Partner with WIC agencies, prioritize largest states |
| eWIC integration complexity | Cannot show live balance | Manual entry, OCR of statements |
| Store layout data unavailable | Cannot provide navigation | Crowdsource, start with major chains |
| Offline performance issues | Poor in-store experience | Aggressive local caching, minimal UI |

## Open Questions

1. Which states should be prioritized for MVP launch?
2. Should we pursue official partnerships with WIC agencies or use public data?
3. What is the fallback UX when inventory data is unavailable?
4. How do we handle multi-participant households (e.g., mother + infant + child)?
5. What authentication method for benefits access (eWIC card scan, login, manual)?
