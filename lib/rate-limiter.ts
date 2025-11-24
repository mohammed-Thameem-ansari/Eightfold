/**
 * Rate Limiter - Token bucket algorithm
 * Prevents API abuse and manages request throttling
 */

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface TokenBucket {
  tokens: number
  lastRefill: number
  maxTokens: number
  refillRate: number // tokens per second
}

export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }) {
    this.config = config
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(key: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    let bucket = this.buckets.get(key)
    
    if (!bucket) {
      bucket = {
        tokens: this.config.maxRequests,
        lastRefill: Date.now(),
        maxTokens: this.config.maxRequests,
        refillRate: this.config.maxRequests / (this.config.windowMs / 1000),
      }
      this.buckets.set(key, bucket)
    }

    // Refill tokens based on time elapsed
    this.refillBucket(bucket)

    // Check if we have tokens available
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1
      return { allowed: true }
    }

    // Calculate retry after time
    const tokensNeeded = 1
    const timeToRefill = (tokensNeeded / bucket.refillRate) * 1000
    return { allowed: false, retryAfter: Math.ceil(timeToRefill / 1000) }
  }

  /**
   * Refill bucket tokens based on elapsed time
   */
  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now()
    const elapsedMs = now - bucket.lastRefill
    const elapsedSeconds = elapsedMs / 1000
    
    const tokensToAdd = elapsedSeconds * bucket.refillRate
    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.buckets.delete(key)
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.buckets.clear()
  }

  /**
   * Get current status for a key
   */
  getStatus(key: string): { tokens: number; maxTokens: number } {
    const bucket = this.buckets.get(key)
    if (!bucket) {
      return { tokens: this.config.maxRequests, maxTokens: this.config.maxRequests }
    }
    
    this.refillBucket(bucket)
    return { tokens: Math.floor(bucket.tokens), maxTokens: bucket.maxTokens }
  }
}

// Global rate limiters for different services
export const searchRateLimiter = new RateLimiter({ maxRequests: 20, windowMs: 60000 }) // 20 requests per minute
export const llmRateLimiter = new RateLimiter({ maxRequests: 30, windowMs: 60000 }) // 30 requests per minute
export const scrapingRateLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 }) // 10 requests per minute
export const apiRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 }) // 100 requests per minute

/**
 * Rate limit middleware for API routes
 */
export async function withRateLimit<T>(
  key: string,
  limiter: RateLimiter,
  fn: () => Promise<T>
): Promise<T> {
  const result = await limiter.checkLimit(key)
  
  if (!result.allowed) {
    throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter} seconds`)
  }
  
  return fn()
}
