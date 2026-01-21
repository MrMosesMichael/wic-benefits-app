/**
 * Product Lookup API Routes
 *
 * Implements A2.3 - Build product lookup API endpoint
 *
 * Endpoints:
 * - GET  /api/v1/products/:upc - Get product by UPC
 * - POST /api/v1/products/batch - Batch lookup multiple UPCs
 * - GET  /api/v1/products/search - Search products
 * - POST /api/v1/products/report - Report unknown product
 * - GET  /api/v1/products/stats - Get product coverage statistics
 */

import { Router, Request, Response } from 'express';
import { ProductRepository } from '../../src/database/ProductRepository';
import { ProductServiceWithDB } from '../../src/services/product/ProductServiceWithDB';
import pool from '../config/database';
import { Product, ProductQueryParams } from '../../src/types/product.types';

const router = Router();

// Initialize repository and service
const productRepository = new ProductRepository({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'wic_benefits',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const productService = new ProductServiceWithDB(productRepository, {
  upcDatabaseApiKey: process.env.UPC_DATABASE_API_KEY,
  enableCache: true,
  cacheTtl: 30 * 24 * 60 * 60 * 1000, // 30 days
  timeout: 5000,
  enableRetry: true,
  maxRetries: 2,
  autoSaveToDb: true,
});

/**
 * GET /api/v1/products/search
 *
 * Search products by query parameters
 *
 * Query params:
 * - q: Search query (name, brand, UPC)
 * - brand: Brand filter
 * - category: Category filter
 * - verified: Only verified products (true/false)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 *
 * Response:
 * {
 *   "data": [ ... ],
 *   "meta": {
 *     "total": 500,
 *     "page": 1,
 *     "limit": 20,
 *     "hasMore": true
 *   }
 * }
 */
router.get('/search', async (req: Request, res: Response) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    const {
      q,
      brand,
      category,
      verified,
      page = '1',
      limit = '20',
    } = req.query;

    // Parse and validate pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PAGE',
          message: 'page must be a positive integer',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LIMIT',
          message: 'limit must be between 1 and 100',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Build query params
    const queryParams: ProductQueryParams = {
      page: pageNum,
      limit: limitNum,
    };

    if (q) {
      queryParams.search = q as string;
    }

    if (brand) {
      queryParams.brand = brand as string;
    }

    if (category) {
      queryParams.category = category as string;
    }

    if (verified === 'true') {
      queryParams.verifiedOnly = true;
    }

    const results = await productService.searchProducts(queryParams);

    res.json({
      data: results,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        page: pageNum,
        limit: limitNum,
        count: results.length,
        hasMore: results.length === limitNum,
        responseTime: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error('Product search error:', error);
    res.status(500).json({
      error: {
        code: 'SEARCH_FAILED',
        message: 'Failed to search products',
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
 * GET /api/v1/products/stats
 *
 * Get product coverage statistics
 *
 * Response:
 * {
 *   "data": {
 *     "totalProducts": 150000,
 *     "productsWithImages": 120000,
 *     "productsWithNutrition": 100000,
 *     "verifiedProducts": 75000,
 *     "coverageBySource": {...},
 *     "coverageByCategory": {...}
 *   }
 * }
 */
router.get('/stats', async (req: Request, res: Response) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const stats = await productService.getCoverageStats();

    res.json({
      data: stats,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Product stats error:', error);
    res.status(500).json({
      error: {
        code: 'STATS_FAILED',
        message: 'Failed to get product statistics',
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
 * POST /api/v1/products/batch
 *
 * Batch lookup multiple products by UPCs
 *
 * Request:
 * {
 *   "upcs": ["012345678901", "098765432109", ...]
 * }
 *
 * Response:
 * {
 *   "data": [
 *     { "upc": "012345678901", "found": true, "product": {...} },
 *     { "upc": "098765432109", "found": false }
 *   ],
 *   "meta": {
 *     "total": 2,
 *     "found": 1,
 *     "notFound": 1
 *   }
 * }
 */
router.post('/batch', async (req: Request, res: Response) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    const { upcs } = req.body;

    // Validate input
    if (!Array.isArray(upcs) || upcs.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'upcs must be a non-empty array',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (upcs.length > 100) {
      return res.status(400).json({
        error: {
          code: 'TOO_MANY_UPCS',
          message: 'Maximum 100 UPCs allowed per batch request',
          details: { count: upcs.length, max: 100 },
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate UPC formats
    const invalidUpcs = upcs.filter((upc: string) => !/^\d{8,14}$/.test(upc));
    if (invalidUpcs.length > 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_UPCS',
          message: 'All UPCs must be 8-14 digits',
          details: { invalidUpcs: invalidUpcs.slice(0, 10) },
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const results = await productService.lookupProducts(upcs);

    const found = results.filter(r => r.found).length;
    const notFound = results.length - found;

    res.json({
      data: results,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        total: results.length,
        found,
        notFound,
        responseTime: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error('Batch product lookup error:', error);
    res.status(500).json({
      error: {
        code: 'BATCH_LOOKUP_FAILED',
        message: 'Failed to lookup products',
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
 * POST /api/v1/products/report
 *
 * Report unknown product or submit correction
 *
 * Request:
 * {
 *   "upc": "012345678901",
 *   "reportedBy": "user_123",
 *   "userProvidedInfo": {
 *     "name": "Product Name",
 *     "brand": "Brand Name",
 *     ...
 *   }
 * }
 *
 * Response:
 * {
 *   "data": {
 *     "reportId": "report_abc123"
 *   }
 * }
 */
router.post('/report', async (req: Request, res: Response) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const { upc, reportedBy, userProvidedInfo } = req.body;

    // Validate input
    if (!upc || !/^\d{8,14}$/.test(upc)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_UPC',
          message: 'upc must be 8-14 digits',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (!reportedBy) {
      return res.status(400).json({
        error: {
          code: 'MISSING_USER_ID',
          message: 'reportedBy is required',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const reportId = await productService.reportUnknownProduct(
      upc,
      reportedBy,
      userProvidedInfo
    );

    res.status(201).json({
      data: {
        reportId,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Product report error:', error);
    res.status(500).json({
      error: {
        code: 'REPORT_FAILED',
        message: 'Failed to submit product report',
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
 * GET /api/v1/products/:upc
 *
 * Get product by UPC
 *
 * Response:
 * {
 *   "data": {
 *     "upc": "012345678901",
 *     "found": true,
 *     "product": { ... },
 *     "cached": false,
 *     "responseTime": 245,
 *     "confidence": 85
 *   },
 *   "meta": {
 *     "requestId": "req_abc123",
 *     "timestamp": "2024-01-15T10:30:00Z"
 *   }
 * }
 */
router.get('/:upc', async (req: Request, res: Response) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    const { upc } = req.params;

    // Validate UPC format
    if (!upc || !/^\d{8,14}$/.test(upc)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_UPC',
          message: 'UPC must be 8-14 digits',
          details: { upc },
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const result = await productService.lookupProduct(upc);

    res.json({
      data: result,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error('Product lookup error:', error);
    res.status(500).json({
      error: {
        code: 'PRODUCT_LOOKUP_FAILED',
        message: 'Failed to lookup product',
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
