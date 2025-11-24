'use client'

import { useState, useRef, useEffect } from 'react'
import { Message } from '@/types'
import { generateId } from '@/lib/utils'
import { 
  Search, Sparkles, Brain, TrendingUp, FileText, Zap, Activity, 
  BarChart3, Users, Target, MessageSquare, Eye 
} from 'lucide-react'
import { ChartPanel, generatePlaceholderSeries } from '@/components/charts/ChartPanel'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TopNav } from '@/components/layout/TopNav'
import { LiveAgentMonitor } from '@/components/agents/LiveAgentMonitor'
import { AgentActivityFeed } from '@/components/agents/AgentActivityFeed'
import { AgentPerformanceTimeline } from '@/components/charts/AgentPerformanceTimeline'
import { FinancialDashboard } from '@/components/financial/FinancialDashboard'
import { FinancialMetricsPanel } from '@/components/financial/FinancialMetricsPanel'
import { MarketDataCharts } from '@/components/financial/MarketDataCharts'
import { ProviderHealthDashboard } from '@/components/dashboard/ProviderHealthDashboard'
import { AgentConfigPanel } from '@/components/settings/AgentConfigPanel'
import { TelemetryDashboard } from '@/components/telemetry/TelemetryDashboard'
import { extractKeywords, highlightText } from '@/lib/utils/highlighter'
import { getPreferences, savePreferences } from '@/lib/utils/preferences'
import { WorkflowUpdate } from '@/lib/agents/orchestrator'
import Link from 'next/link'

