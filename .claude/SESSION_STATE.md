# Session State

> **Last Updated:** 2026-03-13
> **Session:** Feedback Triage — 23 issues addressed (v1.8.0 prep)

---

## Current Status

**All 24 open feedback issues addressed.** 19 bug fixes, 4 features implemented, 1 investigation resolved. Backend deploy + migration 025 required. App build in progress.

**Next action:** Deploy backend (migration 025_community_tips), build app, verify fixes, close confirmed issues.

---

## Work Completed This Session

### Feedback Pipeline Fixes
- **Sync script categorization** — Issues now categorized by title prefix (`[bug]`, `[feature]`) when labels are missing
- **Sync script comments** — Now fetches and displays comment count + latest comment per issue
- **Backend label fix** — `feature-request` → `enhancement` in feedback.ts to match repo labels
- **Retroactive labeling** — All 24 existing issues labeled on GitHub (18 bug, 4 enhancement, 1 question)

### Backend Resilience
- **User route fix** — Added `resolveUserId()` to handle string device IDs (prevents PostgreSQL type error), graceful handling when user doesn't exist server-side
- **Privacy email fix** — Corrected `privacy@wicbenefits.app` → `wic.benefits.app@gmail.com` in privacy-summary endpoint
- **hashReporter fix** — Now hashes raw client ID instead of resolved integer for audit log lookups

### Bug Fixes (19 issues)
- **#13** Formula search radius persists across navigation
- **#14** Formula alerts screen remembers last assigned formula
- **#15** Alert subscription no longer gated on push permissions
- **#16** Cross-store search null chain guard prevents 500
- **#17** Formula sighting modal expands to near full-screen
- **#18** Tapping outside sighting modal dismisses it
- **#19** Sighting store list shows scroll indicator + hint
- **#20** Formula sighting save fixed (source constraint: 'formula_sighting' → 'crowdsourced')
- **#22** Formula screen stack uses replace/navigate instead of push
- **#24** FAQ bold markdown rendered as actual bold `<Text>`
- **#25** Send Feedback crash fixed (navigate instead of push)
- **#26** Privacy export works with local-first data collection
- **#27** Privacy delete clears local data regardless of server state
- **#28** Contact email corrected + made tappable with copy button
- **#29** Removed FL from supported states list
- **#30** Shopping tips card padding reduced
- **#32** Recipe multi-category select + instruction line height increased
- **#33** Know Your Rights phone numbers clickable with tel: links

### Features (4 issues)
- **#12** Partial benefits FAQ added to help system
- **#21** Map app chooser (Apple Maps/Google Maps/Waze) for directions across 7 screens
- **#23** Scan result "Why isn't this approved?" uses dynamic state name (was hardcoded to Michigan)
- **#31** Product catalog global search bar across all categories
- **#34** Community shopping tips — full-stack: voting, flagging, auto-moderation, GitHub issue on flag threshold
- **#35** Store Finder map view implemented with react-native-maps

---

## Commits This Session

| Hash | Description |
|------|-------------|
| `07afc27` | fix: feedback sync categorization, user route resilience, and comment tracking |
| `c16bbc4` | feat: address 23 feedback issues — bugs, features, and community tips |

---

## Files Modified This Session

### New Files
- `app/app/community/add-tip.tsx` — Submit a Tip form
- `app/lib/services/directionsService.ts` — Centralized map app chooser
- `backend/migrations/025_community_tips.sql` — Community tips tables
- `backend/src/routes/tips.ts` — Tips CRUD, voting, flagging, moderation API

### Modified (34 files)
- `scripts/sync-feedback.sh` — Title-based categorization + comment fetching
- `backend/src/routes/feedback.ts` — Label fix
- `backend/src/routes/user.ts` — resolveUserId, email, hashReporter fixes
- `backend/src/routes/formula.ts` — Source constraint fix
- `backend/src/routes/cross-store-search.ts` — Null chain guard
- `backend/src/index.ts` — Register tips route
- `app/` — 28 app files (screens, components, services, translations)

---

## E2E Testing (Maestro)

**Status: 8/8 flows passing** on iPhone 17 Pro Simulator (iOS 26.2)

