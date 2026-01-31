# Phase 1 Missing Features - Implementation Plan

**Date:** January 18, 2026
**Goal:** Complete Phase 1 roadmap requirements before public launch

---

## Overview

Per the project status report, Phase 1 has **4 critical feature gaps** that must be completed:

1. **Formula Tracking** [SURVIVAL] - "Life-threatening priority"
2. **Spanish Language Support** [INCLUSION] - "40% of WIC participants"
3. **Help & FAQ System** [HARM PREVENTION] - "Prevents wasted trips"
4. **Data Sovereignty** [FOUNDATIONAL RIGHTS] - "Data export, deletion, privacy"

---

## Priority 1: Formula Tracking [SURVIVAL] 🍼

### Why This Is Critical
> "Formula shortages are life-threatening for infants 0-6 months. Parents drive hours searching. This cannot wait."

### Implementation Phases

#### Phase 1.1: MVP Formula Finder (Week 1)
**Goal:** Users can search for formula across stores

**Backend:**
1. Database schema for formula availability
   ```sql
   CREATE TABLE formula_availability (
     id SERIAL PRIMARY KEY,
     upc VARCHAR(14) NOT NULL,
     store_id INTEGER REFERENCES stores(id),
     status VARCHAR(20) CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock', 'unknown')),
     quantity_range VARCHAR(20) CHECK (quantity_range IN ('few', 'some', 'plenty')),
     last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     source VARCHAR(20) CHECK (source IN ('api', 'scrape', 'crowdsourced')),
     confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100)
   );

   CREATE INDEX idx_formula_upc_store ON formula_availability(upc, store_id);
   CREATE INDEX idx_formula_updated ON formula_availability(last_updated);
   ```

2. API endpoints:
   - `GET /api/v1/formula/availability?lat={lat}&lng={lng}&radius={miles}`
   - `GET /api/v1/formula/search` - Cross-store search
   - `POST /api/v1/formula/sightings` - Crowdsourced reports (extend existing sightings API)

3. Formula type identification
   - Parse formula category from APL data
   - Identify infant formula products (category='infant_formula')
   - Track formula brand, type, size

**Frontend:**
4. Formula Finder screen (`/formula`)
   - Search by formula type
   - Radius selector (5/10/25/50 miles)
   - Results list with availability status
   - Store distance and directions
   - "I found this!" quick report button

5. Formula dashboard card on home screen
   - Quick access for infant participants
   - "Find Formula" prominent button

6. Extend scan result to show formula-specific info
   - For infant formula products, show availability at nearby stores
   - Quick "Find at other stores" button

**Testing:**
7. Test with Michigan formula products (74 in database)
8. Verify crowdsourced reporting works for formula
9. Test search with different radius settings

#### Phase 1.2: Shortage Detection (Week 2)
**Goal:** Detect and display formula shortages

**Backend:**
1. Shortage detection algorithm
   ```typescript
   // Run every hour
   async function detectShortages() {
     // For each formula UPC
     // Calculate % stores out of stock in region
     // If >50%, flag as shortage
     // Track trend (worsening/stable/improving)
   }
   ```

2. Database table:
   ```sql
   CREATE TABLE formula_shortages (
     id SERIAL PRIMARY KEY,
     formula_category VARCHAR(100) NOT NULL,
     affected_upcs TEXT[] NOT NULL,
     region VARCHAR(100) NOT NULL,
     severity VARCHAR(20) CHECK (severity IN ('moderate', 'severe', 'critical')),
     percent_stores_affected DECIMAL(5,2),
     detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     trend VARCHAR(20) CHECK (trend IN ('worsening', 'stable', 'improving'))
   );
   ```

3. API endpoint:
   - `GET /api/v1/formula/shortages?region={region}`

**Frontend:**
4. Shortage alert banner on formula finder
5. Contextual shortage information on search results
6. Alternative formula suggestions

#### Phase 1.3: Restock Alerts (Week 3)
**Goal:** Push notifications when formula is found

**Backend:**
1. Database table:
   ```sql
   CREATE TABLE formula_alerts (
     id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(id),
     formula_upcs TEXT[] NOT NULL,
     max_distance_miles INTEGER DEFAULT 10,
     notification_method VARCHAR(20) DEFAULT 'push',
     specific_store_ids INTEGER[],
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
     last_notified TIMESTAMP,
     active BOOLEAN DEFAULT TRUE
   );
   ```

