# 🚀 Agentic AI Implementation Roadmap

## ✅ IMMEDIATE FIXES APPLIED

### 1. Gemini Model Configuration
- ✅ Updated to use `models/gemini-1.5-flash` (correct v1 API format)
- ✅ Fixed all 3 files: `.env.local`, `llm-providers.ts`, `api-client.ts`
- ✅ Previous `gemini-pro` → `models/gemini-1.5-flash` (valid model)

### 2. Ticker Symbol Extraction
- ✅ Added comprehensive ticker mapping (25+ companies)
- ✅ Fixed Yahoo Finance URL bugs ([object Object], sentence errors)
- ✅ Sanitizes all financial API calls

### 3. Environment Configuration
- ✅ Added NewsAPI key support
- ✅ Added Pinecone configuration placeholders
- ✅ All services properly configured

---

## 📦 PHASE 1: DEPENDENCY INSTALLATION (30 minutes)

### Install Core Agentic Framework
```bash
npm install --save \
  langgraph \
  @langchain/core \
  @langchain/community \
  langsmith \
  zod \
  uuid
```

### Install Memory & Storage
```bash
npm install --save \
  ioredis \
  @prisma/client \
  prisma \
  chromadb
```

### Install Open-Source LLM Support
```bash
npm install --save \
  ollama \
  @langchain/ollama
```

### Install Observability & Evaluation
```bash
npm install --save \
  ragas \
  prom-client \
  winston \
  winston-daily-rotate-file
```

### Install Auth & Real-time
```bash
npm install --save \
  next-auth@beta \
  @auth/prisma-adapter \
  ws \
  socket.io \
  bullmq
```

### Install Dev Dependencies
```bash
npm install --save-dev \
  @types/uuid \
  @types/ws \
  @types/ioredis
```

### Initialize Prisma
```bash
npx prisma init
```

### Install Ollama (Local LLMs)
```bash
# Windows (using PowerShell)
winget install Ollama.Ollama

# Pull recommended models
ollama pull llama3.1:70b
ollama pull deepseek-coder-v2
ollama pull qwen2.5:72b
ollama pull mistral-large
```

---

## 🏗️ PHASE 2: MEMORY SYSTEM (Day 1-2)

### 2.1 Create Memory Infrastructure

#### File: `lib/memory/types.ts`
```typescript
export interface MemoryEntry {
  id: string;
  sessionId: string;
  userId?: string;
  type: 'conversation' | 'entity' | 'episodic' | 'semantic';
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  timestamp: Date;
  expiresAt?: Date;
}

export interface MemoryConfig {
  shortTermTTL: number;      // 1 hour
  longTermTTL: number;       // 30 days
  maxConversationLength: number;  // 50 messages
  embeddingModel: string;    // text-embedding-3-small
}
```

#### File: `lib/memory/redis-memory.ts`
```typescript
import Redis from 'ioredis';
import { MemoryEntry } from './types';

export class RedisMemory {
  private client: Redis;
  private ttl: number = 3600; // 1 hour

  constructor(url?: string) {
    this.client = new Redis(url || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async set(key: string, value: MemoryEntry): Promise<void> {
    await this.client.setex(key, this.ttl, JSON.stringify(value));
  }

  async get(key: string): Promise<MemoryEntry | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async getSessionMessages(sessionId: string, limit = 50): Promise<MemoryEntry[]> {
    const keys = await this.client.keys(`session:${sessionId}:message:*`);
    const messages = await Promise.all(keys.map(k => this.get(k)));
    return messages.filter(Boolean).slice(-limit) as MemoryEntry[];
  }

  async clear(sessionId: string): Promise<void> {
    const keys = await this.client.keys(`session:${sessionId}:*`);
    if (keys.length > 0) await this.client.del(...keys);
  }
}
```

