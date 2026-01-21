/**
 * Database Configuration
 *
 * Centralized database connection configuration.
 * Reads from environment variables with sensible defaults.
 */

import { DatabaseConfig } from './ProductRepository';

/**
 * Get database configuration from environment
 */
export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'wic_benefits',
    user: process.env.DB_USER || 'wic_user',
    password: process.env.DB_PASSWORD || '',
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
  };
}

/**
 * Validate database configuration
 *
 * Ensures required fields are present
 */
export function validateDatabaseConfig(config: DatabaseConfig): void {
  if (!config.host) {
    throw new Error('Database host is required');
  }

  if (!config.database) {
    throw new Error('Database name is required');
  }

  if (!config.user) {
    throw new Error('Database user is required');
  }

  if (!config.password) {
    console.warn('Database password is empty - this may fail in production');
  }
}
