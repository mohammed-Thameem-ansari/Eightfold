/**
 * Rate Limiting Middleware
 * Implements token bucket algorithm for API rate limiting
 */

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  windowMs: number;
}

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

class RateLimiter {
  private buckets: Map<string, RateLimitBucket> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is allowed
   */
  checkLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    let bucket = this.buckets.get(identifier);

    if (!bucket) {
      bucket = {
        tokens: this.config.maxTokens - 1,
        lastRefill: now,
      };
      this.buckets.set(identifier, bucket);
      return { allowed: true };
    }

    // Refill tokens based on time elapsed
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = (elapsed / 1000) * this.config.refillRate;
    bucket.tokens = Math.min(this.config.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true };
    }

    // Calculate retry after
    const tokensNeeded = 1 - bucket.tokens;
    const retryAfter = Math.ceil((tokensNeeded / this.config.refillRate) * 1000);

    return { allowed: false, retryAfter };
  }

  /**
   * Reset limit for identifier
   */
  reset(identifier: string) {
    this.buckets.delete(identifier);
  }

  /**
   * Clear all buckets
   */
  clearAll() {
    this.buckets.clear();
  }

  /**
   * Get current tokens for identifier
   */
  getTokens(identifier: string): number {
    const bucket = this.buckets.get(identifier);
    if (!bucket) return this.config.maxTokens;

    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = (elapsed / 1000) * this.config.refillRate;
    return Math.min(this.config.maxTokens, bucket.tokens + tokensToAdd);
  }
}

// Pre-configured rate limiters
export const apiRateLimiter = new RateLimiter({
  maxTokens: 100,
  refillRate: 10, // 10 requests per second
  windowMs: 60000,
});

export const authRateLimiter = new RateLimiter({
  maxTokens: 5,
  refillRate: 1, // 1 request per second
  windowMs: 60000,
});

export const searchRateLimiter = new RateLimiter({
  maxTokens: 20,
  refillRate: 2, // 2 requests per second
  windowMs: 60000,
});

/**
 * Get client identifier from request
 */
export function getClientIdentifier(req: Request): string {
  // Try to get IP from headers
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }

  // Fallback to user agent hash
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return `ua-${hashString(userAgent)}`;
}

/**
 * Simple string hash
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Rate limit middleware for API routes
 */
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  limiter: RateLimiter = apiRateLimiter
) {
  return async (req: Request): Promise<Response> => {
    const identifier = getClientIdentifier(req);
    const { allowed, retryAfter } = limiter.checkLimit(identifier);

    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(retryAfter! / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const response = await handler(req);
    
    // Add rate limit headers
    const remainingTokens = Math.floor(limiter.getTokens(identifier));
    response.headers.set('X-RateLimit-Remaining', String(remainingTokens));
    
    return response;
  };
}
