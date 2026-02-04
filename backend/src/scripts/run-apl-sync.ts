#!/usr/bin/env ts-node
/**
 * APL Sync Runner
 *
 * Run this script via cron to automatically sync APL data from state sources.
 *
 * Usage:
 *   npm run apl-sync              # Sync all states due for update
 *   npm run apl-sync -- --state MI   # Sync specific state
 *   npm run apl-sync -- --force      # Force sync even if file unchanged
 *   npm run apl-sync -- --all        # Sync all configured states regardless of schedule
 *
 * Cron example (daily at 5am):
 *   0 5 * * * cd /path/to/backend && npm run apl-sync >> /var/log/apl-sync.log 2>&1
 */

import { aplSyncService } from '../services/APLSyncService';
import pool from '../config/database';

interface Args {
  state?: string;
  force: boolean;
  all: boolean;
  help: boolean;
}

function parseArgs(): Args {
  const args: Args = {
    force: false,
    all: false,
    help: false,
  };

  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--state' || arg === '-s') {
      args.state = argv[++i]?.toUpperCase();
    } else if (arg === '--force' || arg === '-f') {
      args.force = true;
    } else if (arg === '--all' || arg === '-a') {
      args.all = true;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
APL Sync Runner - Automated APL data synchronization

Usage:
  npm run apl-sync [options]

Options:
  --state, -s <STATE>   Sync a specific state (e.g., MI, NC, FL)
  --force, -f           Force sync even if file hasn't changed
  --all, -a             Sync all configured states regardless of schedule
  --help, -h            Show this help message

Examples:
  npm run apl-sync                   # Sync states due for update
  npm run apl-sync -- --state MI     # Sync Michigan only
  npm run apl-sync -- --force --all  # Force sync all states

Supported States:
  MI - Michigan (Excel)
  NC - North Carolina (HTML scraping)
  FL - Florida (PDF)
  OR - Oregon (Excel)
  NY - New York (PDF)

Note: PDF and HTML parsing require additional setup.
`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  APL Sync Runner');
  console.log(`  Started: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    if (args.state) {
      // Sync specific state
      console.log(`Syncing state: ${args.state}${args.force ? ' (forced)' : ''}\n`);

      const result = await aplSyncService.syncState(
        args.state,
        undefined,
        'scheduler',
        args.force
      );

      printResult(result);

    } else if (args.all) {
      // Sync all configured states
      console.log(`Syncing ALL configured states${args.force ? ' (forced)' : ''}\n`);

      const configs = await aplSyncService.getAllSourceConfigs();
      console.log(`Found ${configs.length} configured sources\n`);

      for (const config of configs) {
        if (!config.syncEnabled && !args.force) {
          console.log(`[${config.state}] Sync disabled, skipping\n`);
          continue;
        }

        try {
          const result = await aplSyncService.syncState(
            config.state,
            config.dataSource,
            'scheduler',
            args.force
          );
          printResult(result);
        } catch (error) {
          console.error(`[${config.state}] Error:`, error instanceof Error ? error.message : error);
          console.log();
        }
      }

    } else {
      // Sync states due for update
      console.log('Checking for states due for sync...\n');

      const dueStates = await aplSyncService.getStatesDueForSync();

      if (dueStates.length === 0) {
        console.log('No states are due for sync.\n');
        console.log('Use --all to sync all states or --state <STATE> for specific state.\n');
      } else {
        console.log(`Found ${dueStates.length} state(s) due for sync:\n`);
        dueStates.forEach(s => console.log(`  - ${s.state} (${s.dataSource})`));
        console.log();

        for (const config of dueStates) {
          try {
            const result = await aplSyncService.syncState(
              config.state,
              config.dataSource,
              'scheduler',
              args.force
            );
            printResult(result);
          } catch (error) {
            console.error(`[${config.state}] Error:`, error instanceof Error ? error.message : error);
            console.log();
          }
        }
      }
    }

    // Print summary
    const health = await aplSyncService.getHealthDashboard();
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Current Health Status');
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const state of health) {
      const statusIcon = state.is_healthy ? '✅' : '❌';
      const lastSync = state.last_success_at
        ? `${Math.round(state.hours_since_sync)}h ago`
        : 'Never';
      console.log(`  ${statusIcon} ${state.state}: ${state.current_product_count} products, last sync: ${lastSync}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  Completed: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

function printResult(result: any): void {
  const statusIcon = result.status === 'completed' ? '✅' : '❌';

  console.log(`${statusIcon} [${result.state}] Sync ${result.status}`);
  console.log(`   Job ID: ${result.jobId}`);
  console.log(`   Duration: ${result.durationMs}ms`);
  console.log(`   Processed: ${result.totalRowsProcessed} rows`);

  if (result.status === 'completed') {
    console.log(`   Added: ${result.productsAdded}`);
    console.log(`   Updated: ${result.productsUpdated}`);
    console.log(`   Removed: ${result.productsRemoved}`);
    console.log(`   Unchanged: ${result.productsUnchanged}`);
    if (result.validationErrors > 0) {
      console.log(`   Validation Errors: ${result.validationErrors}`);
    }
  } else {
    console.log(`   Error: ${result.errorMessage}`);
  }

  console.log();
}

main().catch(console.error);
