// Core message types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: Source[];
  reasoning?: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, any>;
}

export interface Source {
  title: string;
  url: string;
  snippet?: string;
  relevance?: number;
  domain?: string;
  date?: Date;
  type?: 'web' | 'news' | 'social' | 'financial' | 'official';
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
  result?: any;
  status: 'pending' | 'in-progress' | 'success' | 'error';
  timestamp?: Date;
  duration?: number;
}

// Account Plan types
export interface AccountPlan {
  id: string;
  companyName: string;
  createdAt: Date;
  updatedAt: Date;
  sections: PlanSection[];
  sources: Source[];
  metadata?: {
    confidence?: number;
    completeness?: number;
    tags?: string[];
    notes?: string;
  };
}

export interface PlanSection {
  id: string;
  type: SectionType;
  title: string;
  content: string;
  sources: Source[];
  confidence?: number;
  lastUpdated: Date;
  metadata?: {
    wordCount?: number;
    lastEditedBy?: string;
    version?: number;
  };
}

export type SectionType =
  | 'overview'
  | 'market-position'
  | 'decision-makers'
  | 'products-services'
  | 'recent-news'
  | 'pain-points'
  | 'recommended-approach'
  | 'financial-analysis'
  | 'competitive-landscape'
  | 'opportunities'
  | 'risks'
  | 'timeline'
  | 'swot';

// Agent state types
export interface AgentState {
  isResearching: boolean;
  currentAction?: string;
  researchProgress: ResearchStep[];
  confidence: number;
  iteration: number;
  maxIterations: number;
}

export interface ResearchStep {
  id: string;
  action: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  result?: string;
  timestamp: Date;
  duration?: number;
  metadata?: Record<string, any>;
}

// User persona types
export type UserPersona = 'confused' | 'efficient' | 'chatty' | 'normal' | 'edge-case';

export interface PersonaContext {
  type: UserPersona;
  characteristics: string[];
  handlingStrategy: string;
}

// API response types
export interface ChatResponse {
  message: string;
  reasoning?: string;
  toolCalls?: ToolCall[];
  sources?: Source[];
  shouldContinue?: boolean;
  metadata?: Record<string, any>;
}

export interface ResearchResponse {
  success: boolean;
  data: any;
  sources: Source[];
  confidence: number;
  message?: string;
  metadata?: Record<string, any>;
}

// Company data types
export interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  description?: string;
  founded?: number;
  headquarters?: Location;
  employees?: number;
  revenue?: FinancialData;
  website?: string;
  logo?: string;
  socialLinks?: SocialLinks;
  contacts?: Contact[];
  products?: Product[];
  competitors?: Competitor[];
  news?: NewsItem[];
  metadata?: Record<string, any>;
}

export interface Location {
  city?: string;
  state?: string;
  country?: string;
  address?: string;
}

export interface FinancialData {
  amount?: number;
  currency?: string;
  period?: string;
  growth?: number;
}

export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  department?: string;
  level?: 'executive' | 'manager' | 'individual';
  verified?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  features?: string[];
}

export interface Competitor {
  id: string;
  name: string;
  description?: string;
  marketShare?: number;
  strengths?: string[];
  weaknesses?: string[];
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  date?: Date;
  source?: string;
  type?: 'press-release' | 'news' | 'blog' | 'social';
}

// Research types
export interface ResearchQuery {
  id: string;
  query: string;
  companyName?: string;
  type: 'general' | 'financial' | 'competitive' | 'news' | 'contacts' | 'products';
  filters?: ResearchFilters;
  timestamp: Date;
}

export interface ResearchFilters {
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  sources?: string[];
  languages?: string[];
  regions?: string[];
}

export interface ResearchResult {
  id: string;
  query: ResearchQuery;
  sources: Source[];
  data: any;
  confidence: number;
  timestamp: Date;
  duration?: number;
}

// Analytics types
export interface Analytics {
  totalQueries: number;
  totalCompanies: number;
  totalPlans: number;
  averageResearchTime: number;
  successRate: number;
  topCompanies: Array<{ name: string; count: number }>;
  topSearches: Array<{ query: string; count: number }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface UsageStats {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  messages: number;
  toolCalls: number;
  researchQueries: number;
  plansGenerated: number;
  errors: number;
}

// Configuration types
export interface AppConfig {
  apiKeys: {
    gemini?: string;
    serp?: string;
    brave?: string;
  };
  features: {
    enableCaching: boolean;
    enableAnalytics: boolean;
    enableExport: boolean;
    maxIterations: number;
    cacheTTL: number;
    enableOpenAI?: boolean;
    enableGroq?: boolean;
    ragTopK?: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    dateFormat: string;
  };
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  stack?: string;
}

// Export types
export interface ExportOptions {
  format: 'pdf' | 'docx' | 'html' | 'json' | 'csv';
  includeSources: boolean;
  includeMetadata: boolean;
  sections?: string[];
  includeCharts?: boolean; // include client-rendered charts/images
  chartImages?: string[]; // base64 PNG data URLs captured client-side
}

export interface ExportResult {
  success: boolean;
  url?: string;
  filename?: string;
  size?: number;
  error?: string;
}

// Cache types
export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: Date;
  ttl: number;
  hits: number;
}

// Validation types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Search provider types
export type SearchProvider = 'serp' | 'duckduckgo' | 'brave' | 'mock';

export interface SearchProviderConfig {
  name: SearchProvider;
  enabled: boolean;
  priority: number;
  apiKey?: string;
  rateLimit?: {
    requests: number;
    period: number; // in milliseconds
  };
}

// Session types
export interface Session {
  id: string;
  userId?: string;
  startTime: Date;
  lastActivity: Date;
  messages: Message[];
  currentCompany?: string;
  plans: AccountPlan[];
  metadata?: Record<string, any>;
}
