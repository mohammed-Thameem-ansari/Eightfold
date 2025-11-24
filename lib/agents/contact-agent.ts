import { BaseAgent } from './base-agent'
import { searchWeb } from '@/lib/api-client'
import { Contact } from '@/types'
import { getScrapingService } from '@/lib/services/web-scraping'
import { getLLMService } from '@/lib/services/llm-providers'

/**
 * Contact Agent - Finds and extracts contact information
 */
export class ContactAgent extends BaseAgent {
  constructor() {
    super(
      'Contact Agent',
      'Finds and extracts contact information and decision makers',
      ['contact-discovery', 'lead-generation', 'executive-search']
    )
  }

  async execute(input: any): Promise<{
    contacts: Contact[]
    decisionMakers: Contact[]
    orgStructure: string
  }> {
    const startTime = Date.now()
    this.validateInput(input, ['companyName'])

    try {
      const { companyName, data } = input

      // Search for contacts
      const contactQueries = [
        `${companyName} leadership team`,
        `${companyName} about team page`,
        `${companyName} executives LinkedIn`,
      ]

      const allSources = []
      for (const query of contactQueries) {
        const sources = await searchWeb(query, companyName)
        allSources.push(...sources)
      }

      // Scrape company website for team/about pages
      const scrapingService = getScrapingService()
      const llmService = getLLMService()
      
      let scrapedTeamInfo = ''
      const teamPages = allSources
        .filter(s => s.url && !s.url.includes('example.com') && (s.url.includes('about') || s.url.includes('team') || s.url.includes('leadership')))
        .slice(0, 2)
        .map(s => s.url)

      if (teamPages.length > 0) {
        try {
          const scrapedPages = await scrapingService.scrapeMultiple(teamPages, {
            javascript: true,
            timeout: 5000,
          })
          scrapedTeamInfo = scrapedPages
            .map(page => page.content.substring(0, 3000))
            .join('\n\n')
        } catch (error) {
          console.warn('Failed to scrape team pages:', error)
        }
      }

      // Use LLM to extract structured contact information
      const extractionPrompt = `Extract executive and decision-maker contact information for ${companyName}.

**Scraped Team Pages:**
${scrapedTeamInfo}

**Search Results:**
${JSON.stringify(allSources.slice(0, 5), null, 2)}

**Task:** Extract structured contact information including:
- Name
- Title/Role
- Level (executive/manager/individual)
- Email (if available)
- LinkedIn URL (if available)

**Output Format (JSON):**
{
  "contacts": [
    {"id": "1", "name": "John Doe", "title": "CEO", "level": "executive", "email": "john@company.com"},
    ...
  ],
  "orgStructure": "Brief description of org structure"
}`

      let contacts: Contact[] = []
      let orgStructure = ''

      try {
        const extractionResult = await llmService.generateWithFallback(
          `You are an expert at extracting contact information. Be accurate and only include information explicitly stated in the sources.\n\n${extractionPrompt}`,
          'gemini',
          {
            maxTokens: 1500,
            temperature: 0.3,
          }
        )

        const jsonMatch = extractionResult.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          contacts = parsed.contacts || []
          orgStructure = parsed.orgStructure || this.inferOrgStructure(contacts)
        }
      } catch (error) {
        console.warn('LLM contact extraction failed:', error)
        contacts = this.extractContacts(allSources, companyName)
        orgStructure = this.inferOrgStructure(contacts)
      }

      const decisionMakers = contacts.filter(c => c.level === 'executive')

      const executionTime = Date.now() - startTime
      this.recordExecution(true, executionTime)

      return {
        contacts,
        decisionMakers,
        orgStructure: this.inferOrgStructure(contacts),
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordExecution(false, executionTime)
      throw error
    }
  }

  private extractContacts(sources: any[], companyName: string): Contact[] {
    const contacts: Contact[] = []
    const seen = new Set<string>()

    // Extract from snippets
    for (const source of sources) {
      if (source.snippet) {
        const extracted = this.parseContactsFromText(source.snippet, companyName)
        for (const contact of extracted) {
          const key = `${contact.name}_${contact.title}`
          if (!seen.has(key)) {
            contacts.push(contact)
            seen.add(key)
          }
        }
      }
    }

    return contacts
  }

  private parseContactsFromText(text: string, companyName: string): Contact[] {
    const contacts: Contact[] = []
    
    // Look for executive titles
    const titlePatterns = [
      /(CEO|Chief Executive Officer)/i,
      /(CTO|Chief Technology Officer)/i,
      /(CFO|Chief Financial Officer)/i,
      /(CMO|Chief Marketing Officer)/i,
      /(COO|Chief Operating Officer)/i,
      /(VP|Vice President)/i,
      /(Director)/i,
    ]

    // Simple extraction - in production, use NLP
    const lines = text.split('\n')
    for (const line of lines) {
      for (const pattern of titlePatterns) {
        if (pattern.test(line)) {
          const match = line.match(/([A-Z][a-z]+ [A-Z][a-z]+).*?(CEO|CTO|CFO|CMO|COO|VP|Director)/i)
          if (match) {
            contacts.push({
              id: `contact_${Date.now()}_${contacts.length}`,
              name: match[1] || 'Unknown',
              title: match[2] || 'Executive',
              level: this.determineLevel(match[2] || ''),
            })
          }
        }
      }
    }

    return contacts
  }

  private determineLevel(title: string): 'executive' | 'manager' | 'individual' {
    if (/CEO|CTO|CFO|CMO|COO|Chief/i.test(title)) return 'executive'
    if (/VP|Vice President|Director/i.test(title)) return 'manager'
    return 'individual'
  }

  private inferOrgStructure(contacts: Contact[]): string {
    const executives = contacts.filter(c => c.level === 'executive')
    const managers = contacts.filter(c => c.level === 'manager')
    
    return `Organization has ${executives.length} executives and ${managers.length} managers identified.`
  }
}

