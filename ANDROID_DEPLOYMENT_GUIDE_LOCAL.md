# Android Local Deployment Guide - WIC Benefits App

**Last Updated**: 2026-01-22
**Branch**: `pre-prod-local-testing`
**Build Type**: Local Development Build (Android SDK)
**Goal**: Build and test without using cloud build quota

## 🎯 Deployment Overview

This guide covers **local Android builds** using your installed Android SDK. Use this method for development and testing to preserve your EAS cloud build quota for final releases.

### Why Local Builds?
- ✅ **Free** - No build quota used
- ✅ **Fast** - Builds in 5-10 minutes vs 15-20 minutes cloud
- ✅ **Iterate quickly** - Test changes immediately
- ✅ **Full control** - Debug build issues locally

### When to Use Cloud Builds?
- Final testing builds for external testers
- Production releases
- When you don't have Android SDK installed
- You have **8 cloud builds remaining** - save them!

---

## 📋 Prerequisites

### 1. Verify Android SDK Installation

```bash
# Check Android SDK location
echo $ANDROID_HOME
# Should show path like: /Users/moses/Library/Android/sdk

# Check if adb works
adb version
# Should show: Android Debug Bridge version X.X.X

# List Android platforms installed
ls $ANDROID_HOME/platforms
# Should show: android-33 or android-34 (or similar)
```

**If ANDROID_HOME not set**:
```bash
# Add to ~/.zshrc or ~/.bash_profile
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Reload
source ~/.zshrc  # or source ~/.bash_profile
```

### 2. Verify Java Installation

```bash
# Check Java version (need 11 or higher)
java -version

# If not installed or wrong version:
# Install via Homebrew
brew install openjdk@17

# Link it
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk \
  /Library/Java/JavaVirtualMachines/openjdk-17.jdk
```

### 3. Verify Node.js and Dependencies

```bash
cd /Users/moses/projects/wic_project/app

# Check Node version (18+ recommended)
node --version

# Install dependencies
npm install
```

---

## 🚀 Local Build Method 1: Expo Development Build (Fastest)

**Best for**: Quick iteration during development

### Step 1: Start Expo Dev Server

```bash
cd /Users/moses/projects/wic_project/app

# Start Expo
npx expo start
```

You'll see a menu:
```
› Press a │ open Android
› Press w │ open web
› Press r │ reload app
› Press m │ toggle menu
```

### Step 2: Connect Android Device

**Option A: Physical Device**

1. Enable Developer Options on Android:
   - Settings → About Phone → Tap "Build Number" 7 times

2. Enable USB Debugging:
   - Settings → Developer Options → Enable "USB Debugging"

3. Connect via USB cable

4. Verify connection:
   ```bash
   adb devices
   # Should show: List of devices attached
   #              XXXXXXXX	device
   ```

**Option B: Android Emulator**

1. Open Android Studio
2. Tools → Device Manager
3. Start an emulator (or create one if needed)
4. Verify:
   ```bash
   adb devices
   # Should show emulator-XXXX device
   ```

### Step 3: Build and Run on Device

**With Expo dev server running:**
```bash
# Press 'a' in the terminal
# Or run:
npx expo run:android
```

**What happens**:
- App builds using local Android SDK
- Installs on connected device/emulator
- Opens automatically
- Hot reload enabled for quick changes

**First build**: 5-10 minutes
**Subsequent builds**: 1-2 minutes (incremental)

---

## 🚀 Local Build Method 2: Generate Standalone APK

**Best for**: Sharing with testers without needing dev server

### Step 1: Prepare for Release Build

```bash
cd /Users/moses/projects/wic_project/app
```

**Check app.json configuration**:
```bash
cat app.json | grep -A 5 android
```

Verify:
- `"package"`: Should be unique (e.g., `"com.wicbenefits.app"`)
- `"versionCode"`: Increment for each build (e.g., 1, 2, 3...)
- `"version"`: User-facing version (e.g., "1.0.1")

