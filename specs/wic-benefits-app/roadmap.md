# WIC Benefits Assistant - Prioritized Roadmap

> **Scan. Shop. Smile.**
>
> Infrastructure for dignity - not charity, not surveillance, but tools for empowerment.

---

## Guiding Principles (Anti-Capitalist Lens)

1. **Survival First** - Formula shortages are life-threatening. Infant needs trump feature completeness.
2. **Dignity Always** - Prevent public humiliation at checkout before it happens.
3. **No Extraction** - Value flows TO users, never extracted from them.
4. **User Sovereignty** - People own their data and control the app's direction.
5. **Mutual Aid > Charity** - Peer knowledge sharing, not institutional condescension.

---

## How to Read This Roadmap

- **Groups (A, B, C...)** = Work that can happen **in parallel**
- **Phases (1, 2, 3...)** = Sequential milestones
- **[SURVIVAL]** = Life-threatening need - highest priority
- **[DIGNITY]** = Prevents shame/humiliation
- **[EMPOWERMENT]** = Restores agency and control

---

## Phase 1: Foundation (MVP Core)

*Goal: A user can scan products, understand WIC rules, track benefits, and find formula*

### Group A: Data Foundation [SURVIVAL]

#### Track A1: State APL Database
| Task | Value | Notes |
|------|-------|-------|
| Research MI, NC, FL, OR APL data sources | Critical | Different eWIC processors |
| Design APL data schema | Critical | UPC, eligibility, restrictions |
| Build Michigan APL ingestion | High | FIS processor |
| Build North Carolina APL ingestion | High | Conduent processor |
| Build Florida APL ingestion | High | FIS processor |
| Build Oregon APL ingestion | High | State-specific |

#### Track A2: Product Database
| Task | Value | Notes |
|------|-------|-------|
| Source UPC-to-product database | Critical | 95%+ coverage goal |
| Design product data schema | Critical | |
| Build product lookup API | Critical | |

#### Track A3: Store Database
| Task | Value | Notes |
|------|-------|-------|
| Source WIC-authorized retailer data | High | By state |
| Build store data ingestion | High | |

#### Track A4: Formula Critical Features [SURVIVAL - MOVED FROM PHASE 2]
| Task | Value | Notes |
|------|-------|-------|
| Implement formula availability tracking | **CRITICAL** | Infant survival |
| Build formula shortage detection | **CRITICAL** | Alert parents early |
| Create formula restock notifications | **CRITICAL** | Push alerts |
| Build cross-store formula search | **CRITICAL** | Emergency finder |

> **Why Phase 1?** Formula shortages are life-threatening for infants 0-6 months. Parents drive hours searching. This cannot wait until Phase 2.

---

### Group B: App Shell + Data Sovereignty

#### Track B1: Project Setup
| Task | Value | Notes |
|------|-------|-------|
| Initialize React Native + Expo | Critical | |
| Configure TypeScript + linting | Critical | |
| Set up project structure | Critical | |
| Configure CI/CD | High | |

#### Track B2: Backend Infrastructure
| Task | Value | Notes |
|------|-------|-------|
| Design database schema (PostgreSQL) | Critical | |
| Set up API framework | Critical | Node.js/Express |
| Implement auth service | Critical | |
| Set up Redis caching | High | |

#### Track B3: User Data Sovereignty [NEW - FOUNDATIONAL RIGHT]
| Task | Value | Notes |
|------|-------|-------|
| Implement data export (all personal data) | **Critical** | User owns their data |
| Implement account + data deletion | **Critical** | Right to be forgotten |
| Build "what data we store" transparency screen | High | No hidden collection |
| Implement local-only mode option | High | No cloud required |
| Create privacy policy (protects USERS, not state) | **Critical** | No surveillance |

> **Why Phase 1?** Data sovereignty is a foundational right, not polish. WIC participants already face surveillance - we must be different from day 1.

---

### Group C: Benefits System [EMPOWERMENT]