export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => generateId())
  const [activeAgents, setActiveAgents] = useState<string[]>([])
  const [currentPhase, setCurrentPhase] = useState<string>('')
  const [confidence, setConfidence] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [searchKeywords, setSearchKeywords] = useState<string[]>([])
  const [workflowUpdates, setWorkflowUpdates] = useState<WorkflowUpdate[]>([])
  const [activeTab, setActiveTab] = useState<string>(() => {
    const prefs = getPreferences()
    return prefs.lastActiveTab?.dashboard || 'chat'
  })
  
  useEffect(() => {
    savePreferences({
      lastActiveTab: {
        dashboard: activeTab,
      },
    })
  }, [activeTab])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
      // Provider preferences from stored config
      let providerPrefs: any = {}
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('app_config') : null
        if (raw) {
          const cfg = JSON.parse(raw)
          providerPrefs = {
            openai: !!cfg?.features?.enableOpenAI,
            groq: !!cfg?.features?.enableGroq,
            order: ['gemini','groq','openai']
          }
        }
      } catch { /* silent */ }
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
                setActiveAgents((prev) => {
                  const updated = [...prev, data.data]
                  return updated.slice(-5) // Keep last 5
                })
              } else if (data.type === 'workflow-update') {
                setWorkflowUpdates((prev) => [...prev, data.data])
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
              <div className="agent-badge" style={{ background: confidence >= 80 ? 'rgb(34 197 94 / 0.1)' : confidence >= 60 ? 'rgb(234 179 8 / 0.1)' : 'rgb(239 68 68 / 0.1)' }}>
                <span className="font-semibold" style={{ color: confidence >= 80 ? 'rgb(34 197 94)' : confidence >= 60 ? 'rgb(234 179 8)' : 'rgb(239 68 68)' }}>{confidence}% Confidence</span>
              </div>
            )}
            {mounted && activeAgents.length > 0 && (
              <div className="agent-badge active px-3 py-1.5">
                <Activity className="h-3.5 w-3.5 animate-pulse" />
                <span className="font-semibold text-sm">{activeAgents.length} Active</span>
              </div>
            )}
            {mounted && currentPhase && (
              <div className="agent-badge active px-3 py-1.5">
                <Zap className="h-3.5 w-3.5 animate-pulse" />
                <span className="capitalize font-semibold text-sm">{currentPhase.replace(/-/g, ' ')}</span>
              </div>
            )}
          </>
        }
      />

      {/* Premium Dashboard Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 md:px-10 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full max-w-[650px] grid-cols-5 mx-auto h-12 p-1 bg-muted/30 border border-border/30 rounded-2xl backdrop-blur-sm">
            <TabsTrigger value="chat" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300">
              <Users className="h-4 w-4" />
              <span className="font-medium">Agents</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300">
              <Activity className="h-4 w-4" />
              <span className="font-medium">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300">
              <BarChart3 className="h-4 w-4" />
              <span className="font-medium">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300">
              <Target className="h-4 w-4" />
              <span className="font-medium">Config</span>
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-8">
                <div className="text-center space-y-4">
                  <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    AI-Powered Research
                  </h2>
                  <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Ask anything about companies. Get comprehensive research powered by 15 specialized AI agents working in real-time.
                  </p>
                </div>

                <div className="w-full max-w-3xl space-y-4">
                  <div className="relative">
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
                      className="perplexity-search w-full resize-none text-lg"
                      rows={2}
                      disabled={isLoading}
                      aria-label="Dashboard research query input"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      size="lg"
                      className="absolute right-4 bottom-4 rounded-full h-12 w-12 p-0 shadow-lg"
                      aria-label="Submit research query"
                    >
                      <Search className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {examples.map((example, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInput(example.text)
                          setTimeout(() => handleSend(), 100)
                        }}
                        className="pro-panel text-left group"
                      >
                        <example.icon className={`h-6 w-6 mb-3 ${example.color}`} />
                        <p className="text-sm font-medium">{example.text}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center max-w-3xl">
                  <span className="text-sm text-muted-foreground">Powered by agents:</span>
                  {['Research', 'Analysis', 'Financial', 'Competitive', 'Market', 'Strategy'].map((agent) => (
                    <div key={agent} className="agent-badge text-xs">
                      {agent}
                    </div>
                  ))}
                  <div className="agent-badge text-xs">+9 more</div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <ScrollArea className="h-[calc(100vh-300px)]">
                  <div className="space-y-6 pr-4">
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
                              <p className="text-xs font-semibold mb-2">Sources</p>
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
                                    {sourceHighlighted.map((part, pIdx) => (
                                      part.isHighlight ? (
                                        <mark key={pIdx} className="bg-yellow-200 dark:bg-yellow-500/30 text-foreground px-0.5 rounded">
                                          {part.text}
                                        </mark>
                                      ) : (
                                        <span key={pIdx}>{part.text}</span>
                                      )
                                    ))}
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
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="border-t border-border/50 pt-4">
                  <div className="relative">
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
                      className="perplexity-search w-full resize-none"
                      rows={2}
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-4 bottom-4 rounded-full"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents">
            <LiveAgentMonitor 
              workflowActive={isLoading}
              currentPhase={currentPhase}
              activeAgents={activeAgents}
            />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <AgentActivityFeed workflowUpdates={workflowUpdates} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              {/* Agent Performance Timeline */}
              <AgentPerformanceTimeline />
              
              {/* Provider Health Dashboard */}
              <ProviderHealthDashboard />
              
              {/* Charts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <ChartPanel
                  title="Market Trend"
                  type="line"
                  data={generatePlaceholderSeries(12)}
                  xKey="month"
                  yKeys={["revenue","profit"]}
                />
                <ChartPanel
                  title="Revenue Growth"
                  type="bar"
                  data={generatePlaceholderSeries(8)}
                  xKey="month"
                  yKeys={["revenue"]}
                />
                <ChartPanel
                  title="Risk vs Opportunity"
                  type="scatter"
                  data={generatePlaceholderSeries(20)}
                  xKey="risk"
                  yKeys={["opportunity"]}
                />
              </div>
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Market Indices</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">S&P 500</span>
                      <span className="text-sm font-bold text-green-500">+0.45%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Dow Jones</span>
                      <span className="text-sm font-bold text-green-500">+0.32%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">NASDAQ</span>
                      <span className="text-sm font-bold text-red-500">-0.18%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Agent Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Success Rate</span>
                      <span className="text-sm font-bold text-green-500">98.5%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avg Response</span>
                      <span className="text-sm font-bold">2.3s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Queries</span>
                      <span className="text-sm font-bold">1,247</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">System Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Active Agents</span>
                      <span className="text-sm font-bold text-green-500">15/15</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">API Status</span>
                      <span className="text-sm font-bold text-green-500">Operational</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Uptime</span>
                      <span className="text-sm font-bold">99.9%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Financial Dashboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    Stock Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FinancialDashboard symbol="AAPL" />
                </CardContent>
              </Card>

              {/* Advanced Metrics Panel */}
              <FinancialMetricsPanel symbol="AAPL" />

              {/* Market Data Charts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-500" />
                    Market Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MarketDataCharts symbols={['AAPL', 'MSFT', 'GOOGL', 'TSLA']} />
                </CardContent>
              </Card>
              <div className="text-xs text-muted-foreground font-medium px-1">
                * Charts show synthetic example data. Real metrics will stream once data pipelines are connected.
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="max-w-5xl mx-auto space-y-6">
              <AgentConfigPanel />
              <TelemetryDashboard />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
