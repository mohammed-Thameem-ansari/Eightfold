import { AppConfig, SearchProviderConfig } from '@/types'

/**
 * Default application configuration
 */
export const defaultConfig: AppConfig = {
  apiKeys: {
    gemini: process.env.GOOGLE_GEMINI_API_KEY || '',
    serp: process.env.SERP_API_KEY || '',
    brave: process.env.BRAVE_SEARCH_API_KEY || '',
  },
  features: {
    enableCaching: process.env.ENABLE_CACHING !== 'false',
    enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false',
    enableExport: true,
    maxIterations: parseInt(process.env.MAX_ITERATIONS || '10', 10),
    cacheTTL: parseInt(process.env.CACHE_TTL || '3600000', 10), // 1 hour default
    enableOpenAI: !!process.env.OPENAI_API_KEY,
    enableGroq: !!process.env.GROQ_API_KEY,
    ragTopK: parseInt(process.env.RAG_TOPK || '5', 10),
  },
  ui: {
    theme: (process.env.THEME as 'light' | 'dark' | 'auto') || 'auto',
    language: process.env.LANGUAGE || 'en',
    dateFormat: process.env.DATE_FORMAT || 'PPpp',
  },
}

/**
 * Search provider configurations
 */
export const searchProviderConfigs: SearchProviderConfig[] = [
  {
    name: 'serp',
    enabled: !!process.env.SERP_API_KEY,
    priority: 1,
    apiKey: process.env.SERP_API_KEY,
    rateLimit: {
      requests: 100,
      period: 60000, // 1 minute
    },
  },
  {
    name: 'duckduckgo',
    enabled: true, // Always enabled (free, no API key)
    priority: 2,
    rateLimit: {
      requests: 20,
      period: 60000, // 1 minute
    },
  },
  {
    name: 'brave',
    enabled: !!process.env.BRAVE_SEARCH_API_KEY,
    priority: 3,
    apiKey: process.env.BRAVE_SEARCH_API_KEY,
    rateLimit: {
      requests: 50,
      period: 60000, // 1 minute
    },
  },
  {
    name: 'mock',
    enabled: process.env.DEMO_MODE === 'true' || !process.env.GOOGLE_GEMINI_API_KEY,
    priority: 999, // Last resort
  },
]

/**
 * Get active search providers sorted by priority
 */
export function getActiveSearchProviders(): SearchProviderConfig[] {
  return searchProviderConfigs
    .filter(config => config.enabled)
    .sort((a, b) => (a.priority || 999) - (b.priority || 999))
}

/**
 * Get configuration value
 */
export function getConfig(): AppConfig {
  // In production, load from database or user preferences
  return defaultConfig
}

/**
 * Update configuration
 */
export function updateConfig(updates: Partial<AppConfig>): AppConfig {
  const current = getConfig()
  return {
    ...current,
    ...updates,
    apiKeys: {
      ...current.apiKeys,
      ...updates.apiKeys,
    },
    features: {
      ...current.features,
      ...updates.features,
    },
    ui: {
      ...current.ui,
      ...updates.ui,
    },
  }
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
  const config = getConfig()
  const value = config.features[feature]
  return typeof value === 'boolean' ? value : false
}

/**
 * Get API key
 */
export function getApiKey(provider: keyof AppConfig['apiKeys']): string | undefined {
  const config = getConfig()
  return config.apiKeys[provider]
}

/**
 * Check if running in demo mode
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' || !process.env.GOOGLE_GEMINI_API_KEY
}

/**
 * Environment variables validation
 */
export function validateEnvironment(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = []
  const warnings: string[] = []

  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    missing.push('GOOGLE_GEMINI_API_KEY')
    warnings.push('Gemini API key is required for full functionality. Running in demo mode.')
  }

  if (!process.env.SERP_API_KEY && !process.env.BRAVE_SEARCH_API_KEY) {
    warnings.push('No search API keys configured. Using DuckDuckGo and mock data as fallback.')
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  }
}

