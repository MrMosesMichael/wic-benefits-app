import * as https from 'https';
import notificationRepo from './NotificationRepository';

interface ExpoPushMessage {
  to: string | string[];
  sound?: 'default' | null;
  body: string;
  title?: string;
  data?: Record<string, any>;
  priority?: 'default' | 'normal' | 'high';
  badge?: number;
  channelId?: string;
}

interface ExpoPushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: Record<string, any>;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: Record<string, any>;
}

export class PushNotificationService {
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
  private readonly MAX_BATCH_SIZE = 100; // Expo limit

  /**
   * Send a push notification to one or more Expo push tokens
   */
  async sendPushNotification(
    tokens: string | string[],
    title: string,
    body: string,
    data?: Record<string, any>,
    priority: 'default' | 'normal' | 'high' = 'default'
  ): Promise<ExpoPushTicket[]> {
    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];

    // Validate tokens
    const validTokens = tokenArray.filter(token => this.isValidExpoPushToken(token));

    if (validTokens.length === 0) {
      console.warn('No valid Expo push tokens provided');
      return [];
    }

    // Build message
    const message: ExpoPushMessage = {
      to: validTokens,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority,
    };

    try {
      const tickets = await this.sendToExpo([message]);
      return tickets;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * Send push notifications to a user
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
    priority: 'default' | 'normal' | 'high' = 'default'
  ): Promise<number> {
    // Get user's active push tokens
    const pushTokens = await notificationRepo.getUserPushTokens(userId);

    if (pushTokens.length === 0) {
      console.log(`No active push tokens for user ${userId}`);
      return 0;
    }

    const tokens = pushTokens.map(pt => pt.token);

    try {
      const tickets = await this.sendPushNotification(tokens, title, body, data, priority);

      // Count successful sends
      const successCount = tickets.filter(t => t.status === 'ok').length;

      // Deactivate tokens that failed
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          const failedToken = pushTokens[i];
          await notificationRepo.deactivatePushToken(userId, failedToken.device_id);
          console.log(`Deactivated invalid token for user ${userId}, device ${failedToken.device_id}`);
        }
      }

      return successCount;
    } catch (error) {
      console.error(`Failed to send notification to user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Validate Expo push token format
   */
  private isValidExpoPushToken(token: string): boolean {
    return (
      token.startsWith('ExponentPushToken[') ||
      token.startsWith('ExpoPushToken[') ||
      /^[a-zA-Z0-9_-]+$/.test(token) // Legacy format
    );
  }

  /**
   * Send messages to Expo push notification service
   */
  private async sendToExpo(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(messages);

      const options = {
        hostname: 'exp.host',
        port: 443,
        path: '/--/api/v2/push/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);

            if (res.statusCode === 200) {
              // Expo returns { data: [tickets] }
              resolve(response.data || []);
            } else {
              console.error('Expo push notification error:', response);
              reject(new Error(`Expo API returned status ${res.statusCode}: ${data}`));
            }
          } catch (error) {
            console.error('Failed to parse Expo response:', error);
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        console.error('HTTP request error:', error);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Check if current time is within user's quiet hours
   */
  async isQuietHours(userId: string): Promise<boolean> {
    const settings = await notificationRepo.getUserSettings(userId);

    if (!settings.push_enabled) {
      return true; // Treat disabled notifications as quiet hours
    }

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const startTime = settings.quiet_hours_start;
    const endTime = settings.quiet_hours_end;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Check if user has reached daily notification limit
   */
  async hasReachedDailyLimit(userId: string): Promise<boolean> {
    const settings = await notificationRepo.getUserSettings(userId);
    const todayCount = await notificationRepo.getTodayNotificationCount(userId);

    return todayCount >= settings.max_notifications_per_day;
  }

  /**
   * Check if notification should be sent based on user settings
   */
  async canSendNotification(userId: string, upc: string, storeId: string): Promise<boolean> {
    // Check quiet hours
    if (await this.isQuietHours(userId)) {
      console.log(`User ${userId} is in quiet hours`);
      return false;
    }

    // Check daily limit
    if (await this.hasReachedDailyLimit(userId)) {
      console.log(`User ${userId} has reached daily notification limit`);
      return false;
    }

    // Check deduplication (30 minute window)
    if (await notificationRepo.hasRecentNotification(userId, upc, storeId, 30)) {
      console.log(`User ${userId} already notified about ${upc} at ${storeId} recently`);
      return false;
    }

    return true;
  }
}

export default new PushNotificationService();
