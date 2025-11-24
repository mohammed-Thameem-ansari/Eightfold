import { BaseAgent } from './base-agent'
import { callGeminiWithTools } from '@/lib/api-client'
import { getLLMService } from '@/lib/services/llm-providers'
import { getVectorDBService } from '@/lib/services/vector-database'

/**
 * Analysis Agent - Performs deep analysis on collected data
 */
export class AnalysisAgent extends BaseAgent {
  constructor() {
    super(
      'Analysis Agent',
      'Performs deep analysis and extracts insights from research data',
      ['data-analysis', 'insight-extraction', 'pattern-recognition']
    )
  }

  async execute(input: any): Promise<{
    insights: string[]
    patterns: string[]
    conclusions: string[]
    confidence: number
  }> {
    const startTime = Date.now()
    this.validateInput(input, ['companyName', 'data'])

    try {
      const { companyName, data } = input

      // Retrieve relevant context from vector database
      const vectorDB = getVectorDBService()
      const llmService = getLLMService()
      
      let relevantContext: string[] = []
      try {
        const contextDocs = await vectorDB.search(
          `${companyName} business analysis insights patterns`,
          {
            topK: 10,
            filter: { company: companyName },
          }
        )
        relevantContext = contextDocs.map((doc, i) => 
          `[Context ${i + 1}] ${doc.document.content.substring(0, 400)}`
        )
      } catch (error) {
        console.warn('Failed to retrieve context:', error)
      }

      // Analyze data using RAG-enhanced LLM
      const analysisPrompt = `You are an expert business analyst with deep knowledge of market trends, competitive dynamics, and strategic planning. Analyze data thoroughly and provide actionable insights.\n\n${this.buildAnalysisPrompt(companyName, data, relevantContext)}`
      
      const response = await llmService.generateText({
        prompt: analysisPrompt,
        maxTokens: 2000,
        temperature: 0.7,
      })

      const analysis = this.parseAnalysisResponse(response.text)

      const executionTime = Date.now() - startTime
      this.recordExecution(true, executionTime)

      return {
        insights: analysis.insights,
        patterns: analysis.patterns,
        conclusions: analysis.conclusions,
        confidence: analysis.confidence,
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordExecution(false, executionTime)
      throw error
    }
  }

  private buildAnalysisPrompt(companyName: string, data: any, context: string[]): string {
    const contextSection = context.length > 0
      ? `\n\n**Relevant Context from Previous Research:**\n${context.join('\n\n')}\n`
      : ''

    return `Analyze the following research data for ${companyName}:
${contextSection}
**Current Data:**
${JSON.stringify(data, null, 2)}

**Analysis Requirements:**
1. **Key Insights** (3-5 strategic insights with business impact)
2. **Identified Patterns** (2-4 recurring patterns or trends)
3. **Conclusions** (2-3 evidence-based conclusions)
4. **Confidence Level** (0-1, based on data quality and consistency)

**Output Format:**
Provide your response as a JSON object with the following structure:
{
  "insights": ["insight 1", "insight 2", ...],
  "patterns": ["pattern 1", "pattern 2", ...],
  "conclusions": ["conclusion 1", "conclusion 2", ...],
  "confidence": 0.85
}

Focus on actionable, strategic insights backed by the data and context provided.`
  }

  private parseAnalysisResponse(text: string): {
    insights: string[]
    patterns: string[]
    conclusions: string[]
    confidence: number
  } {
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          insights: parsed.insights || [],
          patterns: parsed.patterns || [],
          conclusions: parsed.conclusions || [],
          confidence: parsed.confidence || 0.7,
        }
      }
    } catch (e) {
      // Fallback parsing
    }

    // Fallback: extract from text
    const insights = this.extractListItems(text, 'insights')
    const patterns = this.extractListItems(text, 'patterns')
    const conclusions = this.extractListItems(text, 'conclusions')
    const confidenceMatch = text.match(/confidence[:\s]+([0-9.]+)/i)
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7

    return { insights, patterns, conclusions, confidence }
  }

  private extractListItems(text: string, keyword: string): string[] {
    const regex = new RegExp(`${keyword}[:\s]+([^]*?)(?=\\n\\n|$)`, 'i')
    const match = text.match(regex)
    if (!match) return []

    const items = match[1]
      .split(/\n|•|-/)
      .map(item => item.trim())
      .filter(item => item.length > 10)
      .slice(0, 5)

    return items
  }
}

