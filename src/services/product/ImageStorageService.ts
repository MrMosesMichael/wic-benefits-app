/**
 * Image Storage Service
 *
 * Implements A2.4 - Product image storage/CDN
 *
 * Handles:
 * - Image upload to S3 (or compatible storage)
 * - Image optimization (resize, compress, format conversion)
 * - CDN delivery via CloudFront or similar
 * - Fallback to external URLs with proxy/cache
 * - Image variant generation (thumbnail, medium, full)
 *
 * Architecture:
 * - External images → Fetch once → Store in S3 → Serve via CDN
 * - User uploads → Process → Store in S3 → Serve via CDN
 * - Missing images → Proxy external URL with caching
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import crypto from 'crypto';
import fetch from 'node-fetch';

/**
 * Image variant configuration
 */
export interface ImageVariant {
  /** Variant name (e.g., 'thumbnail', 'medium', 'full') */
  name: string;
  /** Max width in pixels */
  maxWidth: number;
  /** Max height in pixels */
  maxHeight: number;
  /** JPEG quality (1-100) */
  quality: number;
  /** Output format */
  format: 'jpeg' | 'webp' | 'png';
}

/**
 * Default image variants
 */
export const DEFAULT_VARIANTS: ImageVariant[] = [
  {
    name: 'thumbnail',
    maxWidth: 150,
    maxHeight: 150,
    quality: 80,
    format: 'jpeg',
  },
  {
    name: 'medium',
    maxWidth: 600,
    maxHeight: 600,
    quality: 85,
    format: 'jpeg',
  },
  {
    name: 'full',
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 90,
    format: 'jpeg',
  },
];

/**
 * Service configuration
 */
export interface ImageStorageConfig {
  /** AWS region */
  region: string;
  /** S3 bucket name */
  bucket: string;
  /** S3 key prefix (folder path) */
  keyPrefix: string;
  /** CDN base URL (CloudFront or similar) */
  cdnBaseUrl?: string;
  /** Enable local file system fallback (development) */
  enableLocalFallback: boolean;
  /** Local storage path */
  localStoragePath?: string;
  /** Image variants to generate */
  variants: ImageVariant[];
  /** Enable image proxy/cache for external URLs */
  enableProxy: boolean;
  /** Proxy cache TTL (seconds) */
  proxyCacheTtl: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Partial<ImageStorageConfig> = {
  region: 'us-east-1',
  keyPrefix: 'product-images',
  variants: DEFAULT_VARIANTS,
  enableProxy: true,
  proxyCacheTtl: 7 * 24 * 60 * 60, // 7 days
};

/**
 * Image upload result
 */
export interface ImageUploadResult {
  /** Original image URL */
  originalUrl: string;
  /** Thumbnail URL */
  thumbnailUrl: string;
  /** Medium variant URL */
  mediumUrl: string;
  /** Full size URL */
  fullUrl: string;
  /** S3 key */
  s3Key: string;
  /** File size in bytes */
  fileSize: number;
  /** Image dimensions */
  dimensions: {
    width: number;
    height: number;
  };
}

/**
 * Image Storage Service
 *
 * Manages product images with CDN delivery
 */
export class ImageStorageService {
  private config: ImageStorageConfig;
  private s3Client?: S3Client;

  constructor(config: Partial<ImageStorageConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as ImageStorageConfig;

    // Initialize S3 client if not using local fallback
    if (!this.config.enableLocalFallback) {
      this.s3Client = new S3Client({
        region: this.config.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });
    }
  }

  /**
   * Upload image from URL
   *
   * Fetches external image, processes it, and uploads to S3
   *
   * @param imageUrl External image URL
   * @param upc Product UPC (for organizing storage)
   * @returns Upload result with CDN URLs
   */
  async uploadFromUrl(imageUrl: string, upc: string): Promise<ImageUploadResult> {
    try {
      // Fetch image from external URL
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'WIC-Benefits-App/1.0',
        },
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Upload buffer
      return await this.uploadFromBuffer(buffer, upc, imageUrl);
    } catch (error) {
      console.error('Failed to upload image from URL:', error);
      throw error;
    }
  }

  /**
   * Upload image from buffer
   *
   * @param buffer Image buffer
   * @param upc Product UPC
   * @param originalUrl Original URL (for reference)
   * @returns Upload result
   */
  async uploadFromBuffer(
    buffer: Buffer,
    upc: string,
    originalUrl?: string
  ): Promise<ImageUploadResult> {
    try {
      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      const dimensions = {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };

      // Generate unique key based on UPC and content hash
      const contentHash = crypto.createHash('md5').update(buffer).digest('hex').substring(0, 8);
      const baseKey = `${this.config.keyPrefix}/${upc}/${contentHash}`;

      // Process and upload all variants
      const variantUrls: Record<string, string> = {};

      for (const variant of this.config.variants) {
        const processedBuffer = await this.processImage(buffer, variant);
        const key = `${baseKey}_${variant.name}.${variant.format}`;

        if (this.config.enableLocalFallback) {
          // Save to local file system (development mode)
          await this.saveLocal(key, processedBuffer);
          variantUrls[variant.name] = `/images/${key}`;
        } else {
          // Upload to S3
          await this.uploadToS3(key, processedBuffer, variant.format);
          variantUrls[variant.name] = this.getCdnUrl(key);
        }
      }

      return {
        originalUrl: originalUrl || variantUrls.full,
        thumbnailUrl: variantUrls.thumbnail,
        mediumUrl: variantUrls.medium,
        fullUrl: variantUrls.full,
        s3Key: baseKey,
        fileSize: buffer.length,
        dimensions,
      };
    } catch (error) {
      console.error('Failed to upload image from buffer:', error);
      throw error;
    }
  }

