# Formula Restock Notification System

> A4.3 - Push notification system for formula availability alerts

## Overview

The notification system monitors formula availability and sends push notifications to users when formulas are restocked at stores they're watching. It integrates with the formula shortage detection system to prioritize critical notifications.

## Architecture

```
┌─────────────────────────────────────────────────┐
│         RestockMonitoringJob                     │
│  (Background job - runs every 15 minutes)        │
└───────────────┬─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│   FormulaRestockNotificationService              │
│   - Monitors availability changes                │
│   - Manages subscriptions                        │
│   - Detects restocks                             │
│   - Sends notifications                          │
└───────────┬─────────────────┬───────────────────┘
            │                 │
            ▼                 ▼
┌───────────────────┐  ┌────────────────────────┐
│ PushNotification  │  │ FormulaShortage        │
│ Service           │  │ DetectionService       │
│ (Expo Push API)   │  │ (Severity calculation) │
└───────────────────┘  └────────────────────────┘
```

## Key Features

1. **Automatic Restock Detection**: Monitors formula availability every 15 minutes
2. **Smart Prioritization**: Uses shortage severity to prioritize critical notifications
3. **Deduplication**: Prevents notification spam (6-hour window per store/formula)
4. **Quiet Hours**: Respects user sleep schedules (critical alerts bypass)
5. **Rate Limiting**: Configurable daily notification limits
6. **Location-Based**: Users can watch specific stores or radius-based

## Usage

### 1. Initialize on App Startup

```typescript
import { initializeRestockMonitoring } from './services/notifications';

// Start the monitoring job
initializeRestockMonitoring({
  intervalMinutes: 15,  // Check every 15 minutes
  enabled: true,
});
```

### 2. Register Push Token

```typescript
import { registerPushToken } from './api/notifications';

// When user grants push permission
const response = await registerPushToken({
  userId: 'user123',
  token: 'ExponentPushToken[abc123...]',
  deviceId: 'device456',
  platform: 'ios',
});
```

### 3. Subscribe to Formula Alerts

```typescript
import { subscribeToRestockNotifications } from './api/notifications';

// Subscribe to a specific formula at specific stores
await subscribeToRestockNotifications({
  userId: 'user123',
  upc: '123456789012',
  storeIds: ['store1', 'store2'],  // Optional: specific stores
  radius: 10,  // Optional: miles radius
});
```

### 4. Manage Subscriptions

```typescript
import {
  getUserSubscriptions,
  toggleSubscription,
  unsubscribeFromRestockNotifications,
} from './api/notifications';

// Get all subscriptions
const subs = await getUserSubscriptions({ userId: 'user123' });

// Pause a subscription
await toggleSubscription({
  userId: 'user123',
  upc: '123456789012',
  enabled: false,
});

// Unsubscribe completely
await unsubscribeFromRestockNotifications({
  userId: 'user123',
  upc: '123456789012',
});
```

### 5. Configure Notification Settings

```typescript
import { updateNotificationSettings } from './api/notifications';

await updateNotificationSettings({
  userId: 'user123',
  settings: {
    pushEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    maxNotificationsPerDay: 10,
  },
});
```

## Notification Priority Levels

| Shortage Severity | Notification Priority | Behavior |
|-------------------|----------------------|----------|
| Critical          | Critical             | Bypasses quiet hours & rate limits |
| High              | High                 | Bypasses quiet hours & rate limits |
| Moderate          | Normal               | Respects all settings |
| Low/None          | Normal               | Respects all settings |

## Restock Detection Logic

A restock is detected when:

1. Formula was out of stock → now in stock
2. Quantity increased significantly (threshold: 1+ units)
3. First time seeing availability data for this store/formula

## Deduplication

Notifications are deduplicated by:
- User ID + Store ID + UPC
- Time window: 6 hours (configurable)
- Prevents notification spam for the same restock event

## Background Job Configuration

```typescript
import { getRestockMonitoringJob } from './services/notifications';

const job = getRestockMonitoringJob();

// Get status
const status = job.getStatus();
console.log('Job running:', status.isRunning);

// Update configuration
job.updateConfig({
  intervalMinutes: 10,  // Change to 10 minutes
});

// Manually trigger (for testing)
const result = await job.triggerManually();
console.log('Restocks detected:', result.restocksDetected);

// Get statistics
const stats = job.getStats();
console.log('Total restocks:', stats.totalRestocksDetected);
```

## Production Considerations

### 1. Database Integration

Currently uses in-memory storage. In production:

```typescript
// Replace Maps with database queries
class FormulaRestockNotificationService {
  // Instead of: private subscriptions: Map<string, NotificationSubscription>
  // Use: SELECT * FROM notification_subscriptions WHERE enabled = true
}
```

### 2. Job Queue

Replace `RestockMonitoringJob` with proper job queue:

```typescript
// Use Bull, Agenda, or AWS SQS
import Queue from 'bull';

const restockQueue = new Queue('restock-monitoring');

restockQueue.process(async (job) => {
  const service = getFormulaRestockNotificationService();
  await service.monitorRestocks();
});

// Add recurring job
restockQueue.add({}, {
  repeat: { cron: '*/15 * * * *' }  // Every 15 minutes
});
```

### 3. Expo Push API

The `PushNotificationService` includes commented production code:

```typescript
// Uncomment and configure in production
const response = await fetch(this.EXPO_PUSH_API, {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(message),
});
```

### 4. Error Handling

Add retry logic and error tracking:

```typescript
// Use exponential backoff for failed notifications
// Log failures to monitoring service (Datadog, Sentry)
```

### 5. Scaling

For high volume:
- Batch Expo push messages (up to 100 per request)
- Use Redis for deduplication cache
- Implement priority queues for critical alerts
- Add rate limiting at service level

## Testing

```typescript
import { triggerRestockNotification } from './api/notifications';

// Manually trigger a restock notification
const result = await triggerRestockNotification({
  upc: '123456789012',
  storeId: 'store1',
  quantity: 5,
});

console.log('Notifications sent:', result.notificationsSent);
```

## Monitoring

```typescript
import { getNotificationStats } from './api/notifications';

const stats = await getNotificationStats({ userId: 'user123' });
console.log('Active subscriptions:', stats.activeSubscriptions);
console.log('Total notifications:', stats.totalNotifications);
console.log('Last notified:', stats.lastNotified);
```

## Dependencies

- `expo-notifications` - Expo push notification client (mobile)
- Expo Push API - Backend notification delivery
- Formula availability tracking (A4.1)
- Formula shortage detection (A4.2)

## Related Tasks

- A4.1 - Formula availability tracking
- A4.2 - Formula shortage detection algorithm
- A4.4 - Cross-store formula search
- A4.7 - Formula alert subscription system
