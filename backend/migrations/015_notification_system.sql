-- Migration: 015_notification_system
-- Description: Add notification tables for formula restock alerts (A4.3)
-- Date: 2026-01-22
-- Task: A4.3 - Create formula restock push notifications

-- Push tokens for users' devices
CREATE TABLE IF NOT EXISTS push_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  token TEXT NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token) WHERE active = true;

COMMENT ON TABLE push_tokens IS 'Expo push notification tokens for user devices';

-- User notification settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  push_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  max_notifications_per_day INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);

COMMENT ON TABLE notification_settings IS 'User preferences for push notifications (quiet hours, rate limits)';

-- Formula restock alert subscriptions
CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  upc VARCHAR(14) NOT NULL,
  radius DECIMAL(5,2),  -- miles
  enabled BOOLEAN DEFAULT true,
  notification_count INTEGER DEFAULT 0,
  last_notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, upc)
);

CREATE INDEX IF NOT EXISTS idx_notification_subs_user ON notification_subscriptions(user_id) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_notification_subs_upc ON notification_subscriptions(upc) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_notification_subs_expires ON notification_subscriptions(expires_at) WHERE enabled = true;

COMMENT ON TABLE notification_subscriptions IS 'User subscriptions to formula restock alerts';
COMMENT ON COLUMN notification_subscriptions.expires_at IS 'Subscriptions expire after 30 days and require user confirmation';

-- Store-specific subscriptions (many-to-many relationship)
CREATE TABLE IF NOT EXISTS subscription_stores (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
  store_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(subscription_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_stores_sub ON subscription_stores(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_stores_store ON subscription_stores(store_id);

COMMENT ON TABLE subscription_stores IS 'Specific stores to watch for formula restocks';

-- Notification delivery history (for deduplication and stats)
CREATE TABLE IF NOT EXISTS notification_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  subscription_id INTEGER REFERENCES notification_subscriptions(id) ON DELETE SET NULL,
  notification_type VARCHAR(50) NOT NULL,
  upc VARCHAR(14) NOT NULL,
  store_id VARCHAR(255) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivery_status VARCHAR(20) DEFAULT 'sent',
  expo_receipt_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_delivered ON notification_history(delivered_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_dedup ON notification_history(user_id, upc, store_id, delivered_at);

COMMENT ON TABLE notification_history IS 'History of sent notifications for deduplication and statistics';

-- Notification batches (for 30-minute batching feature)
CREATE TABLE IF NOT EXISTS notification_batches (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  upc VARCHAR(14) NOT NULL,
  batch_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  batch_end TIMESTAMP,
  store_ids TEXT[] DEFAULT '{}',
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_batches_user ON notification_batches(user_id) WHERE sent = false;
CREATE INDEX IF NOT EXISTS idx_notification_batches_pending ON notification_batches(batch_start) WHERE sent = false;

COMMENT ON TABLE notification_batches IS 'Batches restock notifications within 30-minute windows';

-- Expired subscription prompts (tracks when we've prompted user about expiring subscription)
CREATE TABLE IF NOT EXISTS subscription_expiration_prompts (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
  prompted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_response VARCHAR(20),  -- 'keep_active', 'try_alternatives', 'cancel'
  responded_at TIMESTAMP,
  UNIQUE(subscription_id, prompted_at)
);

CREATE INDEX IF NOT EXISTS idx_expiration_prompts_sub ON subscription_expiration_prompts(subscription_id);

COMMENT ON TABLE subscription_expiration_prompts IS 'Tracks 30-day expiration prompts per spec';

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers
DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_subscriptions_updated_at ON notification_subscriptions;
CREATE TRIGGER update_notification_subscriptions_updated_at
  BEFORE UPDATE ON notification_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
