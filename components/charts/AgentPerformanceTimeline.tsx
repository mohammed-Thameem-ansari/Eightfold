'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Clock, TrendingUp } from 'lucide-react'

interface TimelineStep {
  timestamp: number
  agent: string
  label: string
  status: 'active' | 'completed' | 'error'
}

interface AgentPerformanceTimelineProps {
  steps?: TimelineStep[]
}

export function AgentPerformanceTimeline({ steps = [] }: AgentPerformanceTimelineProps) {
  // Generate placeholder data if no steps provided
  const generatePlaceholderData = () => {
    const agents = ['Research', 'Strategy', 'Analysis', 'Synthesis', 'Quality', 'Editor']
    const data = []
    let cumulativeTime = 0
    
    for (let i = 0; i < agents.length; i++) {
      const duration = Math.random() * 3 + 1
      cumulativeTime += duration
      data.push({
        agent: agents[i],
        startTime: cumulativeTime - duration,
        duration: duration,
        endTime: cumulativeTime,
        status: 'completed'
      })
    }
    return data
  }

  // Process actual steps if available
  const processSteps = () => {
    if (!steps || steps.length === 0) return generatePlaceholderData()
    
    const agentMap = new Map<string, { start: number; end: number; status: string }>()
    const baseTime = steps[0]?.timestamp || Date.now()
    
    steps.forEach(step => {
      const elapsed = (step.timestamp - baseTime) / 1000 // Convert to seconds
      const agent = step.agent || 'Unknown'
      
      if (!agentMap.has(agent)) {
        agentMap.set(agent, { start: elapsed, end: elapsed, status: step.status })
      } else {
        const existing = agentMap.get(agent)!
        existing.end = elapsed
        if (step.status === 'completed') existing.status = 'completed'
      }
    })
    
    return Array.from(agentMap.entries()).map(([agent, data]) => ({
      agent,
      startTime: data.start,
      endTime: data.end,
      duration: data.end - data.start,
      status: data.status
    }))
  }

  const timelineData = processSteps()
  const maxTime = Math.max(...timelineData.map(d => d.endTime))

  // Transform data for stacked timeline view
  const chartData = timelineData.map(d => ({
    agent: d.agent,
    duration: parseFloat(d.duration.toFixed(2)),
    status: d.status
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          Agent Performance Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bar visualization */}
        <div className="space-y-3">
          {timelineData.map((item, idx) => {
            const widthPercent = (item.duration / maxTime) * 100
            const leftPercent = (item.startTime / maxTime) * 100
            
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.agent}</span>
                  <span className="text-muted-foreground">{item.duration.toFixed(2)}s</span>
                </div>
                <div className="relative h-8 bg-muted/30 rounded-lg overflow-hidden">
                  <div
                    className={`absolute h-full rounded-lg transition-all duration-300 ${
                      item.status === 'completed' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                        : item.status === 'active'
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 animate-pulse'
                        : 'bg-gradient-to-r from-red-500 to-red-600'
                    }`}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Chart visualization */}
        <div className="h-64 mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                dataKey="agent" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Duration (s)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: 'none', 
                  borderRadius: '8px',
                  padding: '8px 12px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="duration" 
                stroke="rgb(59, 130, 246)" 
                strokeWidth={3}
                dot={{ fill: 'rgb(59, 130, 246)', r: 5 }}
                activeDot={{ r: 7 }}
                animationDuration={800}
                animationEasing="ease-in-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{timelineData.length}</div>
            <div className="text-xs text-muted-foreground">Agents Used</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{maxTime.toFixed(2)}s</div>
            <div className="text-xs text-muted-foreground">Total Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-500">
              {(maxTime / timelineData.length).toFixed(2)}s
            </div>
            <div className="text-xs text-muted-foreground">Avg Per Agent</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
