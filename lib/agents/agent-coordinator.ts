import { BaseAgent } from './base-agent'
import { AgentOrchestrator, AgentTask } from './orchestrator'
import { agentCommunication } from './agent-communication'
import { agentMonitor } from './agent-monitor'

/**
 * Agent Coordinator - Advanced coordination and optimization
 */
export class AgentCoordinator {
  private orchestrator: AgentOrchestrator
  private taskQueue: AgentTask[] = []
  private activeTasks: Map<string, AgentTask> = new Map()
  private agentCapabilities: Map<string, string[]> = new Map()

  constructor(orchestrator: AgentOrchestrator) {
    this.orchestrator = orchestrator
    this.initializeCapabilities()
  }

  /**
   * Initialize agent capabilities mapping
   */
  private initializeCapabilities(): void {
    const agents = this.orchestrator.getAllAgents()
    for (const agent of agents) {
      this.agentCapabilities.set(agent.getName(), agent.getCapabilities())
    }
  }

  /**
   * Find best agent for a task
   */
  findBestAgent(taskType: string, requirements: string[]): string | null {
    let bestAgent: string | null = null
    let bestScore = 0

    for (const [agentName, capabilities] of this.agentCapabilities.entries()) {
      const score = this.calculateMatchScore(capabilities, requirements, taskType)
      if (score > bestScore) {
        bestScore = score
        bestAgent = agentName
      }
    }

    return bestAgent
  }

  /**
   * Calculate match score for agent capabilities
   */
  private calculateMatchScore(
    capabilities: string[],
    requirements: string[],
    taskType: string
  ): number {
    let score = 0

    // Exact capability matches
    for (const requirement of requirements) {
      if (capabilities.some(cap => cap.toLowerCase().includes(requirement.toLowerCase()))) {
        score += 10
      }
    }

    // Task type matching
    const agentName = capabilities.join(' ').toLowerCase()
    if (agentName.includes(taskType.toLowerCase())) {
      score += 20
    }

    return score
  }

  /**
   * Optimize task execution order
   */
  optimizeTaskOrder(tasks: AgentTask[]): AgentTask[] {
    // Sort by priority first
    const sorted = [...tasks].sort((a, b) => a.priority - b.priority)

    // Then optimize based on dependencies
    const optimized: AgentTask[] = []
    const completed = new Set<string>()

    for (const task of sorted) {
      if (!task.dependencies || task.dependencies.every(dep => completed.has(dep))) {
        optimized.push(task)
        completed.add(task.agentName)
      } else {
        // Find position where dependencies are met
        let insertIndex = optimized.length
        for (let i = optimized.length - 1; i >= 0; i--) {
          if (task.dependencies?.includes(optimized[i].agentName)) {
            insertIndex = i + 1
            break
          }
        }
        optimized.splice(insertIndex, 0, task)
      }
    }

    return optimized
  }

  /**
   * Coordinate agent communication
   */
  coordinateCommunication(fromAgent: string, data: any, targetAgents?: string[]): void {
    if (targetAgents) {
      // Send to specific agents
      for (const targetAgent of targetAgents) {
        agentCommunication.sendMessage(
          fromAgent,
          targetAgent,
          `Data shared from ${fromAgent}`,
          data
        )
      }
    } else {
      // Broadcast to all
      agentCommunication.broadcast(fromAgent, `Broadcast from ${fromAgent}`, data)
    }
  }

  /**
   * Monitor and adjust agent performance
   */
  monitorAndAdjust(): void {
    const stats = this.orchestrator.getAgentStats()
    
    for (const [agentName, agentStats] of Object.entries(stats)) {
      // Record in monitor
      if (agentStats.lastExecutionTime) {
        agentMonitor.recordExecution(
          agentName,
          'task-execution',
          agentStats.averageExecutionTime,
          agentStats.successRate > 0.8
        )
      }

      // Adjust if performance is poor
      if (agentStats.successRate < 0.5) {
        console.warn(`Agent ${agentName} has low success rate: ${agentStats.successRate}`)
        // Could trigger retry or alternative agent
      }
    }
  }

  /**
   * Get coordination statistics
   */
  getCoordinationStats(): {
    totalTasks: number
    activeTasks: number
    queuedTasks: number
    agentUtilization: Record<string, number>
  } {
    const agentUtilization: Record<string, number> = {}
    const stats = this.orchestrator.getAgentStats()

    for (const [agentName, agentStats] of Object.entries(stats)) {
      const totalTasks = agentStats.tasksCompleted + agentStats.tasksFailed
      agentUtilization[agentName] = totalTasks
    }

    return {
      totalTasks: this.taskQueue.length + this.activeTasks.size,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      agentUtilization,
    }
  }
}

