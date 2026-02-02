#!/bin/bash
# WIC Android APK Build Script (B4.2)
# Builds production Android APK and optionally uploads to VPS
# Usage: ./scripts/build-android.sh [--upload]

set -e  # Exit on error

# Configuration
JAVA_HOME_PATH="/usr/local/opt/openjdk@17"
PROJECT_ROOT="/Users/moses/projects/wic_project"
APP_DIR="${PROJECT_ROOT}/app"
BUILD_OUTPUT="${APP_DIR}/android/app/build/outputs/apk/release/app-release.apk"
BUILDS_DIR="${PROJECT_ROOT}/builds"
APK_NAME="wic-benefits.apk"
SSH_HOST="tatertot.work"
REMOTE_APK_PATH="~/wic-app/deployment/wic-landing/${APK_NAME}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}WIC Android APK Build Script${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Check Java 17
echo -e "${BLUE}Step 1: Checking Java 17...${NC}"
if [ ! -d "${JAVA_HOME_PATH}" ]; then
    echo -e "${RED}❌ Java 17 not found at ${JAVA_HOME_PATH}${NC}"
    echo -e "${YELLOW}Install with: brew install openjdk@17${NC}"
    exit 1
fi

export JAVA_HOME="${JAVA_HOME_PATH}"
export PATH="${JAVA_HOME}/bin:$PATH"

JAVA_VERSION=$(${JAVA_HOME}/bin/java -version 2>&1 | head -n 1)
echo -e "${GREEN}✅ Using Java: ${JAVA_VERSION}${NC}"

# Navigate to app directory
cd "${APP_DIR}"

# Create builds directory
mkdir -p "${BUILDS_DIR}"

# Check for node_modules
echo ""
echo -e "${BLUE}Step 2: Checking dependencies...${NC}"
if [ ! -d "${APP_DIR}/node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Running npm install...${NC}"
    npm install
fi
echo -e "${GREEN}✅ Dependencies ready${NC}"

# Clean previous build
echo ""
echo -e "${BLUE}Step 3: Cleaning previous build...${NC}"
if [ -d "${APP_DIR}/android/app/build" ]; then
    rm -rf "${APP_DIR}/android/app/build"
    echo -e "${GREEN}✅ Build directory cleaned${NC}"
else
    echo -e "${YELLOW}⚠️  No previous build found (this is fine)${NC}"
fi

# Build APK
echo ""
echo -e "${BLUE}Step 4: Building release APK...${NC}"
echo -e "${YELLOW}This may take 2-3 minutes...${NC}"
./android/gradlew -p android assembleRelease

# Verify build
if [ ! -f "${BUILD_OUTPUT}" ]; then
    echo -e "${RED}❌ Build failed! APK not found at ${BUILD_OUTPUT}${NC}"
    exit 1
fi

# Get APK size
APK_SIZE=$(du -h "${BUILD_OUTPUT}" | cut -f1)
echo -e "${GREEN}✅ APK built successfully (${APK_SIZE})${NC}"

# Copy to builds directory with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VERSIONED_APK="${BUILDS_DIR}/wic-benefits_${TIMESTAMP}.apk"
cp "${BUILD_OUTPUT}" "${VERSIONED_APK}"
echo -e "${GREEN}✅ Saved to: ${VERSIONED_APK}${NC}"

# Create latest symlink
LATEST_APK="${BUILDS_DIR}/${APK_NAME}"
cp "${BUILD_OUTPUT}" "${LATEST_APK}"
echo -e "${GREEN}✅ Latest APK: ${LATEST_APK}${NC}"

# Print summary
echo ""
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}✅ Build Complete!${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo -e "${BLUE}Build Details:${NC}"
echo -e "  APK Size:      ${APK_SIZE}"
echo -e "  Build Output:  ${BUILD_OUTPUT}"
echo -e "  Versioned:     ${VERSIONED_APK}"
echo -e "  Latest:        ${LATEST_APK}"
echo ""

# Upload option
if [[ "$1" == "--upload" ]]; then
    echo -e "${BLUE}Step 5: Uploading to VPS...${NC}"

    # Test SSH connection
    if ! ssh -q -o BatchMode=yes -o ConnectTimeout=5 ${SSH_HOST} exit; then
        echo -e "${RED}❌ Cannot connect to ${SSH_HOST}${NC}"
        echo -e "${YELLOW}APK built but not uploaded. Use 'rsync -arvz ${LATEST_APK} ${SSH_HOST}:${REMOTE_APK_PATH}' manually.${NC}"
        exit 0
    fi

    # Upload APK
    echo -e "${YELLOW}Uploading to ${SSH_HOST}:${REMOTE_APK_PATH}${NC}"
    rsync -arvz --progress "${LATEST_APK}" "${SSH_HOST}:${REMOTE_APK_PATH}"

    echo -e "${GREEN}✅ APK uploaded successfully!${NC}"
    echo ""
    echo -e "${BLUE}Download URL:${NC} https://mdmichael.com/wic/downloads/${APK_NAME}"

else
    echo -e "${YELLOW}To upload to VPS, run:${NC}"
    echo -e "  ./scripts/build-android.sh --upload"
    echo ""
    echo -e "${YELLOW}Or manually:${NC}"
    echo -e "  rsync -arvz ${LATEST_APK} ${SSH_HOST}:${REMOTE_APK_PATH}"
fi

echo ""
echo -e "${YELLOW}Installation instructions:${NC}"
echo -e "  1. Enable 'Unknown sources' in Android settings"
echo -e "  2. Download APK from https://mdmichael.com/wic/"
echo -e "  3. Open APK file to install"
echo ""
echo -e "${YELLOW}Or install via ADB:${NC}"
echo -e "  adb install -r ${LATEST_APK}"
echo ""
