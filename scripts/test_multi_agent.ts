import { ResearchAgent } from '../lib/agent'

async function run() {
  const agent = new ResearchAgent()
  const message = 'Research Tesla for an account plan'
  console.log('Input:', message)
  const updates: any[] = []
  for await (const chunk of agent.processMessage(message)) {
    if (chunk.type === 'workflow-update') {
      console.log('[WORKFLOW]', chunk.data.type, chunk.data.message || '')
    } else if (chunk.type === 'agent-update') {
      console.log('[AGENT]', chunk.data)
    } else if (chunk.type === 'tool-call') {
      console.log('[TOOL]', chunk.data.name, JSON.stringify(chunk.data.input))
    } else if (chunk.type === 'content') {
      console.log('[CONTENT CHUNK]', (chunk.data as string).substring(0,150) + '...')
    } else if (chunk.type === 'sources') {
      console.log('[SOURCES]', chunk.data.length)
    } else if (chunk.type === 'done') {
      console.log('DONE')
    } else if (chunk.type === 'error') {
      console.error('ERROR:', chunk.data)
    }
    updates.push(chunk)
  }
  console.log('\nSummary:')
  console.log(updates.map(u => u.type).join(', '))
}

run().catch(e => {
  console.error('Script failed:', e)
  process.exit(1)
})
