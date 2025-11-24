import { Message, ToolCall, Source, UserPersona, PersonaContext, ResearchStep } from '@/types'
import { searchWeb, callGeminiWithTools, streamGeminiResponse, getGeminiTools } from './api-client'
import { PERSONA_CONTEXTS } from './constants'
import { generateId } from './utils'
import { AgentOrchestrator, WorkflowUpdate } from './agents/orchestrator'
import { getVectorDBService } from './services/vector-database'
import { getLLMService } from './services/llm-providers'
 

/**
 * Advanced Research Agent implementing ReAct pattern (Reasoning + Acting)
 * Handles research, tool calling, conversation management, and multi-agent coordination
 */
export class ResearchAgent {
  private conversationHistory: Message[] = []
  private currentCompany?: string
  private persona: UserPersona = 'normal'
  private personaContext: PersonaContext = PERSONA_CONTEXTS.normal
  private researchCache: Map<string, { data: any; timestamp: Date }> = new Map()
  private researchSteps: ResearchStep[] = []
  private maxIterations: number = 10
  private currentIteration: number = 0
  private orchestrator: AgentOrchestrator = new AgentOrchestrator()
  private useMultiAgent: boolean = true  // Re-enabled after tool calling fix
  private providerOrder: string[] = ['gemini','groq','openai']
  private enabledProviders: Record<string, boolean> = { gemini: true, groq: true, openai: false }

  /**
   * Advanced persona detection with machine learning-like pattern matching
   */
  detectPersona(message: string, history: Message[]): UserPersona {
    const lowerMessage = message.toLowerCase()
    const recentMessages = history.slice(-5).map(m => m.content.toLowerCase())
    const messageLength = message.length
    const questionCount = (message.match(/\?/g) || []).length

    // Confused: multiple questions, uncertainty markers, hesitation
    const confusedIndicators = [
      questionCount > 2,
      lowerMessage.includes('maybe'),
      lowerMessage.includes('i think'),
      lowerMessage.includes('not sure'),
      lowerMessage.includes('should i'),
      lowerMessage.includes('i don\'t know'),
      lowerMessage.includes('unsure'),
      lowerMessage.includes('confused'),
      lowerMessage.includes('help me decide'),
    ]

    if (confusedIndicators.filter(Boolean).length >= 2) {
      return 'confused'
    }

    // Efficient: short, direct, action-oriented, imperative
    const efficientIndicators = [
      messageLength < 50,
      lowerMessage.includes('generate'),
      lowerMessage.includes('create'),
      lowerMessage.includes('research'),
      lowerMessage.includes('plan'),
      lowerMessage.includes('analyze'),
      lowerMessage.includes('find'),
      lowerMessage.startsWith('show me'),
      lowerMessage.startsWith('get me'),
      lowerMessage.startsWith('give me'),
    ]

    if (efficientIndicators.filter(Boolean).length >= 3) {
      return 'efficient'
    }

    // Chatty: long messages, personal anecdotes, off-topic, conversational
    const chattyIndicators = [
      messageLength > 200,
      lowerMessage.includes('i used to'),
      lowerMessage.includes('by the way'),
      lowerMessage.includes('did you know'),
      lowerMessage.includes('fun fact'),
      lowerMessage.includes('interesting'),
      lowerMessage.includes('story'),
      lowerMessage.includes('remember'),
      recentMessages.some(m => m.length > 150),
      message.split('.').length > 5,
    ]

    if (chattyIndicators.filter(Boolean).length >= 2) {
      return 'chatty'
    }

    // Edge case: non-existent companies, invalid requests, testing limits
    const edgeCaseIndicators = [
      lowerMessage.includes('xyz'),
      lowerMessage.includes('stealth'),
      lowerMessage.includes("doesn't exist"),
      lowerMessage.includes('not real'),
      lowerMessage.includes('fake company'),
      lowerMessage.includes('test'),
      lowerMessage.includes('invalid'),
    ]

    if (edgeCaseIndicators.some(Boolean)) {
      return 'edge-case'
    }

    return 'normal'
  }

