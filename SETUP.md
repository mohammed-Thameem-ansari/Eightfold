# 🛠 Setup Guide - Eightfold AI Research Agent

Complete step-by-step setup instructions for development and production deployment.

## 📋 Prerequisites

### Required
- **Node.js**: Version 18.0 or higher
- **npm**: Version 9.0 or higher
- **Git**: For cloning the repository

### API Keys (Required)
- **Google Gemini API Key**: [Get free key](https://makersuite.google.com/app/apikey)
- **Groq API Key**: [Sign up free](https://console.groq.com)

### API Keys (Optional)
- **OpenAI API Key**: For GPT fallback
- **Pinecone API Key**: For semantic search/RAG
- **Redis URL**: For caching (can use local)

---

## 🚀 Quick Start (5 Minutes)

### 1. Clone Repository

```bash
git clone https://github.com/mohammed-Thameem-ansari/Eightfold.git
cd Eightfold
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required packages (~1-2 minutes).

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:

```env
# Required - Get from https://makersuite.google.com/app/apikey
GOOGLE_GEMINI_API_KEY=your_gemini_key_here

# Required - Get from https://console.groq.com
GROQ_API_KEY=your_groq_key_here

# Optional - For OpenAI fallback
OPENAI_API_KEY=your_openai_key_here

# Optional - For semantic search
PINECONE_API_KEY=your_pinecone_key_here
PINECONE_ENVIRONMENT=us-west4-gcp
PINECONE_INDEX=research-agent-index

# Optional - For caching (local Redis or cloud)
REDIS_URL=redis://localhost:6379
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Getting API Keys

### Google Gemini (Required, Free)

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy key to `.env.local` as `GOOGLE_GEMINI_API_KEY`

**Free Tier**: 60 requests/minute, sufficient for development.

### Groq (Required, Free)

1. Visit [Groq Console](https://console.groq.com)
2. Sign up for free account
3. Navigate to API Keys section
4. Create new key
5. Copy to `.env.local` as `GROQ_API_KEY`

**Free Tier**: Very generous, fast inference.

### OpenAI (Optional)

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create account and add payment method
3. Generate API key
4. Copy to `.env.local` as `OPENAI_API_KEY`

**Note**: Only used as fallback if Gemini/Groq fail.

### Pinecone (Optional)

1. Visit [Pinecone](https://www.pinecone.io/)
2. Sign up for free account
3. Create index named `research-agent-index`
4. Copy API key and environment
5. Add to `.env.local`

**Use Case**: Enables semantic search and RAG features.

### Redis (Optional)

For local development:

```bash
# macOS
brew install redis
brew services start redis

# Windows (WSL)
sudo apt-get install redis-server
sudo service redis-server start

# Docker
docker run -d -p 6379:6379 redis:alpine
```

Set `REDIS_URL=redis://localhost:6379` in `.env.local`.

---

## 🏗 Development

### Available Scripts

```bash
# Start dev server (hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Type checking
npm run typecheck

# Run tests
npm test

# Bundle analysis
npm run analyze
```

### Environment Modes

**Development** (`.env.local`):
- Hot reload enabled
- Detailed error messages
- Source maps included

**Production** (`.env.production.local`):
- Optimized builds
- Minified bundles
- Error tracking enabled

---

## 🚢 Production Deployment

### Option 1: Vercel (Recommended)

Easiest deployment with zero configuration:

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

**Environment Variables**: Add in Vercel dashboard under Settings → Environment Variables.

### Option 2: Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t eightfold .
docker run -p 3000:3000 --env-file .env.local eightfold
```

### Option 3: Traditional Hosting

Build static export:

```bash
npm run build
npm start
```

Deploy `.next` folder to any Node.js hosting (Heroku, Railway, Fly.io).

---

## 🔧 Configuration

### Agent Settings

Customize in `lib/config.ts`:

```typescript
export const AGENT_CONFIG = {
  maxIterations: 10,      // Max research cycles
  timeout: 60000,         // Timeout (ms)
  cacheEnabled: true,     // Enable caching
  confidenceThreshold: 0.75  // Minimum confidence
}
```

### Rate Limiting

Configure in `lib/utils/rate-limiter.ts`:

```typescript
export const RATE_LIMITS = {
  api: { capacity: 100, refillRate: 10 },
  auth: { capacity: 5, refillRate: 1 },
  search: { capacity: 20, refillRate: 2 }
}
```

### Feature Flags

Enable/disable features in `.env.local`:

```env
ENABLE_CACHING=true
ENABLE_TELEMETRY=true
ENABLE_EXPERIMENTAL_TOOLS=false
ENABLE_AGENT_PERFORMANCE_CHARTS=true
```

---

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test -- --coverage
```

### Integration Tests

Requires running dev server:

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:integration
```

---

## 🐛 Troubleshooting

### Common Issues

**1. "API key not found"**
- Verify `.env.local` exists in root directory
- Check key names match exactly (case-sensitive)
- Restart dev server after changing env vars

**2. "Module not found"**
- Run `npm install` to ensure dependencies installed
- Clear `.next` folder: `rm -rf .next`
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

**3. "Port 3000 already in use"**
- Kill process on port 3000
- Or use different port: `PORT=3001 npm run dev`

**4. Build fails**
- Run `npm run typecheck` to find TypeScript errors
- Run `npm run lint` to find linting issues
- Check `next.config.js` for misconfigurations

**5. Slow agent responses**
- Check API key rate limits
- Enable caching: `ENABLE_CACHING=true`
- Reduce max iterations in agent config

### Debug Mode

Enable verbose logging:

```env
LOG_LEVEL=debug
TELEMETRY_ENABLED=true
```

View logs in `/dashboard` page.

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Groq Documentation](https://console.groq.com/docs)
- [Radix UI Components](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## 💬 Support

Need help?

- **Issues**: [GitHub Issues](https://github.com/mohammed-Thameem-ansari/Eightfold/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mohammed-Thameem-ansari/Eightfold/discussions)
- **Email**: Open issue on GitHub for fastest response

---

**Happy building! 🚀**

