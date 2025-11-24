import { BaseAgent } from './base-agent'
import { searchWeb } from '@/lib/api-client'
import { NewsItem } from '@/types'
import { getNewsService } from '@/lib/services/news-aggregation'
import { getFinancialService } from '@/lib/services/financial-data'

/**
 * News Agent - Gathers recent news and developments
 */
export class NewsAgent extends BaseAgent {
  constructor() {
    super(
      'News Agent',
      'Gathers recent news, press releases, and company developments',
      ['news-gathering', 'press-release-monitoring', 'trend-analysis']
    )
  }

  async execute(input: any): Promise<{
    newsItems: NewsItem[]
    recentDevelopments: string[]
    trends: string[]
    sentiment: { positive: number; negative: number; neutral: number }
  }> {
    const startTime = Date.now()
    this.validateInput(input, ['companyName'])

    try {
      const { companyName, data } = input
      const newsService = getNewsService()
      const financialService = getFinancialService()

      // Get company news from multiple sources
      const articles = await newsService.getCompanyNews(companyName, {
        limit: 30,
        daysBack: 30
      })

      // Get market news if symbol provided
      let marketNews: any[] = []
      const symbol = data?.symbol
      if (symbol) {
        try {
          marketNews = await financialService.getMarketNews(symbol, 10)
        } catch (error) {
          console.error('Market news error:', error)
        }
      }

      // Analyze sentiment for all articles
      const articlesWithSentiment = articles.map(article => ({
        ...article,
        sentiment: newsService.analyzeSentiment(
          `${article.title} ${article.description || ''}`
        )
      }))

      // Convert to NewsItem format
      const newsItems: NewsItem[] = articlesWithSentiment.map((article, index) => ({
        id: `news_${Date.now()}_${index}`,
        title: article.title,
        url: article.url,
        snippet: article.description || '',
        date: article.publishedAt,
        source: article.source,
        type: this.determineNewsType(article),
      }))

      // Add market news
      marketNews.forEach((item, index) => {
        newsItems.push({
          id: `market_${Date.now()}_${index}`,
          title: item.headline || item.title,
          url: item.url,
          snippet: item.summary || '',
          date: new Date(item.datetime * 1000),
          source: item.source,
          type: 'news' as const,
        })
      })

      // Calculate sentiment distribution
      const sentimentCounts = articlesWithSentiment.reduce(
        (acc, article) => {
          acc[article.sentiment] = (acc[article.sentiment] || 0) + 1
          return acc
        },
        { positive: 0, negative: 0, neutral: 0 } as any
      )

      const recentDevelopments = newsItems
        .slice(0, 10)
        .map(item => item.title)

      const trends = this.identifyTrends(newsItems)

      const executionTime = Date.now() - startTime
      this.recordExecution(true, executionTime)

      return {
        newsItems,
        recentDevelopments,
        trends,
        sentiment: sentimentCounts
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordExecution(false, executionTime)
      throw error
    }
  }

  private extractSourceName(url: string): string {
    try {
      const domain = new URL(url).hostname.replace('www.', '')
      return domain.split('.')[0]
    } catch {
      return 'Unknown'
    }
  }

  private determineNewsType(source: any): 'press-release' | 'news' | 'blog' | 'social' {
    const url = source.url?.toLowerCase() || ''
    if (url.includes('press') || url.includes('pr')) return 'press-release'
    if (url.includes('blog')) return 'blog'
    if (url.includes('twitter') || url.includes('linkedin')) return 'social'
    return 'news'
  }

  private identifyTrends(newsItems: NewsItem[]): string[] {
    const trends: string[] = []
    const keywords = new Map<string, number>()

    // Count keyword frequency
    for (const item of newsItems) {
      const words = (item.title + ' ' + (item.snippet || '')).toLowerCase().split(/\s+/)
      for (const word of words) {
        if (word.length > 4) {
          keywords.set(word, (keywords.get(word) || 0) + 1)
        }
      }
    }

    // Get top keywords
    const topKeywords = Array.from(keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word)

    return topKeywords
  }
}

