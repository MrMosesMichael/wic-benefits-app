# Android Deployment Guide - WIC Benefits App

**Last Updated**: 2026-01-22
**Branch**: `pre-prod-local-testing`
**Build Type**: Development/Testing APK

## 🎯 Deployment Overview

This guide covers building and deploying the Android app for testing.

### What You're Deploying
- **App**: React Native WIC Benefits scanner
- **Features**: Scanner, manual benefits entry, shopping cart
- **Data**: JSON UPC product database (bundled in app)
- **Backend**: API endpoints (if configured)

---

## 📋 Prerequisites

### 1. Development Environment

**Required Software**:
```bash
# Node.js (check version)
node --version  # Should be 18.x or higher

# Expo CLI
npm install -g expo-cli
expo --version

# EAS CLI (for building)
npm install -g eas-cli
eas --version
```

### 2. Expo/EAS Account

If you don't have one:
```bash
# Create account
eas login  # or sign up at expo.dev

# Check login status
eas whoami
```

### 3. Android Development Tools (Optional but Recommended)

**For local builds**:
- Android Studio
- Android SDK Platform Tools
- Java JDK 11 or higher

**For cloud builds** (EAS):
- No Android tools needed
- Builds happen on Expo servers

---

## 🚀 Deployment Method 1: EAS Build (Recommended)

**Easiest method** - Builds in the cloud, no Android setup needed.

### Step 1: Navigate to App Directory

```bash
cd /Users/moses/projects/wic_project/app
```

### Step 2: Verify Configuration

Check `eas.json` exists:
```bash
cat eas.json
```

Should show build profiles (development, preview, production).

### Step 3: Configure App for Build

Check `app.json` or `app.config.js`:
```bash
# Check current version
cat app.json | grep version

# Increment version if needed (optional)
# Edit app.json: "version": "1.0.1" or whatever is next
```

### Step 4: Install Dependencies

```bash
# Install all packages
npm install

# or
yarn install
```

### Step 5: Build APK for Testing

**Development Build** (internal testing):
```bash
eas build --platform android --profile development
```

**Preview Build** (testing with users):
```bash
eas build --platform android --profile preview
```

**What happens**:
- Code uploaded to EAS servers
- Android app built in cloud
- APK/AAB generated
- Download link provided

### Step 6: Monitor Build

You'll see:
```
✔ Build started!
🔗 Build details: https://expo.dev/builds/[build-id]
```

**Build time**: 10-20 minutes typically

**Track progress**:
- Click the URL to see build logs
- Or run: `eas build:list`

### Step 7: Download APK

When build completes:
```bash
# List recent builds
eas build:list

# Download APK
# Get download URL from build page or:
# Build page shows "Download" button → Right-click → Copy Link
```

Or visit: https://expo.dev/accounts/[your-account]/projects/wic-benefits-app/builds

### Step 8: Install on Android Device

**Method A: Direct Install**
1. Download APK to your Android phone
2. Open file
3. Tap "Install" (may need to allow installation from unknown sources)

**Method B: Transfer from Computer**
```bash
# If phone is connected via USB
adb install path/to/app.apk

# Check if device connected
adb devices
```

**Method C: Share Download Link**
- Share the EAS build URL with testers
- They download and install directly

---

## 🚀 Deployment Method 2: Local Build with Expo

**For quick iterations without waiting for cloud builds.**

### Prerequisites
- Android Studio installed
- Android SDK configured
- Physical Android device or emulator

### Step 1: Start Development Server

```bash
cd /Users/moses/projects/wic_project/app

# Start Expo dev server
npm start
# or
expo start
```

### Step 2: Connect Device

**Physical Device**:
1. Enable Developer Options on Android
2. Enable USB Debugging
3. Connect via USB
4. Run: `adb devices` to verify connection

**Emulator**:
1. Open Android Studio
2. Start AVD (Android Virtual Device)
3. Run: `adb devices` to verify

### Step 3: Build to Device

```bash
# With Expo dev server running, press:
# 'a' - Run on Android device/emulator
```

Or:
```bash
# Direct run
npx expo run:android
```

**What happens**:
- App builds locally
- Installs on connected device
- Opens automatically

### Step 4: Create Local APK

```bash
# Generate APK file
cd android
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## 📦 Bundling JSON UPC Data

**Important**: Ensure UPC data is included in the build.

### Verify Data Files

```bash
cd /Users/moses/projects/wic_project/app

# Check if UPC data exists
ls -lh app/lib/data/apl-michigan-upcs.json
ls -lh app/lib/data/products.json

