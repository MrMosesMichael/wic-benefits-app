# Session State

> **Last Updated:** 2026-03-13
> **Session:** Content moderation pipeline + feedback triage round 2

---

## Current Status

**Tip & recipe moderation pipeline complete.** Both tips and recipes now go through pending → auto-review → approve/reject flow with GitHub issue tracking. Crontab fixed on VPS (logs moved to ~/logs/, review-content runs every 15 min).

**Feedback triage:** 7 more issues addressed this session. 11 issues remain open, most pending app rebuild to verify.

---

## Work Completed This Session

### Content Moderation Pipeline
- **Tip moderation** — Tips now insert as `pending`, rate limit 5→3/hr, anonymous rate limiting via IP, GitHub issue auto-created on submission
- **Unified review-content.ts** — Rule-based auto-review for both tips and recipes (replaces review-recipes.ts)
- **Blocklist false positive fix** — Removed "die" (matched "diced"), added word-boundary matching for short terms
- **DB constraint fix** — Added `pending` and `rejected` to status CHECK constraints (migration 026)
- **Migration 015 applied** — notification_subscriptions table created on VPS (fixes #15)

### VPS Crontab Fix
- **Root cause:** `/var/log/` is root-owned, user `mmichael` couldn't write there
- **Fix:** All logs redirected to `~/logs/`, PATH added to crontab
- **Added:** Log rotation (truncate after 14 days), content review every 15 min
- **Removed:** Duplicate review-recipes cron entry

### Feedback Fixes (7 issues)
- **#28** — Added `common.copied` + `privacy.emailCopied` translation keys (EN/ES)
- **#23** — `notApprovedExplanation` now uses `{{state}}` instead of hardcoded "Michigan"
- **#36** — File a Complaint phone number now clickable (Linking.openURL tel:)
- **#30** — Tip card padding reduced (removed double padding)
- **#22** — Formula screen stacking: push→navigate/replace in alerts/alternatives
- **#16** — Cross-store search timeout increased 10s→30s
- **#32** — Removed fixed minHeight on recipe instruction steps

---

## Commits This Session

| Hash | Description |
|------|-------------|
| `66c4571` | feat: tip moderation pipeline + unified rule-based content review |
| `8d386ba` | chore: sync session state |
| `eec23ea` | fix: add pending/rejected to recipes and tips status constraints |
| `c334ba7` | fix: remove 'die' from blocklist — false positive on 'diced' |
| `51fa0e2` | fix: address 7 feedback issues — translations, navigation, UI, DB |

---

## Remaining Open Issues (11)

| # | Issue | Status |
|---|-------|--------|
| **#35** | Store Finder map view + Kroger-only stores | Open (larger feature) |
| **#32** | Recipe Details — defect #4 (selectable WIC ingredients) | Open (larger feature) |
| **#30** | Shopping tips card padding | Fixed, needs rebuild verification |
| **#28** | Contact Us missing translations | Fixed, needs rebuild verification |
| **#25** | Send Feedback crashes app | Backend works; app-side crash needs investigation |
| **#23** | Hardcoded state in scan dialog | Fixed, needs rebuild verification |
| **#22** | Formula screen stacking | Fixed, needs rebuild verification |
| **#16** | Cross Store Search fails/timeout | Fixed (timeout 10→30s), needs verification |
| **#15** | Set Alert on Formula fails | Fixed (migration 015 applied), needs verification |
| **#36** | Complaint phone number clickable | Fixed, needs rebuild verification |
| **#37** | Recipe Review — Tuna salad sandwich | Auto-approved, close after review |

---

## What's Next

### Immediate (next session)
1. **Test new app build** — Verify fixes for #28, #23, #36, #30, #22, #16, #15
2. **Investigate #25** — Send Feedback crash (backend works, app-side issue)
3. **Close verified issues** on GitHub

### Short Term
1. **Version bump** in app.json before release
2. **App Store / Play Store submission**
3. **#32 defect #4** — Selectable WIC ingredients (feature)
4. **#35** — Store Finder map + non-Kroger stores (feature)

---

## Recipe/Tip Review Workflow

- Auto-approved → close the GitHub issue
- Flagged for human review → approve/reject via admin API, then close issue
- Content review script runs every 15 min via cron on VPS

---

---

## Feedback Inbox

> Last synced: 2026-03-16 15:07 UTC · [8 open issues](https://github.com/MrMosesMichael/wic-benefits-feedback/issues)

### Bugs (6)

**#35** [[bug] - Store Finder doesn't show Map when clicking on MAp view for th…](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/35)  
`bug` · 2026-03-13 · 2 comment(s)  
> We have placeholder text "Map view requires react-nativemaps. use list view for now." We should fully implement this feature.
> **Latest comment:** We're still missing store data. For instance I don't see the Walmart off of Maple in Troy, MI. We need to expand the data scrape to make sur

**#32** [[bugs] Recipe Details - multiple defects](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/32)  
`bug` · 2026-03-13 · 2 comment(s)  
> 1. Currently you can only select a Recipe as pertaining to a single meal type. A meal could pertain to multiple meal types. allow multiple c
> **Latest comment:** 2. The space now exists. After an instruction is complete and clicking "Add Another", we should be removing excess padding on the "done" sec

**#25** [[bug] - Send Feedback on click crashes app](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/25)  
`bug` · 2026-03-13 · 2 comment(s)  
> using iOS v18.6.2
> **Latest comment:** This is still occurring. 

**#22** [[bug] - Screen stack issues when using Find Formula](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/22)  
`bug` · 2026-03-13 · 2 comment(s)  
> While testing Find Formula features... as you try different formulas the screens stack up... expectation would be that the screens don't end
> **Latest comment:** Screen stacking on Find Formula still occurs. Basically as you "select" a Formula, click "Manage alerts" then click "set Up Alert" , click C

**#16** [[bug] - Cross Store Search fails](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/16)  
`bug` · 2026-03-13 · 4 comment(s)  
> Open Cross-Store Search screen -> set "By Brand" -> select Similac -> set 25mi and click "Search Stores"
> **Latest comment:** This issue still occurs. This appears to be an issue with searching for the first time, and needing to cache the store store search data. We

**#15** [[bug] - Set Alert on Find Formula fails to set](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/15)  
`bug` · 2026-03-13 · 2 comment(s)  
> Open Find Formula screen -> Set any Formula -> click Set Alert. 
> **Latest comment:** We now provide a positive message "Formula Alert Set!" however... if you click on "Manage All Formula Alerts"... that list is empty. I did f
### Feature Requests (2)

**#40** [[feature] - in Recipe creation add function to select common WIC items…](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/40)  
`enhancement` · 2026-03-16  
> On "WIC Ingredients" list... I think it would be ideal if the types of WIC products generally approved are selectable. For instance "Whole w

**#36** [[feature] - File a complaint - State WIC office card should be clickab…](https://github.com/MrMosesMichael/wic-benefits-feedback/issues/36)  
`enhancement` · 2026-03-13 · 1 comment(s)  
> the File A Complaint screen - State WIC office card - the contact number should be clickable to launch the phone app. This currently is not 
> **Latest comment:** The number is now clickable, we should also make sure IF there is an email address then they are also clickable in this card as well. 