2. Push notification integration
   - Use Expo Push Notifications
   - Configure device tokens
   - Implement notification sending service

3. Alert matching logic
   - When formula availability changes to 'in_stock'
   - Check for active alerts matching UPC + distance
   - Send push notification (rate limited: max 1 per 30 min)

**Frontend:**
4. "Notify me when available" button on formula search
5. Alert subscription management screen
6. Push notification permissions request
7. Handle notification tap → navigate to store details

#### Phase 1.4: Formula Alternatives (Week 4)
**Goal:** Guide users to safe WIC-approved alternatives

**Backend:**
1. Formula equivalents mapping
   - Same brand, different sizes
   - Powder vs concentrate vs ready-to-feed
   - Generic equivalents (state-specific)

2. API endpoint:
   - `GET /api/v1/formula/alternatives/{upc}`

**Frontend:**
3. Alternative suggestions in search results
4. "Try Alternatives" button when out of stock
5. WIC office contact info for medical exceptions

---

## Priority 2: Spanish Language Support [INCLUSION] 🌎

### Why This Is Critical
> "40% of WIC participants are Latinx. Language barriers = exclusion from benefits."

### Implementation (Week 5-6)

#### Step 1: i18n Framework Setup
1. Install dependencies:
   ```bash
   npm install i18next react-i18next i18next-browser-languagedetector
   ```

2. Configure i18next in app
   ```typescript
   // app/lib/i18n.ts
   import i18n from 'i18next';
   import { initReactI18next } from 'react-i18next';

   i18n
     .use(initReactI18next)
     .init({
       resources: {
         en: { translation: require('./locales/en.json') },
         es: { translation: require('./locales/es.json') }
       },
       lng: 'en',
       fallbackLng: 'en',
       interpolation: { escapeValue: false }
     });
   ```

#### Step 2: Extract All UI Strings
1. Audit all screens for hardcoded text
2. Create English strings file (`locales/en.json`)
3. Replace strings with `t()` calls:
   ```typescript
   // Before:
   <Text>Scan Product</Text>

   // After:
   import { useTranslation } from 'react-i18next';
   const { t } = useTranslation();
   <Text>{t('scanner.title')}</Text>
   ```

#### Step 3: Spanish Translation
1. Create Spanish strings file (`locales/es.json`)
2. Translate all UI strings
   - ~200-300 strings estimated
   - Use professional translation service (budget: $500-1000)
   - Or: community volunteers (Michigan WIC participants)

3. Priority translation order:
   - Home screen
   - Scanner and scan results
   - Benefits screen
   - Shopping cart and checkout
   - Formula finder
   - FAQ (once implemented)

#### Step 4: Language Selector
1. Add language toggle to settings/home
2. Persist language preference
3. Auto-detect device language on first launch

#### Step 5: Testing
1. Test all screens in Spanish
2. Verify text fits in UI (Spanish is ~20% longer)
3. Test with native Spanish speakers

---

## Priority 3: Help & FAQ System [HARM PREVENTION] ❓

### Why This Is Critical
> "The size confusion FAQ alone saves hundreds of wasted trips. Users need this from day 1."

### Implementation (Week 7-8)

#### Step 1: FAQ Data Model
1. Database schema:
   ```sql
   CREATE TABLE faq_categories (
     id SERIAL PRIMARY KEY,
     name_key VARCHAR(100) NOT NULL,  -- for i18n: "faq.category.wic_rules"
     icon VARCHAR(50),
     sort_order INTEGER,
     state VARCHAR(2)  -- null = all states
   );

   CREATE TABLE faq_items (
     id SERIAL PRIMARY KEY,
     category_id INTEGER REFERENCES faq_categories(id),
     question_key VARCHAR(200) NOT NULL,  -- for i18n
     answer_key VARCHAR(200) NOT NULL,    -- for i18n
     keywords TEXT[],  -- for search
     related_screens TEXT[],  -- contextual display
     sort_order INTEGER,
     state VARCHAR(2),  -- null = all states
     helpful_count INTEGER DEFAULT 0,
     not_helpful_count INTEGER DEFAULT 0
   );
   ```

