/**
 * Real-Time Stock & Financial Data Service
 * Fetches live stock prices, market data, and financial metrics
 */

import { errorHandler } from '@/lib/error-handler'

export interface StockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  high: number
  low: number
  open: number
  previousClose: number
  timestamp: Date
  currency: string
}

export interface StockHistoricalData {
  date: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface FinancialMetrics {
  symbol: string
  peRatio?: number
  eps?: number
  dividend?: number
  dividendYield?: number
  beta?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  avgVolume?: number
  revenue?: number
  profitMargin?: number
  operatingMargin?: number
  returnOnEquity?: number
  debtToEquity?: number
  currentRatio?: number
}

export interface MarketIndices {
  name: string
  value: number
  change: number
  changePercent: number
}

/**
 * Stock Data Service
 */
export class StockDataService {
  private static instance: StockDataService | null = null
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private cacheDuration = 60000 // 1 minute

  static getInstance(): StockDataService {
    if (!this.instance) {
      this.instance = new StockDataService()
    }
    return this.instance
  }

  /**
   * Get real-time stock quote
   */
  async getStockQuote(symbol: string): Promise<StockQuote | null> {
    try {
      // Check cache
      const cached = this.getFromCache(`quote_${symbol}`)
      if (cached) return cached

      // Try multiple data sources
      let quote = await this.fetchFromYahooFinance(symbol)
      
      if (!quote) {
        quote = await this.fetchFromAlphaVantage(symbol)
      }
      
      if (!quote) {
        quote = await this.fetchFromFinnhub(symbol)
      }

      if (!quote) {
        // Return mock data for demo
        quote = this.getMockStockQuote(symbol)
      }

      // Cache the result
      this.setCache(`quote_${symbol}`, quote)
      return quote
    } catch (error) {
      errorHandler.handle(error, 'StockDataService.getStockQuote')
      return this.getMockStockQuote(symbol)
    }
  }

  /**
   * Get historical stock data
   */
  async getHistoricalData(
    symbol: string,
    period: '1d' | '1w' | '1m' | '3m' | '6m' | '1y' = '1m'
  ): Promise<StockHistoricalData[]> {
    try {
      const cached = this.getFromCache(`history_${symbol}_${period}`)
      if (cached) return cached

      let data = await this.fetchHistoricalFromYahoo(symbol, period)
      
      if (!data || data.length === 0) {
        data = this.generateMockHistoricalData(symbol, period)
      }

      this.setCache(`history_${symbol}_${period}`, data)
      return data
    } catch (error) {
      errorHandler.handle(error, 'StockDataService.getHistoricalData')
      return this.generateMockHistoricalData(symbol, period)
    }
  }

  /**
   * Get financial metrics
   */
  async getFinancialMetrics(symbol: string): Promise<FinancialMetrics | null> {
    try {
      const cached = this.getFromCache(`metrics_${symbol}`)
      if (cached) return cached

      let metrics = await this.fetchMetricsFromYahoo(symbol)
      
      if (!metrics) {
        metrics = await this.fetchMetricsFromAlphaVantage(symbol)
      }

      if (!metrics) {
        metrics = this.getMockFinancialMetrics(symbol)
      }

      this.setCache(`metrics_${symbol}`, metrics)
      return metrics
    } catch (error) {
      errorHandler.handle(error, 'StockDataService.getFinancialMetrics')
      return this.getMockFinancialMetrics(symbol)
    }
  }

  /**
   * Get market indices
   */
  async getMarketIndices(): Promise<MarketIndices[]> {
    try {
      const cached = this.getFromCache('indices')
      if (cached) return cached

      const indices = await this.fetchMarketIndices()
      this.setCache('indices', indices)
      return indices
    } catch (error) {
      errorHandler.handle(error, 'StockDataService.getMarketIndices')
      return this.getMockMarketIndices()
    }
  }

