import { NextRequest, NextResponse } from 'next/server'
import { stockDataService } from '@/lib/services/stock-data'
import { validateSearchQuery } from '@/lib/validation'
import { apiRateLimiter, withRateLimit } from '@/lib/rate-limiter'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')
    const action = searchParams.get('action') || 'quote'
    const period = searchParams.get('period') || '1m'

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      )
    }

    // Validate symbol
    const validation = validateSearchQuery(symbol)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Rate limiting
    const clientId = req.headers.get('x-forwarded-for') || 'anonymous'
    
    const result = await withRateLimit(
      `stock_${clientId}`,
      apiRateLimiter,
      async () => {
        switch (action) {
          case 'quote':
            const quote = await stockDataService.getStockQuote(validation.sanitized)
            return { success: true, data: quote }

          case 'historical':
            const historical = await stockDataService.getHistoricalData(
              validation.sanitized,
              period as any
            )
            return { success: true, data: historical }

          case 'metrics':
            const metrics = await stockDataService.getFinancialMetrics(validation.sanitized)
            return { success: true, data: metrics }

          case 'indices':
            const indices = await stockDataService.getMarketIndices()
            return { success: true, data: indices }

          default:
            throw new Error('Invalid action')
        }
      }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Stock API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
