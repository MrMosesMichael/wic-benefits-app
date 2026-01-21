-- Migration: 014_add_thumbnail_url
-- Description: Add thumbnail_url column to products table for A2.4
-- Date: 2026-01-21
-- Task: A2.4 - Implement product image storage/CDN

-- Add thumbnail_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'products'
    AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE products ADD COLUMN thumbnail_url TEXT;
  END IF;
END $$;

-- Add index for thumbnail_url
CREATE INDEX IF NOT EXISTS idx_products_has_thumbnail
  ON products((thumbnail_url IS NOT NULL));

-- Add comment
COMMENT ON COLUMN products.thumbnail_url IS 'Thumbnail image URL (150x150px) from CDN for fast loading in lists';

-- Update existing products to use imageUrl as thumbnail initially
-- This will be replaced with actual thumbnails when sync runs
UPDATE products
SET thumbnail_url = image_url
WHERE thumbnail_url IS NULL
  AND image_url IS NOT NULL;
