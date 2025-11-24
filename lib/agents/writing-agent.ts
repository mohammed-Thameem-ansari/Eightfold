import { BaseAgent } from './base-agent'
import { callGeminiWithTools } from '@/lib/api-client'
import { getLLMService } from '@/lib/services/llm-providers'
import { getVectorDBService } from '@/lib/services/vector-database'

/**
 * Writing Agent - Generates high-quality written content
 */
export class WritingAgent extends BaseAgent {
  constructor() {
    super(
      'Writing Agent',
      'Generates high-quality written content for account plans and reports',
      ['content-generation', 'writing', 'formatting']
    )
  }

  async execute(input: any): Promise<{
    content: string
    sections: Array<{ title: string; content: string }>
    wordCount: number
  }> {
    const startTime = Date.now()
    this.validateInput(input, ['companyName', 'data'])

    try {
      const { companyName, data, sectionType } = input

      // Retrieve relevant writing examples and context from vector database
      const vectorDB = getVectorDBService()
      const llmService = getLLMService()
      
      let relevantContext: string[] = []
      let writingExamples: string[] = []
      
      try {
        // Get company-specific context
        const contextDocs = await vectorDB.search(
          `${companyName} ${sectionType || 'account plan'} information`,
          {
            topK: 8,
            filter: { company: companyName },
          }
        )
        relevantContext = contextDocs.map((doc, i) => 
          `[Source ${i + 1}] ${doc.document.content.substring(0, 350)}`
        )

        // Get writing style examples if available
        const styleExamples = await vectorDB.search(
          `professional business writing ${sectionType || 'account plan'}`,
          { topK: 3 }
        )
        writingExamples = styleExamples
          .filter(doc => doc.score > 0.6)
          .map((doc, i) => `[Example ${i + 1}] ${doc.document.content.substring(0, 250)}`)
      } catch (error) {
        console.warn('Failed to retrieve writing context:', error)
      }

      const writingPrompt = `You are an expert business writer specializing in account plans, strategic documents, and executive communications. Write with clarity, precision, and professional tone. Use data-driven insights and maintain consistency across sections.\n\n${this.buildWritingPrompt(
        companyName,
        data,
        sectionType,
        relevantContext,
        writingExamples
      )}`
      
      const response = await llmService.generateText({
        prompt: writingPrompt,
        maxTokens: 3000,
        temperature: 0.7,
      })

      const content = response.text
      const sections = this.extractSections(content)
      const wordCount = content.split(/\s+/).length

      const executionTime = Date.now() - startTime
      this.recordExecution(true, executionTime)

      return {
        content,
        sections,
        wordCount,
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordExecution(false, executionTime)
      throw error
    }
  }

  private buildWritingPrompt(
    companyName: string,
    data: any,
    sectionType?: string,
    context?: string[],
    examples?: string[]
  ): string {
    const sectionGuidance = sectionType
      ? `Focus on writing the **${sectionType}** section.`
      : 'Write a comprehensive account plan covering all key areas.'

    const contextSection = context && context.length > 0
      ? `\n\n**Relevant Research Context:**\n${context.join('\n\n')}\n`
      : ''

    const examplesSection = examples && examples.length > 0
      ? `\n\n**Professional Writing Examples:**\n${examples.join('\n\n')}\n`
      : ''

    return `Write a professional, executive-ready account plan section for **${companyName}**.
${contextSection}${examplesSection}
**Research Data:**
${JSON.stringify(data, null, 2)}

**Writing Instructions:**
${sectionGuidance}

**Requirements:**
1. **Professional Tone:** Executive-level, strategic, data-driven
2. **Structure:** Use clear headings (## for main, ### for sub), bullet points, and numbered lists
3. **Specificity:** Include concrete data points, metrics, and examples from the research
4. **Citations:** Reference sources naturally (e.g., "According to [Source]...")
5. **Length:** Comprehensive but focused (aim for 400-800 words per major section)
6. **Formatting:** Use markdown formatting (**bold** for emphasis, *italic* for terms, > for key quotes)
7. **Actionability:** Provide clear insights and recommendations

**Output:** Write the complete section with professional business writing quality, ready for client presentation.`
  }

  private extractSections(content: string): Array<{ title: string; content: string }> {
    const sections: Array<{ title: string; content: string }> = []
    const headingRegex = /^(#{1,3})\s+(.+)$/gm
    let lastIndex = 0
    let lastTitle = 'Introduction'

    let match
    while ((match = headingRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        sections.push({
          title: lastTitle,
          content: content.substring(lastIndex, match.index).trim(),
        })
      }
      lastTitle = match[2]
      lastIndex = match.index + match[0].length
    }

    // Add final section
    if (lastIndex < content.length) {
      sections.push({
        title: lastTitle,
        content: content.substring(lastIndex).trim(),
      })
    }

    return sections.length > 0 ? sections : [{ title: 'Content', content }]
  }
}

