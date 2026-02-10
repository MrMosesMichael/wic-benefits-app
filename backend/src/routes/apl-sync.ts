/**
 * APL Sync API Routes
 * Admin endpoints for managing and monitoring APL data sync
 */

import { Router, Request, Response } from 'express';
import { aplSyncService } from '../services/APLSyncService';

const router = Router();

/**
 * GET /api/v1/apl-sync/health
 * Get APL sync health dashboard for all states
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await aplSyncService.getHealthDashboard();
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching APL health dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch health dashboard',
    });
  }
});

/**
 * GET /api/v1/apl-sync/sources
 * Get all configured APL sources
 */
router.get('/sources', async (req: Request, res: Response) => {
  try {
    const sources = await aplSyncService.getAllSourceConfigs();
    res.json({
      success: true,
      data: sources,
    });
  } catch (error) {
    console.error('Error fetching APL sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sources',
    });
  }
});

/**
 * GET /api/v1/apl-sync/jobs
 * Get recent sync jobs
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const jobs = await aplSyncService.getRecentSyncs(limit);
    res.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    console.error('Error fetching sync jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync jobs',
    });
  }
});

/**
 * GET /api/v1/apl-sync/jobs/:id
 * Get sync job details including product changes
 */
router.get('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id as string);
    const job = await aplSyncService.getSyncJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Sync job not found',
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Error fetching sync job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync job',
    });
  }
});

/**
 * GET /api/v1/apl-sync/changes
 * Get daily change statistics
 */
router.get('/changes', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const changes = await aplSyncService.getDailyChanges(days);
    res.json({
      success: true,
      data: changes,
    });
  } catch (error) {
    console.error('Error fetching daily changes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily changes',
    });
  }
});

/**
 * GET /api/v1/apl-sync/due
 * Get states due for sync
 */
router.get('/due', async (req: Request, res: Response) => {
  try {
    const dueStates = await aplSyncService.getStatesDueForSync();
    res.json({
      success: true,
      data: dueStates,
      count: dueStates.length,
    });
  } catch (error) {
    console.error('Error fetching due states:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch due states',
    });
  }
});

/**
 * POST /api/v1/apl-sync/trigger
 * Manually trigger a sync for a state
 */
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const { state, dataSource, force } = req.body;

    if (!state) {
      return res.status(400).json({
        success: false,
        error: 'State is required',
      });
    }

    console.log(`Manual sync triggered for ${state}${dataSource ? ` (${dataSource})` : ''}`);

    const result = await aplSyncService.syncState(
      state.toUpperCase(),
      dataSource,
      'manual',
      force === true
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error triggering sync:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/apl-sync/trigger-all
 * Trigger sync for all states that are due
 */
router.post('/trigger-all', async (req: Request, res: Response) => {
  try {
    console.log('Scheduled sync triggered for all due states');

    const results = await aplSyncService.runScheduledSync();

    const summary = {
      total: results.length,
      completed: results.filter(r => r.status === 'completed').length,
      failed: results.filter(r => r.status === 'failed').length,
      productsAdded: results.reduce((sum, r) => sum + r.productsAdded, 0),
      productsUpdated: results.reduce((sum, r) => sum + r.productsUpdated, 0),
      productsRemoved: results.reduce((sum, r) => sum + r.productsRemoved, 0),
    };

    res.json({
      success: true,
      summary,
      results,
    });
  } catch (error) {
    console.error('Error triggering scheduled sync:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/v1/apl-sync/state/:state
 * Get sync status for a specific state
 */
router.get('/state/:state', async (req: Request, res: Response) => {
  try {
    const state = (req.params.state as string).toUpperCase();
    const config = await aplSyncService.getSourceConfig(state);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: `No configuration found for state: ${state}`,
      });
    }

    // Get health data for this state
    const health = await aplSyncService.getHealthDashboard();
    const stateHealth = health.find(h => h.state === state);

    res.json({
      success: true,
      data: {
        config,
        health: stateHealth || null,
      },
    });
  } catch (error) {
    console.error('Error fetching state sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch state sync status',
    });
  }
});

export default router;
