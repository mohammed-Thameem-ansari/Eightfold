'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AgentOrchestrator, AgentStats, WorkflowUpdate } from '@/lib/agents/orchestrator'
import { formatRelativeTime } from '@/lib/utils'
import { Activity, CheckCircle, XCircle, Clock, TrendingUp, Zap, Brain, BarChart3, Loader2 } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface AgentDashboardProps {
  orchestrator: AgentOrchestrator
}

export function AgentDashboard({ orchestrator }: AgentDashboardProps) {
  const [agentStats, setAgentStats] = useState<Record<string, AgentStats>>({})
  const [activeWorkflows, setActiveWorkflows] = useState<WorkflowUpdate[]>([])

  useEffect(() => {
    const updateStats = () => {
      const stats = orchestrator.getAgentStats()
      setAgentStats(stats)
    }

    updateStats()
    const interval = setInterval(updateStats, 2000)

    return () => clearInterval(interval)
  }, [orchestrator])

  const agents = orchestrator.getAllAgents()
  const totalTasks = Object.values(agentStats).reduce((sum, stats) => sum + stats.tasksCompleted + stats.tasksFailed, 0)
  const totalSuccess = Object.values(agentStats).reduce((sum, stats) => sum + stats.tasksCompleted, 0)
  const overallSuccessRate = totalTasks > 0 ? (totalSuccess / totalTasks) * 100 : 100

  const performanceData = Object.entries(agentStats).map(([name, stats]) => ({
    name: name.replace('Agent', '').substring(0, 10),
    success: stats.tasksCompleted,
    failed: stats.tasksFailed,
    successRate: stats.successRate * 100,
    avgTime: stats.averageExecutionTime / 1000
  }))

  const categoryData = [
    { name: 'Research', value: 5, color: '#3b82f6' },
    { name: 'Analysis', value: 4, color: '#10b981' },
    { name: 'Strategy', value: 3, color: '#f59e0b' },
    { name: 'Writing', value: 3, color: '#8b5cf6' }
  ]

  return (
    <div className="space-y-6">
      {/* Real-time Status Bar */}
      <Card className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Multi-Agent System</h2>
                <p className="text-sm text-muted-foreground">15 specialized AI agents working in harmony</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">All Systems Operational</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
            <p className="text-xs text-muted-foreground">Active specialized agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSuccess}</div>
            <p className="text-xs text-muted-foreground">Successful executions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallSuccessRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Overall performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Execution</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(agentStats).length > 0
                ? `${(Object.values(agentStats).reduce((sum, s) => sum + s.averageExecutionTime, 0) / Object.values(agentStats).length / 1000).toFixed(1)}s`
                : '0s'}
            </div>
            <p className="text-xs text-muted-foreground">Average task time</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Graphs */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Agent Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="success" fill="#10b981" name="Success" radius={[8, 8, 0, 0]} />
                <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Execution Time (seconds)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="avgTime" stroke="#3b82f6" strokeWidth={3} name="Avg Time" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agents.map((agent) => {
              const stats = agentStats[agent.getName()] || {
                tasksCompleted: 0,
                tasksFailed: 0,
                averageExecutionTime: 0,
                successRate: 1.0,
              }

              return (
                <div key={agent.getName()} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{agent.getName()}</h3>
                      <span className="text-xs text-muted-foreground">
                        {stats.successRate * 100 > 90 ? (
                          <span className="text-green-600">✓ Excellent</span>
                        ) : stats.successRate * 100 > 70 ? (
                          <span className="text-yellow-600">○ Good</span>
                        ) : (
                          <span className="text-red-600">⚠ Needs Attention</span>
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{agent.getDescription()}</p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Completed: {stats.tasksCompleted}</span>
                      <span>Failed: {stats.tasksFailed}</span>
                      <span>Avg: {(stats.averageExecutionTime / 1000).toFixed(1)}s</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{(stats.successRate * 100).toFixed(0)}%</div>
                    <div className="text-xs text-muted-foreground">Success Rate</div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent Capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <div key={agent.getName()} className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">{agent.getName()}</h4>
                <div className="flex flex-wrap gap-1 mt-2">
                  {agent.getCapabilities().map((capability, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 bg-muted rounded"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

