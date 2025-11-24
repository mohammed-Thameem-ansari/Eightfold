"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, Clock, TrendingUp, AlertCircle } from "lucide-react";

interface PhaseTimeline {
  phase: string;
  startTime: number;
  endTime?: number;
  status: "active" | "completed" | "pending";
  agents: string[];
}

interface AgentPhaseTimelineProps {
  phases?: PhaseTimeline[];
}

export function AgentPhaseTimeline({ phases = [] }: AgentPhaseTimelineProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (start: number, end?: number) => {
    const duration = (end || currentTime) - start;
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`;
  };

  const getPhaseIcon = (phase: string) => {
    if (phase.includes("research")) return Activity;
    if (phase.includes("analysis")) return TrendingUp;
    if (phase.includes("synthesis")) return Zap;
    return Clock;
  };

  const activePhase = phases.find((p) => p.status === "active");
  const completedPhases = phases.filter((p) => p.status === "completed");
  const totalDuration = completedPhases.reduce(
    (sum, p) => sum + ((p.endTime || 0) - p.startTime),
    0
  );

  return (
    <Card className="h-full" data-export-chart>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Phase Timeline
        </CardTitle>
        {activePhase && (
          <div className="text-sm text-muted-foreground">
            Current: <span className="font-semibold text-foreground">{activePhase.phase}</span>
            {" • "}
            {formatDuration(activePhase.startTime)}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {phases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No phases active yet</p>
          </div>
        ) : (
          <>
            {/* Timeline visualization */}
            <div className="space-y-3">
              {phases.map((phase, idx) => {
                const Icon = getPhaseIcon(phase.phase);
                const isActive = phase.status === "active";
                const duration = formatDuration(phase.startTime, phase.endTime);

                return (
                  <div key={idx} className="relative">
                    {idx < phases.length - 1 && (
                      <div className="absolute left-[15px] top-8 w-0.5 h-full bg-border" />
                    )}
                    <div
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                        isActive
                          ? "bg-primary/5 border-primary/30 shadow-md"
                          : phase.status === "completed"
                          ? "bg-muted/30 border-border/50"
                          : "bg-muted/10 border-border/30 opacity-50"
                      }`}
                    >
                      <div
                        className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center ${
                          isActive
                            ? "bg-primary text-primary-foreground animate-pulse"
                            : phase.status === "completed"
                            ? "bg-foreground/10 text-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-sm capitalize">
                            {phase.phase.replace(/-/g, " ")}
                          </h4>
                          <Badge
                            variant={
                              isActive ? "default" : phase.status === "completed" ? "secondary" : "outline"
                            }
                            className="text-xs"
                          >
                            {duration}
                          </Badge>
                        </div>
                        {phase.agents.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {phase.agents.slice(0, 3).map((agent, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground"
                              >
                                {agent}
                              </span>
                            ))}
                            {phase.agents.length > 3 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground">
                                +{phase.agents.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary stats */}
            {completedPhases.length > 0 && (
              <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                <span>Total completed: {completedPhases.length} phases</span>
                <span className="font-mono">{formatDuration(0, totalDuration)}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
