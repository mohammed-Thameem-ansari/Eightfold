/**
 * Memory System Types
 * Defines interfaces for multi-layered memory architecture
 */

export interface MemoryEntry {
  id: string
  sessionId: string
  userId?: string
  type: 'conversation' | 'entity' | 'episodic' | 'semantic'
  content: string
  metadata: Record<string, any>
  embedding?: number[]
  timestamp: Date
  expiresAt?: Date
}

export interface MemoryConfig {
  shortTermTTL: number      // Redis TTL (1 hour default)
  longTermTTL: number       // Persistent storage (30 days)
  maxConversationLength: number  // Max messages to keep (50 default)
  embeddingModel: string    // Model for embeddings
  enableSemanticSearch: boolean  // Use vector search
}

export interface MemorySearchOptions {
  query: string
  topK?: number
  filter?: Record<string, any>
  threshold?: number  // Similarity threshold (0-1)
}

export interface MemorySearchResult {
  entry: MemoryEntry
  score: number  // Similarity score
  distance?: number
}

export interface ConversationSummary {
  sessionId: string
  summary: string
  keyTopics: string[]
  entities: string[]
  messageCount: number
  startTime: Date
  lastUpdate: Date
}
