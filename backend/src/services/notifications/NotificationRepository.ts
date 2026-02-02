import pool from '../../config/database';
import type { PoolClient } from 'pg';

export interface PushToken {
  id: number;
  user_id: string;
  token: string;
  device_id: string;
  platform: 'ios' | 'android' | 'web';
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationSubscription {
  id: number;
  user_id: string;
  upc: string;
  radius?: number;
  enabled: boolean;
  notification_count: number;
  last_notified_at?: Date;
  created_at: Date;
  expires_at: Date;
  updated_at: Date;
}

export interface NotificationSettings {
  id: number;
  user_id: string;
  push_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  max_notifications_per_day: number;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationHistory {
  id: number;
  user_id: string;
  subscription_id?: number;
  notification_type: string;
  upc: string;
  store_id: string;
  priority: string;
  title: string;
  body: string;
  delivered_at: Date;
  delivery_status: string;
  expo_receipt_id?: string;
}

export class NotificationRepository {
  /**
   * Register or update a push token for a user's device
   */
  async registerPushToken(
    userId: string,
    token: string,
    deviceId: string,
    platform: 'ios' | 'android' | 'web'
  ): Promise<PushToken> {
    const result = await pool.query<PushToken>(
      `INSERT INTO push_tokens (user_id, token, device_id, platform, active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (user_id, device_id)
       DO UPDATE SET token = $2, platform = $4, active = true, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, token, deviceId, platform]
    );
    return result.rows[0];
  }

  /**
   * Get all active push tokens for a user
   */
  async getUserPushTokens(userId: string): Promise<PushToken[]> {
    const result = await pool.query<PushToken>(
      'SELECT * FROM push_tokens WHERE user_id = $1 AND active = true',
      [userId]
    );
    return result.rows;
  }

  /**
   * Deactivate a push token
   */
  async deactivatePushToken(userId: string, deviceId: string): Promise<void> {
    await pool.query(
      'UPDATE push_tokens SET active = false WHERE user_id = $1 AND device_id = $2',
      [userId, deviceId]
    );
  }

  /**
   * Create or update a formula restock subscription
   */
  async createSubscription(
    userId: string,
    upc: string,
    radius?: number,
    storeIds?: string[]
  ): Promise<NotificationSubscription> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert or update subscription
      const subResult = await client.query<NotificationSubscription>(
        `INSERT INTO notification_subscriptions (user_id, upc, radius, enabled)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (user_id, upc)
         DO UPDATE SET
           radius = COALESCE($3, notification_subscriptions.radius),
           enabled = true,
           expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days',
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, upc, radius || null]
      );

      const subscription = subResult.rows[0];

      // If store IDs provided, update subscription_stores
      if (storeIds && storeIds.length > 0) {
        // Delete existing store associations
        await client.query(
          'DELETE FROM subscription_stores WHERE subscription_id = $1',
          [subscription.id]
        );

        // Insert new store associations
        for (const storeId of storeIds) {
          await client.query(
            'INSERT INTO subscription_stores (subscription_id, store_id) VALUES ($1, $2)',
            [subscription.id, storeId]
          );
        }
      }

      await client.query('COMMIT');
      return subscription;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's active subscriptions with store details
   */
  async getUserSubscriptions(userId: string): Promise<(NotificationSubscription & { store_ids: string[] })[]> {
    const result = await pool.query(
      `SELECT
         ns.*,
         COALESCE(array_agg(ss.store_id) FILTER (WHERE ss.store_id IS NOT NULL), '{}') as store_ids
       FROM notification_subscriptions ns
       LEFT JOIN subscription_stores ss ON ns.id = ss.subscription_id
       WHERE ns.user_id = $1 AND ns.enabled = true AND ns.expires_at > CURRENT_TIMESTAMP
       GROUP BY ns.id
       ORDER BY ns.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Get a specific subscription by ID
   */
  async getSubscription(subscriptionId: number): Promise<NotificationSubscription | null> {
    const result = await pool.query<NotificationSubscription>(
      'SELECT * FROM notification_subscriptions WHERE id = $1',
      [subscriptionId]
    );
    return result.rows[0] || null;
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(subscriptionId: number, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM notification_subscriptions WHERE id = $1 AND user_id = $2',
      [subscriptionId, userId]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Get or create notification settings for a user
   */
  async getUserSettings(userId: string): Promise<NotificationSettings> {
    let result = await pool.query<NotificationSettings>(
      'SELECT * FROM notification_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default settings
      result = await pool.query<NotificationSettings>(
        `INSERT INTO notification_settings (user_id, push_enabled, quiet_hours_start, quiet_hours_end, max_notifications_per_day)
         VALUES ($1, true, '22:00:00', '08:00:00', 10)
         RETURNING *`,
        [userId]
      );
    }

    return result.rows[0];
  }

  /**
   * Update notification settings
   */
  async updateSettings(
    userId: string,
    settings: Partial<Omit<NotificationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<NotificationSettings> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (settings.push_enabled !== undefined) {
      setClauses.push(`push_enabled = $${paramIndex++}`);
      values.push(settings.push_enabled);
    }
    if (settings.quiet_hours_start !== undefined) {
      setClauses.push(`quiet_hours_start = $${paramIndex++}`);
      values.push(settings.quiet_hours_start);
    }
    if (settings.quiet_hours_end !== undefined) {
      setClauses.push(`quiet_hours_end = $${paramIndex++}`);
      values.push(settings.quiet_hours_end);
    }
    if (settings.max_notifications_per_day !== undefined) {
      setClauses.push(`max_notifications_per_day = $${paramIndex++}`);
      values.push(settings.max_notifications_per_day);
    }

    values.push(userId);

    const result = await pool.query<NotificationSettings>(
      `UPDATE notification_settings
       SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Record a notification delivery
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
    deliveryStatus: string,
    expoReceiptId?: string
  ): Promise<NotificationHistory> {
    const result = await pool.query<NotificationHistory>(
      `INSERT INTO notification_history
       (user_id, subscription_id, notification_type, upc, store_id, priority, title, body, delivery_status, expo_receipt_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [userId, subscriptionId, notificationType, upc, storeId, priority, title, body, deliveryStatus, expoReceiptId]
    );

    return result.rows[0];
  }

  /**
   * Check if user has been notified recently (deduplication)
   */
  async hasRecentNotification(
    userId: string,
    upc: string,
    storeId: string,
    withinMinutes: number = 30
  ): Promise<boolean> {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM notification_history
       WHERE user_id = $1
         AND upc = $2
         AND store_id = $3
         AND delivered_at > CURRENT_TIMESTAMP - INTERVAL '${withinMinutes} minutes'`,
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
       WHERE user_id = $1
         AND delivered_at > CURRENT_DATE`,
      [userId]
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * Get active subscriptions for a formula UPC
   */
  async getSubscriptionsForFormula(upc: string): Promise<NotificationSubscription[]> {
    const result = await pool.query<NotificationSubscription>(
      `SELECT * FROM notification_subscriptions
       WHERE upc = $1
         AND enabled = true
         AND expires_at > CURRENT_TIMESTAMP`,
      [upc]
    );
    return result.rows;
  }

  /**
   * Update subscription notification stats
   */
  async updateSubscriptionStats(subscriptionId: number): Promise<void> {
    await pool.query(
      `UPDATE notification_subscriptions
       SET notification_count = notification_count + 1,
           last_notified_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [subscriptionId]
    );
  }
}

export default new NotificationRepository();