# Check file sizes
du -h app/lib/data/*.json
```

**Expected files**:
- `apl-michigan-upcs.json` - WIC approved products for Michigan
- `products.json` - Product details (names, brands, images)
- Any other state APL files

### If Data Files Missing

```bash
# Copy from backend or data source
cp ../backend/data/apl-michigan-upcs.json app/lib/data/

# Or download from repository
# (if stored separately)
```

### Verify Data Loads in App

Check `offlineEligibility.ts` or similar:
```typescript
// Should have import like:
import aplData from '../data/apl-michigan-upcs.json';
import productsData from '../data/products.json';
```

---

## 🔧 Build Configuration

### Update App Version

**Edit `app.json`**:
```json
{
  "expo": {
    "version": "1.0.1",  // Increment this
    "android": {
      "versionCode": 2,  // Increment this (must be higher than previous)
      "package": "com.wicbenefits.app"
    }
  }
}
```

**Version numbering**:
- `version`: User-facing (1.0.0, 1.0.1, etc.)
- `versionCode`: Internal integer (1, 2, 3, etc.) - must increment

### Configure Build Profile

**Edit `eas.json`**:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"  // APK for easy testing
      }
    },
    "production": {
      "android": {
        "buildType": "aab"  // AAB for Play Store
      }
    }
  }
}
```

**Build types**:
- **APK**: Easy to share and install directly
- **AAB**: Required for Google Play Store (smaller download)

---

## 🐛 Troubleshooting

### Build Fails with "Dependencies Error"

```bash
# Clear cache and reinstall
cd app
rm -rf node_modules
rm package-lock.json
npm install

# Or with yarn
rm -rf node_modules yarn.lock
yarn install
```

### EAS Build Fails

**Check build logs**:
1. Go to build URL
2. Click "View logs"
3. Look for specific error

**Common issues**:
- Missing environment variables
- Incompatible package versions
- Exceeded build quota (free tier limits)

**Solutions**:
```bash
# Check EAS quota
eas build:list

# Upgrade plan if needed
# Visit: https://expo.dev/pricing
```

### APK Won't Install on Device

**Error: "App not installed"**

**Causes**:
1. Package name conflict (old version installed)
2. Signature mismatch
3. Insufficient storage

**Solutions**:
```bash
# Uninstall old version first
adb uninstall com.wicbenefits.app

# Then reinstall
adb install path/to/app.apk
```

### "Unknown Sources" Warning

**On Android device**:
1. Go to Settings → Security
2. Enable "Unknown Sources" or "Install from Unknown Sources"
3. Or specifically allow installation from Files app

### Scanner Camera Not Working

**After install**:
1. Open app
2. Grant camera permission when prompted
3. If denied, go to: Settings → Apps → WIC Benefits → Permissions → Enable Camera

**In code** (already handled):
- `expo-camera` package should request permissions
- Check `app.json` has camera permission configured

---

## 📱 Sharing APK with Testers

### Method 1: Direct File Share

```bash
# Get APK from EAS build
# Download from: https://expo.dev/builds/[build-id]

# Share via:
- Google Drive
- Dropbox
- Email (if < 25MB)
- AirDrop (if on Mac)
```

### Method 2: QR Code (EAS Only)

After EAS build:
1. Go to build page
2. Click "Install" button
3. Show QR code to testers
4. They scan with phone camera
5. Download and install

### Method 3: TestFlight Alternative (Android)

Use **Firebase App Distribution** or **Google Play Internal Testing**:

**Firebase**:
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Upload APK
firebase appdistribution:distribute app-release.apk \
  --app YOUR_APP_ID \
  --groups testers
```

---

## 🚢 Deployment Checklist

### Pre-Build
- [ ] Code committed to git
- [ ] Version number incremented
- [ ] Version code incremented (Android)
- [ ] JSON UPC data files present
- [ ] Dependencies installed (`npm install`)
- [ ] No build errors locally (`npm run build` if available)

### During Build
- [ ] Choose correct profile (development/preview/production)
- [ ] Build starts successfully
- [ ] Monitor build logs for errors
- [ ] Build completes successfully

### Post-Build
- [ ] Download APK
- [ ] Test install on own device first
- [ ] Verify app opens
- [ ] Test critical features (scanner, benefits)
- [ ] Share with testers
- [ ] Provide installation instructions

### Testing Phase
- [ ] Follow testing plan (see TESTING_PLAN_v2.md)
- [ ] Collect bug reports
- [ ] Document issues
- [ ] Plan fixes for next build

---

## 🔄 Iterative Deployment Workflow

**Typical cycle**:

1. **Develop** → Make code changes
2. **Build** → `eas build --platform android --profile preview`
3. **Test** → Install and test on device
4. **Fix** → Address bugs found
5. **Repeat** → Build again with fixes

**For rapid iteration**:
- Use local builds (`expo run:android`)
- Test on emulator or connected device
- When stable, do EAS build for distribution

---

## 📊 Build Types Comparison

| Build Type | Use Case | Distribution | Time | Requirements |
|------------|----------|--------------|------|--------------|
| **Development** | Active dev | Internal | 10-15 min | EAS account |
| **Preview** | Testing | Internal | 10-15 min | EAS account |
| **Production** | Release | Play Store | 15-20 min | EAS + Store setup |
| **Local** | Quick test | Self only | 5-10 min | Android SDK |

---

## 🎯 Quick Start Commands

```bash
# Standard testing build
cd app
eas build --platform android --profile preview

# Check build status
eas build:list

# Local development
cd app
npm start
# Press 'a' for Android

# Create local APK
cd app/android
./gradlew assembleRelease
```

---

## 📞 Support Resources

**Expo Documentation**:
- Build docs: https://docs.expo.dev/build/setup/
- EAS Build: https://docs.expo.dev/eas/

**Common Commands**:
```bash
# EAS help
eas build --help

# Check account
eas whoami

# View build queue
eas build:list

# Cancel build
eas build:cancel

# View project config
eas config

# Android debugging
adb logcat | grep -i wic  # View app logs
adb shell pm list packages | grep wic  # Check if installed
```

**Need Help?**
- Check Expo forums: https://forums.expo.dev
- Check build logs first (most errors show there)
- Search error messages on Stack Overflow

---

**Ready to Deploy!** 🚀

Start with EAS preview build for easiest path to testing APK.
