"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, AlertTriangle, Info, AlertCircle, XCircle, 
  TrendingUp, RefreshCw, Download, Trash2 
} from "lucide-react";
import { telemetry, LogEntry, LogLevel, LogCategory } from "@/lib/utils/telemetry";

const levelIcons: Record<LogLevel, any> = {
  debug: Info,
  info: Info,
  warn: AlertTriangle,
  error: AlertCircle,
  critical: XCircle,
};

const levelColors: Record<LogLevel, string> = {
  debug: "text-muted-foreground",
  info: "text-blue-500",
  warn: "text-yellow-500",
  error: "text-red-500",
  critical: "text-red-600",
};

export function TelemetryDashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<LogCategory | 'all'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshLogs = () => {
    const filters: any = { limit: 100 };
    if (filterLevel !== 'all') filters.level = [filterLevel];
    if (filterCategory !== 'all') filters.category = [filterCategory];
    setLogs(telemetry.getLogs(filters));
  };

  useEffect(() => {
    refreshLogs();
    
    if (autoRefresh) {
      const unsubscribe = telemetry.subscribe(() => refreshLogs());
      return unsubscribe;
    }
  }, [filterLevel, filterCategory, autoRefresh]);

  const stats = telemetry.getStats();

  const handleExport = () => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all logs?')) {
      telemetry.clearLogs();
      refreshLogs();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Telemetry
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Logs</p>
            <p className="text-2xl font-bold">{stats.totalLogs}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Last 24h</p>
            <p className="text-2xl font-bold">{stats.recentLogs}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Errors</p>
            <p className="text-2xl font-bold text-red-500">
              {(stats.levelCounts?.error || 0) + (stats.levelCounts?.critical || 0)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Error Rate</p>
            <p className="text-2xl font-bold">
              {(stats.errorRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Level:</span>
            <div className="flex gap-1">
              <Badge
                variant={filterLevel === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilterLevel('all')}
              >
                All
              </Badge>
              {(['debug', 'info', 'warn', 'error', 'critical'] as LogLevel[]).map(level => (
                <Badge
                  key={level}
                  variant={filterLevel === level ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => setFilterLevel(level)}
                >
                  {level}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Category:</span>
            <div className="flex gap-1">
              <Badge
                variant={filterCategory === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilterCategory('all')}
              >
                All
              </Badge>
              {(['system', 'agent', 'api', 'user', 'performance', 'security'] as LogCategory[]).map(cat => (
                <Badge
                  key={cat}
                  variant={filterCategory === cat ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Logs */}
        <ScrollArea className="h-[500px] border border-border/50 rounded-lg">
          <div className="p-4 space-y-2">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No logs found</p>
              </div>
            ) : (
              logs.map((log) => {
                const Icon = levelIcons[log.level];
                return (
                  <div
                    key={log.id}
                    className="flex gap-3 p-3 rounded-lg border border-border/30 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${levelColors[log.level]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {log.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {log.level}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium break-words">{log.message}</p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Metadata
                          </summary>
                          <pre className="text-xs bg-background/50 p-2 rounded mt-1 overflow-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                      {log.stackTrace && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Stack Trace
                          </summary>
                          <pre className="text-xs bg-background/50 p-2 rounded mt-1 overflow-auto max-h-32">
                            {log.stackTrace}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
