import { BaseAgent } from './base-agent'
import { searchWeb } from '@/lib/api-client'
import { Source } from '@/types'

/**
 * Research Agent - Gathers comprehensive company information
 */
export class ResearchAgent extends BaseAgent {
  constructor() {
    super(
      'Research Agent',
      'Gathers comprehensive company information from multiple sources',
      ['web-search', 'data-collection', 'source-verification']
    )
  }

  async execute(input: any): Promise<{
    sources: Source[]
    summary: string
    keyFindings: string[]
  }> {
    const startTime = Date.now()
    this.validateInput(input, ['companyName'])

    try {
      const { companyName, focus = 'overview' } = input

      // Perform multiple searches
      const searchQueries = this.generateSearchQueries(companyName, focus)
      const allSources: Source[] = []
      const keyFindings: string[] = []

      for (const query of searchQueries) {
        const sources = await searchWeb(query, companyName)
        allSources.push(...sources)

        // Extract key findings from snippets
        for (const source of sources) {
          if (source.snippet) {
            const findings = this.extractFindings(source.snippet)
            keyFindings.push(...findings)
          }
        }
      }

      // Remove duplicates
      const uniqueSources = this.deduplicateSources(allSources)
      const uniqueFindings = [...new Set(keyFindings)]

      const summary = this.generateSummary(companyName, uniqueFindings, focus)

      const executionTime = Date.now() - startTime
      this.recordExecution(true, executionTime)

      return {
        sources: uniqueSources,
        summary,
        keyFindings: uniqueFindings,
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordExecution(false, executionTime)
      throw error
    }
  }

  private generateSearchQueries(companyName: string, focus: string): string[] {
    const baseQueries = [
      `${companyName} company information`,
      `${companyName} overview`,
      `${companyName} business`,
    ]

    const focusQueries: Record<string, string[]> = {
      overview: [
        `${companyName} company profile`,
        `${companyName} about`,
        `${companyName} history`,
      ],
      'recent-news': [
        `${companyName} latest news`,
        `${companyName} recent developments`,
        `${companyName} press releases`,
      ],
      'products-services': [
        `${companyName} products`,
        `${companyName} services`,
        `${companyName} offerings`,
      ],
      'market-position': [
        `${companyName} market position`,
        `${companyName} industry`,
        `${companyName} competitors`,
      ],
      'decision-makers': [
        `${companyName} leadership team`,
        `${companyName} executives`,
        `${companyName} management`,
      ],
    }

    return [...baseQueries, ...(focusQueries[focus] || [])]
  }

  private extractFindings(snippet: string): string[] {
    const sentences = snippet.split(/[.!?]+/).filter(s => s.trim().length > 20)
    return sentences.slice(0, 3) // Top 3 findings per source
  }

  private deduplicateSources(sources: Source[]): Source[] {
    const seen = new Set<string>()
    return sources.filter(source => {
      const key = source.url
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private generateSummary(companyName: string, findings: string[], focus: string): string {
    return `Research completed for ${companyName} focusing on ${focus}. Found ${findings.length} key findings from multiple sources.`
  }
}

