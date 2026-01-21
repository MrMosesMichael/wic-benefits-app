/**
 * Image Storage Configuration
 *
 * Centralized configuration for image storage service
 */

import { ImageStorageConfig } from './ImageStorageService';

/**
 * Get image storage configuration from environment
 */
export function getImageStorageConfig(): Partial<ImageStorageConfig> {
  return {
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'wic-benefits-product-images',
    keyPrefix: 'product-images',
    cdnBaseUrl: process.env.CDN_BASE_URL,
    enableLocalFallback: process.env.NODE_ENV === 'development',
    localStoragePath: process.env.LOCAL_IMAGE_PATH || './storage/images',
    enableProxy: true,
    proxyCacheTtl: 7 * 24 * 60 * 60, // 7 days
  };
}

/**
 * Validate image storage configuration
 *
 * @throws Error if configuration is invalid
 */
export function validateImageStorageConfig(): void {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (!isDevelopment) {
    // Production requires AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID) {
      throw new Error('AWS_ACCESS_KEY_ID is required for production');
    }

    if (!process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS_SECRET_ACCESS_KEY is required for production');
    }

    if (!process.env.S3_BUCKET) {
      throw new Error('S3_BUCKET is required for production');
    }

    if (!process.env.CDN_BASE_URL) {
      console.warn('Warning: CDN_BASE_URL not set, using S3 direct URLs');
    }
  } else {
    // Development uses local storage
    console.log('Image storage: Using local file system (development mode)');
    console.log(`Local path: ${process.env.LOCAL_IMAGE_PATH || './storage/images'}`);
  }
}

/**
 * Get image URL from product
 *
 * Helper to extract the appropriate image URL for a given variant
 *
 * @param product Product with image URLs
 * @param variant Variant name ('thumbnail', 'medium', 'full')
 * @returns Image URL or null
 */
export function getProductImageUrl(
  product: { imageUrl?: string; thumbnailUrl?: string },
  variant: 'thumbnail' | 'medium' | 'full' = 'medium'
): string | null {
  switch (variant) {
    case 'thumbnail':
      return product.thumbnailUrl || product.imageUrl || null;
    case 'medium':
      return product.imageUrl || null;
    case 'full':
      return product.imageUrl || null;
    default:
      return product.imageUrl || null;
  }
}

/**
 * Check if URL is a CDN URL
 *
 * @param url URL to check
 * @returns True if URL is from our CDN
 */
export function isCdnUrl(url: string): boolean {
  const cdnBaseUrl = process.env.CDN_BASE_URL;
  if (!cdnBaseUrl) {
    return false;
  }
  return url.startsWith(cdnBaseUrl);
}

/**
 * Check if URL is external (not our CDN/S3)
 *
 * @param url URL to check
 * @returns True if URL is external
 */
export function isExternalUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  const cdnBaseUrl = process.env.CDN_BASE_URL;
  const s3Bucket = process.env.S3_BUCKET;

  // Check if URL is from our CDN
  if (cdnBaseUrl && url.startsWith(cdnBaseUrl)) {
    return false;
  }

  // Check if URL is from our S3 bucket
  if (s3Bucket && url.includes(s3Bucket)) {
    return false;
  }

  // Check if URL is local
  if (url.startsWith('/images/')) {
    return false;
  }

  return true;
}