#### Track C1: Household & Benefits Data Model
| Task | Value | Notes |
|------|-------|-------|
| Design household schema | Critical | household → participants → benefits |
| Implement household CRUD | Critical | |
| Build participant management | Critical | Types: pregnant, infant, child |
| Implement three-state tracking | Critical | Available → In Cart → Consumed |
| Build benefits calculation engine | Critical | |

#### Track C2: Benefits UI
| Task | Value | Notes |
|------|-------|-------|
| Design unified household view | High | All participants visible |
| Build participant filter chips | High | Quick filtering |
| Build three-state progress bars | High | Gray/Amber/Green |

**Delight: Benefit Category Icons**
> Warm, friendly icons - not childish, just human.

---

### Group D: UPC Scanner [DIGNITY]

*Private eligibility checking - no more asking clerks*

#### Track D1: Barcode Scanning
| Task | Value | Notes |
|------|-------|-------|
| Integrate vision-camera library | Critical | |
| Implement UPC-A/UPC-E/EAN-13 detection | Critical | |
| Build manual entry fallback | High | Damaged barcodes |
| Add haptic + audio feedback | Medium | Satisfying scan feel |

#### Track D2: Eligibility Lookup
| Task | Value | Notes |
|------|-------|-------|
| Build state eligibility rules engine | Critical | |
| Implement eligibility lookup API | Critical | |
| Design scan result UI | Critical | |
| Build "suggest alternative" feature | High | When not eligible |

#### Track D3: Scan Modes
| Task | Value | Notes |
|------|-------|-------|
| Implement "Check Eligibility" mode (default) | Critical | Scan ≠ Add to cart |
| Build add-to-cart confirmation | Critical | Explicit user consent |

**Delight: Friendly "Not Eligible" Messages**
> "This one's not covered, but we found 3 similar options that are!"

---

### Group E: Shopping Cart [EMPOWERMENT]

#### Track E1: Cart Core
| Task | Value | Notes |
|------|-------|-------|
| Design cart data model | Critical | |
| Build cart overview UI | Critical | Grouped by participant |
| Implement add-to-cart from scan | Critical | |
| Build multi-participant selection | High | When item eligible for multiple |

#### Track E2: Checkout Flow
| Task | Value | Notes |
|------|-------|-------|
| Build checkout summary screen | Critical | |
| Implement checkout confirmation | Critical | With benefit warning |
| Build post-checkout benefit update | Critical | In Cart → Consumed |
| Create transaction history | Medium | |

**Delight: Checkout Celebration**
> "Shopping trip complete! You got everything. Time to head home."

---

### Group F: Help & FAQ [DIGNITY - MOVED FROM PHASE 4]

*Prevents harm BEFORE it happens*

| Task | Value | Notes |
|------|-------|-------|
| Design FAQ data model | Medium | |
| Build FAQ browsing UI | Medium | |
| Implement FAQ search | Medium | |
| Build contextual FAQ (per-screen) | High | |

#### Track F1: WIC Rules Content [CRITICAL FOR HARM PREVENTION]
| Task | Value | Notes |
|------|-------|-------|
| Write formula rules FAQ | **CRITICAL** | Survival information |
| Write size requirements FAQ | **High** | "12.4oz ≠ 12.5oz" |
| Write checkout process FAQ | High | Reduces anxiety |
| Write brand restrictions FAQ | High | |
| Write "Why was this rejected?" FAQ | High | Before checkout |

> **Why Phase 1?** The size confusion FAQ alone saves hundreds of wasted trips. Users need this from day 1.

---

### Group G: Spanish Language Support [MOVED FROM PHASE 7]

| Task | Value | Notes |
|------|-------|-------|
| Prepare app for translation | High | i18n framework |
| Translate all UI strings to Spanish | **Critical** | 40% of WIC participants |
| Translate FAQ content to Spanish | **Critical** | |
| Translate error messages to Spanish | **Critical** | |

> **Why Phase 1?** 40% of WIC participants are Latinx. Language barriers = exclusion from benefits. This is inclusion, not polish.

---

## Phase 1 Complete Milestone

