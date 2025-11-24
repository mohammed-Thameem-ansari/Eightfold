/**
 * Comprehensive System Test - Agent Wiring & Pinecone Integration
 */

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

import { ResearchAgent } from './lib/agent'
import { getVectorDBService } from './lib/services/vector-database'

const TEST_TIMEOUT = 45000 // 45 seconds

async function testWithTimeout<T>(
  testName: string,
  testFn: () => Promise<T>,
  timeout: number = TEST_TIMEOUT
): Promise<{ success: boolean; result?: T; error?: string; duration: number }> {
  const startTime = Date.now()
  console.log(`\n🧪 Testing: ${testName}`)

  try {
    const result = await Promise.race([
      testFn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Test timeout')), timeout)
      ),
    ])

    const duration = Date.now() - startTime
    console.log(`✅ PASSED (${duration}ms)`)
    return { success: true, result, duration }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.log(`❌ FAILED (${duration}ms): ${errorMsg}`)
    return { success: false, error: errorMsg, duration }
  }
}

async function main() {
  console.log('🚀 Starting Comprehensive System Test\n')
  console.log('Testing Agent Wiring & Pinecone Integration\n')
  console.log('=' .repeat(60))

  const results: any[] = []

  // Test 1: Vector Database Initialization
  const test1 = await testWithTimeout('Vector Database Initialization', async () => {
    const vectorDB = getVectorDBService()
    console.log('   📊 Initial document count:', vectorDB.getCount())
    return { count: vectorDB.getCount() }
  })
  results.push({ test: 'Vector DB Init', ...test1 })

  // Test 2: Pinecone Environment Check
  const test2 = await testWithTimeout('Pinecone Environment Variables', async () => {
    const apiKey = process.env.PINECONE_API_KEY
    const indexName = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX
    console.log('   🔑 API Key:', apiKey ? `${apiKey.slice(0, 10)}...` : 'MISSING')
    console.log('   📇 Index Name:', indexName || 'MISSING')
    
    if (!apiKey) throw new Error('PINECONE_API_KEY not found')
    if (!indexName) throw new Error('PINECONE_INDEX_NAME not found')
    
    return { apiKey: !!apiKey, indexName }
  })
  results.push({ test: 'Pinecone Env', ...test2 })

  // Test 3: Embedding Generation (Simple)
  const test3 = await testWithTimeout('Embedding Generation', async () => {
    const vectorDB = getVectorDBService()
    const embedding = await vectorDB.generateEmbedding('test query about Apple company')
    console.log('   📏 Embedding dimensions:', embedding.length)
    console.log('   🔢 First 3 values:', embedding.slice(0, 3))
    
    if (!Array.isArray(embedding)) throw new Error('Embedding not an array')
    if (embedding.length === 0) throw new Error('Empty embedding')
    
    return { dimensions: embedding.length, sample: embedding.slice(0, 3) }
  }, 35000) // Longer timeout for embedding
  results.push({ test: 'Embedding Gen', ...test3 })

  // Test 4: Vector Store Operations
  const test4 = await testWithTimeout('Vector Store Operations', async () => {
    const vectorDB = getVectorDBService()
    
    // Add test document
    console.log('   📝 Adding test document...')
    await vectorDB.addDocument({
      id: 'test-doc-1',
      content: 'Apple Inc. is a technology company that designs consumer electronics.',
      metadata: { source: 'test', type: 'company-info' },
    })
    
    // Search for it
    console.log('   🔍 Searching for "Apple technology"...')
    const results = await vectorDB.search('Apple technology', { topK: 3 })
    console.log('   📊 Search results:', results.length)
    
    if (results.length > 0) {
      console.log('   🎯 Top result score:', results[0].score.toFixed(4))
      console.log('   📄 Top result content:', results[0].document.content.slice(0, 50) + '...')
    }
    
    return { resultsCount: results.length, topScore: results[0]?.score }
  }, 40000)
  results.push({ test: 'Vector Store Ops', ...test4 })

  // Test 5: Agent Initialization
  const test5 = await testWithTimeout('Research Agent Initialization', async () => {
    const agent = new ResearchAgent()
    console.log('   🤖 Agent created successfully')
    return { initialized: true }
  })
  results.push({ test: 'Agent Init', ...test5 })

  // Test 6: Agent Simple Query (Non-blocking)
  const test6 = await testWithTimeout('Agent Simple Query', async () => {
    const agent = new ResearchAgent()
    let chunks = 0
    let contentLength = 0
    let hasReasoning = false
    let hasSources = false
    
    console.log('   💬 Processing: "What is Apple?"')
    
    for await (const chunk of agent.processMessage('What is Apple?')) {
      chunks++
      
      if (chunk.type === 'reasoning') {
        hasReasoning = true
        console.log('   🧠 Reasoning chunk received')
      } else if (chunk.type === 'content') {
        contentLength += chunk.data.length
      } else if (chunk.type === 'sources') {
        hasSources = true
        console.log('   📚 Sources:', chunk.data.length)
      } else if (chunk.type === 'done') {
        console.log('   ✅ Response complete')
      }
    }
    
    console.log('   📊 Total chunks:', chunks)
    console.log('   📝 Content length:', contentLength)
    
    return { chunks, contentLength, hasReasoning, hasSources }
  }, 40000)
  results.push({ test: 'Agent Simple Query', ...test6 })

  // Test 7: Pinecone Direct Query Test
  const test7 = await testWithTimeout('Pinecone Direct Query Test', async () => {
    try {
      const { Pinecone } = await import('@pinecone-database/pinecone')
      
      const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!,
      })

      const indexName = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX || 'research-agent'
      console.log('   📇 Connecting to index:', indexName)
      
      const index = pinecone.Index(indexName)
      
      // Try to describe index stats
      console.log('   📊 Fetching index stats...')
      const stats = await Promise.race([
        index.describeIndexStats(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Pinecone stats timeout')), 10000)
        )
      ])
      
      console.log('   📈 Total vectors:', (stats as any).totalRecordCount || 0)
      console.log('   🌐 Namespaces:', Object.keys((stats as any).namespaces || {}))
      
      return { 
        connected: true, 
        totalVectors: (stats as any).totalRecordCount || 0,
        namespaces: Object.keys((stats as any).namespaces || {})
      }
    } catch (error) {
      console.log('   ⚠️  Pinecone direct query failed:', error instanceof Error ? error.message : error)
      throw error
    }
  }, 15000)
  results.push({ test: 'Pinecone Direct', ...test7 })

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY\n')
  
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log(`✅ Passed: ${passed}/${results.length}`)
  console.log(`❌ Failed: ${failed}/${results.length}`)
  
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`   • ${r.test}: ${r.error}`)
    })
  }
  
  console.log('\n📋 DETAILED RESULTS:')
  results.forEach(r => {
    console.log(`\n${r.success ? '✅' : '❌'} ${r.test}`)
    console.log(`   Duration: ${r.duration}ms`)
    if (r.error) console.log(`   Error: ${r.error}`)
    if (r.result) console.log(`   Result:`, JSON.stringify(r.result, null, 2))
  })
  
  console.log('\n' + '='.repeat(60))
  
  // Diagnosis
  console.log('\n🔬 DIAGNOSIS:\n')
  
  const vectorDBTest = results.find(r => r.test === 'Vector DB Init')
  const pineconeEnvTest = results.find(r => r.test === 'Pinecone Env')
  const embeddingTest = results.find(r => r.test === 'Embedding Gen')
  const pineconeDirectTest = results.find(r => r.test === 'Pinecone Direct')
  
  if (!pineconeEnvTest.success) {
    console.log('⚠️  PINECONE NOT CONFIGURED')
    console.log('   Add to .env.local:')
    console.log('   PINECONE_API_KEY=your_key_here')
    console.log('   PINECONE_INDEX_NAME=research-agent')
  }
  
  if (embeddingTest.success && embeddingTest.duration > 10000) {
    console.log('⚠️  EMBEDDING GENERATION SLOW')
    console.log(`   Took ${embeddingTest.duration}ms (should be < 5s)`)
    console.log('   This is why responses feel slow after Pinecone init')
  }
  
  if (pineconeDirectTest.success) {
    console.log('✅ PINECONE WORKING')
    console.log(`   Total vectors in index: ${pineconeDirectTest.result?.totalVectors || 0}`)
  } else if (pineconeEnvTest.success) {
    console.log('❌ PINECONE CONNECTION FAILED')
    console.log('   Environment variables present but connection failed')
    console.log('   Check: API key validity, index name, network connectivity')
  }
  
  const agentQueryTest = results.find(r => r.test === 'Agent Simple Query')
  if (agentQueryTest.success) {
    console.log('✅ AGENT STREAMING WORKING')
    console.log(`   Generated ${agentQueryTest.result?.contentLength || 0} characters`)
    console.log(`   Reasoning: ${agentQueryTest.result?.hasReasoning ? 'Yes' : 'No'}`)
    console.log(`   Sources: ${agentQueryTest.result?.hasSources ? 'Yes' : 'No'}`)
  }
  
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(error => {
  console.error('❌ Test suite crashed:', error)
  process.exit(1)
})
