/**
 * Analytics and Monitoring Service
 * Tracks agent performance, usage patterns, and system metrics
 */

export interface AnalyticsEvent {
  id: string
  type: 'query' | 'search' | 'agent_execution' | 'api_call' | 'error' | 'export' | 'user_action'
  timestamp: Date
  userId?: string
  sessionId?: string
  data: Record<string, any>
  duration?: number
  success: boolean
  metadata?: Record<string, any>
}

export interface AgentPerformanceMetrics {
  agentName: string
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageExecutionTime: number
  minExecutionTime: number
  maxExecutionTime: number
  successRate: number
  lastExecuted?: Date
  errorMessages: string[]
}

export interface UsageStatistics {
  totalQueries: number
  totalSearches: number
  totalAPIcalls: number
  totalExports: number
  activeUsers: number
  activeSessions: number
  averageQueryTime: number
  peakUsageTime?: Date
  topQueries: Array<{ query: string; count: number }>
  errorRate: number
  uptime: number
}

export interface SystemMetrics {
  timestamp: Date
  cpuUsage?: number
  memoryUsage: number
  activeConnections: number
  cacheHitRate: number
  apiLatency: Record<string, number>
  queueSize: number
}

export class AnalyticsService {
  private events: AnalyticsEvent[] = []
  private maxEvents: number = 10000 // Keep last 10k events in memory
  private agentMetrics: Map<string, AgentPerformanceMetrics> = new Map()
  private systemMetrics: SystemMetrics[] = []
  private sessionStartTime: Date = new Date()

  /**
   * Track an event
   */
  trackEvent(
    type: AnalyticsEvent['type'],
    data: Record<string, any>,
    options: {
      userId?: string
      sessionId?: string
      duration?: number
      success?: boolean
      metadata?: Record<string, any>
    } = {}
  ): string {
    const event: AnalyticsEvent = {
      id: this.generateId(),
      type,
      timestamp: new Date(),
      userId: options.userId,
      sessionId: options.sessionId,
      data,
      duration: options.duration,
      success: options.success !== false,
      metadata: options.metadata,
    }

    this.events.push(event)

    // Trim events if exceeding max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }

    // Update metrics based on event type
    this.updateMetrics(event)

    return event.id
  }

  /**
   * Track agent execution
   */
  trackAgentExecution(
    agentName: string,
    executionTime: number,
    success: boolean,
    error?: string
  ): void {
    let metrics = this.agentMetrics.get(agentName)

    if (!metrics) {
      metrics = {
        agentName,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        minExecutionTime: Infinity,
        maxExecutionTime: 0,
        successRate: 1.0,
        errorMessages: [],
      }
    }

    metrics.totalExecutions++
    if (success) {
      metrics.successfulExecutions++
    } else {
      metrics.failedExecutions++
      if (error && !metrics.errorMessages.includes(error)) {
        metrics.errorMessages.push(error)
      }
    }

    metrics.averageExecutionTime =
      (metrics.averageExecutionTime * (metrics.totalExecutions - 1) + executionTime) /
      metrics.totalExecutions

    metrics.minExecutionTime = Math.min(metrics.minExecutionTime, executionTime)
    metrics.maxExecutionTime = Math.max(metrics.maxExecutionTime, executionTime)
    metrics.successRate = metrics.successfulExecutions / metrics.totalExecutions
    metrics.lastExecuted = new Date()

    this.agentMetrics.set(agentName, metrics)

    // Track as event
    this.trackEvent('agent_execution', {
      agentName,
      executionTime,
      success,
      error,
    })
  }

  /**
   * Get agent performance metrics
   */
  getAgentMetrics(agentName?: string): AgentPerformanceMetrics | AgentPerformanceMetrics[] {
    if (agentName) {
      return this.agentMetrics.get(agentName) || this.createEmptyMetrics(agentName)
    }

    return Array.from(this.agentMetrics.values())
  }