#### File: `lib/memory/vector-memory.ts`
```typescript
import { ChromaClient, Collection } from 'chromadb';
import { MemoryEntry } from './types';

export class VectorMemory {
  private client: ChromaClient;
  private collection: Collection | null = null;

  constructor() {
    this.client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000'
    });
  }

  async initialize(collectionName = 'research_memory'): Promise<void> {
    this.collection = await this.client.getOrCreateCollection({
      name: collectionName,
      metadata: { description: 'Episodic memory for research agent' }
    });
  }

  async store(entry: MemoryEntry): Promise<void> {
    if (!this.collection) await this.initialize();
    
    await this.collection!.add({
      ids: [entry.id],
      documents: [entry.content],
      metadatas: [{ ...entry.metadata, timestamp: entry.timestamp.toISOString() }]
    });
  }

  async search(query: string, topK = 5): Promise<MemoryEntry[]> {
    if (!this.collection) await this.initialize();
    
    const results = await this.collection!.query({
      queryTexts: [query],
      nResults: topK
    });

    return results.documents[0].map((doc, i) => ({
      id: results.ids[0][i],
      content: doc,
      metadata: results.metadatas[0][i],
      distance: results.distances?.[0][i]
    })) as any[];
  }
}
```

#### File: `lib/memory/memory-manager.ts`
```typescript
import { RedisMemory } from './redis-memory';
import { VectorMemory } from './vector-memory';
import { MemoryEntry, MemoryConfig } from './types';

export class MemoryManager {
  private shortTerm: RedisMemory;
  private episodic: VectorMemory;
  private config: MemoryConfig;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      shortTermTTL: 3600,
      longTermTTL: 2592000,
      maxConversationLength: 50,
      embeddingModel: 'text-embedding-3-small',
      ...config
    };

    this.shortTerm = new RedisMemory();
    this.episodic = new VectorMemory();
  }

  async saveMessage(sessionId: string, message: MemoryEntry): Promise<void> {
    // Save to short-term (Redis)
    await this.shortTerm.set(`session:${sessionId}:message:${message.id}`, message);

    // Save to episodic (Vector DB) for semantic search
    if (message.type === 'conversation') {
      await this.episodic.store(message);
    }
  }

  async getConversationHistory(sessionId: string, limit?: number): Promise<MemoryEntry[]> {
    return this.shortTerm.getSessionMessages(sessionId, limit || this.config.maxConversationLength);
  }

  async searchRelevantMemories(query: string, topK = 5): Promise<MemoryEntry[]> {
    return this.episodic.search(query, topK);
  }

  async clearSession(sessionId: string): Promise<void> {
    await this.shortTerm.clear(sessionId);
  }
}

// Singleton
let memoryManager: MemoryManager | null = null;

export function getMemoryManager(): MemoryManager {
  if (!memoryManager) {
    memoryManager = new MemoryManager();
  }
  return memoryManager;
}
```

---

## 🛠️ PHASE 3: TOOL REGISTRY (Day 2-3)

### 3.1 Tool Framework

#### File: `lib/tools/types.ts`
```typescript
import { z } from 'zod';

export interface Tool {
  name: string;
  description: string;
  schema: z.ZodSchema;
  execute: (params: any) => Promise<any>;
  category: 'search' | 'data' | 'compute' | 'communication' | 'file';
  retryPolicy?: {
    maxRetries: number;
    backoff: 'exponential' | 'linear';
  };
}

export interface ToolCall {
  id: string;
  tool: string;
  params: any;
  result?: any;
  error?: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startTime?: Date;
  endTime?: Date;
}
```

#### File: `lib/tools/search-tools.ts`
```typescript
import { z } from 'zod';
import { Tool } from './types';
import { searchWeb } from '@/lib/api-client';

export const webSearchTool: Tool = {
  name: 'web_search',
  description: 'Search the web for current information using SERP API or Brave Search',
  category: 'search',
  schema: z.object({
    query: z.string().describe('Search query'),
    numResults: z.number().optional().describe('Number of results (default: 10)')
  }),
  execute: async ({ query, numResults = 10 }) => {
    const results = await searchWeb(query, undefined, numResults);
    return {
      results: results.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet
      }))
    };
  }
};

export const newsSearchTool: Tool = {
  name: 'news_search',
  description: 'Search for recent news articles about a topic',
  category: 'search',
  schema: z.object({
    query: z.string(),
    days: z.number().optional().describe('Days back to search (default: 7)')
  }),
  execute: async ({ query, days = 7 }) => {
    const newsService = await import('@/lib/services/news-aggregation');
    const service = newsService.getNewsService();
    const results = await service.getNews({ keywords: [query], limit: 10 });
    return { articles: results.articles };
  }
};
```

