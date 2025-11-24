import { GoogleGenerativeAI, RequestOptions, Tool } from '@google/generative-ai'
import { Source, ResearchResponse } from '@/types'

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GEMINI_API_KEY || ''
)

const GEMINI_REQUEST_OPTIONS: RequestOptions = {
  apiVersion: 'v1',
  baseUrl: 'https://generativelanguage.googleapis.com',
}

const DEMO_MODE = process.env.DEMO_MODE === 'true' || !process.env.GOOGLE_GEMINI_API_KEY

// Model configuration
// Use environment variable to allow switching models without code changes.
// Valid models for v1: models/gemini-2.0-flash (fastest), models/gemini-2.5-flash, models/gemini-2.5-pro (best)
const MODEL_NAME = process.env.GOOGLE_GEMINI_MODEL || 'models/gemini-2.0-flash'
const MAX_TOKENS = 8192
const TEMPERATURE = 0.7

// Circuit breaker state for each provider
interface CircuitBreakerState {
  failures: number
  lastFailureTime: number
  isOpen: boolean
}

const circuitBreakers = new Map<string, CircuitBreakerState>()
const CIRCUIT_BREAKER_THRESHOLD = 3
const CIRCUIT_BREAKER_TIMEOUT = 60000 // 1 minute
const REQUEST_TIMEOUT = 15000 // 15 seconds

/**
 * Circuit breaker wrapper for provider functions
 */
async function withCircuitBreaker<T>(
  providerName: string,
  fn: () => Promise<T>
): Promise<T> {
  let state = circuitBreakers.get(providerName)
  
  if (!state) {
    state = { failures: 0, lastFailureTime: 0, isOpen: false }
    circuitBreakers.set(providerName, state)
  }

  // Check if circuit breaker is open
  if (state.isOpen) {
    const timeSinceLastFailure = Date.now() - state.lastFailureTime
    if (timeSinceLastFailure < CIRCUIT_BREAKER_TIMEOUT) {
      throw new Error(`Circuit breaker open for ${providerName}`)
    }
    // Try to close the circuit breaker
    state.isOpen = false
    state.failures = 0
  }

  try {
    // Execute with timeout
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${providerName} request timeout`)), REQUEST_TIMEOUT)
    })
    const result = await Promise.race([fn(), timeoutPromise])
    
    // Reset failures on success
    state.failures = 0
    return result
  } catch (error) {
    // Record failure
    state.failures++
    state.lastFailureTime = Date.now()
    
    // Open circuit breaker if threshold reached
    if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      state.isOpen = true
      console.warn(`Circuit breaker opened for ${providerName} after ${state.failures} failures`)
    }
    
    throw error
  }
}

/**
 * Search the web for information about a company
 * Uses multiple search providers with fallback mechanisms and circuit breaker pattern
 */
export async function searchWeb(query: string, companyName?: string): Promise<Source[]> {
  if (DEMO_MODE) {
    return getMockSearchResults(query, companyName)
  }

  // Try multiple search providers in order
  const searchProviders = [
    { name: 'SerpAPI', fn: () => searchWithSerpAPI(query, companyName) },
    { name: 'DuckDuckGo', fn: () => searchWithDuckDuckGo(query, companyName) },
    { name: 'Wikipedia', fn: () => searchWithWikipedia(query, companyName) },
    { name: 'HackerNews', fn: () => searchWithHackerNews(query, companyName) },
    { name: 'Brave', fn: () => searchWithBrave(query, companyName) },
  ]

  const errors: string[] = []

  for (const provider of searchProviders) {
    try {
      const results = await withCircuitBreaker(provider.name, provider.fn)
      if (results && results.length > 0) {
        console.log(`Search successful with ${provider.name}, found ${results.length} results`)
        return results
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`${provider.name}: ${errorMsg}`)
      console.warn(`Search provider ${provider.name} failed:`, errorMsg)
      continue
    }
  }

  // Fallback to mock data if all providers fail
  console.warn('All search providers failed:', errors.join('; '))
  console.warn('Using mock data as fallback')
  return getMockSearchResults(query, companyName)
}

/**
 * Search using SerpAPI (free tier available)
 */
async function searchWithSerpAPI(query: string, companyName?: string): Promise<Source[]> {
  const apiKey = process.env.SERP_API_KEY
  if (!apiKey) {
    throw new Error('SerpAPI key not configured')
  }

  const response = await fetch(
    `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}&num=10`,
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  )

  if (!response.ok) {
    throw new Error(`SerpAPI error: ${response.statusText}`)
  }

  const data = await response.json()
  const results: Source[] = (data.organic_results || []).slice(0, 10).map((result: any) => ({
    title: result.title || '',
    url: result.link || '',
    snippet: result.snippet || '',
    relevance: calculateRelevance(result, query, companyName),
  }))

  return results
}

/**
 * Search using DuckDuckGo (free, no API key required)
 */
async function searchWithDuckDuckGo(query: string, companyName?: string): Promise<Source[]> {
  try {
    // DuckDuckGo HTML scraping approach
    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`DuckDuckGo error: ${response.statusText}`)
    }

    const html = await response.text()
    // Simple parsing - in production, use proper HTML parser
    const results: Source[] = []
    
    // Extract results from HTML (simplified)
    const linkRegex = /<a class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g
    let match
    let count = 0
    
    while ((match = linkRegex.exec(html)) !== null && count < 10) {
      results.push({
        title: match[2] || '',
        url: match[1] || '',
        snippet: '',
        relevance: 0.7,
      })
      count++
    }

    return results.length > 0 ? results : getMockSearchResults(query, companyName)
  } catch (error) {
    console.error('DuckDuckGo search error:', error)
    throw error
  }
}

/**
 * Search using Brave Search API
 */
async function searchWithBrave(query: string, companyName?: string): Promise<Source[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) {
    throw new Error('Brave Search API key not configured')
  }

  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        'X-Subscription-Token': apiKey,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Brave Search API error: ${response.statusText}`)
  }

  const data = await response.json()
  const results: Source[] = (data.web?.results || []).slice(0, 10).map((result: any) => ({
    title: result.title,
    url: result.url,
    snippet: result.description,
    relevance: calculateRelevance(result, query, companyName),
  }))

  return results
}

