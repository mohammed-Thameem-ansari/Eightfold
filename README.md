# AI Research Agent - Production Ready 🚀

A sophisticated multi-agent AI research platform powered by 15+ specialized agents delivering comprehensive company research, competitive analysis, and strategic insights. Built with Next.js 14, TypeScript, and enterprise-grade architecture.

## ✨ Key Features

### 🤖 Multi-Agent Intelligence
- **15 Specialized Agents**: Research, Analysis, Financial, Competitive, Market, Strategy, Contact Discovery, Technology, Risk, Legal, Partnership, Innovation, Customer Intelligence, Supply Chain, and ESG agents
- **Real-time Workflow Visualization**: Watch agents collaborate with live phase tracking and resizable panels
- **Intelligent Orchestration**: Adaptive coordination with confidence scoring (75-100%) and phase management
- **Agent Performance Timeline**: Track execution history with duration metrics and status indicators

### 💎 Advanced Capabilities
- **Enhanced PDF/DOCX Export**: Professional reports with embedded charts (html2canvas), custom branding (logo/colors/company name), styled headers/footers, and section dividers
- **Semantic Search Highlighting**: Automatic keyword extraction and highlighting across messages and sources with stop word filtering (up to 10 keywords)
- **Provider Health Dashboard**: Real-time monitoring of Gemini/Groq/OpenAI with latency tracking, success rates, error counts, and circuit breaker status
- **Dynamic Agent Configuration**: Live tuning of max iterations (1-20), confidence threshold (50-100%), timeout (30-300s), parallel agents (1-10), retry attempts (0-5), and cache toggle
- **Persistent User Preferences**: Resizable panel sizes, active tab state, theme selection, agent config, and export branding saved to localStorage with versioning
- **Structured Telemetry System**: Multi-level logging (debug/info/warn/error/critical), category filtering (system/agent/api/user/performance/security), real-time dashboard with export

### 🔒 Enterprise Security & Performance
- **Advanced Rate Limiting**: Token bucket algorithm with IP-based identification (100 req/min API, 5/min auth, 20/min search) and retry-after headers
- **Global Error Boundaries**: Graceful fallback UI with error details, stack traces, recovery options, and automatic logging
- **LRU Caching Layer**: Memory-efficient caching for documents (500 capacity) and searches (100 capacity) with hit/miss tracking and statistics
- **WCAG Accessibility**: Complete ARIA labels, keyboard navigation hints (Tab/Enter/Shift+Enter), screen reader descriptions, semantic HTML
- **Performance Optimization**: Code splitting (framework/lib/commons chunks), lazy loading, image optimization (AVIF/WebP), SWC minification, bundle analysis tools
- **Caching System**: Intelligent caching for faster responses
- **User Persona Detection**: Adapts to different user communication styles
- **Multi-Agent Coordination**: Advanced agent system with iteration control

### User Experience
- **Modern UI**: Beautiful, responsive interface built with Radix UI and Tailwind CSS
- **Real-time Progress**: See research steps as they happen
- **Toast Notifications**: User-friendly feedback for all actions
- **Error Boundaries**: Graceful error handling with recovery options
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🏗️ Architecture

### Technology Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **AI**: Google Gemini 1.5 Pro
- **UI**: Radix UI + Tailwind CSS
- **State Management**: React Hooks + Local Storage
- **Validation**: Zod

### Project Structure

```
/app
  /api              - API routes (chat, analytics, export, etc.)
  page.tsx          - Main application page
  layout.tsx        - Root layout
  globals.css       - Global styles

/components
  /analytics        - Analytics dashboard components
  /chat             - Chat interface components
  /account-plan     - Account plan display and editing
  /settings         - Settings panel
  /export           - Export functionality
  /error            - Error handling components
  /ui               - Base UI components (Radix UI)

/lib
  agent.ts          - Core AI agent (ReAct pattern)
  api-client.ts     - Gemini API client with tool calling
  cache.ts           - Caching system
  storage.ts         - Local storage management
  analytics.ts       - Analytics tracking
  config.ts          - Configuration management
  validators.ts      - Input validation
  error-handler.ts   - Error handling utilities
  utils.ts           - General utilities
  constants.ts       - Constants and persona definitions

/types
  index.ts           - TypeScript type definitions

/hooks
  use-toast.ts       - Toast notification hook
```

