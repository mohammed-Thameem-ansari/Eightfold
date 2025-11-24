/**
 * Integration Tests for SSE Workflow
 * Tests the Server-Sent Events streaming chat workflow
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Mock server URL - update for your deployment
const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';

describe('SSE Workflow Integration Tests', () => {
  let sessionId: string;

  beforeAll(() => {
    sessionId = `test-${Date.now()}`;
  });

  it('should handle a basic research query with SSE streaming', async () => {
    const response = await fetch(`${SERVER_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Research Apple Inc',
        sessionId,
      }),
    });

    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toBe('text/event-stream');

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    let receivedTypes = new Set<string>();
    let contentChunks: string[] = [];
    let sources: any[] = [];
    let isDone = false;

    if (reader) {
      while (!isDone) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              receivedTypes.add(data.type);

              if (data.type === 'content') {
                contentChunks.push(data.data);
              } else if (data.type === 'sources') {
                sources = data.data;
              } else if (data.type === 'done') {
                isDone = true;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }

        // Safety timeout
        if (contentChunks.length > 100) break;
      }
    }

    // Assertions
    expect(receivedTypes.has('content')).toBe(true);
    expect(receivedTypes.has('done')).toBe(true);
    expect(contentChunks.length).toBeGreaterThan(0);
    
    const fullContent = contentChunks.join('');
    expect(fullContent.length).toBeGreaterThan(50);
  }, 60000); // 60 second timeout

  it('should handle rate limiting', async () => {
    const requests = Array(10).fill(null).map((_, i) =>
      fetch(`${SERVER_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Test query ${i}`,
          sessionId: `rate-limit-test-${i}`,
        }),
      })
    );

    const responses = await Promise.all(requests);
    const statusCodes = responses.map(r => r.status);

    // Should have at least some 429 responses
    const rateLimited = statusCodes.filter(s => s === 429).length;
    expect(rateLimited).toBeGreaterThan(0);
  }, 30000);

  it('should reject invalid messages', async () => {
    const response = await fetch(`${SERVER_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: '',
        sessionId,
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('should handle agent workflow updates', async () => {
    const response = await fetch(`${SERVER_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Research Microsoft',
        sessionId: `workflow-test-${Date.now()}`,
      }),
    });

    expect(response.ok).toBe(true);

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    let hasWorkflowUpdate = false;
    let hasAgentUpdate = false;
    let iterations = 0;

    if (reader) {
      while (iterations < 50) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'workflow-update') {
                hasWorkflowUpdate = true;
              }
              if (data.type === 'agent-update') {
                hasAgentUpdate = true;
              }
              if (data.type === 'done') {
                iterations = 999; // Exit
              }
            } catch (e) {
              // Ignore
            }
          }
        }
        iterations++;
      }
    }

    expect(hasWorkflowUpdate || hasAgentUpdate).toBe(true);
  }, 60000);
});

describe('Performance Tests', () => {
  it('should respond within acceptable time', async () => {
    const start = Date.now();
    
    const response = await fetch(`${SERVER_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Quick test',
        sessionId: `perf-test-${Date.now()}`,
      }),
    });

    const firstByteTime = Date.now() - start;
    expect(firstByteTime).toBeLessThan(5000); // 5 seconds

    // Drain the stream
    const reader = response.body?.getReader();
    if (reader) {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    }

    const totalTime = Date.now() - start;
    expect(totalTime).toBeLessThan(30000); // 30 seconds for full response
  }, 35000);
});
