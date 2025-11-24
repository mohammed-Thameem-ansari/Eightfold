'use client'

import { useEffect, useRef } from 'react'
import { Terminal, ChevronRight, Info, CheckCircle, AlertCircle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface LogEntry {
  id: string
  message: string
  level: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
  agent?: string
}

interface LiveLogsPanelProps {
  logs: LogEntry[]
}

export function LiveLogsPanel({ logs }: LiveLogsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [logs])

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />
      default:
        return <Info className="h-4 w-4 text-blue-400" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-green-400'
      case 'warning':
        return 'text-yellow-400'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-blue-400'
    }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-md overflow-hidden">
      {/* Terminal Header */}
      <div className="px-6 py-4 border-b border-green-500/20 bg-gradient-to-r from-green-500/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
            <Terminal className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-green-400 font-mono">LIVE LOGS</h2>
            <p className="text-xs text-green-400/60 font-medium font-mono">Real-time agent execution</p>
          </div>
        </div>
        
        {/* Terminal Buttons */}
        <div className="flex items-center gap-2 mt-3">
          <div className="h-3 w-3 rounded-full bg-red-500/60 border border-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/60 border border-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500/60 border border-green-500" />
        </div>
      </div>

      {/* Terminal Content */}
      <ScrollArea className="flex-1 px-6 py-4 font-mono text-sm scrollbar-thin">
        <div className="space-y-1">
          {logs.length === 0 ? (
            <div className="flex items-center gap-2 text-green-400/40">
              <ChevronRight className="h-4 w-4 animate-pulse" />
              <span>Waiting for logs...</span>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="group flex items-start gap-2 py-1 hover:bg-green-500/5 px-2 -mx-2 rounded transition-colors">
                {/* Timestamp */}
                <span className="text-green-400/40 text-[10px] mt-0.5 min-w-[72px]">
                  {new Date(log.timestamp).toLocaleTimeString('en-US', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  })}
                </span>

                {/* Level Icon */}
                <div className="mt-0.5">
                  {getLevelIcon(log.level)}
                </div>

                {/* Message */}
                <div className="flex-1 min-w-0">
                  {log.agent && (
                    <span className="text-cyan-400 font-semibold">[{log.agent}]</span>
                  )}
                  <span className={`ml-1 ${getLevelColor(log.level)}`}>
                    {log.message}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-green-500/20 bg-green-500/5">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400">STREAMING</span>
          </div>
          <span className="text-green-400/60">{logs.length} entries</span>
        </div>
      </div>
    </div>
  )
}
