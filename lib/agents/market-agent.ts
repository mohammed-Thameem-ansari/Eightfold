import { BaseAgent } from './base-agent'
import { searchWeb } from '@/lib/api-client'
import { callGeminiWithTools } from '@/lib/api-client'
import { getFinancialService } from '@/lib/services/financial-data'
import { getNewsService } from '@/lib/services/news-aggregation'
import { getLLMService } from '@/lib/services/llm-providers'
import { getVectorDBService } from '@/lib/services/vector-database'

/**
 * Market Agent - Analyzes market position and industry trends
 */
export class MarketAgent extends BaseAgent {
  constructor() {
    super(
      'Market Agent',
      'Analyzes market position, industry trends, and market opportunities',
      ['market-analysis', 'industry-research', 'trend-analysis']
    )
  }

  async execute(input: any): Promise<{
    marketPosition: string
    marketShare?: number
    industryTrends: string[]
    opportunities: string[]
    threats: string[]
  }> {
    const startTime = Date.now()
    this.validateInput(input, ['companyName'])

    try {
      const { companyName, data } = input

      // Get real market data from multiple services
      const financialService = getFinancialService()
      const newsService = getNewsService()
      const llmService = getLLMService()
      const vectorDB = getVectorDBService()

      // Parallel API calls for efficiency
      const [marketData, industryNews, financialMetrics] = await Promise.all([
        // Get market index data (S&P 500 as proxy for market conditions)
        financialService.getMarketData('SPY').catch(() => null),
        newsService.getTrendingNews('business', { limit: 20 }).catch(() => []),
        financialService.getStockQuote(companyName).catch(() => null),
      ])

      // Get sector-specific news
      const sectorNews = await newsService.getNews({
        keywords: [companyName, 'industry trends', 'market analysis'],
        limit: 30,
      }).catch(() => [])

      // Retrieve relevant context from vector database
      let relevantContext: string[] = []
      try {
        const contextDocs = await vectorDB.search(
          `${companyName} market position industry trends competitive landscape`,
          {
            topK: 10,
            filter: { company: companyName },
          }
        )
        relevantContext = contextDocs.map((doc, i) =>
          `[Market Context ${i + 1}] ${doc.document.content.substring(0, 300)}`
        )
      } catch (error) {
        console.warn('Failed to retrieve market context:', error)
      }

      // Fallback: web search if APIs fail
      let webSources: any[] = []
      if (!financialMetrics && sectorNews.length === 0) {
        const marketQueries = [
          `${companyName} market position 2024`,
          `${companyName} industry trends`,
        ]
        for (const query of marketQueries) {
          const sources = await searchWeb(query, companyName)
          webSources.push(...sources)
        }
      }

      // Build comprehensive analysis prompt
      const analysisPrompt = this.buildAnalysisPrompt(
        companyName,
        {
          financialMetrics,
          marketData,
          industryNews,
          sectorNews,
          webSources,
        },
        data,
        relevantContext
      )
      
      const response = await llmService.generateText({
        prompt: `You are a senior market analyst with expertise in industry trends, competitive dynamics, and market positioning. Provide data-driven insights with strategic recommendations.\n\n${analysisPrompt}`,
        maxTokens: 2500,
        temperature: 0.7,
      })

      const analysis = this.parseMarketAnalysis(response.text)

      const executionTime = Date.now() - startTime
      this.recordExecution(true, executionTime)

      return analysis
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordExecution(false, executionTime)
      throw error
    }
  }

  private buildAnalysisPrompt(
    companyName: string,
    marketSources: any,
    data: any,
    context?: string[]
  ): string {
    const contextSection = context && context.length > 0
      ? `\n\n**Historical Market Context:**\n${context.join('\n\n')}\n`
      : ''

    const financialSection = marketSources.financialMetrics
      ? `\n**Current Stock Data:**\n- Symbol: ${marketSources.financialMetrics.symbol}\n- Price: $${marketSources.financialMetrics.price}\n- Market Cap: $${marketSources.financialMetrics.marketCap}\n- P/E Ratio: ${marketSources.financialMetrics.peRatio}\n- 52-Week Change: ${marketSources.financialMetrics.change52Week}%\n`
      : ''

    const newsSection = marketSources.sectorNews?.length > 0
      ? `\n**Recent Industry News:**\n${marketSources.sectorNews.slice(0, 10).map((article: any, i: number) => 
          `${i + 1}. ${article.title} - ${article.source} (${article.publishedAt})`
        ).join('\n')}\n`
      : ''

    const trendingSection = marketSources.industryNews?.length > 0
      ? `\n**Market Trends:**\n${marketSources.industryNews.slice(0, 5).map((article: any, i: number) => 
          `${i + 1}. ${article.title}`
        ).join('\n')}\n`
      : ''

    return `Conduct a comprehensive market analysis for **${companyName}**.
${contextSection}${financialSection}${newsSection}${trendingSection}
**Additional Research Data:**
${JSON.stringify(data, null, 2)}

**Analysis Requirements:**

1. **Market Position Assessment:**
   - Current market standing (leader, challenger, niche player)
   - Competitive positioning
   - Market differentiation factors

2. **Market Share Analysis:**
   - Estimated market share (if available)
   - Share trends (growing/declining)
   - Key competitors and their positions

3. **Industry Trends (4-6 trends):**
   - Emerging technologies
   - Regulatory changes
   - Consumer behavior shifts
   - Market consolidation/expansion

4. **Market Opportunities (3-5 opportunities):**
   - Untapped market segments
   - Strategic partnerships
   - Product/service expansion areas
   - Geographic expansion

5. **Market Threats (3-5 threats):**
   - Competitive pressures
   - Regulatory risks
   - Technology disruption
   - Economic factors

**Output Format:**
Provide your analysis as a JSON object:
{
  "marketPosition": "detailed description",
  "marketShare": 0.0 (number or null),
  "industryTrends": ["trend 1", "trend 2", ...],
  "opportunities": ["opportunity 1", "opportunity 2", ...],
  "threats": ["threat 1", "threat 2", ...]
}

Base your analysis on the provided financial data, news, and research context.`
  }

  private parseMarketAnalysis(text: string): {
    marketPosition: string
    marketShare?: number
    industryTrends: string[]
    opportunities: string[]
    threats: string[]
  } {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      // Fallback
    }

    return {
      marketPosition: 'Analysis in progress',
      industryTrends: [],
      opportunities: [],
      threats: [],
    }
  }
}