2. Seed data with Phase 1 critical FAQs (see content below)

#### Step 2: FAQ Backend API
1. Endpoints:
   - `GET /api/v1/faq/categories` - List categories
   - `GET /api/v1/faq/category/{id}` - Get FAQs in category
   - `GET /api/v1/faq/search?q={query}` - Search FAQs
   - `GET /api/v1/faq/contextual?screen={screen}` - Get relevant FAQs
   - `POST /api/v1/faq/{id}/helpful` - Mark helpful/not helpful

#### Step 3: FAQ Frontend
1. FAQ home screen (`/faq`)
   - Category cards
   - Search bar
   - "Popular" section

2. FAQ category screen (`/faq/category/{id}`)
   - List of questions
   - Expandable answers
   - "Was this helpful?" buttons

3. FAQ detail screen (`/faq/{id}`)
   - Full question and answer
   - Related FAQs
   - Share button

4. Contextual FAQ integration
   - Help icon (?) on each screen
   - Shows 2-3 relevant FAQs
   - Link to full FAQ

5. FAQ search
   - Full-text search
   - Keyword matching
   - Fuzzy matching for typos

#### Step 4: Critical FAQ Content

**Category: WIC Rules**

1. **Why does the size matter exactly?**
   - A: WIC approved products must match the EXACT size on your benefits. A 12.4oz product is different from 12.5oz. The size confusion FAQ alone saves hundreds of wasted trips.
   - Keywords: size, ounces, oz, wrong size, rejected

2. **What are the WIC-approved formula brands in Michigan?**
   - A: Michigan WIC covers [list brands from APL]. Your WIC benefits specify which formula your baby can get. If you need a different formula for medical reasons, contact your WIC office.
   - Keywords: formula, brands, approved, baby food

3. **Why was my product rejected at checkout?**
   - A: Common reasons: (1) Wrong size, (2) Not WIC-approved brand, (3) Benefits already used, (4) Wrong category. Check the app before you shop to avoid this.
   - Keywords: rejected, denied, won't scan, checkout problem

4. **Can I buy a different brand if mine is out of stock?**
   - A: You must buy the brands on your WIC benefits. If your brand is out of stock, contact your WIC office - they may be able to give you a different brand temporarily.
   - Keywords: out of stock, different brand, substitution

5. **What's the difference between UPC-A and package UPC?**
   - A: Individual products have UPC-A codes (used by WIC). Multi-packs have different package codes. Scan individual items, not multi-pack boxes.
   - Keywords: barcode, UPC, multipack, package

**Category: Shopping & Checkout**

6. **How do I use this app when shopping?**
   - A: (1) Scan products before adding to cart, (2) Add eligible items to your cart in app, (3) Checkout in app before paying, (4) WIC benefits are updated automatically.

7. **Do I need to show the app to the cashier?**
   - A: No, use your WIC card as normal. This app helps you shop but doesn't replace your WIC card.

8. **What does "In Cart" mean?**
   - A: When you add items to your cart in the app, we reserve those benefits for you. When you checkout in app (after paying at store), benefits move to "Consumed."

**Category: Benefits**

9. **When do my WIC benefits expire?**
   - A: Your benefits expire at the end of each month and DO NOT roll over. Use them before they're gone!

10. **How do I know how much I have left?**
    - A: Check the Benefits screen. Green = Available, Amber = In Cart (reserved), Gray = Already Used.

**Category: Formula (CRITICAL)**

11. **Where can I find formula during shortages?**
    - A: Use the Formula Finder feature in this app. It searches all nearby stores and shows you where formula is in stock.

12. **My baby's formula is out of stock everywhere. What do I do?**
    - A: (1) Set a restock alert in the app, (2) Try the Formula Finder to search farther, (3) Contact your WIC office - they may know of emergency supplies or approve an alternative formula.

#### Step 5: Testing
1. Test FAQ search with common queries
2. Verify contextual FAQs show on right screens
3. Test with Spanish translations
4. Beta test with WIC participants

---

## Priority 4: Data Sovereignty [FOUNDATIONAL RIGHTS] 🔒

### Why This Is Critical
> "Data sovereignty is a foundational right, not polish. WIC participants already face surveillance - we must be different from day 1."

### Implementation (Week 9)

