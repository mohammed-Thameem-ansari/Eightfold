'use client'

import { useState } from 'react'
import { CheckCircle2, Copy, Check, Sparkles, FileDown } from 'lucide-react'
import { exportTextToPDF, handlePDFExportError } from '@/lib/export/pdf'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface FinalAnswerBoxProps {
  content: string
  isComplete?: boolean
}

export function FinalAnswerBox({ content, isComplete = false }: FinalAnswerBoxProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportPDF = async () => {
    if (!content) return
    try {
      await exportTextToPDF(content, { title: 'Research Report' })
      toast({
        title: 'Success',
        description: 'PDF exported successfully',
      })
    } catch (err) {
      handlePDFExportError(err as Error, toast)
    }
  }

  if (!content && !isComplete) {
    return null
  }

  return (
    <div className="w-full rounded-2xl border-2 border-foreground/20 bg-gradient-to-br from-foreground/10 to-foreground/5 backdrop-blur-md shadow-2xl overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="px-6 py-4 border-b border-foreground/20 bg-gradient-to-r from-foreground/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
              {isComplete ? (
                <CheckCircle2 className="h-6 w-6 text-white" />
              ) : (
                <Sparkles className="h-6 w-6 text-white animate-pulse" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                {isComplete ? 'Final Answer' : 'Generating Answer...'}
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                {isComplete ? 'Research complete' : 'Synthesizing agent results'}
              </p>
            </div>
          </div>

          {isComplete && content && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="gap-2"
                aria-label={copied ? 'Content copied to clipboard' : 'Copy content to clipboard'}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={handleExportPDF}
                className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg"
                aria-label="Export research report as PDF"
              >
                <FileDown className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {content ? (
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-foreground leading-relaxed">
              {content}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 rounded-full bg-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 rounded-full bg-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm font-medium">Processing agent insights...</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Status */}
      {isComplete && (
        <div className="px-6 py-3 border-t border-foreground/10 bg-foreground/5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="font-medium">All agents completed successfully</span>
          </div>
        </div>
      )}
    </div>
  )
}
