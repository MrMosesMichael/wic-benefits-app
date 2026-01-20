/**
 * Rate Limiter
 * Token bucket algorithm for API rate limiting
 */

import { RateLimitConfig, RateLimitError } from '../../types/inventory.types';

export class RateLimiter {
  private tokens: number;
  private lastRefillTime: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second
  private readonly burstSize: number;

  constructor(config: RateLimitConfig) {
    // Calculate refill rate based on limits
    let tokensPerSecond = 0;

    if (config.requestsPerMinute) {
      tokensPerSecond = config.requestsPerMinute / 60;
    } else if (config.requestsPerHour) {
      tokensPerSecond = config.requestsPerHour / 3600;
    } else if (config.requestsPerDay) {
      tokensPerSecond = config.requestsPerDay / 86400;
    } else {
      // Default: 60 requests per minute
      tokensPerSecond = 1;
    }

    this.refillRate = tokensPerSecond;
    this.burstSize = config.burstSize || Math.ceil(tokensPerSecond * 10); // 10 seconds worth
    this.maxTokens = this.burstSize;
    this.tokens = this.burstSize;
    this.lastRefillTime = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefillTime = now;
    }
  }

  /**
   * Attempt to consume tokens for a request
   * @returns true if tokens were available, false otherwise
   */
  tryConsume(tokensNeeded: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokensNeeded) {
      this.tokens -= tokensNeeded;
      return true;
    }

    return false;
  }

  /**
   * Wait until tokens are available, then consume
   * @param tokensNeeded Number of tokens needed
   * @returns Promise that resolves when tokens are consumed
   */
  async waitAndConsume(tokensNeeded: number = 1): Promise<void> {
    this.refill();

    if (this.tokens >= tokensNeeded) {
      this.tokens -= tokensNeeded;
      return;
    }

    // Calculate wait time
    const tokensShortfall = tokensNeeded - this.tokens;
    const waitSeconds = tokensShortfall / this.refillRate;
    const waitMs = Math.ceil(waitSeconds * 1000);

    await new Promise(resolve => setTimeout(resolve, waitMs));

    // Refill and consume
    this.refill();
    this.tokens -= tokensNeeded;
  }

  /**
   * Get time until tokens will be available (in milliseconds)
   */
  getTimeUntilAvailable(tokensNeeded: number = 1): number {
    this.refill();

    if (this.tokens >= tokensNeeded) {
      return 0;
    }

    const tokensShortfall = tokensNeeded - this.tokens;
    const waitSeconds = tokensShortfall / this.refillRate;
    return Math.ceil(waitSeconds * 1000);
  }

  /**
   * Get current token count
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Get rate limit status
   */
  getStatus(): {
    available: number;
    max: number;
    refillRate: number;
    utilizationPercent: number;
  } {
    this.refill();
    return {
      available: Math.floor(this.tokens),
      max: this.maxTokens,
      refillRate: this.refillRate,
      utilizationPercent: Math.round(((this.maxTokens - this.tokens) / this.maxTokens) * 100),
    };
  }

  /**
   * Reset the rate limiter (useful for testing)
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
  }
}

/**
 * Rate limiter manager for multiple APIs
 */
export class RateLimiterManager {
  private limiters: Map<string, RateLimiter> = new Map();

  /**
   * Register a rate limiter for a specific API
   */
  register(apiName: string, config: RateLimitConfig): void {
    this.limiters.set(apiName, new RateLimiter(config));
  }

  /**
   * Get or create a rate limiter for an API
   */
  get(apiName: string, defaultConfig?: RateLimitConfig): RateLimiter {
    let limiter = this.limiters.get(apiName);

    if (!limiter) {
      if (!defaultConfig) {
        // Default configuration: 60 requests per minute
        defaultConfig = { requestsPerMinute: 60, burstSize: 10 };
      }
      limiter = new RateLimiter(defaultConfig);
      this.limiters.set(apiName, limiter);
    }

    return limiter;
  }

  /**
   * Try to consume tokens from a specific API limiter
   */
  tryConsume(apiName: string, tokensNeeded: number = 1): boolean {
    const limiter = this.limiters.get(apiName);
    if (!limiter) {
      return true; // No limiter configured, allow request
    }
    return limiter.tryConsume(tokensNeeded);
  }

  /**
   * Wait for tokens to be available from a specific API limiter
   */
  async waitAndConsume(apiName: string, tokensNeeded: number = 1): Promise<void> {
    const limiter = this.limiters.get(apiName);
    if (!limiter) {
      return; // No limiter configured, allow request immediately
    }
    await limiter.waitAndConsume(tokensNeeded);
  }

  /**
   * Get status for all registered limiters
   */
  getAllStatus(): Record<string, ReturnType<RateLimiter['getStatus']>> {
    const status: Record<string, ReturnType<RateLimiter['getStatus']>> = {};

    this.limiters.forEach((limiter, apiName) => {
      status[apiName] = limiter.getStatus();
    });

    return status;
  }
}

// Export singleton instance
export const rateLimiterManager = new RateLimiterManager();
