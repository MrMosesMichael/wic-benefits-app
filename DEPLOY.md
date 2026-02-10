# WIC Benefits App - Quick Deploy Guide

> **One-page reference for deploying the WIC Benefits App**

---

## Prerequisites

**Required:**
- SSH access to `tatertot.work` VPS
- Java 17: `brew install openjdk@17`
- Node.js and npm installed

**Optional (for iOS):**
- Expo account (free): `eas login`
- Apple Developer account ($99/year)

---

## Quick Start

### 1. Deploy Backend

```bash
./scripts/deploy-backend.sh
```

**What it does:**
- Syncs backend code to VPS via rsync
- Rebuilds and restarts Docker containers
- Verifies health endpoint

**Verify:**
```bash
curl https://mdmichael.com/wic/health
# Should return: {"status":"healthy","database":"connected"}
```

---

### 2. Build Android APK

```bash
# Build only
./scripts/build-android.sh

# Build and upload to VPS
./scripts/build-android.sh --upload
```

**Output:**
- APK location: `builds/wic-benefits.apk`
- VPS location: `~/projects/wic-app/deployment/wic-landing/wic-benefits.apk`
- Public URL: https://mdmichael.com/wic/downloads/wic-benefits.apk

**Install:**
```bash
# Via ADB
adb install -r builds/wic-benefits.apk

# Or download on Android device from:
# https://mdmichael.com/wic/
```

---

### 3. Build iOS IPA (Optional)

```bash
./scripts/build-ios.sh
```

**Interactive guide that:**
- Checks EAS CLI installation
- Verifies Expo authentication
- Checks Apple Developer requirements
- Submits cloud build to Expo

---

## Common Tasks

### Check Deployment Status

```bash
# Test backend health
curl https://mdmichael.com/wic/health

# View backend logs
ssh tatertot.work 'cd ~/projects/wic-app && docker compose logs -f backend'

# Check container status
ssh tatertot.work 'cd ~/projects/wic-app && docker compose ps'
```

### Database Backup

```bash
# Create backup on VPS
ssh tatertot.work 'cd ~/projects/wic-app && docker compose exec postgres pg_dump -U wic_admin wic_benefits > backup_$(date +%Y%m%d).sql'

# Download backup locally
rsync -arvz tatertot.work:~/projects/wic-app/backup_*.sql ./backups/
```

### Restart Services

```bash
# Restart backend only
ssh tatertot.work 'cd ~/projects/wic-app && docker compose restart backend'

# Restart all services
ssh tatertot.work 'cd ~/projects/wic-app && docker compose restart'
```

---

## Troubleshooting

### SSH Connection Fails

```bash
# Test SSH
ssh tatertot.work

# Check SSH config
cat ~/.ssh/config | grep -A 5 "tatertot.work"

# Add to ~/.ssh/config if missing:
# Host tatertot.work
#     HostName <your-vps-ip>
#     User <your-username>
#     IdentityFile ~/.ssh/id_rsa
```

### Backend Not Responding

```bash
# View logs
ssh tatertot.work 'cd ~/projects/wic-app && docker compose logs backend'

# Check if containers are running
ssh tatertot.work 'cd ~/projects/wic-app && docker compose ps'

# Restart backend
ssh tatertot.work 'cd ~/projects/wic-app && docker compose restart backend'
```

### Android APK Won't Install

```bash
# Uninstall old version
adb uninstall com.wicbenefits.app

# Reinstall
adb install -r builds/wic-benefits.apk

# On device: Enable "Install from unknown sources"
# Settings → Security → Unknown sources
```

### Java Version Error

```bash
# Check Java version
/usr/local/opt/openjdk@17/bin/java -version

# Install Java 17
brew install openjdk@17

# Set JAVA_HOME
export JAVA_HOME=/usr/local/opt/openjdk@17
```

---

## Full Deployment Workflow

**Complete production deployment:**

```bash
# 1. Deploy backend
./scripts/deploy-backend.sh

# 2. Verify backend
curl https://mdmichael.com/wic/health

# 3. Build and upload Android APK
./scripts/build-android.sh --upload

# 4. Build iOS (optional)
./scripts/build-ios.sh

# 5. Test mobile app
# Install APK on device and verify connectivity
```

---

## Architecture

```
Production Stack (tatertot.work VPS):

Internet → Traefik (443) → wic-backend (3000) → wic-postgres (5432)
                    ↓
            mdmichael.com/wic/
            ├── /health         → Backend health check
            ├── /api/v1/*       → Backend API
            └── /downloads/*.apk → Android APK

Mobile Apps → https://mdmichael.com/wic/api/v1/
```

---

## Environment Variables

**Backend (.env on VPS):**
```bash
POSTGRES_PASSWORD=<strong-password>
DATABASE_URL=postgresql://wic_admin:<password>@postgres:5432/wic_benefits
CORS_ORIGIN=https://mdmichael.com,https://www.mdmichael.com
```

**Mobile App (app/lib/services/api.ts):**
```typescript
const API_BASE_URL = __DEV__
  ? 'http://192.168.12.94:3000/api/v1'  // Dev
  : 'https://mdmichael.com/wic/api/v1'; // Production
```

---

## Production URLs

- **Backend API:** https://mdmichael.com/wic/api/v1/
- **Health Check:** https://mdmichael.com/wic/health
- **Android APK:** https://mdmichael.com/wic/downloads/wic-benefits.apk
- **Landing Page:** https://mdmichael.com/wic/

---

## Detailed Documentation

For complete documentation, see:
- **[/scripts/README.md](/Users/moses/projects/wic_project/scripts/README.md)** - Script usage reference
- **[/docs/deployment.md](/Users/moses/projects/wic_project/docs/deployment.md)** - Complete deployment guide (23K)
- **[/deployment/DEPLOYMENT.md](/Users/moses/projects/wic_project/deployment/DEPLOYMENT.md)** - VPS setup guide
- **[/deployment/BUILD_PRODUCTION_APK.md](/Users/moses/projects/wic_project/deployment/BUILD_PRODUCTION_APK.md)** - Android build details

---

## Script Locations

```
scripts/
├── deploy-backend.sh      # B4.1: Deploy backend to VPS
├── build-android.sh       # B4.2: Build Android APK
├── build-ios.sh          # B4.3: Build iOS IPA
└── README.md             # Quick reference
```

---

*Deploy scripts: B4.1-B4.4 | Last updated: 2026-02-02*
