# 🔑 Complete API Keys Guide

This document provides detailed instructions for obtaining all API keys for the Zynku Research Agent with advanced capabilities.

## 📋 Quick Reference

| Service | Free Tier | Required | Purpose |
|---------|-----------|----------|---------|
| Google Gemini | ✅ Yes | ✅ **Required** | Primary LLM |
| OpenAI | $5 credit | ⭐ Recommended | GPT-4, Embeddings |
| Anthropic | $5 credit | ⚪ Optional | Claude 3 |
| Cohere | ✅ Yes | ⭐ Recommended | Embeddings, Gen |
| Alpha Vantage | ✅ Yes | ⭐ Recommended | Financial Data |
| Finnhub | ✅ Yes | ⚪ Optional | Market Data |
| NewsAPI | ✅ Yes | ⭐ Recommended | News Feed |
| Pinecone | ✅ Yes | ⚪ Optional | Vector DB |
| SERP API | ✅ Yes | ⚪ Optional | Google Search |
| Brave Search | ✅ Yes | ⚪ Optional | Search API |

---

## 1️⃣ Google Gemini API (REQUIRED)

### 🎯 Purpose
- Primary language model for chat and research
- Powers the main conversation agent
- Free tier with generous limits

### 📝 How to Get

1. **Visit**: https://makersuite.google.com/app/apikey
2. **Sign in** with your Google account
3. Click **"Create API Key"**
4. Copy the key (starts with `AIzaSy...`)

### 💰 Pricing
- **Free Tier**: 60 requests/minute, 1500 requests/day
- **Paid**: $0.00025/1K characters (extremely cheap)

### ⚙️ Configuration
```env
GOOGLE_GEMINI_API_KEY=AIzaSy...your_key_here
GOOGLE_GEMINI_MODEL=gemini-pro
```

---

## 2️⃣ OpenAI API (Recommended)

### 🎯 Purpose
- GPT-4 Turbo for advanced reasoning
- text-embedding-ada-002 for RAG/semantic search
- Fallback when Gemini is unavailable

### 📝 How to Get

