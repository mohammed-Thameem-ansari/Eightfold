/**
 * Test Script for Stock Data Integration
 * Tests real-time stock data fetching and chat integration
 */

import { stockDataService } from './lib/services/stock-data'
import { lookupSymbol } from './lib/services/symbol-lookup'

async function testStockData() {
  console.log('🧪 Testing Stock Data Service...\n')

  // Test 1: Symbol Lookup
  console.log('1️⃣ Testing Symbol Lookup:')
  const companies = ['Apple Inc.', 'Tesla', 'Microsoft', 'Google']
  
  for (const company of companies) {
    const symbol = await lookupSymbol(company)
    console.log(`   ${company} → ${symbol || 'NOT FOUND'}`)
  }

  console.log('\n2️⃣ Testing Stock Quote (AAPL):')
  try {
    const quote = await stockDataService.getStockQuote('AAPL')
    if (quote) {
      console.log(`   Symbol: ${quote.symbol}`)
      console.log(`   Price: $${quote.price?.toFixed(2)}`)
      console.log(`   Change: ${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent?.toFixed(2)}%`)
      console.log(`   Volume: ${(quote.volume / 1e6).toFixed(2)}M`)
      console.log(`   Market Cap: $${(quote.marketCap / 1e9).toFixed(2)}B`)
    } else {
      console.log('   ⚠️  No quote data available')
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`)
  }

  console.log('\n3️⃣ Testing Historical Data (TSLA, 1m):')
  try {
    const historical = await stockDataService.getHistoricalData('TSLA', '1m')
    console.log(`   Data points: ${historical.length}`)
    if (historical.length > 0) {
      const first = historical[0]
      const last = historical[historical.length - 1]
      const growth = ((last.close - first.close) / first.close) * 100
      console.log(`   First: $${first.close.toFixed(2)} (${first.date})`)
      console.log(`   Last: $${last.close.toFixed(2)} (${last.date})`)
      console.log(`   Growth: ${growth >= 0 ? '+' : ''}${growth.toFixed(2)}%`)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`)
  }

  console.log('\n4️⃣ Testing Financial Metrics (MSFT):')
  try {
    const metrics = await stockDataService.getFinancialMetrics('MSFT')
    if (metrics) {
      console.log(`   P/E Ratio: ${metrics.peRatio?.toFixed(2)}`)
      console.log(`   EPS: $${metrics.eps?.toFixed(2)}`)
      console.log(`   Beta: ${metrics.beta?.toFixed(2)}`)
      console.log(`   Profit Margin: ${metrics.profitMargin?.toFixed(2)}%`)
    } else {
      console.log('   ⚠️  No metrics available')
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`)
  }

  console.log('\n5️⃣ Testing Market Indices:')
  try {
    const indices = await stockDataService.getMarketIndices()
    for (const [key, index] of Object.entries(indices)) {
      const indexData = index as any
      console.log(`   ${indexData.symbol}: $${indexData.price?.toLocaleString()} (${indexData.changePercent >= 0 ? '+' : ''}${indexData.changePercent?.toFixed(2)}%)`)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`)
  }

  console.log('\n✅ Test Complete!\n')
}

// Run tests
testStockData().catch(console.error)
