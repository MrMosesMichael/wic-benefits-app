# CLAUDE.md — WIC Benefits App

> Instructions for Claude Code. Read on every session start.

## Quick Start

**Project:** WIC Benefits Assistant — Mobile app for WIC participants  
**Stack:** React Native + Expo, TypeScript, Node.js/PostgreSQL  
**Production:** https://mdmichael.com/wic/

### On Session Start
1. Read `ROADMAP.md` — what's done, what's next
2. Read `.claude/SESSION_STATE.md` — current work state
3. **Triage GitHub feedback:** Run `scripts/triage-feedback.sh` or `gh issue list --repo MrMosesMichael/wic-benefits-feedback --state open` — review new issues, add labels, note actionable items
4. For history: `CHANGELOG.md`

### On Session End
1. Update `.claude/SESSION_STATE.md`
2. Commit uncommitted work
3. Note what to do next session

### Before Building / Committing for Release
- **Bump version in `app/app.json`** if features were added or bugs fixed:
  - `expo.version` — display version (semver: major.minor.patch)
  - `expo.ios.buildNumber` — must increment per version for App Store (string, e.g. "1")
  - `expo.android.versionCode` — must increment globally for Play Store (integer, e.g. 2)
- Rule of thumb: new features → minor bump, bug fixes → patch bump, breaking changes → major bump
- `buildNumber` resets to "1" on version bump; `versionCode` never resets (always increases)

---

## Project Structure

```
wic_project/
├── app/                    # React Native + Expo mobile app
├── backend/                # Node.js/Express API
├── deployment/             # Docker, landing page
├── docs/
│   ├── guides/             # Implementation guides (consolidated from archive)
│   └── archive/            # Historical implementation docs (72 files)
├── ROADMAP.md              # ⭐ Single source of truth for status/priorities
├── CHANGELOG.md            # Session-by-session progress
├── ARCHITECTURE.md         # Technical design
├── TEST_STRATEGY.md        # Testing patterns & plans
├── CLAUDE.md               # This file
└── .claude/
    ├── SESSION_STATE.md    # Current work state
    ├── DECISIONS.md        # Architectural decisions & trade-offs
    └── MEMORY.md           # Long-term learnings
```

---

## Core Concepts

1. **Three-state benefits:** Available (green) → In Cart (amber) → Consumed (gray)
2. **Hybrid household view:** Unified view with participant filter chips
3. **Scan modes:** "Check Eligibility" (default) vs "Shopping Mode"
4. **Supported States:** MI, NC, NY, OR (FL shelved — state has own app)

---

## Key Commands

### Backend
```bash
cd backend
npm run dev                          # Start dev server
npm run detect-shortages             # Run shortage detection
```

### Mobile App
```bash
cd app
npx expo start                       # Start Expo dev server
```

### Android Build
```bash
export JAVA_HOME=/usr/local/opt/openjdk@17   # Required unless set in ~/.zshrc
cd app
./android/gradlew -p android assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
# AAB (for Play Store): npx eas-cli build --platform android --profile production --local
```

### Production (VPS: tatertot.work)

**Note:** VPS has no npm installed. All commands run via Docker.

```bash
# SSH to VPS
ssh tatertot.work
cd ~/projects/wic-app

# Docker management
docker compose up -d                 # Start backend
docker compose logs -f backend       # View logs
docker compose down                  # Stop
docker compose restart backend       # Restart

# APL sync (5 states: MI, NC, FL, OR, NY)
docker compose exec -T backend npm run apl-sync                    # Sync due states
docker compose exec -T backend npm run apl-sync -- --state MI      # Sync specific state
docker compose exec -T backend npm run apl-sync -- --all --force   # Force sync all

# Shortage detection
docker compose exec -T backend npm run detect-shortages

# Kroger inventory sync (manual run)
docker compose exec -T backend npm run sync-kroger-inventory -- sync --max-stores 30
docker compose exec -T backend npm run sync-kroger-inventory -- stats
docker compose exec -T backend npm run sync-kroger-inventory -- cleanup
```

**Kroger Sync Crontab (VPS):**
```cron
# Kroger inventory sync every 8h (30 stores max)
0 1 * * * cd ~/projects/wic-app && docker compose exec -T backend npm run sync-kroger-inventory -- sync --max-stores 30 >> /var/log/kroger-sync.log 2>&1
0 9 * * * cd ~/projects/wic-app && docker compose exec -T backend npm run sync-kroger-inventory -- sync --max-stores 30 >> /var/log/kroger-sync.log 2>&1
0 17 * * * cd ~/projects/wic-app && docker compose exec -T backend npm run sync-kroger-inventory -- sync --max-stores 30 >> /var/log/kroger-sync.log 2>&1

# Weekly cleanup (Sunday 3am UTC)
0 3 * * 0 cd ~/projects/wic-app && docker compose exec -T backend npm run sync-kroger-inventory -- cleanup >> /var/log/kroger-sync.log 2>&1
```

### Deploy Scripts (from local machine)
```bash
./scripts/deploy-backend.sh          # Deploy backend to VPS
./scripts/build-android.sh --upload  # Build APK and upload
./scripts/build-android.sh --upload-only  # Upload existing APK
```

---

## Current Priorities

See `ROADMAP.md` for full details. Quick summary:

1. **Finish Formula Features (A4.4-A4.7)** — Cross-store search, alternatives, alerts
2. **Help & FAQ System** — Harm prevention, prevents wasted trips
3. **Spanish Support** — 40% of WIC users
4. **Food Bank Finder** — Supplemental aid
5. **Multi-state APL** — NC, FL, OR

---

## Session Checkpointing

When working on multi-step tasks, checkpoint to `.claude/SESSION_STATE.md`:

```markdown
## Current Task
[What you're working on]

## Progress
- [x] Completed step
- [ ] Next step (IN PROGRESS)
- [ ] Upcoming

## Files Modified
- `path/to/file` - what changed

## Next Action
[Exactly what to do next]
```

---

## Token Efficiency

1. Read ROADMAP.md first, not old specs
2. Be concise
3. Batch tool calls
4. Use `docs/guides/` for implementation patterns (pre-consolidated)
5. Use `.claude/DECISIONS.md` for why things were built a certain way
6. Only read `docs/archive/` for deep historical context

### When to Use Which Docs

| Need | Read This |
|------|-----------|
| Current status & priorities | `ROADMAP.md` |
| How a feature works | `docs/guides/*.md` |
| Why a decision was made | `.claude/DECISIONS.md` |
| How to test something | `TEST_STRATEGY.md` |
| Detailed historical specs | `docs/archive/` (last resort)

---

## User Preferences

- Token efficiency over speed
- Fresh sessions daily
- Orchestrator can run overnight independently
