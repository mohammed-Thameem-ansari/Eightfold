/**
 * Test Workflow Updates Streaming
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { ResearchAgent } from './lib/agent'

async function main() {
  console.log('🧪 Testing Workflow Updates Streaming\n')
  console.log('Query: "Research Tesla and generate account plan"\n')
  console.log('=' .repeat(60))

  const agent = new ResearchAgent()
  let workflowUpdateCount = 0
  let agentUpdateCount = 0
  let contentChunks = 0

  console.log('\n📊 EVENT STREAM:\n')

  try {
    for await (const chunk of agent.processMessage('Research Tesla and generate account plan')) {
      if (chunk.type === 'workflow-update') {
        workflowUpdateCount++
        console.log(`🔄 WORKFLOW UPDATE #${workflowUpdateCount}:`, chunk.data.type)
        if (chunk.data.phase) console.log(`   Phase: ${chunk.data.phase}`)
        if (chunk.data.message) console.log(`   Message: ${chunk.data.message}`)
        if (chunk.data.agentName) console.log(`   Agent: ${chunk.data.agentName}`)
      } else if (chunk.type === 'agent-update') {
        agentUpdateCount++
        console.log(`🤖 AGENT UPDATE #${agentUpdateCount}:`, chunk.data)
      } else if (chunk.type === 'content') {
        contentChunks++
        if (contentChunks <= 3) {
          console.log(`💬 CONTENT CHUNK #${contentChunks}: ${chunk.data.slice(0, 50)}...`)
        }
      } else if (chunk.type === 'done') {
        console.log(`✅ DONE`)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 SUMMARY:\n')
    console.log(`✅ Workflow Updates: ${workflowUpdateCount}`)
    console.log(`✅ Agent Updates: ${agentUpdateCount}`)
    console.log(`✅ Content Chunks: ${contentChunks}`)

    if (workflowUpdateCount > 0) {
      console.log('\n🎉 SUCCESS: Workflow updates are being emitted!')
      console.log('   The UI should now show:')
      console.log('   - Phase progress bar')
      console.log('   - Agent status panels')
      console.log('   - Workflow visualization')
    } else {
      console.log('\n⚠️  WARNING: No workflow updates detected')
      console.log('   This might be because:')
      console.log('   1. Query did not trigger multi-agent workflow')
      console.log('   2. Keywords not matched (needs: research, analyze, plan, etc.)')
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error)
  }
}

main().catch(console.error)
