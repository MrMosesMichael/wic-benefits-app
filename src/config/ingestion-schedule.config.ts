/**
 * Store Ingestion Schedule Configuration
 *
 * Defines when and how often store data should be refreshed
 */

export interface IngestionSchedule {
  enabled: boolean;
  cronExpression: string;
  timezone: string;
  states: string[];
  batchSize: number;
  notifyOnFailure: boolean;
  notifyOnSuccess: boolean;
  maxRetries: number;
  retryDelayMinutes: number;
}

/**
 * Default ingestion schedule
 * Runs monthly on the 1st at 2:00 AM ET
 */
export const DEFAULT_SCHEDULE: IngestionSchedule = {
  enabled: true,
  cronExpression: '0 2 1 * *', // At 02:00 on day-of-month 1
  timezone: 'America/New_York',
  states: ['MI', 'NC', 'FL', 'OR'],
  batchSize: 50,
  notifyOnFailure: true,
  notifyOnSuccess: true,
  maxRetries: 3,
  retryDelayMinutes: 60,
};

/**
 * Development schedule (more frequent for testing)
 * Runs daily at 3:00 AM ET
 */
export const DEV_SCHEDULE: IngestionSchedule = {
  enabled: true,
  cronExpression: '0 3 * * *', // At 03:00 every day
  timezone: 'America/New_York',
  states: ['MI', 'NC', 'FL', 'OR'],
  batchSize: 25,
  notifyOnFailure: true,
  notifyOnSuccess: false,
  maxRetries: 2,
  retryDelayMinutes: 30,
};

/**
 * Get schedule based on environment
 */
export function getScheduleForEnvironment(env: string = process.env.NODE_ENV || 'development'): IngestionSchedule {
  switch (env) {
    case 'production':
      return DEFAULT_SCHEDULE;
    case 'development':
    case 'test':
      return DEV_SCHEDULE;
    default:
      return DEFAULT_SCHEDULE;
  }
}

/**
 * Cron expression examples:
 *
 * '0 2 1 * *'       - At 02:00 on day-of-month 1 (monthly)
 * '0 3 * * *'       - At 03:00 every day
 * '0 2 * * 0'       - At 02:00 on Sunday (weekly)
 * '0 */6 * * *'     - Every 6 hours
 * '0 0 1,15 * *'    - At 00:00 on day-of-month 1 and 15 (twice monthly)
 */
