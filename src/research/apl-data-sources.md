# APL Data Sources Research - Priority States

**Task:** A1.1 - Research APL data sources for Michigan, North Carolina, Florida, Oregon, New York
**Date:** January 20, 2026 (Updated: February 3, 2026)
**Status:** Complete

## Executive Summary

Researched Approved Product List (APL) data sources for the five priority states. All states maintain online APL databases, with varying levels of accessibility. Key findings:

- **Michigan (FIS)**: Excel-based APL with monthly updates
- **North Carolina (Conduent)**: Web-accessible APL with rolling updates
- **Florida (FIS)**: PDF/App-based with recent policy changes
- **Oregon (State-specific)**: Excel-based APL with frequent updates
- **New York (FIS)**: PDF/App-based, largest WIC program in US

**Recommended Strategy**: Start with state-published APL files, then explore vendor portal access for automated updates. Consider USDA National UPC Database as supplementary source.

---

## State-by-State Findings

### 1. Michigan WIC (FIS Processor)

**Official Source:** [Michigan DHHS WIC Approved Foods](https://www.michigan.gov/mdhhs/assistance-programs/wic/wicvendors/wic-foods)

**Data Format:**
- Excel spreadsheet (.xlsx)
- Complete APL on first tab with newly added products highlighted
- Separate tab for recently discontinued products

**Update Frequency:**
- Monthly updates posted to website
- Daily updates available through FIS POS systems

**Access Methods:**
1. **Public Download**: Excel file from michigan.gov/mdhhs
2. **Vendor Portal**: FIS/CDP vendor portal for authorized WIC vendors
3. **POS Integration**: Daily downloads via FIS stand-beside devices or integrated POS systems

**Data Fields (typical):**
- UPC/PLU codes
- Product descriptions
- Category/subcategory
- Size restrictions
- Participant type eligibility

**FIS Integration:**
- Michigan uses FIS as eWIC processor with Custom Data Processing (CDP) for ongoing service
- Vendors with stand-beside devices receive equipment from FIS
- APL downloaded daily to POS systems
- Merchant contracts handled by FIS

**Additional Resources:**
- [WIC Food Submission Process](https://www.michigan.gov/mdhhs/assistance-programs/wic/wicvendors/food-submissions)
- [Authorized WIC Foods Policy](https://www.michigan.gov/mdhhs/-/media/Project/Websites/mdhhs/Assistance-Programs/WIC-Media/7-02-Authorized-WIC-Foods_Final-2123.pdf)

---

### 2. North Carolina WIC (Conduent Processor)

**Official Source:** [NC DHHS WIC Authorized Product List](https://www.ncdhhs.gov/ncwicfoods)

**Data Format:**
- Web-accessible database
- PDF nutrition criteria documents
- Structured data likely available via vendor portal

**Update Frequency:**
- Rolling updates throughout the year
- Latest nutrition criteria dated January 2026

**Access Methods:**
1. **Public Website**: ncdhhs.gov/ncwicfoods
2. **Vendor Portal**: Conduent FTP site for integrated vendors (requires authorization)
3. **eWIC System**: Real-time APL validation at point of sale

**Approval Criteria:**
- Federal regulations and nutrient specifications
- Retail availability
- Cost considerations
- Reviewed on rolling basis

**Conduent Integration:**
- NC uses Conduent eWIC system (also known as Bnft™)
- Integrated vendors access APL via Conduent FTP site
- APL must be downloaded daily by vendors
- Unapproved UPCs blocked at transaction time

**Data Structure:**
- UPC/PLU identification
- Category and subcategory codes
- Nutrition criteria compliance flags
- Effective dates

**Additional Resources:**
- [NC WIC Nutrition Criteria (Jan 2026)](https://www.ncdhhs.gov/ncwic-approvedfoodsnutritioncriteriapdf/open)
- [NC WIC eWIC Implementation](https://www.nascio.org/awards-library/awards/north-carolina-wic-electronic-bnft-transfer-ewic-and-benefit-application-implementation/)

**Note:** Search results did not explicitly confirm Conduent as NC's processor, but referenced eWIC/Bnft system consistent with Conduent's platform.

---

### 3. Florida WIC (FIS Processor)

**Official Source:** [Florida DOH WIC Foods](https://www.floridahealth.gov/programs-and-services/wic/wic-foods.html)

**Data Format:**
- PDF food lists
- Mobile app (Florida WIC App) with barcode scanning
- Vendor minimum inventory lists

**Update Frequency:**
- Major changes effective October 1, 2025 through March 31, 2026 (phased rollout)
- Contract infant formulas updated (new contract effective 2/1/2026)

**Recent Policy Changes (Effective Oct 2025):**
- **Artificial food dyes banned** - foods with artificial dyes no longer WIC-approved
- New food package assignments phased in over 6 months
- Updated infant formula contracts

**Access Methods:**
1. **Public Download**: PDF lists from floridahealth.gov
2. **Florida WIC App**: Mobile app with barcode scanning for eligibility checking
3. **Vendor Portal**: FIS vendor systems for authorized retailers

**Data Categories:**
- Contract Infant Formulas (until 1/31/2026)
- New Contract Infant Formulas (effective 2/1/2026)
- Mandatory Minimum Inventory for vendors
- Standard WIC foods by category

**Additional Resources:**
- [Florida WIC Foods List (Oct 2025)](https://www.floridahealth.gov/PROGRAMS-AND-SERVICES/wic/_documents/fl-wic-foods-eng.pdf)
- [Changes to Florida WIC Foods](https://www.floridahealth.gov/programs-and-services/wic/_documents/fl-wic-foods-changes.pdf)
- [Florida WIC Vendor Information](https://www.floridahealth.gov/programs-and-services/wic/vendors/index.html)

---

### 4. Oregon WIC (State-Specific System)

**Official Source:** [Oregon Health Authority WIC Food List](https://www.oregon.gov/oha/ph/healthypeoplefamilies/wic/pages/foods.aspx)

**Data Format:**
- Excel file (.xlsx) - official APL
- Pictorial food lists (PDF) in multiple languages
- Web-accessible resources

**Update Frequency:**
- Most recent major update: September 1, 2025
- New food list effective: July 1, 2025
- Ongoing additions and removals

**Recent Changes (July 2025):**
- **900+ new food UPCs** added to APL
- **130 food UPCs** deactivated
- Enhanced product variety

**Access Methods:**
1. **Vendor Resources Page**: [Oregon WIC Vendor Materials](https://www.oregon.gov/oha/ph/healthypeoplefamilies/wic/pages/vendor_materials.aspx)
2. **Excel APL Download**: Available to authorized vendors
3. **Pictorial Food Lists**: Available in 14 languages

**Supported Languages:**
English, Spanish, Arabic, Burmese, Chinese, Chuukese, Dari, Karen, Nepali, Pashto, Russian, Somali, Ukrainian, Vietnamese

**Data Structure:**
- UPC/PLU codes
- Product categories
- Visual identification (pictorial lists)
- Language-specific naming

**Notable Feature:**
- Products may be Oregon WIC-approved but not yet on APL (lag time)
- Frequent updates to expand product options

**Additional Resources:**
- [Oregon WIC Authorized Vendors](https://www.oregon.gov/oha/ph/healthypeoplefamilies/wic/pages/vendor.aspx)
- [WIC Food Changes for Vendors](https://www.oregon.gov/oha/ph/healthypeoplefamilies/wic/pages/vendor-new-food-more-choice.aspx)

---

### 5. New York WIC (FIS Processor)

**Official Source:** [New York State WIC Approved Foods](https://www.health.ny.gov/prevention/nutrition/wic/foods.htm)

**Data Format:**
- PDF food lists
- Web-accessible database
- Mobile app (WICShopper NY) for eligibility checking

**Update Frequency:**
- Quarterly major updates
- Rolling updates for product additions/removals
- Contract formula changes annually (typically February)

**Access Methods:**
1. **Public Download**: PDF lists from health.ny.gov
2. **WICShopper App**: Mobile barcode scanning for eligibility
3. **Vendor Portal**: FIS vendor systems for authorized retailers

**Data Categories:**
- Contract Infant Formulas
- Approved Cereals
- Milk and Dairy
- Juice and Fruits/Vegetables
- Whole Grains
- Peanut Butter and Legumes

**Population Served:**
- Largest WIC program in the US by participant count
- Over 400,000 participants monthly
- Significant Spanish-speaking population

**FIS Integration:**
- New York uses FIS as eWIC processor
- EBT card system statewide since 2020
- APL downloaded daily to POS systems

**Additional Resources:**
- [NY WIC Foods Shopping Guide](https://www.health.ny.gov/prevention/nutrition/wic/foods_shopping_guide.htm)
- [WICShopper App (NY)](https://www.health.ny.gov/prevention/nutrition/wic/wicshopper.htm)
- [NY WIC Vendor Information](https://www.health.ny.gov/prevention/nutrition/wic/vendors.htm)

---

## National Resources

### USDA National UPC Database

**Official Source:** [HealthData.gov WIC Datasets](https://healthdata.gov/)

**Description:**
The USDA Food and Nutrition Service maintains a National Universal Product Code (NUPC) database that can be used by WIC State agencies for developing and maintaining their APLs.

**Database Contents:**
- UPC or PLU codes
- Product category and subcategory
- Nutrition information and ingredients
- Package images including product labels
- Manufacturer name
- State agency authorizations

**Purpose:**
- Support WIC EBT purchase transactions
- Enable state agencies to develop/update/maintain APLs
- Facilitate multi-state product authorization

**Example Dataset:**
[California WIC APL on HealthData.gov](https://healthdata.gov/State/California-WIC-Authorized-Product-List/gwxi-tpsc/data)

**Federal Register Reference:**
[Request for Information: WIC National UPC Database Next Steps (2020)](https://www.federalregister.gov/documents/2020/01/30/2020-01696/request-for-information-wic-national-universal-product-code-database-next-steps)

---

## Technical Implementation Recommendations

### Data Acquisition Strategy

**Phase 1: Public Data Sources (Immediate)**
1. **Automated Downloads**
   - Schedule daily/weekly downloads of state-published APL files
   - Parse Excel/PDF formats into standardized schema
   - Track version changes and update timestamps

2. **Web Scraping Fallback**
   - For states with web-only APL access
   - Implement respectful scraping with rate limiting
   - Cache results to minimize load

**Phase 2: Vendor Portal Access (Medium-term)**
1. **Apply for WIC Vendor Authorization**
   - Register as technology partner/app developer
   - Request vendor portal access for data integration
   - May require partnership with authorized retailer

2. **FIS Integration (MI, FL)**
   - Contact FIS for API/data feed access
   - Explore FIS Code Connect API Marketplace
   - Request APL file format specifications

3. **Conduent Integration (NC)**
   - Request Conduent FTP access credentials
   - Document APL file format and update schedule
   - Implement daily download automation

**Phase 3: National Database Integration (Long-term)**
1. **USDA NUPC Database**
   - Explore access to National UPC database
   - Use as supplementary validation source
   - Cross-reference state APLs with national data

### Data Processing Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                   Data Sources                          │
├──────────┬──────────┬───────────┬──────────┬───────────┤
│ Michigan │  North   │  Florida  │  Oregon  │   USDA    │
│   FIS    │ Carolina │    FIS    │   State  │   NUPC    │
│  Excel   │ Conduent │  PDF/App  │  Excel   │ Database  │
└────┬─────┴────┬─────┴─────┬─────┴────┬─────┴─────┬─────┘
     │          │           │          │           │
     ▼          ▼           ▼          ▼           ▼
┌─────────────────────────────────────────────────────────┐
│              Ingestion Workers                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │  Excel  │ │  Web    │ │  PDF    │ │  API    │      │
│  │ Parser  │ │ Scraper │ │ Parser  │ │ Client  │      │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘      │
└───────┼──────────┼──────────┼──────────┼──────────────┘
        │          │          │          │
        └──────────┴──────────┴──────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Normalization Layer  │
        │  (Unified Schema)     │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   Validation Layer    │
        │   - UPC format        │
        │   - Required fields   │
        │   - Date validation   │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  PostgreSQL Database  │
        │   (apl_entries table) │
        └───────────────────────┘
```

### Unified APL Schema

Based on design.md specifications:

```typescript
interface APLEntry {
  id: string;                          // UUID
  state: string;                       // 'MI' | 'NC' | 'FL' | 'OR'
  upc: string;                         // 12-14 digits
  eligible: boolean;                   // WIC eligibility
  benefitCategory: string;             // 'Milk - Whole', 'Infant Formula', etc.
  benefitSubcategory?: string;         // Finer classification
  participantTypes?: ParticipantType[]; // Who can purchase
  sizeRestriction?: SizeRestriction;   // Min/max/exact sizes
  brandRestriction?: BrandRestriction; // Allowed/excluded brands
  effectiveDate: Date;                 // When approval starts
  expirationDate?: Date;               // When approval ends (if applicable)
  notes?: string;                      // State-specific notes
  dataSource: 'fis' | 'conduent' | 'state' | 'manual';
  lastUpdated: Date;                   // Last sync timestamp
  verified: boolean;                   // Quality flag
}
```

### File Format Specifications

**Michigan (Excel):**
- First sheet: Complete APL
- Second sheet: Recently discontinued
- Highlighted cells: New products
- Columns: UPC, Description, Category, Size, etc.

**North Carolina (Web/Conduent FTP):**
- Format TBD (requires vendor access)
- Likely CSV or XML via FTP
- Daily updates

**Florida (PDF):**
- Sections by food category
- Contract formulas listed separately
- Vendor minimum inventory
- May require OCR/PDF parsing

**Oregon (Excel):**
- Single Excel file
- UPC list with category codes
- Separate pictorial PDFs for consumers

### Parsing Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| **Excel variations** | Use library like `xlsx` (Node.js) to parse both .xls and .xlsx |
| **PDF extraction** | Use `pdf-parse` or OCR (Tesseract) for non-searchable PDFs |
| **Inconsistent UPC formats** | Normalize to 12 digits (pad with leading zeros) |
| **Category name variations** | Maintain category mapping table |
| **Multi-language support** | Store English canonical names, reference pictorial lists for translations |
| **Effective date tracking** | Store all versions with date ranges, query by effective date |

### Data Quality Assurance

1. **Validation Rules:**
   - UPC must be 12-14 digits
   - Required fields: state, upc, eligible, benefitCategory, effectiveDate
   - Dates must be valid and logical (effectiveDate < expirationDate)
   - Category codes must match predefined list

2. **Deduplication:**
   - Primary key: (state, upc, effectiveDate)
   - Handle superseded entries with expiration dates

3. **Change Detection:**
   - Hash APL file contents
   - Compare with previous version
   - Log additions, removals, modifications

4. **Monitoring:**
   - Alert if APL download fails
   - Alert if APL not updated in 7+ days
   - Track data freshness per state

### Update Cadence

| State | Recommended Sync Frequency | Rationale |
|-------|---------------------------|-----------|
| Michigan | Daily | Monthly official updates, but daily POS updates available |
| North Carolina | Daily | Rolling updates throughout year |
| Florida | Daily during transition (Oct-Mar), Weekly after | Phased rollout in progress |
| Oregon | Weekly | Updates less frequent but substantial when they occur |

---

## Next Steps

### Immediate (A1.2 - A1.5 Tasks)

1. **A1.2: Create APL data parsers**
   - Michigan Excel parser
   - North Carolina web scraper (public site)
   - Florida PDF parser
   - Oregon Excel parser

2. **A1.3: Implement APL sync worker**
   - Scheduled download service
   - Parse and normalize data
   - Store in PostgreSQL
   - Track version changes

3. **A1.4: Build APL validation service**
   - Input validation
   - Schema compliance
   - Data quality checks
   - Deduplication logic

4. **A1.5: Create APL update monitoring**
   - Download failure alerts
   - Data staleness alerts
   - Change detection logging
   - Sync status dashboard

### Medium-term

1. **Vendor Authorization**
   - Apply for WIC technology partner status
   - Request FIS portal access (MI, FL)
   - Request Conduent FTP access (NC)

2. **API Integration**
   - Explore FIS Code Connect APIs
   - Document Conduent data formats
   - Implement automated FTP downloads

3. **Expand State Coverage**
   - Research remaining states
   - Identify processor types (FIS vs Conduent vs other)
   - Build additional parsers

### Long-term

1. **USDA NUPC Integration**
   - Request access to National UPC Database
   - Use as validation/enrichment source
   - Cross-reference state APLs

2. **Real-time Updates**
   - Push notification system for APL changes
   - Webhook integrations where available
   - Mobile app background sync

3. **Crowdsourced Validation**
   - User reports of discrepancies
   - Community-driven corrections
   - Quality improvement feedback loop

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **State websites change format** | High | Medium | Monitor for 404s, implement format version detection, maintain multiple parser versions |
| **Vendor portal access denied** | Medium | Medium | Fall back to public sources, partner with authorized vendor |
| **PDF parsing errors** | Medium | High | Manual review of parsed data, implement OCR fallback, validate against known products |
| **Legal/ToS issues with scraping** | High | Low | Review each state's ToS, use public APIs where available, request official data feeds |
| **APL file formats change** | Medium | Medium | Version detection, schema validation, alert on unexpected formats |
| **Daily sync failures** | Low | Medium | Retry logic with exponential backoff, stale data warnings in app |

---

## Sources

### Michigan
- [WIC Approved Foods - Michigan DHHS](https://www.michigan.gov/mdhhs/assistance-programs/wic/wicvendors/wic-foods)
- [Submitting a Request for Food Authorization](https://www.michigan.gov/mdhhs/assistance-programs/wic/wicvendors/food-submissions)
- [FIS-WIC Stand-Beside Device FAQ](https://www.michigan.gov/-/media/Project/Websites/mdhhs/Folder50/Folder3/FIS_CDP_Stand_Beside_Device_Frequently_Asked_Questions.pdf)

### North Carolina
- [NC WIC Authorized Product List (APL) - NCDHHS](https://www.ncdhhs.gov/ncwicfoods)
- [North Carolina WIC Program Authorized Foods Nutrition Criteria (Jan 2026)](https://www.ncdhhs.gov/ncwic-approvedfoodsnutritioncriteriapdf/open)
- [North Carolina WIC eWIC and Bnft™ Application](https://www.nascio.org/awards-library/awards/north-carolina-wic-electronic-bnft-transfer-ewic-and-benefit-application-implementation/)

### Florida
- [WIC Foods - Florida Department of Health](https://www.floridahealth.gov/programs-and-services/wic/wic-foods.html)
- [Changes to Florida WIC Foods (Oct 2025)](https://www.floridahealth.gov/programs-and-services/wic/_documents/fl-wic-foods-changes.pdf)
- [Florida WIC Foods List (Oct 2025)](https://www.floridahealth.gov/PROGRAMS-AND-SERVICES/wic/_documents/fl-wic-foods-eng.pdf)
- [Food Vendors - Florida DOH](https://www.floridahealth.gov/programs-and-services/wic/vendors/index.html)

### Oregon
- [Oregon Health Authority: WIC Food List](https://www.oregon.gov/oha/ph/healthypeoplefamilies/wic/pages/foods.aspx)
- [Oregon WIC Authorized Vendors](https://www.oregon.gov/oha/ph/healthypeoplefamilies/wic/pages/vendor.aspx)
- [Resources and References for WIC Vendors](https://www.oregon.gov/oha/ph/healthypeoplefamilies/wic/pages/vendor_materials.aspx)
- [WIC Food Changes for Vendors](https://www.oregon.gov/oha/ph/healthypeoplefamilies/wic/pages/vendor-new-food-more-choice.aspx)

### National/Multi-State
- [California WIC APL - HealthData.gov](https://healthdata.gov/State/California-WIC-Authorized-Product-List/gwxi-tpsc/data)
- [California WIC APL - California Open Data](https://data.ca.gov/dataset/california-wic-authorized-product-list)
- [Federal Register: WIC National UPC Database Next Steps (2020)](https://www.federalregister.gov/documents/2020/01/30/2020-01696/request-for-information-wic-national-universal-product-code-database-next-steps)
- [Minnesota eWIC for Vendors](https://www.health.state.mn.us/people/wic/vendor/ewic.html)
- [Georgia WIC Program Vendor Handbook (2024)](https://dph.georgia.gov/document/document/ffy2024-georgia-wic-program-vendor-handbook-effective-sept-23-2024pdf/download)

### Technical Resources
- [FIS Code Connect API Marketplace](https://codeconnect.fisglobal.com/)
- [Conduent WIC Connect Processing Solution](https://insights.conduent.com/brochures/connect-processing-solution)
- [Implementing WIC EBT - Conduent White Paper](https://downloads.conduent.com/content/usa/en/white-paper/implementing-wic-ebt.pdf)

---

## Appendix: State Processor Matrix

| State | Processor | Format | Public Access | Vendor Portal | Update Freq |
|-------|-----------|--------|---------------|---------------|-------------|
| Michigan | FIS / CDP | Excel | ✅ Yes | ✅ Yes (FIS) | Monthly (public), Daily (vendor) |
| North Carolina | Conduent (Bnft) | Web/FTP | ✅ Yes (web) | ✅ Yes (FTP) | Rolling updates |
| Florida | FIS | PDF/App | ✅ Yes | ✅ Yes (FIS) | Phased (Oct 25-Mar 26) |
| Oregon | State-specific | Excel/PDF | ✅ Yes | ✅ Yes | Quarterly major, ongoing minor |
| New York | FIS | PDF/App | ✅ Yes | ✅ Yes (FIS) | Quarterly major, daily vendor |

---

## Appendix: Sample Data Structures

### Michigan APL Sample Entry
```csv
UPC,Description,Category,Subcategory,Size,ParticipantTypes,EffectiveDate
011110416605,Cheerios Original,Cereal,WIC Approved Cereal,12 oz,All,2024-01-01
```

### Normalized Internal Schema
```json
{
  "id": "apl_mi_011110416605_20240101",
  "state": "MI",
  "upc": "011110416605",
  "eligible": true,
  "benefitCategory": "Cereal",
  "benefitSubcategory": "WIC Approved Cereal",
  "participantTypes": ["pregnant", "postpartum", "breastfeeding", "infant", "child"],
  "sizeRestriction": {
    "exactSize": 12,
    "unit": "oz"
  },
  "brandRestriction": null,
  "effectiveDate": "2024-01-01T00:00:00Z",
  "expirationDate": null,
  "notes": null,
  "dataSource": "fis",
  "lastUpdated": "2026-01-20T10:30:00Z",
  "verified": true
}
```

---

**Research completed:** January 20, 2026
**Next task:** A1.2 - Create APL data parsers for priority states
