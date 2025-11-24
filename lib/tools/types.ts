/**
 * Tool Registry Types
 * Standardized tool calling framework following OpenAI function calling protocol
 */

import { z } from 'zod'

export interface Tool {
  name: string
  description: string
  schema: z.ZodSchema
  category: 'search' | 'data' | 'compute' | 'communication' | 'file' | 'api'
  execute: (params: any) => Promise<any>
  retryPolicy?: RetryPolicy
  rateLimit?: RateLimit
  requiresAuth?: boolean
}

export interface RetryPolicy {
  maxRetries: number
  backoffType: 'exponential' | 'linear' | 'fixed'
  initialDelay: number  // milliseconds
  maxDelay?: number
}

export interface RateLimit {
  maxCalls: number
  windowMs: number  // time window in milliseconds
}

export interface ToolCall {
  id: string
  tool: string
  params: any
  result?: any
  error?: string
  status: 'pending' | 'running' | 'success' | 'error' | 'timeout'
  startTime?: Date
  endTime?: Date
  retryCount?: number
  metadata?: Record<string, any>
}

export interface ToolExecutionContext {
  sessionId?: string
  userId?: string
  timeout?: number
  priority?: 'low' | 'normal' | 'high'
  metadata?: Record<string, any>
}

export interface ToolMetadata {
  name: string
  description: string
  category: string
  parameters: any  // JSON Schema
  examples?: Array<{
    input: any
    output: any
    description: string
  }>
  version?: string
  author?: string
}
