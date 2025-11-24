/**
 * Logging and Telemetry System
 * Structured logging with levels, categories, and metrics tracking
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type LogCategory = 'system' | 'agent' | 'api' | 'user' | 'performance' | 'security';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
}

export interface TelemetryMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

class TelemetryService {
  private logs: LogEntry[] = [];
  private metrics: TelemetryMetric[] = [];
  private maxLogs: number = 1000;
  private listeners: Set<(entry: LogEntry) => void> = new Set();

  /**
   * Log a message
   */
  log(level: LogLevel, category: LogCategory, message: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      metadata,
      stackTrace: level === 'error' || level === 'critical' ? new Error().stack : undefined,
    };

    this.logs.push(entry);
    
    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(entry));

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' || level === 'critical' ? 'error' 
        : level === 'warn' ? 'warn' 
        : 'log';
      console[consoleMethod](`[${category.toUpperCase()}] ${message}`, metadata || '');
    }
  }

  /**
   * Convenience methods
   */
  debug(category: LogCategory, message: string, metadata?: Record<string, any>) {
    this.log('debug', category, message, metadata);
  }

  info(category: LogCategory, message: string, metadata?: Record<string, any>) {
    this.log('info', category, message, metadata);
  }

  warn(category: LogCategory, message: string, metadata?: Record<string, any>) {
    this.log('warn', category, message, metadata);
  }

  error(category: LogCategory, message: string, metadata?: Record<string, any>) {
    this.log('error', category, message, metadata);
  }

  critical(category: LogCategory, message: string, metadata?: Record<string, any>) {
    this.log('critical', category, message, metadata);
  }

  /**
   * Track a metric
   */
  trackMetric(name: string, value: number, unit: string, tags?: Record<string, string>) {
    const metric: TelemetryMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);

    // Keep last 500 metrics
    if (this.metrics.length > 500) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  /**
   * Subscribe to log events
   */
  subscribe(listener: (entry: LogEntry) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get logs with optional filters
   */
  getLogs(filters?: {
    level?: LogLevel[];
    category?: LogCategory[];
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): LogEntry[] {
    let filtered = [...this.logs];

    if (filters?.level) {
      filtered = filtered.filter(log => filters.level!.includes(log.level));
    }

    if (filters?.category) {
      filtered = filtered.filter(log => filters.category!.includes(log.category));
    }

    if (filters?.startTime) {
      filtered = filtered.filter(log => log.timestamp >= filters.startTime!);
    }

    if (filters?.endTime) {
      filtered = filtered.filter(log => log.timestamp <= filters.endTime!);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Get metrics with optional filters
   */
  getMetrics(filters?: {
    name?: string;
    startTime?: number;
    endTime?: number;
  }): TelemetryMetric[] {
    let filtered = [...this.metrics];

    if (filters?.name) {
      filtered = filtered.filter(metric => metric.name === filters.name);
    }

    if (filters?.startTime) {
      filtered = filtered.filter(metric => metric.timestamp >= filters.startTime!);
    }

    if (filters?.endTime) {
      filtered = filtered.filter(metric => metric.timestamp <= filters.endTime!);
    }

    return filtered;
  }

  /**
   * Get statistics
   */
  getStats() {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const recentLogs = this.logs.filter(log => log.timestamp >= last24h);

    const levelCounts = recentLogs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<LogLevel, number>);

    const categoryCounts = recentLogs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<LogCategory, number>);

    return {
      totalLogs: this.logs.length,
      recentLogs: recentLogs.length,
      levelCounts,
      categoryCounts,
      errorRate: recentLogs.length > 0 
        ? ((levelCounts.error || 0) + (levelCounts.critical || 0)) / recentLogs.length 
        : 0,
    };
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this.metrics = [];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const telemetry = new TelemetryService();

// Export convenience functions
export const logDebug = (category: LogCategory, message: string, metadata?: Record<string, any>) =>
  telemetry.debug(category, message, metadata);

export const logInfo = (category: LogCategory, message: string, metadata?: Record<string, any>) =>
  telemetry.info(category, message, metadata);

export const logWarn = (category: LogCategory, message: string, metadata?: Record<string, any>) =>
  telemetry.warn(category, message, metadata);

export const logError = (category: LogCategory, message: string, metadata?: Record<string, any>) =>
  telemetry.error(category, message, metadata);

export const logCritical = (category: LogCategory, message: string, metadata?: Record<string, any>) =>
  telemetry.critical(category, message, metadata);

export const trackMetric = (name: string, value: number, unit: string, tags?: Record<string, string>) =>
  telemetry.trackMetric(name, value, unit, tags);
