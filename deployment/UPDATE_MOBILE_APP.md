# Update Mobile App for Production

This guide shows how to update your mobile app to use the production backend API.

---

## What Changed

**File**: `app/lib/services/api.ts` (line 26-28)

**Before**:
```typescript
const API_BASE_URL = __DEV__
  ? 'http://192.168.12.94:3000/api/v1'
  : 'https://api.wicbenefits.app/api/v1'; // TODO: Replace with production URL
```

**After**:
```typescript
const API_BASE_URL = __DEV__
  ? 'http://192.168.12.94:3000/api/v1'
  : 'https://mdmichael.com/wic/api/v1';
```

---

## How It Works

- **Development Mode** (`__DEV__ = true`):
  - Uses local IP: `http://192.168.12.94:3000/api/v1`
  - When running `npm start` or `expo start`
  - Connects to backend running on your local machine

- **Production Mode** (`__DEV__ = false`):
  - Uses production URL: `https://mdmichael.com/wic/api/v1`
  - When building release APK or app store builds
  - Connects to backend deployed on your VPS

---

## Toggle OFFLINE_MODE

**File**: `app/lib/services/api.ts` (line 23)

Currently set to `true` for field testing:
```typescript
export const OFFLINE_MODE = true;
```

### When to use OFFLINE_MODE

**`OFFLINE_MODE = true`** (Current setting):
- App works without internet connection
- Uses bundled Michigan APL data (9,940 products)
- Benefits loaded from local AsyncStorage
- No backend API calls made
- Good for: Field testing, areas with poor connectivity

**`OFFLINE_MODE = false`** (Production mode):
- App requires internet connection
- All data fetched from backend API
- Live benefits data from database
- Real-time formula availability
- Good for: Full-featured experience with backend

### To Enable Production Mode

Change line 23:
```typescript
export const OFFLINE_MODE = false;
```

---

## Build Production APK

Once backend is deployed and tested, build a production APK:

```bash
cd app

# Set JAVA_HOME for Android builds
export JAVA_HOME=/usr/local/opt/openjdk@17

# Build release APK
./android/gradlew -p android assembleRelease

# Install on device
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

The release build automatically uses production mode (`__DEV__ = false`), so it will connect to:
- **Production API**: `https://mdmichael.com/wic/api/v1`

---

## Testing Production API

Before building the production APK, test the connection:

### 1. Test API directly (from terminal)
```bash
curl https://mdmichael.com/wic/health
# Expected: {"status":"healthy","database":"connected"}

curl https://mdmichael.com/wic/api/v1/stores
# Expected: JSON response with stores
```

### 2. Test from app in dev mode

Temporarily change the dev URL to production:
```typescript
const API_BASE_URL = __DEV__
  ? 'https://mdmichael.com/wic/api/v1'  // Point dev to production
  : 'https://mdmichael.com/wic/api/v1';
```

Then:
```bash
# Disable offline mode
# In api.ts line 23: export const OFFLINE_MODE = false;

# Run dev build
npm start
```

If it works in dev mode, it will work in production mode.

### 3. Revert changes before building production
```typescript
// Restore normal config
const API_BASE_URL = __DEV__
  ? 'http://192.168.12.94:3000/api/v1'  // Local dev
  : 'https://mdmichael.com/wic/api/v1';  // Production

export const OFFLINE_MODE = false;  // Or true for offline field testing
```

---

## Deployment Checklist

Before building production APK:

- [ ] Backend deployed to VPS (`docker compose up -d`)
- [ ] nginx reverse proxy configured
- [ ] Database migrations run
- [ ] Michigan APL data imported
- [ ] API health check passes: `curl https://mdmichael.com/wic/health`
- [ ] CORS allows `mdmichael.com` (check `backend/.env`)
- [ ] SSL certificate valid for `mdmichael.com`
- [ ] API endpoints tested (stores, benefits, formula)
- [ ] `OFFLINE_MODE` set to desired value
- [ ] Built release APK with production URL
- [ ] Tested APK on real device

---

## Switching Between Modes

### Quick Toggle: OFFLINE_MODE

**For Field Testing (No Backend Needed)**:
```typescript
export const OFFLINE_MODE = true;
```
Rebuild: `./android/gradlew -p android assembleRelease`

**For Full Backend Features**:
```typescript
export const OFFLINE_MODE = false;
```
Rebuild: `./android/gradlew -p android assembleRelease`

You can ship two different APKs:
- `wic-offline.apk` - OFFLINE_MODE = true (for rural areas, poor connectivity)
- `wic-online.apk` - OFFLINE_MODE = false (for full features)

---

## Troubleshooting

### App can't connect to API

**Symptoms**: Network errors, "Failed to load benefits", etc.

**Check**:
1. Is backend running? `docker compose ps`
2. Is health endpoint working? `curl https://mdmichael.com/wic/health`
3. Is nginx configured? Check `/etc/nginx/sites-enabled/`
4. CORS error? Check `backend/.env` CORS_ORIGIN setting
5. SSL error? Check certificate: `curl -v https://mdmichael.com/wic/health`

### OFFLINE_MODE not working

**Symptoms**: App tries to hit API even with OFFLINE_MODE = true

**Fix**:
- Make sure you rebuilt the APK after changing OFFLINE_MODE
- Old APK still has old settings

### Production URL not working in release build

**Symptoms**: Dev mode works, release mode doesn't

**Check**:
- Did you use `assembleRelease` (not `assembleDebug`)?
- Debug builds may have different network permissions
- Check `android/app/src/main/AndroidManifest.xml` for network permissions

---

## Next Steps

1. ✅ Backend deployed to VPS
2. ✅ API URL updated in app (`api.ts`)
3. 🔄 Test API endpoints from terminal
4. 🔄 Build production APK
5. 🔄 Test APK on device with `OFFLINE_MODE = false`
6. 🔄 Field test to verify production API connectivity
