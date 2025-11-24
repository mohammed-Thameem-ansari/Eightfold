'use client'

import { Source } from '@/types'
import { ExternalLink } from 'lucide-react'
import { highlightText } from '@/lib/utils/highlighter'

interface SourceCitationProps {
  source: Source
  highlightTerms?: string[]
}

export function SourceCitation({ source, highlightTerms = [] }: SourceCitationProps) {
  const highlighted = highlightTerms.length > 0 
    ? highlightText(source.title || source.url, highlightTerms)
    : [{ text: source.title || source.url, isHighlight: false }]

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-primary hover:underline flex items-center gap-1 group"
      title={source.title || source.url}
    >
      <span className="truncate max-w-[200px]">
        {highlighted.map((part, idx) => (
          part.isHighlight ? (
            <mark key={idx} className="bg-yellow-200 dark:bg-yellow-500/30 text-foreground px-0.5 rounded">
              {part.text}
            </mark>
          ) : (
            <span key={idx}>{part.text}</span>
          )
        ))}
      </span>
      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  )
}

