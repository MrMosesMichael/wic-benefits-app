# WIC Benefits App - Michigan MVP

React Native app built with Expo for WIC participants in Michigan.

## Quick Start

```bash
npm start         # Start Expo dev server
npm run ios       # Run on iOS simulator
npm run android   # Run on Android emulator
```

## Project Structure

```
app/
├── app/                    # Expo Router pages
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Home screen
│   ├── scanner/           # Scanner flow
│   └── benefits/          # Benefits viewing
├── components/            # Reusable components
├── lib/
│   ├── services/         # API clients, business logic
│   ├── types/            # TypeScript definitions
│   └── utils/            # Helper functions
└── assets/               # Images, fonts, icons
```

## MVP Features (v0.1)

- ✅ Home screen with navigation
- ✅ Benefits overview (mock data)
- 🔄 Barcode scanner (coming soon)
- 🔄 Michigan APL eligibility lookup (coming soon)

## Tech Stack

- React Native 0.81.5
- Expo SDK 54
- expo-router (file-based navigation)
- react-native-vision-camera (barcode scanning)
- TypeScript 5.9

## Backend API

Backend runs separately. See `/backend` directory for setup.

Default API endpoint: `http://localhost:3000`

## Testing

Test on real device for camera functionality:
1. Install Expo Go on your phone
2. Scan QR code from `npm start`
3. Test barcode scanning features
