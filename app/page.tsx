'use client'

import { useState, useRef, useEffect } from 'react'
import { Message, ResearchStep } from '@/types'
import { generateId } from '@/lib/utils'
import { Search, Sparkles, Brain, TrendingUp, FileText, Zap, Activity, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LiveAgentMonitor } from '@/components/agents/LiveAgentMonitor'
import { TopNav } from '@/components/layout/TopNav'
import { extractKeywords, highlightText } from '@/lib/utils/highlighter'
import Link from 'next/link'

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => generateId())
  const [activeAgents, setActiveAgents] = useState<string[]>([])
  const [currentPhase, setCurrentPhase] = useState<string>('')
  const [confidence, setConfidence] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [searchKeywords, setSearchKeywords] = useState<string[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    setMounted(true)
    inputRef.current?.focus()
  }, [])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const keywords = extractKeywords(input)
    setSearchKeywords(keywords)
    setInput('')
    setIsLoading(true)
    setActiveAgents([])
    setCurrentPhase('')

    let assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      sources: [],
    }

    try {
      // Read provider prefs from localStorage config
      let providerPrefs: any = {}
      try {
        const cfgRaw = typeof window !== 'undefined' ? localStorage.getItem('app_config') : null
        if (cfgRaw) {
          const cfg = JSON.parse(cfgRaw)
          providerPrefs = {
            openai: !!cfg?.features?.enableOpenAI,
            groq: !!cfg?.features?.enableGroq,
            order: ['gemini','groq','openai']
          }
        }
      } catch { /* ignore */ }
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, sessionId, providerPrefs }),
      })

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'agent-update') {
                setActiveAgents((prev) => [...prev, data.data])
              } else if (data.type === 'workflow-update') {
                if (data.data.phase) {
                  setCurrentPhase(data.data.phase)
                }
              } else if (data.type === 'step') {
                if (data.data.label && data.data.label.includes('Confidence:')) {
                  const match = data.data.label.match(/Confidence:\s*(\d+)%/)
                  if (match) setConfidence(parseInt(match[1]))
                }
              } else if (data.type === 'content') {
                assistantMessage.content += data.data
                setMessages((prev) => {
                  const updated = [...prev]
                  const lastMsg = updated[updated.length - 1]
                  if (lastMsg?.role === 'assistant' && lastMsg.id === assistantMessage.id) {
                    lastMsg.content = assistantMessage.content
                    return updated
                  }
                  if (lastMsg?.role !== 'assistant') {
                    return [...updated, { ...assistantMessage }]
                  }
                  return updated
                })
              } else if (data.type === 'sources') {
                assistantMessage.sources = data.data
                setMessages((prev) => {
                  const updated = [...prev]
                  const lastMsg = updated[updated.length - 1]
                  if (lastMsg?.role === 'assistant') {
                    lastMsg.sources = data.data
                  }
                  return updated
                })
              } else if (data.type === 'tool-call') {
                if (data.data.result?.sources) {
                  assistantMessage.sources = [
                    ...(assistantMessage.sources || []),
                    ...data.data.result.sources,
                  ]
                }
              } else if (data.type === 'done') {
                setIsLoading(false)
                setCurrentPhase('')
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ])
      setIsLoading(false)
    }
  }

  const examples = [
    { icon: Brain, text: 'Research Apple and generate an account plan', color: 'text-blue-500' },
    { icon: TrendingUp, text: 'Analyze Tesla competitive landscape', color: 'text-green-500' },
    { icon: FileText, text: 'Generate financial analysis for Microsoft', color: 'text-purple-500' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav
        statusBadges={
          <>
            {mounted && confidence !== null && (
              <div className="agent-badge" role="status" aria-label={`Answer confidence: ${confidence} percent`} style={{ background: confidence >= 80 ? 'rgb(34 197 94 / 0.1)' : confidence >= 60 ? 'rgb(234 179 8 / 0.1)' : 'rgb(239 68 68 / 0.1)' }}>
                <span className="font-semibold" style={{ color: confidence >= 80 ? 'rgb(34 197 94)' : confidence >= 60 ? 'rgb(234 179 8)' : 'rgb(239 68 68)' }}>{confidence}% Confidence</span>
              </div>
            )}
            {mounted && currentPhase && (
              <div className="agent-badge active">
                <Zap className="h-3.5 w-3.5 animate-pulse" />
                <span className="font-semibold">{currentPhase}</span>
              </div>
            )}
          </>
        }
      />

      {/* Main Content with Better Spacing */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 md:px-10 py-12 flex flex-col">
        {messages.length === 0 ? (
          /* Killer Empty State */
          <div className="flex-1 flex flex-col items-center justify-center space-y-12 py-16">
            <div className="text-center space-y-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/30 bg-muted/20 backdrop-blur-sm text-xs font-medium text-muted-foreground mb-4">
                <Activity className="h-3.5 w-3.5 animate-pulse" />
                <span>Powered by Advanced Multi-Agent AI</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-bold tracking-tight">
                <span className="gradient-text">Where knowledge</span>
                <br />
                <span className="text-foreground">begins</span>
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                Ask anything about companies. Get comprehensive research powered by <span className="font-semibold text-foreground">15 specialized AI agents</span> working in harmony.
              </p>
            </div>

            <div className="w-full max-w-3xl space-y-6">
              <div className="relative group">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Ask about any company... (e.g., Research Apple Inc.)"
                  className="perplexity-search w-full resize-none min-h-[60px]"
                  rows={1}
                  disabled={isLoading}
                  aria-label="Research query input"
                  aria-describedby="search-hint"
                />
                <span id="search-hint" className="sr-only">
                  Enter a company name or research query. Press Enter to submit or Shift+Enter for new line.
                </span>
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full h-12 w-12 p-0 shadow-lg transition-all duration-300 hover:scale-110"
                  aria-label="Submit research query"
                >
                  <Search className="h-5 w-5" />
                </Button>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-foreground/5 to-foreground/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none -z-10 blur-2xl" />
              </div>

              {/* Workflow Viewer Link */}
              <Link href="/workflow" aria-label="View live agent workflow visualization">
                <Button variant="outline" className="w-full gap-3 py-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                  <Eye className="h-5 w-5" />
                  <span className="font-semibold">View Live Agent Workflow</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Real-time</span>
                  </div>
                </Button>
              </Link>

              {/* Premium Example Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {examples.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(example.text)
                      setTimeout(() => handleSend(), 100)
                    }}
                    className="perplexity-card p-5 text-left group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <example.icon className={`h-6 w-6 mb-3 ${example.color} transition-transform duration-300 group-hover:scale-110`} />
                    <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300 leading-relaxed relative z-10">
                      {example.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Enhanced Agent Showcase */}
            <div className="space-y-4">
            <div className="text-center text-xs text-muted-foreground space-y-2">
              <p>
                <kbd className="px-2 py-1 bg-muted border border-border rounded text-xs">Tab</kbd> to navigate, 
                <kbd className="px-2 py-1 bg-muted border border-border rounded text-xs mx-1">Enter</kbd> to submit, 
                <kbd className="px-2 py-1 bg-muted border border-border rounded text-xs">Shift+Enter</kbd> for new line
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center max-w-3xl">
              <span className="text-xs text-muted-foreground font-medium">Specialized Agents:</span>
                {['Research', 'Analysis', 'Financial', 'Market', 'Competitive', 'Strategy', 'Writing', 'Quality'].map((agent) => (
                  <div key={agent} className="agent-badge hover:scale-105 transition-transform cursor-default">
                    {agent}
                  </div>
                ))}
                <div className="agent-badge">+7 more</div>
              </div>
              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span>Live Data</span>
                </div>
                <div className="h-1 w-1 rounded-full bg-border" />
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span>Real-time Analysis</span>
                </div>
                <div className="h-1 w-1 rounded-full bg-border" />
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                  <span>Multi-Agent Orchestration</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Messages View */
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 scrollbar-thin">
              <div className="space-y-6 pb-4">
                {messages.map((message) => {
                  const isUser = message.role === 'user'
                  const highlighted = !isUser && searchKeywords.length > 0
                    ? highlightText(message.content, searchKeywords)
                    : [{ text: message.content, isHighlight: false }]
                  
                  return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`message-bubble max-w-[85%] ${
                        isUser ? 'user' : 'assistant'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {highlighted.map((part, idx) => (
                          part.isHighlight ? (
                            <mark key={idx} className="bg-yellow-200 dark:bg-yellow-500/30 text-foreground px-1 rounded">
                              {part.text}
                            </mark>
                          ) : (
                            <span key={idx}>{part.text}</span>
                          )
                        ))}
                      </div>
                      
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <p className="text-xs font-semibold mb-2 text-muted-foreground">Sources</p>
                          <div className="flex flex-wrap gap-2">
                            {message.sources.slice(0, 5).map((source, idx) => {
                              const sourceHighlighted = searchKeywords.length > 0
                                ? highlightText(source.title || source.url, searchKeywords)
                                : [{ text: source.title || source.url, isHighlight: false }]
                              
                              return (
                              <a
                                key={idx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="source-chip"
                                title={source.title || source.url}
                              >
                                <span>
                                  {sourceHighlighted.map((part, pIdx) => (
                                    part.isHighlight ? (
                                      <mark key={pIdx} className="bg-yellow-200 dark:bg-yellow-500/30 text-foreground px-0.5 rounded">
                                        {part.text}
                                      </mark>
                                    ) : (
                                      <span key={pIdx}>{part.text}</span>
                                    )
                                  ))}
                                </span>
                                <span className="text-[10px] opacity-60">↗</span>
                              </a>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  )
                })}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="message-bubble assistant max-w-[85%]">
                      <div className="space-y-2">
                        <div className="skeleton-line w-3/4" />
                        <div className="skeleton-line w-1/2" />
                        <div className="skeleton-line w-2/3" />
                      </div>
                    </div>
                  </div>
                )}
                
                {activeAgents.length > 0 && (
                  <div className="flex justify-start">
                    <div className="perplexity-card p-4 max-w-md">
                      <p className="text-xs font-semibold mb-2 text-muted-foreground">Active Agents</p>
                      <div className="space-y-1 text-sm">
                        {activeAgents.slice(-3).map((agent, idx) => (
                          <div key={idx} className="text-muted-foreground">
                            {agent}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Premium Input Area */}
            <div className="pt-6 border-t border-border/20 bg-background/80 backdrop-blur-sm">
              <div className="relative group">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Ask a follow-up question..."
                  className="perplexity-search w-full resize-none min-h-[56px]"
                  rows={1}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full h-11 w-11 p-0 shadow-lg transition-all duration-300 hover:scale-110 disabled:opacity-50"
                >
                  <Search className="h-5 w-5" />
                </Button>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-foreground/5 to-foreground/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none -z-10 blur-xl" />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Premium Footer */}
      <footer className="border-t border-border/20 bg-background/60 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-4 flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Powered by Gemini & Groq</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-border" />
          <div className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5" />
            <span>15 Specialized Agents</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-border" />
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" />
            <span>Real-time Intelligence</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

