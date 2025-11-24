import { NextRequest } from 'next/server'
import { AgentOrchestrator } from '@/lib/agents/orchestrator'

// Store orchestrator instances per session
const orchestrators = new Map<string, AgentOrchestrator>()

function getOrchestrator(sessionId: string): AgentOrchestrator {
  if (!orchestrators.has(sessionId)) {
    orchestrators.set(sessionId, new AgentOrchestrator())
  }
  return orchestrators.get(sessionId)!
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId') || 'default'
    const action = searchParams.get('action')

    const orchestrator = getOrchestrator(sessionId)

    if (action === 'stats') {
      const stats = orchestrator.getAgentStats()
      return new Response(JSON.stringify({ stats }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (action === 'agents') {
      const agents = orchestrator.getAllAgents().map(agent => ({
        name: agent.getName(),
        description: agent.getDescription(),
        capabilities: agent.getCapabilities(),
        stats: agent.getStats(),
      }))
      return new Response(JSON.stringify({ agents }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Agents API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { companyName, sessionId, researchGoals } = await req.json()

    if (!companyName) {
      return new Response(JSON.stringify({ error: 'Company name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const orchestrator = getOrchestrator(sessionId || 'default')
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const update of orchestrator.executeResearchWorkflow(companyName, researchGoals || [])) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(update)}\n\n`)
            )
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Agents workflow error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

