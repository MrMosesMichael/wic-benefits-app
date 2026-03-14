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
