#!/bin/bash
# WIC iOS IPA Build Script (B4.3)
# Builds production iOS IPA using EAS Build
# Usage: ./scripts/build-ios.sh

set -e  # Exit on error

# Configuration
PROJECT_ROOT="/Users/moses/projects/wic_project"
APP_DIR="${PROJECT_ROOT}/app"
BUILDS_DIR="${PROJECT_ROOT}/builds"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}WIC iOS IPA Build Script${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo -e "${YELLOW}⚠️  EAS CLI not found. Installing...${NC}"
    echo ""
    echo -e "${BLUE}Run:${NC} npm install -g eas-cli"
    echo ""
    read -p "Install EAS CLI now? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm install -g eas-cli
        echo -e "${GREEN}✅ EAS CLI installed${NC}"
    else
        echo -e "${RED}❌ EAS CLI is required for iOS builds${NC}"
        exit 1
    fi
fi

# Check if logged into Expo
echo ""
echo -e "${BLUE}Step 1: Checking Expo authentication...${NC}"
if ! eas whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged into Expo account${NC}"
    echo ""
    echo -e "${BLUE}Please login to Expo:${NC}"
    eas login
fi

EXPO_USER=$(eas whoami)
echo -e "${GREEN}✅ Logged in as: ${EXPO_USER}${NC}"

# Navigate to app directory
cd "${APP_DIR}"

# Check for eas.json
echo ""
echo -e "${BLUE}Step 2: Checking EAS configuration...${NC}"
if [ ! -f "eas.json" ]; then
    echo -e "${YELLOW}⚠️  eas.json not found. Creating default configuration...${NC}"
    eas build:configure
else
    echo -e "${GREEN}✅ EAS configuration found${NC}"
fi

# Display build profile
echo ""
echo -e "${BLUE}Available build profiles:${NC}"
cat eas.json

# iOS requirements check
echo ""
echo -e "${BLUE}Step 3: Checking iOS requirements...${NC}"
echo ""
echo -e "${YELLOW}iOS Build Requirements:${NC}"
echo -e "  1. ${BLUE}Apple Developer Account${NC}"
echo -e "     - Individual: \$99/year"
echo -e "     - Organization: \$99/year"
echo -e "     - Sign up: https://developer.apple.com"
echo ""
echo -e "  2. ${BLUE}iOS Distribution Certificate${NC}"
echo -e "     - EAS can generate this automatically"
echo -e "     - Or upload existing certificate"
echo ""
echo -e "  3. ${BLUE}Provisioning Profile${NC}"
echo -e "     - EAS can generate this automatically"
echo -e "     - Linked to your app bundle ID"
echo ""

read -p "Do you have an Apple Developer account set up? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}=================================${NC}"
    echo -e "${YELLOW}iOS Build Prerequisites Needed${NC}"
    echo -e "${YELLOW}=================================${NC}"
    echo ""
    echo -e "${BLUE}1. Create Apple Developer Account:${NC}"
    echo -e "   https://developer.apple.com/programs/enroll/"
    echo ""
    echo -e "${BLUE}2. Configure bundle identifier in app.json:${NC}"
    echo -e "   \"ios\": {"
    echo -e "     \"bundleIdentifier\": \"com.wicbenefits.app\""
    echo -e "   }"
    echo ""
    echo -e "${BLUE}3. Run EAS build setup:${NC}"
    echo -e "   cd ${APP_DIR}"
    echo -e "   eas build:configure"
    echo ""
    echo -e "${BLUE}4. Build iOS app:${NC}"
    echo -e "   eas build --platform ios --profile production"
    echo ""
    echo -e "${BLUE}5. Download IPA when build completes:${NC}"
    echo -e "   The build will be available in your Expo dashboard"
    echo -e "   https://expo.dev/accounts/${EXPO_USER}/projects"
    echo ""
    echo -e "${YELLOW}Alternative: Build locally (requires Mac with Xcode)${NC}"
    echo -e "   npx expo run:ios --configuration Release"
    echo ""
    exit 0
fi

# Build iOS
echo ""
echo -e "${BLUE}Step 4: Starting iOS build...${NC}"
echo -e "${YELLOW}This will run on Expo's servers (cloud build)${NC}"
echo -e "${YELLOW}Build time: ~10-15 minutes${NC}"
echo ""

read -p "Start production iOS build? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Build cancelled.${NC}"
    exit 0
fi

# Start EAS build
echo ""
eas build --platform ios --profile production

echo ""
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}✅ Build submitted to EAS!${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo -e "${BLUE}Build status:${NC}"
echo -e "  View in browser: https://expo.dev/accounts/${EXPO_USER}/projects"
echo -e "  Check via CLI:   eas build:list"
echo ""
echo -e "${YELLOW}What happens next:${NC}"
echo -e "  1. EAS builds your iOS app in the cloud"
echo -e "  2. You'll receive an email when build completes"
echo -e "  3. Download the IPA from Expo dashboard"
echo -e "  4. Upload to App Store Connect or TestFlight"
echo ""
echo -e "${BLUE}Distribution options:${NC}"
echo -e "  - TestFlight (beta testing): Upload to App Store Connect"
echo -e "  - App Store: Full submission review process"
echo -e "  - Ad-hoc: Install on specific registered devices"
echo ""
