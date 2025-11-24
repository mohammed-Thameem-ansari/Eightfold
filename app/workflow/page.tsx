"use client";

import { useState, useRef, useEffect } from "react";
import { generateId } from "@/lib/utils";
import { Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopNav } from "@/components/layout/TopNav";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { AgentWorkflowPanel, WorkflowStep } from "@/components/agents/AgentWorkflowPanel";
import { LiveLogsPanel, LogEntry } from "@/components/agents/LiveLogsPanel";
import { FinalAnswerBox } from "@/components/agents/FinalAnswerBox";
import { getPreferences, savePreferences } from "@/lib/utils/preferences";

export default function WorkflowPage() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => generateId());
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [finalAnswer, setFinalAnswer] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [panelSizes, setPanelSizes] = useState<[number, number]>(() => {
    const prefs = getPreferences();
    return prefs.resizablePanelSizes?.workflow || [50, 50];
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Save panel sizes when changed
  const handlePanelResize = (sizes: number[]) => {
    const newSizes: [number, number] = [sizes[0], sizes[1]];
    setPanelSizes(newSizes);
    savePreferences({
      resizablePanelSizes: {
        workflow: newSizes,
      },
    });
  };

  async function handleSend() {
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    setSteps([]);
    setLogs([]);
    setFinalAnswer("");
    setIsComplete(false);
    const userInput = input;
    setInput("");
    setSteps([
      {
        id: generateId(),
        label: "Research initiated",
        status: "completed",
        timestamp: new Date(),
        agent: "System",
      },
    ]);
    setLogs([
      {
        id: generateId(),
        message: `Query received: "${userInput}"`,
        level: "info",
        timestamp: new Date(),
        agent: "System",
      },
    ]);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput, sessionId }),
      });
      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            switch (data.type) {
              case "step":
                setSteps((prev) => [
                  ...prev,
                  { id: generateId(), ...data.data, timestamp: new Date() },
                ]);
                break;
              case "log":
                setLogs((prev) => [
                  ...prev,
                  { id: generateId(), ...data.data, timestamp: new Date() },
                ]);
                break;
              case "agent-update":
                setSteps((prev) => [
                  ...prev,
                  {
                    id: generateId(),
                    label: data.data,
                    status: "active",
                    timestamp: new Date(),
                    agent: data.data,
                  },
                ]);
                setLogs((prev) => [
                  ...prev,
                  {
                    id: generateId(),
                    message: `Agent activated: ${data.data}`,
                    level: "info",
                    timestamp: new Date(),
                    agent: data.data,
                  },
                ]);
                break;
              case "workflow-update":
                if (data.data.phase) {
                  setSteps((prev) => [
                    ...prev,
                    {
                      id: generateId(),
                      label: `Phase: ${data.data.phase}`,
                      status: "active",
                      timestamp: new Date(),
                      agent: "Orchestrator",
                    },
                  ]);
                }
                break;
              case "content":
                setFinalAnswer((prev) => prev + data.data);
                break;
              case "finalAnswer":
                setFinalAnswer(data.data);
                setIsComplete(true);
                setSteps((prev) => [
                  ...prev,
                  {
                    id: generateId(),
                    label: "Research completed",
                    status: "completed",
                    timestamp: new Date(),
                    agent: "System",
                  },
                ]);
                setLogs((prev) => [
                  ...prev,
                  {
                    id: generateId(),
                    message: "Final answer generated successfully",
                    level: "success",
                    timestamp: new Date(),
                    agent: "System",
                  },
                ]);
                break;
              case "done":
                setIsLoading(false);
                setIsComplete(true);
                break;
            }
          } catch (e) {
            console.error("Error parsing SSE data:", e);
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setLogs((prev) => [
        ...prev,
        {
          id: generateId(),
          message:
            "Error: " + (error instanceof Error ? error.message : "Unknown error"),
          level: "error",
          timestamp: new Date(),
          agent: "System",
        },
      ]);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav
        statusBadges={
          isLoading ? (
            <div className="agent-badge active px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
              <span className="font-semibold text-sm">Processing</span>
            </div>
          ) : null
        }
      />
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 md:px-10 py-8">
        <div className="mb-8 max-w-4xl mx-auto">
          <div className="relative group">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about any company... (e.g., Research Apple Inc.)"
              className="perplexity-search w-full resize-none min-h-[60px] text-lg"
              rows={2}
              disabled={isLoading}
              aria-label="Workflow research query input"
              aria-describedby="workflow-hint"
            />
            <span id="workflow-hint" className="sr-only">
              Enter your research query to see the agent workflow in real-time
            </span>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="lg"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl gap-2"
            >
              <Send className="h-5 w-5" />
              <span className="hidden sm:inline">Research</span>
            </Button>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-foreground/5 to-foreground/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none -z-10 blur-2xl" />
          </div>
        </div>
        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-[600px] rounded-lg border border-border/50 shadow-sm mb-6"
          onLayout={handlePanelResize}
        >
          <ResizablePanel defaultSize={panelSizes[0]} minSize={30}>
            <div className="h-full">
              <AgentWorkflowPanel steps={steps} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={panelSizes[1]} minSize={30}>
            <div className="h-full">
              <LiveLogsPanel logs={logs} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
        {(finalAnswer || isLoading) && (
          <div className="max-w-4xl mx-auto">
            <FinalAnswerBox content={finalAnswer} isComplete={isComplete} />
          </div>
        )}
      </main>
      <footer className="border-t border-border/20 bg-background/60 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-4 flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Live Agent Monitoring</span>
          </div>
            <div className="h-1 w-1 rounded-full bg-border" />
            <span>15 Specialized Agents</span>
            <div className="h-1 w-1 rounded-full bg-border" />
            <span>Real-time Orchestration</span>
        </div>
      </footer>
    </div>
  );
}
