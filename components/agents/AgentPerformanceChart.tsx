'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AgentStats } from '@/lib/agents/orchestrator'
import { BarChart3, TrendingUp, Clock, CheckCircle } from 'lucide-react'

interface AgentPerformanceChartProps {
  agentStats: Record<string, AgentStats>
}

export function AgentPerformanceChart({ agentStats }: AgentPerformanceChartProps) {
  const agents = Object.entries(agentStats).sort((a, b) => {
    const aTotal = a[1].tasksCompleted + a[1].tasksFailed
    const bTotal = b[1].tasksCompleted + b[1].tasksFailed
    return bTotal - aTotal
  })

  const maxTasks = Math.max(...agents.map(([_, stats]) => stats.tasksCompleted + stats.tasksFailed), 1)

  return (
    <Card id="agent-performance-chart" data-export-chart>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Agent Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {agents.map(([name, stats]) => {
            const totalTasks = stats.tasksCompleted + stats.tasksFailed
            const successRate = stats.successRate * 100
            const completionWidth = (stats.tasksCompleted / maxTasks) * 100
            const failureWidth = (stats.tasksFailed / maxTasks) * 100

            return (
              <div key={name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{name.replace(' Agent', '')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      successRate >= 90 ? 'bg-green-100 text-green-800' :
                      successRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {successRate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stats.tasksCompleted} / {totalTasks}
                  </div>
                </div>
                <div className="flex h-4 bg-muted rounded overflow-hidden">
                  <div
                    className="bg-green-600 transition-all"
                    style={{ width: `${completionWidth}%` }}
                    title={`Completed: ${stats.tasksCompleted}`}
                  />
                  <div
                    className="bg-red-600 transition-all"
                    style={{ width: `${failureWidth}%` }}
                    title={`Failed: ${stats.tasksFailed}`}
                  />
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Avg: {(stats.averageExecutionTime / 1000).toFixed(1)}s
                  </span>
                  {stats.lastExecutionTime && (
                    <span>
                      Last: {new Date(stats.lastExecutionTime).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {agents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No agent activity yet</p>
              <p className="text-sm">Start a research query to see performance metrics</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