#### Step 1: Data Export
1. Backend API:
   ```typescript
   GET /api/v1/user/{userId}/export
   // Returns all user data in JSON format:
   {
     household: {...},
     participants: [...],
     benefits: [...],
     cart_history: [...],
     transactions: [...],
     scans: [...],
     formula_alerts: [...],
     created_at: "...",
     exported_at: "..."
   }
   ```

2. Frontend:
   - Settings → Data & Privacy → Export My Data
   - Shows what data will be exported
   - Email JSON file or download
   - Confirmation: "Export requested, you'll receive an email"

#### Step 2: Account & Data Deletion
1. Backend API:
   ```typescript
   POST /api/v1/user/{userId}/deletion-request
   // Initiates 72-hour deletion process
   // Returns: { deletionScheduledFor: "2026-01-21T10:00:00Z" }
   ```

2. Deletion process:
   - User requests deletion
   - 72-hour grace period (can cancel)
   - Email confirmation sent
   - After 72 hours: permanent deletion
   - What's deleted: household, participants, benefits, cart, transactions, scans, alerts
   - What's kept (anonymized): product sightings for community (if user reported any)

3. Frontend:
   - Settings → Data & Privacy → Delete My Account
   - Warning screen explaining consequences
   - Confirmation dialog
   - "Delete Scheduled" screen with cancel button

#### Step 3: Transparency Screen
1. Frontend screen: Settings → Data & Privacy → What Data We Store

2. Content:
   ```
   What Data We Store

   We collect the minimum data needed to help you use WIC benefits:

   ✓ Your household information
     - Participant names, types, benefit amounts

   ✓ Your shopping activity
     - Products you scanned
     - Items in your cart
     - Purchase history

   ✓ Location data (only when you use formula finder)
     - To find nearby stores
     - Never stored permanently

   ✓ Product sightings you report
     - To help other WIC families

   ❌ We do NOT:
     - Sell your data to anyone
     - Share with retailers or advertisers
     - Track you outside the app
     - Require real names (use any name you want)

   [Export My Data] [Delete My Account]
   ```

#### Step 4: Privacy Policy
1. Write privacy policy (legal review recommended)
2. Display during onboarding
3. Link from all screens
4. Key points:
   - User data ownership
   - No selling/sharing
   - Right to export
   - Right to delete
   - Minimal collection
   - No surveillance

#### Step 5: Authentication Setup (Prerequisite)
**Note:** Data sovereignty requires user accounts. Must implement authentication first.

1. Simple authentication (no complex auth flows):
   ```typescript
   // Option 1: Phone number + SMS code (simplest for WIC users)
   // Option 2: Email + password (with password reset)
   // Option 3: Anonymous accounts with device-based auth
   ```

2. For MVP, recommend **device-based anonymous accounts**:
   - No registration required
   - Generate unique user ID on first launch
   - Store locally with secure storage
   - Data tied to device
   - Can "claim" account later with email/phone

3. Database migration:
   ```sql
   CREATE TABLE users (
     id SERIAL PRIMARY KEY,
     device_id VARCHAR(100) UNIQUE,  -- for anonymous auth
     phone VARCHAR(20) UNIQUE,       -- optional
     email VARCHAR(255) UNIQUE,      -- optional
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     last_seen TIMESTAMP
   );

   -- Add user_id to existing tables
   ALTER TABLE households ADD COLUMN user_id INTEGER REFERENCES users(id);
   ALTER TABLE formula_alerts ADD COLUMN user_id INTEGER REFERENCES users(id);
   ```

---

## Implementation Timeline

### Week 1-4: Formula Tracking (SURVIVAL)
- Week 1: MVP Formula Finder
- Week 2: Shortage Detection
- Week 3: Restock Alerts
- Week 4: Formula Alternatives

### Week 5-6: Spanish Language Support (INCLUSION)
- Week 5: i18n setup, string extraction, translation
- Week 6: UI adjustments, testing

### Week 7-8: Help & FAQ System (HARM PREVENTION)
- Week 7: Backend, data model, API
- Week 8: Frontend UI, content writing, testing

### Week 9: Data Sovereignty (FOUNDATIONAL RIGHTS)
- Week 9: Authentication, export, deletion, privacy policy

**Total: 9 weeks (2.25 months)**

---

