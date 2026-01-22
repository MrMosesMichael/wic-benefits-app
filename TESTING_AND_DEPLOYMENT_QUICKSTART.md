# Testing & Deployment Quick Start Guide

**For**: Moses & Testing Team
**Date**: 2026-01-22
**Goal**: Deploy and test the latest WIC app build

---

## 🚀 Quick Start (TL;DR)

### 1. Deploy Android Build - Local (10 minutes)
```bash
cd /Users/moses/projects/wic_project/app
npx expo start
# Press 'a' for Android
```
Or build APK:
```bash
cd android
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 2. Run Test Plan (2-3 hours)
Follow `TESTING_PLAN_v2.md` → Test all features → Report bugs

**Note**: Using local builds to save cloud build quota (8 remaining)

---

## 📋 What's Changed Since Last Testing?

### ✅ Previously Fixed (Already Tested)
- BUG-001: Scan Another Product button
- BUG-002: Cart confirmation truncated name
- BUG-003: UPC lookup normalization

### 🆕 New Features to Test
1. **Manual Benefits Entry** (Phase 5 complete)
   - Add benefits manually by category
   - Log purchases to track usage
   - Benefit period management
   - OCR statement scanning (if implemented)

2. **Backend Infrastructure** (Not directly testable yet)
   - Formula availability tracking
   - Shortage detection
   - Notification system (needs app integration)

---

## 📱 Step-by-Step: Deploy & Test

### Phase 1: Build & Deploy (10-15 minutes)

#### Option A: Local Dev Build (Recommended - Fast & Free)

**Prerequisites**: Android device connected via USB or emulator running

**Quick dev build**:
```bash
cd /Users/moses/projects/wic_project/app

# Ensure device connected
adb devices  # Should show your device

# Install dependencies
npm install

# Start Expo and build
npx expo start
# Press 'a' when menu appears
```

**What happens**:
- Builds app (5-10 min first time, 1-2 min after)
- Installs on device automatically
- Hot reload enabled for quick changes

#### Option B: Local APK Build (For Sharing)

**Generate installable APK**:
```bash
cd /Users/moses/projects/wic_project/app

# Regenerate android directory (fixes Gradle plugin issues)
npx expo prebuild --platform android --clean

# Build debug APK
cd android
./gradlew assembleDebug

# APK location:
# android/app/build/outputs/apk/debug/app-debug.apk

# Install on device
cd ..
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Or use Expo's build wrapper**:
```bash
cd /Users/moses/projects/wic_project/app
npx expo run:android --variant debug
# APK built and installed automatically
```

**Benefits**:
- ✅ Can share APK file with testers
- ✅ No dev server needed
- ✅ Standalone installation

**If you get Gradle plugin errors**: See `GRADLE_BUILD_FIX.md`

#### Option C: Cloud Build (AVOID - Quota Limited)

**Use ONLY for final release** (you have 8 builds remaining):
```bash
cd /Users/moses/projects/wic_project/app
eas build --platform android --profile preview
```

**Why avoid**: You have only 8 EAS builds left on free tier. Save them for:
- Final testing builds
- Production releases
- Sharing with external testers via QR code

### Phase 2: Execute Test Plan (2-3 hours)

**Open**: `TESTING_PLAN_v2.md`

**Test Sessions**:
1. **Scanner Regression** (30 min) - Verify bug fixes still work
2. **Manual Benefits Entry** (45 min) - New feature testing
3. **Integration Tests** (30 min) - Test features together
4. **Performance** (20 min) - Check speed and responsiveness

**For Each Test**:
- Follow exact steps
- Check expected results
- Take screenshots if bugs found
- Report using bug template

### Phase 3: Report & Review (30 minutes)

**Bug Reporting**:
```
**Bug ID**: BUG-XXX
**Severity**: Critical/High/Medium/Low
**Device**: [Your phone model]

**Steps to Reproduce**:
1. [Exact steps]
2. [What you did]
3. [What happened]

**Expected**: [What should happen]
**Actual**: [What actually happened]

**Screenshot**: [If available]
```

**After Testing**:
- Triage bugs by severity
- Prioritize fixes
- Plan next build

---

## 📚 Detailed Documentation

### For Deployment Details
**See**: `ANDROID_DEPLOYMENT_GUIDE_LOCAL.md`
- Local build setup and configuration
- Expo dev server vs APK builds
- Troubleshooting steps
- APK sharing methods
- When to use cloud builds (save your 8!)