## 🚀 Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey)) - **FREE**
- (Optional) SerpAPI key for enhanced search
- (Optional) Brave Search API key

### Installation

1. **Clone or navigate to the project directory**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   # Required (Free tier available)
   GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

   # Optional - Search providers (with fallback to free DuckDuckGo)
   SERP_API_KEY=your_serp_api_key_here
   BRAVE_SEARCH_API_KEY=your_brave_search_api_key_here

   # Optional - Feature flags
   DEMO_MODE=false
   ENABLE_CACHING=true
   ENABLE_ANALYTICS=true
   MAX_ITERATIONS=10
   CACHE_TTL=3600000
   ```

   **Note**: The app works completely free with just the Gemini API key. DuckDuckGo search is free and works without an API key. Other search providers are optional.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 💡 Usage

### Basic Research

1. Start a conversation by typing a message like:
   - "Research Apple"
   - "Generate an account plan for Microsoft"
   - "Analyze Tesla's market position"

2. The agent will:
   - Detect your communication style
   - Search for relevant information
   - Synthesize findings
   - Generate a comprehensive response

### Account Plans

1. After research, generate an account plan
2. View all sections in the sidebar
3. Edit sections as needed
4. Export plans in multiple formats

### Analytics

- View usage statistics
- Track top companies and searches
- Monitor performance metrics

### Settings

- Configure features
- Manage data
- Export/import data
- Clear analytics

## 🎨 Features in Detail

### Multi-Provider Search

The app automatically tries multiple search providers in order:
1. SerpAPI (if configured)
2. DuckDuckGo (free, always available)
3. Brave Search (if configured)
4. Mock data (fallback)

### Caching

- Intelligent caching of search results
- Configurable TTL
- Automatic cache cleanup
- Cache statistics

### Error Handling

- Comprehensive error tracking
- User-friendly error messages
- Automatic retry with exponential backoff
- Error boundaries for graceful failures

### Analytics

- Track queries, companies, and plans
- Monitor success rates
- View top searches and companies
- Performance metrics

## 🔧 Configuration

### Environment Variables

- `GOOGLE_GEMINI_API_KEY`: Required for AI functionality
- `SERP_API_KEY`: Optional, for SerpAPI search
- `BRAVE_SEARCH_API_KEY`: Optional, for Brave Search
- `DEMO_MODE`: Enable demo mode (uses mock data)
- `ENABLE_CACHING`: Enable/disable caching
- `ENABLE_ANALYTICS`: Enable/disable analytics
- `MAX_ITERATIONS`: Maximum research iterations
- `CACHE_TTL`: Cache time-to-live in milliseconds

### Feature Flags

Configure features in the Settings panel:
- Enable/disable caching
- Enable/disable analytics
- Enable/disable export
- Adjust max iterations

## 📊 Code Statistics

- **Total Lines**: 10,000+ lines of production-ready code
- **Components**: 20+ React components
- **API Routes**: 6+ API endpoints
- **Utilities**: 10+ utility modules
- **Type Safety**: Full TypeScript coverage

## 🛠️ Development

### Project Structure

The codebase is organized for scalability:
- Modular architecture
- Separation of concerns
- Reusable components
- Type-safe APIs
- Error handling throughout

### Adding Features

1. Add types in `/types/index.ts`
2. Create utilities in `/lib/`
3. Build components in `/components/`
4. Add API routes in `/app/api/`
5. Update documentation

## 📝 License

This project is open source and available for use.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ using Google Gemini AI**
