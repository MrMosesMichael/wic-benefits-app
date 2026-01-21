/**
 * Store Ingestion Scheduled Job
 *
 * Runs monthly to refresh WIC store data from state sources
 * Can be triggered manually or via cron
 */

import { StoreIngestionPipeline } from '../services/store/StoreIngestionPipeline';
import { StateCode } from '../services/retailer/types/retailer.types';

interface JobConfig {
  states?: StateCode[];
  dryRun?: boolean;
  notifyOnCompletion?: boolean;
}

export class StoreIngestionJob {
  private pipeline: StoreIngestionPipeline;

  constructor() {
    this.pipeline = new StoreIngestionPipeline();
  }

  /**
   * Run the store ingestion job
   */
  async run(config: JobConfig = {}): Promise<void> {
    console.log('[StoreIngestionJob] Starting scheduled store ingestion...');
    console.log(`[StoreIngestionJob] Configuration:`, config);

    const startTime = Date.now();

    try {
      const result = await this.pipeline.ingest({
        states: config.states,
        dryRun: config.dryRun,
        batchSize: 50,
      });

      const durationSec = (Date.now() - startTime) / 1000;

      console.log('[StoreIngestionJob] Job completed successfully');
      console.log(`[StoreIngestionJob] Total duration: ${durationSec.toFixed(2)}s`);

      if (config.notifyOnCompletion) {
        await this.sendNotification(result, 'success');
      }

      // Exit with success
      process.exit(0);
    } catch (error) {
      console.error('[StoreIngestionJob] Job failed with error:', error);

      if (config.notifyOnCompletion) {
        await this.sendNotification(error, 'failure');
      }

      // Exit with error
      process.exit(1);
    }
  }

  /**
   * Send notification about job completion
   */
  private async sendNotification(data: any, status: 'success' | 'failure'): Promise<void> {
    // Placeholder for notification system (Slack, email, etc.)
    console.log(`[StoreIngestionJob] Would send ${status} notification:`, data);
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);

  const config: JobConfig = {
    dryRun: args.includes('--dry-run'),
    notifyOnCompletion: args.includes('--notify'),
  };

  // Parse states argument: --states=MI,NC,FL,OR
  const statesArg = args.find(arg => arg.startsWith('--states='));
  if (statesArg) {
    const statesStr = statesArg.split('=')[1];
    config.states = statesStr.split(',') as StateCode[];
  }

  const job = new StoreIngestionJob();
  job.run(config);
}