✅ User can check formula availability across stores (SURVIVAL)
✅ User can scan products and see eligibility privately (DIGNITY)
✅ User can track benefits with three-state system (EMPOWERMENT)
✅ User understands WIC rules before checkout (HARM PREVENTION)
✅ User can export/delete their data (SOVEREIGNTY)
✅ Spanish-speaking users fully supported (INCLUSION)

---

## Phase 2: Store Intelligence

*Goal: Know what's in stock, find supplemental food sources*

### Group H: Store Detection

| Task | Value | Notes |
|------|-------|-------|
| Implement GPS-based detection | High | |
| Build geofence matching | High | |
| Build manual store selection | High | Search, favorites |

---

### Group I: Store Inventory

#### Track I1: Inventory Integrations
| Task | Value | Notes |
|------|-------|-------|
| Research retailer API availability | Critical | |
| Implement Walmart API integration | High | National coverage |
| Implement Kroger API integration | High | Regional coverage |
| Build web scraping fallback | Medium | For non-API stores |

#### Track I2: Inventory Display
| Task | Value | Notes |
|------|-------|-------|
| Build stock status indicators | High | In stock / Low / Out |
| Create alternative suggestions | High | When out of stock |

---

### Group J: Food Bank Finder [MOVED FROM PHASE 3]

*WIC benefits alone are insufficient for many families*

| Task | Value | Notes |
|------|-------|-------|
| Source food bank data (Feeding America, 211) | High | |
| Build food bank search | High | |
| Create food bank listing UI | High | |
| Add "open now" filters | Medium | |

> **Why Phase 2?** Integrating food banks normalizes supplemental aid and acknowledges WIC's limitations. This is mutual aid, not charity shame.

---

### Group K: Crowdsourced Inventory

| Task | Value | Notes |
|------|-------|-------|
| Design crowdsourced data model | Medium | |
| Implement "I found this" reporting | Medium | |
| Build confidence scoring | Medium | |

---

## Phase 2 Complete Milestone

✅ App detects which store user is in
✅ User can see what's in stock before grabbing it
✅ Out-of-stock items suggest alternatives
✅ User can find nearby food banks (de-stigmatized)

---

## Phase 3: Discovery & Navigation

### Group L: Product Catalog

| Task | Value | Notes |
|------|-------|-------|
| Define category hierarchy | High | Dairy > Milk > Whole Milk |
| Build category navigation UI | High | |
| Build product list with images | High | |
| Implement "Can Buy Now" filter | High | Based on remaining benefits |

---

### Group M: Store Finder

| Task | Value | Notes |
|------|-------|-------|
| Build store finder UI | High | |
| Implement distance-based search | High | |
| Build availability ranking | High | "Best stores for your benefits" |
| Implement directions integration | High | Deep link to Maps |

**Delight: "Everything You Need" Badge**
> When a store has 100% of your needed items.

---

### Group N: In-Store Navigation (DEFER IF NEEDED)

*Note: Value limited by data availability*

| Task | Value | Notes |
|------|-------|-------|
| Source retailer aisle data | Medium | Limited availability |
| Build aisle lookup API | Medium | |
| Implement crowdsourced locations | Medium | |

---

## Phase 4: Community & Advocacy

### Group O: Tips & Community

| Task | Value | Notes |
|------|-------|-------|
| Build tips content system | Medium | |
| Create tips browsing UI | Medium | |
| Implement personalized tips | Medium | |

#### Track O1: Community Features (Peer-to-Peer Mutual Aid)
| Task | Value | Notes |
|------|-------|-------|
| Build tip submission | Medium | |
| Implement moderation system | Medium | |
| Add reactions (💡 Helpful, 💰 Saved Money) | Low | |

---

### Group P: Advocacy Tools [NEW]

*Move users from passive recipients to active participants*

| Task | Value | Notes |
|------|-------|-------|
| Build "Report System Failure" feature | Medium | APL errors, store issues |
| Create "Know Your Rights" content | High | Federal requirements, discrimination |
| Add links to local WIC advocacy groups | Medium | |
| Build policy change notifications | Low | "Comment period open" |

> **Why this matters:** The system is broken. Users should be empowered to fix it.

