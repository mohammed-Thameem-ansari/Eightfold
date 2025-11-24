import { BaseAgent } from './base-agent'
import { callGeminiWithTools } from '@/lib/api-client'
import { getLLMService } from '@/lib/services/llm-providers'
import { getVectorDBService } from '@/lib/services/vector-database'

/**
 * Strategy Agent - Develops strategic recommendations
 */
export class StrategyAgent extends BaseAgent {
  constructor() {
    super(
      'Strategy Agent',
      'Develops strategic recommendations and action plans',
      ['strategy-development', 'planning', 'recommendations']
    )
  }

  async execute(input: any): Promise<{
    strategy: string
    recommendations: Array<{ priority: 'high' | 'medium' | 'low'; action: string; rationale: string }>
    actionPlan: Array<{ phase: string; steps: string[]; timeline: string }>
    successMetrics: string[]
  }> {
    const startTime = Date.now()
    this.validateInput(input, ['companyName', 'data'])

    try {
      const { companyName, data } = input

      // Get services
      const llmService = getLLMService()
      const vectorDB = getVectorDBService()

      // Retrieve strategic context from previous research
      let strategicContext: string[] = []
      try {
        const contextDocs = await vectorDB.search(
          `${companyName} strategy competitive advantage market position opportunities`,
          { topK: 10, filter: { company: companyName } }
        )
        strategicContext = contextDocs.map(doc => doc.document.content.substring(0, 400))
      } catch (error) {
        console.warn('Failed to retrieve strategic context:', error)
      }

      const strategyPrompt = `You are a McKinsey-level strategic consultant with expertise in business strategy, competitive positioning, and growth planning. Provide actionable, data-driven strategies with clear implementation paths.\n\n${this.buildStrategyPrompt(companyName, data, strategicContext)}`
      
      const response = await llmService.generateText({
        prompt: strategyPrompt,
        maxTokens: 3000,
        temperature: 0.7,
      })

      const strategy = this.parseStrategy(response.text)

      const executionTime = Date.now() - startTime
      this.recordExecution(true, executionTime)

      return strategy
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordExecution(false, executionTime)
      throw error
    }
  }

  private buildStrategyPrompt(companyName: string, data: any, context?: string[]): string {
    const contextSection = context && context.length > 0
      ? `\n\n**Strategic Context from Research:**\n${context.join('\n\n')}\n`
      : ''

    return `Develop a comprehensive strategic engagement plan for **${companyName}**.
${contextSection}
**Company Research Data:**
${JSON.stringify(data, null, 2)}

**Strategic Plan Requirements:**

1. **Overall Strategy** (Executive Summary):
   - Clear value proposition for engagement
   - Strategic positioning approach
   - Key differentiators and competitive advantages
   - Expected outcomes and business impact

2. **Prioritized Recommendations** (7-10 recommendations):
   Each with:
   - Priority level (high/medium/low)
   - Specific action item
   - Strategic rationale
   - Expected impact

3. **Action Plan** (3-5 phases):
   Each phase with:
   - Phase name and objective
   - Concrete steps (3-5 per phase)
   - Timeline estimate
   - Key deliverables

4. **Success Metrics** (5-8 KPIs):
   - Measurable outcomes
   - Target values
   - Tracking methodology

**Output Format (JSON):**
{
  "strategy": "comprehensive executive summary...",
  "recommendations": [
    {"priority": "high", "action": "...", "rationale": "..."},
    ...
  ],
  "actionPlan": [
    {"phase": "Discovery", "steps": ["...", "..."], "timeline": "4-6 weeks"},
    ...
  ],
  "successMetrics": ["metric 1", "metric 2", ...]
}`
  }

  private parseStrategy(text: string): {
    strategy: string
    recommendations: Array<{ priority: 'high' | 'medium' | 'low'; action: string; rationale: string }>
    actionPlan: Array<{ phase: string; steps: string[]; timeline: string }>
    successMetrics: string[]
  } {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      // Fallback
    }

    return {
      strategy: text.substring(0, 500),
      recommendations: [],
      actionPlan: [],
      successMetrics: [],
    }
  }
}

