'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Analytics } from '@/types'
import { analytics } from '@/lib/analytics'
import { formatNumber, formatPercentage, formatRelativeTime } from '@/lib/utils'
import { BarChart3, TrendingUp, FileText, Search, Clock, CheckCircle } from 'lucide-react'

export function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics | null>(null)

  useEffect(() => {
    const loadAnalytics = () => {
      const analyticsData = analytics.getAnalytics()
      setData(analyticsData)
    }

    loadAnalytics()
    const interval = setInterval(loadAnalytics, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [])

  if (!data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.totalQueries)}</div>
            <p className="text-xs text-muted-foreground">
              Research queries executed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies Researched</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.totalCompanies)}</div>
            <p className="text-xs text-muted-foreground">
              Unique companies analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plans Generated</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.totalPlans)}</div>
            <p className="text-xs text-muted-foreground">
              Account plans created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(data.successRate * 100)}</div>
            <p className="text-xs text-muted-foreground">
              Successful operations
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topCompanies.length > 0 ? (
                data.topCompanies.map((company, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{company.name}</span>
                    <span className="text-sm font-medium">{company.count} queries</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topSearches.length > 0 ? (
                data.topSearches.map((search, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm truncate">{search.query}</span>
                    <span className="text-sm font-medium">{search.count} times</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Average Research Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {data.averageResearchTime > 0
              ? `${(data.averageResearchTime / 1000).toFixed(1)}s`
              : 'N/A'}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Average time per research query
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

