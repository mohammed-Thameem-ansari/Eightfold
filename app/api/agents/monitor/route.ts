import { NextRequest } from 'next/server'
import { agentMonitor } from '@/lib/agents/agent-monitor'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    if (action === 'stats') {
      const stats = agentMonitor.getAllStats()
      return new Response(JSON.stringify({ stats }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (action === 'activity') {
      const limit = parseInt(searchParams.get('limit') || '50', 10)
      const activity = agentMonitor.getRecentActivity(limit)
      return new Response(JSON.stringify({ activity }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (action === 'summary') {
      const summary = agentMonitor.getPerformanceSummary()
      return new Response(JSON.stringify({ summary }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Agent monitor API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