## Resource Requirements

### Development
- 1 full-time developer (or ~180 hours)
- Backend: 60 hours
- Frontend: 80 hours
- Testing: 30 hours
- Documentation: 10 hours

### Translation
- Professional Spanish translation: $500-1000
- Or: Community volunteers (free, but slower)

### Legal
- Privacy policy review: $500-1500
- Terms of service: $500-1000

### Testing
- Beta testers: 10-20 WIC participants
- Compensation: $25/hour for 2 hours each = $500-1000

**Total Budget Estimate: $2,500-4,500**

---

## Success Criteria

### Formula Tracking
✅ Users can find formula at nearby stores within 2 minutes
✅ Shortage alerts appear when >50% stores out of stock
✅ Push notifications work for restock alerts
✅ Crowdsourced reports contribute to availability data

### Spanish Language Support
✅ All UI text translated to Spanish
✅ Users can switch language in settings
✅ Spanish text fits properly in all screens
✅ Native Spanish speakers confirm quality

### Help & FAQ
✅ Users can search and find answers to common questions
✅ Contextual FAQs appear on relevant screens
✅ Size requirements FAQ reduces "wrong size" scan errors by 50%
✅ FAQ system supports both English and Spanish

### Data Sovereignty
✅ Users can export all their data
✅ Users can delete their account and data
✅ Transparency screen explains data collection
✅ Privacy policy in place and displayed

---

## Testing Plan

### Formula Tracking Testing
1. **Unit Tests**
   - Shortage detection algorithm
   - Alert matching logic
   - Confidence scoring

2. **Integration Tests**
   - Formula search API
   - Push notification delivery
   - Crowdsourced report accuracy

3. **User Testing**
   - Test with parents of infants
   - Simulate formula shortage scenario
   - Verify restock alerts work

### Spanish Language Testing
1. **Linguistic Testing**
   - Native speaker review
   - Regional dialect considerations (Mexican Spanish most common)
   - Medical/technical term accuracy

2. **UI Testing**
   - Text overflow detection
   - RTL layout (not needed for Spanish, but good practice)
   - Font rendering

### FAQ Testing
1. **Content Testing**
   - Verify FAQ answers are accurate per Michigan WIC rules
   - Test search relevance
   - Check contextual FAQ logic

2. **Usability Testing**
   - Can users find answers quickly?
   - Is content understandable?
   - Do users mark answers as helpful?

### Data Sovereignty Testing
1. **Functional Testing**
   - Export generates complete data
   - Deletion removes all user data
   - 72-hour grace period works

2. **Security Testing**
   - Data export only accessible to owning user
   - Deletion cannot be undone
   - No data leaks

---

## Risks & Mitigation

### Risk 1: Formula shortage data accuracy
**Impact:** High - incorrect availability could waste users' time
**Mitigation:**
- Combine multiple data sources (API + crowdsourced)
- Show confidence scores
- Show last updated timestamp
- Encourage user verification reporting

### Risk 2: Spanish translation quality
**Impact:** Medium - poor translation = exclusion
**Mitigation:**
- Use professional service OR community review
- Have native speakers test before launch
- Provide feedback mechanism for translation issues

### Risk 3: FAQ content accuracy
**Impact:** High - incorrect info could cause problems at checkout
**Mitigation:**
- Review with Michigan WIC agency
- Cite sources
- Update regularly as rules change
- Mark state-specific content clearly

### Risk 4: Privacy policy legal compliance
**Impact:** Critical - legal liability
**Mitigation:**
- Legal review before launch
- Follow COPPA (children's privacy) guidelines
- GDPR-style rights even if not required
- Clear, simple language

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize features** if timeline needs compression
3. **Secure resources** (budget, translation, legal)
4. **Set up project tracking** (use this plan as basis)
5. **Begin Week 1: Formula Tracking MVP**

---

## Notes

- This plan focuses on **MVP implementations** of each feature
- Enhancements can be added in future phases
- Formula tracking is most complex (4 weeks) due to alerts/notifications
- Spanish support relatively straightforward (2 weeks)
- FAQ system medium complexity (2 weeks)
- Data sovereignty requires authentication first (1 week)

**Total implementation time: 9 weeks**

After completion, Phase 1 will be **100% complete per roadmap** and ready for beta launch.
