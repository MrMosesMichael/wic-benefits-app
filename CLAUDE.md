# CLAUDE.md — WIC Benefits App

> Instructions for Claude Code. Read on every session start.

## Quick Start

**Project:** WIC Benefits Assistant — Mobile app for WIC participants  
**Stack:** React Native + Expo, TypeScript, Node.js/PostgreSQL  
**Production:** https://mdmichael.com/wic/

### On Session Start
1. Read `ROADMAP.md` — what's done, what's next
2. Read `.claude/SESSION_STATE.md` — current work state
3. For history: `CHANGELOG.md`

### On Session End
1. Update `.claude/SESSION_STATE.md`
2. Commit uncommitted work
3. Note what to do next session

---

## Project Structure

```
wic_project/
├── app/                    # React Native + Expo mobile app
├── backend/                # Node.js/Express API
├── deployment/             # Docker, landing page
├── docs/                   # Feature guides (active)
│   └── archive/            # Old implementation summaries (72 files)
├── ROADMAP.md              # ⭐ Single source of truth for status/priorities
├── CHANGELOG.md            # Session-by-session progress
├── ARCHITECTURE.md         # Technical design
├── CLAUDE.md               # This file
└── .claude/
    ├── SESSION_STATE.md    # Current work state
    └── MEMORY.md           # Long-term decisions
```

---

## Core Concepts

1. **Three-state benefits:** Available (green) → In Cart (amber) → Consumed (gray)
2. **Hybrid household view:** Unified view with participant filter chips
3. **Scan modes:** "Check Eligibility" (default) vs "Shopping Mode"
4. **Priority States:** Michigan (working), NC, FL, OR (planned)

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
export JAVA_HOME=/usr/local/opt/openjdk@17
cd app
./android/gradlew -p android assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

### Production (VPS)
```bash
cd deployment
docker compose up -d                 # Start backend
docker compose logs -f backend       # View logs
docker compose down                  # Stop
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
4. Don't read archived docs unless needed

---

## User Preferences

- Token efficiency over speed
- Fresh sessions daily
- Orchestrator can run overnight independently
