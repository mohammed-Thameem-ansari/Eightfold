'use client'

import { CheckCircle2, Circle, Loader2, Zap, Search, FileText, Brain, TrendingUp, Shield, Target, Users, BarChart3, Activity } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface WorkflowStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'completed' | 'error'
  timestamp?: Date
  agent?: string
  duration?: number
}

interface AgentWorkflowPanelProps {
  steps: WorkflowStep[]
}

const agentIcons: Record<string, any> = {
  'Search': Search,
  'Analysis': Brain,
  'Financial': TrendingUp,
  'Market': BarChart3,
  'Competitive': Shield,
  'Strategy': Target,
  'Synthesis': Zap,
  'Writing': FileText,
  'Quality': CheckCircle2,
  'Product': Activity,
  'Contact': Users,
  'default': Circle
}

const getAgentIcon = (agent?: string) => {
  if (!agent) return agentIcons.default
  const key = Object.keys(agentIcons).find(k => agent.includes(k))
  return key ? agentIcons[key] : agentIcons.default
}

export function AgentWorkflowPanel({ steps }: AgentWorkflowPanelProps) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/30 bg-gradient-to-r from-foreground/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-foreground to-foreground/80 flex items-center justify-center shadow-lg">
            <Zap className="h-5 w-5 text-background animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Agent Workflow</h2>
            <p className="text-xs text-muted-foreground font-medium">Live orchestration timeline</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1 px-6 py-4 scrollbar-thin">
        <div className="space-y-3">
          {steps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Circle className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Waiting for agent activation...</p>
            </div>
          ) : (
            steps.map((step, index) => {
              const Icon = getAgentIcon(step.agent)
              const isLast = index === steps.length - 1

              return (
                <div key={step.id} className="relative group">
                  {/* Connector Line */}
                  {!isLast && (
                    <div className="absolute left-[19px] top-10 w-0.5 h-full bg-border/30 group-hover:bg-foreground/20 transition-colors" />
                  )}

                  {/* Step Card */}
                  <div className={`relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 ${
                    step.status === 'completed' 
                      ? 'bg-foreground/5 border-foreground/20 hover:bg-foreground/10' 
                      : step.status === 'active'
                      ? 'bg-foreground/10 border-foreground/30 shadow-lg shadow-foreground/10 animate-pulse-glow'
                      : step.status === 'error'
                      ? 'bg-destructive/10 border-destructive/30'
                      : 'bg-muted/20 border-border/20'
                  }`}>
                    {/* Status Icon */}
                    <div className="relative mt-0.5">
                      {step.status === 'completed' && (
                        <CheckCircle2 className="h-10 w-10 text-foreground fill-foreground/10" />
                      )}
                      {step.status === 'active' && (
                        <Loader2 className="h-10 w-10 text-foreground animate-spin" />
                      )}
                      {step.status === 'pending' && (
                        <Circle className="h-10 w-10 text-muted-foreground/40" />
                      )}
                      {step.status === 'error' && (
                        <Circle className="h-10 w-10 text-destructive" />
                      )}
                      
                      {/* Agent Icon Badge */}
                      {step.agent && (
                        <div 
                          className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background border border-border/30 flex items-center justify-center"
                          title={step.agent}
                          aria-label={`Agent: ${step.agent}`}
                        >
                          <Icon className="h-3 w-3 text-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm leading-tight">{step.label}</p>
                        {step.duration && (
                          <span className="text-xs text-muted-foreground font-mono bg-muted/30 px-2 py-0.5 rounded-md">
                            {step.duration}ms
                          </span>
                        )}
                      </div>
                      
                      {step.agent && (
                        <p className="text-xs text-muted-foreground font-medium">{step.agent}</p>
                      )}
                      
                      {step.timestamp && (
                        <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                          {new Date(step.timestamp).toLocaleTimeString('en-US', { 
                            hour12: false, 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            second: '2-digit' 
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      {steps.length > 0 && (
        <div className="px-6 py-3 border-t border-border/30 bg-muted/20 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-foreground" />
                <span className="text-muted-foreground font-medium">
                  {steps.filter(s => s.status === 'completed').length} Complete
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
                <span className="text-muted-foreground font-medium">
                  {steps.filter(s => s.status === 'active').length} Active
                </span>
              </div>
            </div>
            <span className="text-muted-foreground font-mono">{steps.length} steps</span>
          </div>
        </div>
      )}
    </div>
  )
}
