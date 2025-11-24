/**
 * Search Tools - Web search, news search, company search
 */

import { z } from 'zod'
import { Tool } from './types'
import { searchWeb } from '@/lib/api-client'
import { getNewsService } from '@/lib/services/news-aggregation'

export const webSearchTool: Tool = {
  name: 'web_search',
  description: 'Search the web for current information using SERP API or Brave Search. Returns top search results with titles, URLs, and snippets.',
  category: 'search',
  schema: z.object({
    query: z.string().describe('Search query - be specific and include relevant keywords'),
    numResults: z.number().optional().default(10).describe('Number of results to return (1-20)'),
    timeRange: z.enum(['day', 'week', 'month', 'year', 'all']).optional().describe('Filter results by time range')
  }),
  execute: async ({ query, numResults = 10, timeRange }) => {
    try {
      const results = await searchWeb(query)
      return {
        success: true,
        results: results.map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet || '',
          domain: r.domain
        })),
        count: results.length,
        query
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        results: []
      }
    }
  },
  retryPolicy: {
    maxRetries: 3,
    backoffType: 'exponential',
    initialDelay: 1000
  }
}

export const newsSearchTool: Tool = {
  name: 'news_search',
  description: 'Search for recent news articles about a topic, company, or person. Returns news from multiple sources with publication dates.',
  category: 'search',
  schema: z.object({
    query: z.string().describe('News search query or company name'),
    days: z.number().optional().default(7).describe('Days back to search (1-30)'),
    limit: z.number().optional().default(10).describe('Maximum number of articles')
  }),
  execute: async ({ query, days = 7, limit = 10 }) => {
    try {
      const newsService = getNewsService()
      const results = await newsService.getNews(query, {
        limit,
        sortBy: 'publishedAt'
      })

      return {
        success: true,
        articles: results.map(article => ({
          title: article.title,
          url: article.url,
          source: article.source,
          publishedAt: article.publishedAt,
          description: article.description
        })),
        count: results.length,
        query
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        articles: []
      }
    }
  }
}

export const companySearchTool: Tool = {
  name: 'company_search',
  description: 'Search for comprehensive company information including website, industry, description, and key details.',
  category: 'search',
  schema: z.object({
    companyName: z.string().describe('Company name to search for'),
    includeFinancials: z.boolean().optional().default(false).describe('Include financial data if available'),
    includeNews: z.boolean().optional().default(true).describe('Include recent news')
  }),
  execute: async ({ companyName, includeFinancials, includeNews }) => {
    try {
      // Combine multiple search strategies
      const webResults = await searchWeb(`${companyName} company official website`, companyName)
      
      let news: any[] = []
      if (includeNews) {
        const newsService = getNewsService()
        const newsResults = await newsService.getNews(companyName, {
          limit: 5
        })
        news = newsResults
      }

      return {
        success: true,
        company: {
          name: companyName,
          sources: webResults.slice(0, 3),
          recentNews: news.slice(0, 3)
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}
