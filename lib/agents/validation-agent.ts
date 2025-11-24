import { BaseAgent } from './base-agent'
import { validateCompanyName, validateSearchQuery } from '@/lib/validators'
import { Source } from '@/types'
import { getLLMService } from '@/lib/services/llm-providers'
import { getVectorDBService } from '@/lib/services/vector-database'

/**
 * Validation Agent - Validates data quality and accuracy
 */
export class ValidationAgent extends BaseAgent {
  constructor() {
    super(
      'Validation Agent',
      'Validates data quality, accuracy, and completeness',
      ['validation', 'quality-check', 'verification']
    )
  }

  async execute(input: any): Promise<{
    isValid: boolean
    issues: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }>
    score: number
    recommendations: string[]
  }> {
    const startTime = Date.now()
    this.validateInput(input, ['companyName', 'data'])

    try {
      const { companyName, data } = input

      const issues: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> = []
      const recommendations: string[] = []

      // Validate company name
      const nameValidation = validateCompanyName(companyName)
      if (!nameValidation.valid) {
        issues.push({
          type: 'company-name',
          message: nameValidation.errors[0]?.message || 'Invalid company name',
          severity: 'high',
        })
      }

      // Validate data completeness
      if (!data || Object.keys(data).length === 0) {
        issues.push({
          type: 'data-completeness',
          message: 'No data provided',
          severity: 'high',
        })
      }

      // Validate sources
      if (data.sources) {
        const sourceIssues = this.validateSources(data.sources)
        issues.push(...sourceIssues)
      }

      // Validate content quality
      if (data.content) {
        const contentIssues = this.validateContent(data.content)
        issues.push(...contentIssues)
      }

      // AI-powered fact checking and quality assessment
      try {
        const llmService = getLLMService()
        const vectorDB = getVectorDBService()

        // Check for factual accuracy using RAG
        const relevantFacts = await vectorDB.search(
          `${companyName} facts verification`,
          { topK: 5, filter: { company: companyName } }
        )

        if (relevantFacts.length > 0 && data.content) {
          const factCheckPrompt = `You are a fact-checker. Review the following content for accuracy:

**Content to Validate:**
${data.content.substring(0, 1000)}

**Reference Facts:**
${relevantFacts.map((f, i) => `${i + 1}. ${f.document.content}`).join('\n')}

**Task:** Identify any factual inconsistencies, outdated information, or unsupported claims. Format as JSON:
{
  "hasIssues": true/false,
  "issues": ["issue 1", "issue 2"],
  "confidence": 0.0-1.0
}`

          const factCheckResult = await llmService.generateText({
            prompt: factCheckPrompt,
            maxTokens: 500,
            temperature: 0.3,
          })

          try {
            const parsed = JSON.parse(factCheckResult.text.match(/\{[\s\S]*\}/)?.[0] || '{}')
            if (parsed.hasIssues && parsed.issues) {
              for (const issue of parsed.issues) {
                issues.push({
                  type: 'fact-check',
                  message: issue,
                  severity: 'medium',
                })
              }
            }
          } catch (e) {
            // Parsing failed, skip
          }
        }
      } catch (error) {
        console.warn('AI validation failed:', error)
      }

      // Generate recommendations
      if (issues.length > 0) {
        recommendations.push(...this.generateRecommendations(issues))
      }

      // Calculate score (0-100)
      const score = this.calculateScore(issues)
      const isValid = score >= 70

      const executionTime = Date.now() - startTime
      this.recordExecution(true, executionTime)

      return {
        isValid,
        issues,
        score,
        recommendations,
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordExecution(false, executionTime)
      throw error
    }
  }

  private validateSources(sources: Source[]): Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> {
    const issues: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> = []

    if (sources.length === 0) {
      issues.push({
        type: 'sources',
        message: 'No sources provided',
        severity: 'high',
      })
    } else if (sources.length < 3) {
      issues.push({
        type: 'sources',
        message: 'Limited number of sources',
        severity: 'medium',
      })
    }

    // Check source quality
    const invalidUrls = sources.filter(s => !s.url || !s.url.startsWith('http'))
    if (invalidUrls.length > 0) {
      issues.push({
        type: 'sources',
        message: `${invalidUrls.length} sources have invalid URLs`,
        severity: 'medium',
      })
    }

    return issues
  }

  private validateContent(content: string): Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> {
    const issues: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> = []

    if (!content || content.trim().length === 0) {
      issues.push({
        type: 'content',
        message: 'Content is empty',
        severity: 'high',
      })
    } else if (content.length < 100) {
      issues.push({
        type: 'content',
        message: 'Content is too short',
        severity: 'medium',
      })
    }

    // Check for placeholder text
    if (content.includes('TODO') || content.includes('FIXME') || content.includes('XXX')) {
      issues.push({
        type: 'content',
        message: 'Content contains placeholder text',
        severity: 'medium',
      })
    }

    return issues
  }

  private generateRecommendations(issues: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }>): string[] {
    const recommendations: string[] = []

    const highSeverityIssues = issues.filter(i => i.severity === 'high')
    if (highSeverityIssues.length > 0) {
      recommendations.push(`Address ${highSeverityIssues.length} high-severity issues`)
    }

    const sourceIssues = issues.filter(i => i.type === 'sources')
    if (sourceIssues.length > 0) {
      recommendations.push('Gather more sources to improve credibility')
    }

    const contentIssues = issues.filter(i => i.type === 'content')
    if (contentIssues.length > 0) {
      recommendations.push('Expand content with more details and insights')
    }

    return recommendations
  }

  private calculateScore(issues: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }>): number {
    let score = 100

    for (const issue of issues) {
      switch (issue.severity) {
        case 'high':
          score -= 20
          break
        case 'medium':
          score -= 10
          break
        case 'low':
          score -= 5
          break
      }
    }

    return Math.max(0, Math.min(100, score))
  }
}

