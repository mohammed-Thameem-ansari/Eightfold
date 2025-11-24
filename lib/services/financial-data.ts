/**
 * Financial Data Service
 * Integrates with Alpha Vantage, Yahoo Finance, and other financial APIs
 */

import axios from 'axios'

/**
 * Common stock ticker mappings
 */
const TICKER_MAP: Record<string, string> = {
  'apple': 'AAPL',
  'microsoft': 'MSFT',
  'google': 'GOOGL',
  'alphabet': 'GOOGL',
  'amazon': 'AMZN',
  'tesla': 'TSLA',
  'meta': 'META',
  'facebook': 'META',
  'nvidia': 'NVDA',
  'netflix': 'NFLX',
  'ibm': 'IBM',
  'intel': 'INTC',
  'amd': 'AMD',
  'oracle': 'ORCL',
  'cisco': 'CSCO',
  'salesforce': 'CRM',
  'adobe': 'ADBE',
  'paypal': 'PYPL',
  'twitter': 'X',
  'uber': 'UBER',
  'lyft': 'LYFT',
  'airbnb': 'ABNB',
  'spotify': 'SPOT',
  'snap': 'SNAP',
  'zoom': 'ZM',
  'coinbase': 'COIN',
}

/**
 * Extract and normalize stock ticker symbol from input
 */
function extractTickerSymbol(input: any): string {
  // Handle object with symbol/ticker property
  if (typeof input === 'object' && input !== null) {
    const symbol = input.symbol || input.ticker || input.name || input.companyName
    if (symbol) return extractTickerSymbol(symbol)
    return 'AAPL' // Default fallback
  }

  // Handle string input
  if (typeof input !== 'string') {
    console.warn('Invalid ticker input type:', typeof input)
    return 'AAPL' // Default fallback
  }

  // Clean the input string
  let cleaned = input.trim().toUpperCase()

  // If already a valid ticker (2-5 uppercase letters)
  if (/^[A-Z]{1,5}$/.test(cleaned)) {
    return cleaned
  }

  // Extract first word for company name lookup
  const firstWord = input.toLowerCase().split(/[\s,;]+/)[0]
  if (TICKER_MAP[firstWord]) {
    return TICKER_MAP[firstWord]
  }

  // Try to extract ticker pattern from string (e.g., "Apple (AAPL)")
  const tickerMatch = input.match(/\b([A-Z]{1,5})\b/)
  if (tickerMatch) {
    return tickerMatch[1]
  }

  // Default fallback
  console.warn(`Could not extract ticker from: "${input}", using AAPL as fallback`)
  return 'AAPL'
}

export interface StockQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap?: number
  timestamp: Date
}

export interface CompanyFinancials {
  symbol: string
  revenue?: number
  netIncome?: number
  grossProfit?: number
  operatingIncome?: number
  totalAssets?: number
  totalLiabilities?: number
  shareholderEquity?: number
  cashFlow?: number
  fiscalYear?: string
}

export interface MarketData {
  symbol: string
  historicalPrices: Array<{ date: string; close: number; volume: number }>
  movingAverages: { ma50?: number; ma200?: number }
  rsi?: number
  volatility?: number
}

export class FinancialDataService {
  private alphaVantageKey?: string
  private finnhubKey?: string
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private cacheTTL: number = 3600000 // 1 hour

  constructor() {
    this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY
    this.finnhubKey = process.env.FINNHUB_API_KEY
  }

  /**
   * Get real-time stock quote
   */
  async getStockQuote(symbol: string): Promise<StockQuote | null> {
    // Sanitize and extract valid ticker symbol
    const cleanSymbol = extractTickerSymbol(symbol)
    const cacheKey = `quote:${cleanSymbol}`
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    // Try Alpha Vantage
    if (this.alphaVantageKey) {
      try {
        const quote = await this.getAlphaVantageQuote(cleanSymbol)
        this.setCache(cacheKey, quote)
        return quote
      } catch (error) {
        console.error('Alpha Vantage quote failed:', error)
      }
    }

    // Try Finnhub
    if (this.finnhubKey) {
      try {
        const quote = await this.getFinnhubQuote(cleanSymbol)
        this.setCache(cacheKey, quote)
        return quote
      } catch (error) {
        console.error('Finnhub quote failed:', error)
      }
    }

    // Fallback to Yahoo Finance (free, no API key)
    try {
      const quote = await this.getYahooFinanceQuote(cleanSymbol)
      this.setCache(cacheKey, quote)
      return quote
    } catch (error) {
      console.error('Yahoo Finance quote failed:', error)
      return null
    }
  }

