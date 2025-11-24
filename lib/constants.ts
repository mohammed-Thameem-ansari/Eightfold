import { PersonaContext } from '@/types'

export const PERSONA_CONTEXTS: Record<string, PersonaContext> = {
  confused: {
    type: 'confused',
    characteristics: [
      'Uncertain about what they need',
      'Asks multiple questions',
      'May change their mind frequently',
      'Needs guidance and clarification'
    ],
    handlingStrategy: 'Ask clarifying questions, provide options, be patient and supportive'
  },
  efficient: {
    type: 'efficient',
    characteristics: [
      'Direct and to the point',
      'Wants quick results',
      'Minimal small talk',
      'Clear about requirements'
    ],
    handlingStrategy: 'Get straight to the point, minimize unnecessary steps, deliver results quickly'
  },
  chatty: {
    type: 'chatty',
    characteristics: [
      'Shares personal anecdotes',
      'Goes off-topic frequently',
      'Enjoys conversation',
      'May provide unnecessary context'
    ],
    handlingStrategy: 'Politely redirect to the task, acknowledge their input, stay friendly but focused'
  },
  normal: {
    type: 'normal',
    characteristics: [
      'Balanced communication style',
      'Clear but conversational',
      'Reasonable expectations'
    ],
    handlingStrategy: 'Engage naturally, provide helpful information, maintain professional tone'
  },
  'edge-case': {
    type: 'edge-case',
    characteristics: [
      'Asks about non-existent companies',
      'Provides invalid information',
      'Tests system limits',
      'May encounter errors'
    ],
    handlingStrategy: 'Handle gracefully, explain limitations clearly, offer alternatives'
  }
}

export const SECTION_TITLES: Record<string, string> = {
  overview: 'Company Overview',
  'market-position': 'Market Position & Competitors',
  'decision-makers': 'Key Decision Makers',
  'products-services': 'Products & Services',
  'recent-news': 'Recent News & Developments',
  'pain-points': 'Pain Points & Opportunities',
  'recommended-approach': 'Recommended Approach'
}

