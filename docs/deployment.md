# WIC Benefits App - Deployment Guide

> **Quick Reference:** Scripts for deploying backend, building mobile apps, and managing production infrastructure

---

## Overview

This guide covers deployment scripts for the WIC Benefits App:

- **B4.1** - Backend deployment script (`deploy-backend.sh`)
- **B4.2** - Android APK build script (`build-android.sh`)
- **B4.3** - iOS IPA build script (`build-ios.sh`)
- **B4.4** - This documentation

All scripts are located in `/scripts/` directory.

---

## Architecture

```
Production Stack:
┌─────────────────────────────────────────┐
│ tatertot.work VPS (mdmichael.com)       │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ Traefik (Reverse Proxy)          │  │
│  │ Port 443 (HTTPS)                 │  │
│  └────────┬─────────────────────────┘  │
│           │                             │
│           ├─> /wic/health               │
│           │   └─> wic-backend:3000      │
│           │                             │
│           └─> /wic/api/*                │
│               └─> wic-backend:3000      │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ wic-backend (Docker)             │  │
│  │ Node.js + Express                │  │
│  │ Port 3000 (internal)             │  │
│  └────────┬─────────────────────────┘  │
│           │                             │
│  ┌────────▼─────────────────────────┐  │
│  │ wic-postgres (Docker)            │  │
│  │ PostgreSQL 15                    │  │
│  │ Port 5432 (internal)             │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘

Mobile Apps:
┌──────────────┐     ┌──────────────┐
│ Android APK  │     │   iOS IPA    │
│ (Sideload)   │     │ (App Store)  │
└──────┬───────┘     └──────┬───────┘
       │                    │
       └─────────┬──────────┘
                 │
                 ▼
    https://mdmichael.com/wic/api/v1/
```

---

## Prerequisites

### For All Deployments

1. **SSH Access to VPS**
   ```bash
   # Configure SSH alias in ~/.ssh/config
   Host tatertot.work
       HostName <your-vps-ip>
       User <your-username>
       IdentityFile ~/.ssh/id_rsa
   ```

2. **Test SSH connection**
   ```bash
   ssh tatertot.work
   ```

### For Backend Deployment (B4.1)

- SSH access to `tatertot.work`
- Docker and Docker Compose installed on VPS
- VPS directory: `~/projects/wic-app`

### For Android Build (B4.2)

- Java 17 installed: `/usr/local/opt/openjdk@17`
  ```bash
  brew install openjdk@17
  ```
- Android SDK configured (via Expo)
- Node.js and npm installed

### For iOS Build (B4.3)

- Expo account (free)
- Apple Developer account ($99/year, for production)
- EAS CLI installed:
  ```bash
  npm install -g eas-cli
  ```

---

## B4.1: Backend Deployment

### Usage

```bash
# Make script executable (first time only)
chmod +x scripts/deploy-backend.sh

# Deploy backend to VPS
./scripts/deploy-backend.sh
```

### What It Does

1. Tests SSH connection to `tatertot.work`
2. Syncs backend code via rsync (excludes node_modules, logs)
3. Syncs docker-compose.yml and deployment files
4. Builds and restarts Docker containers on VPS
5. Verifies backend health endpoint
6. Shows deployment logs

### Files Synced

- `backend/` → `~/projects/wic-app/backend/`
  - Excludes: `node_modules/`, `dist/`, `.env`, `*.log`
- `docker-compose.yml` → `~/projects/wic-app/docker-compose.yml`
- `deployment/` → `~/projects/wic-app/deployment/`

### Troubleshooting

**SSH connection fails:**
```bash
# Test SSH manually
ssh tatertot.work

# Check ~/.ssh/config for correct alias
cat ~/.ssh/config | grep -A 5 "tatertot.work"
```

**Backend health check fails:**
```bash
# View logs on VPS
ssh tatertot.work 'cd ~/projects/wic-app && docker compose logs -f backend'

# Check if containers are running
ssh tatertot.work 'cd ~/projects/wic-app && docker compose ps'
```

**Database connection issues:**
```bash
# Check postgres container
ssh tatertot.work 'cd ~/projects/wic-app && docker compose logs postgres'

# Verify .env file exists on VPS
ssh tatertot.work 'cat ~/projects/wic-app/.env'
```

---

## B4.2: Android APK Build

### Usage

```bash
# Make script executable (first time only)
chmod +x scripts/build-android.sh

# Build APK only
./scripts/build-android.sh

# Build and upload to VPS
./scripts/build-android.sh --upload
```

### What It Does

1. Verifies Java 17 installation
2. Checks/installs npm dependencies
3. Cleans previous build artifacts
4. Runs Gradle build: `./android/gradlew assembleRelease`
5. Copies APK to `/builds/` with timestamp
6. Optionally uploads to VPS via rsync

