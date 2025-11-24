import { BaseAgent } from './base-agent'
import { callGeminiWithTools } from '@/lib/api-client'
import { getLLMService } from '@/lib/services/llm-providers'
import { getVectorDBService } from '@/lib/services/vector-database'

/**
 * Synthesis Agent - Synthesizes findings from all agents
 */
export class SynthesisAgent extends BaseAgent {
  constructor() {
    super(
      'Synthesis Agent',
      'Synthesizes findings from all research agents into cohesive insights',
      ['synthesis', 'integration', 'insight-consolidation']
    )
  }

  async execute(input: any): Promise<{
    summary: string
    keyInsights: string[]
    integratedFindings: Record<string, any>
    recommendations: string[]
  }> {
    const startTime = Date.now()
    this.validateInput(input, ['companyName', 'data'])

    try {
      const { companyName, data } = input

      // Get services
      const llmService = getLLMService()
      const vectorDB = getVectorDBService()

      // Retrieve all relevant context for comprehensive synthesis
      let comprehensiveContext: string[] = []
      try {
        const contextDocs = await vectorDB.search(
          `${companyName} comprehensive research analysis insights opportunities risks`,
          { topK: 15, filter: { company: companyName } }
        )
        comprehensiveContext = contextDocs.map((doc, i) => 
          `[Source ${i + 1}] ${doc.document.content.substring(0, 500)}`
        )
      } catch (error) {
        console.warn('Failed to retrieve synthesis context:', error)
      }

      // Extract key themes from all agent results
      const agentResults = this.extractAgentResults(data)

      const synthesisPrompt = `You are a senior business consultant synthesizing multi-agent research. Create cohesive, executive-level insights that connect findings across domains (financial, competitive, market, product, risk, opportunity). Focus on strategic narrative and actionable intelligence.\n\n${this.buildSynthesisPrompt(
        companyName,
        data,
        agentResults,
        comprehensiveContext
      )}`
      
      const response = await llmService.generateText({
        prompt: synthesisPrompt,
        maxTokens: 3500,
        temperature: 0.7,
      })

      const synthesis = this.parseSynthesis(response.text, data)

      const executionTime = Date.now() - startTime
      this.recordExecution(true, executionTime)

      return synthesis
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordExecution(false, executionTime)
      throw error
    }
  }

  private extractAgentResults(data: any): Record<string, string> {
    const agentResults: Record<string, string> = {}
    
    // Extract results from different agent phases
    if (data.initial) {
      for (const [agent, result] of Object.entries(data.initial)) {
        agentResults[agent] = JSON.stringify(result).substring(0, 800)
      }
    }
    if (data.analysis) {
      for (const [agent, result] of Object.entries(data.analysis)) {
        agentResults[`${agent}_analysis`] = JSON.stringify(result).substring(0, 800)
      }
    }
    
    return agentResults
  }

  private buildSynthesisPrompt(companyName: string, data: any, agentResults?: Record<string, string>, context?: string[]): string {
    // Extract stock data for prominent display
    const stockData = data.financial?.stockQuote || data.initial?.FinancialAgent?.stockQuote
    const stockSection = stockData 
      ? `\n\n**📊 REAL-TIME STOCK DATA:**\n` +
        `Symbol: ${stockData.symbol || 'N/A'}\n` +
        `Price: $${stockData.price?.toFixed(2) || 'N/A'}\n` +
        `Change: ${stockData.change > 0 ? '+' : ''}${stockData.change?.toFixed(2) || 'N/A'} (${stockData.changePercent > 0 ? '+' : ''}${stockData.changePercent?.toFixed(2) || 'N/A'}%)\n` +
        `Volume: ${stockData.volume ? (stockData.volume / 1e6).toFixed(2) + 'M' : 'N/A'}\n` +
        `Market Cap: ${stockData.marketCap ? '$' + (stockData.marketCap / 1e9).toFixed(2) + 'B' : 'N/A'}\n`
      : ''

    const agentSection = agentResults && Object.keys(agentResults).length > 0
      ? `\n\n**Agent Research Results:**\n${Object.entries(agentResults).map(([agent, result]) => 
          `**${agent}:**\n${result}\n`
        ).join('\n')}\n`
      : ''

    const contextSection = context && context.length > 0
      ? `\n\n**Supporting Research Context:**\n${context.slice(0, 10).join('\n\n')}\n`
      : ''

    return `Synthesize comprehensive research findings for **${companyName}** into a cohesive executive report.
${stockSection}${agentSection}${contextSection}
**Complete Research Data:**
${JSON.stringify(data, null, 2)}

**Synthesis Requirements:**

1. **Executive Summary** (200-300 words):
   - START WITH STOCK DATA if available (format: "SYMBOL: $PRICE (+X.XX%)" prominently at the top)
   - Company overview and positioning
   - Critical findings across all research areas
   - Strategic significance
   - Bottom-line recommendations

2. **Key Insights** (7-10 strategic insights):
   - Cross-functional insights connecting multiple research areas
   - Data-driven observations
   - Strategic implications
   - Competitive positioning insights
   - Example: "Financial Agent found 15% revenue growth while Market Agent identified expanding TAM, indicating strong positioning for aggressive market capture"

3. **Integrated Findings** (organized by domain):
   Structure findings into clear categories:
   - Financial Performance & Metrics
   - Market Position & Competitive Landscape
   - Products, Services & Value Proposition
   - Opportunities & Growth Areas
   - Risks & Challenges
   - Leadership & Organization
   - Strategic Positioning

4. **Strategic Recommendations** (5-8 prioritized recommendations):
   - Actionable, specific guidance
   - Clear priority levels
   - Expected business impact
   - Implementation considerations

**Output Format (JSON):**
{
  "summary": "comprehensive executive summary...",
  "keyInsights": [
    "Cross-agent insight connecting financial growth to market expansion...",
    "Product portfolio analysis reveals...",
    ...
  ],
  "integratedFindings": {
    "financial": {...},
    "market": {...},
    "competitive": {...},
    "products": {...},
    "opportunities": {...},
    "risks": {...},
    "leadership": {...}
  },
  "recommendations": [
    "[HIGH PRIORITY] Recommendation 1 with rationale...",
    ...
  ]
}`
  }

  private parseSynthesis(text: string, data: any): {
    summary: string
    keyInsights: string[]
    integratedFindings: Record<string, any>
    recommendations: string[]
  } {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          summary: parsed.summary || text.substring(0, 500),
          keyInsights: parsed.keyInsights || [],
          integratedFindings: parsed.integratedFindings || data,
          recommendations: parsed.recommendations || [],
        }
      }
    } catch (e) {
      // Fallback
    }

    return {
      summary: text.substring(0, 500),
      keyInsights: [],
      integratedFindings: data,
      recommendations: [],
    }
  }
}

