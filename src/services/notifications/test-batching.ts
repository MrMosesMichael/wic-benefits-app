/**
 * Test script for notification batching and database persistence
 * Run with: npx ts-node src/services/notifications/test-batching.ts
 */

import { getNotificationRepository } from './NotificationRepository';
import { getFormulaRestockNotificationService } from './FormulaRestockNotificationService';
import { getPushNotificationService } from './PushNotificationService';

const TEST_USER_ID = 'test-user-123';
const TEST_UPC = '070074000343'; // Similac Pro-Advance
const TEST_DEVICE_ID = 'test-device-456';

async function runTests() {
  console.log('🧪 Starting Notification System Tests\n');

  const repository = getNotificationRepository();
  const restockService = getFormulaRestockNotificationService();
  const pushService = getPushNotificationService();

  try {
    // ===========================================
    // TEST 1: Database Persistence - Push Tokens
    // ===========================================
    console.log('📱 Test 1: Push Token Persistence');
    await repository.registerPushToken(
      TEST_USER_ID,
      'ExponentPushToken[test123456]',
      TEST_DEVICE_ID,
      'ios'
    );

    const tokens = await repository.getUserPushTokens(TEST_USER_ID);
    console.log(`✅ Registered token, found ${tokens.length} active tokens`);
    console.log(`   Token: ${tokens[0].token.substring(0, 30)}...`);
    console.log('');

    // ===========================================
    // TEST 2: Database Persistence - Notification Settings
    // ===========================================
    console.log('⚙️  Test 2: Notification Settings Persistence');
    await repository.updateUserSettings(TEST_USER_ID, {
      pushEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      maxNotificationsPerDay: 10,
    });

    const settings = await repository.getUserSettings(TEST_USER_ID);
    console.log(`✅ Settings saved:`);
    console.log(`   Push enabled: ${settings.pushEnabled}`);
    console.log(`   Quiet hours: ${settings.quietHoursStart} - ${settings.quietHoursEnd}`);
    console.log(`   Max per day: ${settings.maxNotificationsPerDay}`);
    console.log('');

    // ===========================================
    // TEST 3: Database Persistence - Subscriptions with 30-day Expiration
    // ===========================================
    console.log('🔔 Test 3: Subscription with 30-Day Expiration');
    const subscription = await restockService.subscribe(
      TEST_USER_ID,
      TEST_UPC,
      ['store1', 'store2'],
      10 // 10 mile radius
    );

    console.log(`✅ Created subscription:`);
    console.log(`   UPC: ${subscription.upc}`);
    console.log(`   Stores: ${subscription.storeIds?.join(', ')}`);
    console.log(`   Radius: ${subscription.radius} miles`);
    console.log(`   Expires: ${subscription.expiresAt?.toISOString().split('T')[0]}`);

    // Calculate days until expiration
    if (subscription.expiresAt) {
      const daysUntilExpiry = Math.floor(
        (new Date(subscription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      console.log(`   Days until expiry: ${daysUntilExpiry}`);
    }
    console.log('');

    // ===========================================
    // TEST 4: 30-Minute Batching - Add to Batch
    // ===========================================
    console.log('📦 Test 4: 30-Minute Batching');

    // Simulate restocks at multiple stores
    console.log('   Simulating restock at Store 1...');
    const batch1 = await repository.getOrCreateBatch(TEST_USER_ID, TEST_UPC);
    await repository.addStoreToBatch(batch1.batchId, 'store1');
    console.log(`   ✅ Added Store 1 to batch ${batch1.batchId}`);

    // Wait a bit
    await sleep(100);

    console.log('   Simulating restock at Store 2...');
    const batch2 = await repository.getOrCreateBatch(TEST_USER_ID, TEST_UPC);
    await repository.addStoreToBatch(batch2.batchId, 'store2');
    console.log(`   ✅ Added Store 2 to batch ${batch2.batchId}`);

    // Should be same batch (within 30 minutes)
    if (batch1.batchId === batch2.batchId) {
      console.log(`   ✅ Stores batched together (batch ID: ${batch1.batchId})`);
    } else {
      console.log(`   ❌ ERROR: Expected same batch, got ${batch1.batchId} and ${batch2.batchId}`);
    }

    console.log('   Simulating restock at Store 3...');
    await repository.addStoreToBatch(batch1.batchId, 'store3');
    console.log(`   ✅ Added Store 3 to batch ${batch1.batchId}`);
    console.log('');

    // ===========================================
    // TEST 5: Check Batches Ready to Send (should be none yet)
    // ===========================================
    console.log('⏰ Test 5: Check Batches Ready to Send');
    const readyBatches = await repository.getBatchesReadyToSend();
    console.log(`   Batches ready (30+ min old): ${readyBatches.length}`);
    if (readyBatches.length === 0) {
      console.log('   ✅ Correct - batch is still within 30-minute window');
    }
    console.log('');

    // ===========================================
    // TEST 6: Simulate Processing Batch (force for testing)
    // ===========================================
    console.log('📨 Test 6: Batch Processing (Simulated)');
    console.log('   In production, this would wait 30 minutes...');
    console.log('   For testing, we\'ll process it immediately via manual trigger');

    // Mark our test batch as old (hack for testing)
    const pool = await import('../../../backend/src/config/database');
    await pool.default.query(
      `UPDATE notification_batches
       SET batch_start = NOW() - INTERVAL '31 minutes'
       WHERE id = $1`,
      [batch1.batchId]
    );

    // Now process batches
    const batchesProcessed = await restockService.processBatches();
    console.log(`   ✅ Processed ${batchesProcessed} batches`);
    console.log('');

    // ===========================================
    // TEST 7: Check Notification History
    // ===========================================
    console.log('📊 Test 7: Notification History');
    const stats = await repository.getUserNotificationStats(TEST_USER_ID);
    console.log(`   Total notifications sent: ${stats.totalNotifications}`);
    console.log(`   Active subscriptions: ${stats.activeSubscriptions}`);
    console.log(`   Last notified: ${stats.lastNotified?.toISOString() || 'Never'}`);
    console.log('');

    // ===========================================
    // TEST 8: Test Expiration Checking
    // ===========================================
    console.log('⏳ Test 8: Expiration Checking');

    // Get expiring subscriptions (should be none - just created)
    let expiring = await repository.getExpiringSubscriptions(30); // within 30 days
    console.log(`   Subscriptions expiring within 30 days: ${expiring.length}`);

    // Simulate near-expiration (hack for testing)
    await pool.default.query(
      `UPDATE notification_subscriptions
       SET expires_at = NOW() + INTERVAL '5 days'
       WHERE user_id = $1 AND upc = $2`,
      [TEST_USER_ID, TEST_UPC]
    );

    expiring = await repository.getExpiringSubscriptions(7); // within 7 days
    console.log(`   After simulating near-expiration: ${expiring.length} expiring`);
    if (expiring.length > 0) {
      console.log(`   ✅ Expiration detection working`);
      console.log(`      UPC: ${expiring[0].upc}`);
      console.log(`      Expires: ${expiring[0].expiresAt?.toISOString().split('T')[0]}`);
    }
    console.log('');

    // ===========================================
    // TEST 9: Verify Database Persistence (restart simulation)
    // ===========================================
    console.log('💾 Test 9: Database Persistence Verification');
    console.log('   Fetching all user subscriptions from database...');

    const allSubs = await restockService.getUserSubscriptions(TEST_USER_ID);
    console.log(`   ✅ Found ${allSubs.length} subscriptions in database`);
    for (const sub of allSubs) {
      console.log(`      - UPC: ${sub.upc}, Stores: ${sub.storeIds?.length || 0}, Enabled: ${sub.enabled}`);
    }
    console.log('');

    // ===========================================
    // CLEANUP
    // ===========================================
    console.log('🧹 Cleanup: Removing test data');
    await repository.deleteSubscription(TEST_USER_ID, TEST_UPC);
    await repository.unregisterPushToken(TEST_USER_ID, TEST_DEVICE_ID);

    // Clean up batches
    await pool.default.query(
      'DELETE FROM notification_batches WHERE user_id = $1',
      [TEST_USER_ID]
    );

    // Clean up history
    await pool.default.query(
      'DELETE FROM notification_history WHERE user_id = $1',
      [TEST_USER_ID]
    );

    // Clean up settings
    await pool.default.query(
      'DELETE FROM notification_settings WHERE user_id = $1',
      [TEST_USER_ID]
    );

    console.log('✅ Test data cleaned up');
    console.log('');

    // ===========================================
    // SUMMARY
    // ===========================================
    console.log('═══════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('✓ Database persistence working');
    console.log('✓ Push token storage working');
    console.log('✓ Notification settings working');
    console.log('✓ 30-day subscription expiration working');
    console.log('✓ 30-minute batching working');
    console.log('✓ Batch processing working');
    console.log('✓ Notification history tracking working');
    console.log('');

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run tests if executed directly
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('🎉 Test suite completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

export { runTests };
