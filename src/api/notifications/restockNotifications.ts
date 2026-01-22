/**
 * Formula Restock Notification API
 * A4.3 - API endpoints for managing restock notifications
 */

import { getFormulaRestockNotificationService } from '../../services/notifications/FormulaRestockNotificationService';
import { getPushNotificationService } from '../../services/notifications/PushNotificationService';
import { NotificationSubscription } from '../../types/notification';

/**
 * Subscribe to formula restock notifications
 */
export interface SubscribeRequest {
  userId: string;
  upc: string;
  storeIds?: string[];
  radius?: number;  // miles
}

export interface SubscribeResponse {
  subscription: NotificationSubscription;
  success: boolean;
}

export async function subscribeToRestockNotifications(
  request: SubscribeRequest
): Promise<SubscribeResponse> {
  const service = getFormulaRestockNotificationService();

  const subscription = await service.subscribe(
    request.userId,
    request.upc,
    request.storeIds,
    request.radius
  );

  return {
    subscription,
    success: true,
  };
}

/**
 * Unsubscribe from formula restock notifications
 */
export interface UnsubscribeRequest {
  userId: string;
  upc: string;
}

export interface UnsubscribeResponse {
  success: boolean;
}

export async function unsubscribeFromRestockNotifications(
  request: UnsubscribeRequest
): Promise<UnsubscribeResponse> {
  const service = getFormulaRestockNotificationService();

  await service.unsubscribe(request.userId, request.upc);

  return {
    success: true,
  };
}

/**
 * Get user's notification subscriptions
 */
export interface GetSubscriptionsRequest {
  userId: string;
}

export interface GetSubscriptionsResponse {
  subscriptions: NotificationSubscription[];
}

export async function getUserSubscriptions(
  request: GetSubscriptionsRequest
): Promise<GetSubscriptionsResponse> {
  const service = getFormulaRestockNotificationService();

  const subscriptions = await service.getUserSubscriptions(request.userId);

  return {
    subscriptions,
  };
}

/**
 * Toggle subscription enabled/disabled
 */
export interface ToggleSubscriptionRequest {
  userId: string;
  upc: string;
  enabled: boolean;
}

export interface ToggleSubscriptionResponse {
  success: boolean;
}

export async function toggleSubscription(
  request: ToggleSubscriptionRequest
): Promise<ToggleSubscriptionResponse> {
  const service = getFormulaRestockNotificationService();

  await service.toggleSubscription(
    request.userId,
    request.upc,
    request.enabled
  );

  return {
    success: true,
  };
}

/**
 * Register push notification token
 */
export interface RegisterPushTokenRequest {
  userId: string;
  token: string;
  deviceId: string;
  platform: 'ios' | 'android';
}

export interface RegisterPushTokenResponse {
  success: boolean;
}

export async function registerPushToken(
  request: RegisterPushTokenRequest
): Promise<RegisterPushTokenResponse> {
  const pushService = getPushNotificationService();

  await pushService.registerPushToken(
    request.userId,
    request.token,
    request.deviceId,
    request.platform
  );

  return {
    success: true,
  };
}

/**
 * Unregister push notification token
 */
export interface UnregisterPushTokenRequest {
  userId: string;
}

export interface UnregisterPushTokenResponse {
  success: boolean;
}

export async function unregisterPushToken(
  request: UnregisterPushTokenRequest
): Promise<UnregisterPushTokenResponse> {
  const pushService = getPushNotificationService();

  await pushService.unregisterPushToken(request.userId);

  return {
    success: true,
  };
}

/**
 * Update notification settings
 */
export interface UpdateNotificationSettingsRequest {
  userId: string;
  settings: {
    pushEnabled?: boolean;
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    maxNotificationsPerDay?: number;
  };
}

export interface UpdateNotificationSettingsResponse {
  success: boolean;
}

export async function updateNotificationSettings(
  request: UpdateNotificationSettingsRequest
): Promise<UpdateNotificationSettingsResponse> {
  const pushService = getPushNotificationService();

  await pushService.updateSettings(request.userId, request.settings);

  return {
    success: true,
  };
}

/**
 * Get notification settings
 */
export interface GetNotificationSettingsRequest {
  userId: string;
}

export interface GetNotificationSettingsResponse {
  settings: {
    pushEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    maxNotificationsPerDay?: number;
  };
}

