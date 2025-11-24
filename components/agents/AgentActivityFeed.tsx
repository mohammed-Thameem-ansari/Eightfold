'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkflowUpdate } from '@/lib/agents/orchestrator'
import { formatRelativeTime } from '@/lib/utils'
import { MessageSquare, CheckCircle, XCircle, Play, Loader2 } from 'lucide-react'

interface AgentActivityFeedProps {
  workflowUpdates: WorkflowUpdate[]
}

export function AgentActivityFeed({ workflowUpdates }: AgentActivityFeedProps) {
  const recentUpdates = workflowUpdates.slice(-20).reverse()

  const getUpdateIcon = (update: WorkflowUpdate) => {
    switch (update.type) {
      case 'workflow-start':
        return <Play className="h-4 w-4 text-blue-600" />
      case 'workflow-complete':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'workflow-error':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'phase-start':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case 'phase-complete':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />
    }
  }

  const getUpdateColor = (update: WorkflowUpdate) => {
    switch (update.type) {
      case 'workflow-complete':
      case 'phase-complete':
        return 'border-green-200 bg-green-50'
      case 'workflow-error':
        return 'border-red-200 bg-red-50'
      case 'phase-start':
      case 'workflow-start':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-white'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {recentUpdates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activity yet. Start a research query to see agent activity.
            </p>
          ) : (
            recentUpdates.map((update, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border ${getUpdateColor(update)}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getUpdateIcon(update)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium capitalize">
                      {update.type.replace(/-/g, ' ')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(new Date())}
                    </span>
                  </div>
                  {update.message && (
                    <p className="text-sm text-muted-foreground">{update.message}</p>
                  )}
                  {update.phase && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Phase: {update.phase.replace(/-/g, ' ')}
                    </p>
                  )}
                  {update.results && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {Object.keys(update.results).length} agents completed
                    </p>
                  )}
                  {update.error && (
                    <p className="text-xs text-red-600 mt-1">{update.error}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