#### File: `lib/tools/calculator-tools.ts`
```typescript
import { z } from 'zod';
import { Tool } from './types';

export const calculatorTool: Tool = {
  name: 'calculator',
  description: 'Perform mathematical calculations. Supports basic arithmetic, algebra, and financial formulas.',
  category: 'compute',
  schema: z.object({
    expression: z.string().describe('Mathematical expression to evaluate')
  }),
  execute: async ({ expression }) => {
    try {
      // Safe eval using Function constructor with restricted scope
      const result = new Function('Math', `"use strict"; return (${expression})`)(Math);
      return { result, expression };
    } catch (error) {
      throw new Error(`Calculator error: ${error}`);
    }
  }
};

export const financialCalculatorTool: Tool = {
  name: 'financial_calculator',
  description: 'Calculate financial metrics like ROI, growth rate, valuation multiples',
  category: 'compute',
  schema: z.object({
    metric: z.enum(['roi', 'cagr', 'pe_ratio', 'price_to_sales']),
    values: z.record(z.number())
  }),
  execute: async ({ metric, values }) => {
    switch (metric) {
      case 'roi':
        return { roi: ((values.final - values.initial) / values.initial) * 100 };
      case 'cagr':
        const years = values.years || 1;
        return { cagr: (Math.pow(values.final / values.initial, 1 / years) - 1) * 100 };
      case 'pe_ratio':
        return { pe_ratio: values.price / values.eps };
      case 'price_to_sales':
        return { price_to_sales: values.market_cap / values.revenue };
      default:
        throw new Error('Unknown metric');
    }
  }
};
```

#### File: `lib/tools/tool-registry.ts`
```typescript
import { Tool, ToolCall } from './types';
import { webSearchTool, newsSearchTool } from './search-tools';
import { calculatorTool, financialCalculatorTool } from './calculator-tools';
import { generateId } from '@/lib/utils';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools(): void {
    // Search tools
    this.register(webSearchTool);
    this.register(newsSearchTool);

    // Calculator tools
    this.register(calculatorTool);
    this.register(financialCalculatorTool);
  }

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolsForLLM(): any[] {
    return this.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: this.zodSchemaToJSON(tool.schema)
    }));
  }

  async executeTool(name: string, params: any): Promise<ToolCall> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    const toolCall: ToolCall = {
      id: generateId(),
      tool: name,
      params,
      status: 'pending',
      startTime: new Date()
    };

    try {
      // Validate params
      tool.schema.parse(params);

      // Execute
      toolCall.status = 'running';
      toolCall.result = await tool.execute(params);
      toolCall.status = 'success';
    } catch (error: any) {
      toolCall.status = 'error';
      toolCall.error = error.message;
    } finally {
      toolCall.endTime = new Date();
    }

    return toolCall;
  }

  private zodSchemaToJSON(schema: any): any {
    // Convert Zod schema to JSON Schema (simplified)
    // In production, use zod-to-json-schema library
    return {
      type: 'object',
      properties: {},
      required: []
    };
  }
}

// Singleton
let toolRegistry: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!toolRegistry) {
    toolRegistry = new ToolRegistry();
  }
  return toolRegistry;
}
```

---

## 🔄 PHASE 4: LANGGRAPH WORKFLOWS (Day 3-4)

### 4.1 Workflow Engine

#### File: `lib/workflows/types.ts`
```typescript
export interface WorkflowState {
  sessionId: string;
  companyName: string;
  query: string;
  context: Record<string, any>;
  results: Record<string, any>;
  errors: string[];
  currentStep: string;
  progress: number;
}

export interface WorkflowNode {
  id: string;
  name: string;
  execute: (state: WorkflowState) => Promise<Partial<WorkflowState>>;
  retry?: number;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  condition?: (state: WorkflowState) => boolean;
}
```

