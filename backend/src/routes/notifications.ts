import express, { Request, Response } from 'express';
import { notificationRepo, pushService, formulaRestockService } from '../services/notifications';

const router = express.Router();

/**
 * POST /api/v1/notifications/register-token
 * Register or update Expo push token for a device
 * Body: { userId, token, deviceId, platform }
 */
router.post('/register-token', async (req: Request, res: Response) => {
  const { userId, token, deviceId, platform } = req.body;

  // Validate required fields
  if (!userId || !token || !deviceId || !platform) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['userId', 'token', 'deviceId', 'platform']
    });
  }

  // Validate platform
  if (!['ios', 'android', 'web'].includes(platform)) {
    return res.status(400).json({
      error: 'Invalid platform',
      validPlatforms: ['ios', 'android', 'web']
    });
  }

  try {
    const pushToken = await notificationRepo.registerPushToken(
      userId,
      token,
      deviceId,
      platform
    );

    // Send a test notification to confirm registration
    await formulaRestockService.sendTestNotification(userId);

    res.json({
      success: true,
      pushToken: {
        id: pushToken.id,
        userId: pushToken.user_id,
        deviceId: pushToken.device_id,
        platform: pushToken.platform,
        active: pushToken.active,
        createdAt: pushToken.created_at,
        updatedAt: pushToken.updated_at,
      }
    });
  } catch (error) {
    console.error('Failed to register push token:', error);
    res.status(500).json({
      error: 'Failed to register push token'
    });
  }
});

/**
 * POST /api/v1/notifications/subscribe
 * Subscribe to formula restock alerts
 * Body: { userId, upc, radius?, storeIds? }
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  const userId = typeof req.body.userId === 'string' ? req.body.userId : '';
  const upc = typeof req.body.upc === 'string' ? req.body.upc : '';
  const radius = typeof req.body.radius === 'number' ? req.body.radius : undefined;
  const storeIds = Array.isArray(req.body.storeIds) ? req.body.storeIds : undefined;

  // Validate required fields
  if (!userId || !upc) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['userId', 'upc']
    });
  }

  try {
    const subscription = await notificationRepo.createSubscription(
      userId,
      upc,
      radius,
      storeIds
    );

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        userId: subscription.user_id,
        upc: subscription.upc,
        radius: subscription.radius,
        enabled: subscription.enabled,
        notificationCount: subscription.notification_count,
        lastNotifiedAt: subscription.last_notified_at,
        createdAt: subscription.created_at,
        expiresAt: subscription.expires_at,
        updatedAt: subscription.updated_at,
      }
    });
  } catch (error) {
    console.error('Failed to create subscription:', error);
    res.status(500).json({
      error: 'Failed to create subscription'
    });
  }
});

/**
 * GET /api/v1/notifications/subscriptions
 * Get user's active subscriptions
 * Query params: userId
 */
router.get('/subscriptions', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({
      error: 'Missing userId parameter'
    });
  }

  try {
    const subscriptions = await notificationRepo.getUserSubscriptions(userId);

    res.json({
      success: true,
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        userId: sub.user_id,
        upc: sub.upc,
        radius: sub.radius,
        storeIds: sub.store_ids,
        enabled: sub.enabled,
        notificationCount: sub.notification_count,
        lastNotifiedAt: sub.last_notified_at,
        createdAt: sub.created_at,
        expiresAt: sub.expires_at,
        updatedAt: sub.updated_at,
      }))
    });
  } catch (error) {
    console.error('Failed to get subscriptions:', error);
    res.status(500).json({
      error: 'Failed to get subscriptions'
    });
  }
});

/**
 * GET /api/v1/notifications/subscriptions/:upc
 * Get user's subscription for a specific formula
 * Query params: userId
 */
router.get('/subscriptions/:upc', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const upc = req.params.upc;

  if (!userId) {
    return res.status(400).json({
      error: 'Missing userId parameter'
    });
  }

  try {
    const subscriptions = await notificationRepo.getUserSubscriptions(userId);
    const subscription = subscriptions.find(sub => sub.upc === upc);

    if (!subscription) {
      return res.json({
        success: true,
        subscription: null
      });
    }

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        userId: subscription.user_id,
        upc: subscription.upc,
        radius: subscription.radius,
        storeIds: subscription.store_ids,
        enabled: subscription.enabled,
        notificationCount: subscription.notification_count,
        lastNotifiedAt: subscription.last_notified_at,
        createdAt: subscription.created_at,
        expiresAt: subscription.expires_at,
        updatedAt: subscription.updated_at,
      }
    });
  } catch (error) {
    console.error('Failed to get subscription:', error);
    res.status(500).json({
      error: 'Failed to get subscription'
    });
  }
});