| Flow | Description | Status |
|------|-------------|--------|
| 00 | Dismiss Expo Dev Menu | PASS |
| 01 | Home Screen | PASS |
| 02 | Help & FAQ | PASS (warnings: Send Feedback not found, partial benefits not visible) |
| 03 | Community Hub | PASS (Shopping Tips, Know Your Rights, Recipes) |
| 04 | Store Finder + Catalog | PASS (Map view, search) |
| 05 | Formula Features | PASS (warning: Select Formula not found) |
| 06 | Privacy & Location | PASS |
| 07 | Scanner | PASS |

### Defects Found via E2E
- `privacy.copyEmail` translation was missing → **FIXED**
- Error toast "Failed to fetch community tips" appears on non-community screens (backend not connected)
- Error toast "Failed to fetch privacy summary: TypeError" (backend not connected)

### Key Learnings (Maestro + React Native + iOS)
- Text matching is **anchored** — use `".*text.*"` not `"text"` for partial matches
- Use `assertVisible` not `extendedWaitUntil` for React Native accessibility text
- Use `id: "BackButton"` for React Navigation back button (not `back` command)
- Dev menu onboarding shows once — handle with `optional: true`

---

## What's Next

### Immediate
1. **Deploy backend** — `./scripts/deploy-backend.sh` + apply migration 025
2. **Build app** — Version bump needed before release build
3. **Verify fixes** — Test each issue, close confirmed ones on GitHub

### Short Term
1. **Submit to Apple App Store** — After verification
2. **Google Play submission** — Screenshots + store listing
3. **Register LLC** — Required for professional store presence

---

---

---

## Feedback Inbox

