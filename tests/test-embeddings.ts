/**
 * Test Gemini Embeddings with Vector Database
 */

import { config } from 'dotenv'
import { VectorDatabaseService } from './lib/services/vector-database'

// Load environment variables
config({ path: '.env.local' })

async function testEmbeddings() {
  console.log('\n🧪 Testing Gemini Embeddings...\n')

  try {
    // Create vector service with Gemini embeddings
    const vectorService = new VectorDatabaseService({
      provider: 'gemini',
      model: 'text-embedding-004',
      dimensions: 768 // Gemini embedding dimensions
    })

    console.log('✓ Vector service initialized with Gemini')

    // Test 1: Generate single embedding
    console.log('\n📊 Test 1: Generate embedding for sample text...')
    const testText = 'Artificial intelligence is transforming the world'
    const embedding = await vectorService.generateEmbedding(testText)
    
    console.log(`✓ Embedding generated: ${embedding.length} dimensions`)
    console.log(`✓ Sample values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`)

    // Test 2: Add documents
    console.log('\n📚 Test 2: Adding test documents...')
    await vectorService.addDocument({
      id: 'doc1',
      content: 'Machine learning is a subset of artificial intelligence',
      metadata: { source: 'test', type: 'definition' }
    })

    await vectorService.addDocument({
      id: 'doc2',
      content: 'Natural language processing enables computers to understand human language',
      metadata: { source: 'test', type: 'definition' }
    })

    await vectorService.addDocument({
      id: 'doc3',
      content: 'Deep learning uses neural networks with multiple layers',
      metadata: { source: 'test', type: 'definition' }
    })

    console.log(`✓ Added ${vectorService.getCount()} documents`)

    // Test 3: Search
    console.log('\n🔍 Test 3: Searching for similar documents...')
    const query = 'What is AI and machine learning?'
    const results = await vectorService.search(query, { topK: 2 })

    console.log(`✓ Found ${results.length} relevant documents:`)
    results.forEach((result, i) => {
      console.log(`\n  ${i + 1}. Score: ${result.score.toFixed(4)}`)
      console.log(`     Content: "${result.document.content}"`)
    })

    // Test 4: RAG generation
    console.log('\n💬 Test 4: Generating answer with RAG...')
    const answer = await vectorService.generateWithRAG(
      'Explain artificial intelligence briefly',
      { 
        llmProvider: 'gemini',
        systemPrompt: 'You are a helpful AI assistant. Answer concisely based on the context.'
      }
    )

    console.log(`✓ Generated answer:\n   "${answer.substring(0, 200)}..."`)

    console.log('\n✅ All embedding tests passed!')

  } catch (error: any) {
    console.error('\n❌ Embedding test failed:', error.message)
    if (error.stack) {
      console.error('\nStack trace:', error.stack)
    }
  }
}

testEmbeddings()
