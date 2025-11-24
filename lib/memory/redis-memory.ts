/**
 * Redis Memory - Short-term conversational memory
 * Stores recent messages and session data with TTL
 */

import Redis from 'ioredis'
import { MemoryEntry } from './types'

export class RedisMemory {
  private client: Redis
  private ttl: number = 3600 // 1 hour default

  constructor(url?: string, ttl?: number) {
    this.client = new Redis(url || process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => {
        // Retry connection with exponential backoff
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    })

    if (ttl) this.ttl = ttl

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err)
    })

    this.client.on('connect', () => {
      console.log('Redis connected successfully')
    })
  }

  /**
   * Store a memory entry with TTL
   */
  async set(key: string, value: MemoryEntry): Promise<void> {
    try {
      await this.client.setex(key, this.ttl, JSON.stringify(value))
    } catch (error) {
      console.error('Redis SET error:', error)
      throw error
    }
  }

  /**
   * Retrieve a memory entry
   */
  async get(key: string): Promise<MemoryEntry | null> {
    try {
      const data = await this.client.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Redis GET error:', error)
      return null
    }
  }

  /**
   * Get all messages for a session
   */
  async getSessionMessages(sessionId: string, limit = 50): Promise<MemoryEntry[]> {
    try {
      const keys = await this.client.keys(`session:${sessionId}:message:*`)
      if (keys.length === 0) return []

      const messages = await Promise.all(keys.map(k => this.get(k)))
      return messages
        .filter(Boolean)
        .sort((a, b) => new Date(a!.timestamp).getTime() - new Date(b!.timestamp).getTime())
        .slice(-limit) as MemoryEntry[]
    } catch (error) {
      console.error('Redis getSessionMessages error:', error)
      return []
    }
  }

  /**
   * Store session metadata
   */
  async setSessionMeta(sessionId: string, metadata: Record<string, any>): Promise<void> {
    try {
      await this.client.setex(`session:${sessionId}:meta`, this.ttl, JSON.stringify(metadata))
    } catch (error) {
      console.error('Redis setSessionMeta error:', error)
    }
  }

  /**
   * Get session metadata
   */
  async getSessionMeta(sessionId: string): Promise<Record<string, any> | null> {
    try {
      const data = await this.client.get(`session:${sessionId}:meta`)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Redis getSessionMeta error:', error)
      return null
    }
  }

  /**
   * Clear all session data
   */
  async clearSession(sessionId: string): Promise<void> {
    try {
      const keys = await this.client.keys(`session:${sessionId}:*`)
      if (keys.length > 0) {
        await this.client.del(...keys)
      }
    } catch (error) {
      console.error('Redis clearSession error:', error)
    }
  }

  /**
   * Extend TTL for active sessions
   */
  async extendTTL(sessionId: string, additionalSeconds = 3600): Promise<void> {
    try {
      const keys = await this.client.keys(`session:${sessionId}:*`)
      for (const key of keys) {
        await this.client.expire(key, additionalSeconds)
      }
    } catch (error) {
      console.error('Redis extendTTL error:', error)
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    await this.client.quit()
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.client.status === 'ready'
  }
}