  /**
   * Get usage statistics
   */
  getUsageStatistics(timeRange?: { start: Date; end: Date }): UsageStatistics {
    let events = this.events

    // Filter by time range
    if (timeRange) {
      events = events.filter(
        e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      )
    }

    // Count by type
    const totalQueries = events.filter(e => e.type === 'query').length
    const totalSearches = events.filter(e => e.type === 'search').length
    const totalAPIcalls = events.filter(e => e.type === 'api_call').length
    const totalExports = events.filter(e => e.type === 'export').length
    const totalErrors = events.filter(e => !e.success).length

    // Unique users and sessions
    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean)).size
    const uniqueSessions = new Set(events.map(e => e.sessionId).filter(Boolean)).size

    // Average query time
    const queryEvents = events.filter(e => e.type === 'query' && e.duration)
    const averageQueryTime =
      queryEvents.length > 0
        ? queryEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / queryEvents.length
        : 0

    // Top queries
    const queryCounts = new Map<string, number>()
    events
      .filter(e => e.type === 'query' && e.data.query)
      .forEach(e => {
        const query = e.data.query as string
        queryCounts.set(query, (queryCounts.get(query) || 0) + 1)
      })

    const topQueries = Array.from(queryCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Error rate
    const errorRate = events.length > 0 ? totalErrors / events.length : 0

    // Uptime (seconds)
    const uptime = (Date.now() - this.sessionStartTime.getTime()) / 1000

    // Peak usage time
    const hourlyCount = new Map<number, number>()
    events.forEach(e => {
      const hour = e.timestamp.getHours()
      hourlyCount.set(hour, (hourlyCount.get(hour) || 0) + 1)
    })

    let peakHour = 0
    let maxCount = 0
    hourlyCount.forEach((count, hour) => {
      if (count > maxCount) {
        maxCount = count
        peakHour = hour
      }
    })

    const peakUsageTime = new Date()
    peakUsageTime.setHours(peakHour, 0, 0, 0)

    return {
      totalQueries,
      totalSearches,
      totalAPIcalls,
      totalExports,
      activeUsers: uniqueUsers,
      activeSessions: uniqueSessions,
      averageQueryTime,
      peakUsageTime,
      topQueries,
      errorRate,
      uptime,
    }
  }

  /**
   * Get events by type or time range
   */
  getEvents(
    filters: {
      type?: AnalyticsEvent['type']
      userId?: string
      sessionId?: string
      timeRange?: { start: Date; end: Date }
      success?: boolean
    } = {}
  ): AnalyticsEvent[] {
    let filtered = this.events

    if (filters.type) {
      filtered = filtered.filter(e => e.type === filters.type)
    }

    if (filters.userId) {
      filtered = filtered.filter(e => e.userId === filters.userId)
    }

    if (filters.sessionId) {
      filtered = filtered.filter(e => e.sessionId === filters.sessionId)
    }

    if (filters.timeRange) {
      filtered = filtered.filter(
        e => e.timestamp >= filters.timeRange!.start && e.timestamp <= filters.timeRange!.end
      )
    }

    if (filters.success !== undefined) {
      filtered = filtered.filter(e => e.success === filters.success)
    }

    return filtered
  }

  /**
   * Get error analysis
   */
  getErrorAnalysis(): {
    totalErrors: number
    errorsByType: Record<string, number>
    errorsByAgent: Record<string, number>
    recentErrors: AnalyticsEvent[]
    mostCommonErrors: Array<{ message: string; count: number }>
  } {
    const errorEvents = this.events.filter(e => !e.success)

    const errorsByType: Record<string, number> = {}
    const errorsByAgent: Record<string, number> = {}
    const errorMessages: Map<string, number> = new Map()

    errorEvents.forEach(e => {
      // Count by type
      errorsByType[e.type] = (errorsByType[e.type] || 0) + 1

      // Count by agent
      if (e.data.agentName) {
        errorsByAgent[e.data.agentName] = (errorsByAgent[e.data.agentName] || 0) + 1
      }

      // Count error messages
      if (e.data.error) {
        const msg = e.data.error as string
        errorMessages.set(msg, (errorMessages.get(msg) || 0) + 1)
      }
    })

    const mostCommonErrors = Array.from(errorMessages.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalErrors: errorEvents.length,
      errorsByType,
      errorsByAgent,
      recentErrors: errorEvents.slice(-20),
      mostCommonErrors,
    }
  }

  /**
   * Record system metrics
   */
  recordSystemMetrics(metrics: Partial<SystemMetrics>): void {
    const fullMetrics: SystemMetrics = {
      timestamp: new Date(),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      activeConnections: 0,
      cacheHitRate: 0,
      apiLatency: {},
      queueSize: 0,
      ...metrics,
    }

    this.systemMetrics.push(fullMetrics)

    // Keep only last 1000 metrics
    if (this.systemMetrics.length > 1000) {
      this.systemMetrics = this.systemMetrics.slice(-1000)
    }
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(minutes: number = 60): SystemMetrics[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    return this.systemMetrics.filter(m => m.timestamp >= cutoff)
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): {
    summary: UsageStatistics
    agents: AgentPerformanceMetrics[]
    errors: any
    topUsers: Array<{ userId: string; queryCount: number }>
    systemHealth: {
      averageMemory: number
      averageLatency: number
      status: 'healthy' | 'warning' | 'critical'
    }
  } {
    const summary = this.getUsageStatistics()
    const agents = Array.from(this.agentMetrics.values())
    const errors = this.getErrorAnalysis()

    // Top users
    const userCounts = new Map<string, number>()
    this.events
      .filter(e => e.userId)
      .forEach(e => {
        userCounts.set(e.userId!, (userCounts.get(e.userId!) || 0) + 1)
      })

    const topUsers = Array.from(userCounts.entries())
      .map(([userId, queryCount]) => ({ userId, queryCount }))
      .sort((a, b) => b.queryCount - a.queryCount)
      .slice(0, 10)

    // System health
    const recentMetrics = this.getSystemMetrics(15) // Last 15 minutes
    const averageMemory =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length
        : 0

    const allLatencies: number[] = []
    recentMetrics.forEach(m => {
      Object.values(m.apiLatency).forEach(lat => allLatencies.push(lat))
    })
    const averageLatency =
      allLatencies.length > 0
        ? allLatencies.reduce((sum, lat) => sum + lat, 0) / allLatencies.length
        : 0

    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (summary.errorRate > 0.1 || averageMemory > 500) status = 'warning'
    if (summary.errorRate > 0.3 || averageMemory > 1000) status = 'critical'

    return {
      summary,
      agents,
      errors,
      topUsers,
      systemHealth: {
        averageMemory,
        averageLatency,
        status,
      },
    }
  }

  /**
   * Export analytics data
   */
  exportData(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(
        {
          events: this.events,
          agentMetrics: Array.from(this.agentMetrics.entries()),
          systemMetrics: this.systemMetrics,
          summary: this.getUsageStatistics(),
        },
        null,
        2
      )
    }

    // CSV format (simplified)
    const headers = ['timestamp', 'type', 'success', 'duration', 'userId', 'sessionId']
    const rows = this.events.map(e => [
      e.timestamp.toISOString(),
      e.type,
      e.success,
      e.duration || '',
      e.userId || '',
      e.sessionId || '',
    ])

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  }

  /**
   * Clear old events
   */
  clearOldEvents(daysToKeep: number = 7): number {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
    const originalLength = this.events.length
    this.events = this.events.filter(e => e.timestamp >= cutoff)
    return originalLength - this.events.length
  }

  // Helper methods
  private updateMetrics(event: AnalyticsEvent): void {
    // Additional metric updates based on event type can be added here
  }

  private createEmptyMetrics(agentName: string): AgentPerformanceMetrics {
    return {
      agentName,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      minExecutionTime: 0,
      maxExecutionTime: 0,
      successRate: 0,
      errorMessages: [],
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// Singleton instance
let analyticsService: AnalyticsService | null = null

export function getAnalyticsService(): AnalyticsService {
  if (!analyticsService) {
    analyticsService = new AnalyticsService()
  }
  return analyticsService
}
