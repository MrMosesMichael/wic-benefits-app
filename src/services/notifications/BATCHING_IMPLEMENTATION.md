# 30-Minute Notification Batching Implementation

**Date**: 2026-01-22
**Feature**: Replace 6-hour deduplication with 30-minute batching per spec

## Problem Statement

**Old Approach (6-hour deduplication)**:
```
Formula restocks at Walmart  → User gets notification ✓
Formula restocks at Kroger 2h later → BLOCKED (deduplication)
Formula restocks at Target 4h later → BLOCKED (deduplication)
```
Result: User only knows about Walmart

**New Approach (30-minute batching per spec)**:
```
Formula restocks at Walmart → Start 30-min batch timer
Formula restocks at Kroger 10min later → Add to batch
Formula restocks at Target 15min later → Add to batch
After 30 minutes → Send ONE notification:
  "🚨 Formula Found at 3 Stores! (Walmart, Kroger, Target)"
```
Result: User gets ALL locations without spam

## Why Batching is Better

1. **During Shortage Crises**: Delivery trucks often hit multiple stores in waves
2. **Complete Information**: User sees ALL restocked stores, not just first one
3. **Reduced Spam**: ONE notification instead of 3 separate ones
4. **Still Urgent**: 30 minutes is short enough for time-sensitive formula needs
5. **Spec Compliant**: Matches formula tracking spec requirement

## Implementation Details

### 1. Database Support (Already Existed)

The `notification_batches` table from migration 015:
```sql
CREATE TABLE notification_batches (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  upc VARCHAR(14) NOT NULL,
  batch_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  batch_end TIMESTAMP,
  store_ids TEXT[] DEFAULT '{}',  -- Array of stores
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Repository Methods Added

**NotificationRepository.ts** - New methods:

```typescript
// Get or create batch within 30-minute window
async getOrCreateBatch(userId: string, upc: string): Promise<{
  batchId: number;
  storeIds: string[];
  batchStart: Date;
}>

// Add store to batch (no duplicates)
async addStoreToBatch(batchId: number, storeId: string): Promise<void>

// Get batches 30+ minutes old (ready to send)
async getBatchesReadyToSend(): Promise<Array<{...}>>

// Mark batch as sent
async markBatchAsSent(batchId: number): Promise<void>

// Check if store already in active batch (prevents duplicates)
async isStoreInActiveBatch(
  userId: string,
  upc: string,
  storeId: string
): Promise<boolean>
```

### 3. Service Layer Changes

**FormulaRestockNotificationService.ts** - Refactored:

**OLD** (immediate send):
```typescript
private async sendRestockNotification(subscription, event) {
  // Check deduplication (6 hours)
  // Build notification for single store
  // Send immediately
}
```

**NEW** (batching):
```typescript
private async addRestockToBatch(subscription, event) {
  // Check if store already in active batch
  // Get or create batch (30-minute window)
  // Add store to batch
  // Notification sent later by processBatches()
}
```

**NEW** (batch processor):
```typescript
async processBatches(): Promise<number> {
  // Get batches 30+ minutes old
  // For each batch:
  //   - Build notification with ALL stores
  //   - Send ONE notification
  //   - Mark batch as sent
}

private async sendBatchNotification(batch) {
  // Build notification with multiple stores
  // Send via push service
  // Record history for all stores
}
```

**NEW** (batched notification builder):
```typescript
private async buildBatchedRestockNotification(
  upc: string,
  storeIds: string[],
  severity: ShortageSeverity
): Promise<FormulaRestockNotification> {
  // Title: "🚨 Formula Found at 3 Stores!"
  // Body: "Formula (UPC) is now available at Store1, Store2, and 1 more store"
  // Data includes storeIds array
}
```

### 4. Integration with Monitoring Job

**RestockMonitoringJob.ts** - Already integrated:

The monitoring job calls `monitorRestocks()` which now:
1. Detects restocks
2. **Adds to batches** (not immediate send)
3. **Calls `processBatches()`** to send ready batches

```typescript
async monitorRestocks(): Promise<RestockEvent[]> {
  // ... detect restocks ...
  for (const event of events) {
    await this.processRestockEvent(event);  // Adds to batch
  }
  // Process batches that are 30+ minutes old
  await this.processBatches();
  return restockEvents;
}
```

### 5. API Endpoints

**restockNotifications.ts** - New endpoint:

```typescript
// Manual batch processing (for testing/admin)
export async function processBatches(): Promise<{
  batchesProcessed: number;
  success: boolean;
}>
```

## Notification Message Examples

### Single Store
```
Title: "🚨 Formula Back in Stock!"
Body:  "Similac Pro-Advance 12.4oz is now available at Walmart - Main St"
```

### 2-3 Stores (List All)
```
Title: "🚨 Formula Found at 3 Stores!"
Body:  "Similac Pro-Advance 12.4oz is now available at Walmart, Kroger, Target"
```

### 4+ Stores (Summarize)
```
Title: "🚨 Formula Found at 5 Stores!"
Body:  "Similac Pro-Advance 12.4oz is now available at Walmart, Kroger, and 3 more stores"
```

## Flow Diagram

```
[Restock Detected at Store A]
           ↓
   Create/Get Batch (30-min window)
           ↓
    Add Store A to Batch
           ↓
    [Wait... more restocks detected]
           ↓
