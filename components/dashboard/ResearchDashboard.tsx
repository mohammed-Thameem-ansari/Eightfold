'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AgentPerformanceChart } from '@/components/agents/AgentPerformanceChart'
import { AgentStatusPanel } from '@/components/agents/AgentStatusPanel'
import { WorkflowVisualization } from '@/components/agents/WorkflowVisualization'
import { AgentActivityFeed } from '@/components/agents/AgentActivityFeed'
import { AgentCommunicationPanel } from '@/components/agents/AgentCommunicationPanel'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, BarChart3, TrendingUp, FileText, MessageSquare } from 'lucide-react'
import { WorkflowUpdate } from '@/lib/agents/orchestrator'

interface ResearchDashboardProps {
  workflowUpdates: WorkflowUpdate[]
  agentStats?: Record<string, any>
}

export function ResearchDashboard({ workflowUpdates, agentStats = {} }: ResearchDashboardProps) {
  return (
    <Tabs defaultValue="agents" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="agents" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Agents
        </TabsTrigger>
        <TabsTrigger value="workflow" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Workflow
        </TabsTrigger>
        <TabsTrigger value="performance" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Performance
        </TabsTrigger>
        <TabsTrigger value="communication" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Communication
        </TabsTrigger>
        <TabsTrigger value="analytics" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Analytics
        </TabsTrigger>
      </TabsList>

      <TabsContent value="agents" className="space-y-4 mt-4">
        <AgentStatusPanel workflowUpdates={workflowUpdates} />
        <AgentActivityFeed workflowUpdates={workflowUpdates} />
      </TabsContent>

      <TabsContent value="workflow" className="mt-4">
        <WorkflowVisualization workflowUpdates={workflowUpdates} />
      </TabsContent>

      <TabsContent value="performance" className="mt-4">
        <AgentPerformanceChart agentStats={agentStats} />
      </TabsContent>

      <TabsContent value="communication" className="mt-4">
        <AgentCommunicationPanel />
      </TabsContent>

      <TabsContent value="analytics" className="mt-4">
        <AnalyticsDashboard />
      </TabsContent>
    </Tabs>
  )
}

