# WIC Benefits App — Roadmap

> **Last Updated:** March 5, 2026 (v1.7.4)
> **Current Phase:** Phase 1-5 Complete + Phase 7 In Progress
> **Production:** https://mdmichael.com/wic/

---

## Quick Status

| Phase | Status | Completion |
|-------|--------|------------|
| **Phase 1: Foundation** | ✅ Complete | 100% |
| **Phase 2: Store Intelligence** | ✅ Complete | 100% |
| **Phase 3: Discovery** | ✅ Complete | 100% |
| **Phase 4: Community** | ✅ Complete | 100% |
| **Phase 5: Manual Entry** | ✅ Complete | 100% |
| **Phase 6: eWIC Integration** | 🚫 Blocked | 0% |
| **Phase 7: Polish & Launch** | 🔄 In Progress | 85% |

---

## What's Working Today

✅ **Core MVP** — Barcode scanner, eligibility checking, benefits tracking, shopping cart (AsyncStorage-based; View Cart card on scan result)
✅ **Multi-State APL** — 62,938 products across 4 states (MI 9,851 / NC 16,949 / NY 21,125 / OR 14,013)
✅ **APL Automation** — Daily sync via cron, web scraping, change detection
✅ **Store Detection** — GPS + WiFi + manual selection
✅ **Crowdsourced Inventory** — "I found this" reporting with confidence decay
✅ **Manual Benefits Entry** — AsyncStorage-based household setup
✅ **Formula Shortage Detection** — Severity levels + trend tracking
✅ **Formula Features Complete** — Cross-store search, alternatives, sightings, alerts
✅ **Food Bank Finder** — Location-based search with filters
✅ **Data Sovereignty** — Data export, account deletion, privacy policy
✅ **Help & FAQ System** — Size/formula/checkout guides with harm prevention focus
✅ **GPS State Detection** — Centralized location system with zip code fallback, 33K zip codes seeded
✅ **Support & Feedback** — In-app feedback, web form, GitHub Issues integration
✅ **Landing Pages** — Landing page, support form, privacy policy, data deletion page at mdmichael.com/wic/
✅ **Google Play Data Safety** — Data safety form completed, delete-data.html published
✅ **Accessibility** — Full a11y implementation: roles, labels, hints, states across all components/screens; 153 i18n a11y keys; touch target fixes on 38 elements
✅ **Production Backend** — Deployed at https://mdmichael.com/wic/
✅ **Android APK** — Production build ready for sideloading
✅ **UI Polish** — Removed duplicate headers, SafeAreaProvider, KeyboardAvoidingView on all editing screens, home screen redesign with live WIC Balance section
✅ **iOS Build** — v1.5.0 submitted to TestFlight; v1.7.0 ready to build
✅ **Product Catalog** — Category grid + search, 62K APL products, branded-first filtering, UPC eligibility lookup, brand filter chips with punctuation normalization
✅ **Store Finder** — Map/list view with chain filters, radius search, WIC-only toggle
✅ **Community Hub** — Shopping tips, WIC recipes, know-your-rights, WIC office directory, complaint filing
✅ **Bilingual i18n** — English + Spanish; household setup, formula types, FAQ categories, cart, home, WIC Balance section (all 13 category names) translated
✅ **iOS Defect Fixes (v1.7.0)** — Scan mode removed, Add to Cart always visible, manual entry save, unit filtering, scrollable dropdowns, period settings local sync, auto-save, tappable benefit rows, empty card filtering
✅ **Cart & Scan Result Polish (v1.7.1)** — Cart fixed (AsyncStorage), View Cart card on scan result, benefit cards drill into Edit Benefits, Next Month period preset

---

## What's Blocked

🚫 **eWIC API Integration (Phase 6)** — Requires MDHHS partnership  
- Live balance lookups  
- Automatic benefits sync  
- Transaction history  

