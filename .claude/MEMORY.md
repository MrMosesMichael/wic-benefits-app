# WIC Benefits App - Persistent Memory

> This file is read when resuming work. Keep it concise (<2k tokens).

## Project Summary
WIC Benefits Assistant - Mobile app helping WIC participants scan products, track benefits, find formula, and navigate the program. Built with React Native + Expo, TypeScript, PostgreSQL backend.

**Priority States**: Michigan, North Carolina, Florida, Oregon
**Core Values**: User sovereignty, privacy-first, anti-capitalist (serves users, not corporations)

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Mobile Framework | React Native + Expo | Cross-platform, rapid development |
| Language | TypeScript | Type safety, better tooling |
| State Management | React Context + hooks | Simpler than Redux for this scale |
| Backend | Node.js/Express + PostgreSQL | Familiar stack, good for API |
| Store Detection | GPS + WiFi + Geofence | Multiple methods for accuracy |
| Inventory API | Walmart Affiliate API first | Best documented, largest coverage |

## Completed Milestones

### Phase 1 - Specifications (Complete)
- All specs written in `specs/wic-benefits-app/specs/`
- Design doc at `specs/wic-benefits-app/design.md`
- Task roadmap at `specs/wic-benefits-app/tasks.md`

### Phase 2 - Store Intelligence (In Progress)
- **Group H - Store Detection**: 6/6 tasks complete
- **Group I - Store Inventory**: 1/9 tasks complete (I1.2 in progress)
- **Groups J, K**: Not started

## Known Issues & Workarounds

| Issue | Workaround |
|-------|------------|
| Rate limits on Claude API | Orchestrator waits and retries; use haiku for simple tasks |
| macOS lacks `timeout` command | Removed timeout, rely on rate limit handling |
| Bash `${var^}` not on macOS | Use awk for string capitalization |

## Key Files

| File | Purpose |
|------|---------|
| `orchestrator.sh` | Automated task processing (daemon mode) |
| `specs/wic-benefits-app/tasks.md` | Master task list with status |
| `.orchestrator-logs/STATUS.md` | Quick status check |
| `src/` | Implementation code |

## GitHub
Repository: https://github.com/MrMosesMichael/wic-benefits-app

## Session Workflow
1. Start fresh Claude Code session
2. Say "resume" - I'll read STATUS.md and continue
3. When token limit approaches, tell me to "save state and close"
4. I'll update STATUS.md and you can end session
5. Orchestrator can run independently between sessions