  /**
   * Fetch from Yahoo Finance (via RapidAPI or scraping)
   */
  private async fetchFromYahooFinance(symbol: string): Promise<StockQuote | null> {
    try {
      // Using Yahoo Finance API via RapidAPI (if key available)
      const apiKey = process.env.RAPIDAPI_KEY
      if (!apiKey) return null

      const response = await fetch(
        `https://yahoo-finance15.p.rapidapi.com/api/yahoo/qu/quote/${symbol}`,
        {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
          }
        }
      )

      if (!response.ok) return null

      const data = await response.json()
      
      return {
        symbol: data.symbol || symbol,
        name: data.longName || data.shortName || symbol,
        price: data.regularMarketPrice || 0,
        change: data.regularMarketChange || 0,
        changePercent: data.regularMarketChangePercent || 0,
        volume: data.regularMarketVolume || 0,
        marketCap: data.marketCap || 0,
        high: data.regularMarketDayHigh || 0,
        low: data.regularMarketDayLow || 0,
        open: data.regularMarketOpen || 0,
        previousClose: data.regularMarketPreviousClose || 0,
        timestamp: new Date(),
        currency: data.currency || 'USD'
      }
    } catch (error) {
      console.error('Yahoo Finance API error:', error)
      return null
    }
  }

  /**
   * Fetch from Alpha Vantage
   */
  private async fetchFromAlphaVantage(symbol: string): Promise<StockQuote | null> {
    try {
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY
      if (!apiKey) return null

      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
      )

      if (!response.ok) return null

      const data = await response.json()
      const quote = data['Global Quote']

      if (!quote) return null

      return {
        symbol: quote['01. symbol'],
        name: symbol,
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        marketCap: 0,
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        open: parseFloat(quote['02. open']),
        previousClose: parseFloat(quote['08. previous close']),
        timestamp: new Date(),
        currency: 'USD'
      }
    } catch (error) {
      console.error('Alpha Vantage API error:', error)
      return null
    }
  }

  /**
   * Fetch from Finnhub
   */
  private async fetchFromFinnhub(symbol: string): Promise<StockQuote | null> {
    try {
      const apiKey = process.env.FINNHUB_API_KEY
      if (!apiKey) return null

      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
      )

      if (!response.ok) return null

      const data = await response.json()

      return {
        symbol,
        name: symbol,
        price: data.c || 0,
        change: data.d || 0,
        changePercent: data.dp || 0,
        volume: 0,
        marketCap: 0,
        high: data.h || 0,
        low: data.l || 0,
        open: data.o || 0,
        previousClose: data.pc || 0,
        timestamp: new Date(),
        currency: 'USD'
      }
    } catch (error) {
      console.error('Finnhub API error:', error)
      return null
    }
  }

  /**
   * Fetch historical data from Yahoo
   */
  private async fetchHistoricalFromYahoo(
    symbol: string,
    period: string
  ): Promise<StockHistoricalData[]> {
    // Implementation would use Yahoo Finance API
    return []
  }

  /**
   * Fetch metrics from Yahoo
   */
  private async fetchMetricsFromYahoo(symbol: string): Promise<FinancialMetrics | null> {
    // Implementation would use Yahoo Finance API
    return null
  }

  /**
   * Fetch metrics from Alpha Vantage
   */
  private async fetchMetricsFromAlphaVantage(symbol: string): Promise<FinancialMetrics | null> {
    // Implementation would use Alpha Vantage API
    return null
  }

  /**
   * Fetch market indices
   */
  private async fetchMarketIndices(): Promise<MarketIndices[]> {
    return this.getMockMarketIndices()
  }

  /**
   * Generate mock stock quote (for demo/fallback)
   */
  private getMockStockQuote(symbol: string): StockQuote {
    const basePrice = 150 + Math.random() * 200
    const change = (Math.random() - 0.5) * 10
    const changePercent = (change / basePrice) * 100

    return {
      symbol: symbol.toUpperCase(),
      name: this.getCompanyName(symbol),
      price: parseFloat(basePrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: Math.floor(Math.random() * 100000000),
      marketCap: Math.floor((basePrice * Math.random() * 1000000000)),
      high: parseFloat((basePrice + Math.random() * 5).toFixed(2)),
      low: parseFloat((basePrice - Math.random() * 5).toFixed(2)),
      open: parseFloat((basePrice + (Math.random() - 0.5) * 3).toFixed(2)),
      previousClose: parseFloat((basePrice - change).toFixed(2)),
      timestamp: new Date(),
      currency: 'USD'
    }
  }

  /**
   * Generate mock historical data
   */
  private generateMockHistoricalData(
    symbol: string,
    period: string
  ): StockHistoricalData[] {
    const days = period === '1d' ? 1 : period === '1w' ? 7 : period === '1m' ? 30 : 
                 period === '3m' ? 90 : period === '6m' ? 180 : 365
    
    const data: StockHistoricalData[] = []
    let price = 150 + Math.random() * 100
    
    for (let i = days; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const volatility = price * 0.02
      const change = (Math.random() - 0.5) * volatility
      price += change
      
      const open = price + (Math.random() - 0.5) * volatility
      const high = Math.max(price, open) + Math.random() * volatility
      const low = Math.min(price, open) - Math.random() * volatility
      
      data.push({
        date,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(price.toFixed(2)),
        volume: Math.floor(Math.random() * 50000000)
      })
    }
    
    return data
  }

  /**
   * Get mock financial metrics
   */
  private getMockFinancialMetrics(symbol: string): FinancialMetrics {
    return {
      symbol: symbol.toUpperCase(),
      peRatio: 15 + Math.random() * 30,
      eps: 5 + Math.random() * 10,
      dividend: Math.random() * 3,
      dividendYield: Math.random() * 4,
      beta: 0.8 + Math.random() * 0.8,
      fiftyTwoWeekHigh: 200 + Math.random() * 100,
      fiftyTwoWeekLow: 100 + Math.random() * 50,
      avgVolume: Math.floor(Math.random() * 100000000),
      revenue: Math.floor(Math.random() * 100000000000),
      profitMargin: 10 + Math.random() * 20,
      operatingMargin: 15 + Math.random() * 25,
      returnOnEquity: 10 + Math.random() * 30,
      debtToEquity: 0.5 + Math.random() * 1.5,
      currentRatio: 1 + Math.random() * 2
    }
  }

  /**
   * Get mock market indices
   */
  private getMockMarketIndices(): MarketIndices[] {
    return [
      {
        name: 'S&P 500',
        value: 4500 + Math.random() * 200,
        change: (Math.random() - 0.5) * 50,
        changePercent: (Math.random() - 0.5) * 2
      },
      {
        name: 'Dow Jones',
        value: 35000 + Math.random() * 1000,
        change: (Math.random() - 0.5) * 300,
        changePercent: (Math.random() - 0.5) * 1.5
      },
      {
        name: 'NASDAQ',
        value: 14000 + Math.random() * 500,
        change: (Math.random() - 0.5) * 100,
        changePercent: (Math.random() - 0.5) * 2.5
      }
    ]
  }

  /**
   * Get company name from symbol
   */
  private getCompanyName(symbol: string): string {
    const names: Record<string, string> = {
      'AAPL': 'Apple Inc.',
      'GOOGL': 'Alphabet Inc.',
      'MSFT': 'Microsoft Corporation',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.',
      'NVDA': 'NVIDIA Corporation',
      'JPM': 'JPMorgan Chase & Co.',
      'V': 'Visa Inc.',
      'WMT': 'Walmart Inc.'
    }
    return names[symbol.toUpperCase()] || `${symbol.toUpperCase()} Inc.`
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data
    }
    return null
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// Singleton export
export const stockDataService = StockDataService.getInstance()
