/**
 * Comprehensive System Test - UI, Agents, Pinecone, and Workflow
 */

import { ResearchAgent } from './lib/agent'
import { AgentOrchestrator } from './lib/agents/orchestrator'
import { getVectorDBService } from './lib/services/vector-database'
import { searchWeb } from './lib/api-client'

console.log('🧪 Starting Comprehensive System Tests...\n')

async function testPineconeIntegration() {
  console.log('📊 Test 1: Pinecone Integration')
  console.log('='.repeat(50))

  try {
    const vectorDB = getVectorDBService({ 
      provider: 'gemini',
      dimensions: 768 
    })

    // Test document addition
    console.log('  ✓ Adding test document...')
    await vectorDB.addDocument({
      id: 'test-doc-1',
      content: 'Apple Inc. is a technology company that designs and manufactures consumer electronics.',
      metadata: {
        company: 'Apple',
        type: 'overview',
        timestamp: new Date().toISOString(),
      },
    })

    await vectorDB.addDocument({
      id: 'test-doc-2',
      content: 'Apple reported record revenue of $394 billion in fiscal year 2023.',
      metadata: {
        company: 'Apple',
        type: 'financial',
        timestamp: new Date().toISOString(),
      },
    })

    console.log('  ✓ Documents added successfully')

    // Test search
    console.log('  ✓ Testing semantic search...')
    const results = await vectorDB.search('Apple revenue and financials', {
      topK: 2,
      filter: { company: 'Apple' },
    })

    console.log(`  ✓ Found ${results.length} relevant documents`)
    for (const result of results) {
      console.log(`    - Score: ${result.score.toFixed(3)} | ${result.document.content.slice(0, 60)}...`)
    }

    // Test RAG
    console.log('  ✓ Testing RAG retrieval...')
    const context = await vectorDB.retrieveContext('Tell me about Apple', { topK: 2 })
    console.log(`  ✓ Retrieved ${context.length} characters of context`)

    console.log('\n✅ Pinecone Integration: PASSED\n')
    return true
  } catch (error) {
    console.error('\n❌ Pinecone Integration: FAILED')
    console.error('  Error:', (error as Error).message)
    return false
  }
}

async function testAgentWiring() {
  console.log('🤖 Test 2: Agent Wiring & Orchestration')
  console.log('='.repeat(50))

  try {
    const orchestrator = new AgentOrchestrator()

    // Get all agents
    const agents = orchestrator.getAllAgents()
    console.log(`  ✓ Found ${agents.length} agents registered:`)

    const expectedAgents = [
      'research', 'analysis', 'writing', 'validation',
      'competitive', 'financial', 'contact', 'news',
      'market', 'product', 'risk', 'opportunity',
      'synthesis', 'quality', 'strategy'
    ]

    let allWired = true
    for (const agentName of expectedAgents) {
      const agent = orchestrator.getAgent(agentName)
      if (agent) {
        console.log(`    ✓ ${agentName}: ${agent.getDescription()}`)
      } else {
        console.log(`    ❌ ${agentName}: NOT FOUND`)
        allWired = false
      }
    }

    if (!allWired) {
      throw new Error('Not all agents are properly wired')
    }

    console.log('\n✅ Agent Wiring: PASSED\n')
    return true
  } catch (error) {
    console.error('\n❌ Agent Wiring: FAILED')
    console.error('  Error:', (error as Error).message)
    return false
  }
}

async function testSearchAPI() {
  console.log('🔍 Test 3: Search API Integration')
  console.log('='.repeat(50))

  try {
    console.log('  ✓ Testing web search...')
    const sources = await searchWeb('Apple Inc company information', 'Apple')

    console.log(`  ✓ Found ${sources.length} sources`)
    for (const source of sources.slice(0, 3)) {
      console.log(`    - ${source.title}`)
      console.log(`      URL: ${source.url}`)
    }

    if (sources.length === 0) {
      throw new Error('No sources returned from search')
    }

    console.log('\n✅ Search API: PASSED\n')
    return true
  } catch (error) {
    console.error('\n❌ Search API: FAILED')
    console.error('  Error:', (error as Error).message)
    return false
  }
}

