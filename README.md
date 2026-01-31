# WIC Benefits Assistant

A mobile app helping WIC participants scan products, track benefits, and find formula.

**Production:** https://mdmichael.com/wic/  
**Status:** MVP complete, expanding features  
**Platform:** Android (iOS coming)

---

## The Problem

WIC participants face daily friction:
- Not knowing if a product is covered until checkout rejection
- Finding eligible products that are actually in stock
- Tracking benefits across multiple family members
- Finding formula during shortages

## The Solution

**Scan. Shop. Smile.**

- 📱 **Scan any product** — Instant WIC eligibility check
- 📊 **Track benefits** — See what's available, in cart, or used
- 🏪 **Find what's in stock** — Crowdsourced store inventory
- 🍼 **Find formula fast** — Shortage alerts + cross-store search

---

## Current Features

✅ Barcode scanner (UPC-A, UPC-E, EAN-13)  
✅ Michigan APL (9,940 products)  
✅ Benefits tracking (three-state: available → in cart → consumed)  
✅ Shopping cart with multi-participant support  
✅ Store detection (GPS + WiFi + manual)  
✅ Crowdsourced inventory reporting  
✅ Formula shortage detection with severity/trend  
✅ Manual benefits entry (offline-capable)  

---

## Quick Start

### Run Backend Locally
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### Run Mobile App (Expo)
```bash
cd app
npm install
npx expo start
```

### Build Android APK
```bash
export JAVA_HOME=/usr/local/opt/openjdk@17
cd app
./android/gradlew -p android assembleRelease
# APK at: android/app/build/outputs/apk/release/app-release.apk
```

---

## Project Structure

```
wic_project/
├── app/                    # React Native + Expo mobile app
├── backend/                # Node.js/Express API
├── deployment/             # Docker, landing page
├── docs/                   # Feature guides
│   └── archive/            # Old implementation summaries
├── ROADMAP.md              # What's done, what's next
├── CHANGELOG.md            # Session-by-session progress
├── ARCHITECTURE.md         # Technical design
└── CLAUDE.md               # AI assistant instructions
```

---

## Documentation

| File | Purpose |
|------|---------|
| [ROADMAP.md](./ROADMAP.md) | **Start here** — status, priorities, what to build next |
| [CHANGELOG.md](./CHANGELOG.md) | Session-by-session progress log |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical architecture (store detection focus) |
| [CLAUDE.md](./CLAUDE.md) | Instructions for AI-assisted development |

---

## Tech Stack

- **Mobile:** React Native + Expo SDK 52
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL
- **Hosting:** Docker + Traefik on private VPS

---

## Priority States

1. Michigan ✅ (working)
2. North Carolina (planned)
3. Florida (planned)
4. Oregon (planned)

---

## Contributing

This project is in active development. See [ROADMAP.md](./ROADMAP.md) for current priorities.

---

## License

TBD — Considering 501(c)(3) or user cooperative model.

---

*Built with care for WIC families.*
