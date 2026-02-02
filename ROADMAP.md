# WIC Benefits App — Roadmap

> **Last Updated:** February 2, 2026
> **Current Phase:** Phase 1 Completion + Phase 2 In Progress
> **Production:** https://mdmichael.com/wic/

---

## Quick Status

| Phase | Status | Completion |
|-------|--------|------------|
| **Phase 1: Foundation** | 🔄 In Progress | 79% |
| **Phase 2: Store Intelligence** | 🔄 In Progress | 60% |
| **Phase 3: Discovery** | ⏳ Not Started | 0% |
| **Phase 4: Community** | ⏳ Not Started | 0% |
| **Phase 5: Manual Entry** | ✅ Complete | 100% |
| **Phase 6: eWIC Integration** | 🚫 Blocked | 0% |
| **Phase 7: Polish & Launch** | ⏳ Not Started | 0% |

---

## What's Working Today

✅ **Core MVP** — Barcode scanner, eligibility checking, benefits tracking, shopping cart
✅ **Michigan APL** — 9,940 products in database
✅ **Store Detection** — GPS + WiFi + manual selection
✅ **Crowdsourced Inventory** — "I found this" reporting with confidence decay
✅ **Manual Benefits Entry** — AsyncStorage-based household setup
✅ **Formula Shortage Detection** — Severity levels + trend tracking
✅ **Help & FAQ System** — Size/formula/checkout guides with harm prevention focus
✅ **Production Backend** — Deployed at https://mdmichael.com/wic/
✅ **Android APK** — Production build ready for sideloading  

---

## What's Blocked

🚫 **eWIC API Integration (Phase 6)** — Requires MDHHS partnership  
- Live balance lookups  
- Automatic benefits sync  
- Transaction history  