### Output Locations

- **Gradle output:** `app/android/app/build/outputs/apk/release/app-release.apk`
- **Versioned copy:** `builds/wic-benefits_YYYYMMDD_HHMMSS.apk`
- **Latest copy:** `builds/wic-benefits.apk`
- **VPS location:** `~/projects/wic-app/deployment/wic-landing/wic-benefits.apk`
- **Public URL:** `https://mdmichael.com/wic/downloads/wic-benefits.apk`

### Build Configuration

The app automatically uses production backend in release builds:

**File:** `app/lib/services/api.ts`
```typescript
const API_BASE_URL = __DEV__
  ? 'http://192.168.12.94:3000/api/v1'  // Dev: local backend
  : 'https://mdmichael.com/wic/api/v1'; // Prod: VPS backend
```

### Troubleshooting

**Java version error:**
```bash
# Install Java 17
brew install openjdk@17

# Verify installation
/usr/local/opt/openjdk@17/bin/java -version
```

**Gradle build fails:**
```bash
# Clean Gradle cache
cd app/android
./gradlew clean

# Check Gradle wrapper
./gradlew --version
```

**APK won't install on device:**
```bash
# Uninstall existing version
adb uninstall com.wicbenefits.app

# Install fresh APK
adb install -r builds/wic-benefits.apk
```

**Enable "Unknown sources" on Android:**
1. Settings → Security → Unknown sources
2. Or: Settings → Apps → Special access → Install unknown apps

---

## B4.3: iOS IPA Build

### Usage

```bash
# Make script executable (first time only)
chmod +x scripts/build-ios.sh

# Build iOS app (interactive)
./scripts/build-ios.sh
```

### What It Does

1. Checks for EAS CLI (installs if needed)
2. Verifies Expo account login
3. Checks for Apple Developer requirements
4. Guides through EAS build process
5. Submits cloud build to Expo servers

### iOS Requirements Checklist

- [ ] **Apple Developer Account** ($99/year)
  - Sign up: https://developer.apple.com/programs/
- [ ] **Bundle Identifier** configured in `app/app.json`
  ```json
  "ios": {
    "bundleIdentifier": "com.wicbenefits.app"
  }
  ```
- [ ] **EAS Build configured**
  ```bash
  cd app
  eas build:configure
  ```

### Build Process

**Cloud Build (Recommended):**
```bash
# Builds on Expo servers
eas build --platform ios --profile production

# Monitor build
eas build:list

# Download IPA when complete
# Available in Expo dashboard: https://expo.dev
```

**Local Build (Requires Mac + Xcode):**
```bash
cd app
npx expo run:ios --configuration Release
```

### Distribution Options

1. **TestFlight (Beta Testing)**
   - Upload IPA to App Store Connect
   - Invite testers via email
   - No App Review required for testing

2. **App Store (Public Release)**
   - Upload to App Store Connect
   - Submit for App Review
   - 1-3 day review process

3. **Ad-hoc (Limited Devices)**
   - Register device UDIDs in developer portal
   - Install via Xcode or TestFlight

### Troubleshooting

**Not logged into Expo:**
```bash
eas login
```

**Build fails on EAS:**
```bash
# View build logs
eas build:list
eas build:view <build-id>
```

**Certificate/provisioning issues:**
```bash
# Let EAS manage credentials (easiest)
eas credentials

# Or manually upload via Apple Developer portal
```

---

## Deployment Workflows

### Full Production Deployment

Deploy both backend and mobile apps:

```bash
# 1. Deploy backend
./scripts/deploy-backend.sh

# 2. Test backend
curl https://mdmichael.com/wic/health

# 3. Build Android APK and upload
./scripts/build-android.sh --upload

# 4. Build iOS IPA (if Apple Developer account configured)
./scripts/build-ios.sh

# 5. Update landing page (if needed)
ssh tatertot.work 'cd ~/projects/wic-app/deployment/wic-landing && <update-commands>'
```

### Backend-Only Update

Quick backend code changes:

```bash
# Deploy backend only
./scripts/deploy-backend.sh

# Verify deployment
curl https://mdmichael.com/wic/health
curl https://mdmichael.com/wic/api/v1/stores
```

### Mobile App Update

When backend API is unchanged:

```bash
# Android
./scripts/build-android.sh --upload

# iOS
./scripts/build-ios.sh
```

---

## Manual Deployment Commands

### Backend Deployment (Manual)

```bash
# Sync backend code
rsync -arvz --delete \
  --exclude 'node_modules' \
  --exclude 'dist' \
  backend/ tatertot.work:~/projects/wic-app/backend/

# Restart backend
ssh tatertot.work 'cd ~/projects/wic-app && docker compose restart backend'

# View logs
ssh tatertot.work 'cd ~/projects/wic-app && docker compose logs -f backend'
```