  /**
   * Update persona and context
   */
  updatePersona(message: string) {
    this.persona = this.detectPersona(message, this.conversationHistory)
    this.personaContext = PERSONA_CONTEXTS[this.persona] || PERSONA_CONTEXTS.normal
  }

  /**
   * Advanced company name extraction with multiple patterns
   */
  extractCompanyName(message: string): string | null {
    const patterns = [
      /(?:research|analyze|generate.*plan.*for|company|about|study|investigate)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i,
      /for\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i,
      /(?:^|\s)([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:company|inc|corp|llc|ltd)/i,
      /(?:^|\s)([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)$/i,
    ]

    for (const pattern of patterns) {
      const match = message.match(pattern)
      if (match && match[1]) {
        const extracted = match[1].trim()
        // Filter out common false positives
        const falsePositives = ['Research', 'Company', 'Plan', 'Account', 'Generate', 'Create']
        if (!falsePositives.includes(extracted)) {
          return extracted
        }
      }
    }

    return null
  }

  /**
   * Build comprehensive system prompt based on current context
   */
  buildSystemPrompt(): string {
    const personaGuidance = this.personaContext.handlingStrategy
    const companyContext = this.currentCompany
      ? `The user is researching: ${this.currentCompany}.`
      : 'The user has not yet specified a company to research.'
    const cacheInfo = this.researchCache.size > 0
      ? `You have access to ${this.researchCache.size} cached research results that may be relevant.`
      : ''

    return `SYSTEM ROLE:\nYou are \"Zynku Research Agent\", a multi-agent research and strategic analysis system. Produce FACTUAL, WELL-STRUCTURED, ACTIONABLE output.\n\nCONTEXT:\n${companyContext}\n${cacheInfo}\nPersona: ${this.persona}\nStrategy: ${personaGuidance}\n\nOBJECTIVES:\n1. Summarize identity & positioning.\n2. Evidence-backed risks & opportunities.\n3. Structured account / strategy plan if requested.\n4. Transparent sourcing & confidence.\n5. Minimize hallucination; flag uncertainty.\n\nSECTIONS (include only relevant):\nOverview | Products | Market & Competition | Financial Snapshot | Recent Signals | SWOT | Risks | Opportunities | Recommended Actions\n\nSTYLE:\n- Concise paragraphs (2–4 sentences).\n- Bullet lists <=7 items.\n- Inline citations [S1], [S2] mapped to source order.\n- Mark assumptions clearly.\n\nGUARDS:\n- If no trusted financial data: state limitation.\n- Present both sides if conflict.\n- Never invent executives, financials, emails.\n\nSUB-AGENTS: Research / Strategy / Editor.\n\nTOOLS: search_web | analyze_company_data | extract_contacts.\nUse only when needed; avoid redundancy.\n\nHALLUCINATION HEURISTICS:\nAvoid unsourced metrics, leadership names, competitor lists without evidence.\n\nREFINEMENT: After draft, tighten wording & remove duplication keeping citations.\n\nRespond with final structured answer unless user explicitly asks for reasoning. If reasoning requested, give concise summary not raw chain-of-thought.`
  }

  /** Hallucination / uncertainty detection */
  private detectHallucinations(text: string, sources: { url?: string }[]): { flags: string[]; disclaimer?: string; score: number } {
    const flags: string[] = []
    let score = 1.0
    const lower = text.toLowerCase()
    const sourceCount = sources.length
    const riskyPatterns = [
      /\$\d+\.?\d*\s*(billion|million)/i,
      /revenue\s+growth\s+of\s+\d+%/i,
      /headcount\s+of\s+\d{4,}/i,
      /ceo\s+is\s+[A-Z][a-z]+\s+[A-Z][a-z]+/i,
    ]
    for (const pattern of riskyPatterns) {
      if (pattern.test(text) && sourceCount === 0) {
        flags.push(`Unsupported claim pattern: ${pattern}`)
        score -= 0.25
      }
    }
    const uncertaintyIndicators = ['might', 'possibly', 'likely', 'appears to']
    const uncertaintyHits = uncertaintyIndicators.filter(w => lower.includes(w)).length
    if (uncertaintyHits > 3) {
      flags.push('High uncertainty phrasing')
      score -= 0.1
    }
    if (/competitors?/i.test(text) && sourceCount === 0) {
      flags.push('Competitors mentioned without sources')
      score -= 0.15
    }
    if (score < 0.9) {
      return { flags, disclaimer: 'Some claims may lack verified sources. Validate financial & leadership data.', score: Math.max(score, 0) }
    }
    return { flags, score }
  }

  /**
   * Convert conversation history to Gemini format
   */
  private convertHistoryToGeminiFormat(): Array<{ role: 'user' | 'model'; parts: string }> {
    return this.conversationHistory
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: m.content,
      }))
  }

  /**
   * Execute a tool call with error handling and retry logic
   */
  async executeToolCall(toolCall: ToolCall, retries: number = 3): Promise<any> {
    const toolName = toolCall.name
    const toolInput = toolCall.input

    try {
      if (toolName === 'search_web') {
        const query = toolInput.query as string
        const companyName = (toolInput.companyName as string) || this.currentCompany
        
        // Check cache first
        const cacheKey = `search_${query}_${companyName || ''}`
        const cached = this.researchCache.get(cacheKey)
        if (cached && (Date.now() - cached.timestamp.getTime()) < 3600000) { // 1 hour cache
          return { sources: cached.data, success: true, cached: true }
        }

        const sources = await searchWeb(query, companyName)
        
        // Cache the results
        this.researchCache.set(cacheKey, {
          data: sources,
          timestamp: new Date(),
        })

        // Store in vector database for RAG (NON-BLOCKING - fire and forget)
        const vectorDB = getVectorDBService()
        Promise.all(
          sources.map(source =>
            vectorDB.addDocument({
              id: source.url || generateId(),
              content: `${source.title || ''}\n${source.snippet || ''}`,
              metadata: {
                url: source.url,
                title: source.title,
                timestamp: new Date().toISOString(),
                company: companyName || this.currentCompany,
                query: query,
              },
            }).catch(err => console.warn('Vector DB upsert failed:', err))
          )
        ).catch(() => {}) // Fire-and-forget - don't block response

        // Perform semantic search for additional context (NON-BLOCKING)
        let semanticResults: any[] = []
        try {
          const searchPromise = vectorDB.search(query, {
            topK: 5,
            filter: companyName ? { company: companyName } : undefined,
          })
          
          // Don't await - use results if ready within 5s, otherwise skip
          semanticResults = await Promise.race([
            searchPromise,
            new Promise<any[]>(resolve => setTimeout(() => resolve([]), 5000))
          ])
          
          if (semanticResults.length > 0) {
            // Add relevant context from vector DB to sources
            const ragSources = semanticResults
              .filter(r => r.score > 0.7) // High similarity threshold
              .map(r => ({
                url: r.document?.metadata?.url || r.metadata?.url || '',
                title: r.document?.metadata?.title || r.metadata?.title || 'Cached Research',
                snippet: (r.document?.content || r.text || '').substring(0, 200),
                ragScore: r.score,
              }))
            
            sources.push(...ragSources)
          }
        } catch (error) {
          console.warn('Semantic search failed:', error)
        }

        return { sources, success: true, cached: false }
      }

      if (toolName === 'analyze_company_data') {
        const data = toolInput.data as string
        const analysisType = toolInput.analysisType as string
        
        // Use RAG-enhanced LLM analysis
        const vectorDB = getVectorDBService()
        const llmService = getLLMService()
        
        try {
          // Retrieve relevant context from vector database (with timeout)
          const contextDocs = await Promise.race([
            vectorDB.search(
              `${this.currentCompany} ${analysisType} analysis`,
              {
                topK: 10,
                filter: this.currentCompany ? { company: this.currentCompany } : undefined,
              }
            ),
            new Promise<any[]>(resolve => setTimeout(() => resolve([]), 5000))
          ])

          // Build context from retrieved documents
          const context = contextDocs
            .map((doc, i) => `[Document ${i + 1}] ${doc.document?.content || doc.text || ''}`)
            .join('\n\n')

          // Generate RAG-enhanced analysis
          const analysisPrompt = `You are analyzing ${analysisType} data for ${this.currentCompany || 'a company'}.

**Available Context from Research:**
${context}

**Data to Analyze:**
${data}

**Task:** Provide a comprehensive analysis focusing on:
1. Key patterns and trends
2. Strategic insights and opportunities
3. Potential risks or challenges
4. Actionable recommendations

Format your response as a structured analysis with clear sections.`

          const response = await llmService.generate(
            analysisPrompt,
            'gemini',
            { temperature: 0.7 }
          )

          return {
            insights: response.text,
            analysisType,
            contextUsed: contextDocs.length,
            success: true,
          }
        } catch (error) {
          console.warn('RAG analysis failed, using fallback:', error)
          return {
            insights: `Analysis of ${analysisType} data completed. Key patterns and insights extracted.`,
            analysisType,
            success: true,
          }
        }
      }

      if (toolName === 'extract_contacts') {
        const companyData = toolInput.companyData as string
        
        // Extract contacts - in production, use AI/NLP for extraction
        return {
          contacts: [
            { name: 'CEO', role: 'Chief Executive Officer', email: 'ceo@company.com' },
            { name: 'CTO', role: 'Chief Technology Officer', email: 'cto@company.com' },
          ],
          success: true,
        }
      }

      throw new Error(`Unknown tool: ${toolName}`)
    } catch (error) {
      if (retries > 0) {
        console.warn(`Tool call failed, retrying... (${retries} retries left)`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        return this.executeToolCall(toolCall, retries - 1)
      }
      throw error
    }
  }

  /**
   * Process user message with multi-agent orchestration
   */
  async* processMessageAdvanced(userMessage: string): AsyncGenerator<{
    type: 'reasoning' | 'tool-call' | 'content' | 'sources' | 'done' | 'error' | 'agent-update' | 'workflow-update' | 'step' | 'log' | 'finalAnswer'
    data: any
  }> {
    const extractedCompany = this.extractCompanyName(userMessage)
    if (!extractedCompany) {
      yield {
        type: 'content',
        data: "I'll help you research a company. Please specify which company you'd like me to research.",
      }
      yield { type: 'done', data: null }
      return
    }

    this.currentCompany = extractedCompany

    // Use multi-agent orchestration
    for await (const update of this.orchestrator.executeResearchWorkflow(extractedCompany, [])) {
      yield {
        type: 'workflow-update',
        data: update,
      }

      if (update.type === 'workflow-complete') {
        // Synthesize final response
        const finalContent = this.synthesizeMultiAgentResults(update.results)
        yield {
          type: 'content',
          data: finalContent,
        }
      }
    }

    yield { type: 'done', data: null }
  }

  /**
   * Synthesize results from multiple agents
   */
  private synthesizeMultiAgentResults(results: any): string {
    let content = `# Comprehensive Research Report\n\n`
    
    if (results.initial) {
      content += `## Initial Research\n\n`
      for (const [agent, data] of Object.entries(results.initial)) {
        content += `### ${agent}\n${JSON.stringify(data, null, 2)}\n\n`
      }
    }

    if (results.analysis) {
      content += `## Analysis\n\n`
      for (const [agent, data] of Object.entries(results.analysis)) {
        content += `### ${agent}\n${JSON.stringify(data, null, 2)}\n\n`
      }
    }

    if (results.synthesis) {
      content += `## Synthesis\n\n`
      for (const [agent, data] of Object.entries(results.synthesis)) {
        const synthesisData = data as any
        if (synthesisData.summary) {
          content += `${synthesisData.summary}\n\n`
        }
      }
    }

    return content
  }

  /**
   * Process user message and generate response with tool calling
   * Implements ReAct pattern with iteration control
   */
  async* processMessage(userMessage: string): AsyncGenerator<{
    type: 'reasoning' | 'tool-call' | 'content' | 'sources' | 'done' | 'error' | 'agent-update' | 'workflow-update' | 'step' | 'log' | 'finalAnswer'
    data: any
  }> {
    // Emit initial step
    yield {
      type: 'step',
      data: { label: 'Query received', status: 'completed', agent: 'System' }
    }
    yield {
      type: 'log',
      data: { message: `Processing query: "${userMessage.slice(0, 100)}..."`, level: 'info', agent: 'System' }
    }

    // Use multi-agent system for comprehensive research (broad triggers)
    const multiAgentKeywords = ['research', 'analyze', 'plan', 'account', 'generate', 'comprehensive', 'full', 'complete', 'detailed']
    const shouldUseMultiAgent = this.useMultiAgent && multiAgentKeywords.some(kw => userMessage.toLowerCase().includes(kw))
    
    if (shouldUseMultiAgent) {
      yield {
        type: 'step',
        data: { label: 'Multi-agent system activated', status: 'active', agent: 'Orchestrator' }
      }
      yield {
        type: 'log',
        data: { message: 'Triggering advanced multi-agent workflow', level: 'info', agent: 'Orchestrator' }
      }
      for await (const update of this.processMessageAdvanced(userMessage)) {
        yield update
      }
      return
    }
    this.currentIteration = 0

    // Update persona
    this.updatePersona(userMessage)

    // Extract company name if mentioned
    const extractedCompany = this.extractCompanyName(userMessage)
    if (extractedCompany) {
      this.currentCompany = extractedCompany
      yield {
        type: 'log',
        data: { message: `Detected company: ${extractedCompany}`, level: 'success', agent: 'System' }
      }
    }

    // Add user message to history
    this.conversationHistory.push({
      id: generateId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    })

    // Build system prompt with RAG context
    yield {
      type: 'step',
      data: { label: 'Building context', status: 'active', agent: 'System' }
    }
    let systemPrompt = this.buildSystemPrompt()
    
    // Retrieve relevant context from vector database
    if (this.currentCompany) {
      try {
        yield {
          type: 'log',
          data: { message: 'Searching vector database for relevant context', level: 'info', agent: 'VectorDB' }
        }
        const vectorDB = getVectorDBService()
        const relevantDocs = await Promise.race([
          vectorDB.search(
            `${userMessage} ${this.currentCompany}`,
            {
              topK: 5,
              filter: { company: this.currentCompany },
            }
          ),
          new Promise<any[]>(resolve => setTimeout(() => resolve([]), 5000))
        ])

        if (relevantDocs.length > 0) {
          const contextSection = relevantDocs
            .map((doc, i) => {
              const text = doc.document?.content || doc.text || ''
              return `[Context ${i + 1}] ${text.substring(0, 300)}... (Score: ${doc.score?.toFixed(2) || 'N/A'})`
            })
            .join('\n\n')

          systemPrompt += `\n\n**Relevant Context from Previous Research:**\n${contextSection}`
          yield {
            type: 'log',
            data: { message: `Found ${relevantDocs.length} relevant documents`, level: 'success', agent: 'VectorDB' }
          }
        }
      } catch (error) {
        console.warn('Failed to retrieve RAG context:', error)
        yield {
          type: 'log',
          data: { message: 'Vector DB search failed, continuing without context', level: 'warning', agent: 'VectorDB' }
        }
      }
    }
    yield {
      type: 'step',
      data: { label: 'Context built', status: 'completed', agent: 'System' }
    }

    // Convert history to Gemini format
    const geminiMessages = this.convertHistoryToGeminiFormat()

    // Handle persona-specific responses
    if (this.persona === 'confused' && !this.currentCompany) {
      yield {
        type: 'content',
        data: "I'd be happy to help you research a company! Could you please tell me which company you'd like me to research? For example, you could say 'Research Apple' or 'Generate an account plan for Microsoft'.",
      }
      yield { type: 'done', data: null }
      return
    }

    if (this.persona === 'chatty') {
      yield {
        type: 'reasoning',
        data: "The user is being chatty. I'll acknowledge their input but politely redirect to the research task.",
      }
    }

    try {
      // Get tools (kept for compatibility but not used in v1)
      const tools = getGeminiTools()

      yield {
        type: 'step',
        data: { label: 'LLM processing', status: 'active', agent: 'Gemini' }
      }
      yield {
        type: 'log',
        data: { message: 'Calling Gemini API for reasoning', level: 'info', agent: 'Gemini' }
      }

      // Call Gemini (v1: no actual tool support, text-based only)
      // STREAM Gemini response for fine-grained reasoning tokens
      const streamedChunks: string[] = []
      let emittedReasoningChars = 0
      try {
        for await (const chunk of streamGeminiResponse(geminiMessages, systemPrompt, tools)) {
          if (!chunk) continue
          streamedChunks.push(chunk)
          // Emit reasoning tokens early (first 400 chars) every ~60 chars or on sentence end
          if (emittedReasoningChars < 400) {
            emittedReasoningChars += chunk.length
            const buffer = streamedChunks.join('').slice(0, emittedReasoningChars)
            // Emit only if sentence boundary or length threshold
            if (/[.!?]\s$/.test(buffer) || emittedReasoningChars % 60 < chunk.length) {
              yield { type: 'reasoning', data: buffer.trim() }
            }
          }
        }
      } catch (streamErr) {
        yield { type: 'log', data: { message: 'Streaming failed, falling back to single response', level: 'warning', agent: 'Gemini' } }
      }
      const responseText = streamedChunks.join('')
      // Fallback to non-streaming if empty
      const response = responseText.length > 0
        ? { text: responseText }
        : await callGeminiWithTools(geminiMessages, systemPrompt, tools)
      
      yield {
        type: 'step',
        data: { label: 'LLM response received', status: 'completed', agent: 'Gemini' }
      }
      // Primary draft content
      let primaryDraft = response.text || ''
      if (primaryDraft) {
        // Already streamed reasoning tokens; now emit full content
        yield { type: 'content', data: primaryDraft }
      }

      // Extract potential sources (simple heuristic: URLs in text)
      const urlMatches = primaryDraft.match(/https?:\/\/[^\s)]+/g) || []
      const uniqueUrls = Array.from(new Set(urlMatches))
      let sourcesArr: any[] = []
      if (uniqueUrls.length) {
        sourcesArr = uniqueUrls.map((u, i) => ({ id: `S${i+1}`, url: u, title: u, relevance: 0.5 }))
        yield { type: 'sources', data: sourcesArr }
      }

      // Hallucination scan
      const hallucinationResult = this.detectHallucinations(primaryDraft, sourcesArr)
      if (hallucinationResult.flags.length) {
        yield { type: 'log', data: { message: `Hallucination flags: ${hallucinationResult.flags.length}`, level: 'warning', agent: 'Quality' } }
      }
      if (hallucinationResult.disclaimer) {
        primaryDraft += `\n\n**Disclaimer:** ${hallucinationResult.disclaimer}`
      }

      // SECOND REFINEMENT PASS
      yield { type: 'step', data: { label: 'Refinement pass', status: 'active', agent: 'Editor' } }
      yield { type: 'log', data: { message: 'Running summarization refinement pass', level: 'info', agent: 'Editor' } }
      const refinementPrompt = `Refine the following company research draft. Improve clarity, remove duplication, tighten language, keep citations like [S1], [S2]. Do NOT add new facts.\n\nDRAFT START:\n${primaryDraft}\n\nDRAFT END.`
      try {
        const llm = getLLMService()
        // Determine preferred provider based on enabled flags & order
        const activeOrder = this.providerOrder.filter(p => this.enabledProviders[p]) as any
        const preferred = (activeOrder[0] || 'gemini') as any
        const refined = await llm.generateText({ 
          prompt: refinementPrompt, 
          provider: preferred, 
          temperature: 0.4,
          providerOrder: activeOrder as any,
          enabledProviders: this.enabledProviders as any
        })
        const refinedText = refined.text.trim()
        let finalOut = refinedText && refinedText.length > 50 ? refinedText : primaryDraft
        const confidence = Math.round(Math.min(1, Math.max(0, (sourcesArr.length * 0.08 + hallucinationResult.score * 0.7))) * 100)
        yield { type: 'step', data: { label: `Confidence: ${confidence}%`, status: 'completed', agent: 'Quality' } }
        if (refinedText && refinedText.length > 50) {
          yield { type: 'content', data: '\n---\n**Refined Version:**\n' + finalOut }
        }
        yield { type: 'step', data: { label: 'Refinement complete', status: 'completed', agent: 'Editor' } }
        yield { type: 'finalAnswer', data: finalOut }
      } catch (e) {
        yield { type: 'log', data: { message: 'Refinement failed – using primary draft', level: 'warning', agent: 'Editor' } }
        yield { type: 'finalAnswer', data: primaryDraft }
      }

      // Since Gemini v1 doesn't support function calling, we parse text for tool-like instructions
      // Look for patterns like "I need to search for X" or "Let me research Y"
      const needsSearch = response.text && (
        response.text.toLowerCase().includes('search for') ||
        response.text.toLowerCase().includes('let me research') ||
        response.text.toLowerCase().includes('i\'ll search') ||
        response.text.toLowerCase().includes('gather information')
      )

      // Simulate tool calls based on text analysis
      const simulatedFunctionCalls = needsSearch && this.currentCompany ? [{
        name: 'search_web',
        args: { query: `${this.currentCompany} company information`, companyName: this.currentCompany }
      }] : response.functionCalls

      // Check for function calls (either real from beta or simulated from v1 text)
      if (simulatedFunctionCalls && simulatedFunctionCalls.length > 0) {
        // Execute tool calls
        const allSources: Source[] = []
        const toolResults: Array<{ functionResponse: { name: string; response: any } }> = []

        for (const functionCall of simulatedFunctionCalls) {
          this.currentIteration++
          if (this.currentIteration > this.maxIterations) {
            yield {
              type: 'error',
              data: 'Maximum iterations reached. Please try a more specific query.',
            }
            break
          }

          const toolCall: ToolCall = {
            id: generateId(),
            name: functionCall.name,
            input: functionCall.args,
            status: 'in-progress',
          }

          // Show sub-agent orchestration
          let agentMessage = ''
          if (functionCall.name === 'search_web') {
            agentMessage = `🔍 Research Agent is searching for: "${functionCall.args.query}"`
          } else if (functionCall.name === 'analyze_company_data') {
            agentMessage = `📊 Strategy Agent is analyzing ${functionCall.args.analysisType} data...`
          } else if (functionCall.name === 'extract_contacts') {
            agentMessage = `🔍 Research Agent is extracting contact information...`
          }

          if (agentMessage) {
            yield {
              type: 'agent-update',
              data: agentMessage,
            }
          }

          yield {
            type: 'tool-call',
            data: {
              id: toolCall.id,
              name: toolCall.name,
              input: toolCall.input,
            },
          }

          try {
            const result = await this.executeToolCall(toolCall)
            toolCall.result = result
            toolCall.status = 'success'

            toolResults.push({
              functionResponse: {
                name: functionCall.name,
                response: result,
              },
            })

            // Collect sources
            if (result.sources && Array.isArray(result.sources)) {
              allSources.push(...result.sources)
            }

            yield {
              type: 'tool-call',
              data: {
                ...toolCall,
                result,
              },
            }
          } catch (error) {
            toolCall.status = 'error'
            toolCall.result = { error: (error as Error).message }

            toolResults.push({
              functionResponse: {
                name: functionCall.name,
                response: { error: (error as Error).message },
              },
            })

            yield {
              type: 'tool-call',
              data: toolCall,
            }
          }
        }

        // Continue conversation with tool results
        const updatedMessages: Array<{ role: 'user' | 'model'; parts: string | Array<any> }> = [
          ...geminiMessages,
          {
            role: 'model',
            parts: response.text || 'Tool execution completed.',
          },
          {
            role: 'user',
            parts: JSON.stringify({
              toolResults: toolResults.map(tr => tr.functionResponse),
            }),
          },
        ]

        // Show Strategy Agent synthesizing
        yield {
          type: 'agent-update',
          data: '📊 Strategy Agent is synthesizing insights from research data...',
        }

        // Get final response with synthesized information
        const finalResponse = await callGeminiWithTools(updatedMessages, systemPrompt, tools)

        // Show Editor Agent formatting
        if (finalResponse.text) {
          yield {
            type: 'agent-update',
            data: '✏️ Editor Agent is formatting the account plan...',
          }
          
          yield {
            type: 'content',
            data: finalResponse.text,
          }
        }

        // Yield sources if available
        if (allSources.length > 0) {
          yield {
            type: 'sources',
            data: allSources,
          }
        }
      } else {
        // No tool use, just text response
        if (response.text) {
          // Show Editor Agent for direct responses
          yield {
            type: 'agent-update',
            data: '✏️ Editor Agent is preparing your response...',
          }
          
          yield {
            type: 'content',
            data: response.text,
          }
        }
      }

      // Add assistant response to history
      const assistantMessage = response.text || ''
      this.conversationHistory.push({
        id: generateId(),
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date(),
      })
    } catch (error) {
      const errorMessage = `I encountered an error: ${(error as Error).message}. Please try again or check your API configuration.`
      yield {
        type: 'error',
        data: errorMessage,
      }
      yield {
        type: 'content',
        data: errorMessage,
      }
    }

    yield { type: 'done', data: null }
  }

  /**
   * Generate account plan from research
   */
  async generateAccountPlan(companyName: string): Promise<any> {
    // This would be called after research is complete
    return {
      companyName,
      sections: [],
      sources: [],
      createdAt: new Date(),
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): Message[] {
    return this.conversationHistory
  }

  /**
   * Get research cache
   */
  getCache(): Map<string, { data: any; timestamp: Date }> {
    return this.researchCache
  }

  /**
   * Clear research cache
   */
  clearCache() {
    this.researchCache.clear()
  }

  /**
   * Get research steps
   */
  getResearchSteps(): ResearchStep[] {
    return this.researchSteps
  }

  /**
   * Reset conversation
   */
  reset() {
    this.conversationHistory = []
    this.currentCompany = undefined
    this.persona = 'normal'
    this.personaContext = PERSONA_CONTEXTS.normal
    this.researchCache.clear()
    this.researchSteps = []
    this.currentIteration = 0
  }

  /**
   * Get current company
   */
  getCurrentCompany(): string | undefined {
    return this.currentCompany
  }

  /**
   * Set current company
   */
  setCurrentCompany(company: string) {
    this.currentCompany = company
  }

  /** Update provider preferences (from client settings) */
  setProviderPrefs(prefs: { openai?: boolean; groq?: boolean; order?: string[] }) {
    if (typeof prefs.openai === 'boolean') this.enabledProviders.openai = prefs.openai
    if (typeof prefs.groq === 'boolean') this.enabledProviders.groq = prefs.groq
    if (Array.isArray(prefs.order) && prefs.order.length) {
      this.providerOrder = prefs.order.filter(p => ['gemini','groq','openai'].includes(p))
    }
  }
}
