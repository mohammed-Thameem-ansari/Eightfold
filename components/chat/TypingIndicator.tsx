'use client'

export function TypingIndicator() {
  return (
    <div className="flex gap-4 mb-6">
      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
        <span className="text-xs font-semibold">AI</span>
      </div>
      <div className="flex-1 flex items-center gap-1">
        <div className="flex gap-1">
          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  )
}

