'use client'

import { useState, useEffect } from 'react'
import { useWebSocket, useWebSocketEvent } from '@/hooks/use-websocket'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface ResearchProgress {
  sessionId: string
  step: string
  progress: number
  message: string
  data?: any
}

interface AgentStatus {
  agentId: string
  status: 'idle' | 'working' | 'complete' | 'error'
  currentTask?: string
  progress?: number
}

export function RealtimeMonitor({ sessionId }: { sessionId: string }) {
  const [progress, setProgress] = useState<ResearchProgress | null>(null)
  const [agents, setAgents] = useState<Map<string, AgentStatus>>(new Map())
  const [userCount, setUserCount] = useState(0)

  const { socket, isConnected, joinSession } = useWebSocket({
    sessionId,
    autoConnect: true,
  })

  useEffect(() => {
    if (isConnected && sessionId) {
      joinSession(sessionId)
    }
  }, [isConnected, sessionId, joinSession])

  // Listen to research progress
  useWebSocketEvent<ResearchProgress>(socket, 'research_progress', (data) => {
    setProgress(data)
  })

  // Listen to agent status
  useWebSocketEvent<AgentStatus>(socket, 'agent_status', (data) => {
    setAgents((prev) => {
      const next = new Map(prev)
      next.set(data.agentId, data)
      return next
    })
  })

  // Listen to user join/leave
  useWebSocketEvent<{ userCount: number }>(socket, 'user_joined', (data) => {
    setUserCount(data.userCount)
  })

  useWebSocketEvent<{ userCount: number }>(socket, 'user_left', (data) => {
    setUserCount(data.userCount)
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle':
        return 'bg-gray-500'
      case 'working':
        return 'bg-blue-500'
      case 'complete':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {userCount > 0 && (
            <Badge variant="outline">{userCount} active users</Badge>
          )}
        </div>
      </Card>

      {/* Research Progress */}
      {progress && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Research Progress</h3>
              <span className="text-xs text-muted-foreground">
                {progress.progress}%
              </span>
            </div>
            <Progress value={progress.progress} className="h-2" />
            <div className="space-y-1">
              <p className="text-sm font-medium capitalize">{progress.step}</p>
              <p className="text-xs text-muted-foreground">{progress.message}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Agent Status */}
      {agents.size > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Agent Status</h3>
          <div className="space-y-2">
            {Array.from(agents.entries()).map(([agentId, status]) => (
              <div
                key={agentId}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(status.status)}`} />
                  <div>
                    <p className="text-xs font-medium">{agentId}</p>
                    {status.currentTask && (
                      <p className="text-xs text-muted-foreground">
                        {status.currentTask}
                      </p>
                    )}
                  </div>
                </div>
                {status.progress !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {status.progress}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
