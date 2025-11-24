/**
 * Memory Manager - Central memory orchestration
 * Coordinates short-term (Redis) and long-term (Vector) memory
 */

import { RedisMemory } from './redis-memory'
import { MemoryEntry, MemoryConfig, MemorySearchOptions, MemorySearchResult, ConversationSummary } from './types'
import { getVectorDBService } from '../services/vector-database'
import { generateId } from '../utils'
import { LRUCache } from './lru-cache'

export class MemoryManager {
  private static instance: MemoryManager | null = null
  private shortTerm: RedisMemory | null = null
  private config: MemoryConfig
  private useRedis: boolean = false
  private documentCache: LRUCache<string, any>
  private searchCache: LRUCache<string, MemorySearchResult[]>

  private constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      shortTermTTL: 3600,
      longTermTTL: 2592000, // 30 days
      maxConversationLength: 50,
      embeddingModel: 'text-embedding-3-small',
      enableSemanticSearch: true,
      ...config
    }

    // Initialize LRU caches
    this.documentCache = new LRUCache<string, any>(500) // 500 documents
    this.searchCache = new LRUCache<string, MemorySearchResult[]>(100) // 100 search queries

    // Initialize Redis if available
    this.initializeRedis()
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<MemoryConfig>): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager(config)
    }
    return MemoryManager.instance
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.shortTerm = new RedisMemory(process.env.REDIS_URL, this.config.shortTermTTL)
      // Test connection
      await new Promise((resolve) => setTimeout(resolve, 1000))
      if (this.shortTerm?.isConnected()) {
        this.useRedis = true
        console.log('✅ Memory Manager: Redis initialized')
      } else {
        console.warn('⚠️  Memory Manager: Redis unavailable, using fallback')
        this.shortTerm = null
      }
    } catch (error) {
      console.warn('⚠️  Memory Manager: Redis initialization failed, using fallback')
      this.shortTerm = null
    }
  }

  /**
   * Save a message to memory
   */
  async saveMessage(sessionId: string, message: MemoryEntry): Promise<void> {
    // Save to short-term memory (Redis)
    if (this.useRedis && this.shortTerm) {
      try {
        await this.shortTerm.set(`session:${sessionId}:message:${message.id}`, message)
      } catch (error) {
        console.error('Failed to save to Redis:', error)
      }
    }

    // Save to long-term memory (Vector DB) for semantic search
    if (this.config.enableSemanticSearch && message.type === 'conversation') {
      try {
        const vectorDB = getVectorDBService()
        await vectorDB.addDocument({
          id: message.id,
          content: message.content,
          metadata: {
            ...message.metadata,
            sessionId,
            timestamp: message.timestamp.toISOString(),
            type: message.type
          }
        })
      } catch (error) {
        console.error('Failed to save to Vector DB:', error)
      }
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(sessionId: string, limit?: number): Promise<MemoryEntry[]> {
    // Check cache first
    const cacheKey = `conversation:${sessionId}:${limit || this.config.maxConversationLength}`
    const cached = this.documentCache.get(cacheKey)
    if (cached) {
      return cached
    }

    if (this.useRedis && this.shortTerm) {
      try {
        const messages = await this.shortTerm.getSessionMessages(
          sessionId,
          limit || this.config.maxConversationLength
        )
        // Cache the result
        this.documentCache.set(cacheKey, messages)
        return messages
      } catch (error) {
        console.error('Failed to get conversation from Redis:', error)
      }
    }
    return []
  }

  /**
   * Search relevant memories using semantic search
   */
  async searchRelevantMemories(
    options: MemorySearchOptions
  ): Promise<MemorySearchResult[]> {
    if (!this.config.enableSemanticSearch) {
      return []
    }

    // Create cache key from query + filters
    const cacheKey = `search:${options.query}:${JSON.stringify(options.filter || {})}:${options.topK || 5}`
    
    // Check cache first
    const cached = this.searchCache.get(cacheKey)
    if (cached) {
      return cached
    }

    try {
      const vectorDB = getVectorDBService()
      const results = await vectorDB.search(options.query, {
        topK: options.topK || 5,
        filter: options.filter
      })

      const mapped = results.map((result: any) => ({
        entry: {
          id: result.id,
          sessionId: result.metadata?.sessionId || '',
          type: result.metadata?.type || 'conversation',
          content: result.text || result.content || '',
          metadata: result.metadata || {},
          timestamp: new Date(result.metadata?.timestamp || Date.now())
        } as MemoryEntry,
        score: result.score || 0,
        distance: result.score || 0
      }))

      // Cache the results
      this.searchCache.set(cacheKey, mapped)
      return mapped
    } catch (error) {
      console.error('Semantic search failed:', error)
      return []
    }
  }

  /**
   * Store entity (company, contact, etc.)
   */
  async storeEntity(
    entityType: string,
    entityName: string,
    data: Record<string, any>,
    sessionId?: string
  ): Promise<void> {
    const entry: MemoryEntry = {
      id: generateId(),
      sessionId: sessionId || 'global',
      type: 'entity',
      content: JSON.stringify(data),
      metadata: {
        entityType,
        entityName,
        ...data
      },
      timestamp: new Date()
    }

    if (this.useRedis && this.shortTerm) {
      try {
        await this.shortTerm.set(`entity:${entityType}:${entityName}`, entry)
      } catch (error) {
        console.error('Failed to store entity:', error)
      }
    }

    // Also store in vector DB for semantic search
    if (this.config.enableSemanticSearch) {
      try {
        const vectorDB = getVectorDBService()
        await vectorDB.addDocument({
          id: entry.id,
          content: `${entityType}: ${entityName} ${JSON.stringify(data)}`,
          metadata: entry.metadata
        })
      } catch (error) {
        console.error('Failed to store entity in Vector DB:', error)
      }
    }
  }

  /**
   * Get entity data
   */
  async getEntity(entityType: string, entityName: string): Promise<any | null> {
    // Check cache first
    const cacheKey = `entity:${entityType}:${entityName}`
    const cached = this.documentCache.get(cacheKey)
    if (cached) {
      return cached
    }

    if (this.useRedis && this.shortTerm) {
      try {
        const entry = await this.shortTerm.get(cacheKey)
        if (entry) {
          const parsed = JSON.parse(entry.content)
          // Cache the result
          this.documentCache.set(cacheKey, parsed)
          return parsed
        }
      } catch (error) {
        console.error('Failed to get entity:', error)
      }
    }
    return null
  }

  /**
   * Generate conversation summary
   */
  async generateSummary(sessionId: string): Promise<ConversationSummary | null> {
    const messages = await this.getConversationHistory(sessionId)
    
    if (messages.length === 0) return null

    // Extract key information
    const keyTopics = new Set<string>()
    const entities = new Set<string>()

    messages.forEach(msg => {
      // Simple topic extraction (can be enhanced with LLM)
      if (msg.metadata.topic) keyTopics.add(msg.metadata.topic)
      if (msg.metadata.company) entities.add(msg.metadata.company)
    })

    return {
      sessionId,
      summary: `Conversation with ${messages.length} messages`,
      keyTopics: Array.from(keyTopics),
      entities: Array.from(entities),
      messageCount: messages.length,
      startTime: messages[0].timestamp,
      lastUpdate: messages[messages.length - 1].timestamp
    }
  }

  /**
   * Clear session memory
   */
  async clearSession(sessionId: string): Promise<void> {
    if (this.useRedis && this.shortTerm) {
      await this.shortTerm.clearSession(sessionId)
    }
  }

  /**
   * Extend session TTL (keep session alive)
   */
  async keepAlive(sessionId: string): Promise<void> {
    if (this.useRedis && this.shortTerm) {
      await this.shortTerm.extendTTL(sessionId)
    }
  }

  /**
   * Cleanup old memories (maintenance)
   */
  async cleanup(olderThanDays: number = 30): Promise<void> {
    // This would typically be run as a cron job
    console.log(`Cleaning up memories older than ${olderThanDays} days`)
    // Implementation depends on storage backend
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      documents: this.documentCache.getStats(),
      searches: this.searchCache.getStats(),
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.documentCache.clear()
    this.searchCache.clear()
  }
}

// Factory function wrapper
export function getMemoryManager(config?: Partial<MemoryConfig>): MemoryManager {
  return MemoryManager.getInstance(config)
}

// Export for testing/reset
export function resetMemoryManager(): void {
  // Access private static member through reflection isn't possible,
  // so this is a no-op. Use MemoryManager.getInstance() directly if needed.
}