---

### Group Q: Recipes (DEFER IF NEEDED)

| Task | Value | Notes |
|------|-------|-------|
| Source WIC-friendly recipes | Medium | |
| Build recipe browsing UI | Medium | |
| Implement recipe-to-shopping-list | Medium | |

---

## Phase 5: Manual Benefits Entry

*For states without eWIC API integration*

### Group R: Manual Entry Fallback

| Task | Value | Notes |
|------|-------|-------|
| Build manual benefits entry UI | High | |
| Implement purchase logging | High | |
| Create OCR statement scanning | Medium | |

---

## Phase 6: eWIC Integration

*Live balance from eWIC card*

### Group S: eWIC APIs

| Task | Value | Notes |
|------|-------|-------|
| Research Michigan eWIC API (FIS) | High | |
| Research NC eWIC API (Conduent) | High | |
| Implement eWIC card linking | High | |
| Build real-time balance retrieval | High | |

---

## Phase 7: Polish & Launch

### Group T: Accessibility

| Task | Value | Notes |
|------|-------|-------|
| Implement VoiceOver/TalkBack | Critical | |
| Add high contrast mode | High | |
| Ensure WCAG 2.1 AA compliance | Critical | |

### Group U: Additional Languages

| Task | Value | Notes |
|------|-------|-------|
| Add other priority languages | Medium | Based on local demographics |

### Group V: Launch

| Task | Value | Notes |
|------|-------|-------|
| Conduct beta testing with WIC participants | Critical | |
| Prepare App Store listings | Critical | |
| Submit for app review | Critical | |
| Set up user support | High | |

---

## Governance & Ownership (CRITICAL - DECIDE BEFORE LAUNCH)

**This app must be owned by users, not exploited by corporations.**

### Recommended: Non-Profit with User Board
- 501(c)(3) with majority WIC participant board members
- User advisory council votes on major features
- Open-source code (AGPL license)
- Cannot be sold to for-profit entity

### Alternative: User Cooperative
- WIC participants are members/owners
- Democratic voting on priorities
- Surplus reinvested in features

---

## Anti-Patterns to NEVER Add

- ❌ Data harvesting for retailers/insurers
- ❌ Behavioral nudges ("You should buy more vegetables!")
- ❌ Health shaming ("Other families eat more produce")
- ❌ Paternalism disguised as help
- ❌ Mandatory app usage for benefits
- ❌ Benefit trading/monetization features
- ❌ Fraud detection for state agencies

---

## Metrics That Matter (Liberation, Not Engagement)

### Don't Measure These (Surveillance Capitalism Metrics)
- Daily Active Users (punishes people who exit poverty)
- Session Duration (life is hard enough)
- Retention Rate (we WANT people to leave when benefits end)

### Measure These (Human Flourishing Metrics)
1. **Checkout Humiliation Prevented** - Scans before checkout
2. **Time Returned to Families** - Wasted trips prevented
3. **Benefits Fully Utilized** - % used before expiration
4. **Stress Reduction** - User surveys on confidence
5. **Formula Crisis Response** - Families connected during shortage
6. **Knowledge Democratization** - FAQ views, tips shared

---

## Value Flow Map

```
STRUGGLES OVERCOME → VALUE CREATED (TO USERS)

SURVIVAL LAYER
├─ Formula Tracking → Infant survival during shortages
├─ Eligibility Scanner → No checkout humiliation
├─ Store Inventory → No wasted trips
└─ Benefits Tracking → Know what you have

EMPOWERMENT LAYER
├─ Multi-participant management → Household autonomy
├─ Cart simulation → Pre-checkout confidence
├─ Store comparison → Choice restored
└─ Manual entry fallback → Works when system excludes you

DIGNITY LAYER
├─ Private scanning → Check without asking clerk
├─ Friendly messaging → No cold rejection
├─ Community tips → Peer support
├─ Food bank finder → De-stigmatized aid
└─ Know your rights → Advocacy empowerment
```

---

**"Scan. Shop. Smile."** - Infrastructure for dignity, built with solidarity.
