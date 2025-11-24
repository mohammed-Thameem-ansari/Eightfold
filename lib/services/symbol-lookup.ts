/**
 * Symbol Lookup Service
 * Converts company names to stock symbols using multiple methods
 */

interface SymbolResult {
  symbol: string
  name: string
  exchange: string
  confidence: number
}

/**
 * Common company name to symbol mapping
 */
const KNOWN_SYMBOLS: Record<string, string> = {
  // Tech Giants
  'apple': 'AAPL',
  'apple inc': 'AAPL',
  'microsoft': 'MSFT',
  'microsoft corporation': 'MSFT',
  'google': 'GOOGL',
  'alphabet': 'GOOGL',
  'amazon': 'AMZN',
  'amazon.com': 'AMZN',
  'meta': 'META',
  'facebook': 'META',
  'tesla': 'TSLA',
  'tesla inc': 'TSLA',
  'netflix': 'NFLX',
  'nvidia': 'NVDA',
  'intel': 'INTC',
  'amd': 'AMD',
  'advanced micro devices': 'AMD',
  'ibm': 'IBM',
  'oracle': 'ORCL',
  'salesforce': 'CRM',
  'adobe': 'ADBE',
  'cisco': 'CSCO',
  'qualcomm': 'QCOM',
  
  // Finance
  'jpmorgan': 'JPM',
  'jp morgan': 'JPM',
  'bank of america': 'BAC',
  'wells fargo': 'WFC',
  'goldman sachs': 'GS',
  'morgan stanley': 'MS',
  'citigroup': 'C',
  'visa': 'V',
  'mastercard': 'MA',
  'paypal': 'PYPL',
  'american express': 'AXP',
  'berkshire hathaway': 'BRK.B',
  
  // Retail & Consumer
  'walmart': 'WMT',
  'costco': 'COST',
  'target': 'TGT',
  'home depot': 'HD',
  'nike': 'NKE',
  'starbucks': 'SBUX',
  'mcdonalds': 'MCD',
  'coca cola': 'KO',
  'pepsi': 'PEP',
  'pepsico': 'PEP',
  'procter & gamble': 'PG',
  'johnson & johnson': 'JNJ',
  
  // Automotive
  'ford': 'F',
  'general motors': 'GM',
  'toyota': 'TM',
  'volkswagen': 'VWAGY',
  
  // Energy
  'exxon': 'XOM',
  'exxon mobil': 'XOM',
  'chevron': 'CVX',
  'bp': 'BP',
  'shell': 'SHEL',
  
  // Healthcare & Pharma
  'pfizer': 'PFE',
  'moderna': 'MRNA',
  'abbvie': 'ABBV',
  'merck': 'MRK',
  'bristol myers': 'BMY',
  'eli lilly': 'LLY',
  'unitedhealth': 'UNH',
  
  // Telecom
  'verizon': 'VZ',
  'at&t': 'T',
  't-mobile': 'TMUS',
  
  // Aerospace & Defense
  'boeing': 'BA',
  'lockheed martin': 'LMT',
  'raytheon': 'RTX',
  'spacex': 'PRIVATE', // Not publicly traded
  
  // Entertainment & Media
  'disney': 'DIS',
  'walt disney': 'DIS',
  'warner bros': 'WBD',
  'comcast': 'CMCSA',
  'sony': 'SONY',
  
  // Semiconductors
  'tsmc': 'TSM',
  'taiwan semiconductor': 'TSM',
  'broadcom': 'AVGO',
  'texas instruments': 'TXN',
  
  // E-commerce & Services
  'uber': 'UBER',
  'lyft': 'LYFT',
  'airbnb': 'ABNB',
  'doordash': 'DASH',
  'shopify': 'SHOP',
  'square': 'SQ',
  'block': 'SQ',
  
  // Cloud & Software
  'snowflake': 'SNOW',
  'databricks': 'PRIVATE',
  'servicenow': 'NOW',
  'workday': 'WDAY',
  'zoom': 'ZM',
  'slack': 'WORK',
  'dropbox': 'DBX',
  'box': 'BOX',
  
  // Social Media
  'twitter': 'PRIVATE', // Acquired by Elon Musk
  'x': 'PRIVATE',
  'snapchat': 'SNAP',
  'snap': 'SNAP',
  'pinterest': 'PINS',
  'reddit': 'RDDT',
  
  // Gaming
  'activision': 'ATVI',
  'electronic arts': 'EA',
  'take-two': 'TTWO',
  'roblox': 'RBLX',
  'unity': 'U',
  
  // Fintech & Crypto
  'coinbase': 'COIN',
  'robinhood': 'HOOD',
}

