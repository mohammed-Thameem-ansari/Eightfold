import { NextRequest } from 'next/server'
import { analytics } from '@/lib/analytics'
import { getAnalyticsService } from '@/lib/services/analytics'

const advancedAnalytics = getAnalyticsService()

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'legacy'

    if (type === 'legacy') {
      // Return old analytics format for backward compatibility
      const data = analytics.getAnalytics()
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // New advanced analytics
    let data: any

    switch (type) {
      case 'summary':
        data = {
          usage: advancedAnalytics.getUsageStatistics(),
          agents: advancedAnalytics.getAgentMetrics(),
          errors: advancedAnalytics.getErrorAnalysis(),
        }
        break

      case 'performance':
        data = advancedAnalytics.generatePerformanceReport()
        break

      case 'events':
        const eventType = searchParams.get('eventType') as any
        const sessionId = searchParams.get('sessionId') || undefined
        data = advancedAnalytics.getEvents({
          type: eventType,
          sessionId,
        })
        break

      case 'agents':
        const agentName = searchParams.get('agentName') || undefined
        data = advancedAnalytics.getAgentMetrics(agentName)
        break

      case 'system':
        const minutes = parseInt(searchParams.get('minutes') || '60')
        data = advancedAnalytics.getSystemMetrics(minutes)
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid type parameter' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, data } = body

    switch (action) {
      case 'export':
        const format = data?.format || 'json'
        const exportData = advancedAnalytics.exportData(format)
        return new Response(exportData, {
          headers: {
            'Content-Type': format === 'json' ? 'application/json' : 'text/csv',
            'Content-Disposition': `attachment; filename="analytics.${format}"`,
          },
        })

      case 'clear':
        const daysToKeep = data?.daysToKeep || 7
        const cleared = advancedAnalytics.clearOldEvents(daysToKeep)
        return new Response(
          JSON.stringify({ cleared, message: `Cleared ${cleared} old events` }),
          { headers: { 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Analytics API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    analytics.reset()
    advancedAnalytics.clearOldEvents(0) // Clear all events
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Analytics reset error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

