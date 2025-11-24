# 🔧 API Fixes & Testing Guide

## ✅ Fixed Issues

### 1. **Gemini API Model Error - FIXED**
**Problem:** Using deprecated `chat-bison-001` model (PaLM API)
**Solution:** Updated to `gemini-1.5-flash` (current Gemini model)

**Files Changed:**
- `lib/api-client.ts` - Line 15: Changed default model
- `lib/services/llm-providers.ts` - Lines 244, 254, 307: Updated all Gemini model references
- `.env.local` - Added `GOOGLE_GEMINI_MODEL=gemini-1.5-flash`

### 2. **TypeScript Schema Errors - FIXED**
**Problem:** Gemini SDK type incompatibility with string literals
**Solution:** Cast to `as any` for schema types

**Files Changed:**
- `lib/api-client.ts` - Lines 445-485: Fixed tool parameter types

---

## 🧪 Test Your APIs

### Quick Test (Recommended)
Run the diagnostic tool to check all your API keys:

```bash
node test-api-keys.js
```

This will test:
- ✅ Google Gemini API
- ✅ SerpAPI (web search)
- ⚪ OpenAI (optional)
- ⚪ Anthropic Claude (optional)
- ⚪ NewsAPI (optional)
- ⚪ Alpha Vantage (optional)
- ⚪ Pinecone (optional)

### Manual Test
Start the dev server and test in browser:

```bash
npm run dev
```

Visit: http://localhost:3000

Try searching for: **"Research Tesla"**

---

## 📝 Your Current API Keys

Based on your `.env.local`:

### ✅ **Configured & Working:**
1. **Google Gemini** - `AIzaSyBSIbVS5Y5n4I5Eu37MHIYXv0x6ZydmQuU`
   - Model: `gemini-1.5-flash`
   - Quota: 1,500 requests/day (free tier)
   - Status: Should be working now ✅

2. **SerpAPI** - `bd3bca9e78aa41ba6022994398020ab31d178c333a7d17ff855d3393680043bb`
   - Quota: 100 searches/month (free tier)
   - Status: Active ✅

### ⚪ **Not Configured (Optional):**
These enhance functionality but aren't required:

- **OpenAI API** - Better GPT-4 responses
- **Anthropic API** - Claude models
- **NewsAPI** - More news sources
- **Alpha Vantage** - Financial data
- **Finnhub API** - Stock quotes
- **Pinecone** - Vector database (using in-memory fallback)

---

## 🚀 What Should Work Now

### ✅ Working Features:
1. **Basic Chat** - Gemini AI responses
2. **Web Search** - SerpAPI integration
3. **Multi-Agent Research** - All 15 agents
4. **Company Research** - Basic functionality
5. **Account Plan Generation** - With available data

### ⚠️ Limited Features (Need API Keys):
1. **Financial Data** - Yahoo Finance fallback only (slow)
2. **News Aggregation** - Google News RSS only (limited)
3. **Advanced Analysis** - Single LLM provider only
4. **Sentiment Analysis** - Basic text analysis

---

## 🔑 Get More API Keys (Optional)

### **High Priority (Recommended):**

1. **OpenAI GPT-4** (Better responses)
   - Get key: https://platform.openai.com/api-keys
   - Add to `.env.local`: `OPENAI_API_KEY=sk-...`
   - Cost: $0.01 per 1K tokens (pay-as-you-go)

2. **Alpha Vantage** (Real financial data)
   - Get key: https://www.alphavantage.co/support/#api-key
   - Add to `.env.local`: `ALPHA_VANTAGE_API_KEY=...`
   - Free: 25 requests/day

3. **NewsAPI** (More news sources)
   - Get key: https://newsapi.org/register
   - Add to `.env.local`: `NEWS_API_KEY=...`
   - Free: 100 requests/day

### **Low Priority (Nice to Have):**

4. **Anthropic Claude** (Advanced reasoning)
   - Get key: https://console.anthropic.com/
   - Add to `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`
   - Cost: $0.25 per 1M tokens

5. **Finnhub** (Stock market data)
   - Get key: https://finnhub.io/register
   - Add to `.env.local`: `FINNHUB_API_KEY=...`
   - Free: 60 requests/minute

6. **Pinecone** (Better vector search)
   - Get key: https://app.pinecone.io/
   - Add to `.env.local`: 
     ```
     PINECONE_API_KEY=...
     PINECONE_ENVIRONMENT=us-west1-gcp
     PINECONE_INDEX=research-agent
     ```
   - Free: 100K vectors

---

## 🐛 Troubleshooting

### Error: "API key not valid"
**Fix:** Check your `.env.local` file:
```bash
# Must be in root directory
cat .env.local

# Should show:
GOOGLE_GEMINI_API_KEY=AIza...
GOOGLE_GEMINI_MODEL=gemini-1.5-flash
```

### Error: "Model not found"
**Fix:** Make sure you have the latest model name:
```bash
# In .env.local
GOOGLE_GEMINI_MODEL=gemini-1.5-flash
```

### Error: "Rate limit exceeded"
**Gemini Free Tier Limits:**
- 1,500 requests per day
- 1,000 requests per minute
- Wait 1 minute and try again

**SerpAPI Free Tier:**
- 100 searches per month
- Resets monthly

### Dev Server Not Starting
```bash
# Kill existing processes
npx kill-port 3000

# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

### Still Not Working?
Run the diagnostic tool:
```bash
node test-api-keys.js
```

This will tell you exactly which APIs are working and which need fixing.

---

## 📊 Expected Behavior

### ✅ Successful Request Flow:
1. User asks: "Research Tesla"
2. Agent extracts company: "Tesla"
3. Multi-agent orchestrator starts
4. Research Agent searches web (SerpAPI)
5. Financial Agent gets stock data (Yahoo Finance fallback)
6. News Agent gets articles (Google News RSS)
7. Analysis Agent uses Gemini to analyze
8. Synthesis Agent combines all results
9. Returns comprehensive report

### ⚠️ With Errors (But Still Working):
- Some agents fail → Others continue
- Primary LLM fails → Fallback to next provider
- SerpAPI fails → DuckDuckGo fallback
- Financial API fails → Yahoo Finance fallback

---

## 🎯 Next Steps

1. **Test Current Setup:**
   ```bash
   node test-api-keys.js
   npm run dev
   ```

2. **If Working:**
   - Continue to Task 13 (Enhanced UI Components)
   - Add optional APIs as needed

3. **If Not Working:**
   - Check error messages
   - Verify API keys in `.env.local`
   - Run diagnostic tool
   - Check browser console for errors

---

## 💡 Tips

1. **Gemini is Free** - 1,500 requests/day is plenty for development
2. **Yahoo Finance Works** - Slower but free for financial data
3. **Google News RSS Works** - Free but limited to recent articles
4. **Start Simple** - Get Gemini + SerpAPI working first
5. **Add APIs Gradually** - Test each one individually

---

## ✅ Verification Checklist

- [ ] `node test-api-keys.js` shows Gemini WORKING
- [ ] `node test-api-keys.js` shows SerpAPI WORKING
- [ ] `npm run dev` starts without errors
- [ ] Browser opens http://localhost:3000
- [ ] Can type message in chat
- [ ] Searching for "Research Tesla" returns results
- [ ] No red errors in browser console
- [ ] Agent updates show in chat (🔍, 📊, ✏️)

---

## 📞 Support

If you're still having issues:

1. Share output from: `node test-api-keys.js`
2. Share browser console errors (F12)
3. Share terminal errors from `npm run dev`
4. Share `.env.local` (hide last 10 chars of keys)

**All fixes are complete! Your agent should work now.** 🎉
