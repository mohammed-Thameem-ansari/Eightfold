/**
 * Input Validation and Sanitization
 * Protects against malicious inputs and ensures data quality
 */

import { z } from 'zod'

/**
 * Sanitize string input (remove potentially dangerous content)
 */
export function sanitizeString(input: string): string {
  if (!input) return ''
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '')
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
  
  // Limit length
  const maxLength = 10000
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }
  
  return sanitized
}

/**
 * Validate and sanitize company name
 */
export function validateCompanyName(name: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeString(name)
  
  if (!sanitized) {
    return { valid: false, sanitized: '', error: 'Company name is required' }
  }
  
  if (sanitized.length < 2) {
    return { valid: false, sanitized, error: 'Company name must be at least 2 characters' }
  }
  
  if (sanitized.length > 200) {
    return { valid: false, sanitized, error: 'Company name must be less than 200 characters' }
  }
  
  // Check for valid characters (letters, numbers, spaces, common punctuation)
  const validPattern = /^[a-zA-Z0-9\s\.\,\-\&\'\(\)]+$/
  if (!validPattern.test(sanitized)) {
    return { valid: false, sanitized, error: 'Company name contains invalid characters' }
  }
  
  return { valid: true, sanitized }
}

/**
 * Validate URL
 */
export function validateUrl(url: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeString(url)
  
  if (!sanitized) {
    return { valid: false, sanitized: '', error: 'URL is required' }
  }
  
  try {
    const parsed = new URL(sanitized)
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, sanitized, error: 'Only HTTP and HTTPS URLs are allowed' }
    }
    
    // Block localhost and internal IPs (SSRF protection)
    const hostname = parsed.hostname.toLowerCase()
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      'metadata.google.internal', // GCP metadata
      '169.254.169.254', // AWS/Azure metadata
    ]
    
    if (blockedHosts.some(blocked => hostname.includes(blocked))) {
      return { valid: false, sanitized, error: 'Cannot access internal or localhost URLs' }
    }
    
    // Check for IP address ranges (simple check)
    if (/^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.|^192\.168\./.test(hostname)) {
      return { valid: false, sanitized, error: 'Cannot access private network URLs' }
    }
    
    return { valid: true, sanitized: parsed.toString() }
  } catch (error) {
    return { valid: false, sanitized, error: 'Invalid URL format' }
  }
}

/**
 * Validate email
 */
export function validateEmail(email: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeString(email).toLowerCase()
  
  if (!sanitized) {
    return { valid: false, sanitized: '', error: 'Email is required' }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(sanitized)) {
    return { valid: false, sanitized, error: 'Invalid email format' }
  }
  
  return { valid: true, sanitized }
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeString(query)
  
  if (!sanitized) {
    return { valid: false, sanitized: '', error: 'Search query is required' }
  }
  
  if (sanitized.length < 2) {
    return { valid: false, sanitized, error: 'Search query must be at least 2 characters' }
  }
  
  if (sanitized.length > 500) {
    return { valid: false, sanitized, error: 'Search query must be less than 500 characters' }
  }
  
  return { valid: true, sanitized }
}

/**
 * Validate plan section type
 */
export const planSectionTypes = [
  'overview',
  'products',
  'competitive',
  'financial',
  'contact',
  'swot',
  'market',
  'risk',
  'opportunity',
  'strategy',
  'executive-summary',
] as const

export type PlanSectionType = typeof planSectionTypes[number]

export function validateSectionType(type: string): { valid: boolean; type?: PlanSectionType; error?: string } {
  if (!type) {
    return { valid: false, error: 'Section type is required' }
  }
  
  if (planSectionTypes.includes(type as PlanSectionType)) {
    return { valid: true, type: type as PlanSectionType }
  }
  
  return { valid: false, error: `Invalid section type. Must be one of: ${planSectionTypes.join(', ')}` }
}

/**
 * Validate export options
 */
export const exportFormats = ['pdf', 'docx', 'json', 'html', 'csv'] as const
export type ExportFormat = typeof exportFormats[number]

export function validateExportOptions(options: any): { 
  valid: boolean; 
  options?: { format: ExportFormat; includeSources: boolean; includeMetadata: boolean }; 
  error?: string 
} {
  if (!options || typeof options !== 'object') {
    return { valid: false, error: 'Invalid export options' }
  }
  
  const format = options.format
  if (!format || !exportFormats.includes(format)) {
    return { valid: false, error: `Invalid format. Must be one of: ${exportFormats.join(', ')}` }
  }
  
  return {
    valid: true,
    options: {
      format,
      includeSources: options.includeSources !== false,
      includeMetadata: options.includeMetadata !== false,
    }
  }
}

/**
 * Validate message content
 */
export function validateMessage(message: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeString(message)
  
  if (!sanitized) {
    return { valid: false, sanitized: '', error: 'Message is required' }
  }
  
  if (sanitized.length < 1) {
    return { valid: false, sanitized, error: 'Message cannot be empty' }
  }
  
  if (sanitized.length > 5000) {
    return { valid: false, sanitized, error: 'Message must be less than 5000 characters' }
  }
  
  return { valid: true, sanitized }
}

/**
 * Validate plan ID (UUID format)
 */
export function validatePlanId(id: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeString(id)
  
  if (!sanitized) {
    return { valid: false, sanitized: '', error: 'Plan ID is required' }
  }
  
  // UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(sanitized)) {
    return { valid: false, sanitized, error: 'Invalid plan ID format' }
  }
  
  return { valid: true, sanitized }
}

/**
 * Zod schemas for complex validation
 */
export const schemas = {
  createPlan: z.object({
    companyName: z.string().min(2).max(200),
    sections: z.array(z.enum(['overview', 'products', 'competitive', 'financial', 'contact', 'swot', 'market', 'risk', 'opportunity', 'strategy', 'executive-summary'])).optional(),
  }),
  
  updateSection: z.object({
    planId: z.string().uuid(),
    sectionType: z.enum(['overview', 'products', 'competitive', 'financial', 'contact', 'swot', 'market', 'risk', 'opportunity', 'strategy', 'executive-summary']),
    content: z.string().min(1).max(50000),
  }),
  
  exportPlan: z.object({
    planId: z.string().uuid(),
    options: z.object({
      format: z.enum(['pdf', 'docx', 'json', 'html', 'csv']),
      includeSources: z.boolean().optional(),
      includeMetadata: z.boolean().optional(),
      sections: z.array(z.string()).optional(),
    }),
  }),
  
  chatMessage: z.object({
    message: z.string().min(1).max(5000),
    conversationId: z.string().uuid().optional(),
  }),
}

/**
 * Safe JSON parsing
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json)
  } catch (error) {
    console.error('JSON parse error:', error)
    return defaultValue
  }
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  return text.replace(/[&<>"'/]/g, char => map[char])
}
