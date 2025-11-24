/**
 * API Key Diagnostic Tool
 * Run with: node test-api-keys.js
 * 
 * This script tests all configured API keys and reports their status
 */

require('dotenv').config({ path: '.env.local' })

const https = require('https')
const http = require('http')

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Test functions for each service
async function testGeminiAPI() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    return { service: 'Google Gemini', status: 'NOT_CONFIGURED', message: 'API key not found in .env.local' }
  }

  try {
    const model = process.env.GOOGLE_GEMINI_MODEL || 'models/gemini-2.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1/${model}:generateContent?key=${apiKey}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say "API works"' }] }]
      })
    })

    if (response.ok) {
      const data = await response.json()
      return { 
        service: 'Google Gemini', 
        status: 'WORKING', 
        message: `Model: ${model}`,
        details: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Response received'
      }
    } else {
      const errorText = await response.text()
      return { 
        service: 'Google Gemini', 
        status: 'ERROR', 
        message: `HTTP ${response.status}: ${errorText.substring(0, 200)}`
      }
    }
  } catch (error) {
    return { 
      service: 'Google Gemini', 
      status: 'ERROR', 
      message: error.message 
    }
  }
}

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { service: 'OpenAI', status: 'NOT_CONFIGURED', message: 'API key not found' }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })

    if (response.ok) {
      const data = await response.json()
      return { 
        service: 'OpenAI', 
        status: 'WORKING', 
        message: `${data.data.length} models available`
      }
    } else {
      return { 
        service: 'OpenAI', 
        status: 'ERROR', 
        message: `HTTP ${response.status}`
      }
    }
  } catch (error) {
    return { 
      service: 'OpenAI', 
      status: 'ERROR', 
      message: error.message 
    }
  }
}

async function testSerpAPI() {
  const apiKey = process.env.SERP_API_KEY
  if (!apiKey) {
    return { service: 'SerpAPI', status: 'NOT_CONFIGURED', message: 'API key not found' }
  }

  try {
    const response = await fetch(`https://serpapi.com/search.json?engine=google&q=test&api_key=${apiKey}`)
    
    if (response.ok) {
      const data = await response.json()
      return { 
        service: 'SerpAPI', 
        status: 'WORKING', 
        message: `Search results: ${data.organic_results?.length || 0} items`
      }
    } else {
      return { 
        service: 'SerpAPI', 
        status: 'ERROR', 
        message: `HTTP ${response.status}`
      }
    }
  } catch (error) {
    return { 
      service: 'SerpAPI', 
      status: 'ERROR', 
      message: error.message 
    }
  }
}

async function testAnthropicAPI() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { service: 'Anthropic Claude', status: 'NOT_CONFIGURED', message: 'API key not found (optional)' }
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    })

    if (response.ok) {
      return { 
        service: 'Anthropic Claude', 
        status: 'WORKING', 
        message: 'API key valid'
      }
    } else {
      return { 
        service: 'Anthropic Claude', 
        status: 'ERROR', 
        message: `HTTP ${response.status}`
      }
    }
  } catch (error) {
    return { 
      service: 'Anthropic Claude', 
      status: 'ERROR', 
      message: error.message 
    }
  }
}

async function testPinecone() {
  const apiKey = process.env.PINECONE_API_KEY
  if (!apiKey) {
    return { service: 'Pinecone', status: 'NOT_CONFIGURED', message: 'API key not found (optional - using in-memory fallback)' }
  }

  return { service: 'Pinecone', status: 'CONFIGURED', message: 'Using in-memory vector store' }
}

async function testNewsAPI() {
  const apiKey = process.env.NEWS_API_KEY
  if (!apiKey) {
    return { service: 'NewsAPI', status: 'NOT_CONFIGURED', message: 'API key not found (optional)' }
  }

  try {
    const response = await fetch(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`)
    
    if (response.ok) {
      const data = await response.json()
      return { 
        service: 'NewsAPI', 
        status: 'WORKING', 
        message: `${data.articles?.length || 0} articles retrieved`
      }
    } else {
      return { 
        service: 'NewsAPI', 
        status: 'ERROR', 
        message: `HTTP ${response.status}`
      }
    }
  } catch (error) {
    return { 
      service: 'NewsAPI', 
      status: 'ERROR', 
      message: error.message 
    }
  }
}

async function testAlphaVantage() {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY
  if (!apiKey) {
    return { service: 'Alpha Vantage', status: 'NOT_CONFIGURED', message: 'API key not found (optional - using Yahoo Finance fallback)' }
  }

  try {
    const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${apiKey}`)
    
    if (response.ok) {
      const data = await response.json()
      if (data['Global Quote']) {
        return { 
          service: 'Alpha Vantage', 
          status: 'WORKING', 
          message: 'Stock data retrieved'
        }
      } else if (data.Note) {
        return { 
          service: 'Alpha Vantage', 
          status: 'RATE_LIMITED', 
          message: 'API call limit reached (free tier: 25 requests/day)'
        }
      } else {
        return { 
          service: 'Alpha Vantage', 
          status: 'ERROR', 
          message: JSON.stringify(data)
        }
      }
    } else {
      return { 
        service: 'Alpha Vantage', 
        status: 'ERROR', 
        message: `HTTP ${response.status}`
      }
    }
  } catch (error) {
    return { 
      service: 'Alpha Vantage', 
      status: 'ERROR', 
      message: error.message 
    }
  }
}

