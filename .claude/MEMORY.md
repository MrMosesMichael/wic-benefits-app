# WIC Benefits App - Persistent Memory

> This file is read when resuming work. Keep it concise (<2k tokens).
> Last updated: February 12, 2026

## Project Summary
WIC Benefits Assistant — Mobile app helping WIC participants scan products, track benefits, find formula, and navigate the program. Built with React Native + Expo (SDK 52), TypeScript, Node.js/Express + PostgreSQL backend.

**Supported States**: Michigan, North Carolina, New York, Oregon (Florida shelved — state has own app)
**Core Values**: User sovereignty, privacy-first, no data harvesting, no paternalism
**Production**: https://mdmichael.com/wic/

## Architecture

| Component | Technology | Notes |
|-----------|-----------|-------|
| Mobile App | React Native + Expo SDK 52 | File-based routing via expo-router |
| Language | TypeScript | Throughout app + backend |
| State Mgmt | React Context + hooks | I18nContext, useLocation, useHousehold |
| Backend | Node.js/Express + PostgreSQL | Deployed via Docker on VPS |
| Location | Centralized locationService.ts | GPS + zip code fallback, 33K zip codes |
| i18n | Custom I18nContext | `useI18n()` → `t('key')`, en + es |
| Storage | AsyncStorage (client) | Location prefs, household data, benefits |
| Builds | EAS Build (iOS + Android) | Local builds, manual deploy |

## Key Patterns

- **i18n**: `import { useI18n } from '@/lib/i18n/I18nContext'` → `const { t } = useI18n()`
- **Location**: `import { useLocation } from '@/lib/hooks/useLocation'` → `const { location } = useLocation()`
- **API calls**: `app/lib/services/api.ts` — all backend calls go through this
- **Eligibility**: `checkEligibility(upc, state?)` — state param optional, defaults to MI on backend

## Contact Email

- **Current:** `wic.benefits.app@gmail.com` (Gmail, used in privacy policy and support)
- **Future:** Migrate to Google Workspace with a dedicated domain (e.g. `privacy@wicbenefits.app`)

## Testing & Deployment

- **All testing is done on the production VPS** — no local backend testing
- Deploy: `./scripts/deploy-backend.sh` (rsyncs backend + docker-compose.yml, rebuilds container)
- Seed data: `ssh tatertot.work 'cd ~/projects/wic-app && docker compose exec -T backend npm run seed-all'`

## VPS (tatertot.work)

- SSH user: `mmichael`, files owned by `dmichael` (sudo needed for some ops)
- No npm on VPS — all commands via Docker: `docker compose exec -T backend npm run ...`
- Docker services: `backend`, `postgres` (db user: `wic_admin`)
- Web root: `/data/docker/www/mdmichael.com/www/wic/`
- Env vars: `GITHUB_TOKEN` + `GITHUB_FEEDBACK_REPO` configured for feedback→GitHub Issues

## Known Issues

| Issue | Notes |
|-------|-------|
| UPC leading zeros | Backend tries multiple variants (with/without leading zeros) |
| City names empty in zip_codes table | Census ZCTA data lacks city names; state detection works fine |
| nginx extensionless URLs | Must use `.html` extension in links (no try_files config) |
| No authentication system | Using demo household (ID=1); needed pre-launch |
| Java 17 required for Android builds | `export JAVA_HOME=/usr/local/opt/openjdk@17` |

## Key Files

| File | Purpose |
|------|---------|
| `ROADMAP.md` | Single source of truth for status/priorities |
| `.claude/SESSION_STATE.md` | Current work state for session handoffs |
| `.claude/DECISIONS.md` | Why things were built a certain way |
| `.claude/MEMORY.md` | This file — persistent context |
| `app/lib/services/locationService.ts` | Centralized GPS + zip location |
| `app/lib/services/api.ts` | All backend API calls |
| `app/lib/i18n/translations/en.json` | English translations |
| `app/lib/i18n/translations/es.json` | Spanish translations |
| `backend/src/index.ts` | Express app entry point + route registration |

## GitHub
Repository: https://github.com/MrMosesMichael/wic-benefits-app

## Session Workflow
1. Start fresh Claude Code session
2. Read `ROADMAP.md` for status, `SESSION_STATE.md` for current work
3. Check `.claude/DECISIONS.md` before re-investigating past decisions
4. When session ends: update `SESSION_STATE.md`, commit work, note next steps
