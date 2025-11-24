import { CacheEntry } from '@/types'

/**
 * In-memory cache implementation
 * In production, use Redis or similar
 */
class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private defaultTTL: number = 3600000 // 1 hour

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: new Date(),
      ttl: ttl || this.defaultTTL,
      hits: 0,
    }
    this.cache.set(key, entry)
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    if (!entry) {
      return null
    }

    // Check if expired
    const age = Date.now() - entry.timestamp.getTime()
    if (age > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    // Increment hits
    entry.hits++
    return entry.data
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    // Check if expired
    const age = Date.now() - entry.timestamp.getTime()
    if (age > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    let cleared = 0
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp.getTime()
      if (age > entry.ttl) {
        this.cache.delete(key)
        cleared++
      }
    }

    return cleared
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
    totalHits: number;
    averageHits: number;
  } {
    const keys = Array.from(this.cache.keys())
    const entries = Array.from(this.cache.values())
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0)
    const averageHits = entries.length > 0 ? totalHits / entries.length : 0

    return {
      size: this.cache.size,
      keys,
      totalHits,
      averageHits,
    }
  }

  /**
   * Get cache entry metadata
   */
  getMetadata(key: string): {
    exists: boolean;
    age?: number;
    ttl?: number;
    hits?: number;
    expired?: boolean;
  } | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return { exists: false }
    }

    const age = Date.now() - entry.timestamp.getTime()
    const expired = age > entry.ttl

    return {
      exists: true,
      age,
      ttl: entry.ttl,
      hits: entry.hits,
      expired,
    }
  }
}

// Singleton instance
export const cacheManager = new CacheManager()

// Auto-cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cacheManager.clearExpired()
  }, 5 * 60 * 1000)
}

/**
 * Cache decorator for functions
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator
      ? keyGenerator(...args)
      : `cache_${fn.name}_${JSON.stringify(args)}`

    // Check cache
    const cached = cacheManager.get(key)
    if (cached !== null) {
      return cached
    }

    // Execute function
    const result = await fn(...args)

    // Cache result
    cacheManager.set(key, result, ttl)

    return result
  }) as T
}

/**
 * Generate cache key from parameters
 */
export function generateCacheKey(prefix: string, ...params: any[]): string {
  const paramString = params
    .map(p => typeof p === 'object' ? JSON.stringify(p) : String(p))
    .join('_')
  return `${prefix}_${paramString}`
}