export async function getNotificationSettings(
  request: GetNotificationSettingsRequest
): Promise<GetNotificationSettingsResponse> {
  const pushService = getPushNotificationService();

  const settings = await pushService.getSettings(request.userId);

  return {
    settings: {
      pushEnabled: settings.pushEnabled,
      emailEnabled: false, // Not implemented yet
      smsEnabled: false, // Not implemented yet
      quietHoursStart: settings.quietHoursStart,
      quietHoursEnd: settings.quietHoursEnd,
      maxNotificationsPerDay: settings.maxNotificationsPerDay,
    },
  };
}

/**
 * Get notification statistics
 */
export interface GetNotificationStatsRequest {
  userId: string;
}

export interface GetNotificationStatsResponse {
  activeSubscriptions: number;
  totalNotifications: number;
  lastNotified?: Date | null;
}

export async function getNotificationStats(
  request: GetNotificationStatsRequest
): Promise<GetNotificationStatsResponse> {
  const service = getFormulaRestockNotificationService();

  const stats = await service.getNotificationStats(request.userId);

  return stats;
}

/**
 * Manually trigger restock notification (admin/testing)
 */
export interface TriggerRestockNotificationRequest {
  upc: string;
  storeId: string;
  quantity: number;
}

export interface TriggerRestockNotificationResponse {
  notificationsSent: number;
  success: boolean;
}

export async function triggerRestockNotification(
  request: TriggerRestockNotificationRequest
): Promise<TriggerRestockNotificationResponse> {
  const service = getFormulaRestockNotificationService();

  const count = await service.notifyRestock(
    request.upc,
    request.storeId,
    request.quantity
  );

  return {
    notificationsSent: count,
    success: true,
  };
}

/**
 * Get expiring subscriptions for user (for 30-day prompt)
 */
export interface GetExpiringSubscriptionsRequest {
  userId: string;
}

export interface GetExpiringSubscriptionsResponse {
  subscriptions: NotificationSubscription[];
}

export async function getExpiringSubscriptions(
  request: GetExpiringSubscriptionsRequest
): Promise<GetExpiringSubscriptionsResponse> {
  const service = getFormulaRestockNotificationService();

  // Get user's subscriptions
  const allSubs = await service.getUserSubscriptions(request.userId);

  // Filter for subscriptions expiring within next 7 days
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const expiring = allSubs.filter(sub => {
    if (!sub.expiresAt) return false;
    const expiresAt = new Date(sub.expiresAt);
    return expiresAt <= sevenDaysFromNow && expiresAt > now;
  });

  return {
    subscriptions: expiring,
  };
}

/**
 * Respond to subscription expiration prompt
 * Per spec: user can choose 'keep_active', 'try_alternatives', or 'cancel'
 */
export interface RespondToExpirationPromptRequest {
  userId: string;
  upc: string;
  response: 'keep_active' | 'try_alternatives' | 'cancel';
}

export interface RespondToExpirationPromptResponse {
  success: boolean;
  subscription?: NotificationSubscription;
}

export async function respondToExpirationPrompt(
  request: RespondToExpirationPromptRequest
): Promise<RespondToExpirationPromptResponse> {
  const { getNotificationRepository } = await import('../../services/notifications/NotificationRepository');
  const repository = getNotificationRepository();

  // Get the subscription
  const service = getFormulaRestockNotificationService();
  const subscriptions = await service.getUserSubscriptions(request.userId);
  const subscription = subscriptions.find(s => s.upc === request.upc);

  if (!subscription) {
    return {
      success: false,
    };
  }

  // Record the response (assuming we can get subscription ID from the subscription)
  // Note: The NotificationSubscription type doesn't currently have an ID field
  // In production, we'd need to add that or query for it

  // Handle the response
  if (request.response === 'keep_active') {
    // Re-subscribe (which will extend expiration by 30 days)
    const updatedSubscription = await service.subscribe(
      request.userId,
      request.upc,
      subscription.storeIds,
      subscription.radius
    );

    return {
      success: true,
      subscription: updatedSubscription,
    };
  } else if (request.response === 'cancel') {
    // Unsubscribe
    await service.unsubscribe(request.userId, request.upc);

    return {
      success: true,
    };
  } else {
    // 'try_alternatives' - just acknowledge, don't change subscription
    return {
      success: true,
      subscription,
    };
  }
}

/**
 * Process ready notification batches (admin/testing)
 * Sends batched notifications for batches that are 30+ minutes old
 */
export interface ProcessBatchesResponse {
  batchesProcessed: number;
  success: boolean;
}

export async function processBatches(): Promise<ProcessBatchesResponse> {
  const service = getFormulaRestockNotificationService();

  const count = await service.processBatches();

  return {
    batchesProcessed: count,
    success: true,
  };
}