**Update version if needed**:
```json
{
  "expo": {
    "version": "1.0.1",  // Increment this
    "android": {
      "versionCode": 2,  // Increment this
      "package": "com.wicbenefits.app"
    }
  }
}
```

### Step 2: Generate Android Project (if not exists)

```bash
# First time only - generates android/ directory
npx expo prebuild --platform android
```

**What this does**:
- Creates `android/` directory with native Android project
- Configures Gradle build files
- Sets up app signing

**Note**: If you already have `android/` directory, skip this step.

### Step 3: Build APK

**Important**: Don't use `./gradlew` directly with Expo projects. Use Expo's wrapper:

```bash
cd /Users/moses/projects/wic_project/app

# Regenerate android directory (first time or if outdated)
npx expo prebuild --platform android --clean

# Build debug APK
cd android
./gradlew assembleDebug

# Or build release APK (optimized)
./gradlew assembleRelease
```

**Or use Expo's build command** (handles Gradle automatically):
```bash
cd /Users/moses/projects/wic_project/app

# Build and install debug (easier)
npx expo run:android --variant debug

# Build release APK
npx expo run:android --variant release
```

**Build time**: 5-10 minutes first time, 2-5 minutes after

**APK locations**:
```bash
# Debug APK
android/app/build/outputs/apk/debug/app-debug.apk

# Release APK
android/app/build/outputs/apk/release/app-release.apk
```

**If you get Gradle plugin errors**, see `GRADLE_BUILD_FIX.md`

### Step 4: Install APK

**Method A: Install via USB**
```bash
cd /Users/moses/projects/wic_project/app

# Install debug APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or install release APK
adb install android/app/build/outputs/apk/release/app-release.apk

# If already installed, add -r to reinstall
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

**Method B: Transfer and Install**
```bash
# Copy APK to Downloads folder on phone
adb push android/app/build/outputs/apk/debug/app-debug.apk /sdcard/Download/

# On phone:
# - Open Files app
# - Go to Downloads
# - Tap APK file
# - Install
```

**Method C: Share APK File**
```bash
# APK is in:
# /Users/moses/projects/wic_project/app/android/app/build/outputs/apk/debug/app-debug.apk

# Share via:
# - AirDrop to yourself, then to phone
# - Email
# - Google Drive
# - USB transfer
```

---

## 🔧 Build Configuration

### Configure App Signing (Release Builds)

**For release builds**, you need a signing key.

**Generate keystore** (first time only):
```bash
cd /Users/moses/projects/wic_project/app/android/app

# Generate keystore
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore wic-app-release.keystore \
  -alias wic-app-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# You'll be prompted for:
# - Keystore password (remember this!)
# - Your name, organization, etc.
```

**Configure Gradle to use keystore**:

Create `android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=wic-app-release.keystore
MYAPP_RELEASE_KEY_ALIAS=wic-app-key
MYAPP_RELEASE_STORE_PASSWORD=your-keystore-password
MYAPP_RELEASE_KEY_PASSWORD=your-key-password
```

**Update `android/app/build.gradle`**:
```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            ...
            signingConfig signingConfigs.release
        }
    }
}
```

**Important**: Keep keystore file and passwords secure!

---

## 📦 Verify JSON UPC Data is Bundled

```bash
cd /Users/moses/projects/wic_project/app