### Android Build (Manual)

```bash
cd app

# Set Java 17
export JAVA_HOME=/usr/local/opt/openjdk@17

# Build
./android/gradlew -p android assembleRelease

# Copy APK
cp android/app/build/outputs/apk/release/app-release.apk builds/wic-benefits.apk

# Upload
rsync -arvz builds/wic-benefits.apk tatertot.work:~/projects/wic-app/deployment/wic-landing/
```

### iOS Build (Manual)

```bash
cd app

# Cloud build
eas build --platform ios --profile production

# Or local build (Mac + Xcode only)
npx expo run:ios --configuration Release
```

---

## Monitoring & Maintenance

### Check Deployment Status

```bash
# Backend health
curl https://mdmichael.com/wic/health

# API endpoint test
curl https://mdmichael.com/wic/api/v1/stores

# View backend logs
ssh tatertot.work 'cd ~/projects/wic-app && docker compose logs -f backend'

# Check container status
ssh tatertot.work 'cd ~/projects/wic-app && docker compose ps'

# View resource usage
ssh tatertot.work 'docker stats wic-backend wic-postgres'
```

### Database Backup

```bash
# Create backup
ssh tatertot.work 'cd ~/projects/wic-app && docker compose exec postgres pg_dump -U wic_admin wic_benefits > backup_$(date +%Y%m%d).sql'

# Download backup
rsync -arvz tatertot.work:~/projects/wic-app/backup_*.sql ./backups/

# Restore backup (if needed)
cat backup_20260202.sql | ssh tatertot.work 'cd ~/projects/wic-app && docker compose exec -T postgres psql -U wic_admin wic_benefits'
```

### Update Dependencies

```bash
# Backend dependencies (via Docker - no npm on VPS)
ssh tatertot.work 'cd ~/projects/wic-app && docker compose exec backend npm update'

# Rebuild backend
ssh tatertot.work 'cd ~/projects/wic-app && docker compose build backend && docker compose up -d backend'

# Mobile app dependencies (local dev machine)
cd app
npm update
```

---

## APL Automation (5 States)

The APL sync system automatically updates product data from state sources (MI, NC, FL, OR, NY).

### Run APL Sync Manually

```bash
# Sync all states due for update
ssh tatertot.work 'cd ~/projects/wic-app && docker compose exec -T backend npm run apl-sync'

# Sync specific state
ssh tatertot.work 'cd ~/projects/wic-app && docker compose exec -T backend npm run apl-sync -- --state MI'

# Force sync all states (ignore cache)
ssh tatertot.work 'cd ~/projects/wic-app && docker compose exec -T backend npm run apl-sync -- --all --force'

# View help
ssh tatertot.work 'cd ~/projects/wic-app && docker compose exec -T backend npm run apl-sync -- --help'
```

### Set Up Automated Cron Job

```bash
# SSH to VPS
ssh tatertot.work

# Edit crontab
crontab -e

# Add this line (daily at 5am EST):
0 5 * * * cd ~/projects/wic-app && docker compose exec -T backend npm run apl-sync >> /var/log/apl-sync.log 2>&1
```

### Monitor APL Health

```bash
# Check sync health via API
curl https://mdmichael.com/wic/api/v1/apl-sync/health

# Check states due for sync
curl https://mdmichael.com/wic/api/v1/apl-sync/due

# View recent sync jobs
curl https://mdmichael.com/wic/api/v1/apl-sync/jobs

# Check logs
ssh tatertot.work 'tail -50 /var/log/apl-sync.log'
```

### Supported States

| State | Format | Schedule | Source |
|-------|--------|----------|--------|
| MI | Excel | Daily 6am | michigan.gov |
| NC | HTML | Daily 7am | nutritionnc.com |
| FL | PDF | Daily 8am | floridahealth.gov |
| OR | Excel | Daily 9am | oregon.gov |
| NY | PDF | Daily 10am | health.ny.gov |

### Run Shortage Detection

```bash
ssh tatertot.work 'cd ~/projects/wic-app && docker compose exec -T backend npm run detect-shortages'
```

---

## Security Checklist

### Backend Security

- [ ] Strong database password in `.env` (32+ characters)
- [ ] `.env` file permissions: `chmod 600 .env`
- [ ] PostgreSQL not exposed to internet (127.0.0.1 only)
- [ ] CORS configured for production domain only
- [ ] SSL/TLS enabled via Traefik/nginx
- [ ] Regular database backups scheduled
- [ ] Firewall rules: only 80/443 open to public

### Mobile App Security