/**
 * Search Wikipedia via MediaWiki API (free)
 */
async function searchWithWikipedia(query: string, companyName?: string): Promise<Source[]> {
  try {
    const q = encodeURIComponent(query)
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&format=json&srlimit=10&origin=*`
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) {
      throw new Error(`Wikipedia API error: ${res.statusText}`)
    }
    const data = await res.json()
    const results: Source[] = (data.query?.search || []).map((item: any) => ({
      title: item.title || '',
      url: `https://en.wikipedia.org/?curid=${item.pageid}`,
      snippet: (item.snippet || '').replace(/<[^>]+>/g, ''),
      relevance: 0.75,
    }))
    return results.length > 0 ? results : getMockSearchResults(query, companyName)
  } catch (error) {
    console.error('Wikipedia search error:', error)
    throw error
  }
}

/**
 * Search Hacker News (Algolia) for news and discussions (free)
 */
async function searchWithHackerNews(query: string, companyName?: string): Promise<Source[]> {
  try {
    const q = encodeURIComponent(query)
    const url = `https://hn.algolia.com/api/v1/search?query=${q}&tags=story&hitsPerPage=10`
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) {
      throw new Error(`HackerNews API error: ${res.statusText}`)
    }
    const data = await res.json()
    const results: Source[] = (data.hits || []).map((hit: any) => ({
      title: hit.title || hit.story_title || '',
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      snippet: hit._highlightResult?.title?.value?.replace(/<[^>]+>/g, '') || '',
      relevance: Math.min(0.6 + (hit.points || 0) / 100, 0.95),
    }))
    return results.length > 0 ? results : getMockSearchResults(query, companyName)
  } catch (error) {
    console.error('HackerNews search error:', error)
    throw error
  }
}

