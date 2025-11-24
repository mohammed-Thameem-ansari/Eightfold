import { NextRequest } from 'next/server'
import { AccountPlan } from '@/types'

// In production, store plans in a database
// For now, using in-memory storage (shared with generate-plan route)
// In a real app, these would be in a shared database
const plans = new Map<string, AccountPlan>()

export async function POST(req: NextRequest) {
  try {
    const { planId, sectionId, newContent } = await req.json()

    if (!planId || !sectionId || !newContent) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const plan = plans.get(planId)
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const section = plan.sections.find(s => s.id === sectionId)
    if (!section) {
      return new Response(JSON.stringify({ error: 'Section not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Update section
    section.content = newContent
    section.lastUpdated = new Date()
    plan.updatedAt = new Date()

    plans.set(planId, plan)

    return new Response(JSON.stringify({ plan, section }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Update section error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const planId = searchParams.get('planId')

  if (!planId) {
    return new Response(JSON.stringify({ error: 'Plan ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const plan = plans.get(planId)
  if (!plan) {
    return new Response(JSON.stringify({ error: 'Plan not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ plan }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

