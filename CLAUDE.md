# CLAUDE.md

## Project Overview

WIC Benefits Assistant - Mobile app helping WIC participants scan products, track benefits, and shop smarter.

## Key Specs Location

All specifications are in `openspec/changes/wic-benefits-app/specs/`:
- `upc-scanner/` - Barcode scanning, eligibility lookup, scan modes
- `benefits/` - Household management, three-state tracking (Available/In Cart/Consumed)
- `shopping-cart/` - Cart management, checkout flow, benefit queue
- `store-detection/` - GPS/WiFi store detection
- `inventory/` - Real-time stock, formula tracking
- `product-catalog/` - Category browsing, filtering
- `store-finder/` - Nearby stores, food banks, formula finder
- `help-faq/` - WIC rules FAQ, contextual help

## Priority States

Michigan, North Carolina, Florida, Oregon (different eWIC processors for testing)

## Core Concepts

1. **Three-state benefits**: Available (green) → In Cart (amber) → Consumed (gray)
2. **Hybrid household view**: Unified view of all participants with filter chips
3. **Scan modes**: "Check Eligibility" (default) vs "Shopping Mode"
4. **Explicit cart confirmation**: Scanning ≠ adding to cart

## Commands

```bash
openspec list                    # View changes
openspec show wic-benefits-app   # View full proposal
```