# Check data files exist
ls -lh app/lib/data/*.json

# Should show:
# apl-michigan-upcs.json
# products.json
# (any other state data files)

# Check file sizes (should be substantial)
du -h app/lib/data/*.json
```

**If missing or empty**:
```bash
# Copy from backend or data source
cp ../backend/data/apl-michigan-upcs.json app/lib/data/
cp ../backend/data/products.json app/lib/data/
```

**Verify data loads in code**:
- Check `app/lib/services/offlineEligibility.ts` or similar
- Should import JSON files:
  ```typescript
  import aplData from '../data/apl-michigan-upcs.json';
  import productsData from '../data/products.json';
  ```

---

## 🔄 Quick Iteration Workflow

**For active development**:

```bash
# Terminal 1: Start dev server
cd /Users/moses/projects/wic_project/app
npx expo start

# Terminal 2 (optional): Watch logs
adb logcat | grep -i wic

# Make code changes → Auto-reload on device
# Press 'r' in Expo terminal to manually reload
```

**Benefits**:
- See changes instantly (hot reload)
- No need to rebuild APK
- Debug with Chrome DevTools (press 'm' → Debug)

**When to build APK**:
- Testing without dev server
- Sharing with non-technical testers
- Final testing before release
- Performance testing (release builds are faster)

---

## 🐛 Troubleshooting

### Issue: `ANDROID_HOME not set`

**Solution**:
```bash
# Find SDK location
ls ~/Library/Android/sdk

# Set in shell config
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zshrc
source ~/.zshrc

# Verify
echo $ANDROID_HOME
```

### Issue: `adb: command not found`

**Solution**:
```bash
# Add to PATH
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Or use full path
$ANDROID_HOME/platform-tools/adb devices
```

### Issue: `No devices found`

**Check USB connection**:
```bash
# Reconnect device
# Check cable is good (data cable, not just charging)

# Check USB debugging enabled on phone
# Settings → Developer Options → USB Debugging

# Try different USB port

# Restart adb
adb kill-server
adb start-server
adb devices
```

**Check emulator**:
```bash
# List emulators
emulator -list-avds

# Start emulator
emulator @avd_name &

# Or start from Android Studio
```

### Issue: Build fails with "SDK location not found"

**Solution**:
Create `android/local.properties`:
```properties
sdk.dir=/Users/moses/Library/Android/sdk
```

Replace path with your actual SDK location.

### Issue: Build fails with Gradle error

**Try**:
```bash
cd android

# Clean build
./gradlew clean

# Build again
./gradlew assembleDebug

# If still fails, check Java version
java -version  # Need 11+
```

### Issue: App won't install - "App not installed"

**Causes**:
1. Existing version with different signature
2. Insufficient storage
3. Corrupted APK

**Solutions**:
```bash
# Uninstall old version
adb uninstall com.wicbenefits.app

# Reinstall
adb install -r path/to/app.apk

# Check storage
adb shell df /data

# Verify APK is valid
unzip -t path/to/app.apk
```

### Issue: Camera not working after install

**Solution**:
```bash
# Grant camera permission via adb
adb shell pm grant com.wicbenefits.app android.permission.CAMERA

# Or on phone:
# Settings → Apps → WIC Benefits → Permissions → Camera → Allow
```

### Issue: Build is slow

**Speed up builds**:

**Enable Gradle daemon** - Create/edit `android/gradle.properties`:
```properties
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
```

**Use local Maven repo**:
```bash
# Cache dependencies locally
./gradlew build --offline
```

**Clean old builds**:
```bash
cd android
./gradlew clean
```

---

## 📱 Sharing APK with Testers

### Method 1: Direct File Transfer

**Via USB**:
```bash
# Push to phone's Download folder
adb push android/app/build/outputs/apk/debug/app-debug.apk /sdcard/Download/wic-app.apk
```

**Via AirDrop** (if you have Mac):
1. Locate APK: `app/android/app/build/outputs/apk/debug/app-debug.apk`
2. Right-click → Share → AirDrop to your phone
3. Open on phone and install

### Method 2: Cloud Storage

```bash
# Upload to Google Drive, Dropbox, etc.
# Share link with testers

# Or use command-line tools
# For Dropbox:
# Install: brew install dropbox-cli
# Upload: dropbox upload app-debug.apk
```

### Method 3: Local Web Server

```bash
cd /Users/moses/projects/wic_project/app/android/app/build/outputs/apk/debug

# Start simple HTTP server
python3 -m http.server 8000

# On same network, testers can download from:
# http://your-local-ip:8000/app-debug.apk

# Find your IP:
ifconfig | grep "inet " | grep -v 127.0.0.1
```

---

## 🎯 Build Types Comparison

| Aspect | Debug Build | Release Build | Expo Dev |
|--------|-------------|---------------|----------|
| **Command** | `./gradlew assembleDebug` | `./gradlew assembleRelease` | `npx expo start` |
| **Speed** | 5-10 min | 5-10 min | 1-2 min |
| **Size** | ~50MB | ~25MB | N/A |
| **Performance** | Slower | Optimized | Slower |
| **Signing** | Auto-signed | Needs keystore | N/A |
| **Debugging** | ✅ Full debugging | ❌ Obfuscated | ✅ Full debugging |
| **Use Case** | Development | Testing/Release | Active dev |

**Recommendation**:
- **Active development**: Use Expo dev (fastest)
- **Internal testing**: Use debug APK (easy to share)
- **Final testing**: Use release APK (closer to production)
- **External testers**: Use EAS cloud build (use your 8 remaining builds wisely)

---

## ⚡ Quick Commands Reference

```bash
# Start Expo Go development (fastest)
cd app
npx expo start
# Scan QR code with Expo Go app

# Build and run on device (with USB)
cd app
npx expo run:android

# Build debug APK for sharing
cd app
npx expo prebuild --platform android --clean
cd android
./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk

# Build release APK
cd app
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease

# Install APK
adb install path/to/app.apk

# Reinstall (if already installed)
adb install -r path/to/app.apk

# Uninstall
adb uninstall com.wicbenefits.app

# View logs
adb logcat | grep -i wic

# List devices
adb devices

# Check app version installed
adb shell dumpsys package com.wicbenefits.app | grep versionCode

# Clear app data (reset app)
adb shell pm clear com.wicbenefits.app

# Fix Gradle plugin errors
cd app
npx expo prebuild --platform android --clean
```

---

## 🔄 Complete Build Workflow

```bash
# 1. Update version (if needed)
# Edit app.json - increment version and versionCode

# 2. Install dependencies
cd /Users/moses/projects/wic_project/app
npm install

# 3. Verify data files
ls -lh app/lib/data/*.json

# 4. Choose build method:

# Option A: Quick dev build (fastest)
npx expo run:android

# Option B: Build APK to share
npx expo prebuild --platform android --clean
cd android
./gradlew assembleDebug
cd ..
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Option C: Expo Go (no build needed)
npx expo start
# Scan QR code with Expo Go app

# 5. Test on device
# Open app, run through test plan

# 6. If issues found, fix and rebuild
# Repeat step 4
```

---

## 🎓 When to Use Cloud Builds (Your 8 Remaining)

**Save cloud builds for**:
1. **Final testing build** - When ready for external testers
2. **Production release** - Final build for Play Store
3. **iOS builds** - Can't build iOS locally without Mac + Xcode
4. **Builds for non-technical testers** - QR code install is easier

**Use local builds for**:
- All development work
- Internal testing
- Bug fixes and iterations
- Performance testing
- When you have Android SDK access

---

## 📊 Build Comparison

**Local Build**:
- ✅ Free (unlimited)
- ✅ Fast (5-10 min)
- ✅ Full control
- ❌ Requires Android SDK setup
- ❌ Can only share APK files

**EAS Cloud Build** (8 remaining):
- ✅ No local setup needed
- ✅ Easy sharing (QR codes)
- ✅ Consistent environment
- ❌ Limited quota (8 left)
- ❌ Slower (15-20 min)
- ❌ Requires internet

**Strategy**: Use local builds for everything, save cloud builds for final releases.

---

**Ready to Build Locally!** 🚀

Start with Expo dev server for fastest iteration, build APK when you need to share.
