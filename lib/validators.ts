import { z } from 'zod'
import { ValidationResult, ValidationError } from '@/types'

/**
 * Validation schemas using Zod
 */

export const CompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  domain: z.string().url().optional().or(z.literal('')),
  industry: z.string().optional(),
  description: z.string().optional(),
  founded: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  employees: z.number().int().positive().optional(),
  website: z.string().url().optional().or(z.literal('')),
})

export const ContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  title: z.string().min(1, 'Title is required').max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  linkedin: z.string().url().optional().or(z.literal('')),
  department: z.string().optional(),
  level: z.enum(['executive', 'manager', 'individual']).optional(),
})

export const ResearchQuerySchema = z.object({
  query: z.string().min(1, 'Query is required').max(500),
  companyName: z.string().optional(),
  type: z.enum(['general', 'financial', 'competitive', 'news', 'contacts', 'products']),
})

export const AccountPlanSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  sections: z.array(z.object({
    type: z.string(),
    title: z.string(),
    content: z.string(),
  })),
})

export const MessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(10000),
  role: z.enum(['user', 'assistant', 'system']),
})

/**
 * Validate data against schema
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult {
  try {
    schema.parse(data)
    return {
      valid: true,
      errors: [],
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }))
      return {
        valid: false,
        errors,
      }
    }
    return {
      valid: false,
      errors: [{
        field: 'unknown',
        message: 'Validation failed',
      }],
    }
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate phone number (basic)
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
}

/**
 * Validate company name
 */
export function validateCompanyName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      errors: [{
        field: 'name',
        message: 'Company name is required',
      }],
    }
  }

  if (name.length > 200) {
    return {
      valid: false,
      errors: [{
        field: 'name',
        message: 'Company name must be less than 200 characters',
      }],
    }
  }

  return {
    valid: true,
    errors: [],
  }
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: string): ValidationResult {
  if (!query || query.trim().length === 0) {
    return {
      valid: false,
      errors: [{
        field: 'query',
        message: 'Search query is required',
      }],
    }
  }

  if (query.length > 500) {
    return {
      valid: false,
      errors: [{
        field: 'query',
        message: 'Search query must be less than 500 characters',
      }],
    }
  }

  return {
    valid: true,
    errors: [],
  }
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate and sanitize user input
 */
export function validateAndSanitizeInput(input: string): { valid: boolean; sanitized: string; errors: string[] } {
  const errors: string[] = []

  if (!input || input.trim().length === 0) {
    errors.push('Input is required')
    return { valid: false, sanitized: '', errors }
  }

  if (input.length > 10000) {
    errors.push('Input is too long (max 10000 characters)')
    return { valid: false, sanitized: '', errors }
  }

  const sanitized = sanitizeInput(input.trim())
  return { valid: true, sanitized, errors }
}

/**
 * Validate date range
 */
export function validateDateRange(start: Date, end: Date): ValidationResult {
  if (start > end) {
    return {
      valid: false,
      errors: [{
        field: 'dateRange',
        message: 'Start date must be before end date',
      }],
    }
  }

  const maxRange = 365 * 24 * 60 * 60 * 1000 // 1 year in milliseconds
  if (end.getTime() - start.getTime() > maxRange) {
    return {
      valid: false,
      errors: [{
        field: 'dateRange',
        message: 'Date range must be less than 1 year',
      }],
    }
  }

  return {
    valid: true,
    errors: [],
  }
}

/**
 * Validate file upload
 */
export function validateFile(file: File, options: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}): ValidationResult {
  const errors: ValidationError[] = []

  if (options.maxSize && file.size > options.maxSize) {
    errors.push({
      field: 'file',
      message: `File size must be less than ${options.maxSize} bytes`,
    })
  }

  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    errors.push({
      field: 'file',
      message: `File type must be one of: ${options.allowedTypes.join(', ')}`,
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

