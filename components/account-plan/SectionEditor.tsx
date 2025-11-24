'use client'

import { useState } from 'react'
import { PlanSection } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Save, X } from 'lucide-react'

interface SectionEditorProps {
  section: PlanSection
  onSave: (sectionId: string, newContent: string) => void
  onCancel: () => void
}

export function SectionEditor({ section, onSave, onCancel }: SectionEditorProps) {
  const [content, setContent] = useState(section.content)

  const handleSave = () => {
    onSave(section.id, content)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Edit: {section.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[300px] font-mono text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

