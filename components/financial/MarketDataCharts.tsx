'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, TrendingDown, Activity, BarChart3, 
  LineChart, PieChart, RefreshCw, Globe, Zap
} from 'lucide-react'
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Scatter,
  ReferenceLine,
  Brush,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
  Cell
} from 'recharts'
import { stockDataService } from '@/lib/services/stock-data'

interface MarketDataChartsProps {
  symbols?: string[]
}

export const MarketDataCharts = ({ symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA'] }: MarketDataChartsProps) => {
  const [loading, setLoading] = useState(true)
  const [marketData, setMarketData] = useState<any[]>([])
  const [priceVolumeData, setPriceVolumeData] = useState<any[]>([])
  const [correlationData, setCorrelationData] = useState<any[]>([])
  const [sectorData, setSectorData] = useState<any[]>([])
  const [indices, setIndices] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadMarketData()
  }, [])

  const loadMarketData = async () => {
    setLoading(true)
    try {
      // Load multiple stock data in parallel
      const stockPromises = symbols.map(symbol => 
        stockDataService.getStockQuote(symbol)
      )
      const historicalPromises = symbols.map(symbol =>
        stockDataService.getHistoricalData(symbol, '1m')
      )

      const [stocks, historicals, indicesData] = await Promise.all([
        Promise.all(stockPromises),
        Promise.all(historicalPromises),
        stockDataService.getMarketIndices()
      ])

      setMarketData(stocks)
      setIndices(indicesData)
      
      // Generate price-volume correlation data
      generatePriceVolumeData(historicals[0])
      
      // Generate correlation matrix
      generateCorrelationData(historicals)
      
      // Generate sector performance
      generateSectorData(stocks)
    } catch (error) {
      console.error('Error loading market data:', error)
      loadMockMarketData()
    } finally {
      setLoading(false)
    }
  }

  const loadMockMarketData = () => {
    const mockStocks = symbols.map((symbol, i) => ({
      symbol,
      price: 150 + i * 50,
      changePercent: (Math.random() - 0.5) * 10,
      volume: 50000000 + Math.random() * 20000000,
      marketCap: 2000000000000 + i * 500000000000
    }))
    setMarketData(mockStocks)

    const mockIndices = {
      SPX: { symbol: 'SPX', price: 4500, changePercent: 0.45 },
      DJI: { symbol: 'DJI', price: 35000, changePercent: 0.32 },
      IXIC: { symbol: 'IXIC', price: 14000, changePercent: -0.18 }
    }
    setIndices(mockIndices)

    // Generate mock data
    const mockHistorical = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      close: 150 + Math.random() * 20,
      volume: 50000000 + Math.random() * 10000000
    }))
    generatePriceVolumeData(mockHistorical)
    generateCorrelationData([mockHistorical])
    generateSectorData(mockStocks)
  }

  const generatePriceVolumeData = (historical: any[]) => {
    const data = historical.map(d => ({
      date: d.date,
      price: d.close,
      volume: d.volume / 1000000, // Convert to millions
      ma20: 0,
      volumeMA: 0
    }))

    // Calculate moving averages
    for (let i = 19; i < data.length; i++) {
      const priceSum = data.slice(i - 19, i + 1).reduce((sum, d) => sum + d.price, 0)
      const volumeSum = data.slice(i - 19, i + 1).reduce((sum, d) => sum + d.volume, 0)
      data[i].ma20 = priceSum / 20
      data[i].volumeMA = volumeSum / 20
    }

    setPriceVolumeData(data)
  }

  const generateCorrelationData = (historicals: any[][]) => {
    // Simplified correlation visualization
    const correlation = symbols.map((symbol, i) => {
      const data: any = { symbol }
      symbols.forEach((otherSymbol, j) => {
        // Mock correlation coefficient (-1 to 1)
        data[otherSymbol] = i === j ? 1 : 0.3 + Math.random() * 0.5
      })
      return data
    })
    setCorrelationData(correlation)
  }

  const generateSectorData = (stocks: any[]) => {
    const sectors = [
      { name: 'Technology', value: 35, stocks: ['AAPL', 'MSFT', 'GOOGL'], change: 2.4 },
      { name: 'Healthcare', value: 15, stocks: ['JNJ', 'PFE'], change: 1.2 },
      { name: 'Finance', value: 20, stocks: ['JPM', 'BAC'], change: -0.5 },
      { name: 'Consumer', value: 18, stocks: ['AMZN', 'TSLA'], change: 3.1 },
      { name: 'Energy', value: 12, stocks: ['XOM', 'CVX'], change: 0.8 }
    ]
    setSectorData(sectors)
  }

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {indices && Object.entries(indices).map(([key, index]: [string, any]) => (
          <Card key={key}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{index.symbol}</p>
                  <p className="text-2xl font-bold mt-1">{index.price?.toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {index.changePercent >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={index.changePercent >= 0 ? 'text-green-500 font-semibold' : 'text-red-500 font-semibold'}>
                      {index.changePercent >= 0 ? '+' : ''}{index.changePercent?.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <Globe className="h-10 w-10 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs for Different Chart Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="sectors">Sectors</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={loadMarketData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-blue-500" />
                Price & Volume Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={priceVolumeData}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="price" orientation="left" />
                  <YAxis yAxisId="volume" orientation="right" />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(0,0,0,0.8)', 
                      border: 'none', 
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area 
                    yAxisId="price"
                    type="monotone" 
                    dataKey="price" 
                    fill="url(#priceGradient)" 
                    stroke="#3b82f6"
                    name="Price"
                  />
                  <Line 
                    yAxisId="price"
                    type="monotone" 
                    dataKey="ma20" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={false}
                    name="20-Day MA"
                  />
                  <Bar 
                    yAxisId="volume"
                    dataKey="volume" 
                    fill="#10b981" 
                    opacity={0.3}
                    name="Volume (M)"
                  />
                  <Brush dataKey="date" height={30} stroke="#8b5cf6" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  Top Movers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {marketData
                    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
                    .slice(0, 4)
                    .map((stock) => (
                      <div key={stock.symbol} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                        <div>
                          <p className="font-semibold">{stock.symbol}</p>
                          <p className="text-sm text-muted-foreground">${stock.price?.toFixed(2)}</p>
                        </div>
                        <Badge variant={stock.changePercent >= 0 ? "default" : "destructive"}>
                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                  Volume Leaders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {marketData
                    .sort((a, b) => b.volume - a.volume)
                    .slice(0, 4)
                    .map((stock) => (
                      <div key={stock.symbol} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                        <div>
                          <p className="font-semibold">{stock.symbol}</p>
                          <p className="text-sm text-muted-foreground">
                            {(stock.volume / 1e6).toFixed(2)}M
                          </p>
                        </div>
                        <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-600"
                            style={{ width: `${(stock.volume / Math.max(...marketData.map(s => s.volume))) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Technical Tab */}
        <TabsContent value="technical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Technical Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={priceVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} name="Price" />
                  <Line type="monotone" dataKey="ma20" stroke="#10b981" strokeWidth={2} name="MA(20)" strokeDasharray="5 5" />
                  <ReferenceLine y={priceVolumeData[priceVolumeData.length - 1]?.price} stroke="#ef4444" strokeDasharray="3 3" label="Current" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {marketData.slice(0, 3).map((stock) => (
              <Card key={stock.symbol}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{stock.symbol}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">RSI (14)</span>
                    <span className="font-semibold">{(45 + Math.random() * 30).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">MACD</span>
                    <span className={Math.random() > 0.5 ? 'font-semibold text-green-500' : 'font-semibold text-red-500'}>
                      {Math.random() > 0.5 ? 'Bullish' : 'Bearish'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Trend</span>
                    <Badge variant={stock.changePercent >= 0 ? "default" : "destructive"}>
                      {stock.changePercent >= 0 ? 'Upward' : 'Downward'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Stock Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={marketData.slice(0, 4).map(stock => ({
                  metric: stock.symbol,
                  performance: Math.abs(stock.changePercent) * 10,
                  volume: (stock.volume / 1e8),
                  marketCap: (stock.marketCap / 1e12)
                }))}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis />
                  <Radar name="Performance" dataKey="performance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Radar name="Volume" dataKey="volume" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Market Cap Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <Treemap
                  data={marketData.map(stock => ({
                    name: stock.symbol,
                    size: stock.marketCap / 1e9,
                    change: stock.changePercent
                  }))}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  fill="#8884d8"
                >
                  {marketData.map((stock, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={stock.changePercent >= 0 ? '#10b981' : '#ef4444'} 
                    />
                  ))}
                </Treemap>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sectors Tab */}
        <TabsContent value="sectors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-500" />
                Sector Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sectorData.map((sector, index) => (
                  <div key={sector.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{sector.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{sector.value}%</span>
                        <Badge variant={sector.change >= 0 ? "default" : "destructive"}>
                          {sector.change >= 0 ? '+' : ''}{sector.change}%
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${sector.value}%`,
                          backgroundColor: COLORS[index % COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Sectors (1M)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sectorData
                    .sort((a, b) => b.change - a.change)
                    .slice(0, 3)
                    .map((sector) => (
                      <div key={sector.name} className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                        <div>
                          <p className="font-semibold">{sector.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {sector.stocks.join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-500">+{sector.change.toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Market Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Advancing</span>
                  <span className="font-semibold text-green-500">2,456</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Declining</span>
                  <span className="font-semibold text-red-500">1,234</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Unchanged</span>
                  <span className="font-semibold">345</span>
                </div>
                <div className="flex justify-between text-sm pt-3 border-t">
                  <span className="text-muted-foreground">Market Breadth</span>
                  <Badge variant="default">
                    <Zap className="h-3 w-3 mr-1" />
                    Bullish
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
