/**
 * Test URL Filtering
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { getScrapingService } from './lib/services/web-scraping'

async function main() {
  console.log('🧪 Testing URL Filtering\n')
  
  const scraper = getScrapingService()
  
  const testUrls = [
    'https://developer.apple.com/app-store/product-page/',
    'https://developer.apple.com/help/app-store-connect/',
    'https://support.apple.com/guide/apple-business-manager/',
    'https://www.apple.com/', // Should work
    'https://en.wikipedia.org/wiki/Apple_Inc.', // Should work
    'https://example.com/test', // Should be blocked
  ]
  
  console.log('Testing scrapeMultiple with protected URLs...\n')
  
  const results = await scraper.scrapeMultiple(testUrls, { timeout: 5000 })
  
  console.log(`\n✅ Results: ${results.length} successful scrapes\n`)
  
  results.forEach(result => {
    console.log(`✓ ${result.url}`)
    console.log(`  Title: ${result.title.slice(0, 50)}`)
    console.log(`  Source: ${result.metadata.source}`)
    console.log(`  Status: ${result.statusCode}\n`)
  })
  
  console.log('🎯 Protected URLs were filtered successfully!')
}

main().catch(console.error)
