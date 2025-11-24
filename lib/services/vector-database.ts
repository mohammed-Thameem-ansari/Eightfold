/**
 * Vector Database Service for RAG (Retrieval-Augmented Generation)
 * Supports Pinecone and in-memory vector store
 */

import { getLLMService } from './llm-providers'

export interface VectorDocument {
  id: string
  content: string
  metadata: Record<string, any>
  embedding?: number[]
}

export interface SearchResult {
  document: VectorDocument
  score: number
}

export interface EmbeddingOptions {
  provider?: 'gemini' | 'openai' | 'cohere'
  model?: string
  dimensions?: number
}

export class VectorDatabaseService {
  private documents: Map<string, VectorDocument> = new Map()
  private embeddings: Map<string, number[]> = new Map()
  private dimensions: number = 1536 // OpenAI default
  
  // Pinecone client (optional)
  private pineconeIndex?: any

  constructor(private embeddingOptions: EmbeddingOptions = {}) {
    this.dimensions = embeddingOptions.dimensions || 1536
    this.initializePinecone()
  }

  /**
   * Initialize Pinecone if API key is available
   */
  private async initializePinecone() {
    if (!process.env.PINECONE_API_KEY) {
      console.log('Pinecone not configured, using in-memory vector store')
      return
    }

    try {
      // Dynamic import to avoid errors if Pinecone is not installed
      const { Pinecone } = await import('@pinecone-database/pinecone')
      
      const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      })

      this.pineconeIndex = pinecone.Index(
        process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX || 'research-agent'
      )
      