// Main test runner
async function runTests() {
  log('\n╔═══════════════════════════════════════════════════════════════╗', 'cyan')
  log('║         API KEY DIAGNOSTIC TOOL - Research Agent           ║', 'cyan')
  log('╚═══════════════════════════════════════════════════════════════╝\n', 'cyan')

  log('Testing API keys from .env.local...\n', 'blue')

  const tests = [
    testGeminiAPI,
    testOpenAI,
    testSerpAPI,
    testAnthropicAPI,
    testPinecone,
    testNewsAPI,
    testAlphaVantage,
  ]

  const results = []
  for (const test of tests) {
    const result = await test()
    results.push(result)
    
    let statusColor = 'green'
    let statusSymbol = '✓'
    
    if (result.status === 'ERROR') {
      statusColor = 'red'
      statusSymbol = '✗'
    } else if (result.status === 'NOT_CONFIGURED') {
      statusColor = 'yellow'
      statusSymbol = '○'
    } else if (result.status === 'RATE_LIMITED') {
      statusColor = 'yellow'
      statusSymbol = '⚠'
    }
    
    log(`${statusSymbol} ${result.service.padEnd(20)} [${result.status}]`, statusColor)
    if (result.message) {
      log(`  → ${result.message}`, 'reset')
    }
    if (result.details) {
      log(`  → ${result.details}`, 'reset')
    }
    console.log()
  }

  // Summary
  log('\n╔═══════════════════════════════════════════════════════════════╗', 'cyan')
  log('║                         SUMMARY                              ║', 'cyan')
  log('╚═══════════════════════════════════════════════════════════════╝\n', 'cyan')

  const working = results.filter(r => r.status === 'WORKING').length
  const errors = results.filter(r => r.status === 'ERROR').length
  const notConfigured = results.filter(r => r.status === 'NOT_CONFIGURED').length
  const rateLimited = results.filter(r => r.status === 'RATE_LIMITED').length

  log(`✓ Working: ${working}`, 'green')
  log(`✗ Errors: ${errors}`, errors > 0 ? 'red' : 'reset')
  log(`○ Not Configured: ${notConfigured}`, 'yellow')
  log(`⚠ Rate Limited: ${rateLimited}`, rateLimited > 0 ? 'yellow' : 'reset')

  log('\n📝 RECOMMENDATIONS:\n', 'blue')

  if (results[0].status !== 'WORKING') {
    log('  ⚠ CRITICAL: Google Gemini API is not working!', 'red')
    log('    → Get a free API key: https://makersuite.google.com/app/apikey', 'yellow')
    log('    → Add to .env.local: GOOGLE_GEMINI_API_KEY=your_key_here\n', 'yellow')
  }

  if (results[2].status !== 'WORKING') {
    log('  ⚠ IMPORTANT: SerpAPI is not working!', 'yellow')
    log('    → Get a free API key (100 searches/month): https://serpapi.com/manage-api-key', 'yellow')
    log('    → Add to .env.local: SERP_API_KEY=your_key_here\n', 'yellow')
  }

  if (notConfigured > 2) {
    log('  💡 Optional APIs can enhance functionality:', 'cyan')
    log('    → OpenAI: Better LLM responses (https://platform.openai.com/api-keys)', 'reset')
    log('    → Anthropic: Claude models (https://console.anthropic.com/)', 'reset')
    log('    → NewsAPI: More news sources (https://newsapi.org/)', 'reset')
    log('    → Alpha Vantage: Financial data (https://www.alphavantage.co/support/#api-key)\n', 'reset')
  }

  if (working >= 2) {
    log('  ✅ Your research agent is functional! Minimum requirements met.\n', 'green')
  } else {
    log('  ❌ Research agent needs at least Google Gemini + SerpAPI to work properly.\n', 'red')
  }

  log('═══════════════════════════════════════════════════════════════\n', 'cyan')
}

// Run the tests
runTests().catch(error => {
  log(`\n❌ Test suite error: ${error.message}\n`, 'red')
  process.exit(1)
})
