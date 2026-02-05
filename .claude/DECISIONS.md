# DECISIONS.md — Architectural Decisions & Trade-offs

> Why things were built the way they are. Prevents re-investigating dead ends.

---

## Rejected Approaches

### 1. Retailer Inventory APIs (Walmart, Kroger, Target)

**Investigated:** January 2026
**Status:** ABANDONED
**Archive Reference:** `docs/archive/PHASE2_REVISED_PLAN.md`

**What We Tried:**
- Walmart Affiliate API
- Kroger developer portal research
- Target API investigation

**Why It Failed:**
1. **Affiliate-only model** — APIs designed for marketing partners driving sales, not inventory checking
2. **No store-level inventory** — Public APIs show online availability, not in-store stock
3. **Partnership required** — Store-specific inventory needs OPD API with business manager approval
4. **Strict ToS** — Explicitly prohibits scraping, requires affiliate partnership
5. **Rate limits** — Only 5,000 calls/day (insufficient for user base)
6. **Commission-based** — Designed for referral fees, not inventory queries

**Walmart ToS Quote:**
> "The Walmart API is available to Walmart's affiliate partners solely for the purpose of advertising Walmart.com products online. It may not be used for any other purposes without express written permission from Walmart."

**Alternative Chosen:** Crowdsourced inventory with confidence decay (see below)

---

### 2. Web Scraping Store Inventory

**Status:** REJECTED
**Why:** ToS violations, legal risk, fragile (breaks when sites change)

---

## Chosen Approaches & Trade-offs

### 1. Crowdsourced Inventory System

**Chosen:** January 2026
**Archive Reference:** `docs/archive/PHASE2_CROWDSOURCED_COMPLETION.md`

**Why This Works:**
- No API dependencies or ToS violations
- Community-powered (users help each other)
- Especially valuable for formula shortages
- Real-time, hyperlocal data

**Trade-offs:**
| Benefit | Cost |
|---------|------|
| No API partnerships needed | Data quality depends on user participation |
| Real-time reports | Stale data if no recent reports |
| Community building | Requires critical mass of users |

**Confidence Scoring Algorithm:**
```
Age < 2 hours  → 100% confidence
Age 2-6 hours  → 90% confidence
Age 6-12 hours → 70% confidence
Age 12-24h     → 50% confidence
Age 24-48h     → 30% confidence
Age > 48 hours → 20% confidence
```
Bonuses: +4% per helpful mark, +10% for location verification

---

### 2. Store Detection: WiFi + GPS + Geofence

**Archive Reference:** `docs/archive/wifi-store-detection.md`, `docs/archive/H4_COMPONENT_ARCHITECTURE.md`

**Multi-Signal Approach:**
When WiFi and GPS agree on same store:
- **Confidence = max(GPS, WiFi) + 10%** (capped at 100%)
- Auto-bypasses confirmation requirement

**Confidence Thresholds Explained:**

| Threshold | Meaning | UX Behavior |
|-----------|---------|-------------|
| 85%+ | High confidence | Auto-accept, no prompt |
| 70-84% | Medium confidence | Ask for confirmation |
| 50-69% | Low confidence | Require confirmation |
| <50% | Very low | Show manual selection |

**Why 85% for auto-accept?**
- Balances convenience vs. accuracy
- Geofence match at 95%+ confidence overrides WiFi
- Users reported frustration with frequent prompts

---

### 3. Three-State Benefit Tracking

**States:** Available (green) → In Cart (amber) → Consumed (gray)

**Why Three States (not Two)?**
- "In Cart" prevents double-counting during shopping trip
- Shows real-time benefit consumption
- Supports mid-shopping corrections
- Matches mental model of physical cart

**Trade-off:** Adds complexity vs. simple "available/used" model, but prevents checkout humiliation when user thinks they have benefits but cart already claimed them.

---

### 4. Manual Entry as Fallback (Not Primary)

**Archive Reference:** `docs/archive/PHASE1_MISSING_FEATURES_PLAN.md`

**Decision:** Device-based anonymous accounts with optional phone/email upgrade

**Why Not Require Registration?**
- WIC participants face surveillance concerns
- Reduces friction to first use
- Data tied to device, can "claim" account later
- No barriers to getting help

**Trade-off:** Can't sync across devices without account upgrade

---

### 5. Formula Shortage Detection Thresholds

**Archive Reference:** `docs/archive/FORMULA_FINDER_WEEK2_COMPLETE.md`

**Severity Levels:**
| Level | Threshold | Meaning |
|-------|-----------|---------|
| Critical | 90%+ stores out | Emergency shortage |
| Severe | 70-90% stores out | Significant shortage |
| Moderate | 50-70% stores out | Localized shortage |

**Why These Numbers?**
- Below 50% = normal variation, not shortage
- 70%+ = actionable — user should expand search radius
- 90%+ = emergency — contact WIC office for alternatives

**Trend Detection:**
- Minimum 3 stores required (prevents false positives from single-store issues)
- 10% threshold for trend changes (prevents noise)

---

## Deferred Decisions

### 1. Authentication System
**Current:** Demo household (ID=1)
**Deferred Because:** Not needed for beta testing
**Will Need For:** Multi-device sync, true data sovereignty

### 2. Governance Model
**Options Considered:**
- 501(c)(3) with majority WIC participant board
- User cooperative (WIC participants as members/owners)

**Deferred Because:** Need legal review and user research first

---

## Anti-Patterns (Never Implement)

Per project values, these are explicitly forbidden:

- Data harvesting for retailers/insurers
- Behavioral nudges (dark patterns)
- Health shaming
- Paternalism
- Fraud detection for state agencies

---

## Decision Log Template

When making significant architectural decisions, document here:

```markdown
### [Feature/System Name]

**Date:** YYYY-MM-DD
**Status:** CHOSEN / REJECTED / DEFERRED
**Archive Reference:** `docs/archive/[file].md`

**Options Considered:**
1. Option A — pros/cons
2. Option B — pros/cons

**Decision:** [What was chosen]

**Why:**
- Reason 1
- Reason 2

**Trade-offs:**
| Benefit | Cost |
|---------|------|
| ... | ... |

**Revisit When:** [Conditions that would change this decision]
```

---

*Last Updated: February 2026*
