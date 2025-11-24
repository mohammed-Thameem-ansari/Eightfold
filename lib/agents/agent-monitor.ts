import { BaseAgent } from './base-agent'
import { AgentStats } from './orchestrator'

/**
 * Agent Monitor - Tracks and monitors all agent activities
 */
export class AgentMonitor {
  private agentStats: Map<string, AgentStats> = new Map()
  private agentHistory: Array<{
    agentName: string
    timestamp: Date
    action: string
    duration?: number
    success: boolean
  }> = []

  /**
   * Record agent execution
   */
  recordExecution(
    agentName: string,
    action: string,
    duration: number,
    success: boolean
  ): void {
    this.agentHistory.push({
      agentName,
      timestamp: new Date(),
      action,
      duration,
      success,
    })

    // Update stats
    const stats = this.agentStats.get(agentName) || {
      tasksCompleted: 0,
      tasksFailed: 0,
      averageExecutionTime: 0,
      successRate: 1.0,
    }

    if (success) {
      stats.tasksCompleted++
      const totalTasks = stats.tasksCompleted + stats.tasksFailed
      stats.averageExecutionTime =
        (stats.averageExecutionTime * (totalTasks - 1) + duration) / totalTasks
      stats.successRate = stats.tasksCompleted / totalTasks
    } else {
      stats.tasksFailed++
      const totalTasks = stats.tasksCompleted + stats.tasksFailed
      stats.successRate = stats.tasksCompleted / totalTasks
    }

    stats.lastExecutionTime = new Date()
    this.agentStats.set(agentName, stats)
  }

  /**
   * Get agent statistics
   */
  getAgentStats(agentName: string): AgentStats | undefined {
    return this.agentStats.get(agentName)
  }

  /**
   * Get all agent statistics
   */
  getAllStats(): Record<string, AgentStats> {
    const result: Record<string, AgentStats> = {}
    for (const [name, stats] of this.agentStats.entries()) {
      result[name] = { ...stats }
    }
    return result
  }

  /**
   * Get recent activity
   */
  getRecentActivity(limit: number = 50) {
    return this.agentHistory
      .slice(-limit)
      .reverse()
  }

  /**
   * Get activity by agent
   */
  getActivityByAgent(agentName: string) {
    return this.agentHistory.filter(a => a.agentName === agentName)
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalExecutions: number
    totalSuccess: number
    totalFailed: number
    overallSuccessRate: number
    averageExecutionTime: number
    mostActiveAgent: string
    mostReliableAgent: string
  } {
    const totalExecutions = this.agentHistory.length
    const totalSuccess = this.agentHistory.filter(a => a.success).length
    const totalFailed = totalExecutions - totalSuccess
    const overallSuccessRate = totalExecutions > 0 ? totalSuccess / totalExecutions : 1.0

    const avgTime = this.agentHistory
      .filter(a => a.duration)
      .reduce((sum, a) => sum + (a.duration || 0), 0) / totalExecutions || 0

    // Find most active agent
    const agentCounts = new Map<string, number>()
    for (const activity of this.agentHistory) {
      agentCounts.set(activity.agentName, (agentCounts.get(activity.agentName) || 0) + 1)
    }
    const mostActiveAgent = Array.from(agentCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

    // Find most reliable agent
    const agentSuccessRates = new Map<string, { success: number; total: number }>()
    for (const activity of this.agentHistory) {
      const current = agentSuccessRates.get(activity.agentName) || { success: 0, total: 0 }
      current.total++
      if (activity.success) current.success++
      agentSuccessRates.set(activity.agentName, current)
    }
    const mostReliableAgent = Array.from(agentSuccessRates.entries())
      .map(([name, data]) => ({ name, rate: data.success / data.total }))
      .sort((a, b) => b.rate - a.rate)[0]?.name || 'N/A'

    return {
      totalExecutions,
      totalSuccess,
      totalFailed,
      overallSuccessRate,
      averageExecutionTime: avgTime,
      mostActiveAgent,
      mostReliableAgent,
    }
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.agentHistory = []
    this.agentStats.clear()
  }
}

export const agentMonitor = new AgentMonitor()

