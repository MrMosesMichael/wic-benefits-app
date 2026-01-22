# Gradle Build Fix Guide

## Error: Plugin Resolution Failed

**Error message**:
```
Error resolving plugin [id: 'com.facebook.react.settings']
> 25.0.1
```

## Root Cause

This happens because:
1. React Native Gradle plugin version mismatch
2. Outdated `android/` directory
3. Gradle cache issues
4. Direct Gradle usage instead of Expo's wrapper

## Solutions (Try in Order)

### ✅ Solution 1: Use Expo's Build Command (EASIEST)

**Don't use Gradle directly.** Use Expo's wrapper:

```bash
cd /Users/moses/projects/wic_project/app

# Connect Android device or start emulator
adb devices

# Build and run (Expo handles Gradle)
npx expo run:android
```

**Why this works**:
- Expo manages React Native plugin versions
- Automatically resolves dependencies
- Builds and installs in one command

**This is the recommended way for Expo projects!**

---

### ✅ Solution 2: Regenerate Android Directory

If you need the standalone APK file:

```bash
cd /Users/moses/projects/wic_project/app

# Backup any custom android changes (if you made any)
# Most likely you haven't, so skip this

# Remove old android directory
rm -rf android

# Regenerate with current dependencies
npx expo prebuild --platform android --clean

# Now you can use Gradle
cd android
./gradlew assembleDebug

# APK location:
# app/build/outputs/apk/debug/app-debug.apk
```

**Why this works**:
- Regenerates android folder with correct plugin versions
- Matches your current Expo SDK version
- Fresh start without cache issues

---

### ✅ Solution 3: Clear Caches

```bash
cd /Users/moses/projects/wic_project/app

# Clear Gradle caches
cd android
./gradlew clean
./gradlew --stop

# Clear npm cache
cd ..
rm -rf node_modules
npm install

# Try build again
npx expo run:android
```

---

### ✅ Solution 4: Update build.gradle Settings (Manual Fix)

If you still want to use Gradle directly:

**Edit `android/settings.gradle`**:

Find this section:
```gradle
pluginManagement {
    // ...
}
```

Make sure it includes:
```gradle
pluginManagement {
    repositories {
        gradlePluginPortal()
        google()
        mavenCentral()
    }
}
```

Then:
```bash
cd android
./gradlew assembleDebug --refresh-dependencies
```

---

## Updated Build Workflow

### Development (Daily Work)

**Option A: Expo Go** (No build needed)
```bash
npx expo start
# Scan QR code with Expo Go app
```

**Option B: Development Build** (Builds once, fast reload)
```bash
npx expo run:android
# Hot reload enabled
```

### Testing (Create APK for sharing)

```bash
# Method 1: Let Expo handle it
npx expo run:android --variant release

# Method 2: If you regenerated android/
cd /Users/moses/projects/wic_project/app
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease

# APK: app/build/outputs/apk/release/app-release.apk
```

---

## Why This Happens with Expo

Expo projects use a **managed workflow** where:
- Native code is abstracted away
- `android/` directory is auto-generated
- Plugin versions managed by Expo SDK
- Direct Gradle usage can cause version mismatches

**Best practice**: Use `npx expo run:android` instead of `./gradlew`

---

## TL;DR - Quick Commands

**For development**:
```bash
cd /Users/moses/projects/wic_project/app
npx expo run:android
```

**For APK to share**:
```bash
cd /Users/moses/projects/wic_project/app
npx expo prebuild --platform android --clean
cd android
./gradlew assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

**For Expo Go** (fastest development):
```bash
npx expo start
# Scan QR code
```

---

## Still Having Issues?

**Check React Native version**:
```bash
cd /Users/moses/projects/wic_project/app
grep react-native package.json
```

**Check Expo SDK version**:
```bash
expo --version
npx expo-doctor
```

**Full clean rebuild**:
```bash
cd /Users/moses/projects/wic_project/app
rm -rf node_modules android ios
npm install
npx expo prebuild --clean
npx expo run:android
```

---

## Updated Deployment Guide

Replace direct Gradle commands with:

```bash
# OLD (causes plugin errors):
cd android
./gradlew assembleDebug

# NEW (handles plugins automatically):
cd /Users/moses/projects/wic_project/app
npx expo run:android
```

**This is the Expo-recommended approach!**
