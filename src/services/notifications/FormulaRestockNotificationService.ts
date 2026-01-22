/**
 * Formula Restock Notification Service
 * A4.3 - Monitors formula availability and sends restock notifications
 */

import {
  FormulaAvailability,
  FormulaProduct,
} from '../../types/formula';
import {
  BaseNotification,
  FormulaRestockNotification,
  NotificationPriority,
  NotificationSubscription,
  NotificationType,
} from '../../types/notification';
import { getFormulaAvailabilityService } from '../formula/FormulaAvailabilityService';
import { getFormulaShortageDetectionService, ShortageSeverity } from '../formula/FormulaShortageDetectionService';
import { getPushNotificationService } from './PushNotificationService';
import { getNotificationRepository } from './NotificationRepository';

/**
 * Restock detection configuration
 */
export interface RestockDetectionConfig {
  monitoringInterval: number;  // minutes
  restockThreshold: number;  // quantity change to trigger notification
  deduplicationWindow: number;  // hours to prevent duplicate notifications
}

/**
 * Restock event
 */
export interface RestockEvent {
  upc: string;
  storeId: string;
  previousQuantity: number;
  newQuantity: number;
  detectedAt: Date;
}

/**
 * Service for managing formula restock notifications
 */
export class FormulaRestockNotificationService {
  private pushService = getPushNotificationService();
  private availabilityService = getFormulaAvailabilityService();
  private shortageService = getFormulaShortageDetectionService();
  private repository = getNotificationRepository();

  // Keep previous availability in memory for restock detection
  // In production, this could be moved to Redis
  private previousAvailability: Map<string, FormulaAvailability> = new Map();

  private config: RestockDetectionConfig = {
    monitoringInterval: 15,  // Check every 15 minutes
    restockThreshold: 1,  // Notify if any quantity increase
    deduplicationWindow: 6,  // DEPRECATED: Now using 30-minute batching instead
  };

  /**
   * Subscribe user to formula restock notifications
   */
  async subscribe(
    userId: string,
    upc: string,
    storeIds?: string[],
    radius?: number
  ): Promise<NotificationSubscription> {
    return await this.repository.createSubscription(userId, upc, storeIds, radius);
  }

  /**
   * Unsubscribe user from formula restock notifications
   */
  async unsubscribe(userId: string, upc: string): Promise<void> {
    await this.repository.deleteSubscription(userId, upc);
  }

  /**
   * Get user's subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<NotificationSubscription[]> {
    return await this.repository.getUserSubscriptions(userId);
  }

  /**
   * Enable/disable a subscription
   */
  async toggleSubscription(
    userId: string,
    upc: string,
    enabled: boolean
  ): Promise<void> {
    await this.repository.toggleSubscription(userId, upc, enabled);
  }

  /**
   * Monitor formula availability and detect restocks
   * This should be called periodically (e.g., every 15 minutes)
   */
  async monitorRestocks(): Promise<RestockEvent[]> {
    const restockEvents: RestockEvent[] = [];

    // Get all unique UPCs from subscriptions
    const monitoredUPCs = await this.getMonitoredUPCs();

    for (const upc of monitoredUPCs) {
      // Get current availability
      const currentAvailability = await this.availabilityService.queryAvailability({
        upcs: [upc],
        maxAge: 1,  // Only get fresh data
      });

      // Check for restocks
      const events = this.detectRestocks(upc, currentAvailability);
      restockEvents.push(...events);

      // Add restocks to batches (30-minute window)
      for (const event of events) {
        await this.processRestockEvent(event);
      }

      // Update previous availability
      for (const availability of currentAvailability) {
        const key = this.getAvailabilityKey(upc, availability.storeId);
        this.previousAvailability.set(key, availability);
      }
    }

    // Process any batches that are ready (30+ minutes old)
    await this.processBatches();

    return restockEvents;
  }

  /**
   * Detect restocks by comparing current vs previous availability
   */
  private detectRestocks(
    upc: string,
    currentAvailability: FormulaAvailability[]
  ): RestockEvent[] {
    const events: RestockEvent[] = [];

    for (const current of currentAvailability) {
      const key = this.getAvailabilityKey(upc, current.storeId);
      const previous = this.previousAvailability.get(key);

      // Check if this is a restock
      if (this.isRestock(previous, current)) {
        events.push({
          upc,
          storeId: current.storeId,
          previousQuantity: previous?.quantity || 0,
          newQuantity: current.quantity || 0,
          detectedAt: new Date(),
        });
      }
    }

    return events;
  }