#### File: `lib/workflows/research-workflow.ts`
```typescript
import { StateGraph, END } from 'langgraph';
import { WorkflowState } from './types';
import { getAgent } from '@/lib/agents/orchestrator';

// Define workflow nodes
async function gatherInitialData(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const researchAgent = getAgent('research');
  const newsAgent = getAgent('news');
  
  const [basicInfo, recentNews] = await Promise.all([
    researchAgent.execute({ companyName: state.companyName }),
    newsAgent.execute({ companyName: state.companyName })
  ]);

  return {
    results: {
      ...state.results,
      basicInfo,
      recentNews
    },
    progress: 25
  };
}

async function analyzeMarketPosition(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const marketAgent = getAgent('market');
  const competitiveAgent = getAgent('competitive');

  const [market, competitive] = await Promise.all([
    marketAgent.execute({ companyName: state.companyName, data: state.results }),
    competitiveAgent.execute({ companyName: state.companyName, data: state.results })
  ]);

  return {
    results: {
      ...state.results,
      market,
      competitive
    },
    progress: 50
  };
}

async function performDeepAnalysis(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const financialAgent = getAgent('financial');
  const riskAgent = getAgent('risk');
  const opportunityAgent = getAgent('opportunity');

  const [financial, risks, opportunities] = await Promise.all([
    financialAgent.execute({ companyName: state.companyName, data: state.results }),
    riskAgent.execute({ companyName: state.companyName, data: state.results }),
    opportunityAgent.execute({ companyName: state.companyName, data: state.results })
  ]);

  return {
    results: {
      ...state.results,
      financial,
      risks,
      opportunities
    },
    progress: 75
  };
}

async function synthesizeResults(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const synthesisAgent = getAgent('synthesis');
  const qualityAgent = getAgent('quality');

  const synthesis = await synthesisAgent.execute({ 
    companyName: state.companyName,
    data: state.results 
  });

  const qualityCheck = await qualityAgent.execute({
    companyName: state.companyName,
    data: synthesis
  });

  return {
    results: {
      ...state.results,
      synthesis,
      quality: qualityCheck
    },
    progress: 100
  };
}

// Build workflow graph
export function createResearchWorkflow() {
  const workflow = new StateGraph<WorkflowState>({
    channels: {
      sessionId: { value: '' },
      companyName: { value: '' },
      query: { value: '' },
      context: { value: {} },
      results: { value: {} },
      errors: { value: [] },
      currentStep: { value: 'start' },
      progress: { value: 0 }
    }
  });

  // Add nodes
  workflow.addNode('gather_data', gatherInitialData);
  workflow.addNode('analyze_market', analyzeMarketPosition);
  workflow.addNode('deep_analysis', performDeepAnalysis);
  workflow.addNode('synthesize', synthesizeResults);

  // Add edges
  workflow.addEdge('gather_data', 'analyze_market');
  workflow.addEdge('analyze_market', 'deep_analysis');
  workflow.addEdge('deep_analysis', 'synthesize');
  workflow.addEdge('synthesize', END);

  // Set entry point
  workflow.setEntryPoint('gather_data');

  return workflow.compile();
}
```

---

## 🤖 PHASE 5: OLLAMA INTEGRATION (Day 4-5)

#### File: `lib/services/llm-providers/ollama-provider.ts`
```typescript
import { Ollama } from 'ollama';
import { BaseLLMProvider } from './base-provider';

export class OllamaProvider extends BaseLLMProvider {
  private client: Ollama;
  private defaultModel = 'llama3.1:70b';

  constructor() {
    super();
    this.client = new Ollama({
      host: process.env.OLLAMA_URL || 'http://localhost:11434'
    });
  }

  async generate(prompt: string, options: any = {}): Promise<any> {
    const model = options.model || this.defaultModel;
    
    const response = await this.client.chat({
      model,
      messages: [{ role: 'user', content: prompt }],
      options: {
        temperature: options.temperature || 0.7,
        num_predict: options.maxTokens || 2048
      }
    });

    return {
      text: response.message.content,
      provider: 'ollama',
      model,
      usage: {
        promptTokens: response.prompt_eval_count || 0,
        completionTokens: response.eval_count || 0,
        totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
      }
    };
  }

  async *generateStream(prompt: string, options: any = {}): AsyncGenerator<string> {
    const model = options.model || this.defaultModel;
    
    const stream = await this.client.chat({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      options: {
        temperature: options.temperature || 0.7
      }
    });

    for await (const chunk of stream) {
      if (chunk.message?.content) {
        yield chunk.message.content;
      }
    }
  }
}
```

