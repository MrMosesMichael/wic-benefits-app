/**
 * Product Image API Routes
 *
 * Implements A2.4 - Product image storage/CDN
 *
 * Endpoints:
 * - POST /api/v1/product-images/upload/:upc - Upload image from URL
 * - POST /api/v1/product-images/upload-direct/:upc - Get presigned URL for direct upload
 * - GET  /api/v1/product-images/:upc - Get product image URLs
 * - GET  /api/v1/product-images/proxy - Proxy external image with caching
 * - DELETE /api/v1/product-images/:upc - Delete product images
 */

import { Router, Request, Response } from 'express';
import { ImageStorageService } from '../../src/services/product/ImageStorageService';
import { ProductRepository } from '../../src/database/ProductRepository';

const router = Router();

// Initialize image storage service
const imageService = new ImageStorageService({
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.S3_BUCKET || 'wic-benefits-product-images',
  keyPrefix: 'product-images',
  cdnBaseUrl: process.env.CDN_BASE_URL,
  enableLocalFallback: process.env.NODE_ENV === 'development',
  localStoragePath: process.env.LOCAL_IMAGE_PATH || './storage/images',
  enableProxy: true,
  proxyCacheTtl: 7 * 24 * 60 * 60, // 7 days
});

// Initialize product repository
const productRepository = new ProductRepository({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'wic_benefits',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

/**
 * POST /api/v1/product-images/upload/:upc
 *
 * Upload product image from external URL
 *
 * Request body:
 * {
 *   "imageUrl": "https://external.com/image.jpg"
 * }
 *
 * Response:
 * {
 *   "data": {
 *     "originalUrl": "https://...",
 *     "thumbnailUrl": "https://cdn.../thumbnail.jpg",
 *     "mediumUrl": "https://cdn.../medium.jpg",
 *     "fullUrl": "https://cdn.../full.jpg",
 *     "s3Key": "product-images/012345678901/abc123",
 *     "fileSize": 125678,
 *     "dimensions": { "width": 800, "height": 600 }
 *   }
 * }
 */
router.post('/upload/:upc', async (req: Request, res: Response) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    const { upc } = req.params;
    const { imageUrl } = req.body;

    // Validate UPC
    if (!upc || !/^\d{8,14}$/.test(upc)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_UPC',
          message: 'UPC must be 8-14 digits',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate image URL
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({
        error: {
          code: 'INVALID_IMAGE_URL',
          message: 'imageUrl is required',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Upload image
    const result = await imageService.uploadFromUrl(imageUrl, upc);

    // Update product record with new image URLs
    try {
      const product = await productRepository.findByUpc(upc);
      if (product) {
        await productRepository.update({
          ...product,
          imageUrl: result.fullUrl,
          thumbnailUrl: result.thumbnailUrl,
        });
      }
    } catch (dbError) {
      console.error('Failed to update product record:', dbError);
      // Continue - image was uploaded successfully
    }

    res.json({
      data: result,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      error: {
        code: 'UPLOAD_FAILED',
        message: 'Failed to upload image',
        details: error instanceof Error ? { message: error.message } : {},
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /api/v1/product-images/upload-direct/:upc
 *
 * Get presigned URL for direct upload from mobile app
 *
 * Response:
 * {
 *   "data": {
 *     "uploadUrl": "https://s3.amazonaws.com/...",
 *     "expiresIn": 3600
 *   }
 * }
 */
router.post('/upload-direct/:upc', async (req: Request, res: Response) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const { upc } = req.params;

    // Validate UPC
    if (!upc || !/^\d{8,14}$/.test(upc)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_UPC',
          message: 'UPC must be 8-14 digits',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const expiresIn = 3600; // 1 hour
    const uploadUrl = await imageService.generateUploadUrl(upc, expiresIn);

    res.json({
      data: {
        uploadUrl,
        expiresIn,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Presigned URL generation error:', error);
    res.status(500).json({
      error: {
        code: 'PRESIGNED_URL_FAILED',
        message: 'Failed to generate upload URL',
        details: error instanceof Error ? { message: error.message } : {},
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /api/v1/product-images/:upc
 *
 * Get product image URLs
 *
 * Response:
 * {
 *   "data": {
 *     "upc": "012345678901",
 *     "hasImages": true,
 *     "thumbnailUrl": "https://...",
 *     "mediumUrl": "https://...",
 *     "fullUrl": "https://..."
 *   }
 * }
 */
router.get('/:upc', async (req: Request, res: Response) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const { upc } = req.params;

    // Validate UPC
    if (!upc || !/^\d{8,14}$/.test(upc)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_UPC',
          message: 'UPC must be 8-14 digits',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if product exists in database
    const product = await productRepository.findByUpc(upc);

    if (!product) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.json({
      data: {
        upc,
        hasImages: !!product.imageUrl,
        thumbnailUrl: product.thumbnailUrl,
        mediumUrl: product.imageUrl, // Use imageUrl as medium for now
        fullUrl: product.imageUrl,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Image retrieval error:', error);
    res.status(500).json({
      error: {
        code: 'RETRIEVAL_FAILED',
        message: 'Failed to retrieve image URLs',
        details: error instanceof Error ? { message: error.message } : {},
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /api/v1/product-images/proxy
 *
 * Proxy external image URL with caching
 *
 * Query params:
 * - url: External image URL to proxy
 *
 * Response:
 * {
 *   "data": {
 *     "originalUrl": "https://external.com/image.jpg",
 *     "cachedUrl": "https://cdn.../proxy/abc123.jpg"
 *   }
 * }
 */
router.get('/proxy', async (req: Request, res: Response) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: {
          code: 'INVALID_URL',
          message: 'url query parameter is required',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Proxy and cache the image
    const cachedUrl = await imageService.proxyImage(url);

    res.json({
      data: {
        originalUrl: url,
        cachedUrl,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({
      error: {
        code: 'PROXY_FAILED',
        message: 'Failed to proxy image',
        details: error instanceof Error ? { message: error.message } : {},
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * DELETE /api/v1/product-images/:upc
 *
 * Delete product images
 *
 * Response:
 * {
 *   "data": {
 *     "deleted": true
 *   }
 * }
 */
router.delete('/:upc', async (req: Request, res: Response) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const { upc } = req.params;

    // Validate UPC
    if (!upc || !/^\d{8,14}$/.test(upc)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_UPC',
          message: 'UPC must be 8-14 digits',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Delete images
    await imageService.deleteImages(upc);

    // Update product record
    try {
      const product = await productRepository.findByUpc(upc);
      if (product) {
        await productRepository.update({
          ...product,
          imageUrl: undefined,
          thumbnailUrl: undefined,
        });
      }
    } catch (dbError) {
      console.error('Failed to update product record:', dbError);
    }

    res.json({
      data: {
        deleted: true,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({
      error: {
        code: 'DELETION_FAILED',
        message: 'Failed to delete images',
        details: error instanceof Error ? { message: error.message } : {},
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router;
