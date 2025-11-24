# Financial Analytics Integration Guide

## Overview

The Research Agent Pro now includes advanced financial analytics capabilities with real-time stock data, historical charts, financial metrics, and professional visualizations. This makes it a comprehensive tool for financial research and analysis.

## 🚀 Features

### 1. Real-Time Stock Data
- **Live stock quotes** from Yahoo Finance, Alpha Vantage, and Finnhub
- **Price updates** with percentage change indicators
- **Trading volume** and market capitalization
- **Intraday price movements**

### 2. Historical Data & Charts
- **Multiple time periods**: 1 day, 1 week, 1 month, 3 months, 6 months, 1 year
- **Interactive area charts** with gradient fills
- **Volume bar charts** showing trading activity
- **Price trend analysis** with growth calculations

### 3. Financial Metrics
- **Valuation ratios**: P/E Ratio, P/B Ratio, Price/Sales
- **Profitability**: Profit Margin, Operating Margin, ROE
- **Performance**: EPS (Earnings Per Share), Beta
- **52-week high/low** tracking

### 4. Professional Visualization
- **Glass morphism design** with modern UI/UX
- **Real-time refresh** functionality
- **Color-coded indicators** (green for gains, red for losses)
- **Responsive charts** built with Recharts
- **Market indices** display (S&P 500, Dow Jones, NASDAQ)

### 5. Smart Symbol Lookup
- **Automatic conversion** from company names to stock symbols
- **150+ pre-configured** companies (Apple → AAPL, Tesla → TSLA, etc.)
- **API search fallback** for unknown companies
- **Multiple exchange support**

## 📊 Components

### Stock Data Service (`lib/services/stock-data.ts`)
```typescript
// Get real-time quote
const quote = await stockDataService.getStockQuote('AAPL')
// Returns: { symbol, price, changePercent, volume, marketCap, etc. }

// Get historical data
const history = await stockDataService.getHistoricalData('AAPL', '1m')
// Returns: Array of { date, open, high, low, close, volume }

// Get financial metrics
const metrics = await stockDataService.getFinancialMetrics('AAPL')
// Returns: { peRatio, eps, beta, marketCap, profitMargin, etc. }

// Get market indices
const indices = await stockDataService.getMarketIndices()
// Returns: { SPX, DJI, IXIC with price and change data }
```

### Symbol Lookup Service (`lib/services/symbol-lookup.ts`)
```typescript
// Convert company name to symbol
const symbol = await lookupSymbol('Apple Inc.')
// Returns: 'AAPL'

// Batch lookup
const symbols = await lookupSymbols(['Apple', 'Tesla', 'Microsoft'])
// Returns: { 'Apple': 'AAPL', 'Tesla': 'TSLA', 'Microsoft': 'MSFT' }

// Validate symbol
const isValid = await validateSymbol('AAPL')
// Returns: true

// Get symbol info
const info = await getSymbolInfo('AAPL')
// Returns: { symbol, name, exchange, confidence }
```

### Financial Dashboard Component (`components/financial/FinancialDashboard.tsx`)
```tsx
import { FinancialDashboard } from '@/components/financial/FinancialDashboard'

// In your page/component
<FinancialDashboard symbol="AAPL" />
```

Features:
- Real-time stock quote card
- Period selector (1d, 1w, 1m, 3m, 6m, 1y)
- Price history area chart
- Trading volume bar chart
- Financial ratios pie chart
- Key metrics grid
- Refresh button with loading state

### API Endpoint (`app/api/stock/route.ts`)
```
GET /api/stock?symbol=AAPL&action=quote
GET /api/stock?symbol=AAPL&action=historical&period=1m
GET /api/stock?symbol=AAPL&action=metrics
GET /api/stock?action=indices
```

## 🔧 Setup

### 1. Install Dependencies
```bash
npm install recharts lucide-react
```

### 2. Configure API Keys

Add to `.env.local`:
```env
# Required for real-time stock data (choose at least one)
RAPIDAPI_KEY=your_rapidapi_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
FINNHUB_API_KEY=your_finnhub_key_here
```

### 3. API Key Sources

#### RapidAPI (Yahoo Finance)
- **Sign up**: https://rapidapi.com/
- **Subscribe to**: Yahoo Finance API
- **Free tier**: 500 requests/month
- **Provides**: Real-time quotes, historical data, company info

#### Alpha Vantage
- **Sign up**: https://www.alphavantage.co/support/#api-key
- **Free tier**: 5 requests/minute, 500 requests/day
- **Provides**: Stock quotes, fundamentals, technical indicators

#### Finnhub
- **Sign up**: https://finnhub.io/register
- **Free tier**: 60 requests/minute
- **Provides**: Real-time quotes, financials, news

### 4. Integration

The financial features are already integrated into:
- ✅ **Financial Agent** (`lib/agents/financial-agent.ts`)
- ✅ **Dashboard Analytics Tab** (`app/dashboard/page.tsx`)
- ✅ **API Routes** (`app/api/stock/route.ts`)

## 💡 Usage Examples

### 1. In Chat Interface
```
User: "Research Apple Inc."
Agent: [Automatically fetches stock data, shows AAPL price, financials]

User: "Analyze Tesla's financial performance"
Agent: [Gets TSLA data, historical charts, growth metrics]

User: "Compare Microsoft and Google stocks"
Agent: [Fetches both MSFT and GOOGL data, compares metrics]
```

### 2. In Analytics Dashboard
1. Navigate to **Dashboard** → **Analytics** tab
2. View real-time **AAPL stock data** (default)
3. Change time period (1d, 1w, 1m, etc.)
4. Click **Refresh** to update data
5. Scroll to see **market indices** and **system status**

