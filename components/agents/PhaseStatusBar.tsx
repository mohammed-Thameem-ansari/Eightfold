"use client"
import { WorkflowUpdate } from '@/lib/agents/orchestrator'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface PhaseStatusBarProps {
  workflowUpdates: WorkflowUpdate[]
}

export function PhaseStatusBar({ workflowUpdates }: PhaseStatusBarProps) {
  if (workflowUpdates.length === 0) return null

  const phaseOrder = ['initial-research', 'deep-analysis', 'synthesis', 'quality-assurance']
  const phaseStatus: Record<string, 'pending'|'running'|'completed'|'error'> = {}

  for (const phase of phaseOrder) phaseStatus[phase] = 'pending'
  for (const update of workflowUpdates) {
    if (update.phase) {
      if (update.type === 'phase-start') phaseStatus[update.phase] = 'running'
      if (update.type === 'phase-complete') phaseStatus[update.phase] = 'completed'
    }
    if (update.type === 'workflow-error' && update.phase) {
      phaseStatus[update.phase] = 'error'
    }
  }

  return (
    <div className="flex flex-wrap gap-2 text-xs mb-4">
      {phaseOrder.map(phase => {
        const status = phaseStatus[phase]
        return (
          <div key={phase} className="flex items-center gap-1 px-2 py-1 rounded border bg-muted/40">
            {status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-blue-600" />}
            {status === 'completed' && <CheckCircle2 className="h-3 w-3 text-green-600" />}
            {status === 'error' && <AlertCircle className="h-3 w-3 text-red-600" />}
            {status === 'pending' && <Loader2 className="h-3 w-3 opacity-0" />}
            <span className="capitalize">{phase.replace(/-/g,' ')}</span>
            <span className={"ml-1 rounded px-1 " + (
              status==='completed' ? 'bg-green-100 text-green-700' :
              status==='running' ? 'bg-blue-100 text-blue-700' :
              status==='error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
            )}>{status}</span>
          </div>
        )
      })}
    </div>
  )
}