/**
 * Extract potential stock symbols from company name
 */
function extractSymbolFromName(companyName: string): string | null {
  // Check exact matches first
  const normalized = companyName.toLowerCase().trim()
  
  if (KNOWN_SYMBOLS[normalized]) {
    return KNOWN_SYMBOLS[normalized]
  }
  
  // Check partial matches
  for (const [key, symbol] of Object.entries(KNOWN_SYMBOLS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return symbol
    }
  }
  
  // Try to extract acronyms (e.g., "International Business Machines" -> "IBM")
  const words = companyName.split(/\s+/).filter(w => w.length > 2)
  if (words.length >= 2 && words.length <= 4) {
    const acronym = words.map(w => w[0].toUpperCase()).join('')
    // Check if this acronym exists in our known symbols
    for (const symbol of Object.values(KNOWN_SYMBOLS)) {
      if (symbol === acronym) {
        return acronym
      }
    }
  }
  
  return null
}

/**
 * Search for company symbol using Yahoo Finance search API
 */
async function searchYahooFinance(companyName: string): Promise<SymbolResult[]> {
  try {
    const response = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(companyName)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error('Yahoo Finance search failed')
    }
    
    const data = await response.json()
    const quotes = data.quotes || []
    
    return quotes
      .filter((q: any) => q.quoteType === 'EQUITY')
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.longname || q.shortname,
        exchange: q.exchange,
        confidence: q.score || 0.5
      }))
      .slice(0, 5)
  } catch (error) {
    console.error('Yahoo Finance search error:', error)
    return []
  }
}

/**
 * Search for company symbol using Alpha Vantage
 */
async function searchAlphaVantage(companyName: string): Promise<SymbolResult[]> {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY
    if (!apiKey) {
      return []
    }
    
    const response = await fetch(
      `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(companyName)}&apikey=${apiKey}`
    )
    
    if (!response.ok) {
      throw new Error('Alpha Vantage search failed')
    }
    
    const data = await response.json()
    const matches = data.bestMatches || []
    
    return matches.map((match: any) => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      exchange: match['4. region'],
      confidence: parseFloat(match['9. matchScore']) || 0.5
    }))
  } catch (error) {
    console.error('Alpha Vantage search error:', error)
    return []
  }
}

/**
 * Main symbol lookup function with multiple fallback methods
 */
export async function lookupSymbol(companyName: string): Promise<string | null> {
  // Try direct extraction first
  const directSymbol = extractSymbolFromName(companyName)
  if (directSymbol && directSymbol !== 'PRIVATE') {
    return directSymbol
  }
  
  // Try API search
  try {
    const [yahooResults, alphaResults] = await Promise.all([
      searchYahooFinance(companyName),
      searchAlphaVantage(companyName)
    ])
    
    // Combine results and sort by confidence
    const allResults = [...yahooResults, ...alphaResults]
      .sort((a, b) => b.confidence - a.confidence)
    
    if (allResults.length > 0) {
      return allResults[0].symbol
    }
  } catch (error) {
    console.error('Symbol lookup error:', error)
  }
  
  // Fallback: try to guess from company name
  const words = companyName.trim().split(/\s+/)
  if (words.length === 1 && words[0].length >= 2 && words[0].length <= 5) {
    // Might already be a symbol
    return words[0].toUpperCase()
  }
  
  return null
}

/**
 * Batch lookup multiple companies
 */
export async function lookupSymbols(companyNames: string[]): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {}
  
  await Promise.all(
    companyNames.map(async (name) => {
      results[name] = await lookupSymbol(name)
    })
  )
  
  return results
}

/**
 * Validate if a symbol exists
 */
export async function validateSymbol(symbol: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    )
    
    if (!response.ok) {
      return false
    }
    
    const data = await response.json()
    return !data.chart?.error
  } catch (error) {
    return false
  }
}

/**
 * Get symbol info
 */
export async function getSymbolInfo(symbol: string): Promise<SymbolResult | null> {
  try {
    const response = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    )
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    const meta = data.chart?.result?.[0]?.meta
    
    if (!meta) {
      return null
    }
    
    return {
      symbol: meta.symbol,
      name: meta.longName || meta.shortName || symbol,
      exchange: meta.exchangeName,
      confidence: 1.0
    }
  } catch (error) {
    return null
  }
}
