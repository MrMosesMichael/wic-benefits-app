# Implementation Guides

> Consolidated implementation patterns extracted from archive documentation.

---

## Available Guides

| Guide | Description | Archive Sources |
|-------|-------------|-----------------|
| [Store Detection](./store-detection.md) | GPS + WiFi + geofence detection | H3, H4, H5 task docs |
| [Formula Features](./formula-features.md) | Shortage detection, alerts, alternatives | Phase 1 formula week 1-2 |
| [Crowdsourced Inventory](./crowdsourced-inventory.md) | Community sighting reports | Phase 2 revised plan |

---

## Archive Reference

For comprehensive historical documentation, see `docs/archive/` which contains 72 files covering:

- **Task completion reports** (H1-H5, I1, etc.)
- **Phase planning documents** (Phase 1-2 plans, revisions)
- **Project status reports** with gap analysis
- **Detailed test plans** (28KB+ for store detection)
- **Implementation summaries** with SQL schemas and API specs

---

## Using These Guides

**When building new features:**
1. Check if a guide exists here first
2. Reference archive for detailed specs if needed
3. Follow patterns established in guides

**When debugging:**
1. Check guide for architecture overview
2. Reference archive for edge cases and known issues
3. See `TEST_STRATEGY.md` for testing patterns

---

## Contributing

When implementing a significant feature:
1. Create or update the relevant guide
2. Link to archive references
3. Document key decisions in `.claude/DECISIONS.md`
4. Add test patterns to `TEST_STRATEGY.md`

---

*Last Updated: February 2026*
