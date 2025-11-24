'use client'

import { useState } from 'react'
import html2canvas from 'html2canvas'
import { AccountPlan, ExportOptions } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Download, FileText, FileCode, FileSpreadsheet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ExportDialogProps {
  plan: AccountPlan
  onClose: () => void
}

export function ExportDialog({ plan, onClose }: ExportDialogProps) {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'json',
    includeSources: true,
    includeMetadata: true,
    includeCharts: true,
    sections: undefined,
  })
  const [isExporting, setIsExporting] = useState(false)
  const [brandingLogo, setBrandingLogo] = useState<string | undefined>(undefined)
  const [brandingColor, setBrandingColor] = useState('#3b82f6')
  const [brandingName, setBrandingName] = useState(plan.companyName)
  const { toast } = useToast()

  const captureCharts = async (): Promise<string[]> => {
    if (!options.includeCharts) return []
    const chartElements = Array.from(document.querySelectorAll('[data-export-chart]')) as HTMLElement[]
    const images: string[] = []
    for (const el of chartElements) {
      try {
        const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 })
        images.push(canvas.toDataURL('image/png'))
      } catch (e) {
        // ignore capture errors
      }
    }
    return images
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      let chartImages: string[] = []
      if (options.format === 'pdf' && options.includeCharts) {
        chartImages = await captureCharts()
      }
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          options: { 
            ...options, 
            chartImages,
            branding: {
              logo: brandingLogo,
              companyName: brandingName.trim() || plan.companyName,
              primaryColor: brandingColor
            }
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }))
        throw new Error(errorData.error || `HTTP ${response.status}: Export failed`)
      }

      const contentType = response.headers.get('Content-Type') || ''
      
      // Binary response (PDF/DOCX)
      if (contentType.includes('application/pdf') || contentType.includes('wordprocessingml')) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const filename = response.headers.get('Content-Disposition')
          ?.split('filename="')[1]?.split('"')[0] 
          || `plan_${plan.companyName}.${options.format}`
        
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } 
      // JSON response (JSON/HTML/CSV)
      else {
        const result = await response.json()
        
        if (result.success && result.url) {
          const link = document.createElement('a')
          link.href = result.url
          link.download = result.filename || `plan_${plan.companyName}.${options.format}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(result.url)
        } else {
          throw new Error(result.error || 'Export failed')
        }
      }

      toast({
        title: 'Export successful',
        description: `Plan exported as ${options.format.toUpperCase()}`,
      })

      onClose()
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Export Account Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="mb-2 block">Export Format</Label>
          <div className="grid grid-cols-5 gap-2">
            <button
              onClick={() => setOptions({ ...options, format: 'pdf' })}
              className={`p-4 border rounded-md text-left ${
                options.format === 'pdf' ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <FileText className="h-5 w-5 mb-2 text-red-500" />
              <div className="font-semibold">PDF</div>
              <div className="text-sm text-muted-foreground">With charts</div>
            </button>
            <button
              onClick={() => setOptions({ ...options, format: 'docx' })}
              className={`p-4 border rounded-md text-left ${
                options.format === 'docx' ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <FileText className="h-5 w-5 mb-2 text-blue-500" />
              <div className="font-semibold">DOCX</div>
              <div className="text-sm text-muted-foreground">Word doc</div>
            </button>
            <button
              onClick={() => setOptions({ ...options, format: 'json' })}
              className={`p-4 border rounded-md text-left ${
                options.format === 'json' ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <FileCode className="h-5 w-5 mb-2" />
              <div className="font-semibold">JSON</div>
              <div className="text-sm text-muted-foreground">Data</div>
            </button>
            <button
              onClick={() => setOptions({ ...options, format: 'html' })}
              className={`p-4 border rounded-md text-left ${
                options.format === 'html' ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <FileText className="h-5 w-5 mb-2" />
              <div className="font-semibold">HTML</div>
              <div className="text-sm text-muted-foreground">Web</div>
            </button>
            <button
              onClick={() => setOptions({ ...options, format: 'csv' })}
              className={`p-4 border rounded-md text-left ${
                options.format === 'csv' ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <FileSpreadsheet className="h-5 w-5 mb-2" />
              <div className="font-semibold">CSV</div>
              <div className="text-sm text-muted-foreground">Excel</div>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Include Sources</Label>
              <p className="text-sm text-muted-foreground">Include source citations in export</p>
            </div>
            <input
              type="checkbox"
              checked={options.includeSources}
              onChange={(e) => setOptions({ ...options, includeSources: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Include Metadata</Label>
              <p className="text-sm text-muted-foreground">Include confidence scores and metadata</p>
            </div>
            <input
              type="checkbox"
              checked={options.includeMetadata}
              onChange={(e) => setOptions({ ...options, includeMetadata: e.target.checked })}
            />
          </div>

          {options.format === 'pdf' && (
            <div className="flex items-center justify-between">
              <div>
                <Label>Include Charts</Label>
                <p className="text-sm text-muted-foreground">Capture on-screen charts and embed into PDF</p>
              </div>
              <input
                type="checkbox"
                checked={options.includeCharts}
                onChange={(e) => setOptions({ ...options, includeCharts: e.target.checked })}
              />
            </div>
          )}

          {(options.format === 'pdf' || options.format === 'docx') && (
            <div className="space-y-3 border-t pt-4">
              <Label className="block">Branding (Optional)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brandingName">Company Name</Label>
                  <input
                    id="brandingName"
                    type="text"
                    value={brandingName}
                    onChange={(e) => setBrandingName(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandingColor">Accent Color</Label>
                  <input
                    id="brandingColor"
                    type="color"
                    value={brandingColor}
                    onChange={(e) => setBrandingColor(e.target.value)}
                    className="h-9 w-full border rounded cursor-pointer"
                    aria-label="Select accent color"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandingLogo">Logo Image</Label>
                  <input
                    id="brandingLogo"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) { setBrandingLogo(undefined); return }
                      const reader = new FileReader()
                      reader.onload = () => setBrandingLogo(reader.result as string)
                      reader.readAsDataURL(file)
                    }}
                    className="w-full text-xs"
                  />
                  {brandingLogo && (
                    <div className="text-xs text-muted-foreground truncate" title="Logo selected">
                      Logo ready
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

