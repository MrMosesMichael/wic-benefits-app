/**
 * APL (Approved Product List) Ingestion Services
 *
 * Entry point for state-specific APL data ingestion services.
 *
 * @module services/apl
 */

// Michigan Ingestion
export {
  MichiganAPLIngestionService,
  ingestMichiganAPL,
  type MichiganAPLConfig,
  type IngestionStats,
} from './michigan-ingestion.service';

export {
  MichiganSyncWorker,
  startMichiganSyncWorker,
  type MichiganSyncWorkerConfig,
  type SyncStatus,
} from './workers/michigan-sync-worker';

export {
  MICHIGAN_APL_URLS,
  MICHIGAN_SYNC_CONFIG,
  MICHIGAN_VALIDATION_CONFIG,
  MICHIGAN_METADATA,
  MICHIGAN_FEATURE_FLAGS,
  getMichiganAPLConfig,
  validateMichiganConfig,
} from './config/michigan.config';

// North Carolina Ingestion
export {
  NorthCarolinaAPLIngestionService,
  ingestNorthCarolinaAPL,
  type NorthCarolinaAPLConfig,
} from './north-carolina-ingestion.service';

export {
  NorthCarolinaSyncWorker,
  runStandaloneWorker as runNorthCarolinaSyncWorker,
  type SyncWorkerStatus as NorthCarolinaSyncWorkerStatus,
} from './workers/north-carolina-sync-worker';

export {
  NORTH_CAROLINA_APL_URLS,
  NORTH_CAROLINA_SYNC_CONFIG,
  NORTH_CAROLINA_VALIDATION_CONFIG,
  NORTH_CAROLINA_METADATA,
  CONDUENT_FIELD_MAPPING,
  NORTH_CAROLINA_FEATURE_FLAGS,
  getNorthCarolinaAPLConfig,
  validateNorthCarolinaConfig,
} from './config/north-carolina.config';

// Re-export types
export type { APLEntry, APLSyncStatus, APLChangeLog } from '../../types/apl.types';

/**
 * Supported states and their processors
 */
export const SUPPORTED_STATES = {
  MI: {
    name: 'Michigan',
    processor: 'FIS',
    implemented: true,
  },
  NC: {
    name: 'North Carolina',
    processor: 'Conduent',
    implemented: true,
  },
  FL: {
    name: 'Florida',
    processor: 'FIS',
    implemented: false,
  },
  OR: {
    name: 'Oregon',
    processor: 'State-specific',
    implemented: false,
  },
} as const;

/**
 * Get list of implemented state ingestion services
 */
export function getImplementedStates(): string[] {
  return Object.entries(SUPPORTED_STATES)
    .filter(([_, info]) => info.implemented)
    .map(([code, _]) => code);
}

/**
 * Get processor type for a state
 */
export function getStateProcessor(state: string): string | null {
  const stateInfo = SUPPORTED_STATES[state as keyof typeof SUPPORTED_STATES];
  return stateInfo ? stateInfo.processor : null;
}

/**
 * Check if a state is supported
 */
export function isStateSupported(state: string): boolean {
  return state in SUPPORTED_STATES;
}

/**
 * Check if a state has implemented ingestion
 */
export function isStateImplemented(state: string): boolean {
  const stateInfo = SUPPORTED_STATES[state as keyof typeof SUPPORTED_STATES];
  return stateInfo ? stateInfo.implemented : false;
}
