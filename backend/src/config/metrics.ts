import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import pool from './database';

// Create a custom registry so we control exactly what's exposed
const register = new client.Registry();

// Add default Node.js metrics (event loop lag, heap size, GC, etc.)
client.collectDefaultMetrics({ register });

// ── HTTP Metrics ──────────────────────────────────────────────────

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

const httpRequestsInFlight = new client.Gauge({
  name: 'http_requests_in_flight',
  help: 'Number of HTTP requests currently being processed',
  registers: [register],
});

// ── Database Metrics ──────────────────────────────────────────────

const dbPoolTotal = new client.Gauge({
  name: 'db_pool_connections_total',
  help: 'Total number of connections in the pool',
  registers: [register],
  collect() { this.set(pool.totalCount); },
});

const dbPoolIdle = new client.Gauge({
  name: 'db_pool_connections_idle',
  help: 'Number of idle connections in the pool',
  registers: [register],
  collect() { this.set(pool.idleCount); },
});

const dbPoolWaiting = new client.Gauge({
  name: 'db_pool_connections_waiting',
  help: 'Number of clients waiting for a connection',
  registers: [register],
  collect() { this.set(pool.waitingCount); },
});

const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

// ── APL Sync Metrics ─────────────────────────────────────────────

const aplSyncDuration = new client.Histogram({
  name: 'apl_sync_duration_seconds',
  help: 'Duration of APL sync operations in seconds',
  labelNames: ['state', 'status'] as const,
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [register],
});

const aplSyncTotal = new client.Counter({
  name: 'apl_sync_total',
  help: 'Total number of APL sync operations',
  labelNames: ['state', 'status'] as const,
  registers: [register],
});

const aplDataAge = new client.Gauge({
  name: 'apl_data_age_hours',
  help: 'Age of APL data in hours by state',
  labelNames: ['state'] as const,
  registers: [register],
});

const aplProductCount = new client.Gauge({
  name: 'apl_product_count',
  help: 'Number of products in APL by state',
  labelNames: ['state'] as const,
  registers: [register],
});

// ── App-specific Metrics ─────────────────────────────────────────

const scanTotal = new client.Counter({
  name: 'barcode_scans_total',
  help: 'Total barcode scans processed',
  labelNames: ['result'] as const, // eligible, ineligible, not_found
  registers: [register],
});

// ── Middleware ─────────────────────────────────────────────────────

/**
 * Normalize Express route paths for metric labels.
 * Collapses path params (e.g. /api/v1/stores/123 → /api/v1/stores/:id)
 * to prevent high-cardinality label explosion.
 */
function normalizeRoute(req: Request): string {
  // Use the matched Express route if available
  if (req.route?.path) {
    return req.baseUrl + req.route.path;
  }
  // Fallback: collapse numeric/UUID segments
  return req.path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '/:id')
    .replace(/\/\d+/g, '/:id');
}

function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Don't track metrics endpoint itself
  if (req.path === '/metrics') {
    next();
    return;
  }

  httpRequestsInFlight.inc();
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const route = normalizeRoute(req);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };
    end(labels);
    httpRequestsTotal.inc(labels);
    httpRequestsInFlight.dec();
  });

  next();
}

// ── Exports ───────────────────────────────────────────────────────

export {
  register,
  metricsMiddleware,
  httpRequestDuration,
  httpRequestsTotal,
  dbQueryDuration,
  aplSyncDuration,
  aplSyncTotal,
  aplDataAge,
  aplProductCount,
  scanTotal,
};
