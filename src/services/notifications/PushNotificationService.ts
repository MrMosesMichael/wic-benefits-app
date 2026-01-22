/**
 * Push Notification Service
 * A4.3 - Handles Expo push notifications for formula alerts
 */

import {
  BaseNotification,
  NotificationDeliveryResult,
  NotificationPriority,
  NotificationSettings,
} from '../../types/notification';
import { getNotificationRepository } from './NotificationRepository';

/**
 * Expo push token (would be obtained from device)
 */
export interface ExpoPushToken {
  userId: string;
  token: string;
  deviceId: string;
  platform: 'ios' | 'android';
  createdAt: Date;
  lastUsed: Date;
}

/**
 * Expo push notification payload
 */
interface ExpoPushMessage {
  to: string | string[];
  sound?: 'default' | null;
  title?: string;
  body?: string;
  data?: Record<string, any>;
  badge?: number;
  categoryId?: string;
  mutableContent?: boolean;
  priority?: 'default' | 'normal' | 'high';
  subtitle?: string;
  channelId?: string;
}

/**
 * Service for sending push notifications via Expo
 */
export class PushNotificationService {
  private readonly EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';
  private repository = getNotificationRepository();

  /**
   * Register a push token for a user
   */
  async registerPushToken(
    userId: string,
    token: string,
    deviceId: string,
    platform: 'ios' | 'android' | 'web'
  ): Promise<void> {
    await this.repository.registerPushToken(userId, token, deviceId, platform);
  }

  /**
   * Unregister a push token
   */
  async unregisterPushToken(userId: string, deviceId: string): Promise<void> {
    await this.repository.unregisterPushToken(userId, deviceId);
  }

  /**
   * Get push tokens for user
   */
  async getPushTokens(userId: string): Promise<string[]> {
    const tokens = await this.repository.getUserPushTokens(userId);
    return tokens.map(t => t.token);
  }

  /**
   * Update notification settings for user
   */
  async updateSettings(
    userId: string,
    settings: NotificationSettings
  ): Promise<void> {
    await this.repository.updateUserSettings(userId, settings);
  }

  /**
   * Get notification settings for user
   */
  async getSettings(userId: string): Promise<NotificationSettings> {
    return await this.repository.getUserSettings(userId);
  }

  /**
   * Send a push notification to a user
   */
  async sendNotification(
    userId: string,
    notification: BaseNotification
  ): Promise<NotificationDeliveryResult> {
    // Check if user can receive notification
    if (!(await this.canSendNotification(userId, notification))) {
      return {
        notificationId: notification.id,
        success: false,
        error: 'User cannot receive notification (settings or rate limit)',
      };
    }

    // Get push tokens
    const pushTokens = await this.getPushTokens(userId);
    if (pushTokens.length === 0) {
      return {
        notificationId: notification.id,
        success: false,
        error: 'No push tokens registered for user',
      };
    }

    // Build Expo push message (send to first token for now)
    const message = this.buildExpoPushMessage(pushTokens[0], notification);

    try {
      // Send via Expo Push API
      const receiptId = await this.sendToExpo(message);

      return {
        notificationId: notification.id,
        success: true,
        deliveredAt: new Date(),
        receiptId,
      };
    } catch (error) {
      return {
        notificationId: notification.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send notifications to multiple users
   */
  async sendBulkNotifications(
    userIds: string[],
    notification: BaseNotification
  ): Promise<NotificationDeliveryResult[]> {
    const results = await Promise.all(
      userIds.map((userId) => this.sendNotification(userId, notification))
    );

    return results;
  }

  /**
   * Check if user can receive notification
   */
  private async canSendNotification(
    userId: string,
    notification: BaseNotification
  ): Promise<boolean> {
    const settings = await this.getSettings(userId);

    // Check if push enabled
    if (!settings.pushEnabled) {
      return false;
    }

    // Check quiet hours
    if (this.isQuietHours(settings)) {
      // Allow critical and high priority notifications during quiet hours
      if (
        notification.priority !== NotificationPriority.CRITICAL &&
        notification.priority !== NotificationPriority.HIGH
      ) {
        return false;
      }
    }

    // Check rate limit
    if (settings.maxNotificationsPerDay) {
      const todayCount = await this.repository.getTodayNotificationCount(userId);
      if (todayCount >= settings.maxNotificationsPerDay) {
        // Allow critical and high priority notifications to bypass rate limit
        if (
          notification.priority !== NotificationPriority.CRITICAL &&
          notification.priority !== NotificationPriority.HIGH
        ) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quietHoursStart || !settings.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const start = settings.quietHoursStart;
    const end = settings.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }

    return currentTime >= start && currentTime <= end;
  }


  /**
   * Build Expo push message from notification
   */
  private buildExpoPushMessage(
    token: string,
    notification: BaseNotification
  ): ExpoPushMessage {
    const priority = this.mapPriority(notification.priority);

    return {
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data,
      priority,
      channelId: `formula-alerts-${notification.priority}`,
    };
  }

  /**
   * Map internal priority to Expo priority
   */
  private mapPriority(
    priority: NotificationPriority
  ): 'default' | 'normal' | 'high' {
    switch (priority) {
      case NotificationPriority.CRITICAL:
      case NotificationPriority.HIGH:
        return 'high';
      case NotificationPriority.NORMAL:
        return 'normal';
      case NotificationPriority.LOW:
      default:
        return 'default';
    }
  }

  /**
   * Send message to Expo Push API
   */
  private async sendToExpo(message: ExpoPushMessage): Promise<string> {
    // In a real implementation, this would make an HTTP request to Expo
    // For now, simulate the API call

    // Validate Expo push token format
    if (!this.isValidExpoPushToken(message.to as string)) {
      throw new Error('Invalid Expo push token format');
    }

    // Simulate API call
    const receipt = `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // In production:
    // const response = await fetch(this.EXPO_PUSH_API, {
    //   method: 'POST',
    //   headers: {
    //     'Accept': 'application/json',
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(message),
    // });
    //
    // const data = await response.json();
    // return data.data[0].id; // Receipt ID

    return receipt;
  }

  /**
   * Validate Expo push token format
   */
  private isValidExpoPushToken(token: string): boolean {
    // Expo push tokens start with ExponentPushToken[...] or ExpoPushToken[...]
    return (
      token.startsWith('ExponentPushToken[') ||
      token.startsWith('ExpoPushToken[')
    );
  }

  /**
   * Schedule a notification for future delivery
   */
  async scheduleNotification(
    userId: string,
    notification: BaseNotification,
    scheduledFor: Date
  ): Promise<string> {
    // In a real implementation, this would use a job queue
    // For now, return a scheduled notification ID
    const scheduledId = `scheduled_${notification.id}_${Date.now()}`;

    // Would implement:
    // - Store scheduled notification in database
    // - Set up job/timer to send at scheduled time
    // - Handle cancellation

    return scheduledId;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelScheduledNotification(scheduledId: string): Promise<boolean> {
    // Would implement:
    // - Remove from scheduled notifications
    // - Cancel job/timer
    return true;
  }
}

// Singleton instance
let instance: PushNotificationService | null = null;

export function getPushNotificationService(): PushNotificationService {
  if (!instance) {
    instance = new PushNotificationService();
  }
  return instance;
}