1. **Visit**: https://platform.openai.com/signup
2. Create account and verify email
3. Go to **API Keys**: https://platform.openai.com/api-keys
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-`)

### 💰 Pricing
- **New Users**: $5 free credit
- **GPT-4 Turbo**: $0.01/1K input tokens, $0.03/1K output
- **Embeddings**: $0.0001/1K tokens
- **Monthly Estimate**: $20-50 for moderate use

### ⚙️ Configuration
```env
OPENAI_API_KEY=sk-...your_key_here
```

### 📊 Cost Optimization
- Use Gemini for general queries (free)
- Use GPT-4 for complex analysis only
- Cache embeddings to reduce costs

---

## 3️⃣ Anthropic Claude API (Optional)

### 🎯 Purpose
- Claude 3 Opus/Sonnet for advanced reasoning
- 200K token context window
- Best for long document analysis

### 📝 How to Get

1. **Visit**: https://console.anthropic.com/
2. Sign up for account
3. Navigate to **API Keys**
4. Click **"Create Key"**
5. Copy the key (starts with `sk-ant-`)

### 💰 Pricing
- **New Users**: $5 free credit
- **Claude 3 Opus**: $15/1M input, $75/1M output
- **Claude 3 Sonnet**: $3/1M input, $15/1M output
- **Monthly Estimate**: $30-80 for moderate use

### ⚙️ Configuration
```env
ANTHROPIC_API_KEY=sk-ant-...your_key_here
```

---

## 4️⃣ Cohere API (Recommended)

### 🎯 Purpose
- Fast embeddings for semantic search
- Command model for generation
- Completely free for development

### 📝 How to Get

1. **Visit**: https://dashboard.cohere.com/welcome/register
2. Sign up with email
3. Go to **API Keys** dashboard
4. Copy your default key

### 💰 Pricing
- **Free Tier**: 100 requests/minute (unlimited)
- **Production**: Pay as you go
- **Embeddings**: $0.0001/1K tokens

### ⚙️ Configuration
```env
COHERE_API_KEY=...your_key_here
```

---

## 5️⃣ Alpha Vantage API (Recommended)

### 🎯 Purpose
- Stock quotes and historical data
- Company financials (revenue, earnings)
- Financial ratios and metrics

### 📝 How to Get

1. **Visit**: https://www.alphavantage.co/support/#api-key
2. Enter email address
3. Receive key instantly via email

### 💰 Pricing
- **Free Tier**: 500 requests/day, 5 requests/minute
- **Premium**: $49.99/month for unlimited

### ⚙️ Configuration
```env
ALPHA_VANTAGE_API_KEY=...your_key_here
```

### 💡 Tips
- Cache financial data (changes slowly)
- Free tier sufficient for most use cases
- Use Yahoo Finance as free fallback

---

## 6️⃣ Finnhub API (Optional)

### 🎯 Purpose
- Real-time stock quotes
- Market news and sentiment
- Earnings calendar

### 📝 How to Get

1. **Visit**: https://finnhub.io/register
2. Sign up with email
3. Dashboard shows your API key immediately

### 💰 Pricing
- **Free Tier**: 60 API calls/minute
- **Premium**: $24.99-99.99/month

### ⚙️ Configuration
```env
FINNHUB_API_KEY=...your_key_here
```

---

## 7️⃣ NewsAPI (Recommended)

### 🎯 Purpose
- 80,000+ news sources worldwide
- Company news and press releases
- Trending business news

### 📝 How to Get

1. **Visit**: https://newsapi.org/register
2. Fill out registration form
3. Receive API key via email
4. Confirm email to activate

### 💰 Pricing
- **Free Tier**: 100 requests/day
- **Paid**: $449/month for commercial use

### ⚙️ Configuration
```env
NEWS_API_KEY=...your_key_here
```

### 💡 Tips
- Free tier resets daily at midnight UTC
- Use Google News RSS as free fallback
- Cache news articles to reduce requests

---

## 8️⃣ Pinecone (Optional)

### 🎯 Purpose
- Vector database for semantic search
- Powers RAG (Retrieval-Augmented Generation)
- Store research history embeddings

### 📝 How to Get

1. **Visit**: https://www.pinecone.io/
2. Sign up for free account
3. Create a new index:
   - Name: `research-agent`
   - Dimensions: `1536` (for OpenAI embeddings)
   - Metric: `cosine`
4. Copy API key from dashboard

### 💰 Pricing
- **Free Tier**: 1 index, 100K vectors, 5GB storage
- **Paid**: $0.096/hour ($70/month) for more

### ⚙️ Configuration
```env
PINECONE_API_KEY=...your_key_here
PINECONE_INDEX=research-agent
```

### 💡 Alternative
If you don't want to use Pinecone, the app will use an in-memory vector store (slower but free).

---

## 9️⃣ SERP API (Optional)

### 🎯 Purpose
- Google Search results
- Rich snippets and featured data
- Local business information

### 📝 How to Get

1. **Visit**: https://serpapi.com/users/sign_up
2. Sign up with email
3. Dashboard shows your API key

### 💰 Pricing
- **Free Tier**: 100 searches/month
- **Paid**: $50/month for 5,000 searches

### ⚙️ Configuration
```env
SERP_API_KEY=...your_key_here
```

---

## 🔟 Brave Search API (Optional)

### 🎯 Purpose
- Privacy-focused search
- No tracking or profiling
- Independent index

### 📝 How to Get

1. **Visit**: https://brave.com/search/api/
2. Request API access
3. Fill out application form
4. Wait for approval (usually 1-2 days)

### 💰 Pricing
- **Free Tier**: 2,000 requests/month
- **Paid**: $3/1,000 requests

### ⚙️ Configuration
```env
BRAVE_API_KEY=...your_key_here
```

---

## 📦 Complete .env.local Example

```env
# === REQUIRED ===
GOOGLE_GEMINI_API_KEY=AIzaSyBSIbVS5Y5n4I5Eu37MHIYXv0x6ZydmQuU
GOOGLE_GEMINI_MODEL=gemini-pro

