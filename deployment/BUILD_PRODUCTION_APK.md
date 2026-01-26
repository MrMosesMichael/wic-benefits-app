# Build Production APK

Instructions for building and deploying the production version of the WIC Benefits app.

## Prerequisites

- Java 17 installed (`/usr/local/opt/openjdk@17`)
- Android SDK configured
- Expo CLI installed

## Step 1: Enable Production Mode

The app is configured to use the production backend in release builds:

**File**: `app/lib/services/api.ts`
```typescript
export const OFFLINE_MODE = false;  // ✅ Use backend API

const API_BASE_URL = __DEV__
  ? 'http://192.168.12.94:3000/api/v1'  // Dev: local backend
  : 'https://mdmichael.com/wic/api/v1'; // Prod: VPS backend
```

**Current setting**: ✅ `OFFLINE_MODE = false` (uses backend)

## Step 2: Build Release APK

```bash
cd app

# Set Java 17 (required for Android builds)
export JAVA_HOME=/usr/local/opt/openjdk@17

# Clean previous builds (optional)
rm -rf android/app/build

# Build release APK
./android/gradlew -p android assembleRelease

# APK location
ls -lh android/app/build/outputs/apk/release/app-release.apk
```

**Expected**:
- Build time: ~2-3 minutes
- APK size: ~95 MB
- Output: `android/app/build/outputs/apk/release/app-release.apk`

## Step 3: Rename APK

```bash
# Copy and rename for distribution
cp android/app/build/outputs/apk/release/app-release.apk \
   wic-benefits.apk

# Verify
ls -lh wic-benefits.apk
```

## Step 4: Deploy to VPS

```bash
# Copy APK to VPS
scp wic-benefits.apk mmichael@mdmichael.com:~/

# SSH to VPS and move to webroot
ssh mmichael@mdmichael.com

# On VPS:
sudo mkdir -p /data/docker/www/mdmichael/www/wic/downloads
sudo mv ~/wic-benefits.apk /data/docker/www/mdmichael/www/wic/downloads/
sudo chown -R www-data:www-data /data/docker/www/mdmichael/www/wic/downloads
sudo chmod 644 /data/docker/www/mdmichael/www/wic/downloads/wic-benefits.apk
```

## Step 5: Update Landing Page

```bash
# On VPS - update landing page with new APK
cd ~/projects/wic-app
git pull origin main

sudo cp deployment/wic-landing/index.html \
        /data/docker/www/mdmichael/www/wic/
```

## Step 6: Test Download

```bash
# Test download link
curl -I https://mdmichael.com/wic/downloads/wic-benefits.apk

# Should return:
# HTTP/2 200
# content-type: application/vnd.android.package-archive
```

## Testing the Production APK

### Install on Device

```bash
# Via ADB
adb install -r wic-benefits.apk

# Or download directly on Android device
# Visit: https://mdmichael.com/wic/
# Tap "Download for Android"
```

### Test Checklist

- [ ] App installs without errors
- [ ] Opens to home screen
- [ ] Can navigate to "View Benefits"
- [ ] Benefits load from backend (not offline data)
- [ ] Can scan products (camera permissions)
- [ ] Scanner returns eligibility from backend API
- [ ] Can add items to cart
- [ ] Health check: Backend connectivity works
- [ ] Formula finder works (if implemented)

### Verify Backend Connectivity

In the app:
1. Go to "View Benefits"
2. Should show benefits from backend (not AsyncStorage)
3. Check network requests in logs

Or test manually:
```bash
# On device or emulator
adb logcat | grep -i "api\|network\|http"

# Should see requests to: https://mdmichael.com/wic/api/v1/
```

## Troubleshooting

### Build Fails - Java Version

```bash
# Check Java version
$JAVA_HOME/bin/java -version
# Should show: openjdk version "17.x.x"

# If wrong version:
export JAVA_HOME=/usr/local/opt/openjdk@17
```

### APK Won't Install

- **Error**: "App not installed"
  - Solution: Uninstall existing version first
  - `adb uninstall com.wicbenefits.app`

- **Error**: "Unknown sources blocked"
  - Solution: Enable "Install from unknown sources" in Android settings

### App Shows Offline Data

- **Issue**: App uses bundled JSON instead of backend
- **Check**: `OFFLINE_MODE` should be `false` in api.ts
- **Solution**: Rebuild APK after fixing api.ts

### Network Errors in App

- **Issue**: "Network request failed"
- **Check**:
  1. Backend is running: `curl https://mdmichael.com/wic/health`
  2. CORS allows mdmichael.com (check backend/.env)
  3. Device has internet connection
  4. No firewall blocking HTTPS

## Version Management

### Current Version
- **App Version**: 0.1.0 (see `app/package.json`)
- **Build Date**: Check APK build timestamp
- **Backend API**: v1

### Updating Version

Before each build, update version:

```bash
cd app
nano package.json
# Update "version": "0.1.0" -> "0.2.0"

# Also update app.json if needed
nano app.json
# Update "version": "0.1.0"
```

## Release Checklist

Before deploying new APK to production:

- [ ] Backend deployed and tested
- [ ] OFFLINE_MODE = false
- [ ] Version number updated
- [ ] Tested on physical device
- [ ] Backend connectivity verified
- [ ] All critical features work
- [ ] Build is release (not debug)
- [ ] APK signed (future: add signing)
- [ ] Landing page updated
- [ ] Old APK backed up

## Future: Code Signing

For production releases, sign the APK:

1. Generate keystore
2. Configure Gradle with signing config
3. Build signed APK
4. Required for Google Play Store

See: https://reactnative.dev/docs/signed-apk-android

## Distribution URLs

After deployment:

- **Download**: https://mdmichael.com/wic/downloads/wic-benefits.apk
- **Landing Page**: https://mdmichael.com/wic/
- **API**: https://mdmichael.com/wic/api/v1/

## Support

If users have installation issues:

1. Check Android version (6.0+ required)
2. Enable "Unknown sources"
3. Ensure sufficient storage (~200MB)
4. Verify internet connection for backend features
