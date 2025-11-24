'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, TrendingDown, DollarSign, BarChart3, 
  Activity, ArrowUpRight, ArrowDownRight, RefreshCw,
  Loader2, AlertCircle
} from 'lucide-react'
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts'
import { Button } from '@/components/ui/button'
import { stockDataService, StockQuote, FinancialMetrics, StockHistoricalData } from '@/lib/services/stock-data'

interface FinancialDashboardProps {
  symbol: string
  companyName?: string
}

export function FinancialDashboard({ symbol, companyName }: FinancialDashboardProps) {
  const [stockQuote, setStockQuote] = useState<StockQuote | null>(null)
  const [historicalData, setHistoricalData] = useState<StockHistoricalData[]>([])
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null)
  const [period, setPeriod] = useState<'1d' | '1w' | '1m' | '3m' | '6m' | '1y'>('1m')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFinancialData()
  }, [symbol, period])

  const loadFinancialData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [quote, history, financials] = await Promise.all([
        stockDataService.getStockQuote(symbol),
        stockDataService.getHistoricalData(symbol, period),
        stockDataService.getFinancialMetrics(symbol)
      ])

      setStockQuote(quote)
      setHistoricalData(history)
      setMetrics(financials)
    } catch (err) {
      setError('Failed to load financial data')
      console.error('Financial data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    stockDataService.clearCache()
    await loadFinancialData()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading financial data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !stockQuote) {
    return (
      <Card className="w-full border-red-500/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12 text-red-500">
            <AlertCircle className="h-8 w-8 mr-3" />
            <span>{error || 'Failed to load data'}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isPositive = stockQuote.change >= 0
  const priceChange = Math.abs(stockQuote.change)
  const percentChange = Math.abs(stockQuote.changePercent)

  // Format chart data
  const chartData = historicalData.map(d => ({
    date: d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: d.close,
    volume: d.volume / 1000000 // Convert to millions
  }))

  // Calculate growth
  const firstPrice = historicalData[0]?.close || stockQuote.price
  const lastPrice = historicalData[historicalData.length - 1]?.close || stockQuote.price
  const periodGrowth = ((lastPrice - firstPrice) / firstPrice) * 100
  const isGrowthPositive = periodGrowth >= 0

  // Metrics data for pie chart
  const metricsData = metrics ? [
    { name: 'Profit Margin', value: metrics.profitMargin || 0, color: '#10b981' },
    { name: 'Operating Margin', value: metrics.operatingMargin || 0, color: '#3b82f6' },
    { name: 'ROE', value: metrics.returnOnEquity || 0, color: '#8b5cf6' },
  ] : []

  return (
    <div className="space-y-4">
      {/* Stock Quote Card */}
      <Card className={`border-2 ${isPositive ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-3xl font-bold">{stockQuote.symbol}</h3>
                <Badge variant="outline" className="font-normal">
                  {stockQuote.currency}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {companyName || stockQuote.name}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Price</p>
              <p className="text-3xl font-bold">
                ${stockQuote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-1">Change</p>
              <div className="flex items-center gap-2">
                {isPositive ? (
                  <ArrowUpRight className="h-6 w-6 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-6 w-6 text-red-500" />
                )}
                <div>
                  <p className={`text-xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? '+' : '-'}${priceChange.toFixed(2)}
                  </p>
                  <p className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? '+' : '-'}{percentChange.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Day Range</p>
              <p className="text-lg font-semibold">
                ${stockQuote.low.toFixed(2)} - ${stockQuote.high.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Volume</p>
              <p className="text-lg font-semibold">
                {(stockQuote.volume / 1000000).toFixed(2)}M
              </p>
            </div>
          </div>

          {/* Period Growth */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {period.toUpperCase()} Growth:
              </span>
              <div className="flex items-center gap-1">
                {isGrowthPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`font-bold ${isGrowthPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {isGrowthPositive ? '+' : ''}{periodGrowth.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['1d', '1w', '1m', '3m', '6m', '1y'] as const).map((p) => (
          <Button
            key={p}
            size="sm"
            variant={period === p ? 'default' : 'outline'}
            onClick={() => setPeriod(p)}
            className="flex-shrink-0"
          >
            {p.toUpperCase()}
          </Button>
        ))}
      </div>

      {/* Price Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Stock Price History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isGrowthPositive ? '#10b981' : '#ef4444'} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isGrowthPositive ? '#10b981' : '#ef4444'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis 
                stroke="#9ca3af" 
                tick={{ fontSize: 12 }}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151', 
                  borderRadius: '8px' 
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke={isGrowthPositive ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                fill="url(#colorPrice)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Trading Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151', 
                  borderRadius: '8px' 
                }}
                formatter={(value: number) => [`${value.toFixed(2)}M`, 'Volume']}
              />
              <Bar dataKey="volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Financial Metrics */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Key Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'P/E Ratio', value: metrics.peRatio?.toFixed(2), unit: '' },
                  { label: 'EPS', value: metrics.eps?.toFixed(2), unit: '$' },
                  { label: 'Market Cap', value: (stockQuote.marketCap / 1000000000).toFixed(2), unit: 'B' },
                  { label: 'Beta', value: metrics.beta?.toFixed(2), unit: '' },
                  { label: 'Dividend Yield', value: metrics.dividendYield?.toFixed(2), unit: '%' },
                  { label: '52W High', value: metrics.fiftyTwoWeekHigh?.toFixed(2), unit: '$' },
                  { label: '52W Low', value: metrics.fiftyTwoWeekLow?.toFixed(2), unit: '$' },
                ].map((metric, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm text-muted-foreground">{metric.label}</span>
                    <span className="font-semibold">
                      {metric.unit === '$' ? '$' : ''}{metric.value}{metric.unit !== '$' ? metric.unit : ''}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financial Ratios</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={metricsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {metricsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151', 
                      borderRadius: '8px' 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-4 space-y-2">
                {[
                  { label: 'Debt/Equity', value: metrics.debtToEquity?.toFixed(2) },
                  { label: 'Current Ratio', value: metrics.currentRatio?.toFixed(2) },
                  { label: 'ROE', value: `${metrics.returnOnEquity?.toFixed(2)}%` },
                ].map((ratio, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{ratio.label}</span>
                    <span className="font-medium">{ratio.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Last Updated */}
      <p className="text-xs text-muted-foreground text-center">
        Last updated: {stockQuote.timestamp.toLocaleString()} • Data provided for demonstration
      </p>
    </div>
  )
}
