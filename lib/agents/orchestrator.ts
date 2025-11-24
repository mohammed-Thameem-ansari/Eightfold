import { Message, ResearchStep } from '@/types'
import { generateId } from '@/lib/utils'
import { BaseAgent } from './base-agent'
import { ResearchAgent } from './research-agent'
import { AnalysisAgent } from './analysis-agent'
import { WritingAgent } from './writing-agent'
import { ValidationAgent } from './validation-agent'
import { CompetitiveAgent } from './competitive-agent'
import { FinancialAgent } from './financial-agent'
import { ContactAgent } from './contact-agent'
import { NewsAgent } from './news-agent'
import { MarketAgent } from './market-agent'
import { ProductAgent } from './product-agent'
import { RiskAgent } from './risk-agent'
import { OpportunityAgent } from './opportunity-agent'
import { SynthesisAgent } from './synthesis-agent'
import { QualityAgent } from './quality-agent'
import { StrategyAgent } from './strategy-agent'

/**
 * Agent Orchestrator - Coordinates multiple specialized agents
 */
export class AgentOrchestrator {
  private agents: Map<string, BaseAgent> = new Map()
  private activeTasks: Map<string, AgentTask> = new Map()
  private taskQueue: AgentTask[] = []
  private maxConcurrentTasks: number = 5
  private runningTasks: number = 0

  constructor() {
    this.initializeAgents()
  }

  /**
   * Initialize all specialized agents
   */
  private initializeAgents() {
    // Core Research Agents
    this.registerAgent('research', new ResearchAgent())
    this.registerAgent('analysis', new AnalysisAgent())
    this.registerAgent('writing', new WritingAgent())
    this.registerAgent('validation', new ValidationAgent())
    
    // Specialized Research Agents
    this.registerAgent('competitive', new CompetitiveAgent())
    this.registerAgent('financial', new FinancialAgent())
    this.registerAgent('contact', new ContactAgent())
    this.registerAgent('news', new NewsAgent())
    this.registerAgent('market', new MarketAgent())
    this.registerAgent('product', new ProductAgent())
    
    // Analysis & Strategy Agents
    this.registerAgent('risk', new RiskAgent())
    this.registerAgent('opportunity', new OpportunityAgent())
    this.registerAgent('synthesis', new SynthesisAgent())
    this.registerAgent('quality', new QualityAgent())
    this.registerAgent('strategy', new StrategyAgent())
  }

