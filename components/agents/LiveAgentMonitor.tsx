'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Zap, Brain, Search, FileText, TrendingUp, Users, 
  DollarSign, Target, AlertTriangle, Lightbulb, 
  CheckCircle2, Loader2, Clock, Activity 
} from 'lucide-react'

interface AgentActivity {
  id: string
  name: string
  status: 'idle' | 'working' | 'completed' | 'error'
  currentTask?: string
  progress: number
  lastUpdate: Date
  tasksCompleted: number
  icon: any
  color: string
}

interface LiveAgentMonitorProps {
  workflowActive?: boolean
  currentPhase?: string
  activeAgents?: string[]
}

export function LiveAgentMonitor({ 
  workflowActive = false, 
  currentPhase = '',
  activeAgents = []
}: LiveAgentMonitorProps) {
  const [agents, setAgents] = useState<AgentActivity[]>([
    { 
      id: 'research', 
      name: 'Research Agent', 
      status: 'idle', 
      progress: 0, 
      lastUpdate: new Date(), 
      tasksCompleted: 0,
      icon: Search,
      color: 'bg-blue-500'
    },
    { 
      id: 'analysis', 
      name: 'Analysis Agent', 
      status: 'idle', 
      progress: 0, 
      lastUpdate: new Date(), 
      tasksCompleted: 0,
      icon: Brain,
      color: 'bg-purple-500'
    },
    { 
      id: 'financial', 
      name: 'Financial Agent', 
      status: 'idle', 
      progress: 0, 
      lastUpdate: new Date(), 
      tasksCompleted: 0,
      icon: DollarSign,
      color: 'bg-green-500'
    },
    { 
      id: 'competitive', 
      name: 'Competitive Agent', 
      status: 'idle', 
      progress: 0, 
      lastUpdate: new Date(), 
      tasksCompleted: 0,
      icon: TrendingUp,
      color: 'bg-orange-500'
    },
    { 
      id: 'contact', 
      name: 'Contact Agent', 
      status: 'idle', 
      progress: 0, 
      lastUpdate: new Date(), 
      tasksCompleted: 0,
      icon: Users,
      color: 'bg-pink-500'
    },
    { 
      id: 'strategy', 
      name: 'Strategy Agent', 
      status: 'idle', 
      progress: 0, 
      lastUpdate: new Date(), 
      tasksCompleted: 0,
      icon: Target,
      color: 'bg-indigo-500'
    },
    { 
      id: 'risk', 
      name: 'Risk Agent', 
      status: 'idle', 
      progress: 0, 
      lastUpdate: new Date(), 
      tasksCompleted: 0,
      icon: AlertTriangle,
      color: 'bg-red-500'
    },
    { 
      id: 'opportunity', 
      name: 'Opportunity Agent', 
      status: 'idle', 
      progress: 0, 
      lastUpdate: new Date(), 
      tasksCompleted: 0,
      icon: Lightbulb,
      color: 'bg-yellow-500'
    },
    { 
      id: 'writing', 
      name: 'Writing Agent', 
      status: 'idle', 
      progress: 0, 
      lastUpdate: new Date(), 
      tasksCompleted: 0,
      icon: FileText,
      color: 'bg-cyan-500'
    },
  ])

  useEffect(() => {
    if (workflowActive) {
      // Simulate agent activity updates
      const interval = setInterval(() => {
        setAgents(prev => prev.map(agent => {
          const isActive = activeAgents.some(a => 
            a.toLowerCase().includes(agent.id) || 
            agent.name.toLowerCase().includes(a.toLowerCase())
          )
          
          if (isActive) {
            return {
              ...agent,
              status: 'working' as const,
              progress: Math.min(agent.progress + Math.random() * 20, 100),
              currentTask: `Processing ${currentPhase || 'research'}`,
              lastUpdate: new Date()
            }
          } else if (agent.progress >= 100) {
            return {
              ...agent,
              status: 'completed' as const,
              tasksCompleted: agent.tasksCompleted + 1
            }
          }
          return agent
        }))
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [workflowActive, activeAgents, currentPhase])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'error':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working':
        return 'text-blue-500'
      case 'completed':
        return 'text-green-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const workingAgents = agents.filter(a => a.status === 'working').length
  const completedAgents = agents.filter(a => a.status === 'completed').length
  const totalTasks = agents.reduce((sum, a) => sum + a.tasksCompleted, 0)

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{agents.length}</div>
              <div className="text-xs text-slate-400 mt-1">Total Agents</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{workingAgents}</div>
              <div className="text-xs text-slate-400 mt-1">Active Now</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{completedAgents}</div>
              <div className="text-xs text-slate-400 mt-1">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">{totalTasks}</div>
              <div className="text-xs text-slate-400 mt-1">Total Tasks</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Phase */}
      {currentPhase && (
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-medium text-blue-500">Current Phase</div>
                <div className="text-lg font-bold capitalize">{currentPhase.replace(/-/g, ' ')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const Icon = agent.icon
          return (
            <Card 
              key={agent.id} 
              className={`transition-all duration-300 ${
                agent.status === 'working' 
                  ? 'border-blue-500 shadow-lg shadow-blue-500/20 scale-105' 
                  : agent.status === 'completed'
                  ? 'border-green-500/50'
                  : 'border-slate-700'
              }`}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg ${agent.color} flex items-center justify-center`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{agent.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {agent.tasksCompleted} tasks completed
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`${getStatusColor(agent.status)} border-current`}
                  >
                    <div className="flex items-center gap-1">
                      {getStatusIcon(agent.status)}
                      <span className="text-xs capitalize">{agent.status}</span>
                    </div>
                  </Badge>
                </div>

                {agent.currentTask && (
                  <div className="text-xs text-muted-foreground mb-2 truncate">
                    {agent.currentTask}
                  </div>
                )}

                {agent.status === 'working' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{Math.round(agent.progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${agent.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {agent.status === 'completed' && (
                  <div className="flex items-center gap-2 text-xs text-green-500">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Ready for next task</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