**Action:** Draft partnership letter to michiganwic@michigan.gov (see [Partnership Strategy](#partnership-strategy))

---

## Roadmap Detail

### Phase 1: Foundation (79% Complete)

Core functionality for scanning, benefits, and formula support.

| Track | Feature | Status | Notes |
|-------|---------|--------|-------|
| **A1** | Michigan APL Database | ✅ Done | 9,940 products |
| **A1** | NC/FL/OR APL | ❌ Not Started | Expand market reach |
| **A2** | Product Database | ✅ Done | UPC lookup working |
| **A3** | Store Database | ⚠️ Partial | Manual stores only |
| **A4.1** | Formula Availability Tracking | ✅ Done | |
| **A4.2** | Formula Shortage Detection | ✅ Done | Severity + trends |
| **A4.3** | Formula Restock Notifications | ✅ Done | Push + 30-day expiry |
| **A4.4** | Cross-Store Formula Search | ❌ Not Started | **Next up** |
| **A4.5** | Alternative Formula Suggestions | ❌ Not Started | |
| **A4.6** | Crowdsourced Formula Sightings | ❌ Not Started | |
| **A4.7** | Formula Alert Subscriptions | ❌ Not Started | |
| **B1** | Project Setup | ✅ Done | Expo SDK 52 |
| **B2** | Backend Infrastructure | ✅ Done | Node/Express/Postgres |
| **B3** | Data Sovereignty | ❌ Not Started | **Required pre-launch** |
| **C** | Benefits System | ✅ Done | Three-state tracking |
| **D** | UPC Scanner | ✅ Done | All formats |
| **E** | Shopping Cart | ✅ Done | Multi-participant |
| **F** | Help & FAQ | ✅ Done | Size/formula/checkout guides |
| **G** | Spanish Support | ⚠️ Partial | i18n framework started |

### Phase 2: Store Intelligence (60% Complete)

Know what's in stock, find supplemental food sources.

| Track | Feature | Status | Notes |
|-------|---------|--------|-------|
| **H** | Store Detection | ✅ Done | GPS + WiFi + geofencing |
| **I1** | Retailer API Integration | 🚫 Blocked | Requires partnerships |
| **I2** | Inventory Display | ✅ Done | Via crowdsourced data |
| **J** | Food Bank Finder | ❌ Not Started | Feeding America / 211 |
| **K** | Crowdsourced Inventory | ✅ Done | Sightings + confidence |

### Phase 3: Discovery & Navigation (Not Started)

Product catalog, store finder, in-store navigation.

| Track | Feature | Status |
|-------|---------|--------|
| **L** | Product Catalog | ❌ |
| **M** | Store Finder | ❌ |
| **N** | In-Store Navigation | ❌ (defer if needed) |

### Phase 4: Community & Advocacy (Not Started)

Tips, community features, advocacy tools.

| Track | Feature | Status |
|-------|---------|--------|
| **O** | Tips & Community | ❌ |
| **P** | Advocacy Tools | ❌ |
| **Q** | Recipes | ❌ (defer if needed) |

### Phase 5: Manual Benefits Entry (Complete)

Fallback for states without eWIC API.

| Track | Feature | Status |
|-------|---------|--------|
| **R** | Manual Entry UI | ✅ Done |
| **R** | AsyncStorage Persistence | ✅ Done |
| **R** | Household/Participant Management | ✅ Done |

### Phase 6: eWIC Integration (Blocked)

Live balance from eWIC card — requires state partnership.

| Track | Feature | Status | Blocker |
|-------|---------|--------|---------|
| **S1** | FIS eWIC API Integration | 🚫 Blocked | MDHHS partnership |
| **S2** | Live Balance Sync | 🚫 Blocked | |
| **S3** | Transaction History | 🚫 Blocked | |

### Phase 7: Polish & Launch (Not Started)

Accessibility, testing, app store submission.

| Track | Feature | Status |
|-------|---------|--------|
| **T** | Accessibility (VoiceOver, TalkBack) | ❌ |
| **U** | Additional Languages | ❌ |
| **V** | Beta Testing | ❌ |
| **V** | App Store Submission | ❌ |

---

## Priority Queue (What to Build Next)

Based on impact, effort, and what's unblocked:

### 🔥 Immediate (This Week)

1. **Finish Formula Features (A4.4-A4.7)**
   - Cross-store formula search
   - Alternative suggestions
   - Crowdsourced sightings
   - Alert subscriptions
   - *Effort: 1-2 weeks* | *Impact: High (SURVIVAL feature)*

### 📅 Short Term (Next 2-4 Weeks)

2. **Complete Spanish Language Support (Group G)**
   - Finish translating remaining UI strings
   - Add locale selector
   - *Effort: 1 week* | *Impact: High (40% of WIC users)*
   - *Status: i18n framework in place, partial translations done*

3. **Food Bank Finder (Group J)**
   - Feeding America / 211 data integration
   - Search & listing UI
   - "Open now" filters
   - *Effort: 1 week* | *Impact: Medium*

4. **Multi-State APL Expansion**
   - North Carolina APL ingestion
   - Florida APL ingestion
   - Oregon APL ingestion
   - *Effort: 2-3 days per state* | *Impact: Medium (market expansion)*

### 📋 Pre-Launch Requirements

5. **Data Sovereignty (Track B3)**
   - Data export API
   - Account deletion
   - Privacy policy
   - *Effort: 3-5 days* | *Impact: Required for launch*

6. **Accessibility (Track T)**
   - VoiceOver support
   - TalkBack support
   - WCAG compliance
   - *Effort: 1-2 weeks* | *Impact: Required for launch*

---

## Partnership Strategy

### Michigan MDHHS Outreach

**Goal:** eWIC API access for live balance integration

**Contacts:**
- michiganwic@michigan.gov (primary)
- DataRequest@michigan.gov (cc)

**Letter should include:**
1. Who you are + app purpose
2. User problem statement (formula shortages, benefit confusion)
3. Production app demo: https://mdmichael.com/wic/
4. Field testing results + user feedback
5. Proposed partnership model
6. Security/compliance capabilities
7. Request for exploratory meeting

**Timeline:** 12-18 months from initial contact to API access (typical)

**eWIC Processor:** FIS (Fidelity National Information Services)

### Grant Opportunities

| Grant | Amount | Notes |
|-------|--------|-------|
| AWS Imagine Grant | Up to $200K + $100K credits | Spring 2026 deadline |
| AWS Nonprofit Credits | $1,000 | Promotional |
| Azure for Nonprofits | $2,000/year | Via TechSoup |

---

## Technical Debt

| Item | Impact | Priority |
|------|--------|----------|
| Backend product routes disabled | Low (scanner works offline) | Low |
| Store data not imported | Medium (empty search results) | Medium |
| No authentication system | High (using demo household) | High (pre-launch) |
| Java 17 requirement undocumented | Low | Low |

---

## Success Metrics (Human Flourishing)

Track these, not DAU/retention:

1. **Checkout Humiliation Prevented** — Scans that correctly identified ineligible items
2. **Time Returned to Families** — Shopping time saved vs. manual checking
3. **Benefits Fully Utilized** — % of benefits used before expiration
4. **Stress Reduction** — User-reported confidence in shopping
5. **Formula Crisis Response** — Time to find formula during shortages
6. **Knowledge Democratization** — FAQ views that prevented wasted trips

---

## Governance (Future)

This app should be owned by users, not exploited by corporations.

**Options:**
- 501(c)(3) with majority WIC participant board
- User cooperative (WIC participants as members/owners)

**Anti-patterns to NEVER add:**
- ❌ Data harvesting for retailers/insurers
- ❌ Behavioral nudges
- ❌ Health shaming
- ❌ Paternalism
- ❌ Fraud detection for state agencies

---

## File References

| File | Purpose |
|------|---------|
| `ROADMAP.md` | This file — single source of truth |
| `CHANGELOG.md` | Session-by-session progress log |
| `ARCHITECTURE.md` | Technical design (store detection focus) |
| `CLAUDE.md` | AI assistant instructions |
| `.claude/SESSION_STATE.md` | Current work state for session handoffs |
| `docs/` | Feature-specific guides |
| `docs/archive/` | Old implementation summaries |

---

*Last human review: February 2, 2026*
