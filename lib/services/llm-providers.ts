/**
 * Multi-LLM Provider Service
 * Supports OpenAI, Anthropic, Cohere, and Google Gemini
 */

import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { CohereClient } from 'cohere-ai'
import { GoogleGenerativeAI, RequestOptions } from '@google/generative-ai'

// Groq uses OpenAI-compatible API; we'll call via fetch


export type LLMProvider = 'openai' | 'anthropic' | 'cohere' | 'gemini' | 'groq'

export interface LLMConfig {
  provider: LLMProvider
  model: string
  apiKey: string
  temperature?: number
  maxTokens?: number
}

export interface LLMResponse {
  text: string
  provider: LLMProvider
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

interface ProviderCircuitBreaker {
  failures: number
  lastFailureTime: number
  isOpen: boolean
}

export class LLMProviderService {
  private openaiClient?: OpenAI
  private anthropicClient?: Anthropic
  private cohereClient?: CohereClient
  private geminiClient?: GoogleGenerativeAI

  private providers: Map<LLMProvider, boolean> = new Map()
  private circuitBreakers: Map<LLMProvider, ProviderCircuitBreaker> = new Map()
  private readonly geminiRequestOptions: RequestOptions = {
    apiVersion: 'v1',
    baseUrl: 'https://generativelanguage.googleapis.com',
  }
  
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 1000
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5
  private readonly CIRCUIT_BREAKER_TIMEOUT = 120000 // 2 minutes
  private readonly REQUEST_TIMEOUT = 30000 // 30 seconds
  
  constructor() {
    this.initializeProviders()
  }

  private initializeProviders() {
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
      this.providers.set('openai', true)
    }

