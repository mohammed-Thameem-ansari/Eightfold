/**
 * Real Query Test - Diagnose where the slowdown happens
 */

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

import { ResearchAgent } from './lib/agent'

async function main() {
  console.log('🚀 Testing Real Research Query\n')
  console.log('Query: "Research Apple and create an account plan"\n')
  console.log('=' .repeat(60))

  const agent = new ResearchAgent()
  const startTime = Date.now()
  let lastChunkTime = startTime

  let totalChunks = 0
  let contentLength = 0
  let hasReasoning = false
  let hasSources = false
  let sourcesCount = 0
  let hasWorkflow = false

  console.log('\n📊 STREAMING EVENTS:\n')

  try {
    for await (const chunk of agent.processMessage('Research Apple and create an account plan')) {
      const now = Date.now()
      const timeSinceStart = now - startTime
      const timeSinceLastChunk = now - lastChunkTime
      lastChunkTime = now

      totalChunks++

      if (chunk.type === 'reasoning') {
        hasReasoning = true
        console.log(`[${timeSinceStart}ms] 🧠 REASONING (${chunk.data.length} chars, gap: ${timeSinceLastChunk}ms)`)
        console.log(`   ${chunk.data.slice(0, 100)}...`)
      } else if (chunk.type === 'tool-call') {
        console.log(`[${timeSinceStart}ms] 🔧 TOOL CALL: ${chunk.data.name} (gap: ${timeSinceLastChunk}ms)`)
        console.log(`   Input:`, JSON.stringify(chunk.data.input).slice(0, 100))
      } else if (chunk.type === 'content') {
        contentLength += chunk.data.length
        if (totalChunks <= 5 || chunk.data.length > 50) {
          console.log(`[${timeSinceStart}ms] 💬 CONTENT (${chunk.data.length} chars, gap: ${timeSinceLastChunk}ms)`)
          console.log(`   ${chunk.data.slice(0, 80)}`)
        }
      } else if (chunk.type === 'sources') {
        hasSources = true
        sourcesCount = chunk.data.length
        console.log(`[${timeSinceStart}ms] 📚 SOURCES (${chunk.data.length} sources, gap: ${timeSinceLastChunk}ms)`)
        chunk.data.forEach((s: any, i: number) => {
          if (i < 3) console.log(`   ${i + 1}. ${s.title?.slice(0, 50) || s.url}`)
        })
      } else if (chunk.type === 'workflow-update') {
        hasWorkflow = true
        console.log(`[${timeSinceStart}ms] 🔄 WORKFLOW: ${chunk.data.phase} - ${chunk.data.status} (gap: ${timeSinceLastChunk}ms)`)
        if (chunk.data.agentName) {
          console.log(`   Agent: ${chunk.data.agentName}`)
        }
      } else if (chunk.type === 'done') {
        console.log(`[${timeSinceStart}ms] ✅ DONE (gap: ${timeSinceLastChunk}ms)`)
      } else {
        console.log(`[${timeSinceStart}ms] ❓ UNKNOWN TYPE: ${chunk.type} (gap: ${timeSinceLastChunk}ms)`)
      }
    }

    const totalTime = Date.now() - startTime

    console.log('\n' + '='.repeat(60))
    console.log('📊 SUMMARY\n')
    console.log(`⏱️  Total Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`)
    console.log(`📦 Total Chunks: ${totalChunks}`)
    console.log(`📝 Content Length: ${contentLength} characters`)
    console.log(`🧠 Has Reasoning: ${hasReasoning ? 'Yes' : 'No'}`)
    console.log(`📚 Has Sources: ${hasSources ? 'Yes (' + sourcesCount + ' sources)' : 'No'}`)
    console.log(`🔄 Has Workflow: ${hasWorkflow ? 'Yes' : 'No'}`)

    console.log('\n🔬 PERFORMANCE ANALYSIS:\n')

    if (totalTime < 5000) {
      console.log('✅ EXCELLENT: Response under 5 seconds')
    } else if (totalTime < 10000) {
      console.log('✅ GOOD: Response under 10 seconds')
    } else if (totalTime < 20000) {
      console.log('⚠️  SLOW: Response taking 10-20 seconds')
      console.log('   This could be due to:')
      console.log('   - Gemini embedding generation (2-5s per query)')
      console.log('   - Multiple web searches (3-5s each)')
      console.log('   - Multi-agent workflow orchestration')
    } else {
      console.log('❌ VERY SLOW: Response over 20 seconds')
      console.log('   Likely causes:')
      console.log('   - Network timeout or slow API responses')
      console.log('   - Multiple retry attempts')
      console.log('   - Pinecone queries timing out')
    }

    if (!hasSources) {
      console.log('\n⚠️  NO SOURCES: Web search may have failed')
    }

    if (!hasWorkflow) {
      console.log('\n⚠️  NO WORKFLOW: Multi-agent system not triggered')
    }

    console.log('\n' + '='.repeat(60))

  } catch (error) {
    console.error('\n❌ ERROR:', error)
    console.log('\nTime before error:', Date.now() - startTime, 'ms')
  }
}

main().catch(error => {
  console.error('❌ Test crashed:', error)
  process.exit(1)
})
