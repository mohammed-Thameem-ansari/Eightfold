import { BaseAgent } from './base-agent'
import { callGeminiWithTools } from '@/lib/api-client'
import { getLLMService } from '@/lib/services/llm-providers'
import { getVectorDBService } from '@/lib/services/vector-database'
import { getNewsService } from '@/lib/services/news-aggregation'

/**
 * Opportunity Agent - Identifies business opportunities
 */
export class OpportunityAgent extends BaseAgent {
  constructor() {
    super(
      'Opportunity Agent',
      'Identifies and analyzes business opportunities',
      ['opportunity-identification', 'growth-analysis', 'market-opportunities']
    )
  }

  async execute(input: any): Promise<{
    opportunities: Array<{ type: string; description: string; potential: 'low' | 'medium' | 'high'; actionItems: string[] }>
    growthAreas: string[]
    recommendations: string[]
  }> {
    const startTime = Date.now()
    this.validateInput(input, ['companyName', 'data'])

    try {
      const { companyName, data } = input

      // Get services
      const llmService = getLLMService()
      const vectorDB = getVectorDBService()
      const newsService = getNewsService()

      // Get recent news for opportunity signals
      let recentNews: any[] = []
      try {
        recentNews = await newsService.getCompanyNews(companyName, { limit: 20 })
      } catch (error) {
        console.warn('Failed to fetch news:', error)
      }

      // Retrieve relevant context from vector DB
      let marketContext: string[] = []
      try {
        const contextDocs = await vectorDB.search(
          `${companyName} opportunities growth expansion partnerships`,
          { topK: 8, filter: { company: companyName } }
        )
        marketContext = contextDocs.map(doc => doc.document.content.substring(0, 300))
      } catch (error) {
        console.warn('Failed to retrieve opportunity context:', error)
      }

      const analysisPrompt = this.buildAnalysisPrompt(companyName, data, recentNews, marketContext)
      
      const response = await llmService.generateText({
        prompt: `You are a strategic business consultant specializing in growth opportunities and market expansion. Identify actionable, high-impact opportunities.\n\n${analysisPrompt}`,
        maxTokens: 2000,
        temperature: 0.7,
      })

      const analysis = this.parseOpportunityAnalysis(response.text)

      const executionTime = Date.now() - startTime
      this.recordExecution(true, executionTime)

      return analysis
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordExecution(false, executionTime)
      throw error
    }
  }

  private buildAnalysisPrompt(companyName: string, data: any, news?: any[], context?: string[]): string {
    const newsSection = news && news.length > 0
      ? `\n\n**Recent News & Market Signals:**\n${news.slice(0, 10).map((n, i) => `${i + 1}. ${n.title} (${n.source})`).join('\n')}\n`
      : ''

    const contextSection = context && context.length > 0
      ? `\n\n**Market Context:**\n${context.join('\n\n')}\n`
      : ''

    return `Identify strategic opportunities for **${companyName}**.
${newsSection}${contextSection}
**Company Data:**
${JSON.stringify(data, null, 2)}

**Analysis Requirements:**

1. **Business Opportunities** (5-7 opportunities):
   - Type (e.g., market expansion, product development, partnerships)
   - Detailed description
   - Potential impact (low/medium/high)
   - Concrete action items (3-5 per opportunity)

2. **Growth Areas** (3-5 areas):
   - Untapped markets or segments
   - Technology adoption opportunities
   - Strategic partnership possibilities

3. **Strategic Recommendations** (5-7 recommendations):
   - Prioritized by impact and feasibility
   - Specific, actionable guidance

**Output Format (JSON):**
{
  "opportunities": [
    {"type": "...", "description": "...", "potential": "high", "actionItems": ["...", "..."]},
    ...
  ],
  "growthAreas": ["area 1", "area 2", ...],
  "recommendations": ["rec 1", "rec 2", ...]
}`
  }

  private parseOpportunityAnalysis(text: string): {
    opportunities: Array<{ type: string; description: string; potential: 'low' | 'medium' | 'high'; actionItems: string[] }>
    growthAreas: string[]
    recommendations: string[]
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
      opportunities: [],
      growthAreas: [],
      recommendations: [],
    }
  }
}