    // Anthropic Claude
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })
      this.providers.set('anthropic', true)
    }

    // Cohere
    if (process.env.COHERE_API_KEY) {
      this.cohereClient = new CohereClient({
        token: process.env.COHERE_API_KEY,
      })
      this.providers.set('cohere', true)
    }

    // Google Gemini
    if (process.env.GOOGLE_GEMINI_API_KEY) {
      this.geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
      this.providers.set('gemini', true)
    }

    // Groq (OpenAI-compatible endpoint)
    if (process.env.GROQ_API_KEY) {
      this.providers.set('groq', true)
    }
  }

  /**
   * Get available LLM providers
   */
  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Check if a provider is available
   */
  isProviderAvailable(provider: LLMProvider): boolean {
    return this.providers.get(provider) === true
  }

  /**
   * Generate text with fallback support across providers
   */
  async generateWithFallback(
    prompt: string,
    preferredProvider: LLMProvider = 'gemini',
    options: Partial<LLMConfig> = {},
    providerOrder?: LLMProvider[],
    enabled?: Partial<Record<LLMProvider, boolean>>
  ): Promise<LLMResponse> {
    const order = providerOrder && providerOrder.length
      ? providerOrder
      : [preferredProvider, ...this.getAvailableProviders().filter(p => p !== preferredProvider)]

    const tried = new Set<string>()
    const providersToTry = order.filter(p => {
      if (tried.has(p)) return false
      tried.add(p)
      const isEnabled = enabled ? enabled[p] !== false : true
      return isEnabled && this.isProviderAvailable(p)
    })

    let lastError: Error | null = null
    for (const provider of providersToTry) {
      try {
        return await this.generate(prompt, provider, options)
      } catch (error) {
        lastError = error as Error
        console.warn(`Provider ${provider} failed, trying next...`) 
        continue
      }
    }
    throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`)
  }

  /**
   * Generate text with options object (convenience method for agents)
   * Automatically selects best available provider
   */
  async generateText(options: {
    prompt: string
    systemPrompt?: string
    maxTokens?: number
    temperature?: number
    provider?: LLMProvider
    providerOrder?: LLMProvider[]
    enabledProviders?: Partial<Record<LLMProvider, boolean>>
  }): Promise<LLMResponse> {
    const { prompt, systemPrompt, maxTokens, temperature, provider, providerOrder, enabledProviders } = options
    
    // Use provided provider or default to gemini, then fallback to any available
    const preferredProvider = provider || process.env.DEFAULT_LLM_PROVIDER as LLMProvider || 'gemini'
    
    // Build full prompt with system prompt if provided
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
    
    return this.generateWithFallback(fullPrompt, preferredProvider, {
      provider: preferredProvider,
      model: '',
      apiKey: '',
      maxTokens,
      temperature,
    }, providerOrder, enabledProviders)
  }

  /**
   * Check circuit breaker status for provider
   */
  private checkCircuitBreaker(provider: LLMProvider): void {
    let breaker = this.circuitBreakers.get(provider)
    
    if (!breaker) {
      breaker = { failures: 0, lastFailureTime: 0, isOpen: false }
      this.circuitBreakers.set(provider, breaker)
    }

    if (breaker.isOpen) {
      const timeSinceLastFailure = Date.now() - breaker.lastFailureTime
      if (timeSinceLastFailure < this.CIRCUIT_BREAKER_TIMEOUT) {
        throw new Error(`Circuit breaker open for ${provider}`)
      }
      // Try to close the circuit breaker
      breaker.isOpen = false
      breaker.failures = 0
    }
  }

  /**
   * Record success for provider
   */
  private recordSuccess(provider: LLMProvider): void {
    const breaker = this.circuitBreakers.get(provider)
    if (breaker) {
      breaker.failures = 0
    }
  }

  /**
   * Record failure for provider
   */
  private recordFailure(provider: LLMProvider): void {
    let breaker = this.circuitBreakers.get(provider)
    
    if (!breaker) {
      breaker = { failures: 0, lastFailureTime: 0, isOpen: false }
      this.circuitBreakers.set(provider, breaker)
    }

    breaker.failures++
    breaker.lastFailureTime = Date.now()
    
    if (breaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      breaker.isOpen = true
      console.warn(`Circuit breaker opened for LLM provider ${provider} after ${breaker.failures} failures`)
    }
  }

  /**
   * Generate text with a specific provider (with retry logic)
   */
  async generate(
    prompt: string,
    provider: LLMProvider,
    options: Partial<LLMConfig> = {}
  ): Promise<LLMResponse> {
    // Check circuit breaker
    this.checkCircuitBreaker(provider)

    let lastError: Error | null = null

    // Retry loop
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<LLMResponse>((_, reject) => {
          setTimeout(() => reject(new Error(`${provider} request timeout after ${this.REQUEST_TIMEOUT}ms`)), this.REQUEST_TIMEOUT)
        })

        let generatePromise: Promise<LLMResponse>
        switch (provider) {
          case 'openai':
            generatePromise = this.generateOpenAI(prompt, options)
            break
          case 'anthropic':
            generatePromise = this.generateAnthropic(prompt, options)
            break
          case 'cohere':
            generatePromise = this.generateCohere(prompt, options)
            break
          case 'gemini':
            generatePromise = this.generateGemini(prompt, options)
            break
          case 'groq':
            generatePromise = this.generateGroq(prompt, options)
            break
          default:
            throw new Error(`Unknown provider: ${provider}`)
        }

        // Race between generation and timeout
        const result = await Promise.race([generatePromise, timeoutPromise])
        this.recordSuccess(provider)
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn(`LLM provider ${provider} attempt ${attempt + 1}/${this.MAX_RETRIES} failed:`, lastError.message)

        // Don't retry on certain errors
        if (lastError.message.includes('API key') || lastError.message.includes('unauthorized') || lastError.message.includes('not initialized')) {
          this.recordFailure(provider)
          throw lastError
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, attempt)))
        }
      }
    }

    this.recordFailure(provider)
    throw lastError || new Error(`${provider} generation failed after ${this.MAX_RETRIES} attempts`)
  }

  /**
   * OpenAI GPT-4
   */
  private async generateOpenAI(
    prompt: string,
    options: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized')
    }

    const response = await this.openaiClient.chat.completions.create({
      model: options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
    })

    return {
      text: response.choices[0]?.message?.content || '',
      provider: 'openai',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    }
  }

  /**
   * Anthropic Claude
   */
  private async generateAnthropic(
    prompt: string,
    options: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized')
    }

    const response = await this.anthropicClient.messages.create({
      model: options.model || 'claude-3-opus-20240229',
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
      messages: [{ role: 'user', content: prompt }],
    })

    return {
      text: response.content[0]?.type === 'text' ? response.content[0].text : '',
      provider: 'anthropic',
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    }
  }

  /**
   * Cohere Command
   */
  private async generateCohere(
    prompt: string,
    options: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    if (!this.cohereClient) {
      throw new Error('Cohere client not initialized')
    }

    const response = await this.cohereClient.generate({
      model: options.model || 'command',
      prompt,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 2000,
    })

    return {
      text: response.generations[0]?.text || '',
      provider: 'cohere',
      model: options.model || 'command',
      usage: {
        promptTokens: 0, // Cohere doesn't provide token counts in the same way
        completionTokens: 0,
        totalTokens: 0,
      },
    }
  }

  /**
   * Google Gemini (v1 compatible)
   */
  private async generateGemini(
    prompt: string,
    options: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    if (!this.geminiClient) {
      throw new Error('Gemini client not initialized')
    }

    const model = this.geminiClient.getGenerativeModel({
      model: options.model || process.env.GOOGLE_GEMINI_MODEL || 'models/gemini-2.0-flash',
    }, this.geminiRequestOptions)

    // Gemini v1 format: contents array
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })
    const response = result.response
    const text = response.text()

    return {
      text,
      provider: 'gemini',
      model: options.model || process.env.GOOGLE_GEMINI_MODEL || 'models/gemini-2.0-flash',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    }
  }

  /**
   * Groq (OpenAI-compatible Chat Completions)
   */
  private async generateGroq(
    prompt: string,
    options: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('Groq API key not configured')
    }
    const model = options.model || process.env.GROQ_MODEL || 'llama-3.1-70b-versatile'
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 2000,
      }),
    })
    if (!res.ok) {
      throw new Error(`Groq API error: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    return {
      text: data.choices?.[0]?.message?.content || '',
      provider: 'groq',
      model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    }
  }

  /**
   * Streaming generation (currently supports OpenAI and Gemini)
   */
  async *generateStream(
    prompt: string,
    provider: LLMProvider = 'gemini',
    options: Partial<LLMConfig> = {}
  ): AsyncGenerator<string> {
    if (provider === 'openai' && this.openaiClient) {
      yield* this.streamOpenAI(prompt, options)
    } else if (provider === 'gemini' && this.geminiClient) {
      yield* this.streamGemini(prompt, options)
    } else {
      throw new Error(`Streaming not supported for provider: ${provider}`)
    }
  }

  private async *streamOpenAI(
    prompt: string,
    options: Partial<LLMConfig>
  ): AsyncGenerator<string> {
    if (!this.openaiClient) throw new Error('OpenAI client not initialized')

    const stream = await this.openaiClient.chat.completions.create({
      model: options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) yield content
    }
  }

  private async *streamGemini(
    prompt: string,
    options: Partial<LLMConfig>
  ): AsyncGenerator<string> {
    if (!this.geminiClient) throw new Error('Gemini client not initialized')

    const model = this.geminiClient.getGenerativeModel({
      model: options.model || process.env.GOOGLE_GEMINI_MODEL || 'models/gemini-2.0-flash',
    }, this.geminiRequestOptions)

    // Gemini v1 format: contents array
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })

    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) yield text
    }
  }
}

// Singleton instance
let llmService: LLMProviderService | null = null

export function getLLMService(): LLMProviderService {
  if (!llmService) {
    llmService = new LLMProviderService()
  }
  return llmService
}
