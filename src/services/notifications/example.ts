/**
 * Formula Restock Notification System - Usage Examples
 * A4.3 - Demonstrates how to use the notification system
 */

import {
  registerPushToken,
  subscribeToRestockNotifications,
  getUserSubscriptions,
  updateNotificationSettings,
  getNotificationStats,
  unsubscribeFromRestockNotifications,
} from '../../api/notifications';
import {
  initializeRestockMonitoring,
  getRestockMonitoringJob,
} from './RestockMonitoringJob';

/**
 * Example 1: App Initialization
 * Call this when the app starts
 */
export async function exampleAppInitialization() {
  console.log('=== Example: App Initialization ===');

  // Start the background monitoring job
  initializeRestockMonitoring({
    intervalMinutes: 15,  // Check every 15 minutes
    enabled: true,
  });

  console.log('✓ Restock monitoring started');
}

/**
 * Example 2: User Enables Push Notifications
 * Call this when user grants push notification permission
 */
export async function exampleRegisterPushToken(userId: string) {
  console.log('=== Example: Register Push Token ===');

  // In a real app, get the token from Expo Notifications
  // import * as Notifications from 'expo-notifications';
  // const token = (await Notifications.getExpoPushTokenAsync()).data;

  const mockToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

  await registerPushToken({
    userId,
    token: mockToken,
    deviceId: 'device123',
    platform: 'ios',
  });

  console.log('✓ Push token registered for user:', userId);
}

/**
 * Example 3: User Subscribes to Formula Alerts
 * Call this when user wants to watch a formula at specific stores
 */
export async function exampleSubscribeToFormula(
  userId: string,
  formulaUPC: string
) {
  console.log('=== Example: Subscribe to Formula ===');

  // Subscribe to formula at specific stores
  const response = await subscribeToRestockNotifications({
    userId,
    upc: formulaUPC,
    storeIds: ['store_abc123', 'store_def456'],  // Watch these stores
  });

  console.log('✓ Subscribed to formula:', formulaUPC);
  console.log('  Notification count:', response.subscription.notificationCount);
  console.log('  Created at:', response.subscription.createdAt);
}

/**
 * Example 4: User Subscribes with Radius
 * Watch all stores within a certain radius
 */
export async function exampleSubscribeWithRadius(
  userId: string,
  formulaUPC: string
) {
  console.log('=== Example: Subscribe with Radius ===');

  await subscribeToRestockNotifications({
    userId,
    upc: formulaUPC,
    radius: 10,  // Watch all stores within 10 miles
  });

  console.log('✓ Subscribed to formula within 10 miles');
}

/**
 * Example 5: Configure Notification Preferences
 * Set up quiet hours and rate limits
 */
export async function exampleConfigureSettings(userId: string) {
  console.log('=== Example: Configure Settings ===');

  await updateNotificationSettings({
    userId,
    settings: {
      pushEnabled: true,
      quietHoursStart: '22:00',  // 10 PM
      quietHoursEnd: '08:00',    // 8 AM
      maxNotificationsPerDay: 10,
    },
  });

  console.log('✓ Notification settings updated');
  console.log('  Quiet hours: 10 PM - 8 AM');
  console.log('  Max per day: 10');
}

/**
 * Example 6: View User's Subscriptions
 * Show all formulas the user is watching
 */
export async function exampleViewSubscriptions(userId: string) {
  console.log('=== Example: View Subscriptions ===');

  const response = await getUserSubscriptions({ userId });

  console.log(`✓ Found ${response.subscriptions.length} subscriptions:`);

  for (const sub of response.subscriptions) {
    console.log(`  - Formula ${sub.upc}`);
    console.log(`    Enabled: ${sub.enabled}`);
    console.log(`    Notifications sent: ${sub.notificationCount}`);
    if (sub.lastNotified) {
      console.log(`    Last notified: ${sub.lastNotified}`);
    }
  }
}

/**
 * Example 7: View Notification Statistics
 * See how many notifications the user has received
 */
export async function exampleViewStats(userId: string) {
  console.log('=== Example: View Statistics ===');

  const stats = await getNotificationStats({ userId });

  console.log('✓ Notification Statistics:');
  console.log(`  Active subscriptions: ${stats.activeSubscriptions}`);
  console.log(`  Total notifications: ${stats.totalNotifications}`);
  if (stats.lastNotified) {
    console.log(`  Last notified: ${stats.lastNotified}`);
  }
}

/**
 * Example 8: Unsubscribe from Formula
 * Stop watching a formula
 */
export async function exampleUnsubscribe(userId: string, formulaUPC: string) {
  console.log('=== Example: Unsubscribe ===');

  await unsubscribeFromRestockNotifications({
    userId,
    upc: formulaUPC,
  });

  console.log('✓ Unsubscribed from formula:', formulaUPC);
}

/**
 * Example 9: Monitor Job Status
 * Check the background job status
 */
export async function exampleMonitorJobStatus() {
  console.log('=== Example: Job Status ===');

  const job = getRestockMonitoringJob();
  const status = job.getStatus();

  console.log('✓ Background Job Status:');
  console.log(`  Running: ${status.isRunning}`);
  console.log(`  Enabled: ${status.enabled}`);
  console.log(`  Interval: ${status.config.intervalMinutes} minutes`);

  if (status.lastExecution) {
    console.log(`  Last execution: ${status.lastExecution.startTime}`);
    console.log(`  Restocks detected: ${status.lastExecution.restocksDetected}`);
    console.log(`  Success: ${status.lastExecution.success}`);
  }
}

/**
 * Example 10: Complete User Flow
 * Shows the full journey from setup to receiving notifications
 */
export async function exampleCompleteFlow() {
  console.log('\n=== Complete User Flow ===\n');

  const userId = 'user_12345';
  const formulaUPC = '070074000343'; // Example Similac UPC

  // Step 1: Initialize app (on app startup)
  console.log('Step 1: App starts...');
  await exampleAppInitialization();

  // Step 2: User grants push permission
  console.log('\nStep 2: User grants push notification permission...');
  await exampleRegisterPushToken(userId);

  // Step 3: User navigates to a formula and clicks "Notify Me"
  console.log('\nStep 3: User subscribes to formula alerts...');
  await exampleSubscribeToFormula(userId, formulaUPC);

  // Step 4: User configures notification preferences
  console.log('\nStep 4: User configures preferences...');
  await exampleConfigureSettings(userId);

  // Step 5: Background job runs (every 15 minutes)
  console.log('\nStep 5: Background job checks for restocks...');
  console.log('  [Job detects formula is back in stock at Store ABC]');
  console.log('  [Job checks shortage severity: HIGH]');
  console.log('  [Job sends CRITICAL priority notification]');
  console.log('  📱 User receives: "🚨 Formula Back in Stock!"');

  // Step 6: User views their notification history
  console.log('\nStep 6: User views statistics...');
  await exampleViewStats(userId);

  // Step 7: User views all subscriptions
  console.log('\nStep 7: User views subscriptions...');
  await exampleViewSubscriptions(userId);

  console.log('\n=== Flow Complete ===\n');
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('\n🚀 Running Formula Restock Notification Examples\n');
  console.log('='.repeat(50));

  try {
    await exampleCompleteFlow();

    console.log('\n' + '='.repeat(50));
    console.log('✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Uncomment to run examples:
// runAllExamples();
