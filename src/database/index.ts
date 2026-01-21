/**
 * Database Module
 *
 * Exports database repositories and configuration
 */

export { ProductRepository } from './ProductRepository';
export type { DatabaseConfig } from './ProductRepository';
export { getDatabaseConfig, validateDatabaseConfig } from './config';