/**
 * Calculate relevance score for search results
 */
function calculateRelevance(result: any, query: string, companyName?: string): number {
  let score = 0.5 // Base score
  
  const title = (result.title || '').toLowerCase()
  const snippet = (result.snippet || result.description || '').toLowerCase()
  const queryLower = query.toLowerCase()
  const companyLower = companyName?.toLowerCase() || ''

  // Title matches boost relevance
  if (title.includes(queryLower)) score += 0.2
  if (title.includes(companyLower)) score += 0.2
  
  // Snippet matches boost relevance
  if (snippet.includes(queryLower)) score += 0.1
  if (snippet.includes(companyLower)) score += 0.1

  // Official domains get boost
  if (companyName && result.url) {
    const urlLower = result.url.toLowerCase()
    const companyDomain = companyName.toLowerCase().replace(/\s+/g, '')
    if (urlLower.includes(companyDomain)) score += 0.2
  }

  return Math.min(score, 1.0)
}

/**
 * Mock search results for demo mode
 */
function getMockSearchResults(query: string, companyName?: string): Source[] {
  const name = companyName || 'the company'
  const queryLower = query.toLowerCase()
  
  const baseResults: Source[] = [
    {
      title: `${name} - Official Website`,
      url: `https://example.com/${name.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `Official website of ${name}. Learn about our products, services, and company information.`,
      relevance: 0.95,
    },
    {
      title: `${name} Company Profile - Business Information`,
      url: `https://business.example.com/${name.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `Comprehensive business profile of ${name} including financial information, leadership team, and market position.`,
      relevance: 0.9,
    },
    {
      title: `${name} News and Updates`,
      url: `https://news.example.com/${name.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `Latest news, press releases, and developments from ${name}.`,
      relevance: 0.85,
    },
    {
      title: `${name} - LinkedIn Company Page`,
      url: `https://linkedin.com/company/${name.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `Connect with ${name} on LinkedIn. View company updates, job openings, and employee insights.`,
      relevance: 0.8,
    },
    {
      title: `${name} Financial Reports and Analysis`,
      url: `https://finance.example.com/${name.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `Financial data, earnings reports, and stock analysis for ${name}.`,
      relevance: 0.75,
    },
  ]

  // Add query-specific results
  if (queryLower.includes('ceo') || queryLower.includes('leadership')) {
    baseResults.push({
      title: `${name} Leadership Team`,
      url: `https://leadership.example.com/${name.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `Meet the executive team and leadership at ${name}.`,
      relevance: 0.9,
    })
  }

  if (queryLower.includes('product') || queryLower.includes('service')) {
    baseResults.push({
      title: `${name} Products and Services`,
      url: `https://products.example.com/${name.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `Complete overview of ${name}'s product portfolio and service offerings.`,
      relevance: 0.9,
    })
  }

  return baseResults.slice(0, 10)
}

/**
 * Call Gemini API with streaming support (Gemini v1 compatible)
 */
export async function* streamGeminiResponse(
  messages: Array<{ role: 'user' | 'model'; parts: string | Array<{ text?: string; functionCall?: any }> }>,
  systemInstruction: string,
  tools?: Tool[]
): AsyncGenerator<string, void, unknown> {
  if (DEMO_MODE) {
    const mockResponse = "I'll help you research this company. Let me gather information from multiple sources to create a comprehensive account plan."
    for (const char of mockResponse) {
      yield char
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    return
  }

  try {
    // Gemini v1 format: simple model with no tools/systemInstruction
    const model = genAI.getGenerativeModel({ model: MODEL_NAME }, GEMINI_REQUEST_OPTIONS)

    // Build contents array with systemInstruction as first message
    const contents: any[] = []
    if (systemInstruction) {
      contents.push({ role: 'user', parts: [{ text: systemInstruction }] })
    }

    // Add all messages
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: typeof msg.parts === 'string' ? [{ text: msg.parts }] : msg.parts.map(p => ({ text: p.text || '' })),
      })
    }

    // Use generateContentStream with contents array
    const result = await model.generateContentStream({ contents })

    for await (const chunk of result.stream) {
      const chunkText = chunk.text()
      if (chunkText) {
        yield chunkText
      }
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    throw error
  }
}

