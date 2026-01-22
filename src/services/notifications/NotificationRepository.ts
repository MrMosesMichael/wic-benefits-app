/**
 * Notification Repository
 * Database layer for notification system (A4.3)
 */

import pool from '../../../backend/src/config/database';
import {
  NotificationSubscription,
  NotificationSettings,
  PushToken,
  NotificationDeliveryResult,
} from '../../types/notification';

export interface SubscriptionRow {
  id: number;
  user_id: string;
  upc: string;
  radius: number | null;
  enabled: boolean;
  notification_count: number;
  last_notified_at: Date | null;
  created_at: Date;
  expires_at: Date;
  updated_at: Date;
}

export interface PushTokenRow {
  id: number;
  user_id: string;
  token: string;
  device_id: string;
  platform: 'ios' | 'android' | 'web';
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationSettingsRow {
  id: number;
  user_id: string;
  push_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  max_notifications_per_day: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Repository for notification database operations
 */
export class NotificationRepository {

  // ============================================
  // SUBSCRIPTION OPERATIONS
  // ============================================

  /**
   * Create a new notification subscription
   */
  async createSubscription(
    userId: string,
    upc: string,
    storeIds?: string[],
    radius?: number
  ): Promise<NotificationSubscription> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Insert subscription
      const subResult = await client.query<SubscriptionRow>(
        `INSERT INTO notification_subscriptions
         (user_id, upc, radius, enabled, notification_count, created_at, expires_at)
         VALUES ($1, $2, $3, true, 0, NOW(), NOW() + INTERVAL '30 days')
         ON CONFLICT (user_id, upc)
         DO UPDATE SET
           enabled = true,
           radius = EXCLUDED.radius,
           expires_at = NOW() + INTERVAL '30 days',
           updated_at = NOW()
         RETURNING *`,
        [userId, upc, radius]
      );

      const subscription = subResult.rows[0];

      // Insert store associations if provided
      if (storeIds && storeIds.length > 0) {
        // Delete old store associations
        await client.query(
          'DELETE FROM subscription_stores WHERE subscription_id = $1',
          [subscription.id]
        );

        // Insert new ones
        const storeValues = storeIds.map((storeId, idx) =>
          `($1, $${idx + 2})`
        ).join(',');

        await client.query(
          `INSERT INTO subscription_stores (subscription_id, store_id)
           VALUES ${storeValues}
           ON CONFLICT (subscription_id, store_id) DO NOTHING`,
          [subscription.id, ...storeIds]
        );
      }

      await client.query('COMMIT');

      // Fetch store IDs
      const stores = await this.getSubscriptionStores(subscription.id);

      return this.mapSubscriptionRow(subscription, stores);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get subscription stores
   */
  async getSubscriptionStores(subscriptionId: number): Promise<string[]> {
    const result = await pool.query(
      'SELECT store_id FROM subscription_stores WHERE subscription_id = $1',
      [subscriptionId]
    );
    return result.rows.map(row => row.store_id);
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(userId: string, upc: string): Promise<void> {
    await pool.query(
      'DELETE FROM notification_subscriptions WHERE user_id = $1 AND upc = $2',
      [userId, upc]
    );
  }

  /**
   * Get user's subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<NotificationSubscription[]> {
    const result = await pool.query<SubscriptionRow>(
      `SELECT * FROM notification_subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    const subscriptions: NotificationSubscription[] = [];

    for (const row of result.rows) {
      const stores = await this.getSubscriptionStores(row.id);
      subscriptions.push(this.mapSubscriptionRow(row, stores));
    }

    return subscriptions;
  }

  /**
   * Get all active subscriptions for a UPC
   */
  async getActiveSubscriptionsByUPC(upc: string): Promise<NotificationSubscription[]> {
    const result = await pool.query<SubscriptionRow>(
      `SELECT * FROM notification_subscriptions
       WHERE upc = $1 AND enabled = true AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [upc]
    );

    const subscriptions: NotificationSubscription[] = [];

    for (const row of result.rows) {
      const stores = await this.getSubscriptionStores(row.id);
      subscriptions.push(this.mapSubscriptionRow(row, stores));
    }

    return subscriptions;
  }

  /**
   * Toggle subscription enabled/disabled
   */
  async toggleSubscription(userId: string, upc: string, enabled: boolean): Promise<void> {
    await pool.query(
      `UPDATE notification_subscriptions
       SET enabled = $3, updated_at = NOW()
       WHERE user_id = $1 AND upc = $2`,
      [userId, upc, enabled]
    );
  }

  /**
   * Update subscription notification stats
   */
  async updateSubscriptionStats(userId: string, upc: string): Promise<void> {
    await pool.query(
      `UPDATE notification_subscriptions
       SET notification_count = notification_count + 1,
           last_notified_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1 AND upc = $2`,
      [userId, upc]
    );
  }

  /**
   * Get expiring subscriptions (for 30-day prompt)
   */
  async getExpiringSubscriptions(daysUntilExpiry: number = 0): Promise<NotificationSubscription[]> {
    const result = await pool.query<SubscriptionRow>(
      `SELECT ns.* FROM notification_subscriptions ns
       LEFT JOIN subscription_expiration_prompts sep
         ON ns.id = sep.subscription_id AND sep.responded_at IS NULL
       WHERE ns.enabled = true
         AND ns.expires_at <= NOW() + INTERVAL '${daysUntilExpiry} days'
         AND ns.expires_at > NOW()
         AND sep.id IS NULL
       ORDER BY ns.expires_at ASC`,
      []
    );

    const subscriptions: NotificationSubscription[] = [];

    for (const row of result.rows) {
      const stores = await this.getSubscriptionStores(row.id);
      subscriptions.push(this.mapSubscriptionRow(row, stores));
    }

    return subscriptions;
  }

  /**
   * Record expiration prompt
   */
  async recordExpirationPrompt(subscriptionId: number): Promise<void> {
    await pool.query(
      `INSERT INTO subscription_expiration_prompts (subscription_id, prompted_at)
       VALUES ($1, NOW())`,
      [subscriptionId]
    );
  }

  /**
   * Record user response to expiration prompt
   */
  async recordExpirationResponse(
    subscriptionId: number,
    response: 'keep_active' | 'try_alternatives' | 'cancel'
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update prompt response
      await client.query(
        `UPDATE subscription_expiration_prompts
         SET user_response = $2, responded_at = NOW()
         WHERE subscription_id = $1 AND responded_at IS NULL`,
        [subscriptionId, response]
      );

      // Handle subscription based on response
      if (response === 'keep_active') {
        // Extend expiration by 30 days
        await client.query(
          `UPDATE notification_subscriptions
           SET expires_at = NOW() + INTERVAL '30 days', updated_at = NOW()
           WHERE id = $1`,
          [subscriptionId]
        );
      } else if (response === 'cancel') {
        // Disable subscription
        await client.query(
          `UPDATE notification_subscriptions
           SET enabled = false, updated_at = NOW()
           WHERE id = $1`,
          [subscriptionId]
        );
      }
      // 'try_alternatives' doesn't change subscription - user can explore alternatives

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================
  // PUSH TOKEN OPERATIONS
  // ============================================

  /**
   * Register a push token
   */
  async registerPushToken(
    userId: string,
    token: string,
    deviceId: string,
    platform: 'ios' | 'android' | 'web'
  ): Promise<void> {
    await pool.query(
      `INSERT INTO push_tokens (user_id, token, device_id, platform, active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (user_id, device_id)
       DO UPDATE SET token = EXCLUDED.token, active = true, updated_at = NOW()`,
      [userId, token, deviceId, platform]
    );
  }

  /**
   * Unregister a push token
   */
  async unregisterPushToken(userId: string, deviceId: string): Promise<void> {
    await pool.query(
      'UPDATE push_tokens SET active = false, updated_at = NOW() WHERE user_id = $1 AND device_id = $2',
      [userId, deviceId]
    );
  }

  /**
   * Get user's active push tokens
   */
  async getUserPushTokens(userId: string): Promise<PushToken[]> {
    const result = await pool.query<PushTokenRow>(
      'SELECT * FROM push_tokens WHERE user_id = $1 AND active = true',
      [userId]
    );

    return result.rows.map(row => ({
      userId: row.user_id,
      token: row.token,
      deviceId: row.device_id,
      platform: row.platform,
    }));
  }

  // ============================================
  // NOTIFICATION SETTINGS OPERATIONS
  // ============================================

  /**
   * Get user's notification settings
   */
  async getUserSettings(userId: string): Promise<NotificationSettings> {
    const result = await pool.query<NotificationSettingsRow>(
      'SELECT * FROM notification_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Return defaults
      return {
        pushEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        maxNotificationsPerDay: 10,
      };
    }

    const row = result.rows[0];
    return {
      pushEnabled: row.push_enabled,
      quietHoursStart: row.quiet_hours_start,
      quietHoursEnd: row.quiet_hours_end,
      maxNotificationsPerDay: row.max_notifications_per_day,
    };
  }

  /**
   * Update user's notification settings
   */
  async updateUserSettings(userId: string, settings: NotificationSettings): Promise<void> {
    await pool.query(
      `INSERT INTO notification_settings
       (user_id, push_enabled, quiet_hours_start, quiet_hours_end, max_notifications_per_day)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id)
       DO UPDATE SET
         push_enabled = EXCLUDED.push_enabled,
         quiet_hours_start = EXCLUDED.quiet_hours_start,
         quiet_hours_end = EXCLUDED.quiet_hours_end,
         max_notifications_per_day = EXCLUDED.max_notifications_per_day,
         updated_at = NOW()`,
      [
        userId,
        settings.pushEnabled,
        settings.quietHoursStart,
        settings.quietHoursEnd,
        settings.maxNotificationsPerDay,
      ]
    );
  }

  // ============================================
  // NOTIFICATION HISTORY OPERATIONS
  // ============================================

  /**
   * Record a sent notification
   */
  async recordNotification(
    userId: string,
    subscriptionId: number | null,
    notificationType: string,
    upc: string,
    storeId: string,
    priority: string,
    title: string,
    body: string,
    expoReceiptId?: string
  ): Promise<void> {
    await pool.query(
      `INSERT INTO notification_history
       (user_id, subscription_id, notification_type, upc, store_id, priority, title, body, expo_receipt_id, delivered_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [userId, subscriptionId, notificationType, upc, storeId, priority, title, body, expoReceiptId]
    );
  }

  /**
   * Check if notification was recently sent (for deduplication)
   */
  async wasRecentlySent(
    userId: string,
    upc: string,
    storeId: string,
    windowHours: number
  ): Promise<boolean> {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM notification_history
       WHERE user_id = $1 AND upc = $2 AND store_id = $3
         AND delivered_at > NOW() - INTERVAL '${windowHours} hours'`,
      [userId, upc, storeId]
    );

    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Get notification count for user today
   */
  async getTodayNotificationCount(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM notification_history
       WHERE user_id = $1 AND delivered_at > CURRENT_DATE`,
      [userId]
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * Get notification statistics for user
   */
  async getUserNotificationStats(userId: string): Promise<{
    totalNotifications: number;
    lastNotified: Date | null;
    activeSubscriptions: number;
  }> {
    const statsResult = await pool.query(
      `SELECT
         COUNT(*) as total,
         MAX(delivered_at) as last_notified
       FROM notification_history
       WHERE user_id = $1`,
      [userId]
    );

    const subsResult = await pool.query(
      `SELECT COUNT(*) as active FROM notification_subscriptions
       WHERE user_id = $1 AND enabled = true AND expires_at > NOW()`,
      [userId]
    );

    return {
      totalNotifications: parseInt(statsResult.rows[0].total),
      lastNotified: statsResult.rows[0].last_notified,
      activeSubscriptions: parseInt(subsResult.rows[0].active),
    };
  }

  // ============================================
  // BATCH NOTIFICATION OPERATIONS (30-minute batching)
  // ============================================

  /**
   * Get or create a notification batch for user/upc within 30-minute window
   */
  async getOrCreateBatch(userId: string, upc: string): Promise<{
    batchId: number;
    storeIds: string[];
    batchStart: Date;
  }> {
    // Check for existing unsent batch within last 30 minutes
    const result = await pool.query(
      `SELECT id, store_ids, batch_start
       FROM notification_batches
       WHERE user_id = $1
         AND upc = $2
         AND sent = false
         AND batch_start > NOW() - INTERVAL '30 minutes'
       ORDER BY batch_start DESC
       LIMIT 1`,
      [userId, upc]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        batchId: row.id,
        storeIds: row.store_ids || [],
        batchStart: row.batch_start,
      };
    }

    // Create new batch
    const newBatch = await pool.query(
      `INSERT INTO notification_batches (user_id, upc, batch_start, store_ids, sent)
       VALUES ($1, $2, NOW(), '{}', false)
       RETURNING id, store_ids, batch_start`,
      [userId, upc]
    );

    return {
      batchId: newBatch.rows[0].id,
      storeIds: [],
      batchStart: newBatch.rows[0].batch_start,
    };
  }

  /**
   * Add a store to a notification batch
   */
  async addStoreToBatch(batchId: number, storeId: string): Promise<void> {
    await pool.query(
      `UPDATE notification_batches
       SET store_ids = array_append(store_ids, $2)
       WHERE id = $1
         AND NOT ($2 = ANY(store_ids))`,  // Don't add duplicates
      [batchId, storeId]
    );
  }

  /**
   * Get batches ready to send (30 minutes old, not yet sent)
   */
  async getBatchesReadyToSend(): Promise<Array<{
    batchId: number;
    userId: string;
    upc: string;
    storeIds: string[];
    batchStart: Date;
  }>> {
    const result = await pool.query(
      `SELECT id, user_id, upc, store_ids, batch_start
       FROM notification_batches
       WHERE sent = false
         AND batch_start <= NOW() - INTERVAL '30 minutes'
       ORDER BY batch_start ASC`
    );

    return result.rows.map(row => ({
      batchId: row.id,
      userId: row.user_id,
      upc: row.upc,
      storeIds: row.store_ids || [],
      batchStart: row.batch_start,
    }));
  }

  /**
   * Mark batch as sent
   */
  async markBatchAsSent(batchId: number): Promise<void> {
    await pool.query(
      `UPDATE notification_batches
       SET sent = true, batch_end = NOW()
       WHERE id = $1`,
      [batchId]
    );
  }

  /**
   * Check if store was already added to batch for this restock
   * (prevents duplicate additions during same monitoring cycle)
   */
  async isStoreInActiveBatch(
    userId: string,
    upc: string,
    storeId: string
  ): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1
       FROM notification_batches
       WHERE user_id = $1
         AND upc = $2
         AND $3 = ANY(store_ids)
         AND sent = false
         AND batch_start > NOW() - INTERVAL '30 minutes'
       LIMIT 1`,
      [userId, upc, storeId]
    );

    return result.rows.length > 0;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Map database row to NotificationSubscription type
   */
  private mapSubscriptionRow(row: SubscriptionRow, storeIds: string[]): NotificationSubscription {
    return {
      userId: row.user_id,
      upc: row.upc,
      storeIds: storeIds.length > 0 ? storeIds : undefined,
      radius: row.radius ?? undefined,
      enabled: row.enabled,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      lastNotified: row.last_notified_at ?? undefined,
      notificationCount: row.notification_count,
    };
  }
}

// Singleton instance
let notificationRepository: NotificationRepository | null = null;

export function getNotificationRepository(): NotificationRepository {
  if (!notificationRepository) {
    notificationRepository = new NotificationRepository();
  }
  return notificationRepository;
}
