import notificationRepo from './NotificationRepository';
import pushService from './PushNotificationService';
import pool from '../../config/database';

interface RestockAlert {
  upc: string;
  productName: string;
  storeId: string;
  storeName: string;
  storeAddress?: string;
  distance?: number;
}

export class FormulaRestockNotificationService {
  /**
   * Send restock alerts for a formula at specific stores
   * This is called by the shortage detection system when formula becomes available
   */
  async sendRestockAlerts(alerts: RestockAlert[]): Promise<number> {
    if (alerts.length === 0) {
      return 0;
    }

    let totalSent = 0;

    // Group alerts by UPC for efficient processing
    const alertsByUpc = new Map<string, RestockAlert[]>();
    for (const alert of alerts) {
      if (!alertsByUpc.has(alert.upc)) {
        alertsByUpc.set(alert.upc, []);
      }
      alertsByUpc.get(alert.upc)!.push(alert);
    }

    // Process each UPC
    for (const [upc, upcAlerts] of Array.from(alertsByUpc.entries())) {
      // Get all active subscriptions for this formula
      const subscriptions = await notificationRepo.getSubscriptionsForFormula(upc);

      if (subscriptions.length === 0) {
        continue;
      }

      // For each subscription, check if any stores match and send notification
      for (const subscription of subscriptions) {
        try {
          // Get subscribed stores (if any specific stores were selected)
          const storeResult = await pool.query(
            'SELECT store_id FROM subscription_stores WHERE subscription_id = $1',
            [subscription.id]
          );
          const subscribedStores = storeResult.rows.map(r => r.store_id);

          // Filter alerts to relevant stores
          let relevantAlerts = upcAlerts;
          if (subscribedStores.length > 0) {
            relevantAlerts = upcAlerts.filter(a => subscribedStores.includes(a.storeId));
          }

          if (relevantAlerts.length === 0) {
            continue;
          }

          // Check if we can send notification
          const canSend = await pushService.canSendNotification(
            subscription.user_id,
            upc,
            relevantAlerts[0].storeId
          );

          if (!canSend) {
            continue;
          }

          // Build notification content
          const { title, body } = this.buildNotificationContent(relevantAlerts);

          // Send notification
          const sent = await pushService.sendToUser(
            subscription.user_id,
            title,
            body,
            {
              type: 'formula_restock',
              upc,
              storeId: relevantAlerts[0].storeId,
              subscriptionId: subscription.id,
            },
            'high'
          );

          if (sent > 0) {
            // Record notification history
            await notificationRepo.recordNotification(
              subscription.user_id,
              subscription.id,
              'formula_restock',
              upc,
              relevantAlerts[0].storeId,
              'high',
              title,
              body,
              'sent'
            );

            // Update subscription stats
            await notificationRepo.updateSubscriptionStats(subscription.id);

            totalSent++;
          }
        } catch (error) {
          console.error(`Failed to send notification for subscription ${subscription.id}:`, error);
        }
      }
    }

    return totalSent;
  }

  /**
   * Build notification title and body based on alerts
   */
  private buildNotificationContent(alerts: RestockAlert[]): { title: string; body: string } {
    if (alerts.length === 1) {
      const alert = alerts[0];
      return {
        title: `${alert.productName} Available!`,
        body: `Found at ${alert.storeName}${alert.distance ? ` (${alert.distance.toFixed(1)} mi away)` : ''}`,
      };
    } else if (alerts.length === 2) {
      return {
        title: `${alerts[0].productName} Available!`,
        body: `Found at ${alerts[0].storeName} and 1 other store nearby`,
      };
    } else {
      return {
        title: `${alerts[0].productName} Available!`,
        body: `Found at ${alerts[0].storeName} and ${alerts.length - 1} other stores nearby`,
      };
    }
  }

  /**
   * Send expiration reminder for subscriptions expiring soon
   */
  async sendExpirationReminders(): Promise<number> {
    // Get subscriptions expiring in 3 days
    const result = await pool.query(
      `SELECT * FROM notification_subscriptions
       WHERE enabled = true
         AND expires_at > CURRENT_TIMESTAMP
         AND expires_at <= CURRENT_TIMESTAMP + INTERVAL '3 days'
         AND id NOT IN (
           SELECT subscription_id FROM subscription_expiration_prompts
           WHERE prompted_at > CURRENT_TIMESTAMP - INTERVAL '3 days'
         )`,
      []
    );

    const subscriptions = result.rows;
    let sent = 0;

    for (const subscription of subscriptions) {
      try {
        // Get formula name
        const formulaResult = await pool.query(
          'SELECT product_name FROM wic_formulas WHERE upc = $1 LIMIT 1',
          [subscription.upc]
        );

        const productName = formulaResult.rows[0]?.product_name || 'Formula';

        const title = 'Formula Alert Expiring Soon';
        const body = `Your alert for ${productName} expires in 3 days. Tap to renew or manage alerts.`;

        const sentCount = await pushService.sendToUser(
          subscription.user_id,
          title,
          body,
          {
            type: 'subscription_expiration',
            subscriptionId: subscription.id,
            upc: subscription.upc,
          },
          'normal'
        );

        if (sentCount > 0) {
          // Record the prompt
          await pool.query(
            'INSERT INTO subscription_expiration_prompts (subscription_id) VALUES ($1)',
            [subscription.id]
          );

          sent++;
        }
      } catch (error) {
        console.error(`Failed to send expiration reminder for subscription ${subscription.id}:`, error);
      }
    }

    return sent;
  }

  /**
   * Send test notification to a user
   */
  async sendTestNotification(userId: string): Promise<boolean> {
    const title = 'WIC Formula Alerts Active';
    const body = "You'll receive notifications when your formula becomes available nearby.";

    try {
      const sent = await pushService.sendToUser(
        userId,
        title,
        body,
        { type: 'test' },
        'normal'
      );

      return sent > 0;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      return false;
    }
  }
}

export default new FormulaRestockNotificationService();
