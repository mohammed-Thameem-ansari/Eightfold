'use client'

import { Message } from '@/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'
import { SourceCitation } from './SourceCitation'
import { highlightText } from '@/lib/utils/highlighter'
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react'

interface ChatMessageProps {
  message: Message
  highlightTerms?: string[]
}

// Extract stock data from message content
function extractStockData(content: string): {
  symbol?: string
  price?: number
  change?: number
  changePercent?: number
  volume?: number
  marketCap?: string
} | null {
  // Try to parse JSON stock data from content
  const stockPattern = /\*\*Stock Quote\*\*[\s\S]*?Symbol:\s*([A-Z]+)[\s\S]*?Price:\s*\$?([\d,.]+)[\s\S]*?Change.*?([+-]?\d+\.?\d*)%/i
  const match = content.match(stockPattern)
  
  if (match) {
    return {
      symbol: match[1],
      price: parseFloat(match[2].replace(/,/g, '')),
      changePercent: parseFloat(match[3])
    }
  }
  
  // Try alternative patterns
  const altPattern = /([A-Z]{1,5}):\s*\$?([\d,.]+)\s*\(([+-]?\d+\.?\d*)%\)/
  const altMatch = content.match(altPattern)
  
  if (altMatch) {
    return {
      symbol: altMatch[1],
      price: parseFloat(altMatch[2].replace(/,/g, '')),
      changePercent: parseFloat(altMatch[3])
    }
  }
  
  return null
}

export function ChatMessage({ message, highlightTerms = [] }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const stockData = !isUser ? extractStockData(message.content) : null

  // Highlight content if terms provided
  const highlightedContent = !isUser && highlightTerms.length > 0
    ? highlightText(message.content, highlightTerms)
    : [{ text: message.content, isHighlight: false }]

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-6`}>
      <Avatar className="h-8 w-8">
        <AvatarFallback className={isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
          {isUser ? 'U' : 'AI'}
        </AvatarFallback>
      </Avatar>

      <div className={`flex-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {/* Premium Stock Data Card */}
        {stockData && (
          <div className="group relative bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 rounded-2xl p-5 backdrop-blur-md max-w-[80%] shadow-lg transition-all duration-300 hover:shadow-xl hover:border-foreground/20 animate-slide-up">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-foreground/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-foreground" />
                  </div>
                  <h3 className="font-bold text-xl tracking-tight">{stockData.symbol}</h3>
                </div>
                {stockData.changePercent !== undefined && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border backdrop-blur-sm transition-all duration-300 ${
                    stockData.changePercent >= 0 
                      ? 'bg-foreground/10 border-foreground/30 hover:bg-foreground/15' 
                      : 'bg-destructive/10 border-destructive/30 hover:bg-destructive/15'
                  }`}>
                    {stockData.changePercent >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <span className="font-bold text-sm">
                      {stockData.changePercent > 0 ? '+' : ''}{stockData.changePercent.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-4xl font-bold tracking-tight">
                  ${stockData.price?.toFixed(2)}
                </span>
                {stockData.change !== undefined && (
                  <span className={`text-base font-semibold ${stockData.change >= 0 ? 'text-foreground/80' : 'text-destructive'}`}>
                    {stockData.change > 0 ? '+' : ''}${stockData.change.toFixed(2)}
                  </span>
                )}
              </div>
              
              {(stockData.volume || stockData.marketCap) && (
                <div className="flex gap-6 pt-4 border-t border-border/30 text-xs">
                  {stockData.volume && (
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Volume</p>
                        <p className="font-bold text-foreground">{(stockData.volume / 1e6).toFixed(2)}M</p>
                      </div>
                    </div>
                  )}
                  {stockData.marketCap && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Mkt Cap</p>
                        <p className="font-bold text-foreground">{stockData.marketCap}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className={`rounded-lg px-4 py-3 max-w-[80%] ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        }`}>
          <p className="whitespace-pre-wrap break-words">
            {highlightedContent.map((part, idx) => (
              part.isHighlight ? (
                <mark key={idx} className="bg-yellow-200 dark:bg-yellow-500/30 text-foreground px-1 rounded">
                  {part.text}
                </mark>
              ) : (
                <span key={idx}>{part.text}</span>
              )
            ))}
          </p>
          
          {message.reasoning && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs font-semibold mb-1">Reasoning:</p>
              <p className="text-xs opacity-80 italic">{message.reasoning}</p>
            </div>
          )}

          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs font-semibold mb-2">Sources:</p>
              <div className="flex flex-col gap-1">
                {message.sources.map((source, idx) => (
                  <SourceCitation key={idx} source={source} highlightTerms={highlightTerms} />
                ))}
              </div>
            </div>
          )}
        </div>

        <span className="text-xs text-muted-foreground">
          {formatDate(message.timestamp)}
        </span>
      </div>
    </div>
  )
}