  /**
   * Process image to variant
   *
   * Resize, compress, and convert format
   *
   * @param buffer Original image buffer
   * @param variant Variant configuration
   * @returns Processed image buffer
   */
  private async processImage(buffer: Buffer, variant: ImageVariant): Promise<Buffer> {
    let pipeline = sharp(buffer)
      .resize(variant.maxWidth, variant.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });

    // Convert to target format
    switch (variant.format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: variant.quality });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: variant.quality });
        break;
      case 'png':
        pipeline = pipeline.png({ quality: variant.quality });
        break;
    }

    return await pipeline.toBuffer();
  }

  /**
   * Upload buffer to S3
   *
   * @param key S3 object key
   * @param buffer Image buffer
   * @param format Image format
   */
  private async uploadToS3(key: string, buffer: Buffer, format: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const contentType = `image/${format}`;

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // 1 year
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);
  }

  /**
   * Save image to local file system (development fallback)
   *
   * @param key File path
   * @param buffer Image buffer
   */
  private async saveLocal(key: string, buffer: Buffer): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    if (!this.config.localStoragePath) {
      throw new Error('Local storage path not configured');
    }

    const fullPath = path.join(this.config.localStoragePath, key);
    const dir = path.dirname(fullPath);

    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, buffer);
  }

  /**
   * Get CDN URL for S3 key
   *
   * @param key S3 object key
   * @returns CDN URL
   */
  private getCdnUrl(key: string): string {
    if (this.config.cdnBaseUrl) {
      return `${this.config.cdnBaseUrl}/${key}`;
    } else {
      // Fallback to S3 direct URL
      return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
    }
  }

  /**
   * Check if image exists in storage
   *
   * @param upc Product UPC
   * @returns True if image exists
   */
  async imageExists(upc: string): Promise<boolean> {
    try {
      if (this.config.enableLocalFallback) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const basePath = path.join(
          this.config.localStoragePath || '',
          this.config.keyPrefix,
          upc
        );
        const files = await fs.readdir(basePath);
        return files.length > 0;
      } else {
        if (!this.s3Client) {
          return false;
        }

        // Check if any variant exists for this UPC
        const key = `${this.config.keyPrefix}/${upc}/`;
        const command = new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        });

        await this.s3Client.send(command);
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Proxy external image URL with caching
   *
   * Useful for external images that we don't want to store locally
   * but want to cache for performance
   *
   * @param externalUrl External image URL
   * @returns Proxied/cached URL
   */
  async proxyImage(externalUrl: string): Promise<string> {
    if (!this.config.enableProxy) {
      return externalUrl;
    }

    // Generate cache key from URL
    const urlHash = crypto.createHash('md5').update(externalUrl).digest('hex');
    const cacheKey = `${this.config.keyPrefix}/proxy/${urlHash}`;

    try {
      // Check if cached version exists
      const exists = await this.objectExists(cacheKey);

      if (exists) {
        return this.getCdnUrl(cacheKey);
      }

      // Fetch and cache the image
      const response = await fetch(externalUrl, {
        headers: {
          'User-Agent': 'WIC-Benefits-App/1.0',
        },
        timeout: 10000,
      });

      if (!response.ok) {
        // Return original URL if fetch fails
        return externalUrl;
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Upload to cache
      if (this.s3Client) {
        await this.uploadToS3(cacheKey, buffer, 'jpeg');
        return this.getCdnUrl(cacheKey);
      }
    } catch (error) {
      console.error('Failed to proxy image:', error);
    }

    // Fallback to original URL
    return externalUrl;
  }

  /**
   * Check if S3 object exists
   *
   * @param key S3 object key
   * @returns True if object exists
   */
  private async objectExists(key: string): Promise<boolean> {
    if (!this.s3Client) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate presigned URL for direct upload
   *
   * Useful for client-side uploads from mobile app
   *
   * @param upc Product UPC
   * @param expiresIn Expiration time in seconds
   * @returns Presigned upload URL
   */
  async generateUploadUrl(upc: string, expiresIn: number = 3600): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const key = `${this.config.keyPrefix}/uploads/${upc}/${Date.now()}.jpg`;

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: 'image/jpeg',
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Delete product images
   *
   * @param upc Product UPC
   */
  async deleteImages(upc: string): Promise<void> {
    // TODO: Implement S3 batch delete
    // This is a placeholder for future implementation
    console.log(`Delete images for UPC ${upc}`);
  }
}