  /**
   * Register an agent
   */
  private registerAgent(name: string, agent: BaseAgent) {
    this.agents.set(name, agent)
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name)
  }

  /**
   * Get all agents
   */
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values())
  }

  /**
   * Execute a coordinated multi-agent research workflow
   */
  async* executeResearchWorkflow(
    companyName: string,
    researchGoals: string[]
  ): AsyncGenerator<WorkflowUpdate, void, unknown> {
    const workflowId = generateId()
    
    yield {
      type: 'workflow-start',
      workflowId,
      message: `Starting comprehensive research workflow for ${companyName}`,
    }

    try {
      // Phase 1: Initial Research (Parallel)
      yield {
        type: 'phase-start',
        phase: 'initial-research',
        message: 'Phase 1: Gathering initial company information',
      }

      const initialTasks = await this.createInitialResearchTasks(companyName)
      const initialResults = await this.executeTasksParallel(initialTasks, workflowId)

      yield {
        type: 'phase-complete',
        phase: 'initial-research',
        results: initialResults,
      }

      // Phase 2: Deep Analysis (Sequential with dependencies)
      yield {
        type: 'phase-start',
        phase: 'deep-analysis',
        message: 'Phase 2: Performing deep analysis',
      }

      const analysisTasks = this.createAnalysisTasks(companyName, initialResults)
      const analysisResults = await this.executeTasksSequential(analysisTasks, workflowId)

      yield {
        type: 'phase-complete',
        phase: 'deep-analysis',
        results: analysisResults,
      }

      // Phase 3: Synthesis & Strategy
      yield {
        type: 'phase-start',
        phase: 'synthesis',
        message: 'Phase 3: Synthesizing findings and developing strategy',
      }

      const synthesisTasks = this.createSynthesisTasks(companyName, {
        ...initialResults,
        ...analysisResults,
      })
      const synthesisResults = await this.executeTasksSequential(synthesisTasks, workflowId)

      yield {
        type: 'phase-complete',
        phase: 'synthesis',
        results: synthesisResults,
      }

      // Phase 4: Quality Assurance
      yield {
        type: 'phase-start',
        phase: 'quality-assurance',
        message: 'Phase 4: Quality assurance and validation',
      }

      const qualityTasks = this.createQualityTasks(companyName, {
        ...initialResults,
        ...analysisResults,
        ...synthesisResults,
      })
      const qualityResults = await this.executeTasksSequential(qualityTasks, workflowId)

      yield {
        type: 'workflow-complete',
        workflowId,
        results: {
          initial: initialResults,
          analysis: analysisResults,
          synthesis: synthesisResults,
          quality: qualityResults,
        },
      }
    } catch (error) {
      yield {
        type: 'workflow-error',
        workflowId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Create initial research tasks (parallel execution)
   */
  private createInitialResearchTasks(companyName: string): AgentTask[] {
    return [
      {
        id: generateId(),
        agentName: 'research',
        type: 'research',
        input: { companyName, focus: 'overview' },
        priority: 1,
      },
      {
        id: generateId(),
        agentName: 'news',
        type: 'research',
        input: { companyName, focus: 'recent-news' },
        priority: 1,
      },
      {
        id: generateId(),
        agentName: 'product',
        type: 'research',
        input: { companyName, focus: 'products-services' },
        priority: 1,
      },
      {
        id: generateId(),
        agentName: 'market',
        type: 'research',
        input: { companyName, focus: 'market-position' },
        priority: 1,
      },
      {
        id: generateId(),
        agentName: 'contact',
        type: 'research',
        input: { companyName, focus: 'decision-makers' },
        priority: 1,
      },
    ]
  }

  /**
   * Create analysis tasks (sequential with dependencies)
   */
  private createAnalysisTasks(companyName: string, initialResults: Record<string, any>): AgentTask[] {
    return [
      {
        id: generateId(),
        agentName: 'financial',
        type: 'analysis',
        input: { companyName, data: initialResults },
        priority: 2,
        dependencies: ['research'],
      },
      {
        id: generateId(),
        agentName: 'competitive',
        type: 'analysis',
        input: { companyName, data: initialResults },
        priority: 2,
        dependencies: ['market'],
      },
      {
        id: generateId(),
        agentName: 'risk',
        type: 'analysis',
        input: { companyName, data: initialResults },
        priority: 2,
        dependencies: ['financial', 'competitive'],
      },
      {
        id: generateId(),
        agentName: 'opportunity',
        type: 'analysis',
        input: { companyName, data: initialResults },
        priority: 2,
        dependencies: ['risk', 'competitive'],
      },
    ]
  }

  /**
   * Create synthesis tasks
   */
  private createSynthesisTasks(companyName: string, allResults: Record<string, any>): AgentTask[] {
    return [
      {
        id: generateId(),
        agentName: 'synthesis',
        type: 'synthesis',
        input: { companyName, data: allResults },
        priority: 3,
      },
      {
        id: generateId(),
        agentName: 'strategy',
        type: 'strategy',
        input: { companyName, data: allResults },
        priority: 3,
        dependencies: ['synthesis'],
      },
      {
        id: generateId(),
        agentName: 'writing',
        type: 'writing',
        input: { companyName, data: allResults },
        priority: 3,
        dependencies: ['strategy'],
      },
    ]
  }

  /**
   * Create quality assurance tasks
   */
  private createQualityTasks(companyName: string, allResults: Record<string, any>): AgentTask[] {
    return [
      {
        id: generateId(),
        agentName: 'validation',
        type: 'validation',
        input: { companyName, data: allResults },
        priority: 4,
      },
      {
        id: generateId(),
        agentName: 'quality',
        type: 'quality',
        input: { companyName, data: allResults },
        priority: 4,
        dependencies: ['validation'],
      },
    ]
  }

  /**
   * Execute tasks in parallel
   */
  private async executeTasksParallel(tasks: AgentTask[], workflowId: string): Promise<Record<string, any>> {
    const results: Record<string, any> = {}
    const promises = tasks.map(async (task) => {
      const result = await this.executeTask(task, workflowId)
      results[task.agentName] = result
      return result
    })
    // Use allSettled to avoid aborting entire phase on one failure
    await Promise.allSettled(promises)
    return results
  }

  /**
   * Execute tasks sequentially with dependency resolution
   */
  private async executeTasksSequential(tasks: AgentTask[], workflowId: string): Promise<Record<string, any>> {
    const results: Record<string, any> = {}
    const completed = new Set<string>()

    for (const task of tasks.sort((a, b) => a.priority - b.priority)) {
      // Wait for dependencies
      if (task.dependencies) {
        for (const dep of task.dependencies) {
          while (!completed.has(dep)) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
      }

      const result = await this.executeTask(task, workflowId)
      results[task.agentName] = result
      completed.add(task.agentName)
    }

    return results
  }

  /**
   * Execute a single task with retry logic
   */
  private async executeTask(task: AgentTask, workflowId: string): Promise<any> {
    const agent = this.agents.get(task.agentName)
    if (!agent) {
      throw new Error(`Agent not found: ${task.agentName}`)
    }

    this.activeTasks.set(task.id, { ...task, status: 'running', startTime: new Date() })

    try {
      // Use executeWithRetry for automatic retry logic and timeout handling
      const result = await agent.executeWithRetry(task.input)
      this.activeTasks.set(task.id, {
        ...task,
        status: 'completed',
        result,
        endTime: new Date(),
      })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Task ${task.id} (${task.agentName}) failed:`, message)
      this.activeTasks.set(task.id, {
        ...task,
        status: 'error',
        error: message,
        endTime: new Date(),
      })
      // Return structured error instead of throwing to allow workflow continuation
      return { error: message, agentName: task.agentName }
    }
  }

  /**
   * Get active tasks
   */
  getActiveTasks(): AgentTask[] {
    return Array.from(this.activeTasks.values())
  }

  /**
   * Get agent statistics
   */
  getAgentStats(): Record<string, AgentStats> {
    const stats: Record<string, AgentStats> = {}
    for (const [name, agent] of this.agents.entries()) {
      stats[name] = agent.getStats()
    }
    return stats
  }
}

export interface AgentTask {
  id: string
  agentName: string
  type: string
  input: any
  priority: number
  dependencies?: string[]
  status?: 'pending' | 'running' | 'completed' | 'error'
  result?: any
  error?: string
  startTime?: Date
  endTime?: Date
}

export interface WorkflowUpdate {
  type: 'workflow-start' | 'workflow-complete' | 'workflow-error' | 'phase-start' | 'phase-complete' | 'task-update'
  workflowId?: string
  phase?: string
  message?: string
  results?: any
  error?: string
}

export interface AgentStats {
  tasksCompleted: number
  tasksFailed: number
  averageExecutionTime: number
  lastExecutionTime?: Date
  successRate: number
}