# === RECOMMENDED (Free Tier) ===
COHERE_API_KEY=your_cohere_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
NEWS_API_KEY=your_news_api_key_here

# === OPTIONAL (Paid/Credits) ===
OPENAI_API_KEY=sk-...your_openai_key_here
ANTHROPIC_API_KEY=sk-ant-...your_anthropic_key_here
FINNHUB_API_KEY=your_finnhub_key_here
PINECONE_API_KEY=your_pinecone_key_here
PINECONE_INDEX=research-agent

# === OPTIONAL (Search) ===
SERP_API_KEY=your_serp_key_here
BRAVE_API_KEY=your_brave_key_here

# === FEATURE FLAGS ===
ENABLE_WEB_SCRAPING=true
ENABLE_FINANCIAL_ANALYSIS=true
ENABLE_NEWS_AGGREGATION=true
ENABLE_MULTI_LLM=true
ENABLE_RAG=true
```

---

## 🎯 Recommended Setup Paths

### 🆓 Completely Free (Minimal)
```env
GOOGLE_GEMINI_API_KEY=...
```
- Works perfectly fine
- Uses DuckDuckGo and Wikipedia for search
- No financial or news data

### 💎 Free Tier (Recommended)
```env
GOOGLE_GEMINI_API_KEY=...
COHERE_API_KEY=...
ALPHA_VANTAGE_API_KEY=...
NEWS_API_KEY=...
```
- Full functionality
- $0/month cost
- Perfect for personal use

### 🚀 Production (Paid)
```env
GOOGLE_GEMINI_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
COHERE_API_KEY=...
ALPHA_VANTAGE_API_KEY=...
NEWS_API_KEY=...
PINECONE_API_KEY=...
```
- Full multi-LLM support
- Advanced RAG capabilities
- ~$80-150/month

---

## 🔒 Security Best Practices

1. **Never commit .env.local to Git**
   - Already in `.gitignore`
   - Double-check before pushing

2. **Rotate keys regularly**
   - Every 90 days minimum
   - Immediately if exposed

3. **Set spending limits**
   - OpenAI: Set monthly budget
   - Anthropic: Enable spending alerts

4. **Monitor usage**
   - Check dashboards weekly
   - Watch for unusual spikes

5. **Use environment variables in production**
   - Vercel/Railway automatically secure
   - Never hardcode keys

---

## 📊 Cost Monitoring

### Monthly Cost Estimator

**100 active users, 50 queries/day**:

| Service | Free Tier | Paid Estimate |
|---------|-----------|---------------|
| Gemini | $0 | $5 |
| OpenAI | $5 credit | $40 |
| Anthropic | $5 credit | $30 |
| Cohere | $0 | $10 |
| Alpha Vantage | $0 | $50 |
| NewsAPI | $0 | $0* |
| Pinecone | $0 | $70 |
| **Total** | **$0** | **$200-250** |

*NewsAPI free tier usually sufficient

---

## ❓ Troubleshooting

### "Invalid API Key" Error
- Verify key is copied correctly (no spaces)
- Check if key is active in dashboard
- Confirm .env.local file is in root directory

### Rate Limit Errors
- Free tiers have strict limits
- Enable caching to reduce requests
- Implement exponential backoff

### "Payment Required" Error (OpenAI/Anthropic)
- Add payment method to account
- $5 free credit for new accounts
- Set spending limits to avoid surprises

---

## 📚 Additional Resources

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [Pinecone Docs](https://docs.pinecone.io/)
- [Alpha Vantage Docs](https://www.alphavantage.co/documentation/)

---

**Need help?** Open an issue on GitHub or contact support!
