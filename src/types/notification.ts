/**
 * Notification Type Definitions
 * A4.3 - Formula restock push notifications
 */

/**
 * Push notification types
 */
export enum NotificationType {
  FORMULA_RESTOCK = 'formula_restock',
  FORMULA_SHORTAGE = 'formula_shortage',
  FORMULA_ALTERNATIVE = 'formula_alternative',
  STORE_UPDATE = 'store_update',
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Base notification payload
 */
export interface BaseNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority;
  data: Record<string, any>;
  scheduledFor?: Date;
  sentAt?: Date;
}

/**
 * Formula restock notification data
 */
export interface FormulaRestockNotification extends BaseNotification {
  type: NotificationType.FORMULA_RESTOCK;
  data: {
    upc: string;
    productName: string;
    storeId: string;
    storeName: string;
    quantity?: number;
    address?: string;
    distance?: number;  // miles
  };
}

/**
 * Formula shortage alert notification data
 */
export interface FormulaShortageNotification extends BaseNotification {
  type: NotificationType.FORMULA_SHORTAGE;
  data: {
    upc: string;
    productName: string;
    severity: string;
    affectedRegions?: string[];
    alternativeUPCs?: string[];
  };
}

/**
 * User notification subscription
 */
export interface NotificationSubscription {
  userId: string;
  upc: string;
  storeIds?: string[];  // Specific stores or all nearby
  radius?: number;  // miles
  enabled: boolean;
  createdAt: Date;
  lastNotified?: Date;
  notificationCount: number;
}

/**
 * Notification delivery settings
 */
export interface NotificationSettings {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  quietHoursStart?: string;  // "22:00"
  quietHoursEnd?: string;  // "08:00"
  maxNotificationsPerDay?: number;
}

/**
 * Notification delivery result
 */
export interface NotificationDeliveryResult {
  notificationId: string;
  success: boolean;
  deliveredAt?: Date;
  error?: string;
  receipt?: string;  // Push notification receipt ID
}
