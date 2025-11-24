import { AppError } from '@/types'

/**
 * Error handler with logging and user-friendly messages
 */
class ErrorHandler {
  private errors: AppError[] = []
  private maxErrors = 100

  /**
   * Handle error
   */
  handle(error: unknown, context?: string): AppError {
    const appError: AppError = {
      code: this.getErrorCode(error),
      message: this.getErrorMessage(error),
      details: this.getErrorDetails(error),
      timestamp: new Date(),
      stack: error instanceof Error ? error.stack : undefined,
    }

    // Add context if provided
    if (context) {
      appError.details = {
        ...appError.details,
        context,
      }
    }

    // Log error
    console.error('Error:', appError)

    // Store error
    this.addError(appError)

    return appError
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: unknown): string {
    if (error instanceof Error) {
      // Map common errors to user-friendly messages
      if (error.message.includes('API key')) {
        return 'API key is missing or invalid. Please check your configuration.'
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'Network error. Please check your internet connection and try again.'
      }
      if (error.message.includes('timeout')) {
        return 'Request timed out. Please try again.'
      }
      if (error.message.includes('rate limit')) {
        return 'Rate limit exceeded. Please wait a moment and try again.'
      }
      if (error.message.includes('quota')) {
        return 'API quota exceeded. Please check your usage limits.'
      }
      return error.message || 'An unexpected error occurred.'
    }
    return 'An unexpected error occurred.'
  }

  /**
   * Get error code
   */
  private getErrorCode(error: unknown): string {
    if (error instanceof Error) {
      if (error.name === 'TypeError') return 'TYPE_ERROR'
      if (error.name === 'ReferenceError') return 'REFERENCE_ERROR'
      if (error.name === 'RangeError') return 'RANGE_ERROR'
      if (error.message.includes('API')) return 'API_ERROR'
      if (error.message.includes('network')) return 'NETWORK_ERROR'
      if (error.message.includes('timeout')) return 'TIMEOUT_ERROR'
      if (error.message.includes('rate limit')) return 'RATE_LIMIT_ERROR'
      if (error.message.includes('quota')) return 'QUOTA_ERROR'
      return 'UNKNOWN_ERROR'
    }
    return 'UNKNOWN_ERROR'
  }

  /**
   * Get error message
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    return 'An unknown error occurred'
  }

  /**
   * Get error details
   */
  private getErrorDetails(error: unknown): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
      }
    }
    return { error }
  }

  /**
   * Add error to history
   */
  private addError(error: AppError): void {
    this.errors.push(error)
    if (this.errors.length > this.maxErrors) {
      this.errors.shift()
    }
  }

  /**
   * Get error history
   */
  getErrors(limit?: number): AppError[] {
    const errors = [...this.errors].reverse()
    return limit ? errors.slice(0, limit) : errors
  }

  /**
   * Clear error history
   */
  clearErrors(): void {
    this.errors = []
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byCode: Record<string, number>;
    recent: AppError[];
  } {
    const byCode: Record<string, number> = {}
    for (const error of this.errors) {
      byCode[error.code] = (byCode[error.code] || 0) + 1
    }

    return {
      total: this.errors.length,
      byCode,
      recent: this.errors.slice(-10).reverse(),
    }
  }
}

export const errorHandler = new ErrorHandler()

/**
 * Error boundary component props
 */
export interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: AppError }>
}

/**
 * Async error wrapper
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<{ success: true; data: T } | { success: false; error: AppError }> {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    const appError = errorHandler.handle(error, context)
    return { success: false, error: appError }
  }
}

/**
 * Sync error wrapper
 */
export function withErrorHandlingSync<T>(
  fn: () => T,
  context?: string
): { success: true; data: T } | { success: false; error: AppError } {
  try {
    const data = fn()
    return { success: true, data }
  } catch (error) {
    const appError = errorHandler.handle(error, context)
    return { success: false, error: appError }
  }
}

