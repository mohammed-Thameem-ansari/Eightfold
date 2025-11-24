'use client'

import { ResearchStep } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ResearchProgressProps {
  steps: ResearchStep[]
  currentAction?: string
}

export function ResearchProgress({ steps, currentAction }: ResearchProgressProps) {
  if (steps.length === 0 && !currentAction) {
    return null
  }

  const getStatusIcon = (status: ResearchStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'in-progress':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Research Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentAction && (
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            <span className="text-muted-foreground">{currentAction}</span>
          </div>
        )}
        
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-2 text-sm">
            {getStatusIcon(step.status)}
            <div className="flex-1">
              <p className={step.status === 'error' ? 'text-red-500' : ''}>
                {step.action}
              </p>
              {step.result && (
                <p className="text-xs text-muted-foreground mt-1">{step.result}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(step.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

