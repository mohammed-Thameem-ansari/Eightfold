'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart, 
  Activity, BarChart3, LineChart, ArrowUpRight, ArrowDownRight,
  RefreshCw, AlertTriangle, CheckCircle2, Info
} from 'lucide-react'
import {
  LineChart as RechartsLine,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart
} from 'recharts'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: any
  color: string
  subtitle?: string
}

const MetricCard = ({ title, value, change, icon: Icon, color, subtitle }: MetricCardProps) => {
  const isPositive = change !== undefined && change >= 0
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              {change !== undefined && (
                <Badge 
                  variant={isPositive ? "default" : "destructive"}
                  className="text-xs"
                >
                  {isPositive ? <ArrowUpRight className="h-3 w-3 inline mr-1" /> : <ArrowDownRight className="h-3 w-3 inline mr-1" />}
                  {Math.abs(change).toFixed(2)}%
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface FinancialMetricsPanelProps {
  symbol: string
}

export const FinancialMetricsPanel = ({ symbol }: FinancialMetricsPanelProps) => {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<any>(null)
  const [historicalData, setHistoricalData] = useState<any[]>([])
  const [comparisonData, setComparisonData] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'1m' | '3m' | '6m' | '1y'>('3m')

  useEffect(() => {
    loadMetrics()
  }, [symbol, selectedPeriod])

  const loadMetrics = async () => {
    setLoading(true)
    try {
      const [quoteRes, historicalRes, metricsRes] = await Promise.all([
        fetch(`/api/stock?symbol=${symbol}&action=quote`),
        fetch(`/api/stock?symbol=${symbol}&action=historical&period=${selectedPeriod}`),
        fetch(`/api/stock?symbol=${symbol}&action=metrics`)
      ])

      const quote = await quoteRes.json()
      const historical = await historicalRes.json()
      const metricsData = await metricsRes.json()

      setMetrics({
        ...quote.data,
        ...metricsData.data
      })
      setHistoricalData(historical.data || [])
      generateComparisonData(metricsData.data)
    } catch (error) {
      console.error('Error loading metrics:', error)
      loadMockData()
    } finally {
      setLoading(false)
    }
  }

  const loadMockData = () => {
    const mockMetrics = {
      symbol,
      price: 150.25,
      changePercent: 2.45,
      volume: 50234567,
      marketCap: 2450000000000,
      peRatio: 28.5,
      eps: 5.42,
      beta: 1.15,
      dividendYield: 0.52,
      profitMargin: 25.8,
      operatingMargin: 30.2,
      roe: 42.5,
      roa: 18.3,
      debtToEquity: 1.75,
      currentRatio: 1.05,
      quickRatio: 0.85,
      priceToBook: 8.5,
      priceToSales: 6.2,
      fiftyTwoWeekHigh: 198.23,
      fiftyTwoWeekLow: 124.17
    }
    setMetrics(mockMetrics)
    
    // Generate mock historical data
    const mockHistorical = Array.from({ length: 90 }, (_, i) => ({
      date: new Date(Date.now() - (89 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      close: 140 + Math.random() * 20 + i * 0.1,
      volume: 45000000 + Math.random() * 10000000
    }))
    setHistoricalData(mockHistorical)
    generateComparisonData(mockMetrics)
  }

  const generateComparisonData = (metricsData: any) => {
    // Compare with industry averages
    const comparison = [
      {
        metric: 'P/E Ratio',
        company: metricsData?.peRatio || 28.5,
        industry: 25.2,
        market: 22.8
      },
      {
        metric: 'Profit Margin',
        company: metricsData?.profitMargin || 25.8,
        industry: 18.5,
        market: 15.2
      },
      {
        metric: 'ROE',
        company: metricsData?.roe || 42.5,
        industry: 28.3,
        market: 22.1
      },
      {
        metric: 'Debt/Equity',
        company: metricsData?.debtToEquity || 1.75,
        industry: 1.92,
        market: 2.15
      }
    ]
    setComparisonData(comparison)
  }

  // Calculate growth metrics
  const calculateGrowth = () => {
    if (historicalData.length < 2) return { price: 0, volume: 0 }
    
    const firstPrice = historicalData[0].close
    const lastPrice = historicalData[historicalData.length - 1].close
    const priceGrowth = ((lastPrice - firstPrice) / firstPrice) * 100

    const avgVolumeFirst = historicalData.slice(0, 10).reduce((sum, d) => sum + d.volume, 0) / 10
    const avgVolumeLast = historicalData.slice(-10).reduce((sum, d) => sum + d.volume, 0) / 10
    const volumeGrowth = ((avgVolumeLast - avgVolumeFirst) / avgVolumeFirst) * 100

    return { price: priceGrowth, volume: volumeGrowth }
  }

  const growth = calculateGrowth()

  // Financial health score (0-100)
  const calculateHealthScore = () => {
    if (!metrics) return 0
    
    let score = 50 // Base score
    
    // Profitability (30 points)
    if (metrics.profitMargin > 20) score += 15
    else if (metrics.profitMargin > 10) score += 10
    else if (metrics.profitMargin > 0) score += 5
    
    if (metrics.roe > 15) score += 15
    else if (metrics.roe > 10) score += 10
    else if (metrics.roe > 5) score += 5
    
    // Valuation (20 points)
    if (metrics.peRatio < 20) score += 10
    else if (metrics.peRatio > 30) score -= 5
    
    if (metrics.priceToBook < 3) score += 10
    else if (metrics.priceToBook > 10) score -= 5
    
    return Math.max(0, Math.min(100, score))
  }

  const healthScore = calculateHealthScore()

  // Valuation analysis
  const getValuationStatus = () => {
    if (!metrics) return 'neutral'
    
    const peScore = metrics.peRatio < 20 ? 1 : metrics.peRatio > 30 ? -1 : 0
    const pbScore = metrics.priceToBook < 3 ? 1 : metrics.priceToBook > 10 ? -1 : 0
    const psScore = metrics.priceToSales < 5 ? 1 : metrics.priceToSales > 10 ? -1 : 0
    
    const totalScore = peScore + pbScore + psScore
    
    if (totalScore >= 2) return 'undervalued'
    if (totalScore <= -2) return 'overvalued'
    return 'fair'
  }

  const valuationStatus = getValuationStatus()

  const periods = [
    { value: '1m', label: '1M' },
    { value: '3m', label: '3M' },
    { value: '6m', label: '6M' },
    { value: '1y', label: '1Y' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Financial Metrics</h2>
          <p className="text-muted-foreground">{symbol} • Comprehensive Analysis</p>
        </div>
        <div className="flex gap-2">
          {periods.map((period) => (
            <Button
              key={period.value}
              variant={selectedPeriod === period.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(period.value as any)}
            >
              {period.label}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={loadMetrics}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Current Price"
          value={`$${metrics?.price?.toFixed(2) || '0.00'}`}
          change={metrics?.changePercent}
          icon={DollarSign}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          subtitle={`Volume: ${(metrics?.volume / 1e6).toFixed(2)}M`}
        />
        <MetricCard
          title="Market Cap"
          value={`$${(metrics?.marketCap / 1e9).toFixed(2)}B`}
          icon={TrendingUp}
          color="bg-gradient-to-br from-green-500 to-green-600"
          subtitle="Total market value"
        />
        <MetricCard
          title="P/E Ratio"
          value={metrics?.peRatio?.toFixed(2) || 'N/A'}
          icon={PieChart}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          subtitle="Price to earnings"
        />
        <MetricCard
          title="EPS"
          value={`$${metrics?.eps?.toFixed(2) || '0.00'}`}
          icon={Activity}
          color="bg-gradient-to-br from-orange-500 to-orange-600"
          subtitle="Earnings per share"
        />
      </div>

      {/* Growth Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-blue-500" />
              Growth Analysis ({selectedPeriod.toUpperCase()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <div>
                  <p className="text-sm font-medium">Price Growth</p>
                  <p className="text-2xl font-bold mt-1">
                    {growth.price >= 0 ? '+' : ''}{growth.price.toFixed(2)}%
                  </p>
                </div>
                {growth.price >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                )}
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                <div>
                  <p className="text-sm font-medium">Volume Trend</p>
                  <p className="text-2xl font-bold mt-1">
                    {growth.volume >= 0 ? '+' : ''}{growth.volume.toFixed(2)}%
                  </p>
                </div>
                <Activity className="h-8 w-8 text-purple-500" />
              </div>

              <div className="pt-4 border-t">
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={historicalData.slice(-30)}>
                    <defs>
                      <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(0,0,0,0.8)', 
                        border: 'none', 
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: any) => [`$${value.toFixed(2)}`, 'Price']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="close" 
                      stroke="#3b82f6" 
                      fill="url(#growthGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              Financial Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                  <div>
                    <p className="text-4xl font-bold">{healthScore}</p>
                    <p className="text-xs">/ 100</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Badge 
                    variant={healthScore >= 70 ? "default" : healthScore >= 50 ? "secondary" : "destructive"}
                    className="text-sm px-4 py-1"
                  >
                    {healthScore >= 70 ? (
                      <><CheckCircle2 className="h-4 w-4 inline mr-1" /> Strong</>
                    ) : healthScore >= 50 ? (
                      <><Info className="h-4 w-4 inline mr-1" /> Moderate</>
                    ) : (
                      <><AlertTriangle className="h-4 w-4 inline mr-1" /> Weak</>
                    )}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Profitability</span>
                    <span className="font-semibold">{metrics?.profitMargin?.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-600"
                      style={{ width: `${Math.min(100, (metrics?.profitMargin / 40) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Return on Equity</span>
                    <span className="font-semibold">{metrics?.roe?.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-600"
                      style={{ width: `${Math.min(100, (metrics?.roe / 50) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Debt to Equity</span>
                    <span className="font-semibold">{metrics?.debtToEquity?.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-red-600"
                      style={{ width: `${Math.min(100, (metrics?.debtToEquity / 3) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Valuation Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-500" />
              Valuation Analysis
            </span>
            <Badge 
              variant={
                valuationStatus === 'undervalued' ? 'default' : 
                valuationStatus === 'overvalued' ? 'destructive' : 
                'secondary'
              }
            >
              {valuationStatus === 'undervalued' && 'Undervalued'}
              {valuationStatus === 'overvalued' && 'Overvalued'}
              {valuationStatus === 'fair' && 'Fair Value'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="metric" />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(0,0,0,0.8)', 
                  border: 'none', 
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="company" fill="#3b82f6" name={symbol} radius={[8, 8, 0, 0]} />
              <Bar dataKey="industry" fill="#8b5cf6" name="Industry Avg" radius={[8, 8, 0, 0]} />
              <Bar dataKey="market" fill="#10b981" name="Market Avg" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Advanced Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Valuation Ratios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">P/E Ratio</span>
              <span className="font-semibold">{metrics?.peRatio?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price/Book</span>
              <span className="font-semibold">{metrics?.priceToBook?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price/Sales</span>
              <span className="font-semibold">{metrics?.priceToSales?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dividend Yield</span>
              <span className="font-semibold">{metrics?.dividendYield?.toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Profitability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profit Margin</span>
              <span className="font-semibold text-green-500">{metrics?.profitMargin?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Operating Margin</span>
              <span className="font-semibold text-green-500">{metrics?.operatingMargin?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ROE</span>
              <span className="font-semibold text-green-500">{metrics?.roe?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ROA</span>
              <span className="font-semibold text-green-500">{metrics?.roa?.toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Financial Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Beta</span>
              <span className="font-semibold">{metrics?.beta?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Debt/Equity</span>
              <span className="font-semibold">{metrics?.debtToEquity?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Ratio</span>
              <span className="font-semibold">{metrics?.currentRatio?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quick Ratio</span>
              <span className="font-semibold">{metrics?.quickRatio?.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