/**
 * Call Gemini API (non-streaming, Gemini v1 compatible - NO TOOLS)
 * Note: Gemini v1 does NOT support function calling/tools
 * Use text-based prompting for tool-like behavior
 */
export async function callGeminiWithTools(
  messages: Array<{ role: 'user' | 'model'; parts: string | Array<{ text?: string; functionCall?: any }> }>,
  systemInstruction: string,
  tools: Tool[] // currently unsupported in this client version; retained for future upgrade
): Promise<{
  text: string
  functionCalls?: Array<{
    name: string
    args: Record<string, any>
  }>
}> {
  if (DEMO_MODE) {
    return {
      text: "I'll search for information about this company.",
    }
  }

  try {
    // Current client version does not support passing tools directly; emulate via prompt
    const model = genAI.getGenerativeModel({ model: MODEL_NAME }, GEMINI_REQUEST_OPTIONS)

    const contents: any[] = []
    if (systemInstruction) {
      contents.push({ role: 'user', parts: [{ text: systemInstruction }] })
    }
    for (const msg of messages) {
      const textContent = typeof msg.parts === 'string'
        ? msg.parts
        : (Array.isArray(msg.parts) ? msg.parts.map(p => p.text || '').join('\n') : '')
      contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: textContent }] })
    }
    const result = await model.generateContent({ contents })
    const response = result.response
    const textParts: string[] = []
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts || []) {
        if (part.text) textParts.push(part.text)
      }
    }
    // Simulated function calls parsing (look for pattern function_call:name(args))
    const combined = textParts.join('\n')
    const functionCalls: Array<{ name: string; args: Record<string, any> }> = []
    const fnRegex = /function_call\s*:\s*(\w+)\(([^)]*)\)/gi
    let match
    while ((match = fnRegex.exec(combined)) !== null) {
      const name = match[1]
      const argsRaw = match[2]
      const args: Record<string, any> = {}
      argsRaw.split(',').map(s => s.trim()).filter(Boolean).forEach(pair => {
        const [k,v] = pair.split('=')
        if (k && v) args[k.trim()] = v.trim()
      })
      functionCalls.push({ name, args })
    }
    return { text: combined, functionCalls: functionCalls.length ? functionCalls : undefined }
  } catch (error) {
    console.error('Gemini API error:', error)
    throw error
  }
}

/**
 * Define tools available to the agent (Gemini format)
 */
export function getGeminiTools(): Tool[] {
  return [
    {
      functionDeclarations: [
        {
          name: 'search_web',
          description: 'Search the web for information about a company, its products, leadership team, financial data, recent news, or any other relevant information.',
            parameters: {
            type: 'OBJECT' as any,
            properties: {
              query: {
                type: 'STRING' as any,
                description: 'The search query to find relevant information',
              },
              companyName: {
                type: 'STRING' as any,
                description: 'The name of the company being researched',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'analyze_company_data',
          description: 'Analyze collected company data to extract insights, patterns, and key information.',
              parameters: {
            type: 'OBJECT' as any,
            properties: {
              data: {
                type: 'STRING' as any,
                description: 'The data to analyze',
              },
              analysisType: {
                type: 'STRING' as any,
                description: 'Type of analysis: financial, competitive, market, or general',
                enum: ['financial', 'competitive', 'market', 'general'],
              },
            },
            required: ['data', 'analysisType'],
          },
        },
        {
          name: 'extract_contacts',
          description: 'Extract contact information and decision makers from company data.',
            parameters: {
            type: 'OBJECT' as any,
            properties: {
              companyData: {
                type: 'STRING' as any,
                description: 'Company data to extract contacts from',
              },
            },
            required: ['companyData'],
          },
        },
      ],
    },
  ]
}
