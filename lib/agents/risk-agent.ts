import { BaseAgent } from './base-agent'
import { callGeminiWithTools } from '@/lib/api-client'
import { getLLMService } from '@/lib/services/llm-providers'
import { getVectorDBService } from '@/lib/services/vector-database'
import { getNewsService } from '@/lib/services/news-aggregation'
import { getFinancialService } from '@/lib/services/financial-data'

/**
 * Risk Agent - Identifies and analyzes risks
 */
export class RiskAgent extends BaseAgent {
  constructor() {
    super(
      'Risk Agent',
      'Identifies and analyzes business risks and challenges',
      ['risk-analysis', 'threat-assessment', 'vulnerability-analysis']
    )
  }

  async execute(input: any): Promise<{
    risks: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high'; mitigation: string }>
    overallRiskLevel: string
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
      const financialService = getFinancialService()

      // Gather risk signals from multiple sources
      const [newsResult, financialMetrics] = await Promise.all([
        newsService.getCompanyNews(companyName, { limit: 30 }).catch(() => []),
        financialService.getStockQuote(companyName).catch(() => null),
      ])

      // Analyze news sentiment for risk signals
      let negativeSentiment = 0
      if (newsResult.length > 0) {
        try {
          let negativeCount = 0
          for (const article of newsResult) {
            const sentiment = newsService.analyzeSentiment(`${article.title} ${article.description || ''}`)
            if (sentiment === 'negative') negativeCount++
          }
          negativeSentiment = negativeCount / newsResult.length
        } catch (error) {
          console.warn('Sentiment analysis failed:', error)
        }
      }

      // Retrieve risk context from vector DB
      let riskContext: string[] = []
      try {
        const contextDocs = await vectorDB.search(
          `${companyName} risks threats challenges vulnerabilities`,
          { topK: 8, filter: { company: companyName } }
        )
        riskContext = contextDocs.map(doc => doc.document.content.substring(0, 300))
      } catch (error) {
        console.warn('Failed to retrieve risk context:', error)
      }

      const analysisPrompt = this.buildAnalysisPrompt(
        companyName,
        data,
        newsResult,
        financialMetrics,
        negativeSentiment,
        riskContext
      )
      
      const response = await llmService.generateText({
        prompt: `You are a senior risk analyst. Identify potential risks comprehensively and provide actionable mitigation strategies.\n\n${analysisPrompt}`,
        maxTokens: 2000,
        temperature: 0.6,
      })

      const analysis = this.parseRiskAnalysis(response.text)

      const executionTime = Date.now() - startTime
      this.recordExecution(true, executionTime)

      return analysis
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordExecution(false, executionTime)
      throw error
    }
  }

  private buildAnalysisPrompt(
    companyName: string,
    data: any,
    news?: any[],
    financialMetrics?: any,
    negativeSentiment?: number,
    context?: string[]
  ): string {
    const newsSection = news && news.length > 0
      ? `\n\n**Recent News (Risk Signals):**\n${news.slice(0, 10).map((n, i) => `${i + 1}. ${n.title} - ${n.source}`).join('\n')}\n`
      : ''

    const financialSection = financialMetrics
      ? `\n\n**Financial Risk Indicators:**\n- Volatility: ${financialMetrics.volatility || 'N/A'}\n- 52-Week Change: ${financialMetrics.change52Week || 'N/A'}%\n- P/E Ratio: ${financialMetrics.peRatio || 'N/A'}\n`
      : ''

    const sentimentSection = negativeSentiment !== undefined
      ? `\n**News Sentiment:** ${(negativeSentiment * 100).toFixed(1)}% negative coverage\n`
      : ''

    const contextSection = context && context.length > 0
      ? `\n\n**Historical Risk Context:**\n${context.join('\n\n')}\n`
      : ''

    return `Conduct a comprehensive risk analysis for **${companyName}**.
${newsSection}${financialSection}${sentimentSection}${contextSection}
**Company Data:**
${JSON.stringify(data, null, 2)}

**Risk Analysis Requirements:**

1. **Business Risks** (5-8 risks):
   - Type (market, operational, financial, regulatory, competitive, technology)
   - Detailed description
   - Severity (low/medium/high)
   - Specific mitigation strategies

2. **Overall Risk Level:**
   - Low / Moderate / High / Critical
   - Justification based on identified risks

3. **Risk Mitigation Recommendations** (5-7 recommendations):
   - Prioritized by severity and urgency
   - Concrete, actionable steps

**Output Format (JSON):**
{
  "risks": [
    {"type": "market", "description": "...", "severity": "high", "mitigation": "..."},
    ...
  ],
  "overallRiskLevel": "Moderate",
  "recommendations": ["rec 1", "rec 2", ...]
}`
  }

  private parseRiskAnalysis(text: string): {
    risks: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high'; mitigation: string }>
    overallRiskLevel: string
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
      risks: [],
      overallRiskLevel: 'Moderate',
      recommendations: [],
    }
  }
}

