import { Analytics, UsageStats, Message, AccountPlan } from '@/types'
import { storage } from './storage'

/**
 * Analytics tracking
 */
class AnalyticsManager {
  private statsKey = 'analytics_stats'
  private usageKey = 'analytics_usage'

  /**
   * Track query
   */
  trackQuery(query: string, companyName?: string): void {
    const stats = this.getStats()
    stats.totalQueries++
    
    // Track top searches
    const searchKey = `${query}_${companyName || ''}`
    const existingSearch = stats.topSearches.find(s => s.query === searchKey)
    if (existingSearch) {
      existingSearch.count++
    } else {
      stats.topSearches.push({ query: searchKey, count: 1 })
    }

    // Keep only top 10
    stats.topSearches = stats.topSearches
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    this.saveStats(stats)
  }

  /**
   * Track company research
   */
  trackCompany(companyName: string): void {
    const stats = this.getStats()
    stats.totalCompanies++

    const existingCompany = stats.topCompanies.find(c => c.name === companyName)
    if (existingCompany) {
      existingCompany.count++
    } else {
      stats.topCompanies.push({ name: companyName, count: 1 })
    }

    // Keep only top 10
    stats.topCompanies = stats.topCompanies
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    this.saveStats(stats)
  }

  /**
   * Track plan generation
   */
  trackPlanGenerated(plan: AccountPlan): void {
    const stats = this.getStats()
    stats.totalPlans++
    this.trackCompany(plan.companyName)
    this.saveStats(stats)
  }

  /**
   * Track research time
   */
  trackResearchTime(duration: number): void {
    const stats = this.getStats()
    const totalTime = stats.averageResearchTime * (stats.totalQueries - 1) + duration
    stats.averageResearchTime = totalTime / stats.totalQueries
    this.saveStats(stats)
  }

  /**
   * Track success/failure
   */
  trackResult(success: boolean): void {
    const stats = this.getStats()
    if (success) {
      const total = stats.totalQueries
      const currentSuccess = stats.successRate * (total - 1)
      stats.successRate = (currentSuccess + 1) / total
    } else {
      const total = stats.totalQueries
      const currentSuccess = stats.successRate * (total - 1)
      stats.successRate = currentSuccess / total
    }
    this.saveStats(stats)
  }

  /**
   * Get analytics
   */
  getAnalytics(): Analytics {
    return this.getStats()
  }

  /**
   * Get stats from storage
   */
  private getStats(): Analytics {
    const defaultStats: Analytics = {
      totalQueries: 0,
      totalCompanies: 0,
      totalPlans: 0,
      averageResearchTime: 0,
      successRate: 1.0,
      topCompanies: [],
      topSearches: [],
      timeRange: {
        start: new Date(),
        end: new Date(),
      },
    }

    const stored = storage.get<Analytics>(this.statsKey)
    if (!stored) {
      return defaultStats
    }

    return {
      ...defaultStats,
      ...stored,
      timeRange: {
        start: new Date(stored.timeRange.start),
        end: new Date(stored.timeRange.end),
      },
    }
  }

  /**
   * Save stats to storage
   */
  private saveStats(stats: Analytics): void {
    stats.timeRange.end = new Date()
    storage.set(this.statsKey, stats)
  }

  /**
   * Reset analytics
   */
  reset(): void {
    storage.remove(this.statsKey)
    storage.remove(this.usageKey)
  }

  /**
   * Start usage tracking
   */
  startUsageTracking(sessionId: string): UsageStats {
    const usage: UsageStats = {
      sessionId,
      startTime: new Date(),
      messages: 0,
      toolCalls: 0,
      researchQueries: 0,
      plansGenerated: 0,
      errors: 0,
    }

    storage.set(`${this.usageKey}_${sessionId}`, usage)
    return usage
  }

  /**
   * Update usage stats
   */
  updateUsage(sessionId: string, updates: Partial<UsageStats>): void {
    const usage = storage.get<UsageStats>(`${this.usageKey}_${sessionId}`)
    if (usage) {
      const updated = { ...usage, ...updates }
      storage.set(`${this.usageKey}_${sessionId}`, updated)
    }
  }

  /**
   * End usage tracking
   */
  endUsageTracking(sessionId: string): UsageStats | null {
    const usage = storage.get<UsageStats>(`${this.usageKey}_${sessionId}`)
    if (usage) {
      usage.endTime = new Date()
      storage.set(`${this.usageKey}_${sessionId}`, usage)
      return usage
    }
    return null
  }

  /**
   * Get usage stats
   */
  getUsage(sessionId: string): UsageStats | null {
    return storage.get<UsageStats>(`${this.usageKey}_${sessionId}`)
  }
}

export const analytics = new AnalyticsManager()

