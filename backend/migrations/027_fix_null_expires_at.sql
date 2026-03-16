-- Fix any notification_subscriptions with NULL expires_at
-- These would be filtered out by the getUserSubscriptions query
UPDATE notification_subscriptions
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL;

-- Add NOT NULL constraint to prevent future issues
ALTER TABLE notification_subscriptions
ALTER COLUMN expires_at SET NOT NULL;