  /**
   * Determine if availability change constitutes a restock
   */
  private isRestock(
    previous: FormulaAvailability | undefined,
    current: FormulaAvailability
  ): boolean {
    // Must be in stock now
    if (!current.inStock) {
      return false;
    }

    // If no previous data, consider it a new stock (restock)
    if (!previous) {
      return true;
    }

    // If was out of stock and now in stock
    if (!previous.inStock && current.inStock) {
      return true;
    }

    // If quantity increased significantly
    const prevQty = previous.quantity || 0;
    const currQty = current.quantity || 0;

    if (currQty > prevQty && currQty - prevQty >= this.config.restockThreshold) {
      return true;
    }

    return false;
  }

  /**
   * Process a restock event and add to notification batches
   */
  private async processRestockEvent(event: RestockEvent): Promise<void> {
    // Find all subscriptions for this UPC
    const relevantSubs = await this.getSubscriptionsForUPC(event.upc);

    // Filter subscriptions by store/location
    const notifyUsers = relevantSubs.filter((sub) => {
      // Check if subscription includes this store
      if (sub.storeIds && sub.storeIds.length > 0) {
        return sub.storeIds.includes(event.storeId);
      }

      // If no specific stores, include all (would need radius check with store location)
      return true;
    });

    // Add to batches (30-minute window)
    for (const subscription of notifyUsers) {
      await this.addRestockToBatch(subscription, event);
    }
  }

  /**
   * Add restock event to 30-minute batch (replaces immediate sending)
   */
  private async addRestockToBatch(
    subscription: NotificationSubscription,
    event: RestockEvent
  ): Promise<void> {
    // Check if this store is already in an active batch
    const alreadyInBatch = await this.repository.isStoreInActiveBatch(
      subscription.userId,
      event.upc,
      event.storeId
    );

    if (alreadyInBatch) {
      return; // Already added to batch
    }

    // Get or create batch for this user/upc
    const batch = await this.repository.getOrCreateBatch(
      subscription.userId,
      event.upc
    );

    // Add store to batch
    await this.repository.addStoreToBatch(batch.batchId, event.storeId);
  }

  /**
   * Build batched restock notification (multiple stores)
   */
  private async buildBatchedRestockNotification(
    upc: string,
    storeIds: string[],
    severity: ShortageSeverity
  ): Promise<FormulaRestockNotification> {
    // Calculate priority based on shortage severity
    const priority = this.calculatePriority(severity);

    // Would fetch actual product and store names from services
    const productName = `Formula (${upc})`;

    // Build title based on severity and number of stores
    let title: string;
    if (severity === ShortageSeverity.CRITICAL || severity === ShortageSeverity.HIGH) {
      title = storeIds.length === 1
        ? `🚨 Formula Back in Stock!`
        : `🚨 Formula Found at ${storeIds.length} Stores!`;
    } else {
      title = storeIds.length === 1
        ? `✅ Formula Restocked`
        : `✅ Formula Available at ${storeIds.length} Stores`;
    }

    // Build body message
    let body: string;
    if (storeIds.length === 1) {
      body = `${productName} is now available at Store ${storeIds[0]}`;
    } else if (storeIds.length <= 3) {
      // List all stores
      const storeList = storeIds.map(id => `Store ${id}`).join(', ');
      body = `${productName} is now available at ${storeList}`;
    } else {
      // Summarize with count
      const firstTwo = storeIds.slice(0, 2).map(id => `Store ${id}`).join(', ');
      body = `${productName} is now available at ${firstTwo}, and ${storeIds.length - 2} more stores`;
    }

    const notification: FormulaRestockNotification = {
      id: `batch_restock_${upc}_${Date.now()}`,
      type: NotificationType.FORMULA_RESTOCK,
      title,
      body,
      priority,
      data: {
        upc,
        productName,
        storeId: storeIds[0], // Primary store for backward compatibility
        storeName: `${storeIds.length} stores`,
        storeIds, // All stores in batch
        quantity: 0, // Unknown in batched context
      },
      sentAt: new Date(),
    };

    return notification;
  }

  /**
   * Calculate notification priority based on shortage severity
   */
  private calculatePriority(severity: ShortageSeverity): NotificationPriority {
    switch (severity) {
      case ShortageSeverity.CRITICAL:
        return NotificationPriority.CRITICAL;
      case ShortageSeverity.HIGH:
        return NotificationPriority.HIGH;
      case ShortageSeverity.MODERATE:
        return NotificationPriority.NORMAL;
      case ShortageSeverity.LOW:
      case ShortageSeverity.NONE:
      default:
        return NotificationPriority.NORMAL;
    }
  }

