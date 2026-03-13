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

## What's Next

### Immediate
1. **Deploy backend** — `./scripts/deploy-backend.sh` + apply migration 025
2. **Build app** — Version bump needed before release build
3. **Verify fixes** — Test each issue, close confirmed ones on GitHub

### Short Term
1. **Submit to Apple App Store** — After verification
2. **Google Play submission** — Screenshots + store listing
3. **Register LLC** — Required for professional store presence
