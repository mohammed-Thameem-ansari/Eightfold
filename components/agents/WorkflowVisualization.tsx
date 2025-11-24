'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkflowUpdate } from '@/lib/agents/orchestrator'
import { formatRelativeTime } from '@/lib/utils'
import { Play, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'

interface WorkflowVisualizationProps {
  workflowUpdates: WorkflowUpdate[]
}

export function WorkflowVisualization({ workflowUpdates }: WorkflowVisualizationProps) {
  const [phases, setPhases] = useState<Map<string, WorkflowUpdate[]>>(new Map())

  useEffect(() => {
    const phaseMap = new Map<string, WorkflowUpdate[]>()
    
    for (const update of workflowUpdates) {
      if (update.phase) {
        if (!phaseMap.has(update.phase)) {
          phaseMap.set(update.phase, [])
        }
        phaseMap.get(update.phase)!.push(update)
      }
    }

    setPhases(phaseMap)
  }, [workflowUpdates])

  const getPhaseStatus = (phaseUpdates: WorkflowUpdate[]): 'pending' | 'running' | 'completed' | 'error' => {
    const lastUpdate = phaseUpdates[phaseUpdates.length - 1]
    if (lastUpdate?.type === 'phase-complete') return 'completed'
    if (lastUpdate?.type === 'workflow-error') return 'error'
    if (lastUpdate?.type === 'phase-start') return 'running'
    return 'pending'
  }

  const phaseOrder = ['initial-research', 'deep-analysis', 'synthesis', 'quality-assurance']

  return (
    <Card>
      <CardHeader>
        <CardTitle>Research Workflow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {phaseOrder.map((phaseName, index) => {
            const phaseUpdates = phases.get(phaseName) || []
            const status = getPhaseStatus(phaseUpdates)
            const lastUpdate = phaseUpdates[phaseUpdates.length - 1]

            return (
              <div key={phaseName} className="relative">
                {/* Connection Line */}
                {index > 0 && (
                  <div className="absolute left-6 top-0 w-0.5 h-4 bg-border -translate-y-full" />
                )}

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {status === 'completed' && (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    )}
                    {status === 'running' && (
                      <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                    )}
                    {status === 'error' && (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                    {status === 'pending' && (
                      <Clock className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Phase Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold capitalize">
                        {phaseName.replace(/-/g, ' ')}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        status === 'completed' ? 'bg-green-100 text-green-800' :
                        status === 'running' ? 'bg-blue-100 text-blue-800' :
                        status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {status}
                      </span>
                    </div>

                    {lastUpdate?.message && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {lastUpdate.message}
                      </p>
                    )}

                    {status === 'running' && (
                      <div className="mt-2">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 animate-pulse" style={{ width: '60%' }} />
                        </div>
                      </div>
                    )}

                    {status === 'completed' && lastUpdate?.results && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {Object.keys(lastUpdate.results).length} agents completed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

