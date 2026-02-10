# WIC Benefits App - Deployment Scripts

Quick reference for deployment automation scripts.

## Available Scripts

### B4.1: Backend Deployment
**File:** `deploy-backend.sh`

Deploys backend code to VPS and restarts Docker services.

```bash
./scripts/deploy-backend.sh
```

**What it does:**
- Syncs backend code via rsync (excludes node_modules, logs)
- Syncs docker-compose.yml and deployment configs
- Builds and restarts backend container
- Verifies health endpoint
- Shows deployment status

**Requirements:**
- SSH access to `tatertot.work`
- Docker running on VPS

---

### B4.2: Android APK Build
**File:** `build-android.sh`

Builds production Android APK and optionally uploads to VPS.

```bash
# Build only
./scripts/build-android.sh

# Build and upload
./scripts/build-android.sh --upload
```

**What it does:**
- Verifies Java 17 installation
- Cleans previous builds
- Runs Gradle release build
- Saves APK to `/builds/` directory with timestamp
- Optionally uploads to VPS

**Output:**
- Gradle: `app/android/app/build/outputs/apk/release/app-release.apk`
- Versioned: `builds/wic-benefits_YYYYMMDD_HHMMSS.apk`
- Latest: `builds/wic-benefits.apk`
- VPS: `~/projects/wic-app/deployment/wic-landing/wic-benefits.apk`

**Requirements:**
- Java 17: `/usr/local/opt/openjdk@17`
- Android SDK (via Expo)

---

### B4.3: iOS IPA Build
**File:** `build-ios.sh`

Builds iOS IPA using EAS Build (cloud or local).

```bash
./scripts/build-ios.sh
```

**What it does:**
- Checks EAS CLI installation
- Verifies Expo authentication
- Guides through iOS build requirements
- Submits cloud build to Expo servers

**Requirements:**
- Expo account
- Apple Developer account ($99/year for production)
- EAS CLI: `npm install -g eas-cli`

**Note:** This is an interactive script that checks prerequisites and guides you through the iOS build process.

---

## Quick Reference

### Full Deployment
```bash
# 1. Deploy backend
./scripts/deploy-backend.sh

# 2. Build Android APK and upload
./scripts/build-android.sh --upload

# 3. Build iOS IPA (optional)
./scripts/build-ios.sh
```

### Backend Only
```bash
./scripts/deploy-backend.sh
```

### Mobile Apps Only
```bash
# Android
./scripts/build-android.sh --upload

# iOS
./scripts/build-ios.sh
```

---

## Prerequisites Setup

### SSH Configuration

Add to `~/.ssh/config`:
```
Host tatertot.work
    HostName <your-vps-ip>
    User <your-username>
    IdentityFile ~/.ssh/id_rsa
```

Test: `ssh tatertot.work`

### Java 17 (for Android)
```bash
brew install openjdk@17
```

### EAS CLI (for iOS)
```bash
npm install -g eas-cli
eas login
```

---

## Troubleshooting

### SSH connection fails
```bash
# Test SSH manually
ssh tatertot.work

# Check SSH config
cat ~/.ssh/config | grep -A 5 "tatertot.work"
```

### Java version error (Android)
```bash
# Verify Java 17
/usr/local/opt/openjdk@17/bin/java -version

# Set JAVA_HOME manually
export JAVA_HOME=/usr/local/opt/openjdk@17
```

### Backend health check fails
```bash
# View logs on VPS
ssh tatertot.work 'cd ~/projects/wic-app && docker compose logs -f backend'

# Check containers
ssh tatertot.work 'cd ~/projects/wic-app && docker compose ps'
```

### APK won't install
```bash
# Uninstall existing version
adb uninstall com.wicbenefits.app

# Reinstall
adb install -r builds/wic-benefits.apk
```

---

## APL Automation (VPS)

**Note:** VPS has no npm installed. All backend commands run via Docker.

### Manual Sync
```bash
# Sync states due for update
ssh tatertot.work 'cd ~/projects/wic-app && docker compose exec -T backend npm run apl-sync'

# Sync specific state
ssh tatertot.work 'cd ~/projects/wic-app && docker compose exec -T backend npm run apl-sync -- --state MI'

# Force sync all states
ssh tatertot.work 'cd ~/projects/wic-app && docker compose exec -T backend npm run apl-sync -- --all --force'
```

### Cron Setup (on VPS)
```bash
# Edit crontab
crontab -e

# Add (daily at 5am):
0 5 * * * cd ~/projects/wic-app && docker compose exec -T backend npm run apl-sync >> /var/log/apl-sync.log 2>&1
```

### Supported States
MI (Excel), NC (HTML), FL (PDF), OR (Excel), NY (PDF)

---

## Documentation

For detailed documentation, see:
- [/docs/deployment.md](/Users/moses/projects/wic_project/docs/deployment.md) - Complete deployment guide
- [/deployment/DEPLOYMENT.md](/Users/moses/projects/wic_project/deployment/DEPLOYMENT.md) - VPS setup details
- [/deployment/BUILD_PRODUCTION_APK.md](/Users/moses/projects/wic_project/deployment/BUILD_PRODUCTION_APK.md) - Android build details

---

## Production URLs

- **Backend API:** https://mdmichael.com/wic/api/v1/
- **Health Check:** https://mdmichael.com/wic/health
- **Android APK:** https://mdmichael.com/wic/downloads/wic-benefits.apk
- **Landing Page:** https://mdmichael.com/wic/

---

*Scripts: B4.1-B4.4 | Last updated: 2026-02-10*
