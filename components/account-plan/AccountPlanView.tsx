'use client'

import { AccountPlan, PlanSection } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SourceCitation } from '@/components/chat/SourceCitation'
import { Button } from '@/components/ui/button'
import { Edit2, Download, FileText } from 'lucide-react'
import { SECTION_TITLES } from '@/lib/constants'

interface AccountPlanViewProps {
  plan: AccountPlan
  onEditSection?: (sectionId: string) => void
}

export function AccountPlanView({ plan, onEditSection }: AccountPlanViewProps) {
  const handleExport = (format: 'pdf' | 'markdown') => {
    // TODO: Implement export functionality
    console.log(`Exporting to ${format}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{plan.companyName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Account Plan • Created {new Date(plan.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('markdown')}>
            <FileText className="h-4 w-4 mr-2" />
            Export MD
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <Separator />

      {plan.sections.map((section, index) => (
        <PlanSectionView
          key={section.id}
          section={section}
          onEdit={onEditSection}
          isLast={index === plan.sections.length - 1}
        />
      ))}

      {plan.sources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {plan.sources.map((source, idx) => (
                <SourceCitation key={idx} source={source} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PlanSectionView({
  section,
  onEdit,
  isLast,
}: {
  section: PlanSection
  onEdit?: (sectionId: string) => void
  isLast: boolean
}) {
  const title = SECTION_TITLES[section.type] || section.title

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{title}</CardTitle>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(section.id)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
        {section.confidence !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            Confidence: {Math.round(section.confidence * 100)}%
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap">{section.content}</p>
        </div>

        {section.sources.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-semibold mb-2">Sources:</p>
            <div className="flex flex-wrap gap-2">
              {section.sources.map((source, idx) => (
                <SourceCitation key={idx} source={source} />
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Last updated: {new Date(section.lastUpdated).toLocaleString()}
        </p>
      </CardContent>
      {!isLast && <Separator className="my-4" />}
    </Card>
  )
}