### For Testing Details
**See**: `TESTING_PLAN_v2.md`
- Complete test scenarios
- Expected results for each test
- Bug reporting template
- Success criteria

---

## 🎯 Testing Priorities

### Must Test (Critical - P0)
1. ✅ Scanner still works after updates
2. ✅ Previous bug fixes still fixed
3. ✅ Manual benefits can be added
4. ✅ App doesn't crash
5. ✅ Data persists across restarts

### Should Test (Important - P1)
1. ✅ Manual benefits integrate with scanner
2. ✅ Shopping mode works
3. ✅ Offline mode functional
4. ✅ Performance acceptable

### Nice to Test (Optional - P2)
1. ✅ OCR statement scanning
2. ✅ Spanish language (if implemented)
3. ✅ Large dataset performance

---

## 🐛 Common Issues & Quick Fixes

### Issue: Local Build Fails

**Try**:
```bash
cd app
rm -rf node_modules
npm install

# Try dev build again
npx expo start
# Press 'a'

# Or try APK build
cd android
./gradlew clean
./gradlew assembleDebug
```

### Issue: APK Won't Install

**Try**:
```bash
# Uninstall old version first
adb uninstall com.wicbenefits.app

# Then install new
adb install path/to/app.apk
```

### Issue: Scanner Camera Black Screen

**Fix**: Grant camera permission
- Settings → Apps → WIC Benefits → Permissions → Camera → Allow

### Issue: Manual Entry Not Visible

**Check**: Feature may not be in this build yet
- Look for "Manual Entry" or "Add Benefits" button
- Check app/app/benefits/ directory has manual-entry.tsx

---

## 📊 Test Execution Checklist

### Before Testing
- [ ] APK built successfully
- [ ] APK installed on phone
- [ ] App opens without crash
- [ ] Camera permission granted
- [ ] Test UPCs ready
- [ ] Bug template prepared

### During Testing
- [ ] Test Session 1: Scanner regression
- [ ] Test Session 2: Manual benefits
- [ ] Test Session 3: Integration
- [ ] Test Session 4: Language (if applicable)
- [ ] Test Session 5: Performance
- [ ] Screenshots taken for bugs
- [ ] Notes documented

### After Testing
- [ ] Bugs filed with template
- [ ] Critical issues flagged
- [ ] Test results shared with team
- [ ] Next steps planned

---

## 🔄 Iterative Testing Cycle

```
┌─────────────┐
│   Build     │ ← eas build (30 min)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Deploy    │ ← Install APK (5 min)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Test     │ ← Follow test plan (2-3 hrs)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Report    │ ← File bugs (30 min)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Fix      │ ← Code changes
└──────┬──────┘
       │
       └───────┘
          ↑    │
          └────┘ Repeat until ready
```

---

## 🎓 Test Team Instructions

**For new testers**:

1. **Get the APK**
   - Download from link provided
   - Or scan QR code from build page

2. **Install on your Android phone**
   - Open APK file
   - Tap "Install"
   - May need to allow unknown sources

3. **Open the app**
   - Grant camera permission
   - Grant location permission (if asked)

4. **Follow test plan**
   - Open `TESTING_PLAN_v2.md`
   - Execute each test session
   - Document any issues

5. **Report bugs**
   - Use bug template in test plan
   - Include screenshots
   - Be specific about steps

6. **Provide feedback**
   - What worked well?
   - What was confusing?
   - Any suggestions?

---

## 📞 Need Help?

**Deployment Issues**:
→ Check `ANDROID_DEPLOYMENT_GUIDE.md`
→ Look at Troubleshooting section
→ Check EAS build logs

**Testing Questions**:
→ Check `TESTING_PLAN_v2.md`
→ Follow test steps exactly
→ Report if steps unclear

**App Crashes**:
→ Get logcat output: `adb logcat | grep -i wic`
→ Include in bug report
→ Note exact steps before crash

---

## ✅ Success Checklist

By end of testing, you should have:

- [x] Working APK deployed
- [x] All test sessions completed
- [x] Bugs documented with template
- [x] Critical issues identified
- [x] Screenshots collected
- [x] User feedback gathered
- [x] Next steps planned

---

## 🎯 Next Steps After Testing

1. **Review Results** - Team meeting to discuss findings
2. **Prioritize Bugs** - Critical fixes first
3. **Plan Sprint** - What to fix/improve next
4. **Update Backlog** - Document remaining work
5. **Schedule Retest** - When fixes are ready

---

**Let's make the WIC app better!** 🚀

Start with deployment, then dive into testing. Report everything you find.
