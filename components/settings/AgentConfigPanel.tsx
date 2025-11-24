"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, RotateCcw, AlertTriangle } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface AgentConfig {
  maxIterations: number;
  confidenceThreshold: number;
  timeoutSeconds: number;
  parallelAgents: number;
  retryAttempts: number;
  cacheEnabled: boolean;
}

const defaultConfig: AgentConfig = {
  maxIterations: 10,
  confidenceThreshold: 75,
  timeoutSeconds: 120,
  parallelAgents: 5,
  retryAttempts: 3,
  cacheEnabled: true,
};

export function AgentConfigPanel() {
  const [config, setConfig] = useState<AgentConfig>(defaultConfig);
  const [savedConfig, setSavedConfig] = useState<AgentConfig>(defaultConfig);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("agent_config");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setConfig(parsed);
          setSavedConfig(parsed);
        } catch (e) {
          console.error("Failed to parse agent config:", e);
        }
      }
    }
  }, []);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("agent_config", JSON.stringify(config));
      
      // Also save to preferences system
      const { savePreferences } = require("@/lib/utils/preferences");
      savePreferences({ agentConfig: config });
      
      setSavedConfig(config);
    }
  };

  const handleReset = () => {
    setConfig(defaultConfig);
  };

  const hasChanges =
    JSON.stringify(config) !== JSON.stringify(savedConfig);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Agent Configuration
          </div>
          {mounted && hasChanges && (
            <Badge variant="secondary" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Max Iterations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="maxIterations" className="text-sm font-medium">
              Max Iterations
            </Label>
            <span className="text-sm font-mono font-semibold text-muted-foreground">
              {config.maxIterations}
            </span>
          </div>
          <Slider
            id="maxIterations"
            min={1}
            max={20}
            step={1}
            value={[config.maxIterations]}
            onValueChange={(value) =>
              setConfig({ ...config, maxIterations: value[0] })
            }
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Maximum number of iterations per agent execution
          </p>
        </div>

        {/* Confidence Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="confidenceThreshold" className="text-sm font-medium">
              Confidence Threshold
            </Label>
            <span className="text-sm font-mono font-semibold text-muted-foreground">
              {config.confidenceThreshold}%
            </span>
          </div>
          <Slider
            id="confidenceThreshold"
            min={50}
            max={100}
            step={5}
            value={[config.confidenceThreshold]}
            onValueChange={(value) =>
              setConfig({ ...config, confidenceThreshold: value[0] })
            }
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Minimum confidence level to accept agent results
          </p>
        </div>

        {/* Timeout Seconds */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="timeoutSeconds" className="text-sm font-medium">
              Timeout (seconds)
            </Label>
            <span className="text-sm font-mono font-semibold text-muted-foreground">
              {config.timeoutSeconds}s
            </span>
          </div>
          <Slider
            id="timeoutSeconds"
            min={30}
            max={300}
            step={10}
            value={[config.timeoutSeconds]}
            onValueChange={(value) =>
              setConfig({ ...config, timeoutSeconds: value[0] })
            }
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Maximum execution time per agent before timeout
          </p>
        </div>

        {/* Parallel Agents */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="parallelAgents" className="text-sm font-medium">
              Parallel Agents
            </Label>
            <span className="text-sm font-mono font-semibold text-muted-foreground">
              {config.parallelAgents}
            </span>
          </div>
          <Slider
            id="parallelAgents"
            min={1}
            max={10}
            step={1}
            value={[config.parallelAgents]}
            onValueChange={(value) =>
              setConfig({ ...config, parallelAgents: value[0] })
            }
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Number of agents that can run simultaneously
          </p>
        </div>

        {/* Retry Attempts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="retryAttempts" className="text-sm font-medium">
              Retry Attempts
            </Label>
            <span className="text-sm font-mono font-semibold text-muted-foreground">
              {config.retryAttempts}
            </span>
          </div>
          <Slider
            id="retryAttempts"
            min={0}
            max={5}
            step={1}
            value={[config.retryAttempts]}
            onValueChange={(value) =>
              setConfig({ ...config, retryAttempts: value[0] })
            }
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Number of retry attempts on agent failure
          </p>
        </div>

        {/* Cache Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
          <div>
            <Label htmlFor="cacheEnabled" className="text-sm font-medium cursor-pointer">
              Enable Document Cache
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Cache search results and documents for faster retrieval
            </p>
          </div>
          <button
            id="cacheEnabled"
            onClick={() => setConfig({ ...config, cacheEnabled: !config.cacheEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.cacheEnabled ? "bg-blue-500" : "bg-muted"
            }`}
            role="switch"
            aria-checked={config.cacheEnabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.cacheEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Action Buttons */}
        {mounted && (
          <div className="flex gap-3 pt-4 border-t border-border/50">
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex-1 gap-2"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        )}

        {mounted && !hasChanges && (
          <div className="text-center text-sm text-muted-foreground">
            Configuration saved successfully
          </div>
        )}
      </CardContent>
    </Card>
  );
}