  /**
   * Alpha Vantage quote
   */
  private async getAlphaVantageQuote(symbol: string): Promise<StockQuote> {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.alphaVantageKey}`
    const response = await axios.get(url)
    const quote = response.data['Global Quote']

    return {
      symbol,
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      volume: parseInt(quote['06. volume']),
      timestamp: new Date(quote['07. latest trading day']),
    }
  }

  /**
   * Finnhub quote
   */
  private async getFinnhubQuote(symbol: string): Promise<StockQuote> {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.finnhubKey}`
    const response = await axios.get(url)
    const data = response.data

    return {
      symbol,
      price: data.c, // current price
      change: data.d, // change
      changePercent: data.dp, // percent change
      volume: 0, // Finnhub doesn't provide volume in quote endpoint
      timestamp: new Date(data.t * 1000),
    }
  }

  /**
   * Yahoo Finance quote (free, no API key)
   */
  private async getYahooFinanceQuote(symbol: string): Promise<StockQuote> {
    // Use Yahoo Finance v8 API
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    const result = response.data.chart.result[0]
    const meta = result.meta
    const quote = result.indicators.quote[0]

    return {
      symbol,
      price: meta.regularMarketPrice,
      change: meta.regularMarketPrice - meta.previousClose,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      volume: meta.regularMarketVolume,
      marketCap: meta.marketCap,
      timestamp: new Date(meta.regularMarketTime * 1000),
    }
  }

  /**
   * Get company financials
   */
  async getCompanyFinancials(symbol: string): Promise<CompanyFinancials | null> {
    const cacheKey = `financials:${symbol}`
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    if (!this.alphaVantageKey) {
      console.warn('Alpha Vantage API key not configured')
      return null
    }

    try {
      const url = `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${this.alphaVantageKey}`
      const response = await axios.get(url)
      
      if (!response.data.annualReports || response.data.annualReports.length === 0) {
        return null
      }

      const latest = response.data.annualReports[0]

      const financials: CompanyFinancials = {
        symbol,
        revenue: parseInt(latest.totalRevenue),
        netIncome: parseInt(latest.netIncome),
        grossProfit: parseInt(latest.grossProfit),
        operatingIncome: parseInt(latest.operatingIncome),
        fiscalYear: latest.fiscalDateEnding,
      }

      // Get balance sheet for additional data
      try {
        const balanceUrl = `https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol=${symbol}&apikey=${this.alphaVantageKey}`
        const balanceResponse = await axios.get(balanceUrl)
        const balanceLatest = balanceResponse.data.annualReports?.[0]

        if (balanceLatest) {
          financials.totalAssets = parseInt(balanceLatest.totalAssets)
          financials.totalLiabilities = parseInt(balanceLatest.totalLiabilities)
          financials.shareholderEquity = parseInt(balanceLatest.totalShareholderEquity)
        }
      } catch (error) {
        console.error('Failed to fetch balance sheet:', error)
      }

      this.setCache(cacheKey, financials, 86400000) // Cache for 24 hours
      return financials
    } catch (error) {
      console.error('Failed to fetch financials:', error)
      return null
    }
  }

  /**
   * Get historical market data
   */
  async getMarketData(symbol: string | any, range: '1M' | '3M' | '6M' | '1Y' = '3M'): Promise<MarketData | null> {
    try {
      // Sanitize symbol input
      const cleanSymbol = extractTickerSymbol(symbol)
      
      // Use Yahoo Finance for historical data
      const rangeMap = { '1M': '1mo', '3M': '3mo', '6M': '6mo', '1Y': '1y' }
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?interval=1d&range=${rangeMap[range]}`
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      const result = response.data.chart.result[0]
      const timestamps = result.timestamp
      const quotes = result.indicators.quote[0]

      const historicalPrices = timestamps.map((ts: number, i: number) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        close: quotes.close[i],
        volume: quotes.volume[i],
      }))

      // Calculate moving averages
      const closes = quotes.close.filter((c: number) => c !== null)
      const ma50 = this.calculateMA(closes, Math.min(50, closes.length))
      const ma200 = closes.length >= 200 ? this.calculateMA(closes, 200) : undefined

      // Calculate RSI
      const rsi = this.calculateRSI(closes, 14)

      // Calculate volatility
      const volatility = this.calculateVolatility(closes)

      return {
        symbol: cleanSymbol,
        historicalPrices,
        movingAverages: { ma50, ma200 },
        rsi,
        volatility,
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error)
      return null
    }
  }

  /**
   * Search for stock symbol by company name
   */
  async searchSymbol(query: string): Promise<Array<{ symbol: string; name: string }>> {
    if (this.alphaVantageKey) {
      try {
        const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${this.alphaVantageKey}`
        const response = await axios.get(url)
        
        return response.data.bestMatches?.map((match: any) => ({
          symbol: match['1. symbol'],
          name: match['2. name'],
        })) || []
      } catch (error) {
        console.error('Symbol search failed:', error)
      }
    }

    return []
  }

  /**
   * Get market news
   */
  async getMarketNews(symbol?: string, limit: number = 10): Promise<any[]> {
    if (!this.finnhubKey) {
      console.warn('Finnhub API key not configured')
      return []
    }

    try {
      const url = symbol
        ? `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${this.getDateString(-30)}&to=${this.getDateString(0)}&token=${this.finnhubKey}`
        : `https://finnhub.io/api/v1/news?category=general&token=${this.finnhubKey}`

      const response = await axios.get(url)
      return response.data.slice(0, limit)
    } catch (error) {
      console.error('Failed to fetch market news:', error)
      return []
    }
  }

  /**
   * Analyze company valuation
   */
  async analyzeValuation(symbol: string): Promise<any> {
    const [quote, financials, marketData] = await Promise.all([
      this.getStockQuote(symbol),
      this.getCompanyFinancials(symbol),
      this.getMarketData(symbol),
    ])

    if (!quote || !financials) {
      return { error: 'Insufficient data for valuation analysis' }
    }

    // Calculate key metrics
    const peRatio = quote.marketCap && financials.netIncome 
      ? quote.marketCap / financials.netIncome 
      : undefined

    const priceToSales = quote.marketCap && financials.revenue
      ? quote.marketCap / financials.revenue
      : undefined

    const profitMargin = financials.revenue && financials.netIncome
      ? (financials.netIncome / financials.revenue) * 100
      : undefined

    return {
      symbol,
      currentPrice: quote.price,
      marketCap: quote.marketCap,
      valuation: {
        peRatio,
        priceToSales,
        profitMargin,
      },
      technical: {
        rsi: marketData?.rsi,
        volatility: marketData?.volatility,
        trend: this.determineTrend(marketData),
      },
      recommendation: this.generateRecommendation(peRatio, marketData?.rsi),
    }
  }

  // Helper methods
  private calculateMA(data: number[], period: number): number {
    if (data.length < period) return NaN
    const slice = data.slice(-period)
    return slice.reduce((sum, val) => sum + val, 0) / period
  }

  private calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return NaN

    let gains = 0
    let losses = 0

    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1]
      if (change > 0) gains += change
      else losses += Math.abs(change)
    }

    const avgGain = gains / period
    const avgLoss = losses / period

    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  private calculateVolatility(closes: number[]): number {
    if (closes.length < 2) return 0

    const returns = []
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1])
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    
    return Math.sqrt(variance) * Math.sqrt(252) * 100 // Annualized volatility
  }

  private determineTrend(marketData: MarketData | null): string {
    if (!marketData || !marketData.movingAverages.ma50) return 'Unknown'
    
    const lastPrice = marketData.historicalPrices[marketData.historicalPrices.length - 1]?.close
    if (!lastPrice) return 'Unknown'

    if (lastPrice > marketData.movingAverages.ma50) return 'Bullish'
    if (lastPrice < marketData.movingAverages.ma50) return 'Bearish'
    return 'Neutral'
  }

  private generateRecommendation(peRatio?: number, rsi?: number): string {
    if (!peRatio || !rsi) return 'Insufficient data'

    if (peRatio < 15 && rsi < 40) return 'Strong Buy'
    if (peRatio < 20 && rsi < 50) return 'Buy'
    if (peRatio > 30 && rsi > 70) return 'Sell'
    if (peRatio > 40) return 'Overvalued'
    
    return 'Hold'
  }

  private getDateString(daysOffset: number): string {
    const date = new Date()
    date.setDate(date.getDate() + daysOffset)
    return date.toISOString().split('T')[0]
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

  private setCache(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }
}

// Singleton instance
let financialService: FinancialDataService | null = null

export function getFinancialService(): FinancialDataService {
  if (!financialService) {
    financialService = new FinancialDataService()
  }
  return financialService
}
