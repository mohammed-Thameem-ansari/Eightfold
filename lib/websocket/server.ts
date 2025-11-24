/**
 * WebSocket Server for Real-time Updates
 * Provides live research progress, agent status, and collaborative features
 */

import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { MemoryManager } from '../memory/memory-manager'
import { ToolRegistry } from '../tools/tool-registry'

export interface WebSocketConfig {
  cors?: {
    origin: string | string[]
    credentials: boolean
  }
  path?: string
}

export interface ResearchProgress {
  sessionId: string
  step: string
  progress: number
  message: string
  data?: any
}

export interface AgentStatus {
  agentId: string
  status: 'idle' | 'working' | 'complete' | 'error'
  currentTask?: string
  progress?: number
}

export interface CollaborationEvent {
  sessionId: string
  userId: string
  event: 'join' | 'leave' | 'update' | 'comment'
  data?: any
}

export class WebSocketServer {
  private static instance: WebSocketServer | null = null
  private io: SocketIOServer | null = null
  private connectedUsers: Map<string, Set<string>> = new Map() // sessionId -> Set of socketIds
  private memoryManager: MemoryManager
  private toolRegistry: ToolRegistry

  private constructor() {
    this.memoryManager = MemoryManager.getInstance()
    this.toolRegistry = ToolRegistry.getInstance()
  }

  static getInstance(): WebSocketServer {
    if (!WebSocketServer.instance) {
      WebSocketServer.instance = new WebSocketServer()
    }
    return WebSocketServer.instance
  }

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer, config: WebSocketConfig = {}): void {
    if (this.io) {
      console.warn('WebSocket server already initialized')
      return
    }

    this.io = new SocketIOServer(httpServer, {
      path: config.path || '/socket.io',
      cors: config.cors || {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        credentials: true,
      },
    })

    this.setupEventHandlers()
    console.log('✅ WebSocket server initialized')
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return

    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`)

      // Join session room
      socket.on('join_session', async (sessionId: string) => {
        socket.join(sessionId)
        
        // Track user
        if (!this.connectedUsers.has(sessionId)) {
          this.connectedUsers.set(sessionId, new Set())
        }
        this.connectedUsers.get(sessionId)!.add(socket.id)

        // Send session history
        try {
          const history = await this.memoryManager.getConversationHistory(sessionId, 20)
          socket.emit('session_history', { sessionId, history })
        } catch (error) {
          console.error('Failed to load session history:', error)
        }

        // Notify others
        socket.to(sessionId).emit('user_joined', { 
          socketId: socket.id, 
          userCount: this.connectedUsers.get(sessionId)!.size 
        })
      })

      // Leave session room
      socket.on('leave_session', (sessionId: string) => {
        socket.leave(sessionId)
        this.connectedUsers.get(sessionId)?.delete(socket.id)
        
        socket.to(sessionId).emit('user_left', { 
          socketId: socket.id,
          userCount: this.connectedUsers.get(sessionId)?.size || 0
        })
      })

      // Handle research query
      socket.on('start_research', async (data: { sessionId: string; query: string }) => {
        const { sessionId, query } = data
        
        try {
          // Emit progress updates
          this.emitProgress(sessionId, {
            sessionId,
            step: 'initialize',
            progress: 0,
            message: 'Starting research...',
          })

          // Save query to memory
          await this.memoryManager.saveMessage(sessionId, {
            id: `msg_${Date.now()}`,
            sessionId,
            type: 'conversation',
            content: query,
            timestamp: new Date(),
            metadata: { role: 'user' },
          })

          // Emit progress
          this.emitProgress(sessionId, {
            sessionId,
            step: 'processing',
            progress: 25,
            message: 'Analyzing query...',
          })

          socket.emit('research_started', { sessionId })
        } catch (error) {
          socket.emit('research_error', { 
            sessionId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      })

      // Handle tool execution
      socket.on('execute_tool', async (data: { sessionId: string; toolName: string; params: any }) => {
        const { sessionId, toolName, params } = data
        
        try {
          this.emitAgentStatus(sessionId, {
            agentId: 'tool_executor',
            status: 'working',
            currentTask: `Executing ${toolName}`,
            progress: 0,
          })

          const result = await this.toolRegistry.executeTool(toolName, params)
          
          this.emitAgentStatus(sessionId, {
            agentId: 'tool_executor',
            status: 'complete',
            currentTask: `${toolName} completed`,
            progress: 100,
          })

          socket.emit('tool_result', { sessionId, toolName, result })
        } catch (error) {
          this.emitAgentStatus(sessionId, {
            agentId: 'tool_executor',
            status: 'error',
            currentTask: `${toolName} failed`,
          })

          socket.emit('tool_error', { 
            sessionId, 
            toolName,
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      })

      // Handle collaboration events
      socket.on('collaboration', (data: CollaborationEvent) => {
        socket.to(data.sessionId).emit('collaboration', data)
      })

      // Handle typing indicator
      socket.on('typing', (data: { sessionId: string; isTyping: boolean }) => {
        socket.to(data.sessionId).emit('user_typing', { 
          socketId: socket.id, 
          isTyping: data.isTyping 
        })
      })

      // Disconnect
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`)
        
        // Clean up user tracking
        this.connectedUsers.forEach((users, sessionId) => {
          if (users.has(socket.id)) {
            users.delete(socket.id)
            this.io?.to(sessionId).emit('user_left', { 
              socketId: socket.id,
              userCount: users.size
            })
          }
        })
      })
    })
  }

  /**
   * Emit research progress to session
   */
  emitProgress(sessionId: string, progress: ResearchProgress): void {
    this.io?.to(sessionId).emit('research_progress', progress)
  }

  /**
   * Emit agent status to session
   */
  emitAgentStatus(sessionId: string, status: AgentStatus): void {
    this.io?.to(sessionId).emit('agent_status', status)
  }

  /**
   * Emit message to session
   */
  emitMessage(sessionId: string, message: any): void {
    this.io?.to(sessionId).emit('message', message)
  }

  /**
   * Broadcast to all clients
   */
  broadcast(event: string, data: any): void {
    this.io?.emit(event, data)
  }

  /**
   * Get connected user count for session
   */
  getSessionUserCount(sessionId: string): number {
    return this.connectedUsers.get(sessionId)?.size || 0
  }

  /**
   * Check if server is initialized
   */
  isInitialized(): boolean {
    return this.io !== null
  }
}

export default WebSocketServer.getInstance()