async function testMultiAgentWorkflow() {
  console.log('⚡ Test 4: Multi-Agent Workflow')
  console.log('='.repeat(50))

  try {
    const orchestrator = new AgentOrchestrator()

    console.log('  ✓ Starting workflow for Microsoft...')
    let phaseCount = 0
    let updateCount = 0

    for await (const update of orchestrator.executeResearchWorkflow('Microsoft', [])) {
      updateCount++
      
      if (update.type === 'phase-start') {
        phaseCount++
        console.log(`  ✓ Phase ${phaseCount}: ${update.message}`)
      } else if (update.type === 'phase-complete') {
        console.log(`    ✓ Phase completed with results`)
      } else if (update.type === 'workflow-complete') {
        console.log(`  ✓ Workflow completed successfully`)
        console.log(`    - Total phases: ${phaseCount}`)
        console.log(`    - Total updates: ${updateCount}`)
      } else if (update.type === 'workflow-error') {
        throw new Error(update.error || 'Workflow error')
      }
    }

    if (phaseCount < 3) {
      throw new Error(`Expected at least 3 phases, got ${phaseCount}`)
    }

    console.log('\n✅ Multi-Agent Workflow: PASSED\n')
    return true
  } catch (error) {
    console.error('\n❌ Multi-Agent Workflow: FAILED')
    console.error('  Error:', (error as Error).message)
    return false
  }
}

async function testChatAPI() {
  console.log('💬 Test 5: Chat API Flow')
  console.log('='.repeat(50))

  try {
    const agent = new ResearchAgent()

    console.log('  ✓ Processing message: "Research Tesla"')
    let contentChunks = 0
    let toolCalls = 0
    let sources = 0

    for await (const chunk of agent.processMessage('Research Tesla and generate an overview')) {
      if (chunk.type === 'content') {
        contentChunks++
      } else if (chunk.type === 'tool-call') {
        toolCalls++
        console.log(`    ✓ Tool call: ${chunk.data.name}`)
      } else if (chunk.type === 'sources') {
        sources = chunk.data.length
        console.log(`    ✓ Sources: ${sources}`)
      } else if (chunk.type === 'agent-update') {
        console.log(`    ✓ Agent: ${chunk.data}`)
      } else if (chunk.type === 'done') {
        console.log(`  ✓ Chat completed`)
        console.log(`    - Content chunks: ${contentChunks}`)
        console.log(`    - Tool calls: ${toolCalls}`)
        console.log(`    - Sources: ${sources}`)
      }
    }

    if (contentChunks === 0) {
      throw new Error('No content generated')
    }

    console.log('\n✅ Chat API: PASSED\n')
    return true
  } catch (error) {
    console.error('\n❌ Chat API: FAILED')
    console.error('  Error:', (error as Error).message)
    return false
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60))
  console.log('  COMPREHENSIVE SYSTEM TEST SUITE')
  console.log('='.repeat(60) + '\n')

  const results = {
    pinecone: false,
    agents: false,
    search: false,
    workflow: false,
    chat: false,
  }

  // Run tests
  results.pinecone = await testPineconeIntegration()
  results.agents = await testAgentWiring()
  results.search = await testSearchAPI()
  results.workflow = await testMultiAgentWorkflow()
  results.chat = await testChatAPI()

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('  TEST SUMMARY')
  console.log('='.repeat(60))

  const passed = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length

  console.log(`\nPinecone Integration:     ${results.pinecone ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Agent Wiring:             ${results.agents ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Search API:               ${results.search ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Multi-Agent Workflow:     ${results.workflow ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Chat API:                 ${results.chat ? '✅ PASS' : '❌ FAIL'}`)

  console.log(`\nTotal: ${passed}/${total} tests passed`)

  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED! System is ready for production.\n')
    return 0
  } else {
    console.log('\n⚠️  Some tests failed. Please review errors above.\n')
    return 1
  }
}

// Run tests
runAllTests()
  .then((exitCode) => {
    process.exit(exitCode)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
