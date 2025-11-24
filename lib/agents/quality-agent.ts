import { BaseAgent } from './base-agent'
import { callGeminiWithTools } from '@/lib/api-client'
import { getLLMService } from '@/lib/services/llm-providers'
import { getVectorDBService } from '@/lib/services/vector-database'

/**
 * Quality Agent - Ensures quality and completeness
 */
export class QualityAgent extends BaseAgent {
  constructor() {
    super(
      'Quality Agent',
      'Ensures quality, completeness, and accuracy of all research outputs',
      ['quality-assurance', 'completeness-check', 'accuracy-verification']
    )
  }

  async execute(input: any): Promise<{
    qualityScore: number
    completeness: number
    accuracy: number
    gaps: string[]
    improvements: string[]
  }> {
    const startTime = Date.now()
    this.validateInput(input, ['companyName', 'data'])

    try {
      const { companyName, data } = input

      // Get services
      const llmService = getLLMService()
      const vectorDB = getVectorDBService()

      // Check completeness against expected data points
      const expectedFields = [
        'companyOverview',
        'products',
        'financials',
        'competitors',
        'news',
        'leadership',
        'marketPosition',
      ]

      const missingFields = expectedFields.filter(field => !data[field])
      const completeness = ((expectedFields.length - missingFields.length) / expectedFields.length) * 100

      // Check data freshness and source quality
      let sourceQuality = 100
      if (data.sources && Array.isArray(data.sources)) {
        const oldSources = data.sources.filter((s: any) => {
          if (!s.publishedAt) return false
          const age = Date.now() - new Date(s.publishedAt).getTime()
          return age > 90 * 24 * 60 * 60 * 1000 // 90 days
        })
        sourceQuality = Math.max(50, 100 - (oldSources.length / data.sources.length) * 30)
      }

      // Use LLM for deep quality assessment
      const qualityPrompt = this.buildQualityPrompt(companyName, data, missingFields, completeness)
      
      const response = await llmService.generateText({
        prompt: `You are a quality assurance expert specializing in business research. Assess quality rigorously and identify specific improvements.\n\n${qualityPrompt}`,
        maxTokens: 1500,
        temperature: 0.4,
      })

      const assessment = this.parseQualityAssessment(response.text)
      
      // Override with calculated completeness
      assessment.completeness = Math.round(completeness)

      const executionTime = Date.now() - startTime
      this.recordExecution(true, executionTime)

      return assessment
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordExecution(false, executionTime)
      throw error
    }
  }

  private buildQualityPrompt(
    companyName: string,
    data: any,
    missingFields?: string[],
    calculatedCompleteness?: number
  ): string {
    const missingFieldsSection = missingFields && missingFields.length > 0
      ? `\n**Missing Data Fields:**\n${missingFields.map(f => `- ${f}`).join('\n')}\n`
      : ''

    return `Conduct a comprehensive quality assessment for the research on **${companyName}**.
${missingFieldsSection}
**Research Data:**
${JSON.stringify(data, null, 2)}

**Quality Assessment Criteria:**

1. **Overall Quality Score** (0-100):
   - Data accuracy and reliability
   - Source credibility
   - Information depth
   - Recency of information

2. **Completeness:** ${calculatedCompleteness?.toFixed(0)}% (calculated)
   - Verify this matches the data coverage

3. **Accuracy Assessment** (0-100):
   - Factual correctness
   - Consistency across sources
   - Data verification level

4. **Identified Gaps** (list specific gaps):
   - Missing critical information
   - Areas needing deeper research
   - Outdated data points

5. **Improvement Recommendations** (5-7 specific actions):
   - Prioritized improvements
   - Additional research needed
   - Data verification steps

**Output Format (JSON):**
{
  "qualityScore": 85,
  "completeness": ${calculatedCompleteness || 80},
  "accuracy": 90,
  "gaps": ["gap 1", "gap 2", ...],
  "improvements": ["improvement 1", "improvement 2", ...]
}`
  }

  private parseQualityAssessment(text: string): {
    qualityScore: number
    completeness: number
    accuracy: number
    gaps: string[]
    improvements: string[]
  } {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          qualityScore: parsed.qualityScore || 75,
          completeness: parsed.completeness || 80,
          accuracy: parsed.accuracy || 85,
          gaps: parsed.gaps || [],
          improvements: parsed.improvements || [],
        }
      }
    } catch (e) {
      // Fallback
    }

    return {
      qualityScore: 75,
      completeness: 80,
      accuracy: 85,
      gaps: [],
      improvements: [],
    }
  }
}

