# Brief: B - App Shell & Backend

## B1: Frontend Setup
React Native + Expo + TypeScript

### Structure
```
src/
├── app/                 # Expo Router pages
├── components/          # Shared UI components
├── features/           # Feature modules
│   ├── benefits/
│   ├── scanner/
│   └── stores/
├── services/           # API clients, storage
├── hooks/              # Custom hooks
├── types/              # TypeScript types
└── utils/              # Helpers
```

### Key Dependencies
- expo, expo-router
- @tanstack/react-query (data fetching)
- zustand (state management)
- expo-camera, expo-barcode-scanner

## B2: Backend Setup
Node.js + Express + PostgreSQL

### API Structure
```
src/api/
├── routes/
├── controllers/
├── middleware/
├── services/
└── models/
```

### Database
- PostgreSQL with PostGIS for geo queries
- Redis for caching
- Use connection pooling

### Auth
- JWT tokens
- Refresh token rotation
- No PII storage (privacy-first)

## B3: Data Sovereignty
- All data stored in US
- HIPAA-aware (no health data storage)
- User can delete all data
- Minimal data collection

## Relevant Specs
Only if needed: specs/wic-benefits-app/specs/data-sovereignty/spec.md