**Action:** Draft partnership letter to michiganwic@michigan.gov (see [Partnership Strategy](#partnership-strategy))

---

## Roadmap Detail

### Phase 1: Foundation (95% Complete)

Core functionality for scanning, benefits, and formula support.

| Track | Feature | Status | Notes |
|-------|---------|--------|-------|
| **A1** | Michigan APL Database | ✅ Done | 9,940 products |
| **A1** | Multi-State APL | ✅ Done | MI (9,851) + NC (16,949) + NY (21,125) + OR (14,013) = 62,938 |
| **A1** | APL Automation | ✅ Done | Daily cron sync, web scraping, change detection |
| **A2** | Product Database | ✅ Done | UPC lookup working |
| **A3** | Store Database | ⚠️ Partial | Manual stores only |
| **A4.1** | Formula Availability Tracking | ✅ Done | |
| **A4.2** | Formula Shortage Detection | ✅ Done | Severity + trends |
| **A4.3** | Formula Restock Notifications | ✅ Done | Push + 30-day expiry |
| **A4.4** | Cross-Store Formula Search | ✅ Done | Multi-store search with filters |
| **A4.5** | Alternative Formula Suggestions | ✅ Done | 100+ formula equivalents seeded |
| **A4.6** | Crowdsourced Formula Sightings | ✅ Done | Full i18n support |
| **A4.7** | Formula Alert Subscriptions | ✅ Done | Management screen with renew/delete |
| **B1** | Project Setup | ✅ Done | Expo SDK 52 |
| **B2** | Backend Infrastructure | ✅ Done | Node/Express/Postgres |
| **B3** | Data Sovereignty | ✅ Done | Export, delete, privacy policy |
| **C** | Benefits System | ✅ Done | Three-state tracking |
| **D** | UPC Scanner | ✅ Done | All formats |
| **E** | Shopping Cart | ✅ Done | Multi-participant |
| **F** | Help & FAQ | ✅ Done | Size/formula/checkout guides |
| **G** | Spanish Support | ⚠️ Partial | i18n framework done, most screens translated, needs native speaker review |
| **G2** | GPS State Detection | ✅ Done | Centralized location system, zip code fallback, 33K zip codes |
| **G3** | Support & Feedback | ✅ Done | In-app + web form + GitHub Issues, i18n complete |

### Phase 2: Store Intelligence (95% Complete)

Know what's in stock, find supplemental food sources.

| Track | Feature | Status | Notes |
|-------|---------|--------|-------|
| **H** | Store Detection | ✅ Done | GPS + WiFi + geofencing |
| **I1** | Retailer API Integration | ✅ Done | Kroger API live (MI/NC/OR), dynamic store discovery |
| **I2** | Inventory Display | ✅ Done | Via crowdsourced data |
| **J** | Food Bank Finder | ✅ Done | 10 MI food banks seeded, full UI |
| **K** | Crowdsourced Inventory | ✅ Done | Sightings + confidence |

### Phase 3: Discovery & Navigation (Complete)

Product catalog, store finder, in-store navigation.

| Track | Feature | Status | Notes |
|-------|---------|--------|-------|
| **L** | Product Catalog | ✅ Done | Category grid + search, 62K APL products, branded-first filter, UPC lookup |
| **M** | Store Finder | ✅ Done | Map/list view, chain filters, radius search, WIC-only toggle |
| **N** | In-Store Navigation | ⏸️ Deferred | Requires retailer partnerships for aisle data |

### Phase 4: Community & Advocacy (Complete)

Tips, community features, advocacy tools.

| Track | Feature | Status | Notes |
|-------|---------|--------|-------|
| **O** | Tips & Community | ✅ Done | 20 shopping tips (bundled offline), community hub |
| **P** | Advocacy Tools | ✅ Done | Know-your-rights (8 cards), WIC offices (4 states), complaint filing |
| **Q** | Recipes | ✅ Done | 25 bilingual recipes with WIC ingredient tagging |

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

### Phase 7: Polish & Launch (In Progress)

Accessibility, testing, app store submission.

| Track | Feature | Status |
|-------|---------|--------|
| **T** | Accessibility (VoiceOver, TalkBack) | ✅ Done |
| **U** | Additional Languages | ⚠️ Partial (Spanish ~90% complete; minor gaps remain) |
| **V** | Beta Testing | 🔄 In Progress (iOS TestFlight submitted) |
| **V** | App Store Submission | 🔄 In Progress (assets needed - see [iOS Release Checklist](#ios-app-store-release-checklist)) |
| **V2** | Google Play Submission | 🔄 In Progress (data safety done, screenshots needed) |
| **W** | UI Polish (duplicate headers, SafeArea) | ✅ Done |
| **X** | Register LLC | ⏳ Todo |
| **Y** | Retailer API Partnerships | ⏳ Todo (Kroger integration started, Walmart outreach planned) |

---

## Priority Queue (What to Build Next)

Based on impact, effort, and what's unblocked:

### ✅ Recently Completed

1. ~~**Finish Formula Features (A4.4-A4.7)**~~ ✅ DONE
   - Cross-store formula search, alternatives, sightings, alerts

2. ~~**Food Bank Finder (Group J)**~~ ✅ DONE
   - Location search with filters, 10 MI food banks seeded

3. ~~**Data Sovereignty (Track B3)**~~ ✅ DONE
   - Data export, account deletion, privacy policy

### 📅 Short Term (Next 2-4 Weeks)

1. **iOS & Android App Store Submissions** 🚧 IN PROGRESS
   - ✅ Apple Developer License acquired
   - ✅ Build iOS version via EAS (`build-1770760890868.ipa`)
   - ✅ Submitted to App Store Connect (v1.1.0)
   - ✅ v1.1.1 ready (header fixes, feedback form, privacy email)
   - ✅ Google Play data safety form completed
   - ✅ Data deletion page published (https://mdmichael.com/wic/delete-data.html)
   - ✅ v1.5.0 iOS build submitted to TestFlight
   - ✅ v1.5.0 Android build submitted to Google Play Console
   - ✅ v1.7.0 ready to build (all defects fixed, home redesign, i18n complete)
   - ✅ v1.7.1 iOS build submitted to TestFlight (Feb 24, 2026)
   - ✅ v1.7.1 Android build submitted to Google Play Console (Feb 24, 2026)
   - ✅ v1.7.2 iOS build submitted to TestFlight (Feb 24, 2026) — cart race condition fix
   - ✅ v1.7.2 Android build submitted to Google Play Console (Feb 24, 2026)
   - 🔄 TestFlight beta testing (UAT in progress on v1.7.2)
   - 🔄 Google Play Console setup in progress
   - ⏳ Generate store listing screenshots/images (Apple + Android)
   - ⏳ App Store submission preparation (see [iOS Release Checklist](#ios-app-store-release-checklist))
   - *Status: UAT in progress, screenshots are the main remaining blocker*

2. **Register LLC & Update Org Info**
   - Register LLC for the app business entity
   - Update app store listings with LLC as developer/publisher
   - Update privacy policy, support pages, and all public-facing org references
   - *Impact: Required for professional store presence and partnerships*

3. **Retailer API Partnerships**
   - ✅ Kroger API integration live (MI/NC/OR — real-time inventory + dynamic store discovery)
   - ✅ Multi-state store seeding: MI (53+API), NC (34+API), OR (30+API), NY (50)
   - ✅ **Kroger Background Batch Sync** — Cron-based inventory sync (3×/day, 30 stores), DB-first query in cross-store search with live API fallback for stale/missing data
   - ⏳ **Kroger Approved Partner Status** — Apply for higher API rate limits (post-LLC registration + app store listings)
   - ⏳ Walmart API — reach out to Walmart business unit once app is live on stores
   - *Strategy: Having a published app on stores strengthens partnership outreach*

4. **Complete Spanish Language Support (Group G)**
   - Review existing translations with native speaker
   - Finish any remaining untranslated strings
   - *Effort: 1 week* | *Impact: High (40% of WIC users)*
   - *Status: i18n framework in place, most translations done*

### ✅ Recently Completed (February 2026)

3. **Multi-State APL Expansion** ✅ DONE
   - ✅ Michigan: 9,940 products (Excel via web scraping)
   - ✅ North Carolina: 16,949 products (Excel via web scraping)
   - ✅ New York: 21,125 products (Excel via nyswicvendors.com)
   - ✅ Oregon: 14,013 products (Excel via web scraping)
   - ⏸️ Florida: Shelved (state has own app)
   - ✅ Daily automated sync via cron (5am UTC)
   - ✅ Change detection with SHA-256 hashing
   - ✅ Health monitoring API

### 📋 Pre-Launch Requirements

3. ~~**Accessibility (Track T)**~~ ✅ DONE
   - Full a11y implementation across all components and screens
   - 153 i18n accessibility keys (English + Spanish screen readers)
   - Touch target fixes on 38 undersized elements

4. **Beta Testing & App Store Submission (Track V)**
   - 🔄 TestFlight beta (iOS — awaiting review)
   - 🔄 Google Play Console setup (Android — data safety done)
   - ⏳ Generate store listing screenshots (Apple + Android)
   - ⏳ User feedback collection during UAT

---

## iOS App Store Release Checklist

**Current Status:** TestFlight submission complete, awaiting review
**Target:** Production App Store release

### Required Assets

| Asset | Status | Notes |
|-------|--------|-------|
| **App Screenshots** | ⏳ Todo | Required sizes: 6.7", 6.5", 5.5" iPhones |
| **App Icon** | ✅ Done | 1024×1024 + adaptive icon at `app/assets/icon.png` + `adaptive-icon.png` |
| **App Description** | ⏳ Todo | Max 4,000 characters |
| **Keywords** | ⏳ Todo | Max 100 characters, comma-separated |
| **Promotional Text** | ⏳ Todo | 170 characters (updateable without review) |
| **Support URL** | ✅ Done | https://mdmichael.com/wic/support.html |
| **Privacy Policy URL** | ✅ Done | https://mdmichael.com/wic/privacy.html |
| **App Preview Video** | ❌ Optional | 15-30 seconds (optional but recommended) |

### Screenshot Requirements

Apple requires screenshots for multiple device sizes:

- **6.7" Display (iPhone 15 Pro Max)** — 1 required, up to 10 total
- **6.5" Display (iPhone 14 Plus)** — Optional but recommended
- **5.5" Display (iPhone 8 Plus)** — Fallback for older devices

**Recommended shots:**
1. Barcode scanner in action
2. Benefits overview with shopping cart
3. Formula search results
4. Store detection / food bank finder
5. Help & FAQ screen

**Tools:**
- iOS Simulator (Xcode)
- Expo Go on physical device + screenshots
- Design tool mockups (Figma, Sketch)

### App Metadata

**App Name:** WIC Benefits (25 characters max, consider "WIC Benefits Assistant")

**Subtitle:** (30 characters max)
- Option 1: "Scan, shop, and track benefits"
- Option 2: "Never waste WIC benefits again"
- Option 3: "Your WIC shopping assistant"

**Keywords (100 chars max):**
```
WIC,benefits,food,nutrition,formula,barcode,scanner,grocery,SNAP,EBT,babies,children,health
```

**Description (4,000 chars max):** ⏳ Draft needed

**Promotional Text (170 chars):**
```
Find formula during shortages. Know what's WIC-approved before checkout. Track your benefits across participants. Shop with confidence.
```

### Support & Feedback System ✅ IMPLEMENTED

All three channels are live:

1. **GitHub Issues** ✅
   - Backend route creates issues via GitHub API (`GITHUB_TOKEN` + `GITHUB_FEEDBACK_REPO` env vars)
   - Auto-labels by category (bug, feature, question)

2. **Web Form** ✅
   - URL: `https://mdmichael.com/wic/support.html`
   - Posts to `/api/v1/feedback` endpoint

3. **In-App Feedback** ✅
   - Accessible from Help screen
   - Includes device info (platform, OS version, app version)
   - Full i18n support (English + Spanish)

### Privacy & Compliance

- ✅ Privacy Policy published: https://mdmichael.com/wic/privacy.html
- ✅ Data Deletion page published: https://mdmichael.com/wic/delete-data.html
- ✅ Google Play data safety form completed
- ✅ No third-party analytics/tracking (confirmed — no IDFA, no cookies, no pixel trackers)
- ✅ No Advertising ID usage
- ✅ Encryption: `ITSAppUsesNonExemptEncryption: false` set in app.json
- ✅ All data encrypted in transit (HTTPS)

### App Review Preparation

**Common Rejection Reasons:**
1. ❌ Missing functionality (app crashes, broken features)
2. ❌ Misleading metadata (screenshots don't match app)
3. ❌ Privacy issues (undeclared data collection)
4. ❌ Incomplete information (broken support URL)

**Pre-submission Checklist:**
- [ ] Test all core features on physical device
- [ ] Verify barcode scanner works (camera permission granted)
- [ ] Test location services (food bank finder)
- [ ] Confirm no crashes or critical bugs
- [x] Support URL is live and working
- [ ] Screenshots accurately represent current app
- [x] Privacy policy reflects actual data practices

**Review Timeline:**
- TestFlight internal: Usually 1-24 hours
- App Store review: 24-48 hours average
- Rejections: Can resubmit immediately after fixes

### Release Strategy

**Phase 1: TestFlight Beta** 🔄 Current
- Internal testing (you + up to 100 App Store Connect users)
- Fix critical bugs
- Gather initial feedback

**Phase 2: External TestFlight** ⏳ Next
- Up to 10,000 external testers
- Requires Apple review per build
- Useful for broader testing before public release
- **Action items:**
  1. In App Store Connect → TestFlight → External Testing, create a group (e.g., "Beta Testers")
  2. Add the build to the external group — this triggers an Apple review (typically 24-48 hours)
  3. Once approved, enable the public link (TestFlight → External Testing → group → Enable Public Link)
  4. Copy the public link and update `deployment/wic-landing/index.html` — replace the placeholder TestFlight URL with the real one
  5. Optionally add a "What to Test" description for testers

**Phase 3: App Store Release**
- Submit for review
- Release options: Manual, automatic, scheduled
- Monitor reviews and crash reports

### Tracking & Monitoring

**Built-in Tools (Free):**
- App Store Connect Analytics (installs, sessions, retention)
- TestFlight feedback
- Crash reports (automatic from iOS)

**Future Considerations:**
- Sentry (crash reporting)
- PostHog (privacy-friendly analytics)
- Firebase (if needed, but avoid for privacy)

---

## Partnership Strategy

### Retailer API Partnerships

**Goal:** Real-time inventory data for WIC-approved products

| Retailer | Status | Notes |
|----------|--------|-------|
| **Kroger** | ✅ Live | OAuth2 integration, real-time inventory, dynamic store discovery (MI/NC/OR) |
| **Walmart** | ⏳ Planned | Reach out to business unit once app is live on stores |

**Strategy:** Having published apps on Apple/Google stores demonstrates legitimacy and user base, which strengthens outreach to retailer business development teams.

### Register LLC

**Goal:** Formal business entity for app store presence and partnerships

**Tasks:**
- [ ] Register LLC (state TBD)
- [ ] Update Apple Developer account org info
- [ ] Update Google Play Console developer info
- [ ] Update privacy policy with LLC name
- [ ] Update support pages and landing page
- [ ] Update app.json owner/org fields if needed

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
| `.claude/DECISIONS.md` | Architectural decisions & trade-offs |
| `TEST_STRATEGY.md` | Testing patterns & plans |
| `docs/guides/` | Consolidated implementation guides |
| `docs/archive/` | Historical implementation docs (72 files) |

---

## Archive Quick Reference

For detailed implementation context, key archive files include:

| Topic | Archive File | Content |
|-------|--------------|---------|
| **Why no Walmart API** | `docs/archive/PHASE2_REVISED_PLAN.md` | Retailer API investigation, pivot decision |
| **Phase 1 gaps (Jan 2026)** | `docs/archive/PROJECT_STATUS_REPORT.md` | 25KB comprehensive audit |
| **Formula implementation** | `docs/archive/PHASE1_MISSING_FEATURES_PLAN.md` | 9-week plan with SQL schemas |
| **Store detection tests** | `docs/archive/TASK_H5_TEST_PLAN.md` | 28KB test specifications |
| **Component architecture** | `docs/archive/H4_COMPONENT_ARCHITECTURE.md` | Store detection components |
| **WiFi detection** | `docs/archive/wifi-store-detection.md` | WiFi + GPS combination logic |

See `docs/guides/` for consolidated, actionable implementation patterns.

---

**Current Version:** 1.7.4 (iOS buildNumber: 1, Android versionCode: 16)

*Last human review: February 17, 2026*
