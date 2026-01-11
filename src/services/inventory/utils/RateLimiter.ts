/**
 * Rate Limiter Utility
 * Implements token bucket algorithm for API rate limiting
 */

import { RateLimitConfig, RateLimitError, RetailerApiType } from '../../../types/inventory.types';

interface TokenBucket {
  tokens: number;
  lastRefill: Date;
  config: RateLimitConfig;
}

export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private retailer: RetailerApiType;

  constructor(retailer: RetailerApiType, private defaultConfig: RateLimitConfig) {
    this.retailer = retailer;
  }

  /**
   * Acquire a token (permission to make a request)
   * Throws RateLimitError if no tokens available
   */
  async acquire(key: string = 'default'): Promise<void> {
    const bucket = this.getOrCreateBucket(key);

    // Refill tokens based on time elapsed
    this.refillTokens(bucket);

    // Check if we have tokens available
    if (bucket.tokens < 1) {
      const retryAfter = this.calculateRetryAfter(bucket);
      throw new RateLimitError(this.retailer, retryAfter);
    }

    // Consume a token
    bucket.tokens -= 1;
  }

  /**
   * Try to acquire a token without throwing
   * Returns true if successful, false if rate limited
   */
  async tryAcquire(key: string = 'default'): Promise<boolean> {
    try {
      await this.acquire(key);
      return true;
    } catch (error) {
      if (error instanceof RateLimitError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Wait until a token is available, then acquire it
   */
  async waitAndAcquire(key: string = 'default', maxWaitMs: number = 60000): Promise<void> {
    const startTime = Date.now();

    while (true) {
      try {
        await this.acquire(key);
        return;
      } catch (error) {
        if (error instanceof RateLimitError) {
          const elapsed = Date.now() - startTime;
          if (elapsed >= maxWaitMs) {
            throw new Error(`Rate limit wait timeout after ${maxWaitMs}ms`);
          }

          // Wait before retrying
          const waitTime = Math.min(error.retryAfter || 1000, maxWaitMs - elapsed);
          await this.delay(waitTime);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Get or create a token bucket
   */
  private getOrCreateBucket(key: string): TokenBucket {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.getMaxTokens(this.defaultConfig),
        lastRefill: new Date(),
        config: this.defaultConfig,
      };
      this.buckets.set(key, bucket);
    }

    return bucket;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(bucket: TokenBucket): void {
    const now = new Date();
    const elapsedMs = now.getTime() - bucket.lastRefill.getTime();

    // Calculate refill rate (tokens per millisecond)
    const refillRate = this.calculateRefillRate(bucket.config);

    // Add tokens based on elapsed time
    const tokensToAdd = refillRate * elapsedMs;
    const maxTokens = this.getMaxTokens(bucket.config);

    bucket.tokens = Math.min(bucket.tokens + tokensToAdd, maxTokens);
    bucket.lastRefill = now;
  }

  /**
   * Calculate token refill rate (tokens per millisecond)
   */
  private calculateRefillRate(config: RateLimitConfig): number {
    // Use the most restrictive limit
    if (config.requestsPerMinute) {
      return config.requestsPerMinute / (60 * 1000);
    }
    if (config.requestsPerHour) {
      return config.requestsPerHour / (60 * 60 * 1000);
    }
    if (config.requestsPerDay) {
      return config.requestsPerDay / (24 * 60 * 60 * 1000);
    }

    // Default: 1 request per second
    return 1 / 1000;
  }

  /**
   * Get maximum tokens (burst size)
   */
  private getMaxTokens(config: RateLimitConfig): number {
    if (config.burstSize) {
      return config.burstSize;
    }

    // Default burst size based on rate
    if (config.requestsPerMinute) {
      return Math.ceil(config.requestsPerMinute / 4); // 25% of minute limit
    }
    if (config.requestsPerHour) {
      return Math.ceil(config.requestsPerHour / 60); // 1 minute worth
    }
    if (config.requestsPerDay) {
      return Math.ceil(config.requestsPerDay / 1440); // 1 minute worth
    }

    return 10; // Default burst
  }

  /**
   * Calculate seconds until next token available
   */
  private calculateRetryAfter(bucket: TokenBucket): number {
    const refillRate = this.calculateRefillRate(bucket.config);
    const msUntilNextToken = 1 / refillRate;
    return Math.ceil(msUntilNextToken / 1000);
  }

  /**
   * Reset a specific bucket
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Reset all buckets
   */
  resetAll(): void {
    this.buckets.clear();
  }

  /**
   * Get current token count for a bucket
   */
  getTokenCount(key: string = 'default'): number {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return this.getMaxTokens(this.defaultConfig);
    }

    this.refillTokens(bucket);
    return Math.floor(bucket.tokens);
  }

  /**
   * Get rate limit statistics
   */
  getStats(key: string = 'default'): {
    tokens: number;
    maxTokens: number;
    percentAvailable: number;
  } {
    const tokens = this.getTokenCount(key);
    const maxTokens = this.getMaxTokens(this.defaultConfig);

    return {
      tokens,
      maxTokens,
      percentAvailable: (tokens / maxTokens) * 100,
    };
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Rate limiter factory for common retailers
 */
export class RateLimiterFactory {
  /**
   * Create rate limiter for Walmart API
   * Free tier: 5000 requests/day
   */
  static createWalmartLimiter(): RateLimiter {
    return new RateLimiter('walmart', {
      requestsPerDay: 5000,
      burstSize: 10, // Allow small bursts
    });
  }

  /**
   * Create rate limiter for Kroger API
   * Configurable per partnership
   */
  static createKrogerLimiter(requestsPerDay: number = 10000): RateLimiter {
    return new RateLimiter('kroger', {
      requestsPerDay,
      burstSize: 20,
    });
  }

  /**
   * Create rate limiter for web scraping
   * Conservative limits to avoid detection
   */
  static createScraperLimiter(retailer: RetailerApiType): RateLimiter {
    return new RateLimiter(retailer, {
      requestsPerMinute: 10, // Very conservative
      burstSize: 3,
    });
  }

  /**
   * Create custom rate limiter
   */
  static create(retailer: RetailerApiType, config: RateLimitConfig): RateLimiter {
    return new RateLimiter(retailer, config);
  }
}