### 3. Programmatic Usage
```typescript
// In any agent or API route
import { stockDataService } from '@/lib/services/stock-data'
import { lookupSymbol } from '@/lib/services/symbol-lookup'

// Convert company name to symbol
const symbol = await lookupSymbol('Apple Inc.')

if (symbol) {
  // Get comprehensive data
  const [quote, historical, metrics] = await Promise.all([
    stockDataService.getStockQuote(symbol),
    stockDataService.getHistoricalData(symbol, '1m'),
    stockDataService.getFinancialMetrics(symbol)
  ])
  
  console.log(`${symbol} is trading at $${quote.price}`)
  console.log(`P/E Ratio: ${metrics.peRatio}`)
  console.log(`1-month return: ${historical.length} data points`)
}
```

## 🎨 Customization

### Change Default Symbol
```tsx
// In app/dashboard/page.tsx
<FinancialDashboard symbol="TSLA" /> // Change to any symbol
```

### Add More Companies to Lookup
```typescript
// In lib/services/symbol-lookup.ts
const KNOWN_SYMBOLS: Record<string, string> = {
  // Add your companies
  'my company': 'MYCO',
  'startup inc': 'STUP',
  ...
}
```

### Customize Chart Colors
```tsx
// In components/financial/FinancialDashboard.tsx
<AreaChart ...>
  <Area
    stroke="#10b981" // Change to your color
    fill="url(#colorPrice)" // Modify gradient
  />
</AreaChart>
```

### Add More Metrics
```typescript
// In lib/services/stock-data.ts
interface FinancialMetrics {
  // Add your metrics
  dividendYield?: number
  payoutRatio?: number
  debtToEquity?: number
}
```

## 🔄 Data Flow

```
User Query
    ↓
Financial Agent
    ↓
Symbol Lookup (Company → Symbol)
    ↓
Stock Data Service
    ↓
[Try Yahoo Finance]
    ↓ (fallback)
[Try Alpha Vantage]
    ↓ (fallback)
[Try Finnhub]
    ↓ (fallback)
[Generate Mock Data]
    ↓
Cache (1 minute TTL)
    ↓
Dashboard/API Response
```

## 🚦 Rate Limiting

All financial APIs are rate-limited to prevent abuse:
- **Yahoo Finance (RapidAPI)**: 500 requests/month (free tier)
- **Alpha Vantage**: 5 requests/minute
- **Finnhub**: 60 requests/minute
- **Internal cache**: 1 minute TTL

The system automatically:
- ✅ Caches responses for 1 minute
- ✅ Falls back to alternative providers
- ✅ Generates mock data if all APIs fail
- ✅ Applies token bucket rate limiting

## 🎯 Demo Mode

For presentations without API keys:
```typescript
// Mock data is automatically generated if APIs fail
const mockQuote = {
  symbol: 'AAPL',
  price: 150.25,
  changePercent: 1.25,
  volume: 50000000,
  marketCap: 2500000000000,
  high: 152.50,
  low: 148.75
}
```

## 📈 Performance

- **Initial load**: ~500ms (with cache)
- **API calls**: 1-3 seconds (parallel requests)
- **Chart rendering**: <100ms (Recharts)
- **Data refresh**: <1 second
- **Memory usage**: ~50MB (with cache)

## 🐛 Troubleshooting

### No data showing
1. Check API keys in `.env.local`
2. Verify internet connection
3. Check browser console for errors
4. Try a different symbol (e.g., AAPL, TSLA, MSFT)

### Rate limit errors
1. Wait 1 minute and try again
2. Add more API providers
3. Increase cache TTL

### Symbol not found
1. Add to `KNOWN_SYMBOLS` in `symbol-lookup.ts`
2. Check if company is publicly traded
3. Try the official stock symbol directly

### Charts not rendering
1. Ensure `recharts` is installed
2. Check for console errors
3. Verify data format matches expected structure

## 🎓 Best Practices

1. **Always cache** stock data (already implemented)
2. **Use multiple providers** for reliability (already implemented)
3. **Implement fallbacks** for API failures (already implemented)
4. **Rate limit requests** to avoid bans (already implemented)
5. **Validate symbols** before fetching data
6. **Handle errors gracefully** with mock data
7. **Display loading states** for better UX
8. **Add refresh timestamps** to show data freshness

## 🔮 Future Enhancements

- [ ] Real-time WebSocket streaming for live prices
- [ ] Technical indicators (RSI, MACD, Bollinger Bands)
- [ ] Options chain data
- [ ] Earnings calendar
- [ ] News sentiment analysis
- [ ] Portfolio tracking
- [ ] Alerts and notifications
- [ ] Export to PDF/Excel
- [ ] Comparison tool for multiple stocks
- [ ] Watchlist functionality

## 📚 Resources

- **Recharts Documentation**: https://recharts.org/
- **Yahoo Finance API**: https://rapidapi.com/apidojo/api/yahoo-finance1
- **Alpha Vantage Docs**: https://www.alphavantage.co/documentation/
- **Finnhub API Docs**: https://finnhub.io/docs/api

## 🤝 Contributing

To add new financial features:

1. Create new methods in `StockDataService`
2. Add API integration with fallback
3. Update `FinancialDashboard` component
4. Add to `financial-agent.ts` logic
5. Update this documentation

## 📝 License

Part of Research Agent Pro - All rights reserved.

---

**Built with ❤️ for enterprise-grade agentic AI development**
