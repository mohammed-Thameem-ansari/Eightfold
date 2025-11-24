'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { agentCommunication } from '@/lib/agents/agent-communication'
import { MessageSquare, Send, Users } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

export function AgentCommunicationPanel() {
  const [messages, setMessages] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const updateMessages = () => {
      // Get messages for all agents
      const allMessages: any[] = []
      const agentNames = [
        'Research Agent', 'Analysis Agent', 'Writing Agent', 'Validation Agent',
        'Competitive Agent', 'Financial Agent', 'Contact Agent', 'News Agent',
        'Market Agent', 'Product Agent', 'Risk Agent', 'Opportunity Agent',
        'Synthesis Agent', 'Quality Agent', 'Strategy Agent',
      ]

      for (const agentName of agentNames) {
        const agentMessages = agentCommunication.getMessages(agentName)
        allMessages.push(...agentMessages.map(msg => ({
          ...msg,
          to: agentName,
        })))
      }

      setMessages(allMessages.sort((a, b) => 
        b.timestamp.getTime() - a.timestamp.getTime()
      ).slice(0, 20))

      setStats(agentCommunication.getStats())
    }

    updateMessages()
    const interval = setInterval(updateMessages, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Agent Communication
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stats && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Messages:</span>
                <span className="ml-2 font-semibold">{stats.totalMessages}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Shared Data:</span>
                <span className="ml-2 font-semibold">{stats.sharedDataKeys}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No agent communication yet</p>
              <p className="text-sm">Agents will communicate during research workflows</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 border rounded-lg"
              >
                <MessageSquare className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {msg.from.replace(' Agent', '')} → {msg.to.replace(' Agent', '')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{msg.message}</p>
                  {msg.data && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Data shared: {typeof msg.data === 'object' ? Object.keys(msg.data).length + ' keys' : 'available'}
                    </p>
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

