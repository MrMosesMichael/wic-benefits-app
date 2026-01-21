# WIC Retailer Data Sources Research

**Task:** A3.1 - Source WIC-authorized retailer data by state
**Date:** January 21, 2026
**Status:** Complete

## Executive Summary

WIC-authorized retailers (vendors) are licensed by state WIC agencies to accept WIC benefits. Each state maintains a list of authorized vendors, but availability and format vary significantly. Key findings:

- **USDA National Retailer Database**: No centralized national database publicly available
- **State-Level Data**: Each state maintains its own authorized vendor list
- **Data Formats**: Vary from PDF lists to searchable web databases to downloadable CSV/Excel
- **Update Frequency**: Varies by state; some update monthly, others in real-time
- **Data Quality**: Highly variable - some states provide full address/coordinates, others minimal info

**Recommended Strategy**:
1. Start with state-published retailer lists for priority states (MI, NC, FL, OR)
2. Scrape state vendor locator tools where structured data unavailable
3. Enrich with Google Places API for missing data (hours, phone, coordinates)
4. Build vendor data pipeline with monthly refresh schedule

---

## State-by-State Findings

### 1. Michigan WIC Authorized Vendors

**Official Source:** [Michigan WIC Vendor Locator](https://www.michigan.gov/mdhhs/assistance-programs/wic/find-a-wic-office)

**Data Format:**
- Interactive web map/locator
- No bulk download available publicly
- Vendor information includes: name, address, phone, WIC vendor ID

**Access Methods:**
1. **Web Locator**: Interactive search by address/zip
2. **Vendor Portal**: FIS CDP vendor portal (requires vendor authorization)
3. **State Agency Request**: May provide bulk data to authorized partners

**Data Fields:**
- Store name
- Address (street, city, state, zip)
- Phone number
- WIC Vendor ID
- Coordinates (lat/lng) - may need geocoding

**Processor:** FIS (Custom Data Processing)
- FIS maintains vendor enrollment system
- Vendors must complete FIS merchant agreement
- Training required for cashiers

**Scraping Strategy:**
- Build web scraper for vendor locator tool
- Search by zip code across all Michigan zips
- Deduplicate results
- Geocode addresses if coordinates not provided

**Update Frequency:**
- Real-time as vendors are authorized/deauthorized
- Recommend monthly refresh

---

### 2. North Carolina WIC Authorized Vendors

**Official Source:** [NC WIC Vendor Locator](https://www.ncdhhs.gov/assistance/nutritional-services/wic)

**Data Format:**
- Web-based vendor search
- Some counties publish PDF lists
- No bulk CSV/Excel available publicly

**Access Methods:**
1. **Web Search Tool**: Search by city or zip code
2. **County Lists**: Some local WIC offices publish lists
3. **Conduent Portal**: Vendor portal access (requires authorization)

**Data Fields:**
- Vendor name
- Address
- Phone
- Services offered (pharmacy, full grocery, etc.)
- WIC Vendor number

**Processor:** Conduent (Bnft eWIC system)
- Conduent manages vendor enrollment
- Vendors access system via Conduent portal
- APL updates via FTP

**Scraping Strategy:**
- Scrape web search tool by zip code
- Compile county PDF lists where available
- Use Google Places API to enrich data
- Validate WIC authorization status

**Update Frequency:**
- Rolling vendor enrollment
- Recommend monthly refresh

---

### 3. Florida WIC Authorized Vendors

**Official Source:** [Florida WIC Vendor Search](https://www.floridahealth.gov/programs-and-services/wic/)

**Data Format:**
- Interactive vendor locator map
- Store locator within WICShopper app
- No public bulk download

**Access Methods:**
1. **Web Locator**: Search by address/city/zip
2. **WICShopper App**: Mobile app with vendor list
3. **FIS Vendor Portal**: For authorized vendors only

**Data Fields:**
- Vendor name
- Address
- Phone
- Store type (grocery, pharmacy, specialty)
- Services (formula, produce, etc.)

**Processor:** FIS
- Florida transitioned to FIS eWIC system
- Similar vendor structure to Michigan

**Scraping Strategy:**
- Scrape interactive map/locator
- Extract data from WICShopper app (if possible)
- Cross-reference with FIS vendor data
- Geocode addresses

**Update Frequency:**
- Real-time enrollment updates
- Recommend monthly refresh

**Recent Changes:**
- Florida made significant WIC policy changes in 2024-2025
- Vendor network may be in flux

---

### 4. Oregon WIC Authorized Vendors

**Official Source:** [Oregon WIC Clinic and Vendor Locator](https://www.oregon.gov/oha/PH/HEALTHYPEOPLEFAMILIES/WIC/Pages/index.aspx)

**Data Format:**
- Online vendor search tool
- Possibly Excel/CSV available on request
- Downloadable clinic directory (separate from vendors)

**Access Methods:**
1. **Web Search**: Search by city/county
2. **State Data Request**: Contact OHA for bulk data
3. **Local Agency Lists**: Some counties publish vendor lists

**Data Fields:**
- Vendor name
- Address
- Phone
- Vendor type
- Services offered

**Processor:** State-managed system (not FIS or Conduent)
- Oregon operates independent eWIC system
- Vendor onboarding handled by state
- JPMorgan Chase payment processor

**Scraping Strategy:**
- Scrape web search tool
- Request bulk data from Oregon Health Authority
- Validate addresses via geocoding
- Enrich with Google Places API

**Update Frequency:**
- Regular vendor enrollment updates
- Recommend monthly refresh

---

## Alternative Data Sources

### 1. USDA SNAP Retailer Locator
- **URL:** https://www.fns.usda.gov/snap/retailer-locator
- **Coverage:** Nationwide SNAP-authorized retailers
- **Limitation:** Not all SNAP retailers accept WIC; not all WIC vendors accept SNAP
- **Use Case:** Supplement missing WIC vendors; many stores accept both

### 2. Major Retailer Corporate Lists
- **Walmart**: Corporate store locator API/data
- **Kroger**: Chain store locations (many accept WIC)
- **Target**: Store locator data
- **Walgreens/CVS**: Pharmacy locations with WIC
- **Strategy:** Cross-reference with state WIC vendor lists to identify WIC-authorized locations

### 3. Google Places API
- **Use:** Enrich existing WIC vendor data
- **Fields:** Hours, phone, ratings, coordinates, photos
- **Limitation:** Doesn't identify WIC authorization status
- **Cost:** $17 per 1,000 Place Details requests (as of 2024)

### 4. Crowdsourced Data
- **Strategy:** Allow app users to report/confirm WIC vendors
- **Validation:** Cross-check user reports against state data
- **Benefit:** Real-time updates on closures, new vendors

---

## Data Schema Mapping

### Normalized Store Data Model

```typescript
interface WICRetailerRawData {
  // Source metadata
  state: string;
  source: 'michigan_web' | 'nc_web' | 'florida_web' | 'oregon_web' | 'state_request' | 'scrape';
  scrapedAt: string; // ISO timestamp

  // Core vendor data
  vendorName: string;
  wicVendorId?: string;

  // Location
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;

  // Contact
  phone?: string;

  // Services
  storeType?: string; // 'grocery' | 'pharmacy' | 'specialty' | 'convenience'
  services?: string[]; // ['formula', 'fresh_produce', 'deli', 'pharmacy']

  // Coordinates (if available)
  latitude?: number;
  longitude?: number;

  // Additional metadata
  chainName?: string;
  notes?: string;
}
```

### Normalization Requirements

1. **Address Standardization**: Use USPS address validation where possible
2. **Geocoding**: Convert addresses to lat/lng using Google Geocoding API
3. **Phone Formatting**: Normalize to E.164 format
4. **Chain Detection**: Identify chain stores (Walmart, Kroger, etc.)
5. **Deduplication**: Match on address + name to remove duplicates
6. **WIC Authorization Validation**: Flag vendors with state vendor ID

---

## Implementation Plan

### Phase 1: Manual Data Collection (Week 1)
- [ ] Manually scrape Michigan vendor data (spot check)
- [ ] Manually scrape North Carolina vendor data
- [ ] Manually scrape Florida vendor data
- [ ] Manually scrape Oregon vendor data
- [ ] Document data formats for each state

### Phase 2: Automated Scrapers (Week 2)
- [ ] Build Michigan vendor scraper
- [ ] Build North Carolina vendor scraper
- [ ] Build Florida vendor scraper
- [ ] Build Oregon vendor scraper
- [ ] Implement rate limiting and error handling

### Phase 3: Data Enrichment (Week 3)
- [ ] Geocode addresses missing coordinates
- [ ] Enrich with Google Places data (hours, phone)
- [ ] Identify chain stores
- [ ] Normalize and deduplicate

### Phase 4: Data Pipeline (Week 4)
- [ ] Set up monthly refresh cron job
- [ ] Store raw scraped data
- [ ] Transform and load to normalized schema
- [ ] Validate data quality
- [ ] Alert on scraping failures

---

## Technical Considerations

### Web Scraping Best Practices
1. **Respect robots.txt**: Check each state's robots.txt
2. **Rate Limiting**: Max 1 request per second to avoid blocking
3. **User Agent**: Identify as "WIC Benefits Assistant Data Collector"
4. **Caching**: Cache results to minimize repeated requests
5. **Error Handling**: Retry logic for transient failures

### Legal Considerations
1. **Public Data**: All data sources are public government websites
2. **Terms of Service**: Review each state's website TOS
3. **Data Use**: Non-commercial, public benefit use
4. **Attribution**: Credit state sources in app

### Privacy Considerations
1. **No PII**: Retailer data contains no personally identifiable information
2. **Business Information**: Store names/addresses are public business records
3. **Data Retention**: Store historical data for change tracking

---

## Cost Estimates

### Google Places API
- **Place Details**: $17 per 1,000 requests
- **Geocoding**: $5 per 1,000 requests
- **Estimated Monthly Cost**:
  - 50,000 stores × $0.005 geocoding = $250 (one-time)
  - 50,000 stores × $0.017 place details = $850 (one-time)
  - Monthly updates: ~500 changes × $0.022 = $11/month
- **Total First Month**: ~$1,100
- **Ongoing Monthly**: ~$11

### Data Storage
- **Raw scraped data**: ~50 MB per state per month
- **Normalized data**: ~100 MB for 50K stores
- **Cost**: Negligible (S3 or database storage)

### Compute
- **Scraping**: 4 states × 2 hours = 8 hours CPU time per month
- **Data processing**: 4 hours per month
- **Cost**: <$5/month (AWS Lambda or similar)

**Total Monthly Operating Cost**: ~$20-30 after initial setup

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| State website changes break scrapers | High | Monitor scraper health; alerts on failures; manual backup |
| Rate limiting/IP blocking | Medium | Respect rate limits; rotate IPs if needed; cache aggressively |
| Missing vendor IDs | Low | Use name + address as fallback identifier |
| Stale data | Medium | Monthly refresh; crowdsource updates from users |
| Geocoding costs | Low | Cache results; only geocode new/changed addresses |

---

## Success Metrics

- **Coverage**: 95%+ of WIC vendors in priority states
- **Data Quality**: <5% geocoding errors
- **Freshness**: Data no more than 30 days old
- **Availability**: 99.9% uptime for vendor search API

---

## Next Steps (A3.2 - A3.5)

1. **A3.2**: Design store data schema (use design.md Store interface)
2. **A3.3**: Build store data ingestion pipeline (scrapers + ETL)
3. **A3.4**: Integrate Google Places for enrichment
4. **A3.5**: Create store search API

This research provides foundation for implementing A3.3 (ingestion pipeline).
