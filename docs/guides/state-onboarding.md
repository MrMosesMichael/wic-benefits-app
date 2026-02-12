# State Onboarding Checklist

> How to add a new state to the WIC Benefits App.

---

## Overview

Onboarding a state has two independent tracks: **product eligibility** (what's WIC-approved) and **store/inventory coverage** (where to buy it). These can be done in any order.

---

## Track A: Product Eligibility (APL)

The Approved Product List determines what items a user can buy with WIC in that state.

- [ ] **Find the state's APL source** — state WIC agency website, usually a downloadable file or searchable database
- [ ] **Identify format** — Excel (.xlsx), CSV, PDF, or HTML scraping
- [ ] **Add scraper config** to `APLSyncService.ts` — parse logic for the state's format
- [ ] **Add sync config** to migration (see `019_apl_sync_monitoring.sql` pattern) — URL, format, cron schedule, expected product count
- [ ] **Run initial sync** — `docker compose exec -T backend npm run apl-sync -- --state XX --force`
- [ ] **Verify product count** — `SELECT state, COUNT(*) FROM approved_products GROUP BY state`

### Current APL Status

| State | Products | Source | Format | Schedule |
|-------|----------|--------|--------|----------|
| MI | 9,940 | michigan.gov/mdhhs | Excel | 6am UTC |
| NC | 16,949 | ncdhhs.gov | HTML scrape | 7am UTC |
| NY | 21,125 | nyswicvendors.com | HTML scrape | 10am UTC |
| OR | 14,013 | oregon.gov/oha | Excel | 9am UTC |
| FL | Shelved | floridahealth.gov | PDF | — (state has own app) |

---

## Track B: Store Locations

Users need to know which stores are nearby and WIC-authorized.

### B1: Kroger-Family Stores (API-Powered)

Only applicable in states where Kroger operates:

| Banner | States |
|--------|--------|
| Kroger | MI, NC |
| Harris Teeter | NC |
| Fred Meyer | OR |
| QFC | OR |

- [ ] **Add state zips** to `sync-kroger-stores.ts` `STATE_ZIPS` config
- [ ] **Run seed** — `npm run sync-kroger-stores -- --state XX`
- [ ] **Verify** — `SELECT chain, COUNT(*) FROM stores WHERE state = 'XX' AND store_id LIKE 'kroger-%' GROUP BY chain`

Dynamic discovery also backfills gaps automatically when users search from unseen zip codes.

**Not applicable for:** NY (no Kroger-family presence)

### B2: Non-Kroger Stores (Static Seed)

For chains without public APIs, seed manually with known WIC-authorized locations.

- [ ] **Identify major WIC retailers** for the state (Walmart, Target, regional chains)
- [ ] **Create seed script** — `backend/src/scripts/seed-{state}-stores.ts` following `seed-michigan-stores.ts` pattern
- [ ] **Add npm script** to `package.json` — `"seed-{state}-stores": "node dist/scripts/seed-{state}-stores.js"`
- [ ] **Run seed** — `npm run seed-{state}-stores`
- [ ] **Verify coverage** — check major metro areas have store data

### Major Retailers by State

| State | Key Chains |
|-------|-----------|
| MI | Walmart, Meijer, Kroger, Target, CVS, Walgreens |
| NC | Walmart, Food Lion, Kroger, Harris Teeter, Target, ALDI, Publix |
| OR | Walmart, Fred Meyer, Safeway, WinCo, Target, Albertsons |
| NY | ShopRite, Wegmans, Stop & Shop, Price Chopper, Walmart, Target, ALDI |

---

## Track C: Inventory / Availability Data

Once stores exist, inventory data can come from multiple sources:

| Source | Coverage | Freshness | Setup |
|--------|----------|-----------|-------|
| **Kroger API** | Kroger-family stores | Real-time (30-min cache) | Automatic via cross-store search |
| **Crowdsourced** | Any store | User-reported | Built-in, no setup needed |
| **Batch sync** | Kroger-family stores | Daily | `npm run sync-kroger-inventory` |

- [ ] **Kroger inventory** — automatic for any Kroger-family stores in the DB
- [ ] **Crowdsourced** — works out of the box once stores are seeded
- [ ] **Future APIs** — add integration service per `WalmartInventoryIntegration.ts` pattern

---

## Quick-Add Checklist (Copy for New State)

```
## State: [XX]

### APL
- [ ] APL source identified: [URL]
- [ ] Scraper config added to APLSyncService.ts
- [ ] Sync config added to migration
- [ ] Initial sync run and verified

### Stores
- [ ] Kroger-family stores seeded (if applicable)
- [ ] Non-Kroger store seed script created
- [ ] Seed run on VPS
- [ ] Metro area coverage verified

### Inventory
- [ ] Kroger API enrichment confirmed (if applicable)
- [ ] Crowdsourced sightings flowing
```

---

## VPS Commands Reference

```bash
# APL sync
docker compose exec -T backend npm run apl-sync -- --state XX --force

# Kroger store sync
docker compose exec -T backend npm run sync-kroger-stores -- --state XX

# Non-Kroger store seed
docker compose exec -T backend npm run seed-XX-stores

# Verify store counts
docker compose exec -T backend node -e "
  const pool = require('./dist/config/database').default;
  pool.query(\"SELECT state, chain, COUNT(*) as count FROM stores WHERE state = 'XX' GROUP BY state, chain ORDER BY count DESC\")
    .then(r => { console.table(r.rows); process.exit(0); });
"
```

---

*Last Updated: February 2026*
