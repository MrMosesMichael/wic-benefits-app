/**
 * Retry Handler with Exponential Backoff
 * Handles retrying failed API requests with intelligent backoff
 */

import { RateLimitError, InventoryAPIError } from '../../../types/inventory.types';

export interface RetryConfig {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'],
};

export class RetryHandler {
  private config: Required<RetryConfig>;

  constructor(config: RetryConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < this.config.maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Don't retry if we've exhausted attempts
        if (attempt >= this.config.maxAttempts) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryable(error)) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, error);

        // Log retry attempt
        console.warn(
          `[RetryHandler] Attempt ${attempt}/${this.config.maxAttempts} failed${
            context ? ` (${context})` : ''
          }. Retrying in ${delay}ms...`,
          error
        );

        // Wait before retrying
        await this.delay(delay);
      }
    }

    // All attempts failed
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Check if an error is retryable
   */
  private isRetryable(error: unknown): boolean {
    // Always retry rate limit errors
    if (error instanceof RateLimitError) {
      return true;
    }

    // Don't retry authentication errors
    if (error instanceof InventoryAPIError && error.code === 'AUTH_FAILED') {
      return false;
    }

    // Don't retry product not found errors
    if (error instanceof InventoryAPIError && error.code === 'PRODUCT_NOT_FOUND') {
      return false;
    }

    // Retry 5xx server errors
    if (error instanceof InventoryAPIError && error.statusCode && error.statusCode >= 500) {
      return true;
    }

    // Retry network errors
    if (error instanceof Error) {
      for (const retryableError of this.config.retryableErrors) {
        if (error.message.includes(retryableError)) {
          return true;
        }
      }
    }

    // Don't retry by default
    return false;
  }

  /**
   * Calculate delay with exponential backoff
   */
  private calculateDelay(attempt: number, error: unknown): number {
    // If rate limit error, use the retry-after if provided
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000;
    }

    // Exponential backoff: initialDelay * (multiplier ^ (attempt - 1))
    const exponentialDelay =
      this.config.initialDelayMs *
      Math.pow(this.config.backoffMultiplier, attempt - 1);

    // Add jitter to avoid thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay; // ±30% jitter

    // Cap at max delay
    return Math.min(exponentialDelay + jitter, this.config.maxDelayMs);
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<RetryConfig> {
    return { ...this.config };
  }
}

/**
 * Decorator for automatic retry on methods
 */
export function withRetry(config?: RetryConfig) {
  const handler = new RetryHandler(config);

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return handler.execute(
        () => originalMethod.apply(this, args),
        `${target.constructor.name}.${propertyKey}`
      );
    };

    return descriptor;
  };
}

/**
 * Helper function for one-off retries
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config?: RetryConfig
): Promise<T> {
  const handler = new RetryHandler(config);
  return handler.execute(fn);
}
