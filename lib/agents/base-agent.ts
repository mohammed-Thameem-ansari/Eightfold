import { AgentStats } from './orchestrator'
import { generateId } from '@/lib/utils'
import { errorHandler } from '@/lib/error-handler'

/**
 * Base class for all agents
 */
export abstract class BaseAgent {
  protected name: string
  protected description: string
  protected capabilities: string[]
  protected maxRetries: number = 3
  protected retryDelay: number = 1000
  protected timeout: number = 60000
  private stats: AgentStats = {
    tasksCompleted: 0,
    tasksFailed: 0,
    averageExecutionTime: 0,
    successRate: 1.0,
  }
  private executionTimes: number[] = []

  constructor(name: string, description: string, capabilities: string[] = []) {
    this.name = name
    this.description = description
    this.capabilities = capabilities
  }

  /**
   * Execute agent task (to be implemented by subclasses)
   */
  abstract execute(input: any): Promise<any>

  /**
   * Execute with retry logic and timeout
   */
  async executeWithRetry(input: any): Promise<any> {
    const startTime = Date.now()
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Agent ${this.name} execution timeout after ${this.timeout}ms`)), this.timeout)
        })

        // Race between execution and timeout
        const result = await Promise.race([
          this.execute(input),
          timeoutPromise
        ])

        const executionTime = Date.now() - startTime
        this.recordExecution(true, executionTime)
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn(`Agent ${this.name} attempt ${attempt + 1}/${this.maxRetries} failed:`, lastError.message)

        // Don't retry on validation errors
        if (lastError.message.includes('Required field') || lastError.message.includes('Invalid')) {
          break
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)))
        }
      }
    }

    const executionTime = Date.now() - startTime
    this.recordExecution(false, executionTime)
    
    const error = lastError || new Error(`Agent ${this.name} execution failed after ${this.maxRetries} attempts`)
    errorHandler.handle(error, `Agent: ${this.name}`)
    throw error
  }

  /**
   * Get agent name
   */
  getName(): string {
    return this.name
  }

  /**
   * Get agent description
   */
  getDescription(): string {
    return this.description
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): string[] {
    return this.capabilities
  }

  /**
   * Get agent statistics
   */
  getStats(): AgentStats {
    return { ...this.stats }
  }

  /**
   * Record task execution
   */
  protected recordExecution(success: boolean, executionTime: number) {
    if (success) {
      this.stats.tasksCompleted++
      this.executionTimes.push(executionTime)
      const total = this.stats.tasksCompleted + this.stats.tasksFailed
      this.stats.averageExecutionTime =
        this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length
      this.stats.successRate = this.stats.tasksCompleted / total
    } else {
      this.stats.tasksFailed++
      const total = this.stats.tasksCompleted + this.stats.tasksFailed
      this.stats.successRate = this.stats.tasksCompleted / total
    }
    this.stats.lastExecutionTime = new Date()
  }

  /**
   * Validate input
   */
  protected validateInput(input: any, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!input || input[field] === undefined || input[field] === null) {
        throw new Error(`Required field missing: ${field}`)
      }
    }
  }
}

