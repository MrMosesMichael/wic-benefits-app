import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';

// Configure based on environment
const API_BASE_URL = __DEV__
  ? 'http://192.168.12.94:3000/api/v1'
  : 'https://mdmichael.com/wic/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationSubscription {
  id: number;
  userId: string;
  upc: string;
  radius?: number;
  storeIds: string[];
  enabled: boolean;
  notificationCount: number;
  lastNotifiedAt?: string;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  userId: string;
  pushEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  maxNotificationsPerDay: number;
  createdAt: string;
  updatedAt: string;
}

export class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  /**
   * Request notification permissions from the user
   */
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return false;
    }

    return true;
  }

  /**
   * Get Expo push token for this device
   */
  async getExpoPushToken(): Promise<string | null> {
    if (this.expoPushToken) {
      return this.expoPushToken;
    }

    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return null;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = token.data;
      return this.expoPushToken;
    } catch (error) {
      console.error('Failed to get Expo push token:', error);
      return null;
    }
  }

  /**
   * Register this device's push token with the backend
   */
  async registerPushToken(userId: string): Promise<boolean> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return false;
    }

    const token = await this.getExpoPushToken();
    if (!token) {
      return false;
    }

    try {
      const deviceId = Constants.deviceId || Constants.sessionId || 'unknown';
      const platform = Platform.OS as 'ios' | 'android' | 'web';

      const response = await api.post('/notifications/register-token', {
        userId,
        token,
        deviceId,
        platform,
      });

      return response.data.success;
    } catch (error) {
      console.error('Failed to register push token:', error);
      return false;
    }
  }

  /**
   * Subscribe to formula restock alerts
   */
  async subscribeToFormula(
    userId: string,
    upc: string,
    radius?: number,
    storeIds?: string[]
  ): Promise<NotificationSubscription | null> {
    try {
      // First ensure push token is registered
      await this.registerPushToken(userId);

      // Create subscription
      const response = await api.post('/notifications/subscribe', {
        userId,
        upc,
        radius,
        storeIds,
      });

      if (response.data.success) {
        return response.data.subscription;
      }

      return null;
    } catch (error) {
      console.error('Failed to subscribe to formula alerts:', error);
      return null;
    }
  }

  /**
   * Get user's active subscriptions
   */
  async getSubscriptions(userId: string): Promise<NotificationSubscription[]> {
    try {
      const response = await api.get('/notifications/subscriptions', {
        params: { userId },
      });

      if (response.data.success) {
        return response.data.subscriptions;
      }

      return [];
    } catch (error) {
      console.error('Failed to get subscriptions:', error);
      return [];
    }
  }

  /**
   * Get subscription for a specific formula
   */
  async getSubscriptionForFormula(userId: string, upc: string): Promise<NotificationSubscription | null> {
    try {
      const response = await api.get(`/notifications/subscriptions/${upc}`, {
        params: { userId },
      });

      if (response.data.success) {
        return response.data.subscription;
      }

      return null;
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from formula alerts
   */
  async unsubscribe(userId: string, subscriptionId: number): Promise<boolean> {
    try {
      const response = await api.delete(`/notifications/subscriptions/${subscriptionId}`, {
        params: { userId },
      });

      return response.data.success;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Get notification settings
   */
  async getSettings(userId: string): Promise<NotificationSettings | null> {
    try {
      const response = await api.get('/notifications/settings', {
        params: { userId },
      });

      if (response.data.success) {
        return response.data.settings;
      }

      return null;
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      return null;
    }
  }

  /**
   * Update notification settings
   */
  async updateSettings(
    userId: string,
    settings: Partial<Omit<NotificationSettings, 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<NotificationSettings | null> {
    try {
      const response = await api.patch('/notifications/settings', {
        userId,
        ...settings,
      });

      if (response.data.success) {
        return response.data.settings;
      }

      return null;
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      return null;
    }
  }

  /**
   * Set up notification listeners
   * Call this once when the app starts
   */
  setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationTapped?: (response: Notifications.NotificationResponse) => void
  ): void {
    // Handle notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      onNotificationReceived?.(notification);
    });

    // Handle notification tapped by user
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
      onNotificationTapped?.(response);
    });
  }

  /**
   * Clean up notification listeners
   * Call this when the component unmounts
   */
  removeNotificationListeners(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  /**
   * Get the last notification response (e.g., when app was opened from notification)
   */
  async getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
    return await Notifications.getLastNotificationResponseAsync();
  }
}

export default new NotificationService();