/**
 * DELETE /api/v1/notifications/subscriptions/:id
 * Delete a subscription
 * Query params: userId
 */
router.delete('/subscriptions/:id', async (req: Request, res: Response) => {
  const subscriptionId = parseInt(req.params.id);
  const userId = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId as string;

  if (!userId) {
    return res.status(400).json({
      error: 'Missing userId parameter'
    });
  }

  if (isNaN(subscriptionId)) {
    return res.status(400).json({
      error: 'Invalid subscription ID'
    });
  }

  try {
    const deleted = await notificationRepo.deleteSubscription(subscriptionId, userId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Subscription not found or not owned by user'
      });
    }

    res.json({
      success: true,
      message: 'Subscription deleted'
    });
  } catch (error) {
    console.error('Failed to delete subscription:', error);
    res.status(500).json({
      error: 'Failed to delete subscription'
    });
  }
});

/**
 * GET /api/v1/notifications/settings
 * Get user's notification settings
 * Query params: userId
 */
router.get('/settings', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({
      error: 'Missing userId parameter'
    });
  }

  try {
    const settings = await notificationRepo.getUserSettings(userId);

    res.json({
      success: true,
      settings: {
        userId: settings.user_id,
        pushEnabled: settings.push_enabled,
        quietHoursStart: settings.quiet_hours_start,
        quietHoursEnd: settings.quiet_hours_end,
        maxNotificationsPerDay: settings.max_notifications_per_day,
        createdAt: settings.created_at,
        updatedAt: settings.updated_at,
      }
    });
  } catch (error) {
    console.error('Failed to get settings:', error);
    res.status(500).json({
      error: 'Failed to get settings'
    });
  }
});

/**
 * PATCH /api/v1/notifications/settings
 * Update user's notification settings
 * Body: { userId, pushEnabled?, quietHoursStart?, quietHoursEnd?, maxNotificationsPerDay? }
 */
router.patch('/settings', async (req: Request, res: Response) => {
  const userId = typeof req.body.userId === 'string' ? req.body.userId : '';
  const pushEnabled = typeof req.body.pushEnabled === 'boolean' ? req.body.pushEnabled : undefined;
  const quietHoursStart = typeof req.body.quietHoursStart === 'string' ? req.body.quietHoursStart : undefined;
  const quietHoursEnd = typeof req.body.quietHoursEnd === 'string' ? req.body.quietHoursEnd : undefined;
  const maxNotificationsPerDay = typeof req.body.maxNotificationsPerDay === 'number' ? req.body.maxNotificationsPerDay : undefined;

  if (!userId) {
    return res.status(400).json({
      error: 'Missing userId in request body'
    });
  }

  try {
    const settings = await notificationRepo.updateSettings(userId, {
      push_enabled: pushEnabled,
      quiet_hours_start: quietHoursStart,
      quiet_hours_end: quietHoursEnd,
      max_notifications_per_day: maxNotificationsPerDay,
    });

    res.json({
      success: true,
      settings: {
        userId: settings.user_id,
        pushEnabled: settings.push_enabled,
        quietHoursStart: settings.quiet_hours_start,
        quietHoursEnd: settings.quiet_hours_end,
        maxNotificationsPerDay: settings.max_notifications_per_day,
        createdAt: settings.created_at,
        updatedAt: settings.updated_at,
      }
    });
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({
      error: 'Failed to update settings'
    });
  }
});

/**
 * POST /api/v1/notifications/test
 * Send a test notification
 * Body: { userId }
 */
router.post('/test', async (req: Request, res: Response) => {
  const userId = typeof req.body.userId === 'string' ? req.body.userId : '';

  if (!userId) {
    return res.status(400).json({
      error: 'Missing userId in request body'
    });
  }

  try {
    const sent = await formulaRestockService.sendTestNotification(userId);

    res.json({
      success: sent,
      message: sent ? 'Test notification sent' : 'Failed to send notification (no active tokens?)'
    });
  } catch (error) {
    console.error('Failed to send test notification:', error);
    res.status(500).json({
      error: 'Failed to send test notification'
    });
  }
});

export default router;
