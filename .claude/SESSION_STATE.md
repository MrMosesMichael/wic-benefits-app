# Session State

> **Last Updated:** 2026-02-14
> **Session:** PLU code entry + scanner mode toggle fix

---

## Current Status

**Manual PLU code entry for produce added. Scanner mode toggle fix for iOS. All fresh produce eligibility checks work offline.**

---

## Testing Environment

**All testing is done on the production VPS (tatertot.work).** No local backend testing.

Deploy workflow:
1. Push to GitHub, pull on VPS
2. `docker compose up -d --build backend` (rebuilds image with new TS)
3. Run scripts: `docker compose exec -T backend npm run <script>`

---

## Work Completed This Session

### Manual PLU Code Entry for Produce
- **plu-codes.json** — 324 bundled IFPS produce codes (203 fruits, 121 vegetables, ~15KB)
- **pluLookup.ts** — Offline O(1) map lookup service
  - `lookupPlu()` returns name, category, organic flag
  - `pluToResultParams()` converts to result screen format
  - 5-digit codes starting with `9` detected as organic (prefix stripped for base lookup)
  - Unknown-but-valid-format codes still return eligible ("Fresh Produce")
- **Scanner screen** — "Enter PLU Code" pill button in bottom overlay, opens modal with number pad input
- **Result screen** — `isPlu` param: shows PLU label, CVB info note, hides sightings/cart (CVB is dollar-based)
- **Translations** — 9 new keys in EN + ES for PLU UI

### iOS Mode Toggle Fix
- "Check Eligibility" / "Shopping Mode" buttons were untappable on iOS
- Root cause: overlay (`absoluteFillObject`) rendered after the toggle, intercepting touches
- Fix: moved mode toggle to render after the overlay in the component tree

---

## Commits This Session

| Hash | Description |
|------|-------------|
| `ce86050` | feat: Add manual PLU code entry for produce eligibility |

---

## Builds

| Date | Version | Platform | Notes |
|------|---------|----------|-------|
| 2026-02-11 | 1.1.1 | Android + iOS | Pre-accessibility overhaul |
| 2026-02-13 | 1.1.2 | Android + iOS | Includes accessibility overhaul (i18n, touch targets, UI fixes) |

---

## What's Next

### Immediate
1. **Test PLU entry end-to-end** — enter 4011 (Banana), 94011 (Organic Banana), 9999 (unknown), 12 (invalid)
2. **Test mode toggle on iOS** — verify Check Eligibility / Shopping Mode buttons are now tappable
3. **Build new version** if PLU feature is confirmed working

### Short Term
1. **App icon** — custom 1024x1024 icon needed
2. **Spanish language review** — native speaker pass on translations
3. **App Store / Play Store submission** — screenshots still needed
4. **Register LLC** — for professional store presence

### Known Issues
- 3 pre-existing TypeScript errors in `lib/services/notificationService.ts` (unrelated)
- NY has no Kroger-family presence — no real-time inventory API for NY stores
- Store seed data uses approximate coordinates — can be refined over time

---

## VPS Notes
- All testing on VPS: `tatertot.work`
- Backend: Docker, `docker compose exec -T backend <cmd>`
- Kroger creds in VPS `.env` (KROGER_CLIENT_ID, KROGER_CLIENT_SECRET)
- Web root: `/data/docker/www/mdmichael.com/www/wic/`

---

*Previous session: Version 1.1.2 builds, Kroger API integration, multi-state store seeding*
