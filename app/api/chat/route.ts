import { NextRequest } from 'next/server'
import { ResearchAgent } from '@/lib/agent'
import { Message } from '@/types'
import { getAnalyticsService } from '@/lib/services/analytics'
import { apiRateLimiter, getClientIdentifier } from '@/lib/utils/rate-limiter'
import { logInfo, logError, logWarn, trackMetric } from '@/lib/utils/telemetry'

// Store agent instances per session (in production, use Redis or similar)
const agents = new Map<string, ResearchAgent>()
const analytics = getAnalyticsService()

function getAgent(sessionId: string): ResearchAgent {
  if (!agents.has(sessionId)) {
    agents.set(sessionId, new ResearchAgent())
  }
  return agents.get(sessionId)!
}

// Clean up old sessions (simple implementation)
setInterval(() => {
  // In production, implement proper session management with TTL
  if (agents.size > 100) {
    const oldestSession = Array.from(agents.keys())[0]
    agents.delete(oldestSession)
  }
}, 3600000) // Every hour

// Helper functions for SSE streaming
function sendStep(controller: ReadableStreamDefaultController, data: any) {
  const encoder = new TextEncoder()
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({ type: 'step', data })}\n\n`)
  )
}

function sendLog(controller: ReadableStreamDefaultController, data: any) {
  const encoder = new TextEncoder()
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({ type: 'log', data })}\n\n`)
  )
}

function sendFinal(controller: ReadableStreamDefaultController, data: any) {
  const encoder = new TextEncoder()
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({ type: 'finalAnswer', data })}\n\n`)
  )
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  // Rate limiting
  const clientId = getClientIdentifier(req)
  const { allowed, retryAfter } = apiRateLimiter.checkLimit(clientId)
  
  if (!allowed) {
    logWarn('security', 'Rate limit exceeded', { clientId, retryAfter })
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', retryAfter }),
      { 
        status: 429, 
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(retryAfter! / 1000))
        } 
      }
    )
  }
  
  logInfo('api', 'Chat request received', { clientId })
  
  try {
    // Detect non-SSE expectation (e.g., health check or simple JSON client)
    const acceptHeader = req.headers.get('accept') || ''
    const wantsSSE = acceptHeader.includes('text/event-stream') || acceptHeader === '*/*'

    const body = await req.json()
    const { message, sessionId = 'default', providerPrefs } = body

    if (!message || typeof message !== 'string') {
      analytics.trackEvent('query', { error: 'Invalid message' }, { 
        success: false, 
        sessionId: sessionId || 'default' 
      })
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Track query start
    const queryEventId = analytics.trackEvent('query', { 
      message: message.slice(0, 100), 
      messageLength: message.length 
    }, { 
      sessionId: sessionId || 'default'
    })

    const agent = getAgent(sessionId || 'default')
    if (providerPrefs && typeof providerPrefs === 'object') {
      try { agent.setProviderPrefs(providerPrefs) } catch(e) { /* ignore */ }
    }
    const encoder = new TextEncoder()

    // Simple JSON fallback when client does not request SSE
    if (!wantsSSE) {
      // Minimal processing: echo message, indicate streaming capability
      return new Response(JSON.stringify({
        ok: true,
        mode: 'fallback-json',
        message: message,
        note: 'For streaming responses set Accept: text/event-stream',
        sessionId
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Initial heartbeat comment so clients don't see empty reply
          const hb = new TextEncoder().encode(':heartbeat\n\n')
          controller.enqueue(hb)
          // Small welcome event
          sendLog(controller, { message: 'SSE stream started', level: 'info', t: Date.now() })
          let currentMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            sources: [],
            reasoning: '',
          }

          for await (const chunk of agent.processMessage(message)) {
            if (chunk.type === 'reasoning') {
              currentMessage.reasoning = chunk.data
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'reasoning', data: chunk.data })}\n\n`)
              )
            } else if (chunk.type === 'tool-call') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'tool-call', data: chunk.data })}\n\n`)
              )
            } else if (chunk.type === 'content') {
              currentMessage.content += chunk.data
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'content', data: chunk.data })}\n\n`)
              )
            } else if (chunk.type === 'sources') {
              currentMessage.sources = chunk.data
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'sources', data: chunk.data })}\n\n`)
              )
            } else if (chunk.type === 'workflow-update') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'workflow-update', data: chunk.data })}\n\n`)
              )
            } else if (chunk.type === 'agent-update') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'agent-update', data: chunk.data })}\n\n`)
              )
            } else if (chunk.type === 'step') {
              // Workflow step update for timeline
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'step', data: chunk.data })}\n\n`)
              )
            } else if (chunk.type === 'log') {
              // Real-time log entry
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'log', data: chunk.data })}\n\n`)
              )
            } else if (chunk.type === 'finalAnswer') {
              // Final synthesized answer
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'finalAnswer', data: chunk.data })}\n\n`)
              )
            } else if (chunk.type === 'finalAnswer') {
              // Provide explicit final answer event if produced by agent
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'finalAnswer', data: chunk.data })}\n\n`)
              )
            } else if (chunk.type === 'done') {
              // Track successful query completion
              const duration = Date.now() - startTime
              analytics.trackEvent('query', { 
                message: message.slice(0, 100),
                sourcesCount: currentMessage.sources?.length || 0,
                contentLength: currentMessage.content.length
              }, { 
                sessionId: sessionId,
                duration,
                success: true
              })
              
              logInfo('api', 'Query completed successfully', { 
                sessionId, 
                duration, 
                sourcesCount: currentMessage.sources?.length || 0 
              })
              trackMetric('query_duration', duration, 'ms', { sessionId })

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'done', data: currentMessage })}\n\n`)
              )
              controller.close()
            }
          }
        } catch (error) {
          // Track error
          analytics.trackEvent('error', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }, { 
            sessionId: sessionId,
            success: false
          })
          
          logError('api', 'Query processing error', { 
            sessionId,
            error: error instanceof Error ? error.message : String(error)
          })
          
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    
    // Track API error
    analytics.trackEvent('error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'api_error'
    }, { 
      sessionId: 'default',
      duration: Date.now() - startTime,
      success: false
    })
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

