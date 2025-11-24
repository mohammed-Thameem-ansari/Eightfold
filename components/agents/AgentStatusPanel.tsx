'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkflowUpdate } from '@/lib/agents/orchestrator'
import { Activity, CheckCircle, Loader2, XCircle, Clock } from 'lucide-react'

interface AgentStatusPanelProps {
  workflowUpdates: WorkflowUpdate[]
}

export function AgentStatusPanel({ workflowUpdates }: AgentStatusPanelProps) {
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set())
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set())
  const [failedAgents, setFailedAgents] = useState<Set<string>>(new Set())

  useEffect(() => {
    const active = new Set<string>()
    const completed = new Set<string>()
    const failed = new Set<string>()

    for (const update of workflowUpdates) {
      if (update.type === 'phase-start' && update.phase) {
        // Extract agent names from phase
        const agents = getAgentsForPhase(update.phase)
        agents.forEach(agent => active.add(agent))
      }
      
      if (update.type === 'phase-complete' && update.results) {
        Object.keys(update.results).forEach(agent => {
          active.delete(agent)
          completed.add(agent)
        })
      }

      if (update.type === 'workflow-error') {
        active.forEach(agent => {
          active.delete(agent)
          failed.add(agent)
        })
      }
    }

    setActiveAgents(active)
    setCompletedAgents(completed)
    setFailedAgents(failed)
  }, [workflowUpdates])

  const getAgentsForPhase = (phase: string): string[] => {
    const phaseAgents: Record<string, string[]> = {
      'initial-research': ['Research Agent', 'News Agent', 'Product Agent', 'Market Agent', 'Contact Agent'],
      'deep-analysis': ['Financial Agent', 'Competitive Agent', 'Risk Agent', 'Opportunity Agent'],
      'synthesis': ['Synthesis Agent', 'Strategy Agent', 'Writing Agent'],
      'quality-assurance': ['Validation Agent', 'Quality Agent'],
    }
    return phaseAgents[phase] || []
  }

  const allAgents = [
    'Research Agent', 'Analysis Agent', 'Writing Agent', 'Validation Agent',
    'Competitive Agent', 'Financial Agent', 'Contact Agent', 'News Agent',
    'Market Agent', 'Product Agent', 'Risk Agent', 'Opportunity Agent',
    'Synthesis Agent', 'Quality Agent', 'Strategy Agent',
  ]

  const getAgentStatus = (agentName: string) => {
    if (activeAgents.has(agentName)) return 'active'
    if (completedAgents.has(agentName)) return 'completed'
    if (failedAgents.has(agentName)) return 'failed'
    return 'idle'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Agent Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {allAgents.map((agent) => {
            const status = getAgentStatus(agent)
            return (
              <div
                key={agent}
                className={`flex items-center gap-2 p-2 rounded border text-sm ${
                  status === 'active' ? 'bg-blue-50 border-blue-200' :
                  status === 'completed' ? 'bg-green-50 border-green-200' :
                  status === 'failed' ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                {getStatusIcon(status)}
                <span className="truncate">{agent.replace(' Agent', '')}</span>
              </div>
            )
          })}
        </div>
        
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <span>Active: {activeAgents.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Completed: {completedAgents.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span>Failed: {failedAgents.size}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

