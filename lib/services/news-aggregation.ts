/**
 * News Aggregation Service
 * Integrates NewsAPI, Google News, Hacker News, and RSS feeds
 */

import axios from 'axios'
import Parser from 'rss-parser'
// Hacker News integration (API client not yet exported)

export interface NewsArticle {
  title: string
  description?: string
  url: string
  source: string
  author?: string
  publishedAt: Date
  content?: string
  image?: string
  category?: string
  sentiment?: 'positive' | 'negative' | 'neutral'
}

export interface NewsFeed {
  name: string
  category: string
  articles: NewsArticle[]
  lastUpdated: Date
}

export class NewsAggregationService {
  private newsApiKey?: string
  private rssParser: Parser
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private cacheTTL: number = 1800000 // 30 minutes

  constructor() {
    this.newsApiKey = process.env.NEWSAPI_KEY
    this.rssParser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
  }

  /**
   * Get news articles about a company or topic
   */
  async getNews(
    queryInput: any,
    options: {
      sources?: ('newsapi' | 'google' | 'hackernews' | 'rss')[]
      limit?: number
      language?: string
      sortBy?: 'relevancy' | 'popularity' | 'publishedAt'
    } = {}
  ): Promise<NewsArticle[]> {
    const normalizedQuery = this.normalizeQuery(queryInput)
    const query = normalizedQuery.length > 0 ? normalizedQuery : 'technology'
    const sources = options.sources || ['newsapi', 'google', 'hackernews']
    const limit = options.limit || 20

    const allArticles: NewsArticle[] = []

    // Fetch from all sources in parallel
    const promises: Promise<NewsArticle[]>[] = []

    if (sources.includes('newsapi')) {
      promises.push(this.getNewsAPIArticles(query, options))
    }

    if (sources.includes('google')) {
      promises.push(this.getGoogleNewsArticles(query, options))
    }

    if (sources.includes('hackernews')) {
      promises.push(this.getHackerNewsArticles(query))
    }

    const results = await Promise.allSettled(promises)

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value)
      } else {
        console.error('News source failed:', result.reason)
      }
    }

    // Remove duplicates by URL
    const uniqueArticles = this.deduplicateArticles(allArticles)

    // Sort by published date (newest first)
    uniqueArticles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())

    return uniqueArticles.slice(0, limit)
  }

  /**
   * NewsAPI.org integration
   */
  private async getNewsAPIArticles(
    query: string,
    options: any
  ): Promise<NewsArticle[]> {
    if (!this.newsApiKey) {
      console.warn('NewsAPI key not configured')
      return []
    }

    const cacheKey = `newsapi:${query}:${options.sortBy || 'relevancy'}`
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      // Sanitize query - NewsAPI requires valid search terms
      const sanitizedQuery = this.normalizeQuery(query) || 'technology'
      
      const url = 'https://newsapi.org/v2/everything'
      const params = {
        q: sanitizedQuery,
        apiKey: this.newsApiKey,
        language: options.language || 'en',
        sortBy: options.sortBy || 'relevancy',
        pageSize: 20,
      }

      const response = await axios.get(url, { params })

      const articles: NewsArticle[] = response.data.articles.map((article: any) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source.name,
        author: article.author,
        publishedAt: new Date(article.publishedAt),
        content: article.content,
        image: article.urlToImage,
        category: 'news',
      }))

      this.setCache(cacheKey, articles)
      return articles
    } catch (error: any) {
      console.error('NewsAPI error:', error.message)
      return []
    }
  }

  /**
   * Google News RSS integration (free, no API key)
   */
  private async getGoogleNewsArticles(
    query: string,
    options: any
  ): Promise<NewsArticle[]> {
    const cacheKey = `google:${query}`
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      const encodedQuery = encodeURIComponent(this.normalizeQuery(query) || 'technology')
      const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`

      const feed = await this.rssParser.parseURL(url)

      const articles: NewsArticle[] = feed.items.slice(0, 20).map(item => ({
        title: item.title || '',
        description: item.contentSnippet || item.content,
        url: item.link || '',
        source: item.source?.title || 'Google News',
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        category: 'news',
      }))

      this.setCache(cacheKey, articles)
      return articles
    } catch (error: any) {
      console.error('Google News error:', error.message)
      return []
    }
  }

  /**
   * Hacker News integration
   */
  private async getHackerNewsArticles(query: string): Promise<NewsArticle[]> {
    const normalized = this.normalizeQuery(query) || 'technology'
    const cacheKey = `hackernews:${normalized}`
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      // const sources = await searchWithHackerNews(query) // Not yet implemented
      const sources: any[] = []

      const articles: NewsArticle[] = sources.map((source: any) => ({
        title: source.title,
        description: source.snippet,
        url: source.url,
        source: 'Hacker News',
        publishedAt: new Date(), // HN search doesn't provide dates
        category: 'tech',
      }))

      this.setCache(cacheKey, articles)
      return articles
    } catch (error: any) {
      console.error('Hacker News error:', error.message)
      return []
    }
  }

  /**
   * Get trending news by category
   */
  async getTrendingNews(
    category: 'business' | 'technology' | 'science' | 'general' = 'business',
    options: { country?: string; limit?: number } = {}
  ): Promise<NewsArticle[]> {
    if (!this.newsApiKey) {
      return this.getTrendingNewsFromRSS(category, options)
    }

    const cacheKey = `trending:${category}:${options.country || 'us'}`
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      const url = 'https://newsapi.org/v2/top-headlines'
      const params = {
        category,
        country: options.country || 'us',
        apiKey: this.newsApiKey,
        pageSize: options.limit || 20,
      }

      const response = await axios.get(url, { params })

      const articles: NewsArticle[] = response.data.articles.map((article: any) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source.name,
        author: article.author,
        publishedAt: new Date(article.publishedAt),
        content: article.content,
        image: article.urlToImage,
        category,
      }))

      this.setCache(cacheKey, articles)
      return articles
    } catch (error: any) {
      console.error('NewsAPI trending error:', error.message)
      return this.getTrendingNewsFromRSS(category, options)
    }
  }

  /**
   * Fallback trending news from RSS feeds
   */
  private async getTrendingNewsFromRSS(
    category: string,
    options: any
  ): Promise<NewsArticle[]> {
    const rssFeeds: Record<string, string> = {
      business: 'https://feeds.reuters.com/reuters/businessNews',
      technology: 'https://feeds.reuters.com/reuters/technologyNews',
      science: 'https://feeds.reuters.com/reuters/scienceNews',
      general: 'https://feeds.reuters.com/reuters/topNews',
    }

    const feedUrl = rssFeeds[category] || rssFeeds.general

    try {
      const feed = await this.rssParser.parseURL(feedUrl)

      return feed.items.slice(0, options.limit || 20).map(item => ({
        title: item.title || '',
        description: item.contentSnippet || item.content,
        url: item.link || '',
        source: 'Reuters',
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        category,
      }))
    } catch (error: any) {
      console.error('RSS feed error:', error.message)
      return []
    }
  }

  /**
   * Get company-specific news
   */
  async getCompanyNews(
    companyName: string,
    options: { limit?: number; daysBack?: number } = {}
  ): Promise<NewsArticle[]> {
    const queries = [
      companyName,
      `${companyName} earnings`,
      `${companyName} announcement`,
      `${companyName} news`,
    ]

    const allArticles: NewsArticle[] = []

    for (const query of queries) {
      const articles = await this.getNews(query, {
        limit: 5,
        sortBy: 'publishedAt',
      })
      allArticles.push(...articles)
    }

    // Filter by date if specified
    let filtered = allArticles
    if (options.daysBack) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - options.daysBack)
      filtered = allArticles.filter(a => a.publishedAt >= cutoffDate)
    }

    // Deduplicate and sort
    const unique = this.deduplicateArticles(filtered)
    unique.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())

    return unique.slice(0, options.limit || 20)
  }

  /**
   * Analyze news sentiment (basic keyword-based)
   */
  analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveKeywords = ['growth', 'profit', 'success', 'innovation', 'breakthrough', 'surge', 'gain', 'up', 'strong', 'positive']
    const negativeKeywords = ['loss', 'decline', 'fail', 'crisis', 'drop', 'down', 'weak', 'negative', 'concern', 'risk']

    const lowerText = text.toLowerCase()
    
    let positiveCount = 0
    let negativeCount = 0

    for (const keyword of positiveKeywords) {
      if (lowerText.includes(keyword)) positiveCount++
    }

    for (const keyword of negativeKeywords) {
      if (lowerText.includes(keyword)) negativeCount++
    }

    if (positiveCount > negativeCount + 1) return 'positive'
    if (negativeCount > positiveCount + 1) return 'negative'
    return 'neutral'
  }

  /**
   * Get news with sentiment analysis
   */
  async getNewsWithSentiment(
    query: string,
    options: any = {}
  ): Promise<NewsArticle[]> {
    const articles = await this.getNews(query, options)

    return articles.map(article => ({
      ...article,
      sentiment: this.analyzeSentiment(
        `${article.title} ${article.description || ''}`
      ),
    }))
  }

  /**
   * Subscribe to RSS feed
   */
  async subscribeToFeed(feedUrl: string): Promise<NewsFeed> {
    try {
      const feed = await this.rssParser.parseURL(feedUrl)

      const articles: NewsArticle[] = feed.items.slice(0, 20).map(item => ({
        title: item.title || '',
        description: item.contentSnippet || item.content,
        url: item.link || '',
        source: feed.title || 'RSS Feed',
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        category: 'rss',
      }))

      return {
        name: feed.title || 'Custom Feed',
        category: 'rss',
        articles,
        lastUpdated: new Date(),
      }
    } catch (error: any) {
      throw new Error(`Failed to fetch RSS feed: ${error.message}`)
    }
  }

  // Helper methods
  private deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>()
    return articles.filter(article => {
      const key = article.url.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  private normalizeQuery(input: any): string {
    if (typeof input === 'string') {
      return input.trim()
    }

    if (input && typeof input === 'object') {
      const value = (input.query ?? input.q ?? '').toString()
      return value.trim()
    }

    if (typeof input === 'number') {
      return input.toString()
    }

    return ''
  }
}

// Singleton instance
let newsService: NewsAggregationService | null = null

export function getNewsService(): NewsAggregationService {
  if (!newsService) {
    newsService = new NewsAggregationService()
  }
  return newsService
}
