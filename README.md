# 🚀 Eightfold AI Research Agent

> Enterprise-grade multi-agent AI research platform delivering comprehensive company intelligence, competitive analysis, and strategic insights in real-time.

[![Next.js](https://img.shields.io/badge/Next.js-14.1-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Usage](#usage)
- [Deployment](#deployment)

## 🎯 Overview

Eightfold is a sophisticated AI-powered research assistant that leverages **15+ specialized agents** working collaboratively to deliver deep company insights. From financial metrics to competitive positioning, market trends to risk assessment—all synthesized into actionable intelligence.

### Why Eightfold?

- **⚡ Real-time Intelligence**: Watch agents collaborate live with streaming responses
- **🎨 Professional Reports**: Export branded PDF/DOCX with embedded charts
- **🔒 Enterprise Security**: Rate limiting, error boundaries, and comprehensive logging
- **♿ Accessible**: WCAG-compliant with full keyboard navigation
- **📊 Production Ready**: Optimized builds, code splitting, and performance monitoring

## ✨ Key Features

### 🤖 Multi-Agent System

Powered by 15 specialized AI agents:

| Agent | Purpose |
|-------|---------|
| Research | Core company information gathering |
| Financial | Revenue, metrics, market cap analysis |
| Competitive | Market positioning & competitor mapping |
| Market | Industry trends & dynamics |
| Strategy | Recommendations & action plans |
| Contact | Decision-maker identification |
| Technology | Tech stack & innovation analysis |
| Risk | Threat assessment & mitigation |
| Quality | Output validation & refinement |
| Synthesis | Cross-agent insight integration |

### 💎 Advanced Capabilities

- **Smart Search**: Semantic keyword extraction with highlighting
- **Live Workflow**: Real-time agent orchestration visualization
- **Dynamic Config**: Tune iterations, confidence, timeouts on-the-fly
- **Health Monitoring**: Provider latency & error tracking
- **Persistent State**: User preferences saved across sessions
- **Export Engine**: Professional reports with charts & branding

### 🔐 Security & Performance

- Token bucket rate limiting (100 req/min)
- LRU caching (documents + searches)
- Global error boundaries with recovery
- Bundle optimization & code splitting
- Image optimization (AVIF/WebP)

## 🛠 Technology Stack

### Core
- **Framework**: Next.js 14 (App Router, React 18, Server Components)
- **Language**: TypeScript 5.3
- **Styling**: Tailwind CSS + Radix UI primitives

### AI & Data
- **LLM**: Google Gemini 2.0 Flash, Groq, OpenAI (fallback)
- **Vector DB**: Pinecone (semantic search & RAG)
- **Caching**: Redis + in-memory LRU

### Infrastructure
- **Deployment**: Vercel (recommended) or Docker
- **Testing**: Jest + integration tests
- **Analytics**: Built-in telemetry system

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- API keys: Gemini, Groq (optional: OpenAI, Pinecone)

### Installation

```bash
git clone https://github.com/mohammed-Thameem-ansari/Eightfold.git
cd Eightfold
npm install
```

### Configuration

1. Copy environment template:
```bash
cp .env.example .env.local
```

2. Add your API keys in `.env.local`:
```env
GOOGLE_GEMINI_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
```

3. Start development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

**See [SETUP.md](SETUP.md) for detailed configuration.**

## 🏗 Architecture

### System Design

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ SSE Streaming
┌──────▼──────────────────────┐
│  Next.js API Routes          │
│  ├─ /api/chat (SSE)          │
│  ├─ /api/export              │
│  └─ /api/analytics           │
└──────┬──────────────────────┘
       │
┌──────▼──────────────────────┐
│  Agent Orchestrator          │
│  ├─ Phase Management         │
│  ├─ Agent Coordination       │
│  └─ Workflow State           │
└──────┬──────────────────────┘
       │
┌──────▼──────────────────────┐
│  15 Specialized Agents       │
│  (Research, Financial, etc.) │
└──────┬──────────────────────┘
       │
┌──────▼──────────────────────┐
│  LLM Services + Vector DB    │
│  ├─ Gemini/Groq/OpenAI       │
│  ├─ Pinecone (embeddings)    │
│  └─ Redis (caching)          │
└─────────────────────────────┘
```

### Project Structure

```
/app                    # Next.js pages & API routes
  /api
    /chat              # SSE streaming endpoint
    /export            # PDF/DOCX generation
  /dashboard           # Analytics & monitoring
  /workflow            # Agent visualization
/components
  /agents              # Agent UI components
  /chat                # Chat interface
  /ui                  # Reusable UI primitives
/lib
  /agents              # 15 specialized agents
  /services            # LLM, vector DB, caching
  /utils               # Rate limiting, telemetry
/types                 # TypeScript definitions
```

## 📖 Usage

### Basic Research Query

```typescript
// Ask the agent
"Research Tesla and provide a comprehensive analysis"

// Agent orchestrates:
1. Research Agent → Company overview
2. Financial Agent → Metrics & performance
3. Competitive Agent → Market positioning
4. Strategy Agent → Recommendations
5. Synthesis Agent → Final report
```

### Workflow Page

Navigate to `/workflow` to:
- Watch agents execute in real-time
- View phase progression
- See logs & telemetry
- Adjust agent configuration

### Export Reports

Click **Export** to download:
- PDF with embedded charts
- DOCX with citations
- Custom branding (logo/colors)

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Docker

```dockerfile
# Build
docker build -t eightfold .

# Run
docker run -p 3000:3000 --env-file .env.local eightfold
```

### Environment Variables

Required for production:
- `GOOGLE_GEMINI_API_KEY`
- `GROQ_API_KEY`
- `NEXTAUTH_SECRET`
- `REDIS_URL` (caching)
- `PINECONE_API_KEY` (optional, for RAG)

## 🧪 Testing

```bash
# Run all tests
npm test

# Type checking
npm run typecheck

# Build verification
npm run build
```

## 📊 Performance

- **First Load**: < 150KB gzipped
- **Time to Interactive**: < 2s
- **Agent Response**: 3-8s (streaming)
- **Bundle Size**: Optimized via code splitting

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini API
- Vercel for hosting
- Radix UI for accessible components
- Next.js team for the framework

## 📞 Contact

- **Author**: Mohammed Thameem Ansari
- **GitHub**: [@mohammed-Thameem-ansari](https://github.com/mohammed-Thameem-ansari)

---

**Built with ❤️ for intelligent company research**