- [ ] API URLs use HTTPS in production
- [ ] No API keys hardcoded in source
- [ ] Sensitive data encrypted in AsyncStorage
- [ ] APK signed for production release (Android)
- [ ] App Store security review passed (iOS)

---

## Rollback Procedures

### Backend Rollback

```bash
# SSH to VPS
ssh tatertot.work

# View recent commits
cd ~/projects/wic-app
git log --oneline -10

# Rollback to previous version
git reset --hard <commit-hash>

# Rebuild and restart
docker compose build backend
docker compose up -d backend

# Verify
curl http://localhost:3000/health
```

### Mobile App Rollback

**Android:**
- Re-upload previous APK version to VPS
- Update download link on landing page

**iOS:**
- Re-submit previous IPA to App Store Connect
- Or: Roll back TestFlight build

---

## Environment Variables

### Backend (.env on VPS)

```bash
# Database
POSTGRES_DB=wic_benefits
POSTGRES_USER=wic_admin
POSTGRES_PASSWORD=<strong-password-32-chars>

# Backend
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://wic_admin:<password>@postgres:5432/wic_benefits?sslmode=disable

# CORS
CORS_ORIGIN=https://mdmichael.com,https://www.mdmichael.com
```

### Mobile App (app/lib/services/api.ts)

```typescript
// API endpoint
const API_BASE_URL = __DEV__
  ? 'http://192.168.12.94:3000/api/v1'  // Dev
  : 'https://mdmichael.com/wic/api/v1'; // Prod

// Offline mode
export const OFFLINE_MODE = false;  // Use backend API
```

---

## Useful Commands Reference

### SSH & Rsync

```bash
# Test SSH connection
ssh tatertot.work

# Sync single file
rsync -arvz file.txt tatertot.work:~/projects/wic-app/

# Sync directory
rsync -arvz --delete local-dir/ tatertot.work:~/remote-dir/
```

### Docker on VPS

```bash
# View logs
ssh tatertot.work 'cd ~/projects/wic-app && docker compose logs -f'

# Restart services
ssh tatertot.work 'cd ~/projects/wic-app && docker compose restart'

# Rebuild backend
ssh tatertot.work 'cd ~/projects/wic-app && docker compose build backend'

# Stop all services
ssh tatertot.work 'cd ~/projects/wic-app && docker compose down'

# Start all services
ssh tatertot.work 'cd ~/projects/wic-app && docker compose up -d'
```

### Android Development

```bash
# Install APK via ADB
adb install -r builds/wic-benefits.apk

# View app logs
adb logcat | grep -i wic

# Uninstall app
adb uninstall com.wicbenefits.app

# List connected devices
adb devices
```

### iOS Development

```bash
# List EAS builds
eas build:list

# View build details
eas build:view <build-id>

# Check credentials
eas credentials

# Submit to App Store
eas submit --platform ios
```

---

## Support & Troubleshooting

### Common Issues

**Issue:** Backend not responding after deployment
- **Solution:** Check logs: `ssh tatertot.work 'cd ~/projects/wic-app && docker compose logs backend'`

**Issue:** APK won't install on Android
- **Solution:** Enable "Unknown sources" and uninstall old version first

**Issue:** iOS build fails on EAS
- **Solution:** Check Apple Developer account status and credentials

**Issue:** Mobile app can't connect to backend
- **Solution:** Verify CORS settings in backend `.env` and firewall rules

### Getting Help

1. Check deployment logs
2. Verify SSH connectivity
3. Test backend health endpoint
4. Review Docker container status
5. Check firewall/network rules

---

## Next Steps

After successful deployment:

1. **Test End-to-End**
   - Install mobile app on physical device
   - Test barcode scanning
   - Verify backend API connectivity
   - Test benefits tracking

2. **Set Up Monitoring**
   - Uptime monitoring (e.g., UptimeRobot)
   - Error tracking (e.g., Sentry)
   - Performance monitoring (e.g., New Relic)

3. **Schedule Backups**
   - Daily database backups
   - Weekly full system backups
   - Test restore procedures

4. **Plan Updates**
   - Regular dependency updates
   - Security patches
   - Feature releases

---

## Related Documentation

- [ROADMAP.md](/Users/moses/projects/wic_project/ROADMAP.md) - Feature roadmap and priorities
- [deployment/DEPLOYMENT.md](/Users/moses/projects/wic_project/deployment/DEPLOYMENT.md) - Detailed VPS setup guide
- [deployment/BUILD_PRODUCTION_APK.md](/Users/moses/projects/wic_project/deployment/BUILD_PRODUCTION_APK.md) - Android build details
- [.claude/SESSION_STATE.md](/Users/moses/projects/wic_project/.claude/SESSION_STATE.md) - Current development state

---

*Last updated: 2026-02-02*
