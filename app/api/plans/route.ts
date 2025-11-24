import { NextRequest } from 'next/server'
import { AccountPlan } from '@/types'

// Shared plans storage (in production, use a database)
const plans = new Map<string, AccountPlan>()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const planId = searchParams.get('planId')

  if (planId) {
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

  // Return all plans (for demo purposes)
  const allPlans = Array.from(plans.values())
  return new Response(JSON.stringify({ plans: allPlans }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