      console.log('Pinecone initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Pinecone:', error)
    }
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const provider = this.embeddingOptions.provider || 'gemini'

    if (provider === 'gemini') {
      return this.generateGeminiEmbedding(text)
    } else if (provider === 'openai') {
      return this.generateOpenAIEmbedding(text)
    } else if (provider === 'cohere') {
      return this.generateCohereEmbedding(text)
    } else {
      // Fallback to simple embedding for demo
      return this.generateSimpleEmbedding(text)
    }
  }

  /**
   * Gemini embeddings (text-embedding-004)
   */
  private async generateGeminiEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      console.warn('Empty text input for embedding, using zero vector')
      return new Array(this.dimensions).fill(0)
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      console.warn('GOOGLE_API_KEY or GOOGLE_GEMINI_API_KEY not found, falling back to simple embedding')
      return this.generateSimpleEmbedding(text)
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ 
        model: this.embeddingOptions.model || 'text-embedding-004'
      })

      // Add 30s timeout to embedding generation
      const embedPromise = model.embedContent(text)
      const result = await Promise.race([
        embedPromise,
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Gemini embedding timeout')), 30000)
        )
      ])

      const embedding = result.embedding?.values
      
      if (!embedding || !Array.isArray(embedding)) {
        console.error('Invalid embedding response from Gemini')
        return this.generateSimpleEmbedding(text)
      }

      // Update dimensions if different
      if (embedding.length !== this.dimensions) {
        this.dimensions = embedding.length
      }

      return embedding
    } catch (error) {
      console.error('Gemini embedding failed or timed out:', error)
      return this.generateSimpleEmbedding(text)
    }
  }

  /**
   * OpenAI embeddings (text-embedding-ada-002)
   */
  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    if (!process.env.OPENAI_API_KEY) {
      return this.generateSimpleEmbedding(text)
    }

    try {
      const OpenAI = (await import('openai')).default
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

      const response = await openai.embeddings.create({
        model: this.embeddingOptions.model || 'text-embedding-ada-002',
        input: text,
      })

      return response.data[0].embedding
    } catch (error) {
      console.error('OpenAI embedding failed:', error)
      return this.generateSimpleEmbedding(text)
    }
  }

  /**
   * Cohere embeddings
   */
  private async generateCohereEmbedding(text: string): Promise<number[]> {
    if (!process.env.COHERE_API_KEY) {
      return this.generateSimpleEmbedding(text)
    }

    try {
      const { CohereClient } = await import('cohere-ai')
      const cohere = new CohereClient({ token: process.env.COHERE_API_KEY })

      const response = await cohere.embed({
        model: this.embeddingOptions.model || 'embed-english-v3.0',
        texts: [text],
        inputType: 'search_document',
      })

      const embeddings = response.embeddings as number[][] | any
      return Array.isArray(embeddings) ? embeddings[0] : embeddings
    } catch (error) {
      console.error('Cohere embedding failed:', error)
      return this.generateSimpleEmbedding(text)
    }
  }

  /**
   * Simple TF-IDF-like embedding (fallback)
   */
  private generateSimpleEmbedding(text: string): number[] {
    // Handle undefined/null input
    if (!text || typeof text !== 'string') {
      console.warn('Invalid text input for embedding, using empty array')
      return new Array(this.dimensions).fill(0)
    }
    
    const words = text.toLowerCase().split(/\s+/)
    const embedding = new Array(this.dimensions).fill(0)

    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const hash = this.simpleHash(word)
      const index = hash % this.dimensions
      embedding[index] += 1 / Math.sqrt(words.length)
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    return embedding.map(val => val / magnitude)
  }

  /**
   * Add document to vector store
   */
  async addDocument(document: VectorDocument): Promise<void> {
    // Generate embedding
    const embedding = await this.generateEmbedding(document.content)
    document.embedding = embedding

    // Store in memory
    this.documents.set(document.id, document)
    this.embeddings.set(document.id, embedding)

    // Store in Pinecone if available (with 3s timeout)
    if (this.pineconeIndex) {
      try {
        const upsertPromise = this.pineconeIndex.upsert([
          {
            id: document.id,
            values: embedding,
            metadata: {
              content: document.content.slice(0, 1000), // Limit metadata size
              ...document.metadata,
            },
          },
        ])

        await Promise.race([
          upsertPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Pinecone upsert timeout')), 30000)
          )
        ])
      } catch (error) {
        console.error('Failed to upsert to Pinecone or timed out:', error)
      }
    }
  }

  /**
   * Add multiple documents in batch
   */
  async addDocuments(documents: VectorDocument[]): Promise<void> {
    const batchSize = 100
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize)
      await Promise.all(batch.map(doc => this.addDocument(doc)))
    }
  }

  /**
   * Search for similar documents
   */
  async search(
    query: string,
    options: { topK?: number; filter?: Record<string, any> } = {}
  ): Promise<SearchResult[]> {
    const topK = options.topK || 5
    const queryEmbedding = await this.generateEmbedding(query)

    // Use Pinecone if available (with 2s timeout to prevent hanging)
    if (this.pineconeIndex) {
      try {
        const pineconeQuery = this.pineconeIndex.query({
          vector: queryEmbedding,
          topK,
          includeMetadata: true,
          filter: options.filter,
        })

        const results = await Promise.race([
          pineconeQuery,
          new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error('Pinecone query timeout')), 30000)
          )
        ])

        return results.matches.map((match: any) => ({
          document: {
            id: match.id,
            content: match.metadata.content || '',
            metadata: match.metadata,
            embedding: match.values,
          },
          score: match.score,
        }))
      } catch (error) {
        console.error('Pinecone search failed or timed out:', error)
        // Fall through to in-memory search
      }
    }

    // In-memory search
    const results: SearchResult[] = []

    for (const [id, embedding] of this.embeddings.entries()) {
      const document = this.documents.get(id)
      if (!document) continue

      // Apply filter
      if (options.filter) {
        const matches = Object.entries(options.filter).every(
          ([key, value]) => document.metadata[key] === value
        )
        if (!matches) continue
      }

      const similarity = this.cosineSimilarity(queryEmbedding, embedding)
      results.push({ document, score: similarity })
    }

    // Sort by score and return top K
    results.sort((a, b) => b.score - a.score)
    return results.slice(0, topK)
  }

  /**
   * Retrieve augmented context for RAG
   */
  async retrieveContext(
    query: string,
    options: { topK?: number; maxTokens?: number } = {}
  ): Promise<string> {
    const results = await this.search(query, options)
    
    let context = ''
    let tokens = 0
    const maxTokens = options.maxTokens || 4000

    for (const result of results) {
      const docText = `[Source: ${result.document.metadata.source || 'Unknown'}]\n${result.document.content}\n\n`
      const estimatedTokens = Math.ceil(docText.length / 4) // Rough estimate
      
      if (tokens + estimatedTokens > maxTokens) break
      
      context += docText
      tokens += estimatedTokens
    }

    return context
  }

  /**
   * Generate answer with RAG
   */
  async generateWithRAG(
    query: string,
    options: { 
      systemPrompt?: string
      maxContextTokens?: number
      llmProvider?: 'openai' | 'anthropic' | 'cohere' | 'gemini'
    } = {}
  ): Promise<string> {
    // Retrieve relevant context
    const context = await this.retrieveContext(query, {
      topK: 5,
      maxTokens: options.maxContextTokens || 4000,
    })

    // Build prompt with context
    const systemPrompt = options.systemPrompt || 
      'You are a helpful AI assistant. Use the provided context to answer questions accurately.'
    
    const prompt = `${systemPrompt}

Context:
${context}

Question: ${query}

Answer:`

    // Generate response with LLM
    const llmService = getLLMService()
    const response = await llmService.generateWithFallback(
      prompt,
      options.llmProvider || 'gemini'
    )

    return response.text
  }

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id)
    this.embeddings.delete(id)

    if (this.pineconeIndex) {
      try {
        await this.pineconeIndex.delete1([id])
      } catch (error) {
        console.error('Failed to delete from Pinecone:', error)
      }
    }
  }

  /**
   * Clear all documents
   */
  async clear(): Promise<void> {
    this.documents.clear()
    this.embeddings.clear()

    if (this.pineconeIndex) {
      try {
        await this.pineconeIndex.deleteAll()
      } catch (error) {
        console.error('Failed to clear Pinecone:', error)
      }
    }
  }

  /**
   * Get document count
   */
  getCount(): number {
    return this.documents.size
  }

  /**
   * Get document by ID
   */
  getDocument(id: string): VectorDocument | undefined {
    return this.documents.get(id)
  }

  // Helper methods
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let magnitudeA = 0
    let magnitudeB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      magnitudeA += a[i] * a[i]
      magnitudeB += b[i] * b[i]
    }

    magnitudeA = Math.sqrt(magnitudeA)
    magnitudeB = Math.sqrt(magnitudeB)

    if (magnitudeA === 0 || magnitudeB === 0) return 0

    return dotProduct / (magnitudeA * magnitudeB)
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
}

// Singleton instance
let vectorService: VectorDatabaseService | null = null

export function getVectorService(options?: EmbeddingOptions): VectorDatabaseService {
  if (!vectorService) {
    vectorService = new VectorDatabaseService(options)
  }
  return vectorService
}

// Alias for consistency with other services - export as named export
export { getVectorService as getVectorDBService }
