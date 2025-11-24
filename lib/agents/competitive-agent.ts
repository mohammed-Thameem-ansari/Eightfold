import { BaseAgent } from './base-agent'
import { searchWeb } from '@/lib/api-client'
import { callGeminiWithTools } from '@/lib/api-client'
import { getScrapingService } from '@/lib/services/web-scraping'
import { getLLMService } from '@/lib/services/llm-providers'

/**
 * Competitive Agent - Analyzes competitive landscape
 */
export class CompetitiveAgent extends BaseAgent {
  constructor() {
    super(
      'Competitive Agent',
      'Analyzes competitive landscape and market positioning',
      ['competitive-analysis', 'market-research', 'benchmarking']
    )
  }

  async execute(input: any): Promise<{
    competitors: Array<{ name: string; description: string; strengths: string[]; website?: string }>
    marketPosition: string
    competitiveAdvantages: string[]
    threats: string[]
    detailedAnalysis?: any
  }> {
    const startTime = Date.now()
    this.validateInput(input, ['companyName'])

    try {
      const { companyName, data } = input
      const scrapingService = getScrapingService()

      // Search for competitors
      const competitorQueries = [
        `${companyName} competitors`,
        `${companyName} vs competitors`,
        `${companyName} market share`,
        `top companies in ${companyName} industry`,
      ]

      const allSources = []
      for (const query of competitorQueries) {
        const sources = await searchWeb(query, companyName)
        allSources.push(...sources)
      }

      // Extract competitor URLs for scraping
      const competitorUrls = allSources
        .map(s => s.url)
        .filter(url => !url.includes('youtube') && !url.includes('facebook') && !url.includes('example.com'))
        .slice(0, 5)

      // Scrape competitor websites for detailed analysis
      let scrapedData: any[] = []
      try {
        scrapedData = await scrapingService.scrapeMultiple(competitorUrls, {
          javascript: true,
          timeout: 5000
        })
      } catch (error) {
        console.error('Web scraping error:', error)
      }

      // Use LLM service for analysis
      const llmService = getLLMService()
      const analysisPrompt = this.buildAnalysisPrompt(companyName, {
        webSources: allSources.slice(0, 10),
        scrapedContent: scrapedData.map(d => ({
          url: d.url,
          title: d.title,
          content: d.content.slice(0, 500)
        }))
      })

      const response = await llmService.generateWithFallback(
        analysisPrompt,
        'gemini'
      )

      const analysis = this.parseCompetitiveAnalysis(response.text)

      // Enhance with scraped data
      const detailedAnalysis = scrapedData.length > 0 ? {
        competitorWebsites: scrapedData.map(d => ({
          url: d.url,
          title: d.title,
          keyProducts: this.extractProducts(d.content),
          metadata: d.metadata
        }))
      } : undefined

      const executionTime = Date.now() - startTime
      this.recordExecution(true, executionTime)

      return {
        ...analysis,
        detailedAnalysis
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordExecution(false, executionTime)
      throw error
    }
  }

  private buildAnalysisPrompt(companyName: string, data: any): string {
    return `Analyze the competitive landscape for ${companyName} based on the following data:

Web Sources:
${JSON.stringify(data.webSources, null, 2)}

Scraped Competitor Content:
${JSON.stringify(data.scrapedContent, null, 2)}

Please provide:
1. List of main competitors (name, description, key strengths, website if available)
2. Market position assessment
3. Competitive advantages of ${companyName}
4. Competitive threats

Format as JSON with keys: competitors (array), marketPosition (string), competitiveAdvantages (array), threats (array).`
  }

  private parseCompetitiveAnalysis(text: string): {
    competitors: Array<{ name: string; description: string; strengths: string[]; website?: string }>
    marketPosition: string
    competitiveAdvantages: string[]
    threats: string[]
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
      competitors: [],
      marketPosition: 'Analysis in progress',
      competitiveAdvantages: [],
      threats: [],
    }
  }

  private extractProducts(content: string): string[] {
    const productKeywords = ['product', 'service', 'solution', 'platform', 'tool']
    const lines = content.split('\n')
    const products: string[] = []

    for (const line of lines) {
      const lowerLine = line.toLowerCase()
      if (productKeywords.some(kw => lowerLine.includes(kw))) {
        products.push(line.trim().slice(0, 100))
      }
      if (products.length >= 5) break
    }

    return products
  }
}

