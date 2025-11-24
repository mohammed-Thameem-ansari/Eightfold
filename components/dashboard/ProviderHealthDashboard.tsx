"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface ProviderHealth {
  name: string;
  status: "healthy" | "degraded" | "down";
  latency: number;
  successRate: number;
  lastCheck: number;
  errorCount: number;
}

interface ProviderHealthDashboardProps {
  providers?: ProviderHealth[];
}

export function ProviderHealthDashboard({ providers = [] }: ProviderHealthDashboardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mock data if no providers provided
  const displayProviders: ProviderHealth[] = providers.length > 0 ? providers : [
    {
      name: "Gemini",
      status: "healthy",
      latency: 850,
      successRate: 98.5,
      lastCheck: Date.now() - 5000,
      errorCount: 0,
    },
    {
      name: "Groq",
      status: "healthy",
      latency: 420,
      successRate: 99.2,
      lastCheck: Date.now() - 3000,
      errorCount: 0,
    },
    {
      name: "OpenAI",
      status: "degraded",
      latency: 1850,
      successRate: 92.1,
      lastCheck: Date.now() - 8000,
      errorCount: 3,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "down":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "healthy":
        return "default";
      case "degraded":
        return "secondary";
      case "down":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 500) return "text-green-500";
    if (latency < 1500) return "text-yellow-500";
    return "text-red-500";
  };

  const healthyCount = displayProviders.filter((p) => p.status === "healthy").length;
  const avgLatency =
    displayProviders.reduce((sum, p) => sum + p.latency, 0) / displayProviders.length;

  return (
    <Card data-export-chart>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Provider Health
          </div>
          {mounted && (
            <Badge variant={healthyCount === displayProviders.length ? "default" : "secondary"}>
              {healthyCount}/{displayProviders.length} Healthy
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider cards */}
        <div className="space-y-3">
          {displayProviders.map((provider) => (
            <div
              key={provider.name}
              className={`p-4 rounded-lg border transition-all ${
                provider.status === "healthy"
                  ? "bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-900/50"
                  : provider.status === "degraded"
                  ? "bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200/50 dark:border-yellow-900/50"
                  : "bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-900/50"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(provider.status)}
                  <h4 className="font-semibold">{provider.name}</h4>
                </div>
                <Badge variant={getStatusBadgeVariant(provider.status)} className="text-xs capitalize">
                  {provider.status}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Latency</div>
                  <div className={`font-mono font-semibold ${getLatencyColor(provider.latency)}`}>
                    {provider.latency}ms
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
                  <div className="font-mono font-semibold">{provider.successRate.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Errors</div>
                  <div
                    className={`font-mono font-semibold ${
                      provider.errorCount === 0
                        ? "text-green-500"
                        : provider.errorCount < 5
                        ? "text-yellow-500"
                        : "text-red-500"
                    }`}
                  >
                    {provider.errorCount}
                  </div>
                </div>
              </div>

              {mounted && (
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    Last checked{" "}
                    {Math.floor((Date.now() - provider.lastCheck) / 1000)}s ago
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        {mounted && (
          <div className="pt-4 border-t border-border/50 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Avg Latency</div>
              <div className={`font-mono font-semibold ${getLatencyColor(avgLatency)}`}>
                {avgLatency.toFixed(0)}ms
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Overall Status</div>
              <div className="font-semibold">
                {healthyCount === displayProviders.length ? (
                  <span className="text-green-500">All Systems Operational</span>
                ) : (
                  <span className="text-yellow-500">Some Issues Detected</span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
