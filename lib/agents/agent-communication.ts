import { BaseAgent } from './base-agent'

/**
 * Agent Communication System - Enables agents to share information
 */
export class AgentCommunication {
  private messageQueue: Array<{
    from: string
    to: string
    message: string
    data?: any
    timestamp: Date
  }> = []
  private sharedMemory: Map<string, any> = new Map()

  /**
   * Send message from one agent to another
   */
  sendMessage(from: string, to: string, message: string, data?: any): void {
    this.messageQueue.push({
      from,
      to,
      message,
      data,
      timestamp: new Date(),
    })
  }

  /**
   * Get messages for an agent
   */
  getMessages(agentName: string): Array<{
    from: string
    message: string
    data?: any
    timestamp: Date
  }> {
    return this.messageQueue
      .filter(msg => msg.to === agentName)
      .map(({ from, message, data, timestamp }) => ({ from, message, data, timestamp }))
  }

  /**
   * Share data in shared memory
   */
  shareData(key: string, data: any): void {
    this.sharedMemory.set(key, {
      data,
      timestamp: new Date(),
      accessCount: 0,
    })
  }

  /**
   * Get shared data
   */
  getSharedData(key: string): any | null {
    const entry = this.sharedMemory.get(key)
    if (entry) {
      entry.accessCount++
      return entry.data
    }
    return null
  }

  /**
   * Broadcast message to all agents
   */
  broadcast(from: string, message: string, data?: any): void {
    const agentNames = [
      'Research Agent', 'Analysis Agent', 'Writing Agent', 'Validation Agent',
      'Competitive Agent', 'Financial Agent', 'Contact Agent', 'News Agent',
      'Market Agent', 'Product Agent', 'Risk Agent', 'Opportunity Agent',
      'Synthesis Agent', 'Quality Agent', 'Strategy Agent',
    ]

    for (const agentName of agentNames) {
      if (agentName !== from) {
        this.sendMessage(from, agentName, message, data)
      }
    }
  }

  /**
   * Clear message queue
   */
  clearMessages(): void {
    this.messageQueue = []
  }

  /**
   * Get communication statistics
   */
  getStats(): {
    totalMessages: number
    sharedDataKeys: number
    mostActiveSender: string
    mostActiveReceiver: string
  } {
    const senderCounts = new Map<string, number>()
    const receiverCounts = new Map<string, number>()

    for (const msg of this.messageQueue) {
      senderCounts.set(msg.from, (senderCounts.get(msg.from) || 0) + 1)
      receiverCounts.set(msg.to, (receiverCounts.get(msg.to) || 0) + 1)
    }

    const mostActiveSender = Array.from(senderCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

    const mostActiveReceiver = Array.from(receiverCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

    return {
      totalMessages: this.messageQueue.length,
      sharedDataKeys: this.sharedMemory.size,
      mostActiveSender,
      mostActiveReceiver,
    }
  }
}

export const agentCommunication = new AgentCommunication()

