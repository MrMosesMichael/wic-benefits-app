# Phase 1 MVP Plan - Michigan Vertical Slice

> Created: 2026-01-16 21:20
> Strategy: Build one complete end-to-end user flow first, then iterate

## Goal

**Deploy a minimal but functional app that lets Michigan WIC users:**
1. Scan a product barcode
2. See if it's WIC-eligible
3. Track their benefits

**NOT in this slice:**
- Shopping cart
- Multiple states
- Spanish language
- Formula tracking
- Store detection
- Advanced features

## Why Vertical Slice?

- **Fastest path to real user feedback**
- **Validates core value proposition** (scanner + eligibility)
- **Tests technical architecture** end-to-end
- **Reduces risk** before building horizontally

## Why Michigan First?

- FIS processor (simpler than Conduent)
- Good APL data availability
- Large WIC population
- Representative of many states

---

## The Slice: 12 Critical Tasks

### 1. Project Setup (B1 subset)
- [ ] Initialize React Native with Expo
- [ ] Configure TypeScript
- [ ] Set up project structure (features-based)
- [ ] Configure development environment

### 2. Minimal Backend (B2 subset)
- [ ] Node.js/Express API server
- [ ] PostgreSQL database (local dev + hosted)
- [ ] Basic API structure (no auth yet)
- [ ] Deployment config (Railway/Render/Fly.io)

### 3. Michigan APL Data (A1 subset)
- [ ] Research Michigan APL source (FIS/state website)
- [ ] Design APL schema (upc, product_name, category, eligible, restrictions)
- [ ] Build Michigan APL ingestion script
- [ ] Seed database with Michigan APL

### 4. Product Database (A2 minimal)
- [ ] Use Open Food Facts API for product details
- [ ] Build UPC lookup API endpoint
- [ ] Handle unknown UPCs gracefully

### 5. Benefits Model (C1 minimal)
- [ ] Simple household schema (one household per user)
- [ ] Participant types (pregnant, infant, child)
- [ ] Benefit categories (milk, eggs, cereal, etc.)
- [ ] Hardcoded benefit amounts for MVP (manual entry later)

### 6. Benefits UI (C2 minimal)
- [ ] Single-screen benefits overview
- [ ] Show benefit categories with quantities
- [ ] Simple, clean design (no three-state yet)

### 7. Barcode Scanner (D1)
- [ ] Integrate react-native-vision-camera
- [ ] Detect UPC-A barcodes
- [ ] Manual entry fallback
- [ ] Haptic feedback on scan

### 8. Eligibility Lookup (D2)
- [ ] Query Michigan APL by UPC
- [ ] Return eligible/not eligible/unknown
- [ ] Show product name and reason

### 9. Scan Result UI (D2/D3 subset)
- [ ] Clean scan result screen
- [ ] Green = eligible, Red = not eligible, Gray = unknown
- [ ] Show product details
- [ ] "Scan another" button

### 10. Testing
- [ ] Test with 20+ real Michigan WIC products
- [ ] Test barcode scanning in various lighting
- [ ] Test unknown UPC handling
- [ ] Test benefits display

### 11. Polish
- [ ] App icon and splash screen
- [ ] Basic error handling
- [ ] Loading states
- [ ] Offline handling (basic)

### 12. Deploy
- [ ] Deploy backend to hosting provider
- [ ] Build iOS TestFlight beta
- [ ] Build Android internal test
- [ ] Document test instructions

---

## Success Criteria

**This MVP is successful if:**
1. A Michigan WIC user can scan a product and know if it's WIC-eligible
2. The app works 95%+ of the time for common WIC items
3. The user can see their benefit categories and amounts
4. The app feels fast and responsive

**Then we iterate:**
- Add shopping cart (Phase 1 Group E)
- Add formula tracking (Phase 1 Group A4)
- Add Spanish (Phase 1 Group G)
- Add more states (NC, FL, OR)

---

## Tech Stack (Minimal)

**Frontend:**
- React Native 0.76+
- Expo SDK 52+
- TypeScript
- react-native-vision-camera
- expo-router (file-based routing)

**Backend:**
- Node.js 20+
- Express
- PostgreSQL 16+
- TypeScript

**Hosting:**
- Backend: Railway/Render/Fly.io
- Database: Railway/Supabase
- Frontend: Expo EAS (TestFlight + Google Play Internal)

---

## Estimated Complexity

- **Small tasks**: 1-3 (project setup, config)
- **Medium tasks**: 4-9 (core functionality)
- **Large task**: 10 (testing requires real data)
- **Total**: ~12 focused tasks for vertical slice

**Timeline estimate**: Deliberately omitted (per guidelines)

---

## Next Steps

1. Start with B1: Initialize React Native/Expo project
2. Get basic app shell running
3. Build backend in parallel
4. Connect scanner → API → database → UI
5. Test with real Michigan products
6. Deploy for beta testing

---

## Notes

- **No over-engineering**: Build exactly what's needed for this flow
- **Hardcode where appropriate**: Michigan-only, no multi-state logic yet
- **Manual data where needed**: Benefits amounts can be hardcoded
- **Focus on core loop**: Scan → Check → Know

This is a **proof of concept** that validates the core value before scaling.
