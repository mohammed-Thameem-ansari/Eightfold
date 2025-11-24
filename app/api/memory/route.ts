import { NextRequest } from 'next/server'
import { MemoryManager } from '@/lib/memory/memory-manager'

const memoryManager = MemoryManager.getInstance()

export async function POST(req: NextRequest) {
  try {
    const { action, sessionId, message, query, limit } = await req.json()

    switch (action) {
      case 'save':
        if (!sessionId || !message) {
          return new Response(JSON.stringify({ error: 'sessionId and message are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        await memoryManager.saveMessage(sessionId, message)
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })

      case 'retrieve':
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'sessionId is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        const history = await memoryManager.getConversationHistory(sessionId, limit)
        return new Response(JSON.stringify({ success: true, history }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })

      case 'search':
        if (!query) {
          return new Response(JSON.stringify({ error: 'query is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        const results = await memoryManager.searchRelevantMemories({ query, topK: limit || 5 })
        return new Response(JSON.stringify({ success: true, results }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })

      case 'summary':
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'sessionId is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        const summary = await memoryManager.generateSummary(sessionId)
        return new Response(JSON.stringify({ success: true, summary }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })

      case 'store_entity':
        const { entity } = await req.json()
        if (!entity || !entity.name || !entity.type) {
          return new Response(JSON.stringify({ error: 'entity with name and type is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        await memoryManager.storeEntity(entity.type, entity.name, entity.data || {})
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
    }
  } catch (error) {
    console.error('Memory API error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'sessionId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const history = await memoryManager.getConversationHistory(sessionId, limit)
    return new Response(JSON.stringify({ success: true, history }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Memory API error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
