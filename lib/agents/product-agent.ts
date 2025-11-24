import { BaseAgent } from './base-agent'
import { searchWeb } from '@/lib/api-client'
import { Product } from '@/types'
import { getScrapingService } from '@/lib/services/web-scraping'
import { getLLMService } from '@/lib/services/llm-providers'
import { getVectorDBService } from '@/lib/services/vector-database'

/**
 * Product Agent - Analyzes products and services
 */
export class ProductAgent extends BaseAgent {
  constructor() {
    super(
      'Product Agent',
      'Analyzes products, services, and value propositions',
      ['product-analysis', 'service-research', 'value-proposition']
    )
  }

  async execute(input: any): Promise<{
    products: Product[]
    services: string[]
    valuePropositions: string[]
    pricing?: string
  }> {
    const startTime = Date.now()
    this.validateInput(input, ['companyName'])

    try {
      const { companyName, data } = input

      // Get services
      const scrapingService = getScrapingService()
      const llmService = getLLMService()
      const vectorDB = getVectorDBService()

      // Search for product pages
      const productQueries = [
        `${companyName} products page`,
        `${companyName} pricing`,
        `${companyName} solutions`,
      ]

      const allSources = []
      for (const query of productQueries) {
        const sources = await searchWeb(query, companyName)
        allSources.push(...sources)
      }

      // Scrape product pages for detailed information
      const productUrls = allSources
        .filter(s => s.url && !s.url.includes('example.com') && (s.url.includes('product') || s.url.includes('pricing') || s.url.includes('solution')))
        .slice(0, 3)
        .map(s => s.url)

      let scrapedContent = ''
      if (productUrls.length > 0) {
        try {
          const scrapedPages = await scrapingService.scrapeMultiple(productUrls, {
            javascript: true,
            timeout: 5000,
          })
          scrapedContent = scrapedPages
            .map(page => page.content.substring(0, 2000))
            .join('\n\n')
        } catch (error) {
          console.warn('Failed to scrape product pages:', error)
        }
      }

      // Retrieve relevant product context from vector DB
      let productContext = ''
      try {
        const contextDocs = await vectorDB.search(
          `${companyName} products services offerings`,
          { topK: 5, filter: { company: companyName } }
        )
        productContext = contextDocs.map(doc => doc.document.content).join('\n\n')
      } catch (error) {
        console.warn('Failed to retrieve product context:', error)
      }

      // Use LLM to extract structured product information
      const extractionPrompt = `Extract detailed product and service information for ${companyName}.

**Scraped Content:**
${scrapedContent}

**Search Results:**
${JSON.stringify(allSources.slice(0, 5), null, 2)}

**Historical Context:**
${productContext}

**Task:** Extract and structure the following:
1. Products (name, description, features)
2. Services (name, description)
3. Value propositions (key benefits)
4. Pricing information (if available)

**Output Format (JSON):**
{
  "products": [{"id": "1", "name": "Product Name", "description": "...", "features": ["..."]}, ...],
  "services": ["Service 1", "Service 2"],
  "valuePropositions": ["Value prop 1", "Value prop 2"],
  "pricing": "Pricing model description"
}`

      const extractionResult = await llmService.generateText({
        prompt: `You are a product analyst. Extract accurate, structured product information from the provided content.\n\n${extractionPrompt}`,
        maxTokens: 2000,
        temperature: 0.5,
      })

      // Parse LLM response
      let products: Product[] = []
      let services: string[] = []
      let valuePropositions: string[] = []
      let pricing: string | undefined

      try {
        const jsonMatch = extractionResult.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          products = parsed.products || []
          services = parsed.services || []
          valuePropositions = parsed.valuePropositions || []
          pricing = parsed.pricing
        }
      } catch (error) {
        console.warn('Failed to parse LLM product extraction:', error)
        // Fallback to basic extraction
        products = this.extractProducts(allSources, companyName)
        services = this.extractServices(allSources)
        valuePropositions = this.extractValuePropositions(allSources)
      }

      const executionTime = Date.now() - startTime
      this.recordExecution(true, executionTime)

      return {
        products,
        services,
        valuePropositions,
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordExecution(false, executionTime)
      throw error
    }
  }

  private extractProducts(sources: any[], companyName: string): Product[] {
    const products: Product[] = []
    const seen = new Set<string>()

    for (const source of sources) {
      if (source.snippet) {
        // Simple extraction - look for product names
        const productMatches = source.snippet.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g)
        if (productMatches) {
          for (const match of productMatches) {
            if (match.length > 3 && match.length < 30 && !seen.has(match)) {
              products.push({
                id: `product_${Date.now()}_${products.length}`,
                name: match,
                description: source.snippet.substring(0, 100),
              })
              seen.add(match)
            }
          }
        }
      }
    }

    return products.slice(0, 10)
  }

  private extractServices(sources: any[]): string[] {
    const services: string[] = []
    const serviceKeywords = ['service', 'solution', 'offering', 'platform']

    for (const source of sources) {
      if (source.snippet) {
        for (const keyword of serviceKeywords) {
          const matches = source.snippet.match(new RegExp(`([^.]*${keyword}[^.]*)`, 'gi'))
          if (matches) {
            services.push(...matches.map((m: string) => m.trim()).filter((m: string) => m.length > 10))
          }
        }
      }
    }

    return [...new Set(services)].slice(0, 10)
  }

  private extractValuePropositions(sources: any[]): string[] {
    const propositions: string[] = []
    const valueKeywords = ['benefit', 'advantage', 'value', 'feature', 'differentiator']

    for (const source of sources) {
      if (source.snippet) {
        for (const keyword of valueKeywords) {
          const matches = source.snippet.match(new RegExp(`([^.]*${keyword}[^.]*)`, 'gi'))
          if (matches) {
            propositions.push(...matches.map((m: string) => m.trim()).filter((m: string) => m.length > 15))
          }
        }
      }
    }

    return [...new Set(propositions)].slice(0, 10)
  }
}