  /**
   * Process ready notification batches (30+ minutes old)
   * Should be called periodically (e.g., every 5-10 minutes)
   */
  async processBatches(): Promise<number> {
    const readyBatches = await this.repository.getBatchesReadyToSend();
    let notificationsSent = 0;

    for (const batch of readyBatches) {
      try {
        await this.sendBatchNotification(batch);
        await this.repository.markBatchAsSent(batch.batchId);
        notificationsSent++;
      } catch (error) {
        console.error(`Failed to send batch ${batch.batchId}:`, error);
        // Continue processing other batches
      }
    }

    return notificationsSent;
  }

  /**
   * Send a batched notification (single notification for multiple stores)
   */
  private async sendBatchNotification(batch: {
    batchId: number;
    userId: string;
    upc: string;
    storeIds: string[];
    batchStart: Date;
  }): Promise<void> {
    if (batch.storeIds.length === 0) {
      // Empty batch, just mark as sent
      return;
    }

    // Get shortage severity for priority calculation
    const shortage = await this.shortageService.detectShortage(batch.upc);

    // Build batched notification
    const notification = await this.buildBatchedRestockNotification(
      batch.upc,
      batch.storeIds,
      shortage.severity
    );

    // Send via push service
    const result = await this.pushService.sendNotification(
      batch.userId,
      notification
    );

    if (result.success) {
      // Update subscription stats in database
      await this.repository.updateSubscriptionStats(batch.userId, batch.upc);

      // Record notification in history for each store
      for (const storeId of batch.storeIds) {
        await this.repository.recordNotification(
          batch.userId,
          null, // subscriptionId
          notification.type,
          batch.upc,
          storeId,
          notification.priority,
          notification.title,
          notification.body,
          result.receiptId
        );
      }
    }
  }

  /**
   * Get all UPCs being monitored
   */
  private async getMonitoredUPCs(): Promise<Set<string>> {
    // Query distinct UPCs from active subscriptions
    // For now, we'll get all subscriptions and extract UPCs
    // In production, this should be a dedicated query
    const upcs = new Set<string>();

    // TODO: Add repository method to get distinct monitored UPCs
    // For now, returning empty set (this method needs DB support)

    return upcs;
  }

  /**
   * Get subscriptions for a specific UPC
   */
  private async getSubscriptionsForUPC(upc: string): Promise<NotificationSubscription[]> {
    return await this.repository.getActiveSubscriptionsByUPC(upc);
  }

  /**
   * Generate availability key (still used for in-memory cache)
   */
  private getAvailabilityKey(upc: string, storeId: string): string {
    return `${upc}:${storeId}`;
  }

  /**
   * Notify users about a specific restock (manual trigger for testing)
   * This bypasses batching and sends immediately
   */
  async notifyRestock(
    upc: string,
    storeId: string,
    quantity: number
  ): Promise<number> {
    const relevantSubs = (await this.getSubscriptionsForUPC(upc)).filter((sub) => {
      if (sub.storeIds && sub.storeIds.length > 0) {
        return sub.storeIds.includes(storeId);
      }
      return true;
    });

    // Get shortage severity
    const shortage = await this.shortageService.detectShortage(upc);

    let notificationsSent = 0;

    // For manual triggers, send immediately (bypass batching)
    for (const subscription of relevantSubs) {
      const notification = await this.buildBatchedRestockNotification(
        upc,
        [storeId],
        shortage.severity
      );

      const result = await this.pushService.sendNotification(
        subscription.userId,
        notification
      );

      if (result.success) {
        await this.repository.updateSubscriptionStats(subscription.userId, upc);
        await this.repository.recordNotification(
          subscription.userId,
          null,
          notification.type,
          upc,
          storeId,
          notification.priority,
          notification.title,
          notification.body,
          result.receiptId
        );
        notificationsSent++;
      }
    }

    return notificationsSent;
  }

  /**
   * Get notification statistics for user
   */
  async getNotificationStats(userId: string): Promise<{
    activeSubscriptions: number;
    totalNotifications: number;
    lastNotified?: Date;
  }> {
    return await this.repository.getUserNotificationStats(userId);
  }

  /**
   * Check and prompt for expiring subscriptions
   * Should be called daily
   */
  async checkExpiringSubscriptions(): Promise<void> {
    // Get subscriptions expiring within next day that haven't been prompted
    const expiring = await this.repository.getExpiringSubscriptions(1);

    for (const subscription of expiring) {
      // TODO: Send expiration prompt notification
      // For now, just record that we should prompt
      // In production, this would trigger a UI notification or push message
      console.log(`Subscription expiring for user ${subscription.userId}, UPC ${subscription.upc}`);
    }
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(config: Partial<RestockDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RestockDetectionConfig {
    return { ...this.config };
  }
}

// Singleton instance
let instance: FormulaRestockNotificationService | null = null;

export function getFormulaRestockNotificationService(): FormulaRestockNotificationService {
  if (!instance) {
    instance = new FormulaRestockNotificationService();
  }
  return instance;
}
