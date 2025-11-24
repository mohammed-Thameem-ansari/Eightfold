import { NextRequest } from 'next/server'
import { ResearchAgent } from '@/lib/agent'
import { AccountPlan, PlanSection, Source } from '@/types'
import { SECTION_TITLES } from '@/lib/constants'
import { generateId } from '@/lib/utils'

const agents = new Map<string, ResearchAgent>()
const plans = new Map<string, AccountPlan>()

function getAgent(sessionId: string): ResearchAgent {
  if (!agents.has(sessionId)) {
    agents.set(sessionId, new ResearchAgent())
  }
  return agents.get(sessionId)!
}

export async function POST(req: NextRequest) {
  try {
    const { companyName, sessionId, researchData } = await req.json()

    if (!companyName) {
      return new Response(JSON.stringify({ error: 'Company name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const agent = getAgent(sessionId || 'default')
    
    // Generate account plan sections based on research data
    const sections: PlanSection[] = Object.entries(SECTION_TITLES).map(([type, title]) => ({
      id: generateId(),
      type: type as PlanSection['type'],
      title,
      content: generateSectionContent(type, companyName, researchData),
      sources: researchData?.sources || [],
      confidence: 0.85,
      lastUpdated: new Date(),
    }))

    const plan: AccountPlan = {
      id: generateId(),
      companyName,
      createdAt: new Date(),
      updatedAt: new Date(),
      sections,
      sources: researchData?.sources || [],
    }

    // Store plan for later retrieval
    plans.set(plan.id, plan)

    return new Response(JSON.stringify({ plan }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Generate plan error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

function generateSectionContent(
  sectionType: string,
  companyName: string,
  researchData: any
): string {
  // This would normally use AI to generate content, but for now return template
  const templates: Record<string, string> = {
    overview: `${companyName} is a leading company in its industry. Based on recent research, the company has established a strong market presence and continues to innovate in its sector.

Key highlights:
• Industry leader with significant market share
• Strong financial performance
• Commitment to innovation and customer satisfaction`,
    
    'market-position': `${companyName} holds a competitive position in the market. The company faces competition from several key players but maintains its position through innovation and strategic initiatives.

Competitive landscape:
• Primary competitors include major industry players
• Market share is stable with growth potential
• Differentiation through unique value propositions`,
    
    'decision-makers': `Key decision makers at ${companyName} include:

• CEO: Leadership focused on strategic growth
• CTO: Technology innovation and digital transformation
• CFO: Financial strategy and operations
• VP of Sales: Revenue growth and customer relationships

Note: Specific names and titles should be verified through LinkedIn and company website.`,
    
    'products-services': `${companyName} offers a comprehensive suite of products and services:

• Core product lines addressing key market needs
• Service offerings supporting customer success
• Emerging solutions in growth areas

The company's portfolio is designed to meet diverse customer requirements across different market segments.`,
    
    'recent-news': `Recent developments at ${companyName}:

• Strategic partnerships and collaborations
• Product launches and updates
• Market expansion initiatives
• Industry recognition and awards

These developments indicate active growth and market engagement.`,
    
    'pain-points': `Potential pain points and opportunities for ${companyName}:

Pain Points:
• Market competition and differentiation challenges
• Need for digital transformation
• Customer retention and growth

Opportunities:
• Emerging market trends
• Technology integration
• Strategic partnerships
• Market expansion`,
    
    'recommended-approach': `Recommended approach for engaging with ${companyName}:

1. Initial Outreach: Focus on understanding their current challenges and priorities
2. Value Proposition: Highlight solutions that address their specific pain points
3. Relationship Building: Engage with key decision makers through multiple channels
4. Customized Approach: Tailor solutions to their unique business needs
5. Long-term Partnership: Build trust through consistent value delivery

Next Steps:
• Schedule discovery call
• Prepare customized proposal
• Identify best entry point`,
  }

  return templates[sectionType] || `Content for ${sectionType} section about ${companyName}.`
}

