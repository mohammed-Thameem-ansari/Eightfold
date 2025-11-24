import { Message, AccountPlan, Session } from '@/types'
import { generateId } from './utils'

/**
 * Local storage wrapper with type safety
 */
class StorageManager {
  private prefix = 'research_agent_'

  /**
   * Set item in localStorage
   */
  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return
    try {
      const serialized = JSON.stringify(value)
      localStorage.setItem(this.prefix + key, serialized)
    } catch (error) {
      console.error('Storage set error:', error)
    }
  }

  /**
   * Get item from localStorage
   */
  get<T>(key: string, defaultValue?: T): T | null {
    if (typeof window === 'undefined') return defaultValue || null
    try {
      const item = localStorage.getItem(this.prefix + key)
      if (item === null) return defaultValue || null
      return JSON.parse(item) as T
    } catch (error) {
      console.error('Storage get error:', error)
      return defaultValue || null
    }
  }

  /**
   * Remove item from localStorage
   */
  remove(key: string): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(this.prefix + key)
    } catch (error) {
      console.error('Storage remove error:', error)
    }
  }

  /**
   * Clear all app data from localStorage
   */
  clear(): void {
    if (typeof window === 'undefined') return
    try {
      const keys = Object.keys(localStorage)
      for (const key of keys) {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key)
        }
      }
    } catch (error) {
      console.error('Storage clear error:', error)
    }
  }

  /**
   * Get all keys with prefix
   */
  getAllKeys(): string[] {
    if (typeof window === 'undefined') return []
    try {
      const keys = Object.keys(localStorage)
      return keys
        .filter(key => key.startsWith(this.prefix))
        .map(key => key.replace(this.prefix, ''))
    } catch (error) {
      console.error('Storage getAllKeys error:', error)
      return []
    }
  }
}

export const storage = new StorageManager()

/**
 * Session management
 */
export class SessionManager {
  private currentSessionId: string | null = null

  /**
   * Get or create session
   */
  getSession(): Session {
    const sessionId = this.getSessionId()
    const session = storage.get<Session>(`session_${sessionId}`)

    if (session) {
      return session
    }

    const newSession: Session = {
      id: sessionId,
      startTime: new Date(),
      lastActivity: new Date(),
      messages: [],
      plans: [],
    }

    storage.set(`session_${sessionId}`, newSession)
    return newSession
  }

  /**
   * Update session
   */
  updateSession(updates: Partial<Session>): void {
    const session = this.getSession()
    const updated = {
      ...session,
      ...updates,
      lastActivity: new Date(),
    }
    storage.set(`session_${updated.id}`, updated)
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    if (this.currentSessionId) {
      return this.currentSessionId
    }

    const stored = storage.get<string>('current_session_id')
    if (stored) {
      this.currentSessionId = stored
      return stored
    }

    const newId = generateId()
    this.currentSessionId = newId
    storage.set('current_session_id', newId)
    return newId
  }

  /**
   * Set session ID
   */
  setSessionId(sessionId: string): void {
    this.currentSessionId = sessionId
    storage.set('current_session_id', sessionId)
  }

  /**
   * Clear session
   */
  clearSession(): void {
    const sessionId = this.getSessionId()
    storage.remove(`session_${sessionId}`)
    this.currentSessionId = null
    storage.remove('current_session_id')
  }

  /**
   * Get all sessions
   */
  getAllSessions(): Session[] {
    const keys = storage.getAllKeys()
    const sessionKeys = keys.filter(key => key.startsWith('session_'))
    const sessions: Session[] = []

    for (const key of sessionKeys) {
      const session = storage.get<Session>(key)
      if (session) {
        sessions.push(session)
      }
    }

    return sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
  }
}

export const sessionManager = new SessionManager()

/**
 * Message storage
 */
export class MessageStorage {
  /**
   * Save message to session
   */
  saveMessage(message: Message): void {
    const session = sessionManager.getSession()
    session.messages.push(message)
    sessionManager.updateSession({ messages: session.messages })
  }

  /**
   * Get messages from session
   */
  getMessages(): Message[] {
    const session = sessionManager.getSession()
    return session.messages
  }

  /**
   * Clear messages
   */
  clearMessages(): void {
    const session = sessionManager.getSession()
    sessionManager.updateSession({ messages: [] })
  }
}

export const messageStorage = new MessageStorage()

/**
 * Plan storage
 */
export class PlanStorage {
  /**
   * Save plan
   */
  savePlan(plan: AccountPlan): void {
    const session = sessionManager.getSession()
    const existingIndex = session.plans.findIndex(p => p.id === plan.id)
    
    if (existingIndex >= 0) {
      session.plans[existingIndex] = plan
    } else {
      session.plans.push(plan)
    }

    sessionManager.updateSession({ plans: session.plans })
    
    // Also save individually for easy access
    storage.set(`plan_${plan.id}`, plan)
  }

  /**
   * Get plan by ID
   */
  getPlan(planId: string): AccountPlan | null {
    return storage.get<AccountPlan>(`plan_${planId}`)
  }

  /**
   * Get all plans from session
   */
  getPlans(): AccountPlan[] {
    const session = sessionManager.getSession()
    return session.plans
  }

  /**
   * Delete plan
   */
  deletePlan(planId: string): void {
    const session = sessionManager.getSession()
    session.plans = session.plans.filter(p => p.id !== planId)
    sessionManager.updateSession({ plans: session.plans })
    storage.remove(`plan_${planId}`)
  }
}

export const planStorage = new PlanStorage()

/**
 * Export/Import functionality
 */
export class DataExporter {
  /**
   * Export session data
   */
  exportSession(): string {
    const session = sessionManager.getSession()
    return JSON.stringify(session, null, 2)
  }

  /**
   * Import session data
   */
  importSession(data: string): { success: boolean; error?: string } {
    try {
      const session = JSON.parse(data) as Session
      storage.set(`session_${session.id}`, session)
      sessionManager.setSessionId(session.id)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Export plan
   */
  exportPlan(planId: string): string | null {
    const plan = planStorage.getPlan(planId)
    if (!plan) return null
    return JSON.stringify(plan, null, 2)
  }
}

export const dataExporter = new DataExporter()

