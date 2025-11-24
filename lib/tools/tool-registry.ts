/**
 * Tool Registry - Centralized tool management and execution
 * Implements OpenAI function calling protocol with retry logic and rate limiting
 */

import { Tool, ToolCall, ToolExecutionContext, ToolMetadata } from './types'
import { webSearchTool, newsSearchTool, companySearchTool } from './search-tools'
import { calculatorTool, financialCalculatorTool, dataAnalysisTool } from './calculator-tools'
import { generateId } from '@/lib/utils'
import zodToJsonSchema from 'zod-to-json-schema'

export class ToolRegistry {
  private static instance: ToolRegistry | null = null
  private tools: Map<string, Tool> = new Map()
  private rateLimits: Map<string, { calls: number[], limit: number, windowMs: number }> = new Map()
  private executionHistory: ToolCall[] = []

  private constructor() {
    this.registerDefaultTools()
  }

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry()
    }
    return ToolRegistry.instance
  }

  /**
   * Register built-in tools
   */
  private registerDefaultTools(): void {
    // Search tools
    this.register(webSearchTool)
    this.register(newsSearchTool)
    this.register(companySearchTool)

    // Calculator tools
    this.register(calculatorTool)
    this.register(financialCalculatorTool)
    this.register(dataAnalysisTool)

    console.log(`✅ Tool Registry: ${this.tools.size} tools registered`)
  }

  /**
   * Register a new tool
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" already registered, overwriting`)
    }
    this.tools.set(tool.name, tool)

    // Initialize rate limit tracking
    if (tool.rateLimit) {
      this.rateLimits.set(tool.name, {
        calls: [],
        limit: tool.rateLimit.maxCalls,
        windowMs: tool.rateLimit.windowMs
      })
    }
  }

  /**
   * Get tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  /**
   * Get all registered tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): Tool[] {
    return this.getAllTools().filter(tool => tool.category === category)
  }

  /**
   * Convert tools to LLM function calling format (OpenAI/Gemini compatible)
   */
  getToolsForLLM(): any[] {
    return this.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.schema)
    }))
  }

  /**
   * Get tool metadata
   */
  getToolMetadata(name: string): ToolMetadata | null {
    const tool = this.getTool(name)
    if (!tool) return null

    return {
      name: tool.name,
      description: tool.description,
      category: tool.category,
      parameters: zodToJsonSchema(tool.schema),
      version: '1.0.0'
    }
  }

  /**
   * Check rate limit
   */
  private checkRateLimit(toolName: string): boolean {
    const rateLimit = this.rateLimits.get(toolName)
    if (!rateLimit) return true // No rate limit

    const now = Date.now()
    
    // Remove old calls outside the window
    rateLimit.calls = rateLimit.calls.filter(
      callTime => now - callTime < rateLimit.windowMs
    )

    // Check if limit exceeded
    if (rateLimit.calls.length >= rateLimit.limit) {
      return false
    }

    // Add current call
    rateLimit.calls.push(now)
    return true
  }

  /**
   * Execute a tool with retry logic
   */
  async executeTool(
    name: string,
    params: any,
    context?: ToolExecutionContext
  ): Promise<ToolCall> {
    const tool = this.getTool(name)
    
    if (!tool) {
      const errorCall: ToolCall = {
        id: generateId(),
        tool: name,
        params,
        status: 'error',
        error: `Tool not found: ${name}`,
        startTime: new Date(),
        endTime: new Date()
      }
      this.executionHistory.push(errorCall)
      return errorCall
    }

    // Check rate limit
    if (!this.checkRateLimit(name)) {
      const errorCall: ToolCall = {
        id: generateId(),
        tool: name,
        params,
        status: 'error',
        error: 'Rate limit exceeded',
        startTime: new Date(),
        endTime: new Date()
      }
      this.executionHistory.push(errorCall)
      return errorCall
    }

    const toolCall: ToolCall = {
      id: context?.metadata?.callId || generateId(),
      tool: name,
      params,
      status: 'pending',
      startTime: new Date(),
      retryCount: 0,
      metadata: context?.metadata
    }

    const maxRetries = tool.retryPolicy?.maxRetries || 0
    const initialDelay = tool.retryPolicy?.initialDelay || 1000
    const backoffType = tool.retryPolicy?.backoffType || 'exponential'

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Validate parameters
        const validated = tool.schema.parse(params)
        
        // Execute with timeout
        toolCall.status = 'running'
        const timeout = context?.timeout || 30000 // 30 seconds default
        
        const result = await Promise.race([
          tool.execute(validated),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
          )
        ])

        toolCall.result = result
        toolCall.status = 'success'
        toolCall.endTime = new Date()
        break

      } catch (error: any) {
        toolCall.retryCount = attempt

        if (attempt === maxRetries) {
          // Final attempt failed
          toolCall.status = 'error'
          toolCall.error = error.message
          toolCall.endTime = new Date()
        } else {
          // Calculate backoff delay
          let delay = initialDelay
          if (backoffType === 'exponential') {
            delay = initialDelay * Math.pow(2, attempt)
          } else if (backoffType === 'linear') {
            delay = initialDelay * (attempt + 1)
          }

          // Apply max delay if specified
          if (tool.retryPolicy?.maxDelay) {
            delay = Math.min(delay, tool.retryPolicy.maxDelay)
          }

          console.log(`Tool ${name} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    this.executionHistory.push(toolCall)
    return toolCall
  }

  /**
   * Execute multiple tools in parallel
   */
  async executeTools(
    calls: Array<{ name: string, params: any }>,
    context?: ToolExecutionContext
  ): Promise<ToolCall[]> {
    const promises = calls.map(call => 
      this.executeTool(call.name, call.params, context)
    )
    return Promise.all(promises)
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit = 100): ToolCall[] {
    return this.executionHistory.slice(-limit)
  }

  /**
   * Get execution statistics
   */
  getStatistics(): {
    totalExecutions: number
    successRate: number
    averageExecutionTime: number
    toolUsage: Record<string, number>
  } {
    const total = this.executionHistory.length
    const successful = this.executionHistory.filter(call => call.status === 'success').length
    
    const executionTimes = this.executionHistory
      .filter(call => call.startTime && call.endTime)
      .map(call => call.endTime!.getTime() - call.startTime!.getTime())
    
    const avgTime = executionTimes.length > 0
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
      : 0

    const toolUsage: Record<string, number> = {}
    this.executionHistory.forEach(call => {
      toolUsage[call.tool] = (toolUsage[call.tool] || 0) + 1
    })

    return {
      totalExecutions: total,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageExecutionTime: Math.round(avgTime),
      toolUsage
    }
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = []
  }
}

// Factory function wrapper
export function getToolRegistry(): ToolRegistry {
  return ToolRegistry.getInstance()
}

// Export for testing/reset
export function resetToolRegistry(): void {
  // Use getInstance() directly for singleton pattern
}
