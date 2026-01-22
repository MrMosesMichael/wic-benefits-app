# Testing Guide: Notification System with Batching

## Prerequisites

1. **PostgreSQL running** with DATABASE_URL configured
2. **Database migration applied**:
   ```bash
   psql $DATABASE_URL < backend/migrations/015_notification_system.sql
   ```

## Running the Tests

### Option 1: Automated Test Script

```bash
cd /Users/moses/projects/wic_project
npx ts-node src/services/notifications/test-batching.ts
```

**What it tests**:
- ✅ Push token persistence
- ✅ Notification settings storage
- ✅ Subscription creation with 30-day expiration
- ✅ 30-minute batching (adding stores to batch)
- ✅ Batch processing (sending batched notifications)
- ✅ Notification history tracking
- ✅ Expiration detection
- ✅ Database persistence across "restarts"

**Expected output**:
```
🧪 Starting Notification System Tests

📱 Test 1: Push Token Persistence
✅ Registered token, found 1 active tokens
   Token: ExponentPushToken[test123456]...

⚙️  Test 2: Notification Settings Persistence
✅ Settings saved:
   Push enabled: true
   Quiet hours: 22:00 - 08:00
   Max per day: 10

🔔 Test 3: Subscription with 30-Day Expiration
✅ Created subscription:
   UPC: 070074000343
   Stores: store1, store2
   Radius: 10 miles
   Expires: 2026-02-21
   Days until expiry: 30

📦 Test 4: 30-Minute Batching
   Simulating restock at Store 1...
   ✅ Added Store 1 to batch 1
   Simulating restock at Store 2...
   ✅ Added Store 2 to batch 1
   ✅ Stores batched together (batch ID: 1)
   Simulating restock at Store 3...
   ✅ Added Store 3 to batch 1

⏰ Test 5: Check Batches Ready to Send
   Batches ready (30+ min old): 0
   ✅ Correct - batch is still within 30-minute window

📨 Test 6: Batch Processing (Simulated)
   In production, this would wait 30 minutes...
   For testing, we'll process it immediately via manual trigger
   ✅ Processed 1 batches

📊 Test 7: Notification History
   Total notifications sent: 3
   Active subscriptions: 1
   Last notified: 2026-01-22T...

⏳ Test 8: Expiration Checking
   Subscriptions expiring within 30 days: 1
   After simulating near-expiration: 1 expiring
   ✅ Expiration detection working
      UPC: 070074000343
      Expires: 2026-01-27

💾 Test 9: Database Persistence Verification
   Fetching all user subscriptions from database...
   ✅ Found 1 subscriptions in database
      - UPC: 070074000343, Stores: 2, Enabled: true

🧹 Cleanup: Removing test data
✅ Test data cleaned up

═══════════════════════════════════════
✅ ALL TESTS PASSED!
═══════════════════════════════════════

✓ Database persistence working
✓ Push token storage working
✓ Notification settings working
✓ 30-day subscription expiration working
✓ 30-minute batching working
✓ Batch processing working
✓ Notification history tracking working

🎉 Test suite completed successfully
```

### Option 2: Manual Testing via API

If you have the backend running, you can test via API calls:

```bash
# 1. Register push token
curl -X POST http://localhost:3000/api/v1/notifications/push-token \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "manual-test-user",
    "token": "ExponentPushToken[test]",
    "deviceId": "device123",
    "platform": "ios"
  }'

# 2. Subscribe to formula restock alerts
curl -X POST http://localhost:3000/api/v1/notifications/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "manual-test-user",
    "upc": "070074000343",
    "storeIds": ["store1", "store2"],
    "radius": 10
  }'

# 3. Check subscriptions
curl http://localhost:3000/api/v1/notifications/subscriptions?userId=manual-test-user

# 4. Manually trigger restock (simulates restock detected)
curl -X POST http://localhost:3000/api/v1/notifications/trigger-restock \
  -H "Content-Type: application/json" \
  -d '{
    "upc": "070074000343",
    "storeId": "store1",
    "quantity": 5
  }'

# 5. Check batches ready to process
curl -X POST http://localhost:3000/api/v1/notifications/process-batches

# 6. Get notification stats
curl http://localhost:3000/api/v1/notifications/stats?userId=manual-test-user

# 7. Check expiring subscriptions
curl http://localhost:3000/api/v1/notifications/expiring?userId=manual-test-user
```

### Option 3: Database Verification

Directly query the database to verify persistence:

```sql
-- Check push tokens
SELECT * FROM push_tokens WHERE user_id = 'test-user-123';

-- Check subscriptions
SELECT * FROM notification_subscriptions WHERE user_id = 'test-user-123';

-- Check subscription stores
SELECT ss.*
FROM subscription_stores ss
JOIN notification_subscriptions ns ON ns.id = ss.subscription_id
WHERE ns.user_id = 'test-user-123';

-- Check batches
SELECT * FROM notification_batches WHERE user_id = 'test-user-123';

-- Check notification history
SELECT * FROM notification_history WHERE user_id = 'test-user-123';

-- Check notification settings
SELECT * FROM notification_settings WHERE user_id = 'test-user-123';

-- Check expiring subscriptions (within 7 days)
SELECT *
FROM notification_subscriptions
WHERE expires_at <= NOW() + INTERVAL '7 days'
  AND expires_at > NOW()
  AND enabled = true;
```

## Troubleshooting

### Error: "relation notification_subscriptions does not exist"

**Solution**: Run the migration first
```bash
psql $DATABASE_URL < backend/migrations/015_notification_system.sql
```

### Error: "Cannot find module"

**Solution**: Install dependencies
```bash
npm install
# or
yarn install
```

### Error: "Connection refused" to database

**Solution**: Check DATABASE_URL and ensure PostgreSQL is running
```bash
echo $DATABASE_URL
psql $DATABASE_URL -c "SELECT 1"
```

### Test fails with "No batches processed"

**Expected**: The test script manually updates batch timestamps to simulate 30+ minutes passing. If this fails, check:
```sql
-- Verify batch was created
SELECT * FROM notification_batches;

-- Manually age the batch
UPDATE notification_batches
SET batch_start = NOW() - INTERVAL '31 minutes'
WHERE sent = false;
```

## Continuous Testing

For ongoing development:

1. **Run tests after code changes**:
   ```bash
   npm test
   # or for this specific test
   npx ts-node src/services/notifications/test-batching.ts
   ```

2. **Check database state** after each test run
3. **Monitor logs** for error messages
4. **Verify cleanup** - test script should clean up all test data

## Integration Testing

To test the full flow (requires backend running):

1. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the monitoring job:
   ```bash
   npx ts-node src/services/notifications/start-monitoring.ts
   ```

3. Subscribe to a formula (via API or app)

4. Simulate restocks (trigger via API or wait for real availability changes)

5. Wait 30 minutes or manually trigger batch processing

6. Check notification was sent and history recorded

## Success Criteria

All tests should:
- ✅ Run without errors
- ✅ Create records in database
- ✅ Clean up test data
- ✅ Show "ALL TESTS PASSED" message

Database should show:
- ✅ Records persist after test script exits
- ✅ Subscriptions have correct 30-day expiration
- ✅ Batches correctly group stores within 30-minute window
- ✅ Notification history tracks all sent notifications
- ✅ Settings and tokens stored correctly

---

**Ready to test!** Run the automated test script to verify everything works.
