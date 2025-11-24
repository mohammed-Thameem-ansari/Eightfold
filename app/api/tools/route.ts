import { NextRequest } from 'next/server'
import { ToolRegistry } from '@/lib/tools/tool-registry'
import { Tool } from '@/lib/tools/types'

const toolRegistry = ToolRegistry.getInstance()

export async function POST(req: NextRequest) {
  try {
    const { action, toolName, parameters, toolCalls } = await req.json()

    switch (action) {
      case 'execute':
        if (!toolName) {
          return new Response(JSON.stringify({ error: 'toolName is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        const result = await toolRegistry.executeTool(toolName, parameters || {})
        return new Response(JSON.stringify({ success: true, result }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })

      case 'execute_batch':
        if (!toolCalls || !Array.isArray(toolCalls)) {
          return new Response(JSON.stringify({ error: 'toolCalls array is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        const results = await toolRegistry.executeTools(toolCalls)
        return new Response(JSON.stringify({ success: true, results }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
    }
  } catch (error) {
    console.error('Tools API error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'list'

    switch (format) {
      case 'llm':
        // Get tools in OpenAI function calling format
        const llmTools = toolRegistry.getToolsForLLM()
        return new Response(JSON.stringify({ success: true, tools: llmTools }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })

      case 'statistics':
        // Get execution statistics
        const stats = toolRegistry.getStatistics()
        return new Response(JSON.stringify({ success: true, statistics: stats }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })

      case 'list':
      default:
        // Get list of available tools
        const tools = toolRegistry.getAllTools().map((tool: Tool) => ({
          name: tool.name,
          description: tool.description,
          category: tool.category,
        }))
        return new Response(JSON.stringify({ success: true, tools }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    }
  } catch (error) {
    console.error('Tools API error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
