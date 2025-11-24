'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AppConfig } from '@/types'
import { getConfig, updateConfig, validateEnvironment } from '@/lib/config'
import { storage } from '@/lib/storage'
import { analytics } from '@/lib/analytics'
import { Save, RefreshCw, Trash2, Download, Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function SettingsPanel() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [envStatus, setEnvStatus] = useState<ReturnType<typeof validateEnvironment> | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadConfig()
    checkEnvironment()
  }, [])

  const loadConfig = () => {
    const currentConfig = getConfig()
    setConfig(currentConfig)
  }

  const checkEnvironment = () => {
    const status = validateEnvironment()
    setEnvStatus(status)
  }

  const handleSave = () => {
    if (!config) return

    // Save to localStorage
    storage.set('app_config', config)
    toast({
      title: 'Settings saved',
      description: 'Your settings have been saved successfully.',
    })
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      storage.remove('app_config')
      loadConfig()
      toast({
        title: 'Settings reset',
        description: 'Settings have been reset to defaults.',
      })
    }
  }

  const handleExportData = () => {
    try {
      const sessionData = storage.get('session_data')
      const dataStr = JSON.stringify(sessionData, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `research_agent_data_${new Date().toISOString()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Data exported',
        description: 'Your data has been exported successfully.',
      })
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  const handleImportData = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string)
          storage.set('session_data', data)
          toast({
            title: 'Data imported',
            description: 'Your data has been imported successfully.',
          })
        } catch (error) {
          toast({
            title: 'Import failed',
            description: 'Invalid file format.',
            variant: 'destructive',
          })
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleClearAnalytics = () => {
    if (confirm('Are you sure you want to clear all analytics data?')) {
      analytics.reset()
      toast({
        title: 'Analytics cleared',
        description: 'All analytics data has been cleared.',
      })
    }
  }

  if (!config || !envStatus) {
    return <div>Loading settings...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Environment Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {envStatus.missing.length > 0 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <h4 className="font-semibold mb-2">Missing Configuration</h4>
              <ul className="list-disc list-inside space-y-1">
                {envStatus.missing.map((key) => (
                  <li key={key} className="text-sm">{key}</li>
                ))}
              </ul>
            </div>
          )}

          {envStatus.warnings.length > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <h4 className="font-semibold mb-2">Warnings</h4>
              <ul className="list-disc list-inside space-y-1">
                {envStatus.warnings.map((warning, index) => (
                  <li key={index} className="text-sm">{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {envStatus.valid && envStatus.warnings.length === 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <p className="text-sm">All required configuration is present.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Features & Providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Caching</Label>
              <p className="text-sm text-muted-foreground">Cache research results for faster access</p>
            </div>
            <input
              type="checkbox"
              checked={config.features.enableCaching}
              onChange={(e) => setConfig({
                ...config,
                features: { ...config.features, enableCaching: e.target.checked },
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Analytics</Label>
              <p className="text-sm text-muted-foreground">Track usage and performance metrics</p>
            </div>
            <input
              type="checkbox"
              checked={config.features.enableAnalytics}
              onChange={(e) => setConfig({
                ...config,
                features: { ...config.features, enableAnalytics: e.target.checked },
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Export</Label>
              <p className="text-sm text-muted-foreground">Allow exporting plans and data</p>
            </div>
            <input
              type="checkbox"
              checked={config.features.enableExport}
              onChange={(e) => setConfig({
                ...config,
                features: { ...config.features, enableExport: e.target.checked },
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Groq</Label>
              <p className="text-sm text-muted-foreground">Use Groq as secondary fallback (fast inference)</p>
            </div>
            <input
              type="checkbox"
              checked={!!config.features.enableGroq}
              onChange={(e) => setConfig({
                ...config,
                features: { ...config.features, enableGroq: e.target.checked },
              })}
              disabled={!envStatus.missing.includes('GROQ_API_KEY') && !process.env.GROQ_API_KEY && false}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Enable OpenAI</Label>
              <p className="text-sm text-muted-foreground">Allow OpenAI as tertiary fallback provider</p>
            </div>
            <input
              type="checkbox"
              checked={!!config.features.enableOpenAI}
              onChange={(e) => setConfig({
                ...config,
                features: { ...config.features, enableOpenAI: e.target.checked },
              })}
              disabled={!process.env.OPENAI_API_KEY}
            />
          </div>

          <div>
            <Label>Max Iterations</Label>
            <input
              type="number"
              min="1"
              max="50"
              value={config.features.maxIterations}
              onChange={(e) => setConfig({
                ...config,
                features: { ...config.features, maxIterations: parseInt(e.target.value) || 10 },
              })}
              className="w-full mt-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Maximum number of research iterations per query
            </p>
          </div>

          <div className="mt-4">
            <Label>RAG TopK</Label>
            <input
              type="number"
              min="1"
              max="25"
              value={config.features.ragTopK || 5}
              onChange={(e) => setConfig({
                ...config,
                features: { ...config.features, ragTopK: parseInt(e.target.value) || 5 },
              })}
              className="w-full mt-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Number of relevant documents to retrieve for augmentation (higher = more context, slower).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleExportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button onClick={handleImportData} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </Button>
            <Button onClick={handleClearAnalytics} variant="outline">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Analytics
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
        <Button onClick={handleReset} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  )
}

