import { BaseAgent } from './base-agent'
import { searchWeb } from '@/lib/api-client'
import { callGeminiWithTools } from '@/lib/api-client'
import { getFinancialService } from '@/lib/services/financial-data'
import { getLLMService } from '@/lib/services/llm-providers'
import { stockDataService } from '@/lib/services/stock-data'
import { lookupSymbol } from '@/lib/services/symbol-lookup'

/**
 * Financial Agent - Analyzes financial data and performance
 */
export class FinancialAgent extends BaseAgent {
  constructor() {
    super(
      'Financial Agent',
      'Analyzes financial performance, revenue, and financial health',
      ['financial-analysis', 'revenue-analysis', 'financial-health']
    )
  }

  async execute(input: any): Promise<{
    revenue?: { amount: number; currency: string; period: string }
    growth: { rate: number; trend: string }
    financialHealth: string
    keyMetrics: Array<{ name: string; value: string }>
    stockQuote?: any
    valuation?: any
  }> {
    const startTime = Date.now()
    this.validateInput(input, ['companyName'])

    try {
      const { companyName, data } = input
      const financialService = getFinancialService()

      // Extract stock symbol if provided or search for it
      let symbol = data?.symbol
      if (!symbol) {
        // Try symbol lookup service first
        symbol = await lookupSymbol(companyName)
        
        // Fallback to old service
        if (!symbol) {
          const searchResults = await financialService.searchSymbol(companyName)
          symbol = searchResults[0]?.symbol
        }
      }

      // Get real financial data from APIs
      let stockQuote = null
      let financials = null
      let valuation = null
      let historicalData = null
      let financialMetrics = null

      if (symbol) {
        try {
          // Use new stock data service for real-time data
          [stockQuote, historicalData, financialMetrics] = await Promise.all([
            stockDataService.getStockQuote(symbol),
            stockDataService.getHistoricalData(symbol, '1m'),
            stockDataService.getFinancialMetrics(symbol)
          ])
          
          // Fallback to old service if needed
          if (!stockQuote) {
            [stockQuote, financials, valuation] = await Promise.all([
              financialService.getStockQuote(symbol),
              financialService.getCompanyFinancials(symbol),
              financialService.analyzeValuation(symbol)
            ])
          }
        } catch (error) {
          console.error('Financial API error:', error)
        }
      }

      // Fallback to web search if APIs fail
      const allSources = []
      const financialQueries = [
        `${companyName} revenue`,
        `${companyName} financial results`,
        `${companyName} stock price`,
      ]

      for (const query of financialQueries) {
        const sources = await searchWeb(query, companyName)
        allSources.push(...sources)
      }

      // Build comprehensive analysis using LLM
      const llmService = getLLMService()
      const analysisPrompt = this.buildAnalysisPrompt(companyName, {
        stockQuote,
        financials,
        valuation,
        webSources: allSources.slice(0, 5)
      })

      const response = await llmService.generateWithFallback(
        analysisPrompt,
        'gemini'
      )

      const analysis = this.parseFinancialAnalysis(response.text)

      // Calculate growth from historical data
      let growthRate = 0
      let growthTrend = 'unknown'
      if (historicalData && historicalData.length > 1) {
        const firstPrice = historicalData[0].close
        const lastPrice = historicalData[historicalData.length - 1].close
        growthRate = ((lastPrice - firstPrice) / firstPrice) * 100
        growthTrend = growthRate > 0 ? 'Bullish' : growthRate < 0 ? 'Bearish' : 'Neutral'
      }

      // Merge API data with analysis
      const result = {
        ...analysis,
        stockQuote,
        valuation,
        historicalData,
        financialMetrics,
        revenue: financials ? {
          amount: financials.revenue || 0,
          currency: 'USD',
          period: financials.fiscalYear || 'Latest'
        } : analysis.revenue,
        growth: {
          rate: growthRate || (valuation?.technical?.trend === 'Bullish' ? 5 : 0),
          trend: growthTrend || valuation?.technical?.trend || analysis.growth.trend
        },
        keyMetrics: [
          { name: 'Current Price', value: stockQuote?.price ? `$${stockQuote.price.toFixed(2)}` : 'N/A' },
          { name: 'Change %', value: stockQuote?.changePercent ? `${stockQuote.changePercent > 0 ? '+' : ''}${stockQuote.changePercent.toFixed(2)}%` : 'N/A' },
          { name: 'Volume', value: stockQuote?.volume ? (stockQuote.volume / 1e6).toFixed(2) + 'M' : 'N/A' },
          { name: 'Market Cap', value: stockQuote?.marketCap ? `$${(stockQuote.marketCap / 1e9).toFixed(2)}B` : 'N/A' },
          { name: 'P/E Ratio', value: financialMetrics?.peRatio?.toFixed(2) || valuation?.valuation?.peRatio?.toFixed(2) || 'N/A' },
          { name: 'EPS', value: financialMetrics?.eps ? `$${financialMetrics.eps.toFixed(2)}` : 'N/A' },
          { name: '52W High', value: financialMetrics?.fiftyTwoWeekHigh ? `$${financialMetrics.fiftyTwoWeekHigh.toFixed(2)}` : 'N/A' },
          { name: '52W Low', value: financialMetrics?.fiftyTwoWeekLow ? `$${financialMetrics.fiftyTwoWeekLow.toFixed(2)}` : 'N/A' },
          ...analysis.keyMetrics
        ]
      }

      const executionTime = Date.now() - startTime
      this.recordExecution(true, executionTime)

      return result
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordExecution(false, executionTime)
      throw error
    }
  }

  private buildAnalysisPrompt(companyName: string, data: any): string {
    return `Analyze the financial performance of ${companyName} based on the following data:

Stock Quote: ${JSON.stringify(data.stockQuote, null, 2)}

Financials: ${JSON.stringify(data.financials, null, 2)}

Valuation: ${JSON.stringify(data.valuation, null, 2)}

Web Sources: ${JSON.stringify(data.webSources, null, 2)}

Please provide:
1. Financial health assessment (Strong/Moderate/Weak)
2. Growth prospects
3. Key insights about the company's financial position

Format as JSON with keys: financialHealth, growth (rate, trend), keyMetrics (array of {name, value}).`
  }

  private parseFinancialAnalysis(text: string): {
    revenue?: { amount: number; currency: string; period: string }
    growth: { rate: number; trend: string }
    financialHealth: string
    keyMetrics: Array<{ name: string; value: string }>
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
      growth: { rate: 0, trend: 'unknown' },
      financialHealth: 'Analysis in progress',
      keyMetrics: [],
    }
  }
}

