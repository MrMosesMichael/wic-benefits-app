# WIC Benefits App - Troubleshooting Guide

**Last Updated:** January 18, 2026

---

## Understanding the App Architecture

**Important:** This project has **TWO separate servers**:

### 1. Backend (Node.js/Express API)
- **Location:** `/backend` directory
- **Port:** 3000
- **Purpose:** REST API for data (database, eligibility, formula, etc.)
- **URL:** `http://192.168.12.94:3000` or `http://localhost:3000`
- **What you see:** JSON responses (not web pages)
- **Example:** `http://192.168.12.94:3000/health` returns `{"status":"healthy"}`

### 2. Frontend (React Native/Expo App)
- **Location:** `/app` directory
- **Port:** 8081 (Metro bundler)
- **Purpose:** Mobile app that runs on your phone/device
- **URL:** Expo serves at `http://192.168.12.94:8081` (but you don't visit this in browser)
- **What you see:** Mobile app on your device via Expo Go

---

## Common Confusion ⚠️

**"Why is http://192.168.12.94:3000/ not showing anything?"**

✅ **This is normal!** The backend is a REST API, not a website.

- ❌ Visiting `http://192.168.12.94:3000/` in a browser → Shows nothing or error
- ✅ Visiting `http://192.168.12.94:3000/health` → Returns `{"status":"healthy"}`
- ✅ Visiting `http://192.168.12.94:3000/api/v1/benefits?household_id=1` → Returns JSON data

**The backend is NOT meant to be viewed in a browser directly.**
It's an API that the mobile app talks to.

---

## Quick Status Check

### Check Backend Status
```bash
# From /backend directory
curl http://localhost:3000/health
# Should return: {"status":"healthy","database":"connected"}

# Test API endpoint
curl http://localhost:3000/api/v1/benefits?household_id=1
# Should return JSON with benefits data
```

### Check Frontend Status
```bash
# From /app directory
# Look for "Metro waiting on exp://..." message
# Should show QR code and expo URL
```

---

## How to Troubleshoot Issues

### 🔍 Step 1: Identify Which Server Has Issues

**Backend issues:**
- Can't fetch data in app
- API errors in app
- Database connection errors

**Frontend issues:**
- App won't load on device
- White screen
- Metro bundler errors

---

## Backend Troubleshooting

### Check if Backend is Running

```bash
# Method 1: Check health endpoint
curl http://localhost:3000/health

# Method 2: Check process
ps aux | grep "node dist/index.js" | grep -v grep
# Should show running node process

# Method 3: Check port
lsof -i :3000
# Should show node process listening on port 3000
```

### Backend Not Running?

**Start the backend:**
```bash
cd /Users/moses/projects/wic_project/backend
npm start
```

**Or with auto-restart on changes:**
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Backend Logs Location

**Console output:**
- Backend logs print directly to terminal where you ran `npm start`
- No separate log files (unless configured)

**To see logs:**
1. Look at terminal where backend is running
2. Or if running in background, check process output:
   ```bash
   # Find backend process ID
   ps aux | grep "node dist/index.js"

   # Then check Claude task output if started via Claude
   tail -f /private/tmp/claude/-Users-moses-projects/tasks/TASK_ID.output
   ```

### Common Backend Errors

**Error: "Cannot find module"**
```bash
# Solution: Rebuild TypeScript
npm run build
npm start
```

**Error: "EADDRINUSE: Port 3000 already in use"**
```bash
# Solution: Kill existing process
lsof -i :3000  # Find PID
kill -9 PID    # Replace PID with actual number

# Or kill all node processes (careful!)
pkill -f "node dist/index.js"
```

**Error: "Database connection failed"**
```bash
# Check PostgreSQL is running
psql wic_benefits -c "SELECT 1"

# Check .env file exists
cat /Users/moses/projects/wic_project/backend/.env

# Should contain:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=wic_benefits
# DB_USER=your_user
# DB_PASSWORD=your_password
```

---

## Frontend (Expo) Troubleshooting

### Check if Expo is Running

```bash
# Check process
ps aux | grep "expo start" | grep -v grep
# Should show expo process

# Or navigate to app directory and check
cd /Users/moses/projects/wic_project/app
# Look for running Metro bundler output
```

### Expo Not Running?

**Start Expo:**
```bash
cd /Users/moses/projects/wic_project/app
npx expo start

# Or for specific platform
npx expo start --android
npx expo start --ios
```

### Expo Logs Location

**Console output:**
- Expo logs print to terminal where you ran `npx expo start`

**Device logs (when app is running on device):**
1. Look at terminal - Expo shows device logs in real-time
2. Or press `j` in Expo terminal to open debugger
3. Or check device console:
   - Android: `adb logcat *:E` (errors only)
   - iOS: Xcode → Devices → Your Device → Console

**Metro bundler logs:**
- Printed in same terminal as `npx expo start`
- Shows bundle progress, warnings, errors

### Common Expo Errors

**Error: "Unable to resolve module"**
```bash
# Solution: Clear cache and reinstall
cd /Users/moses/projects/wic_project/app
rm -rf node_modules
npm install
npx expo start --clear
```

**Error: "Network response timed out"**
```bash
# Solution: Check WiFi and backend
# 1. Ensure phone and laptop on same WiFi
# 2. Check backend is running: curl http://192.168.12.94:3000/health
# 3. Check API_BASE_URL in app/lib/services/api.ts
```

**Error: "Metro bundler crashed"**
```bash
# Solution: Restart with clear cache
npx expo start --clear

# Or remove cache manually
rm -rf /Users/moses/projects/wic_project/app/.expo
rm -rf /Users/moses/projects/wic_project/app/node_modules/.cache
```

---

## Testing API Endpoints

### Useful Test Commands

```bash
# Health check
curl http://192.168.12.94:3000/health

# Get benefits
curl http://192.168.12.94:3000/api/v1/benefits?household_id=1

# Check eligibility
curl http://192.168.12.94:3000/api/v1/eligibility/016000275256

# Get cart
curl http://192.168.12.94:3000/api/v1/cart?household_id=1

# Search formula
curl "http://192.168.12.94:3000/api/v1/formula/availability?radius=10"

# Get sightings
curl http://192.168.12.94:3000/api/v1/sightings/0886926045833
```

### Test with Postman or HTTPie

**Install HTTPie (better than curl):**
```bash
brew install httpie
```

**Use HTTPie:**
```bash
http GET http://192.168.12.94:3000/health
http GET http://192.168.12.94:3000/api/v1/benefits household_id==1
```

---

## Quick Restart Everything

### Full Restart (Both Servers)

```bash
# Kill all Node processes (backend + frontend)
pkill -f node

# Restart backend
cd /Users/moses/projects/wic_project/backend
npm start &

# Wait 3 seconds for backend to start
sleep 3

# Restart frontend
cd /Users/moses/projects/wic_project/app
npx expo start
```

### Just Backend

```bash
cd /Users/moses/projects/wic_project/backend
pkill -f "node dist/index.js"
npm start
```

### Just Frontend

```bash
# Press Ctrl+C in Expo terminal, then:
npx expo start --clear
```

---

## Network Issues

### Phone Can't Reach Backend

**Check 1: Same WiFi network**
```bash
# On laptop, check your IP
ipconfig getifaddr en0  # WiFi interface
# Should show 192.168.12.94 or similar

# Ensure phone connected to SAME WiFi network
```

**Check 2: Firewall**
```bash
# macOS: Allow incoming connections
# System Preferences → Security & Privacy → Firewall
# Allow node to accept incoming connections
```

**Check 3: Backend listening on correct interface**
```bash
# Check backend is listening on 0.0.0.0 (all interfaces)
lsof -i :3000
# Should show: *:3000 (LISTEN)
```

**Fix:** Ensure backend index.ts has:
```typescript
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
```

---

## File Locations Reference

### Backend Files
```
/Users/moses/projects/wic_project/backend/
├── src/
│   ├── index.ts              # Main server file
│   ├── routes/               # API endpoints
│   ├── config/database.ts    # DB connection
│   └── scripts/              # Utilities
├── dist/                     # Compiled JavaScript (built from src/)
├── migrations/               # Database migrations
├── .env                      # Environment variables (DB credentials)
└── package.json
```

### Frontend Files
```
/Users/moses/projects/wic_project/app/
├── app/                      # Screens (index.tsx, scanner/, benefits/, etc.)
├── lib/
│   ├── services/api.ts       # API service layer
│   └── types/index.ts        # TypeScript types
├── .expo/                    # Expo cache (safe to delete)
└── package.json
```

### Logs & Temp Files
```
/private/tmp/claude/-Users-moses-projects/tasks/
└── TASK_ID.output            # Background task logs (if run via Claude)

# No permanent log files - all logs go to console
```

---

## Development Workflow

### Typical Development Session

```bash
# Terminal 1: Backend
cd /Users/moses/projects/wic_project/backend
npm run dev  # Auto-restarts on code changes

# Terminal 2: Frontend
cd /Users/moses/projects/wic_project/app
npx expo start

# Terminal 3: Database (if needed)
psql wic_benefits

# Terminal 4: Testing API
curl http://192.168.12.94:3000/api/v1/...
```

### When You Make Code Changes

**Backend changes:**
- If using `npm run dev`: Auto-restarts ✅
- If using `npm start`: Restart manually
  ```bash
  pkill -f "node dist/index.js"
  npm run build && npm start
  ```

**Frontend changes:**
- Expo watches files and auto-reloads ✅
- If not working, press `r` in Expo terminal to reload

**Database schema changes:**
- Run migration script
  ```bash
  cd /Users/moses/projects/wic_project/backend
  npm run migrate
  ```

---

## Debugging Tips

### Enable Verbose Logging

**Backend:**
```typescript
// Add to src/index.ts
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

**Frontend:**
```typescript
// Add to lib/services/api.ts
axios.interceptors.request.use(request => {
  console.log('Request:', request);
  return request;
});
```

### Check Database Queries

```bash
# PostgreSQL query logging
# Edit postgresql.conf:
log_statement = 'all'

# Or run queries manually
psql wic_benefits -c "SELECT * FROM households;"
```

### Network Debugging

```bash
# Check what's listening on ports
lsof -i :3000  # Backend
lsof -i :8081  # Expo Metro

# Check network connectivity
ping 192.168.12.94

# Trace API call
curl -v http://192.168.12.94:3000/health
```

---

## Common Scenarios

### "App shows white screen on device"
1. Check Expo terminal for errors
2. Press `r` in Expo terminal to reload
3. Shake device → Reload
4. Clear cache: `npx expo start --clear`

### "API calls fail with network error"
1. Check backend running: `curl http://192.168.12.94:3000/health`
2. Check same WiFi network
3. Check IP in app/lib/services/api.ts matches laptop IP
4. Check firewall allows Node

### "Database connection failed"
1. Check PostgreSQL running: `psql wic_benefits -c "SELECT 1"`
2. Check .env file has correct credentials
3. Run migrations if needed: `npm run migrate`

### "TypeScript compilation errors"
```bash
cd /Users/moses/projects/wic_project/backend
rm -rf dist/
npm run build
```

---

## Getting Help

### Check These First
1. ✅ Backend health: `curl http://192.168.12.94:3000/health`
2. ✅ Expo running: Look for QR code in terminal
3. ✅ Same WiFi: Phone and laptop
4. ✅ Console logs: Check both terminals

### Useful Commands Summary

```bash
# Status checks
curl http://192.168.12.94:3000/health        # Backend health
ps aux | grep node                            # All node processes
lsof -i :3000                                 # What's on port 3000
lsof -i :8081                                 # What's on port 8081

# Restart
pkill -f node                                 # Kill all node
cd backend && npm start                       # Start backend
cd app && npx expo start                      # Start frontend

# Logs
tail -f /path/to/expo/terminal               # Expo logs (in terminal)
# Backend logs also in terminal where npm start ran

# Database
psql wic_benefits                            # Connect to DB
psql wic_benefits -c "\dt"                   # List tables
```

---

## Quick Reference

| Issue | Check | Fix |
|-------|-------|-----|
| Backend not responding | `curl localhost:3000/health` | `cd backend && npm start` |
| Expo not loading | `ps aux \| grep expo` | `cd app && npx expo start` |
| Network errors in app | Same WiFi? Firewall? | Check IP, firewall settings |
| White screen on device | Expo terminal errors? | `npx expo start --clear` |
| Database errors | PostgreSQL running? | `psql wic_benefits` |
| TypeScript errors | Compilation failed? | `npm run build` |

---

**Remember:** Backend (port 3000) is a REST API, not a website. You test it with curl/Postman, not a browser.
