/**
 * WebSocket Client Hook
 * React hook for real-time communication
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Socket, io } from 'socket.io-client'

export interface UseWebSocketOptions {
  url?: string
  sessionId?: string
  autoConnect?: boolean
  reconnection?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
}

export interface WebSocketHook {
  socket: Socket | null
  isConnected: boolean
  joinSession: (sessionId: string) => void
  leaveSession: (sessionId: string) => void
  startResearch: (query: string) => void
  executeTool: (toolName: string, params: any) => void
  sendTyping: (isTyping: boolean) => void
  sendCollaboration: (event: string, data: any) => void
  disconnect: () => void
}

export function useWebSocket(options: UseWebSocketOptions = {}): WebSocketHook {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000',
    sessionId,
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options

  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!autoConnect) return

    // Initialize socket connection
    socketRef.current = io(url, {
      path: '/socket.io',
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
    })

    const socket = socketRef.current

    // Connection handlers
    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id)
      setIsConnected(true)
      
      // Auto-join session if provided
      if (sessionId) {
        socket.emit('join_session', sessionId)
      }
    })

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
    })

    return () => {
      socket.disconnect()
    }
  }, [url, sessionId, autoConnect, reconnection, reconnectionAttempts, reconnectionDelay])

  const joinSession = useCallback((sessionId: string) => {
    socketRef.current?.emit('join_session', sessionId)
  }, [])

  const leaveSession = useCallback((sessionId: string) => {
    socketRef.current?.emit('leave_session', sessionId)
  }, [])

  const startResearch = useCallback((query: string) => {
    if (!sessionId) {
      console.error('No session ID provided')
      return
    }
    socketRef.current?.emit('start_research', { sessionId, query })
  }, [sessionId])

  const executeTool = useCallback((toolName: string, params: any) => {
    if (!sessionId) {
      console.error('No session ID provided')
      return
    }
    socketRef.current?.emit('execute_tool', { sessionId, toolName, params })
  }, [sessionId])

  const sendTyping = useCallback((isTyping: boolean) => {
    if (!sessionId) return
    socketRef.current?.emit('typing', { sessionId, isTyping })
  }, [sessionId])

  const sendCollaboration = useCallback((event: string, data: any) => {
    if (!sessionId) return
    socketRef.current?.emit('collaboration', { sessionId, event, data })
  }, [sessionId])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
  }, [])

  return {
    socket: socketRef.current,
    isConnected,
    joinSession,
    leaveSession,
    startResearch,
    executeTool,
    sendTyping,
    sendCollaboration,
    disconnect,
  }
}

/**
 * Hook for listening to WebSocket events
 */
export function useWebSocketEvent<T = any>(
  socket: Socket | null,
  event: string,
  handler: (data: T) => void
): void {
  useEffect(() => {
    if (!socket) return

    socket.on(event, handler)

    return () => {
      socket.off(event, handler)
    }
  }, [socket, event, handler])
}
