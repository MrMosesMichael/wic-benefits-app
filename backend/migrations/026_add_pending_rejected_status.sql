-- Add 'pending' and 'rejected' to status check constraints for content moderation
-- Recipes and community tips now go through a pending → review → approve/reject flow

ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_status_check;
ALTER TABLE recipes ADD CONSTRAINT recipes_status_check
  CHECK (status IN ('active','hidden','flagged','deleted','pending','rejected'));

ALTER TABLE community_tips DROP CONSTRAINT IF EXISTS community_tips_status_check;
ALTER TABLE community_tips ADD CONSTRAINT community_tips_status_check
  CHECK (status IN ('active','hidden','flagged','deleted','pending','rejected'));