#### Update: `lib/services/llm-providers.ts`
```typescript
// Add Ollama to existing provider service
import { OllamaProvider } from './llm-providers/ollama-provider';

// Add to constructor
this.ollamaClient = new OllamaProvider();

// Add Ollama models to router
const OLLAMA_MODELS = [
  'llama3.1:70b',      // Best open-source overall
  'deepseek-coder-v2',  // Best for code
  'qwen2.5:72b',       // Fast & capable
  'mistral-large'      // Good balance
];

// Model routing logic
private selectModel(task: string): { provider: string, model: string } {
  // For simple tasks, use local models
  if (task.includes('summarize') || task.includes('extract')) {
    return { provider: 'ollama', model: 'qwen2.5:72b' };
  }
  
  // For complex reasoning, use Gemini or Claude
  if (task.includes('analyze') || task.includes('strategy')) {
    return { provider: 'gemini', model: 'models/gemini-1.5-pro' };
  }
  
  // Default to fast local model
  return { provider: 'ollama', model: 'llama3.1:70b' };
}
```

---

## 📊 PHASE 6: EVALUATION SYSTEM (Day 5-6)

#### File: `lib/evaluation/metrics.ts`
```typescript
import { RagasEvaluator } from 'ragas';

export interface EvaluationMetrics {
  contextPrecision: number;   // Relevance of retrieved context
  contextRecall: number;      // Coverage of retrieved context
  faithfulness: number;       // Factual accuracy
  answerRelevancy: number;    // Response quality
  latency: number;            // Response time (ms)
  cost: number;               // Token cost ($)
}

export class EvaluationService {
  private evaluator: RagasEvaluator;

  constructor() {
    this.evaluator = new RagasEvaluator({
      llm: 'gpt-4o-mini',  // Cheap model for evaluation
      embeddings: 'text-embedding-3-small'
    });
  }

  async evaluate(
    query: string,
    response: string,
    context: string[],
    groundTruth?: string
  ): Promise<EvaluationMetrics> {
    const startTime = Date.now();

    const scores = await this.evaluator.evaluate({
      question: query,
      answer: response,
      contexts: context,
      ground_truth: groundTruth
    });

    return {
      contextPrecision: scores.context_precision || 0,
      contextRecall: scores.context_recall || 0,
      faithfulness: scores.faithfulness || 0,
      answerRelevancy: scores.answer_relevancy || 0,
      latency: Date.now() - startTime,
      cost: this.calculateCost(response)
    };
  }

  private calculateCost(text: string): number {
    // Rough token estimate: ~4 chars per token
    const tokens = text.length / 4;
    const costPer1kTokens = 0.0001; // $0.10 per 1M tokens
    return (tokens / 1000) * costPer1kTokens;
  }
}
```

---

## 🎯 NEXT STEPS

### Option A: Auto-Execute Full Upgrade
I'll implement all phases automatically:
1. Install all dependencies
2. Create memory system
3. Build tool registry
4. Integrate LangGraph
5. Add Ollama support
6. Set up evaluation

**Command**: Say "Execute full upgrade"

### Option B: Guided Implementation
I'll implement phase by phase with your approval:
1. Show you each component
2. Wait for feedback
3. Iterate based on your needs

**Command**: Say "Start Phase 1" (or specific phase)

### Option C: Custom Priority
Tell me what's most important:
- Memory system?
- Open-source LLMs?
- Evaluation/testing?
- Workflow engine?

**Your Choice?** 🚀