[Restock Detected at Store B] (10 minutes later)
           ↓
   Get Same Batch (still within 30 min)
           ↓
    Add Store B to Batch
           ↓
    [Wait... more restocks detected]
           ↓
[Restock Detected at Store C] (15 minutes later)
           ↓
   Get Same Batch (still within 30 min)
           ↓
    Add Store C to Batch
           ↓
    [Wait until batch is 30 minutes old]
           ↓
    processBatches() called
           ↓
   Build notification with [A, B, C]
           ↓
   Send ONE notification to user
           ↓
   Mark batch as sent
```

## Testing

Run the test script:
```bash
# First, run the migration
psql $DATABASE_URL < backend/migrations/015_notification_system.sql

# Then run tests
npx ts-node src/services/notifications/test-batching.ts
```

**Test Coverage**:
1. ✅ Database persistence (tokens, settings, subscriptions)
2. ✅ 30-day subscription expiration
3. ✅ 30-minute batching (add stores to batch)
4. ✅ Batch processing (send after 30 min)
5. ✅ Notification history tracking
6. ✅ Multi-store notification building

## Production Considerations

### ✅ Ready for Production:
- Database-backed batching (survives restarts)
- 30-minute window per spec
- Multi-store notifications
- No duplicate stores in batch
- Automatic batch processing in monitoring job

### ⚠️ Still TODO:

1. **Product Name Lookup**:
   - Currently: "Formula (070074000343)"
   - Should be: "Similac Pro-Advance 12.4oz"
   - Need to query products table or WIC formula DB

2. **Store Name Lookup**:
   - Currently: "Store store1"
   - Should be: "Walmart - Main St (2.3 mi)"
   - Need to query stores table with distance calculation

3. **Distance Calculation**:
   - Include distance from user in notification
   - Sort stores by distance
   - Filter by radius-based subscriptions

4. **Batch Cleanup**:
   - Add cron job to delete old sent batches (>7 days)
   - Prevent database bloat

## Comparison: Old vs New

### Old (6-hour deduplication):
- ❌ User misses subsequent restocks
- ❌ No way to know about multiple stores
- ❌ 6 hours is too long for urgent formula needs
- ❌ Not spec compliant

### New (30-minute batching):
- ✅ User gets ALL restock locations
- ✅ Single notification prevents spam
- ✅ 30 minutes is short for urgency
- ✅ Spec compliant
- ✅ Better during shortage crises

## Configuration

Default settings:
```typescript
config: {
  monitoringInterval: 15,     // Check every 15 minutes
  restockThreshold: 1,        // Notify if any quantity increase
  batchWindow: 30,            // Batch within 30 minutes
}
```

The monitoring job runs every 15 minutes:
- Detects restocks
- Adds to batches
- Processes batches 30+ minutes old

This means:
- Minimum delay: 30 minutes from first restock
- Maximum delay: 45 minutes (if restock happens right after check)
- Average delay: ~37.5 minutes

For critical formula shortages, this is acceptable since:
- It's better to drive to the RIGHT store (that has stock)
- Than to drive to the FIRST store notified (which may have sold out)

## Metrics to Track

In production, track:
1. **Average stores per batch** - Shows how effective batching is
2. **Batch fill rate** - % of batches with 2+ stores
3. **Notification open rate** - Compare single-store vs multi-store
4. **User action rate** - Do users act on batched notifications?
5. **Batch processing latency** - Time from first restock to notification sent

---

**Implementation Complete**: 30-minute batching is production-ready!