> Last synced: 2026-03-13 21:35 UTC · [25 open issues](https://github.com/MrMosesMichael/wic-benefits-feedback/issues)

### Bugs (19)

**#35** [[bug] - Store Finder doesn't show Map when clicking on MAp view for th…](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/35)  
`bug` · 2026-03-13 · 1 comment(s)  
> We have placeholder text "Map view requires react-nativemaps. use list view for now." We should fully implement this feature.
> **Latest comment:** Related to Store Finder -> currently only showing Kroger stores. We need to properly source more WIC carrying stores (I've tested for Michig

**#33** [[bug] - Know Your Rights screen - make federal resources  numbers clic…](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/33)  
`bug` · 2026-03-13  
> We should make the Federal Resources telephone numbers clickable so that a user's phone app launches... or at least a button or the field is

**#32** [[bugs] Recipe Details - multiple defects](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/32)  
`bug` · 2026-03-13  
> 1. Currently you can only select a Recipe as pertaining to a single meal type. A meal could pertain to multiple meal types. allow multiple c

**#30** [[bug] - UIX - Shopping tips screen - Each of the topics card is too la…](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/30)  
`bug` · 2026-03-13  
> The cards in the Shopping Tips screen are too large, these shouldn't have excess padding above and below the topic headings. See image

**#29** [[bug] - In Location screen](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/29)  
`bug` · 2026-03-13  
> In Location screen, under "Why Location Matters" card, we still list FL as a currently supported state. We need to remove FL as a reference 

**#28** [[bug] - Contact Us email address should be clickable and also the addr…](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/28)  
`bug` · 2026-03-13  
> 2 Defects:

**#27** [[bug] - Privacy & Data - Delete My Account fails](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/27)  
`bug` · 2026-03-13  
> open Privacy & Data screen -> click Delete my Account -> fails with: Error Failed to delete your account. Please Try again."

**#26** [[bug] - Privacy & Data - export my data fails](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/26)  
`bug` · 2026-03-13  
> open Privacy & Data screen -> clikc Export MY Data -> fails with "Error failed to export your data. Please try again."

**#25** [[bug] - Send Feedback on click crashes app](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/25)  
`bug` · 2026-03-13 · 1 comment(s)  
> using iOS v18.6.2
> **Latest comment:** This still causses a crash when clicking "Send Feedback".

**#24** [[bug] - Help & FAQ - why was my item rejected at checkout? replace  **…](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/24)  
`bug` · 2026-03-13  
> Currently we are using "**sample text**" as our 'bolding' strategy... we should replace this with actual bold text in this instances instead

**#22** [[bug] - Screen stack issues when using Find Formula](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/22)  
`bug` · 2026-03-13  
> While testing Find Formula features... as you try different formulas the screens stack up... expectation would be that the screens don't end

**#20** [[bug] - Report Formula Sighting fails to record sighting report](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/20)  
`bug` · 2026-03-13  
> Select a formula -> click Quick Report - I found this! -> click any of the quantity options -> click Submit Report.

**#19** [[bug] - Report Formula Sighting screen should show a scroll bar or ind…](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/19)  
`bug` · 2026-03-13  
> when the report formula sighting screen pulls up, the stores list isn't particularly clear that you can scroll down.

**#18** [[bug] - Report Formula Sighting should close if you click in the negat…](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/18)  
`bug` · 2026-03-13  
> If you click off the Report Formula Sighting screen... it should minimize the screen pop or close it.

**#17** [[bug] - Report Formula Sighting should expand](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/17)  
`bug` · 2026-03-13  
> when clicking report Formula Sighting and the "Report Formula Sighting" sub screen pops up, it should take up more space... just below the t

**#16** [[bug] - Cross Store Search fails](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/16)  
`bug` · 2026-03-13 · 2 comment(s)  
> Open Cross-Store Search screen -> set "By Brand" -> select Similac -> set 25mi and click "Search Stores"
> **Latest comment:** If you select an brand that hasn't been searched before, it will seemingly timeout/fail.

**#15** [[bug] - Set Alert on Find Formula fails to set](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/15)  
`bug` · 2026-03-13  
> Open Find Formula screen -> Set any Formula -> click Set Alert. 

**#14** [[bug] - Set Up Formula Alerts screen should remember user's last assig…](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/14)  
`bug` · 2026-03-13  
> Assign a Formula -> click Manage All Formula Alerts -> click Set Up Alerts -> should remember previously assigned Formula IF THERE ISN'T ALR

**#13** [[bug] - Find Formula screen should remember search radius selection](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/13)  
`bug` · 2026-03-13  
> Find formula screen - set search radius to 50 mi. Then click Select Formula (or change if already set) - Pick anything -> the Search Radius 
### Feature Requests (5)

**#36** [[feature] - File a complaint - State WIC office card should be clickab…](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/36)  
`enhancement` · 2026-03-13  
> the File A Complaint screen - State WIC office card - the contact number should be clickable to launch the phone app. This currently is not 

**#34** [[feature] - Add ability for users to add their own Shopping Tips](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/34)  
`enhancement` · 2026-03-13  
> This may be another section of the app, but add ability for users to add their own shopping tips. Should have it's own filterable option to 

**#31** [[feature request] - Product Catalog - add search bar to allow searchin…](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/31)  
`enhancement` · 2026-03-13  
> add search bar in Product Catalog screen to allow users to search ALL product categories at once.

**#21** [[feature] - Find Formula screen - when clicking directions give option…](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/21)  
`enhancement` · 2026-03-13  
> Currently we default to Apple maps on iOS machines (I imagine it's google maps on android devices). However, we should give users ability to

**#12** [[Feature] - maybe FAQ topic? How to use partial benefits](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/12)  
`enhancement` · 2026-03-02 · 2 comment(s)  
> I just encountered an issue where with MI WIC benefits, we have 0.75 of a JAR of peanut butter or beans to use. I just don't know of a way t
> **Latest comment:** Note: Partial benefits FAQ has been implemented in the app (faqService.ts). Need to verify content accuracy with a WIC participant.
### Other (1)

**#23** [[Investigation] - "Why isn't this approved?" dialog on scan result scr…](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/23)  
`question` · 2026-03-13 · 1 comment(s)  
> I wanted to investigate whether we have hardcoded the state value in the "Why isn't this approved" dialog on the scan result screen. I know 
> **Latest comment:** Confirmed... the "Michigan's WIC Approved Product List" is indeed hardcoded. We need to make this a variable based on user's location.
